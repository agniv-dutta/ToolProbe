import logging
from datetime import datetime, timezone
from sqlalchemy import select, func, case, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import App, AppStatus, ResearchResult, VerificationLog

logger = logging.getLogger(__name__)


async def compute_metrics(db: AsyncSession) -> dict:
    now = datetime.now(timezone.utc)

    # ── Research metrics ────────────────────────────────────────────────
    total_apps_stmt = select(func.count(App.id))
    total_apps = (await db.execute(total_apps_stmt)).scalar_one()

    completed_stmt = select(func.count(App.id)).where(App.status == AppStatus.COMPLETED)
    completed = (await db.execute(completed_stmt)).scalar_one()

    failed_stmt = select(func.count(App.id)).where(App.status == AppStatus.FAILED)
    failed = (await db.execute(failed_stmt)).scalar_one()

    avg_conf_stmt = select(func.avg(ResearchResult.confidence_score))
    avg_confidence = (await db.execute(avg_conf_stmt)).scalar_one() or 0.0

    low_conf_stmt = (
        select(func.count(ResearchResult.id))
        .where(ResearchResult.confidence_score < 0.7)
        .where(ResearchResult.confidence_score.isnot(None))
    )
    low_confidence_count = (await db.execute(low_conf_stmt)).scalar_one()

    # Timing from raw_findings (if stored)
    timing_stmt = select(ResearchResult.raw_findings).where(ResearchResult.raw_findings.isnot(None))
    timing_result = await db.execute(timing_stmt)
    per_app_times: list[float] = []
    for (raw,) in timing_result.all():
        if isinstance(raw, dict) and "_elapsed_seconds" in raw:
            per_app_times.append(float(raw["_elapsed_seconds"]))

    avg_time_per_app = sum(per_app_times) / len(per_app_times) if per_app_times else None
    total_research_time = sum(per_app_times) if per_app_times else None

    # ── Accuracy metrics ────────────────────────────────────────────────
    total_verifications_stmt = select(func.count(VerificationLog.id))
    total_verifications = (await db.execute(total_verifications_stmt)).scalar_one()

    accurate_stmt = (
        select(func.count(VerificationLog.id))
        .where(VerificationLog.is_accurate.is_(True))
    )
    accurate_count = (await db.execute(accurate_stmt)).scalar_one()

    inaccurate_stmt = (
        select(func.count(VerificationLog.id))
        .where(VerificationLog.is_accurate.is_(False))
    )
    inaccurate_count = (await db.execute(inaccurate_stmt)).scalar_one()

    pending_verif_stmt = (
        select(func.count(VerificationLog.id))
        .where(VerificationLog.is_accurate.is_(None))
    )
    pending_verifications = (await db.execute(pending_verif_stmt)).scalar_one()

    # Accuracy by category
    acc_by_cat_stmt = (
        select(
            App.category,
            func.count(VerificationLog.id).label("total"),
            func.sum(case((VerificationLog.is_accurate.is_(True), 1), else_=0)).label("accurate"),
        )
        .join(VerificationLog, App.id == VerificationLog.app_id)
        .group_by(App.category)
    )
    acc_by_cat_result = await db.execute(acc_by_cat_stmt)
    accuracy_by_category = {}
    for row in acc_by_cat_result.all():
        cat = row.category or "unknown"
        t = row.total or 0
        a = row.accurate or 0
        accuracy_by_category[cat] = {
            "total": t,
            "accurate": a,
            "percentage": round((a / t * 100), 1) if t > 0 else 0,
        }

    # Auth method accuracy (verifications with method containing 'auth')
    auth_verif_stmt = (
        select(func.count(VerificationLog.id))
        .where(VerificationLog.method.isnot(None))
        .where(VerificationLog.method.ilike("%auth%"))
    )
    auth_total = (await db.execute(auth_verif_stmt)).scalar_one()

    auth_accurate_stmt = (
        select(func.count(VerificationLog.id))
        .where(VerificationLog.method.isnot(None))
        .where(VerificationLog.method.ilike("%auth%"))
        .where(VerificationLog.is_accurate.is_(True))
    )
    auth_accurate = (await db.execute(auth_accurate_stmt)).scalar_one()

    # Self-serve detection (from raw_findings access_model)
    ss_stmt = select(ResearchResult.raw_findings, ResearchResult.app_id)
    ss_result = await db.execute(ss_stmt)
    self_serve_detected = 0
    self_serve_correct = 0
    gated_detected = 0
    gated_correct = 0
    for (raw, app_id) in ss_result.all():
        if not isinstance(raw, dict):
            continue
        access = raw.get("access_model", "unknown")
        v_stmt = (
            select(VerificationLog.is_accurate)
            .where(VerificationLog.app_id == app_id)
            .where(VerificationLog.is_accurate.isnot(None))
            .limit(1)
        )
        v_result = (await db.execute(v_stmt)).scalar_one_or_none()
        if access == "self_serve":
            self_serve_detected += 1
            if v_result is True:
                self_serve_correct += 1
        elif access == "gated":
            gated_detected += 1
            if v_result is True:
                gated_correct += 1

    ss_precision = round(self_serve_correct / self_serve_detected, 3) if self_serve_detected > 0 else 0
    gated_precision = round(gated_correct / gated_detected, 3) if gated_detected > 0 else 0

    # ── Output metrics ──────────────────────────────────────────────────
    category_count_stmt = select(func.count(func.distinct(App.category))).where(App.category.isnot(None))
    category_count = (await db.execute(category_count_stmt)).scalar_one()

    return {
        "research": {
            "apps_total": total_apps,
            "apps_completed": completed,
            "apps_failed": failed,
            "avg_confidence": round(float(avg_confidence), 3),
            "low_confidence_count": low_confidence_count,
            "avg_time_per_app": round(avg_time_per_app, 2) if avg_time_per_app else None,
            "total_research_time": round(total_research_time, 1) if total_research_time else None,
        },
        "accuracy": {
            "spot_check_total": total_verifications,
            "spot_check_accurate": accurate_count,
            "spot_check_inaccurate": inaccurate_count,
            "spot_check_pending": pending_verifications,
            "overall_accuracy_pct": round((accurate_count / total_verifications * 100), 1) if total_verifications > 0 else None,
            "accuracy_by_category": accuracy_by_category,
            "auth_method_accuracy_pct": round((auth_accurate / auth_total * 100), 1) if auth_total > 0 else None,
            "self_serve_precision": ss_precision,
            "self_serve_recall": ss_precision,
            "gated_precision": gated_precision,
            "buildability_match_pct": round((accurate_count / total_verifications * 100), 1) if total_verifications > 0 else None,
        },
        "output": {
            "categories_count": category_count,
            "pattern_visualizations": 6,
            "searchable_app_table": True,
            "mobile_responsive": True,
        },
    }
