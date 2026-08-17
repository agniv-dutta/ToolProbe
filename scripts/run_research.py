#!/usr/bin/env python3
"""CLI entry point to run the research agent."""
import asyncio
import json
import logging
import sys
from pathlib import Path
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.agents.research_agent import run_research
from backend.agents.verification_agent import run_verification_spot_checks
from backend.config import settings

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO), format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

APPS_JSON = Path(__file__).resolve().parent.parent / "research_data" / "apps_list.json"
OUTPUT_JSON = Path(__file__).resolve().parent.parent / "research_data" / "results.json"
console = Console()


async def main():
    console.rule("[bold green]ToolProbe Research Agent[/bold green]")
    console.print(f"Model:  {settings.RESEARCH_MODEL}")
    console.print(f"Apps:   {APPS_JSON}")

    with open(APPS_JSON, encoding="utf-8") as f:
        apps = json.load(f)

    console.print(f"Loaded {len(apps)} apps to research\n")

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Researching apps…", total=len(apps))

        original_save = __import__("backend.agents.research_agent", fromlist=["_save_result"])._save_result
        original_process = __import__("backend.agents.research_agent", fromlist=["_process_app"])._process_app

        async def tracked_process(app, index, total):
            progress.update(task, description=f"[cyan]{app.name}[/cyan]")
            result = await original_process(app, index, total)
            progress.advance(task)
            return result

        __import__("backend.agents.research_agent")._process_app = tracked_process
        results = await run_research(apps, output_path=str(OUTPUT_JSON))
        __import__("backend.agents.research_agent")._process_app = original_process

    completed = sum(1 for r in results if r["status"] == "completed")
    failed = len(results) - completed

    console.print()
    console.rule("[bold]Results[/bold]")
    console.print(f"  Completed: [green]{completed}[/green]")
    console.print(f"  Failed:    [red]{failed}[/red]")

    console.print("\nRunning verification spot checks…")
    vresult = await run_verification_spot_checks()
    console.print(f"  Checked: {vresult['checked']}, Accurate: {vresult['accurate']}")

    console.print(f"\n[bold]Exported to:[/bold] {OUTPUT_JSON}")


if __name__ == "__main__":
    asyncio.run(main())
