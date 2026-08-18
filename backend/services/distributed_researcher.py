"""
Distributed research with parallel workers, incremental progress,
and resume-on-failure capabilities for scaling to 500+ apps.
"""
import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.models import App, AppStatus, ResearchResult
from backend.utils.web_search import call_groq_research

logger = logging.getLogger(__name__)

CHECKPOINT_PATH = Path("research_data/research_checkpoint.json")


# ═══════════════════════════════════════════════════════════════════════════
# Checkpoint Management
# ═══════════════════════════════════════════════════════════════════════════

def _load_checkpoint() -> dict:
    if CHECKPOINT_PATH.exists():
        with open(CHECKPOINT_PATH, "r") as f:
            return json.load(f)
    return {}


def _save_checkpoint(data: dict) -> None:
    CHECKPOINT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CHECKPOINT_PATH, "w") as f:
        json.dump(data, f, indent=2, default=str)


# ═══════════════════════════════════════════════════════════════════════════
# Single App Research
# ═══════════════════════════════════════════════════════════════════════════

async def _research_single(app: dict) -> dict:
    """Research a single app via Groq LLM."""
    start = time.monotonic()
    try:
        data = await call_groq_research(
            name=app["name"],
            url=app.get("url"),
            category=app.get("category"),
        )
        elapsed = time.monotonic() - start
        data["_elapsed_seconds"] = elapsed
        data["_status"] = "completed"
        logger.info("Researched %s in %.1fs (confidence=%.2f)", app["name"], elapsed, data.get("confidence", 0))
        return data
    except Exception as e:
        elapsed = time.monotonic() - start
        logger.error("Failed to research %s after %.1fs: %s", app["name"], elapsed, e)
        return {
            "name": app["name"],
            "error": str(e),
            "confidence": 0.0,
            "_elapsed_seconds": elapsed,
            "_status": "failed",
        }


# ═══════════════════════════════════════════════════════════════════════════
# Batch Research with Rate Limiting
# ═══════════════════════════════════════════════════════════════════════════

async def _research_batch(apps: list[dict], batch_idx: int, total_batches: int, rate_limit_delay: float = 0.7) -> list[dict]:
    """Research a batch of apps with rate limiting."""
    tasks = [_research_single(app) for app in apps]
    results = await asyncio.gather(*tasks, return_exceptions=False)

    completion_pct = ((batch_idx + 1) / total_batches) * 100
    logger.info("[%.1f%%] Batch %d/%d complete (%d apps)", completion_pct, batch_idx + 1, total_batches, len(results))

    # Rate limit between batches
    if batch_idx < total_batches - 1:
        await asyncio.sleep(rate_limit_delay)

    return list(results)


# ═══════════════════════════════════════════════════════════════════════════
# Distributed Researcher (parallel workers)
# ═══════════════════════════════════════════════════════════════════════════

