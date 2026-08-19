import json
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from groq import APIError
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import get_db, init_db
from backend.models import App, AppStatus, ResearchResult, VerificationLog
from backend.schemas.schemas import (
    AppCreate,
    AppRead,
    AppList,
    AppResearchSummary,
    AppVerificationSummary,
    ResearchResultCreate,
    ResearchResultRead,
    VerificationLogCreate,
    VerificationLogRead,
    PatternRead,
    PieChartData,
    BarChartData,
    AccessMatrixData,
    CorrelationData,
    TechClusterData,
    FullAnalysisResponse,
    MetricsResponse,
    AuthDeepDiveResponse,
    ApiCompletenessResponse,
    CompetitiveIntelResponse,
    VerificationChallengeResponse,
    ErrorResponse,
    StatusResponse,
)

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting application – creating tables if needed")
    await init_db()
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="ToolProbe – App Research API",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    if isinstance(exc, APIError):
        logger.error("Groq request failed: %s", exc)
        return JSONResponse(
            status_code=503,
            content={
                "detail": (
                    "LLM service unavailable. Check GROQ_API_KEY and RESEARCH_MODEL. "
                    f"Provider response: {str(exc)}"
                )
            },
        )
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {
        "name": "ToolProbe API",
        "version": app.version,
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=StatusResponse)
async def health():
    return StatusResponse(status="ok", message="Service is healthy")


