import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal
from backend.models import App, ResearchResult, VerificationLog
from backend.utils.web_search import call_groq_verify

logger = logging.getLogger(__name__)

VERDICT_MAP = {
    "likely_accurate": True,
    "likely_inaccurate": False,
    "cannot_determine": None,
}


async def verify_claim(vlog: VerificationLog, app: App, rr: ResearchResult | None) -> dict:
    context = ""
    if rr:
        tech = ", ".join(rr.tech_stack or [])
        context = f"Known tech stack: {tech}. Summary: {(rr.summary or '')[:500]}"

    try:
        result = await call_groq_verify(
            claim=vlog.claim or "",
            app_name=app.name,
            context=context,
        )
        return result
    except Exception as exc:
        logger.warning("LLM verification failed for %s: %s", app.name, exc)
        return {"verdict": "cannot_determine", "confidence": 0.0, "notes": f"LLM error: {exc}"}


async def run_verification_spot_checks(batch_size: int = 10) -> dict:
    async with AsyncSessionLocal() as db:
        stmt = (
            select(VerificationLog)
            .where(VerificationLog.is_accurate.is_(None))
            .order_by(VerificationLog.created_at.desc())
            .limit(batch_size)
        )
        result = await db.execute(stmt)
        pending = result.scalars().all()

        if not pending:
            logger.info("No pending verifications to process")
            return {"checked": 0, "accurate": 0, "inaccurate": 0, "undetermined": 0}

        checked = 0
        accurate = 0
        inaccurate = 0
        undetermined = 0

        for vlog in pending:
            app_stmt = select(App).where(App.id == vlog.app_id)
            app = (await db.execute(app_stmt)).scalar_one_or_none()
            if not app:
                continue

            rr_stmt = (
                select(ResearchResult)
                .where(ResearchResult.app_id == app.id)
                .order_by(ResearchResult.created_at.desc())
                .limit(1)
            )
            rr = (await db.execute(rr_stmt)).scalar_one_or_none()

            verdict_result = await verify_claim(vlog, app, rr)
            verdict = verdict_result.get("verdict", "cannot_determine")

            vlog.is_accurate = VERDICT_MAP.get(verdict)
            vlog.evidence = verdict_result.get("notes", "")
            vlog.raw_response = verdict_result
            checked += 1

            if verdict == "likely_accurate":
                accurate += 1
            elif verdict == "likely_inaccurate":
                inaccurate += 1
            else:
                undetermined += 1

            logger.info(
                "  [%s] %s → %s (confidence: %s)",
                app.name,
                (vlog.claim or "")[:60],
                verdict,
                verdict_result.get("confidence", "?"),
            )

        await db.commit()
        logger.info(
            "Verification complete: %d checked, %d accurate, %d inaccurate, %d undetermined",
            checked, accurate, inaccurate, undetermined,
        )
        return {
            "checked": checked,
            "accurate": accurate,
            "inaccurate": inaccurate,
            "undetermined": undetermined,
        }