async def run_distributed_research(
    db: AsyncSession,
    batch_size: int = 10,
    max_workers: int = 3,
    rate_limit_delay: float = 0.7,
) -> dict:
    """Research all apps using parallel workers with rate limiting."""
    # Get all pending apps
    stmt = select(App).where(App.status.in_([AppStatus.PENDING, AppStatus.FAILED]))
    result = await db.execute(stmt)
    apps = result.scalars().all()

    if not apps:
        return {"status": "no_apps", "message": "No pending or failed apps to research"}

    total = len(apps)
    logger.info("Starting distributed research: %d apps, %d workers, batch_size=%d", total, max_workers, batch_size)

    # Convert to dicts
    app_dicts = [
        {"id": a.id, "name": a.name, "url": a.url, "category": a.category}
        for a in apps
    ]

    # Split into batches
    batches = [app_dicts[i : i + batch_size] for i in range(0, total, batch_size)]
    total_batches = len(batches)

    # Process batches with controlled parallelism
    all_results: list[dict] = []
    semaphore = asyncio.Semaphore(max_workers)

    async def _limited_batch(idx: int, batch: list[dict]) -> list[dict]:
        async with semaphore:
            return await _research_batch(batch, idx, total_batches, rate_limit_delay)

    tasks = [_limited_batch(i, batch) for i, batch in enumerate(batches)]
    batch_results = await asyncio.gather(*tasks)

    for br in batch_results:
        all_results.extend(br)

    # Store results in database
    completed = 0
    failed = 0
    app_map = {a.id: a for a in apps}

    for result in all_results:
        app_name = result.get("name", "")
        app_obj = next((a for a in apps if a.name == app_name), None)
        if not app_obj:
            continue

        if result.get("_status") == "failed":
            app_obj.status = AppStatus.FAILED
            failed += 1
        else:
            app_obj.status = AppStatus.COMPLETED
            rr = ResearchResult(
                app_id=app_obj.id,
                agent_version=settings.RESEARCH_MODEL,
                raw_findings=result,
                summary=result.get("summary"),
                tech_stack=result.get("tech_stack"),
                confidence_score=result.get("confidence", 0.0),
                sources=result.get("sources"),
            )
            db.add(rr)
            completed += 1

    await db.flush()

    # Save checkpoint
    _save_checkpoint({
        "status": "complete",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total": total,
        "completed": completed,
        "failed": failed,
    })

    logger.info("Distributed research complete: %d completed, %d failed out of %d", completed, failed, total)
    return {
        "status": "completed",
        "total": total,
        "completed": completed,
        "failed": failed,
        "batches": total_batches,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Incremental Research (resume on failure)
# ═══════════════════════════════════════════════════════════════════════════

async def run_incremental_research(
    db: AsyncSession,
    batch_size: int = 10,
    checkpoint_every: int = 10,
) -> dict:
    """Research apps with checkpointing for resume on failure."""
    checkpoint = _load_checkpoint()
    start_idx = checkpoint.get("last_completed_index", 0)

    # Get all apps
    stmt = select(App).order_by(App.id)
    result = await db.execute(stmt)
    all_apps = result.scalars().all()
    total = len(all_apps)

    if start_idx >= total:
        return {"status": "already_complete", "total": total, "completed": total}

    remaining = all_apps[start_idx:]
    logger.info("Incremental research: resuming from index %d, %d apps remaining", start_idx, len(remaining))

    completed = 0
    failed = 0

    for i, app in enumerate(remaining):
        try:
            app_dict = {"id": app.id, "name": app.name, "url": app.url, "category": app.category}
            result_data = await _research_single(app_dict)

            if result_data.get("_status") == "failed":
                app.status = AppStatus.FAILED
                failed += 1
            else:
                app.status = AppStatus.COMPLETED
                rr = ResearchResult(
                    app_id=app.id,
                    agent_version=settings.RESEARCH_MODEL,
                    raw_findings=result_data,
                    summary=result_data.get("summary"),
                    tech_stack=result_data.get("tech_stack"),
                    confidence_score=result_data.get("confidence", 0.0),
                    sources=result_data.get("sources"),
                )
                db.add(rr)
                completed += 1

            # Checkpoint every N apps
            if (i + 1) % checkpoint_every == 0:
                await db.flush()
                _save_checkpoint({
                    "last_completed_index": start_idx + i + 1,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "total_completed": completed,
                    "total_failed": failed,
                })
                logger.info("Checkpoint saved: %d/%d apps processed", start_idx + i + 1, total)

        except Exception as e:
            logger.error("Failed on %s: %s — continuing", app.name, e)
            app.status = AppStatus.FAILED
            failed += 1
            continue

    await db.flush()

    _save_checkpoint({
        "status": "complete",
        "last_completed_index": total,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_completed": completed,
        "total_failed": failed,
    })

    return {
        "status": "completed",
        "total": total,
        "completed": completed,
        "failed": failed,
        "started_from": start_idx,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Research Progress (for WebSocket / polling)
# ═══════════════════════════════════════════════════════════════════════════

async def get_research_progress(db: AsyncSession) -> dict:
    """Get current research progress stats."""
    total_stmt = select(func.count(App.id))
    total = (await db.execute(total_stmt)).scalar_one()

    completed_stmt = select(func.count(App.id)).where(App.status == AppStatus.COMPLETED)
    completed = (await db.execute(completed_stmt)).scalar_one()

    failed_stmt = select(func.count(App.id)).where(App.status == AppStatus.FAILED)
    failed = (await db.execute(failed_stmt)).scalar_one()

    avg_conf_stmt = select(func.avg(ResearchResult.confidence_score))
    avg_confidence = (await db.execute(avg_conf_stmt)).scalar_one() or 0.0

    pending = total - completed - failed
    progress_pct = (completed / total * 100) if total > 0 else 0
    estimated_remaining_mins = pending * 2 / 60  # ~2 sec per app

    return {
        "total_apps": total,
        "completed": completed,
        "failed": failed,
        "pending": pending,
        "progress_pct": round(progress_pct, 1),
        "avg_confidence": round(float(avg_confidence), 3),
        "estimated_remaining_mins": round(estimated_remaining_mins, 1),
    }
