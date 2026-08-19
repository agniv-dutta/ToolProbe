#!/usr/bin/env python3
"""Import the bundled frontend research fixture into the SQLite database."""
import asyncio
import json
import sys
from pathlib import Path

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import AsyncSessionLocal, init_db
from backend.models import App, AppStatus, ResearchResult, VerificationLog

FIXTURE = Path(__file__).resolve().parent.parent / "frontend" / "public" / "data.json"


async def import_fixture() -> None:
    await init_db()
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    imported = 0

    async with AsyncSessionLocal() as db:
        for item in fixture:
            app = await db.scalar(select(App).where(App.name == item["name"]))
            if app is None:
                app = App(
                    name=item["name"],
                    url=item.get("url"),
                    category=item.get("category"),
                    description=item.get("description"),
                    status=AppStatus.PENDING,
                )
                db.add(app)
                await db.flush()

            research = item.get("research")
            if research and not await db.scalar(
                select(ResearchResult).where(ResearchResult.app_id == app.id).limit(1)
            ):
                db.add(
                    ResearchResult(
                        app_id=app.id,
                        agent_version="bundled-fixture",
                        raw_findings=research.get("raw_findings"),
                        summary=research.get("summary"),
                        tech_stack=research.get("tech_stack"),
                        confidence_score=research.get("confidence_score"),
                        sources=research.get("sources"),
                    )
                )
                app.status = AppStatus.COMPLETED
                imported += 1

            for verification in item.get("verifications", []):
                exists = await db.scalar(
                    select(VerificationLog).where(
                        VerificationLog.app_id == app.id,
                        VerificationLog.claim == verification.get("claim"),
                    ).limit(1)
                )
                if not exists:
                    db.add(
                        VerificationLog(
                            app_id=app.id,
                            method=verification.get("method"),
                            claim=verification.get("claim"),
                            evidence=verification.get("evidence"),
                            is_accurate=verification.get("is_accurate"),
                        )
                    )

        await db.commit()

    print(f"Imported research fixture for {imported} apps")


if __name__ == "__main__":
    asyncio.run(import_fixture())