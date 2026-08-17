#!/usr/bin/env python3
"""Export research results from SQLite to JSON for the frontend."""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal
from backend.models import App, ResearchResult, VerificationLog

OUTPUT = Path(__file__).resolve().parent.parent / "research_data" / "results.json"


async def export():
    async with AsyncSessionLocal() as db:
        stmt = select(App).order_by(App.id)
        result = await db.execute(stmt)
        apps = result.scalars().all()

        export_data = []
        for app in apps:
            rr_stmt = (
                select(ResearchResult)
                .where(ResearchResult.app_id == app.id)
                .order_by(ResearchResult.created_at.desc())
                .limit(1)
            )
            rr_result = await db.execute(rr_stmt)
            rr = rr_result.scalar_one_or_none()

            v_stmt = select(VerificationLog).where(VerificationLog.app_id == app.id)
            v_result = await db.execute(v_stmt)
            vlogs = v_result.scalars().all()

            export_data.append({
                "id": app.id,
                "name": app.name,
                "url": app.url,
                "category": app.category,
                "description": app.description,
                "status": app.status.value if app.status else "unknown",
                "created_at": app.created_at.isoformat() if app.created_at else None,
                "updated_at": app.updated_at.isoformat() if app.updated_at else None,
                "research": {
                    "summary": rr.summary if rr else None,
                    "tech_stack": rr.tech_stack if rr else None,
                    "confidence_score": rr.confidence_score if rr else None,
                    "sources": rr.sources if rr else None,
                    "raw_findings": rr.raw_findings if rr else None,
                } if rr else None,
                "verifications": [
                    {
                        "id": v.id,
                        "method": v.method,
                        "claim": v.claim,
                        "evidence": v.evidence,
                        "is_accurate": v.is_accurate,
                        "created_at": v.created_at.isoformat() if v.created_at else None,
                    }
                    for v in vlogs
                ],
            })

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
    print(f"Exported {len(export_data)} apps to {OUTPUT}")


if __name__ == "__main__":
    asyncio.run(export())
