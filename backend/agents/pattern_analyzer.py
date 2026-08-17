import json
import logging
import re
from pathlib import Path
from collections import Counter
from typing import Any

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import MultiLabelBinarizer, OneHotEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from scipy.stats import chi2_contingency

logger = logging.getLogger(__name__)

BLOCKER_KEYWORDS = [
    "rate limit", "rate-limit", "approval required", "manual review",
    "waitlist", "invite only", "invited only", "application process",
    "credit card", "payment required", "sandbox only", "no public api",
    "deprecated", "sunset", "legacy", "no webhooks", "limited access",
    "enterprise only", "custom pricing", "contact sales",
    "no free tier", "usage cap", "quota", "throttling",
]

AUTH_KEYWORDS = {
    "oauth2": ["oauth", "oauth2", "oauth 2"],
    "api_key": ["api key", "api-key", "apikey", "token-based", "bearer token"],
    "sso": ["sso", "saml", "single sign-on"],
    "basic_auth": ["basic auth", "basic authentication", "username/password"],
    "jwt": ["jwt", "json web token"],
    "session": ["session", "cookie", "session-based"],
    "webhook": ["webhook", "web hook", "callback url"],
    "mtls": ["mtls", "mutual tls", "client certificate"],
}

SELF_SERVE_KEYWORDS = [
    "self-serve", "self serve", "instant", "sign up", "free tier",
    "free plan", "trial", "open source", "open-source", "community edition",
    "no approval", "instant access", "sandbox",
]

GATED_KEYWORDS = [
    "approval", "sales call", "contact sales", "demo required",
    "enterprise plan", "custom pricing", "contract", "onboarding process",
    "manual provisioning", "credit check", "business verification",
]

GATE_LABELS = {"self_serve": "Self-Serve", "gated": "Gated", "unknown": "Unknown"}


# ---------------------------------------------------------------------------
# Feature extraction from raw_findings
# ---------------------------------------------------------------------------

def _extract_auth_methods(text: str) -> list[str]:
    text_lower = text.lower()
    found = []
    for method, keywords in AUTH_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            found.append(method)
    return found or ["unknown"]


def _extract_blockers(text: str) -> list[str]:
    text_lower = text.lower()
    return [kw for kw in BLOCKER_KEYWORDS if kw in text_lower]


def _classify_access_model(pricing: str | None, text: str) -> str:
    text_lower = text.lower()
    if pricing == "open_source":
        return "self_serve"
    if any(kw in text_lower for kw in GATED_KEYWORDS):
        return "gated"
    if any(kw in text_lower for kw in SELF_SERVE_KEYWORDS):
        return "self_serve"
    if pricing in ("free", "freemium"):
        return "self_serve"
    if pricing == "paid":
        return "unknown"
    return "unknown"


def _build_feature_row(app: dict, rr: dict) -> dict:
    raw = rr.get("raw_findings") or {}
    summary = raw.get("summary", "") or ""
    patterns = raw.get("notable_patterns", "") or ""
    features = raw.get("key_features") or []
    combined_text = f"{summary} {patterns} {' '.join(features)}"

    pricing = raw.get("pricing_model", "unknown")
    auth_methods = _extract_auth_methods(combined_text)
    blockers = _extract_blockers(combined_text)
    access_model = _classify_access_model(pricing, combined_text)
    tech_stack = raw.get("tech_stack") or []

    return {
        "app_id": app.get("id"),
        "name": app.get("name", ""),
        "category": app.get("category", "unknown"),
        "pricing_model": pricing or "unknown",
        "access_model": access_model,
        "auth_methods": auth_methods,
        "blockers": blockers,
        "blocker_count": len(blockers),
        "tech_stack": tech_stack,
        "tech_count": len(tech_stack),
        "feature_count": len(features),
        "confidence_score": rr.get("confidence_score", 0),
        "has_webhook": "webhook" in combined_text.lower(),
        "has_rate_limit": any(k in combined_text.lower() for k in ("rate limit", "rate-limit", "throttl")),
        "combined_text": combined_text,
    }


# ---------------------------------------------------------------------------
# Main analysis pipeline
# ---------------------------------------------------------------------------

def build_dataframe(apps: list[dict], results: list[dict]) -> pd.DataFrame:
    rr_by_app: dict[int, dict] = {}
    for r in results:
        aid = r.get("app_id")
        if aid is not None:
            rr_by_app[aid] = r

    rows = []
    for app in apps:
        rr = rr_by_app.get(app["id"])
        if rr is None:
            continue
        rows.append(_build_feature_row(app, rr))

    df = pd.DataFrame(rows)
    logger.info("Built DataFrame: %d rows, %d columns", len(df), len(df.columns))
    return df


# ---------------------------------------------------------------------------
# 1. Auth method distribution (pie chart)
# ---------------------------------------------------------------------------

def auth_method_distribution(df: pd.DataFrame) -> dict:
    counter: Counter = Counter()
    for methods in df["auth_methods"]:
        for m in methods:
            counter[m] += 1

    items = sorted(counter.items(), key=lambda x: x[1], reverse=True)
    return {
        "title": "Authentication Method Distribution",
        "labels": [i[0] for i in items],
        "values": [i[1] for i in items],
        "total_apps": len(df),
    }


# ---------------------------------------------------------------------------
# 2. Self-serve vs gated matrix (heatmap / grouped bar)
# ---------------------------------------------------------------------------

def access_model_matrix(df: pd.DataFrame) -> dict:
    ct = pd.crosstab(df["category"], df["access_model"])
    for label in ("self_serve", "gated", "unknown"):
        if label not in ct.columns:
            ct[label] = 0

    ct = ct[["self_serve", "gated", "unknown"]].sort_values("self_serve", ascending=False)

    return {
        "title": "Access Model by Category",
        "categories": ct.index.tolist(),
        "series": {
            "self_serve": ct["self_serve"].tolist(),
            "gated": ct["gated"].tolist(),
            "unknown": ct["unknown"].tolist(),
        },
    }


