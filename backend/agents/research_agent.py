import asyncio
import json
import logging
import random
import time
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import AsyncSessionLocal
from backend.models import App, AppStatus, ResearchResult, VerificationLog
from backend.utils.web_search import call_groq_research

logger = logging.getLogger(__name__)

RATE_LIMIT_DELAY = 1.0
VERIFICATION_INTERVAL = 10


async def _process_app(app: App, index: int, total: int) -> dict | None:
    logger.info("[%d/%d] Researching: %s", index + 1, total, app.name)
    try:
        data = await call_groq_research(
            name=app.name,
            url=app.url,
            category=app.category,
        )
        return data
    except Exception as exc:
        logger.error("[%d/%d] Failed for %s: %s", index + 1, total, app.name, exc)
        return None


def _confidence_from_response(data: dict) -> float:
    if "confidence" in data and data["confidence"] is not None:
        return min(max(float(data["confidence"]), 0.0), 1.0)

    tech = data.get("tech_stack", [])
    features = data.get("key_features", [])
    if not tech and not features:
        return 0.2
    score = 0.5
    if len(tech) >= 3:
        score += 0.15
    if len(features) >= 3:
        score += 0.15
    if data.get("summary"):
        score += 0.1
    if data.get("pricing_model", "unknown") != "unknown":
        score += 0.1
    return min(score, 1.0)


async def _save_result(db: AsyncSession, app: App, data: dict, elapsed: float | None = None) -> ResearchResult:
    if elapsed is not None:
        data["_elapsed_seconds"] = elapsed
    rr = ResearchResult(
        app_id=app.id,
        agent_version=settings.RESEARCH_MODEL,
        raw_findings=data,
        summary=data.get("summary"),
        tech_stack=data.get("tech_stack"),
        confidence_score=_confidence_from_response(data),
        sources=[app.url] if app.url else [],
    )
    db.add(rr)
    return rr


async def _maybe_verify(
    db: AsyncSession,
    app: App,
    rr: ResearchResult,
) -> None:
    if random.random() > 0.3:
        return
    claim = f"{app.name} uses {', '.join(rr.tech_stack or [])}"
    vlog = VerificationLog(
        app_id=app.id,
        research_result_id=rr.id,
        method="spot_check",
        claim=claim,
        evidence="Agent self-verification",
        is_accurate=None,
        notes="Automated sample verification",
    )
    db.add(vlog)
    logger.info("  Verification log created for %s", app.name)


async def run_research(apps: list[dict], output_path: str | None = None) -> list[dict]:
    results: list[dict] = []
    overall_start = time.monotonic()

    async with AsyncSessionLocal() as db:
        for i, app_data in enumerate(apps):
            app_name = app_data.get("name", f"App-{i}")
            app = await db.scalar(select(App).where(App.name == app_name))
            if app is None:
                app = App(
                    name=app_name,
                    url=app_data.get("url"),
                    category=app_data.get("category"),
                    description=app_data.get("description"),
                    status=AppStatus.PENDING,
                )
                db.add(app)
                await db.flush()

            latest_result = await db.scalar(
                select(ResearchResult)
                .where(ResearchResult.app_id == app.id)
                .order_by(ResearchResult.created_at.desc())
                .limit(1)
            )
            if latest_result is not None:
                app.status = AppStatus.COMPLETED
                results.append({"app": app.name, "status": "completed", "data": latest_result.raw_findings})
                continue

            app.status = AppStatus.RESEARCHING

            app_start = time.monotonic()
            data = await _process_app(app, i, len(apps))
            app_elapsed = time.monotonic() - app_start

            if data:
                rr = await _save_result(db, app, data, elapsed=app_elapsed)
                app.status = AppStatus.COMPLETED
                results.append({"app": app.name, "status": "completed", "data": data})
                logger.info("  [Timing] %s: %.2fs", app.name, app_elapsed)

                if (i + 1) % VERIFICATION_INTERVAL == 0:
                    await _maybe_verify(db, app, rr)
                    logger.info("  [Verify] Spot-check triggered at app #%d", i + 1)
            else:
                app.status = AppStatus.FAILED
                results.append({"app": app.name, "status": "failed", "data": None})

            await db.commit()

            if i < len(apps) - 1:
                await asyncio.sleep(RATE_LIMIT_DELAY)

    total_elapsed = time.monotonic() - overall_start
    completed = sum(1 for r in results if r["status"] == "completed")
    logger.info(
        "Research complete: %d/%d succeeded in %.1fs (avg %.2fs/app)",
        completed,
        len(apps),
        total_elapsed,
        total_elapsed / len(apps) if apps else 0,
    )

    if output_path:
        meta = {
            "results": results,
            "_meta": {
                "total_apps": len(apps),
                "completed": completed,
                "total_seconds": round(total_elapsed, 1),
                "avg_per_app": round(total_elapsed / len(apps), 2) if apps else 0,
                "model": settings.RESEARCH_MODEL,
            },
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2, ensure_ascii=False, default=str)
        logger.info("Results exported to %s", output_path)

    return results
