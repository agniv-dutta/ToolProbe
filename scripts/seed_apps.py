#!/usr/bin/env python3
"""Load apps from apps_list.json into the database."""
import asyncio
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from backend.database import AsyncSessionLocal, init_db
from backend.models import App, AppStatus

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

APPS_JSON = Path(__file__).resolve().parent.parent / "research_data" / "apps_list.json"


async def seed():
    await init_db()
    with open(APPS_JSON, encoding="utf-8") as f:
        apps_data = json.load(f)

    async with AsyncSessionLocal() as db:
        inserted = 0
        skipped = 0
        for item in apps_data:
            existing = await db.scalar(select(App).where(App.name == item["name"]))
            if existing:
                skipped += 1
                continue
            app = App(
                name=item["name"],
                url=item.get("url"),
                category=item.get("category"),
                description=item.get("description"),
                status=AppStatus.PENDING,
            )
            db.add(app)
            inserted += 1
        await db.commit()
    logger.info("Seeded %d apps into database (%d already existed)", inserted, skipped)


if __name__ == "__main__":
    asyncio.run(seed())
