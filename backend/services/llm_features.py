"""
LLM-powered features beyond basic research.
Auto-categorization, buildability scoring, comparison, gap analysis,
smart recommendations, and doc quality scoring.
"""
import json
import logging
from typing import Any

from fastapi import HTTPException
from groq import AsyncGroq

from backend.config import settings

logger = logging.getLogger(__name__)


def _get_client() -> AsyncGroq:
    if not settings.GROQ_API_KEY.strip():
        raise HTTPException(
            status_code=503,
            detail="LLM features are unavailable because GROQ_API_KEY is not configured.",
        )
    return AsyncGroq(api_key=settings.GROQ_API_KEY)


def _parse_json(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        raw = text.strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            return json.loads("\n".join(lines))
        if "```json" in raw:
            start = raw.index("```json") + 7
            end = raw.index("```", start)
            return json.loads(raw[start:end].strip())
        raise ValueError(f"LLM returned non-JSON: {text[:300]}")


# ═══════════════════════════════════════════════════════════════════════════
# 1. Auto-Categorizer
# ═══════════════════════════════════════════════════════════════════════════

CATEGORIES = [
    "CRM_SALES",
    "SUPPORT_HELPDESK",
    "MESSAGING_COMMS",
    "MARKETING_EMAIL",
    "ECOMMERCE",
    "DATA_SEO",
    "DEVELOPER_INFRA",
    "PRODUCTIVITY_PM",
    "FINANCE_FINTECH",
    "AI_RESEARCH_MEDIA",
]


async def auto_categorize(app_name: str, description: str) -> dict:
    prompt = f"""Given this app: {app_name} - {description}

Assign ONE of these categories:
- CRM_SALES: Customer relationship management
- SUPPORT_HELPDESK: Customer support systems
- MESSAGING_COMMS: Real-time messaging, calls
- MARKETING_EMAIL: Email, ads, social
- ECOMMERCE: Online stores, commerce
- DATA_SEO: Analytics, data, web scraping
- DEVELOPER_INFRA: APIs, databases, hosting
- PRODUCTIVITY_PM: Project management, notes
- FINANCE_FINTECH: Payments, accounting, crypto
- AI_RESEARCH_MEDIA: AI tools, research, video

Return JSON: {{"category": "CATEGORY_NAME", "confidence": 0.95}}"""

    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.RESEARCH_MODEL,
        messages=[
            {"role": "system", "content": "You are an expert app categorizer. Return valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=100,
        temperature=0.1,
    )
    text = response.choices[0].message.content
    return _parse_json(text)


# ═══════════════════════════════════════════════════════════════════════════
# 2. Buildability Scorer
# ═══════════════════════════════════════════════════════════════════════════

async def score_buildability(research_data: dict) -> dict:
    prompt = f"""Rate this app for AI agent integration (0-100):

App: {research_data.get('app_name', research_data.get('name', 'Unknown'))}
Auth: {research_data.get('primary_auth', research_data.get('auth_methods', 'Unknown'))} (self-serve: {research_data.get('self_serve', research_data.get('access_model', 'Unknown'))})
API: {research_data.get('api_type', 'Unknown')} - {research_data.get('api_scope', 'Unknown')}
Documentation: {research_data.get('api_docs_url', research_data.get('docs_url', 'N/A'))}
Blocker: {research_data.get('main_blocker', 'None')}

Score Factors:
- Auth complexity: OAuth2=10pts, API Key=8pts, Basic=5pts, Custom=3pts
- Self-serve: YES=10pts, TRIAL=8pts, PAID_ONLY=0pts, GATED=-5pts
- API quality: REST+GraphQL=10pts, REST=7pts, GraphQL=8pts, Limited=3pts
- Docs: Public=10pts, Behind login=5pts, None=0pts
- No major blocker=+10pts

Return JSON: {{"score": 75, "reasoning": "...", "effort_hours": 8}}"""

    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.RESEARCH_MODEL,
        messages=[
            {"role": "system", "content": "You are an expert buildability analyst. Return valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=200,
        temperature=0.2,
    )
    text = response.choices[0].message.content
    return _parse_json(text)


# ═══════════════════════════════════════════════════════════════════════════
# 3. App Comparison
# ═══════════════════════════════════════════════════════════════════════════

async def compare_apps(app1_data: dict, app2_data: dict) -> dict:
    prompt = f"""Compare these two apps for AI agent integration:

{app1_data.get('name', 'App 1')}:
- Auth: {app1_data.get('primary_auth', app1_data.get('auth_methods', 'Unknown'))}
- API: {app1_data.get('api_type', 'Unknown')}
- Self-serve: {app1_data.get('self_serve', app1_data.get('access_model', 'Unknown'))}
- Docs quality: {app1_data.get('notes', app1_data.get('summary', 'Unknown'))}

{app2_data.get('name', 'App 2')}:
- Auth: {app2_data.get('primary_auth', app2_data.get('auth_methods', 'Unknown'))}
- API: {app2_data.get('api_type', 'Unknown')}
- Self-serve: {app2_data.get('self_serve', app2_data.get('access_model', 'Unknown'))}
- Docs quality: {app2_data.get('notes', app2_data.get('summary', 'Unknown'))}

Return JSON with:
{{
  "winner_for_buildability": "app_name",
  "winner_for_easeofuse": "app_name",
  "winner_for_reliability": "app_name",
  "recommendation": "...",
  "tradeoffs": "..."
}}"""

    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.RESEARCH_MODEL,
        messages=[
            {"role": "system", "content": "You are an expert app comparison analyst. Return valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=300,
        temperature=0.2,
    )
    text = response.choices[0].message.content
    return _parse_json(text)


# ═══════════════════════════════════════════════════════════════════════════
# 4. Gap Analysis
# ═══════════════════════════════════════════════════════════════════════════

async def analyze_gaps(research_results: list[dict]) -> dict:
    import pandas as pd

    df = pd.DataFrame(research_results)
    if "category" not in df.columns:
        df["category"] = "unknown"
    category_counts = df.groupby("category").size().to_string() if len(df) > 0 else "No data"

    prompt = f"""Given this research across apps:

{category_counts}

Identify:
1. Underserved categories (< 5 apps)
2. Missing niche apps (popular but not researched)
3. Emerging categories (AI, Web3 tools)
4. Integration gaps (e.g., no open-source CRMs)

Return JSON:
{{
  "underserved_categories": ["category", ...],
  "missing_popular_apps": ["app_name", ...],
  "emerging_niches": ["description", ...],
  "priority_adds": ["app1", "app2"]
}}"""

    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.RESEARCH_MODEL,
        messages=[
            {"role": "system", "content": "You are an expert market analyst. Return valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=400,
        temperature=0.3,
    )
    text = response.choices[0].message.content
    return _parse_json(text)


# ═══════════════════════════════════════════════════════════════════════════
# 5. Smart Recommendations
# ═══════════════════════════════════════════════════════════════════════════

async def recommend_apps(user_goal: str, app_list: list[dict]) -> dict:
    apps_summary = "\n".join(
        f"- {a.get('name', 'Unknown')}: category={a.get('category', '?')}, "
        f"verdict={a.get('buildability_verdict', '?')}, api={a.get('api_type', '?')}"
        for a in app_list[:20]
    )

    prompt = f"""User goal: {user_goal}

Available apps (top 20):
{apps_summary}

Recommend top 5 apps, ranked by relevance to goal.
Consider: ease of integration, self-serve access, API quality.

Return JSON:
{{
  "goal_analysis": "...",
  "recommendations": [
    {{
      "rank": 1,
      "app_name": "...",
      "reason": "...",
      "integration_effort_hours": 8
    }}
  ]
}}"""

    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.RESEARCH_MODEL,
        messages=[
            {"role": "system", "content": "You are an expert integration consultant. Return valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=500,
        temperature=0.3,
    )
    text = response.choices[0].message.content
    return _parse_json(text)


# ═══════════════════════════════════════════════════════════════════════════
# 6. Doc Quality Scorer
# ═══════════════════════════════════════════════════════════════════════════

async def score_doc_quality(app_name: str, docs_url: str | None = None) -> dict:
    prompt = f"""Rate API docs for {app_name} (0-10 on each dimension):

Documentation URL: {docs_url or 'Not provided'}

Score on:
1. Completeness (all endpoints documented?)
2. Clarity (easy to understand?)
3. Examples (code samples provided?)
4. Auth guide (clear setup steps?)
5. Error handling (documented errors?)
6. Rate limits (clearly stated?)

Return JSON:
{{
  "completeness": 8,
  "clarity": 7,
  "examples": 9,
  "auth_guide": 6,
  "error_handling": 5,
  "rate_limits": 8,
  "overall_score": 7.2,
  "recommendation": "..."
}}"""

    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.RESEARCH_MODEL,
        messages=[
            {"role": "system", "content": "You are an expert API documentation reviewer. Return valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=300,
        temperature=0.2,
    )
    text = response.choices[0].message.content
    return _parse_json(text)