# ---------------------------------------------------------------------------
# Apps CRUD
# ---------------------------------------------------------------------------
@app.get("/apps", response_model=AppList)
async def list_apps(
    category: Optional[str] = Query(None),
    status: Optional[AppStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(App)
    count_stmt = select(func.count(App.id))

    if category:
        stmt = stmt.where(App.category == category)
        count_stmt = count_stmt.where(App.category == category)
    if status:
        stmt = stmt.where(App.status == status)
        count_stmt = count_stmt.where(App.status == status)

    total = (await db.execute(count_stmt)).scalar_one()
    result = await db.execute(stmt.offset(skip).limit(limit))
    items = result.scalars().all()
    enriched = []
    for app_obj in items:
        latest_result = await db.scalar(
            select(ResearchResult)
            .where(ResearchResult.app_id == app_obj.id)
            .order_by(ResearchResult.created_at.desc())
            .limit(1)
        )
        verification_result = await db.execute(
            select(VerificationLog)
            .where(VerificationLog.app_id == app_obj.id)
            .order_by(VerificationLog.created_at)
        )
        enriched.append(
            AppRead(
                id=app_obj.id,
                name=app_obj.name,
                url=app_obj.url,
                category=app_obj.category,
                description=app_obj.description,
                status=app_obj.status.value,
                created_at=app_obj.created_at,
                updated_at=app_obj.updated_at,
                research=(
                    AppResearchSummary(
                        summary=latest_result.summary,
                        tech_stack=latest_result.tech_stack,
                        confidence_score=latest_result.confidence_score,
                        sources=latest_result.sources,
                        raw_findings=latest_result.raw_findings,
                    )
                    if latest_result
                    else None
                ),
                verifications=[
                    AppVerificationSummary(
                        id=item.id,
                        method=item.method,
                        claim=item.claim,
                        evidence=item.evidence,
                        is_accurate=item.is_accurate,
                        created_at=item.created_at,
                    )
                    for item in verification_result.scalars().all()
                ],
            )
        )
    return AppList(items=enriched, total=total)


@app.post("/apps", response_model=AppRead, status_code=201)
async def create_app(payload: AppCreate, db: AsyncSession = Depends(get_db)):
    app_obj = App(**payload.model_dump())
    db.add(app_obj)
    await db.flush()
    await db.refresh(app_obj)
    logger.info("Created app %s (id=%d)", app_obj.name, app_obj.id)
    return app_obj


@app.get("/apps/{app_id}", response_model=AppRead)
async def get_app(app_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(App).where(App.id == app_id))
    app_obj = result.scalar_one_or_none()
    if not app_obj:
        raise HTTPException(status_code=404, detail="App not found")
    return app_obj


@app.delete("/apps/{app_id}", response_model=StatusResponse)
async def delete_app(app_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(App).where(App.id == app_id))
    app_obj = result.scalar_one_or_none()
    if not app_obj:
        raise HTTPException(status_code=404, detail="App not found")
    await db.delete(app_obj)
    logger.info("Deleted app id=%d", app_id)
    return StatusResponse(status="ok", message=f"App {app_id} deleted")


# ---------------------------------------------------------------------------
# Auth Deep-Dive
# ---------------------------------------------------------------------------
@app.get("/apps/{app_id}/auth-deep-dive", response_model=AuthDeepDiveResponse)
async def auth_deep_dive(app_id: int, db: AsyncSession = Depends(get_db)):
    from backend.utils.web_search import call_groq_auth_deep_dive

    result = await db.execute(select(App).where(App.id == app_id))
    app_obj = result.scalar_one_or_none()
    if not app_obj:
        raise HTTPException(status_code=404, detail="App not found")

    rr_stmt = (
        select(ResearchResult)
        .where(ResearchResult.app_id == app_id)
        .order_by(ResearchResult.created_at.desc())
        .limit(1)
    )
    rr = (await db.execute(rr_stmt)).scalar_one_or_none()

    raw = rr.raw_findings if rr and rr.raw_findings else {}
    auth_methods = raw.get("auth_methods", [])
    access_model = raw.get("access_model")

    data = await call_groq_auth_deep_dive(
        name=app_obj.name,
        url=app_obj.url,
        auth_methods=auth_methods,
        access_model=access_model,
        category=app_obj.category,
    )
    return data


# ---------------------------------------------------------------------------
# API Completeness Check
# ---------------------------------------------------------------------------
@app.get("/apps/{app_id}/api-completeness", response_model=ApiCompletenessResponse)
async def api_completeness(app_id: int, db: AsyncSession = Depends(get_db)):
    from backend.utils.web_search import call_groq_api_completeness

    result = await db.execute(select(App).where(App.id == app_id))
    app_obj = result.scalar_one_or_none()
    if not app_obj:
        raise HTTPException(status_code=404, detail="App not found")

    rr_stmt = (
        select(ResearchResult)
        .where(ResearchResult.app_id == app_id)
        .order_by(ResearchResult.created_at.desc())
        .limit(1)
    )
    rr = (await db.execute(rr_stmt)).scalar_one_or_none()

    raw = rr.raw_findings if rr and rr.raw_findings else {}
    pricing_model = raw.get("pricing_model")
    blockers = raw.get("integration_blockers", [])

    data = await call_groq_api_completeness(
        name=app_obj.name,
        url=app_obj.url,
        category=app_obj.category,
        pricing_model=pricing_model,
        blockers=blockers,
    )
    return data


# ---------------------------------------------------------------------------
# Competitive Intel
# ---------------------------------------------------------------------------
@app.get("/apps/{app_id}/competitive-intel", response_model=CompetitiveIntelResponse)
async def competitive_intel(app_id: int, db: AsyncSession = Depends(get_db)):
    from backend.utils.web_search import call_groq_competitive_intel

    result = await db.execute(select(App).where(App.id == app_id))
    app_obj = result.scalar_one_or_none()
    if not app_obj:
        raise HTTPException(status_code=404, detail="App not found")

    rr_stmt = (
        select(ResearchResult)
        .where(ResearchResult.app_id == app_id)
        .order_by(ResearchResult.created_at.desc())
        .limit(1)
    )
    rr = (await db.execute(rr_stmt)).scalar_one_or_none()

    raw = rr.raw_findings if rr and rr.raw_findings else {}
    pricing_model = raw.get("pricing_model")
    notable_patterns = raw.get("notable_patterns")
    if isinstance(notable_patterns, list):
        notable_patterns = "; ".join(notable_patterns)

    data = await call_groq_competitive_intel(
        name=app_obj.name,
        url=app_obj.url,
        category=app_obj.category,
        pricing_model=pricing_model,
        notable_patterns=notable_patterns,
    )
    return data


# ---------------------------------------------------------------------------
# Verification Challenge
# ---------------------------------------------------------------------------
@app.get("/apps/{app_id}/verification-challenge", response_model=VerificationChallengeResponse)
async def verification_challenge(app_id: int, db: AsyncSession = Depends(get_db)):
    from backend.utils.web_search import call_groq_verification_challenge

    result = await db.execute(select(App).where(App.id == app_id))
    app_obj = result.scalar_one_or_none()
    if not app_obj:
        raise HTTPException(status_code=404, detail="App not found")

    rr_stmt = (
        select(ResearchResult)
        .where(ResearchResult.app_id == app_id)
        .order_by(ResearchResult.created_at.desc())
        .limit(1)
    )
    rr = (await db.execute(rr_stmt)).scalar_one_or_none()

    if not rr or not rr.raw_findings:
        raise HTTPException(status_code=404, detail="No research results found for this app")

    research_json = json.dumps(rr.raw_findings, indent=2, default=str)

    data = await call_groq_verification_challenge(
        name=app_obj.name,
        research_json=research_json,
    )
    return data


# ---------------------------------------------------------------------------
# Research
# ---------------------------------------------------------------------------
@app.post("/research/{app_id}", response_model=ResearchResultRead, status_code=201)
async def trigger_research(app_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(App).where(App.id == app_id))
    app_obj = result.scalar_one_or_none()
    if not app_obj:
        raise HTTPException(status_code=404, detail="App not found")

    app_obj.status = AppStatus.RESEARCHING
    await db.flush()

    rr = ResearchResult(
        app_id=app_id,
        agent_version=settings.RESEARCH_MODEL,
        raw_findings={"status": "queued"},
        summary="Research queued – agent will process shortly.",
        confidence_score=0.0,
    )
    db.add(rr)
    await db.flush()
    await db.refresh(rr)

    app_obj.status = AppStatus.COMPLETED
    logger.info("Research result %d created for app %d", rr.id, app_id)
    return rr


# ---------------------------------------------------------------------------
# Distributed Research (batch)
# ---------------------------------------------------------------------------
class DistributedResearchRequest(BaseModel):
    batch_size: int = 5
    max_workers: int = 3


@app.post("/research/distributed")
async def start_distributed_research(
    payload: DistributedResearchRequest,
    db: AsyncSession = Depends(get_db),
):
    from backend.services.distributed_researcher import run_distributed_research

    result = await run_distributed_research(
        db,
        batch_size=payload.batch_size,
        max_workers=payload.max_workers,
        rate_limit_delay=settings.RESEARCH_RATE_LIMIT_DELAY,
    )
    return result


@app.post("/research/incremental")
async def start_incremental_research(
    batch_size: int = Query(10, ge=1, le=50),
    checkpoint_every: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    from backend.services.distributed_researcher import run_incremental_research

    result = await run_incremental_research(
        db,
        batch_size=batch_size,
        checkpoint_every=checkpoint_every,
    )
    return result


@app.get("/research/progress")
async def get_research_progress(db: AsyncSession = Depends(get_db)):
    from backend.services.distributed_researcher import get_research_progress
    return await get_research_progress(db)


# ---------------------------------------------------------------------------
# WebSocket – Live Research Progress
# ---------------------------------------------------------------------------
@app.websocket("/ws/research-progress")
async def research_progress_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            async with AsyncSessionLocal() as session:
                total_stmt = select(func.count(App.id))
                total = (await session.execute(total_stmt)).scalar_one()

                completed_stmt = select(func.count(App.id)).where(App.status == AppStatus.COMPLETED)
                completed = (await session.execute(completed_stmt)).scalar_one()

                failed_stmt = select(func.count(App.id)).where(App.status == AppStatus.FAILED)
                failed = (await session.execute(failed_stmt)).scalar_one()

                avg_conf_stmt = select(func.avg(ResearchResult.confidence_score))
                avg_confidence = (await session.execute(avg_conf_stmt)).scalar_one() or 0.0

            pending = total - completed - failed
            progress_pct = (completed / total * 100) if total > 0 else 0

            stats = {
                "total_apps": total,
                "completed": completed,
                "failed": failed,
                "pending": pending,
                "progress_pct": round(progress_pct, 1),
                "avg_confidence": round(float(avg_confidence), 3),
                "estimated_remaining_mins": round(pending * 2 / 60, 1),
            }
            await websocket.send_json(stats)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error("WebSocket error: %s", e)


# Import for websocket
import asyncio
from backend.database import AsyncSessionLocal


# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------
@app.get("/results", response_model=list[ResearchResultRead])
async def list_results(
    app_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ResearchResult).order_by(desc(ResearchResult.created_at))
    if app_id is not None:
        stmt = stmt.where(ResearchResult.app_id == app_id)
    result = await db.execute(stmt.offset(skip).limit(limit))
    return result.scalars().all()


@app.get("/results/{result_id}", response_model=ResearchResultRead)
async def get_result(result_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ResearchResult).where(ResearchResult.id == result_id))
    rr = result.scalar_one_or_none()
    if not rr:
        raise HTTPException(status_code=404, detail="Research result not found")
    return rr


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------
@app.post("/verification", response_model=VerificationLogRead, status_code=201)
async def create_verification(payload: VerificationLogCreate, db: AsyncSession = Depends(get_db)):
    vlog = VerificationLog(**payload.model_dump())
    db.add(vlog)
    await db.flush()
    await db.refresh(vlog)
    logger.info("Verification %d created for app %d", vlog.id, payload.app_id)
    return vlog


@app.get("/verification", response_model=list[VerificationLogRead])
async def list_verifications(
    app_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(VerificationLog).order_by(desc(VerificationLog.created_at))
    if app_id is not None:
        stmt = stmt.where(VerificationLog.app_id == app_id)
    result = await db.execute(stmt.offset(skip).limit(limit))
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Patterns (aggregated view)
# ---------------------------------------------------------------------------
@app.get("/patterns", response_model=list[PatternRead])
async def list_patterns(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(
            App.category,
            func.count(App.id).label("count"),
            func.avg(ResearchResult.confidence_score).label("avg_confidence"),
        )
        .join(ResearchResult, App.id == ResearchResult.app_id, isouter=True)
        .where(App.category.isnot(None))
        .group_by(App.category)
        .order_by(desc("count"))
    )
    result = await db.execute(stmt)
    rows = result.all()

    patterns: list[PatternRead] = []
    for row in rows:
        tech_stmt = (
            select(ResearchResult.tech_stack)
            .join(App, App.id == ResearchResult.app_id)
            .where(App.category == row.category)
            .where(ResearchResult.tech_stack.isnot(None))
        )
        tech_result = await db.execute(tech_stmt)
        all_tech: set[str] = set()
        for (stack,) in tech_result.all():
            if stack:
                all_tech.update(stack)
        patterns.append(
            PatternRead(
                category=row.category,
                count=row.count,
                avg_confidence=round(row.avg_confidence, 3) if row.avg_confidence else None,
                common_tech=sorted(all_tech)[:10],
            )
        )
    return patterns


# ---------------------------------------------------------------------------
# Analysis – individual chart endpoints
# ---------------------------------------------------------------------------
@app.get("/analysis/auth", response_model=PieChartData)
async def analysis_auth(db: AsyncSession = Depends(get_db)):
    from backend.services.pattern_service import analyze_patterns
    data = await analyze_patterns(db)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data["auth_distribution"]


@app.get("/analysis/access-matrix", response_model=AccessMatrixData)
async def analysis_access_matrix(db: AsyncSession = Depends(get_db)):
    from backend.services.pattern_service import analyze_patterns
    data = await analyze_patterns(db)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data["access_matrix"]


@app.get("/analysis/blockers", response_model=BarChartData)
async def analysis_blockers(db: AsyncSession = Depends(get_db)):
    from backend.services.pattern_service import analyze_patterns
    data = await analyze_patterns(db)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data["top_blockers"]


@app.get("/analysis/correlations", response_model=CorrelationData)
async def analysis_correlations(db: AsyncSession = Depends(get_db)):
    from backend.services.pattern_service import analyze_patterns
    data = await analyze_patterns(db)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data["correlations"]


@app.get("/analysis/clusters", response_model=TechClusterData)
async def analysis_clusters(db: AsyncSession = Depends(get_db)):
    from backend.services.pattern_service import analyze_patterns
    data = await analyze_patterns(db)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data["tech_clusters"]


@app.get("/analysis", response_model=FullAnalysisResponse)
async def analysis_full(db: AsyncSession = Depends(get_db)):
    from backend.services.pattern_service import analyze_patterns
    data = await analyze_patterns(db)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------
@app.get("/metrics", response_model=MetricsResponse)
async def get_metrics(db: AsyncSession = Depends(get_db)):
    from backend.services.metrics_service import compute_metrics
    return await compute_metrics(db)


# ═══════════════════════════════════════════════════════════════════════════
# LLM Features Endpoints
# ═══════════════════════════════════════════════════════════════════════════

# --- Auto-Categorize ---
class CategorizeRequest(BaseModel):
    app_name: str
    description: str


@app.post("/llm/categorize")
async def auto_categorize(req: CategorizeRequest):
    from backend.services.llm_features import auto_categorize
    return await auto_categorize(req.app_name, req.description)


# --- Buildability Score ---
@app.get("/llm/buildability-score/{app_id}")
async def get_buildability_score(app_id: int, db: AsyncSession = Depends(get_db)):
    from backend.services.llm_features import score_buildability

    result = await db.execute(select(App).where(App.id == app_id))
    app_obj = result.scalar_one_or_none()
    if not app_obj:
        raise HTTPException(status_code=404, detail="App not found")

    rr_stmt = (
        select(ResearchResult)
        .where(ResearchResult.app_id == app_id)
        .order_by(ResearchResult.created_at.desc())
        .limit(1)
    )
    rr = (await db.execute(rr_stmt)).scalar_one_or_none()

    research_data = rr.raw_findings if rr and rr.raw_findings else {"name": app_obj.name}
    research_data["app_name"] = app_obj.name
    research_data["docs_url"] = app_obj.url

    return await score_buildability(research_data)


# --- Compare Apps ---
class CompareRequest(BaseModel):
    app1_id: int
    app2_id: int


@app.post("/llm/compare")
async def compare_apps(req: CompareRequest, db: AsyncSession = Depends(get_db)):
    from backend.services.llm_features import compare_apps

    result1 = await db.execute(select(App).where(App.id == req.app1_id))
    app1 = result1.scalar_one_or_none()
    result2 = await db.execute(select(App).where(App.id == req.app2_id))
    app2 = result2.scalar_one_or_none()

    if not app1 or not app2:
        raise HTTPException(status_code=404, detail="One or both apps not found")

    async def _get_research(app_id: int) -> dict:
        rr_stmt = (
            select(ResearchResult)
            .where(ResearchResult.app_id == app_id)
            .order_by(ResearchResult.created_at.desc())
            .limit(1)
        )
        rr = (await db.execute(rr_stmt)).scalar_one_or_none()
        return rr.raw_findings if rr and rr.raw_findings else {}

    r1 = await _get_research(req.app1_id)
    r1["name"] = app1.name
    r2 = await _get_research(req.app2_id)
    r2["name"] = app2.name

    return await compare_apps(r1, r2)


# --- Gap Analysis ---
@app.get("/llm/gaps")
async def get_gaps(db: AsyncSession = Depends(get_db)):
    from backend.services.llm_features import analyze_gaps

    stmt = select(ResearchResult, App).join(App, App.id == ResearchResult.app_id)
    result = await db.execute(stmt)
    results = []
    for research_result, app_obj in result.all():
        results.append(
            {
                "name": app_obj.name,
                "category": app_obj.category or "unknown",
                "app_id": research_result.app_id,
                "raw_findings": research_result.raw_findings,
                "summary": research_result.summary,
                "tech_stack": research_result.tech_stack,
                "confidence_score": research_result.confidence_score,
            }
        )

    if not results:
        return {"error": "No research data available"}

    return await analyze_gaps(results)


# --- Smart Recommendations ---
class RecommendRequest(BaseModel):
    goal: str


@app.post("/llm/recommend")
async def get_recommendations(req: RecommendRequest, db: AsyncSession = Depends(get_db)):
    from backend.services.llm_features import recommend_apps

    stmt = select(App).where(App.status == AppStatus.COMPLETED).limit(50)
    result = await db.execute(stmt)
    apps = result.scalars().all()

    app_list = []
    for a in apps:
        rr_stmt = (
            select(ResearchResult)
            .where(ResearchResult.app_id == a.id)
            .order_by(ResearchResult.created_at.desc())
            .limit(1)
        )
        rr = (await db.execute(rr_stmt)).scalar_one_or_none()
        raw = rr.raw_findings if rr and rr.raw_findings else {}
        raw["name"] = a.name
        raw["category"] = a.category
        app_list.append(raw)

    return await recommend_apps(req.goal, app_list)


# --- Doc Quality Score ---
@app.get("/llm/doc-quality/{app_id}")
async def rate_docs(app_id: int, db: AsyncSession = Depends(get_db)):
    from backend.services.llm_features import score_doc_quality

    result = await db.execute(select(App).where(App.id == app_id))
    app_obj = result.scalar_one_or_none()
    if not app_obj:
        raise HTTPException(status_code=404, detail="App not found")

    return await score_doc_quality(app_obj.name, app_obj.url)
