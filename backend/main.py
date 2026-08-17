import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import get_db, init_db
from backend.models import App, AppStatus, ResearchResult, VerificationLog
from backend.schemas.schemas import (
    AppCreate,
    AppRead,
    AppList,
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
    version="0.1.0",
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
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
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
    limit: int = Query(50, ge=1, le=200),
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
    return AppList(items=items, total=total)


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
    import json as _json
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

    research_json = _json.dumps(rr.raw_findings, indent=2, default=str)

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
