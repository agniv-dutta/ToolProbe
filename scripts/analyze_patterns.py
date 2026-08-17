#!/usr/bin/env python3
"""CLI script to run pattern analysis on completed research results."""
import asyncio
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from backend.database import AsyncSessionLocal, init_db
from backend.models import App, ResearchResult
from backend.agents.pattern_analyzer import run_full_analysis, export_analysis

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

OUTPUT = Path(__file__).resolve().parent.parent / "research_data" / "patterns.json"


async def main():
    await init_db()
    async with AsyncSessionLocal() as db:
        app_stmt = select(App).where(App.status == "completed")
        apps_raw = (await db.execute(app_stmt)).scalars().all()

        rr_stmt = select(ResearchResult)
        rrs_raw = (await db.execute(rr_stmt)).scalars().all()

    apps = [
        {"id": a.id, "name": a.name, "url": a.url, "category": a.category, "description": a.description}
        for a in apps_raw
    ]
    results = [
        {"app_id": r.app_id, "raw_findings": r.raw_findings, "summary": r.summary, "tech_stack": r.tech_stack, "confidence_score": r.confidence_score, "sources": r.sources}
        for r in rrs_raw
    ]

    if not apps:
        print("No completed apps found. Run seed_apps.py and run_research.py first.")
        return

    print(f"Analyzing {len(apps)} apps with {len(results)} research results…\n")
    analysis = run_full_analysis(apps, results)

    if "error" in analysis:
        print(f"Error: {analysis['error']}")
        return

    export_analysis(analysis, OUTPUT)

    s = analysis["summary"]
    print("─── Summary ───────────────────────────────────────")
    print(f"  Total apps:             {s['total_apps']}")
    print(f"  Categories:             {s['categories']}")
    print(f"  Self-serve:             {s['self_serve_pct']}%")
    print(f"  Gated:                  {s['gated_pct']}%")
    print(f"  Apps with blockers:     {s['apps_with_blockers']}")
    print(f"  Avg tech count:         {s['avg_tech_count']}")
    print()

    auth = analysis["auth_distribution"]
    print("─── Auth Methods ──────────────────────────────────")
    for label, val in zip(auth["labels"], auth["values"]):
        print(f"  {label:<20} {val}")
    print()

    blockers = analysis["top_blockers"]
    print("─── Top Blockers ──────────────────────────────────")
    for label, val in zip(blockers["labels"], blockers["values"]):
        print(f"  {label:<25} {val}")
    print()

    corr = analysis["correlations"]
    gv = corr["gated_vs_selfserve"]
    print("─── Gated vs Self-Serve ───────────────────────────")
    print(f"  Gated:     {gv['gated']['count']} apps, avg_conf={gv['gated']['avg_confidence']}, avg_tech={gv['gated']['avg_tech_count']}")
    print(f"  Self-serve:{gv['self_serve']['count']} apps, avg_conf={gv['self_serve']['avg_confidence']}, avg_tech={gv['self_serve']['avg_tech_count']}")
    print(f"  Insight:   {gv['insight']}")
    print()

    clusters = analysis["tech_clusters"]
    print("─── Tech Clusters ─────────────────────────────────")
    for cl in clusters["clusters"]:
        print(f"  Cluster {cl['cluster_id']}: {cl['size']} apps – {', '.join(cl['top_techs'][:4])}")
    print()

    print(f"Exported to {OUTPUT}")


if __name__ == "__main__":
    asyncio.run(main())
