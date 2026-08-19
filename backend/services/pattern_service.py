import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import App, ResearchResult
from backend.agents.pattern_analyzer import run_full_analysis, export_analysis

logger = logging.getLogger(__name__)


async def analyze_patterns(db: AsyncSession, export_path: str | None = None) -> dict:
    app_stmt = select(App)
    app_result = await db.execute(app_stmt)
    apps = [
        {
            "id": a.id,
            "name": a.name,
            "url": a.url,
            "category": a.category,
            "description": a.description,
        }
        for a in app_result.scalars().all()
    ]

    rr_stmt = select(ResearchResult)
    rr_result = await db.execute(rr_stmt)
    results = [
        {
            "app_id": r.app_id,
            "raw_findings": r.raw_findings,
            "summary": r.summary,
            "tech_stack": r.tech_stack,
            "confidence_score": r.confidence_score,
            "sources": r.sources,
        }
        for r in rr_result.scalars().all()
    ]

    if not apps or not results:
        logger.warning("No apps or results found for analysis; returning empty analysis payload")

    analysis = run_full_analysis(apps, results)

    if export_path:
        export_analysis(analysis, export_path)

    return analysis