# ---------------------------------------------------------------------------
# 3. Top 10 blockers (bar chart)
# ---------------------------------------------------------------------------

def top_blockers(df: pd.DataFrame, top_n: int = 10) -> dict:
    counter: Counter = Counter()
    for blockers in df["blockers"]:
        counter.update(blockers)

    items = counter.most_common(top_n)
    return {
        "title": f"Top {top_n} Integration Blockers",
        "labels": [i[0] for i in items],
        "values": [i[1] for i in items],
        "total_apps_with_blockers": int((df["blocker_count"] > 0).sum()),
    }


# ---------------------------------------------------------------------------
# 4. Correlations
# ---------------------------------------------------------------------------

def _cramers_v(contingency: pd.DataFrame) -> float:
    chi2 = chi2_contingency(contingency)[0]
    n = contingency.sum().sum()
    min_dim = min(contingency.shape) - 1
    if min_dim == 0 or n == 0:
        return 0.0
    return float(np.sqrt(chi2 / (n * min_dim)))


def correlation_analysis(df: pd.DataFrame) -> dict:
    results: list[dict] = []

    for col_pair in [
        ("access_model", "pricing_model"),
        ("access_model", "category"),
        ("category", "pricing_model"),
    ]:
        ct = pd.crosstab(df[col_pair[0]], df[col_pair[1]])
        v = _cramers_v(ct)
        results.append({
            "pair": list(col_pair),
            "cramers_v": round(v, 4),
            "strength": "strong" if v > 0.3 else "moderate" if v > 0.15 else "weak",
        })

    gated = df[df["access_model"] == "gated"]
    selfserve = df[df["access_model"] == "self_serve"]
    avg_conf_gated = float(gated["confidence_score"].mean()) if len(gated) > 0 else 0
    avg_conf_ss = float(selfserve["confidence_score"].mean()) if len(selfserve) > 0 else 0
    avg_tech_gated = float(gated["tech_count"].mean()) if len(gated) > 0 else 0
    avg_tech_ss = float(selfserve["tech_count"].mean()) if len(selfserve) > 0 else 0

    return {
        "title": "Correlation Analysis",
        "categorical_correlations": results,
        "gated_vs_selfserve": {
            "gated": {
                "count": int(len(gated)),
                "avg_confidence": round(avg_conf_gated, 3),
                "avg_tech_count": round(avg_tech_gated, 2),
            },
            "self_serve": {
                "count": int(len(selfserve)),
                "avg_confidence": round(avg_conf_ss, 3),
                "avg_tech_count": round(avg_tech_ss, 2),
            },
            "insight": (
                "Gated apps show higher confidence scores and richer tech stacks"
                if avg_conf_gated > avg_conf_ss
                else "Self-serve apps show comparable or higher confidence scores"
            ),
        },
    }


# ---------------------------------------------------------------------------
# 5. Tech cluster analysis (KMeans on tech + features)
# ---------------------------------------------------------------------------

def tech_clusters(df: pd.DataFrame, n_clusters: int = 5) -> dict:
    if len(df) < n_clusters:
        n_clusters = max(2, len(df))

    mlb = MultiLabelBinarizer()
    tech_matrix = mlb.fit_transform(df["tech_stack"])
    feature_names = mlb.classes_

    tfidf = TfidfVectorizer(max_features=50, stop_words="english")
    text_matrix = tfidf.fit_transform(df["combined_text"].fillna(""))
    text_features = tfidf.get_feature_names_out()

    combined = np.hstack([tech_matrix, text_matrix.toarray()])

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    df = df.copy()
    df["cluster"] = kmeans.fit_predict(combined)

    cluster_summaries = []
    for cid in range(n_clusters):
        subset = df[df["cluster"] == cid]
        if len(subset) == 0:
            continue
        top_techs = (
            subset["tech_stack"]
            .explode()
            .value_counts()
            .head(5)
            .index.tolist()
        )
        top_categories = subset["category"].value_counts().head(3).index.tolist()
        cluster_summaries.append({
            "cluster_id": cid,
            "size": int(len(subset)),
            "apps": subset["name"].tolist(),
            "top_techs": top_techs,
            "top_categories": top_categories,
            "avg_confidence": round(float(subset["confidence_score"].mean()), 3),
        })

    return {
        "title": "Technology Clusters",
        "n_clusters": n_clusters,
        "clusters": cluster_summaries,
    }


# ---------------------------------------------------------------------------
# Full analysis pipeline
# ---------------------------------------------------------------------------

def run_full_analysis(apps: list[dict], results: list[dict]) -> dict:
    df = build_dataframe(apps, results)
    if df.empty:
        return {"error": "No data to analyze", "total_apps": 0}

    return {
        "auth_distribution": auth_method_distribution(df),
        "access_matrix": access_model_matrix(df),
        "top_blockers": top_blockers(df),
        "correlations": correlation_analysis(df),
        "tech_clusters": tech_clusters(df),
        "summary": {
            "total_apps": int(len(df)),
            "categories": int(df["category"].nunique()),
            "self_serve_pct": round(float((df["access_model"] == "self_serve").mean() * 100), 1),
            "gated_pct": round(float((df["access_model"] == "gated").mean() * 100), 1),
            "apps_with_blockers": int((df["blocker_count"] > 0).sum()),
            "avg_tech_count": round(float(df["tech_count"].mean()), 1),
        },
    }


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

def export_analysis(data: dict, path: str | Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
    logger.info("Analysis exported to %s", path)
