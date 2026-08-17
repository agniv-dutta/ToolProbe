#!/usr/bin/env python3
"""Spot-check a random sample of research results for accuracy."""
import asyncio
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal
from backend.models import App, ResearchResult, VerificationLog

SAMPLE_SIZE = 5


async def verify_sample():
    async with AsyncSessionLocal() as db:
        count_stmt = select(func.count(ResearchResult.id))
        total = (await db.execute(count_stmt)).scalar_one()
        if total == 0:
            print("No research results to verify")
            return

        sample_count = min(SAMPLE_SIZE, total)
        stmt = (
            select(ResearchResult)
            .order_by(func.random())
            .limit(sample_count)
        )
        result = await db.execute(stmt)
        samples = result.scalars().all()

        print(f"Verifying {len(samples)} random results:\n")
        for rr in samples:
            app_stmt = select(App).where(App.id == rr.app_id)
            app = (await db.execute(app_stmt)).scalar_one()
            tech = ", ".join(rr.tech_stack or [])
            print(f"  App: {app.name}")
            print(f"  Tech: {tech}")
            print(f"  Confidence: {rr.confidence_score}")
            print(f"  Summary: {(rr.summary or '')[:100]}...")
            print()

        print("Spot-check complete.")


if __name__ == "__main__":
    asyncio.run(verify_sample())
