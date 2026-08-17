import json
import logging
from groq import AsyncGroq
from backend.config import settings
from backend.utils.retry_logic import retry_with_backoff

logger = logging.getLogger(__name__)

# ── Research Analysis Prompt ────────────────────────────────────────────────
RESEARCH_SYSTEM_PROMPT = """\
You are an expert API analyst researching enterprise software integrations.

Your task: Given an app name, URL, and category, analyze the application and \
return a structured JSON object describing its technology stack, key features, \
authentication methods, access model, and notable integration patterns.

Sources: Prioritize official docs, then developer blogs, then GitHub.
Quality: Flag uncertainty, cite sources, never hallucinate URLs.
Format: Return valid JSON only, no markdown, no code fences."""

RESEARCH_USER_TEMPLATE = """\
Analyze the following application and return a JSON object with exactly these keys:
- "name": app name
- "url": primary URL
- "category": software category
- "summary": 2-3 sentence description
- "tech_stack": array of technologies used (languages, frameworks, databases, cloud providers)
- "key_features": array of 3-5 key features
- "pricing_model": one of "free" | "freemium" | "paid" | "open_source" | "unknown"
- "auth_methods": array of auth methods found (e.g. "oauth2", "api_key", "sso", "jwt", "basic_auth", "session")
- "access_model": one of "self_serve" | "gated" | "unknown"
- "integration_blockers": array of specific blockers (e.g. "rate limit", "approval required", "enterprise only", "no public api")
- "notable_patterns": any interesting architectural or business patterns observed
- "confidence": your confidence in this analysis from 0.0 to 1.0
- "sources": array of URLs used for this analysis

App: {name}
URL: {url}
Category: {category}"""

# ── Pattern Detection Prompt ────────────────────────────────────────────────
PATTERN_SYSTEM_PROMPT = """\
You are a data scientist finding clusters and patterns in software integration data.

Your task: Analyze the provided research results and identify dominant patterns, \
outliers, and business insights across the dataset.

Format: Return structured findings with evidence count \
(e.g., "8 of 10 CRMs use OAuth").
Quality: Be honest about noise, highlight surprises, suggest hypotheses.
Return valid JSON only, no markdown."""

PATTERN_USER_TEMPLATE = """\
Analyze the following batch of app research results and identify patterns.

Return a JSON object with these keys:
- "dominant_patterns": array of objects with "pattern" (string), "count" (int), "examples" (array of app names)
- "outliers": array of objects with "app" (string), "reason" (string)
- "surprises": array of strings describing unexpected findings
- "hypotheses": array of strings suggesting testable hypotheses
- "category_insights": object mapping category names to insight strings

Data:
{data}"""

# ── Verification Prompt ─────────────────────────────────────────────────────
VERIFICATION_SYSTEM_PROMPT = """\
You are a QA engineer designing test plans for software research claims.

Your task: Given a research claim about an app, create specific, actionable \
verification steps that anyone could follow to confirm or refute the claim.

Format: Return valid JSON only, no markdown.
Quality: Predict what would prove or disprove each claim. Be specific and actionable."""

VERIFICATION_USER_TEMPLATE = """\
Evaluate the following research claim and provide verification details.

Claim: {claim}
App: {app_name}
Context: {context}

Return a JSON object with these keys:
- "verdict": one of "likely_accurate" | "likely_inaccurate" | "cannot_determine"
- "confidence": 0.0 to 1.0
- "verification_steps": array of specific steps to manually verify this claim
- "evidence_for": array of evidence supporting the claim
- "evidence_against": array of evidence that would contradict the claim
- "notes": any additional observations"""

# ── Auth Deep-Dive Prompt ──────────────────────────────────────────────────
AUTH_DEEP_DIVE_SYSTEM_PROMPT = """\
You are an expert identity and access management (IAM) consultant. \
Your task is to investigate the authentication architecture of a specific \
application in granular detail, going beyond surface-level "supports OAuth" \
answers.

Focus on:
1. What the OFFICIAL DOCUMENTS RECOMMEND (not just what exists)
2. The actual onboarding flow developers experience
3. Credential provisioning timelines and friction points
4. Unusual or non-standard requirements that block integration

Be precise. Cite docs when possible. Flag uncertainty explicitly.
Return valid JSON only, no markdown, no code fences."""

AUTH_DEEP_DIVE_USER_TEMPLATE = """\
For {app_name} ({url}), investigate authentication in detail:

1. Which auth method is RECOMMENDED in official docs (not just supported)?
2. What's the onboarding flow for OAuth? Self-serve or admin approval?
3. For API keys: are they issued instantly or require verification?
4. Any unusual requirements (IP whitelist, callback URL validation)?
5. How long does credential provisioning typically take?

Context from prior research:
- Known auth methods: {auth_methods}
- Access model: {access_model}
- Category: {category}

Return a JSON object with exactly these keys:
- "app_name": app name
- "primary_auth": the RECOMMENDED auth method (not just supported) with details
- "all_auth_methods": array of objects, each with "method", "recommended" (bool), "notes"
- "onboarding_flow": description of the developer onboarding experience
- "onboarding_time": estimated time to get first API credentials ("instant" | "minutes" | "hours" | "days" | "weeks" | "unknown")
- "requires_verification": bool – does the app require manual approval/verification before issuing credentials?
- "verification_details": if requires_verification is true, what verification is needed
- "unusual_constraints": array of non-standard requirements (IP whitelist, callback URL validation, domain verification, etc.)
- "credential_provisioning": detailed description of how credentials are issued and how long it takes
- "gotchas": array of things that would surprise a developer integrating for the first time
- "confidence": 0.0 to 1.0
- "sources": array of URLs used for this analysis"""

# ── API Completeness Check Prompt ──────────────────────────────────────────
API_COMPLETENESS_SYSTEM_PROMPT = """\
You are an expert API product manager evaluating the completeness and \
developer experience of an application's public API.

Your task: For a given application, evaluate its API coverage across CRUD \
operations, rate limits, feature gating, event delivery, and known gaps.

Be precise about what IS documented versus what you're inferring.
Cite sources when possible. Flag uncertainty explicitly.
Return valid JSON only, no markdown, no code fences."""

API_COMPLETENESS_USER_TEMPLATE = """\
For {app_name} ({url}), evaluate API completeness:

1. Can you list/create/update/delete the primary entity (e.g., contacts for CRM)?
2. Are there rate limits documented? If so, what are they?
3. Which features require a paid/enterprise plan?
4. Is there webhook support or only polling?
5. Any known API gaps reported on GitHub issues?

Context from prior research:
- Category: {category}
- Pricing model: {pricing_model}
- Integration blockers: {blockers}

Return a JSON object with exactly these keys:
- "app_name": app name
- "crud_coverage": percentage 0-100 of CRUD operations supported
- "crud_details": object with "create", "read", "update", "delete" booleans
- "rate_limits": object with "documented" (bool), "requests_per_minute" (int or null), "details" (string description)
- "requires_paid_features": array of objects, each with "feature" and "required_plan"
- "webhook_support": object with "supported" (bool), "method" ("webhooks" | "polling" | "both" | "none"), "details" (string)
- "known_gaps": array of objects, each with "gap" (string), "severity" ("high" | "medium" | "low"), "source" (URL or null)
- "api_versioning": string describing versioning approach or "none documented"
- "sdk_availability": array of programming languages with available SDKs
- "docs_quality": one of "excellent" | "good" | "fair" | "poor" | "none"
- "confidence": 0.0 to 1.0
- "sources": array of URLs used for this analysis"""

# ── Competitive Intel Prompt ───────────────────────────────────────────────
COMPETITIVE_INTEL_SYSTEM_PROMPT = """\
You are a market analyst specializing in enterprise software competitive \
intelligence. You evaluate where a product sits in its market, who its \
competitors are, and how stable its platform is.

Focus on:
1. Direct competitor API offerings and how they compare
2. Whether the app is typically a system of record (primary) or an integration hub (target)
3. Any signals of platform instability (sunsetting, mergers, layoffs, EOL notices)

Be precise. Distinguish between confirmed facts and market signals.
Return valid JSON only, no markdown, no code fences."""

COMPETITIVE_INTEL_USER_TEMPLATE = """\
For {app_name} ({url}), provide competitive intelligence:

1. Do competitors (Salesforce, HubSpot, etc.) offer similar APIs?
2. Is this app typically a primary system or an integration target?
3. Any consolidation/sunsetting rumors in the last 12 months?

Context from prior research:
- Category: {category}
- Pricing model: {pricing_model}
- Notable patterns: {notable_patterns}

Return a JSON object with exactly these keys:
- "app_name": app name
- "is_primary_system": bool — is this a system of record that others integrate INTO?
- "primary_system_reasoning": why you classified it as primary or secondary
- "competitor_apis": array of objects, each with "competitor" (name), "has_api" (bool), "api_quality" ("strong" | "moderate" | "weak" | "none" | "unknown"), "notes" (brief comparison)
- "market_position": one of "dominant" | "strong" | "niche" | "emerging" | "declining" | "unknown"
- "stability_risk": object with "level" ("low" | "medium" | "high" | "unknown"), "reasoning" (string), "signals" (array of strings — any concrete signals found)
- "consolidation_rumors": array of strings describing any M&A, EOL, or sunsetting signals
- "ecosystem_health": object with "partner_count" (estimated, or null), "community_activity" ("active" | "moderate" | "quiet" | "unknown"), "last_major_update" (approximate date or null)
- "confidence": 0.0 to 1.0
- "sources": array of URLs used for this analysis"""

# ── Verification Challenge Prompt ──────────────────────────────────────────
VERIFICATION_CHALLENGE_SYSTEM_PROMPT = """\
You are a skeptical QA auditor whose job is to find the weakest claims in \
a research report and design concrete tests to validate or refute them.

You will receive the raw research JSON about an application. Your task:
1. Pick the 3 most testable (and most consequential) factual claims
2. For each, give exact manual verification steps
3. State what evidence would prove or disprove it

Be adversarial but fair. Focus on claims that matter for integration decisions.
Return valid JSON only, no markdown, no code fences."""

VERIFICATION_CHALLENGE_USER_TEMPLATE = """\
Review this research result about {app_name} and pick 3 factual claims to challenge.

Research JSON:
{research_json}

For each claim, provide:
1. How to manually verify it (exact steps a human would take)
2. What URL or screenshot would prove it
3. What would disprove it

Return a JSON object with exactly these keys:
- "app_name": app name
- "claims": array of exactly 3 objects, each with:
  - "claim": the specific factual claim being tested
  - "category": what type of claim ("auth" | "pricing" | "tech_stack" | "feature" | "access" | "other")
  - "importance": "high" | "medium" | "low" — how consequential is this claim for integration
  - "verification_steps": array of exact step-by-step instructions
  - "proof_url": URL or description of what would prove this claim
  - "proof_screenshot": what a screenshot proving this would show
  - "disproof": what would disprove this claim
  - "difficulty": "trivial" | "easy" | "moderate" | "hard" — how hard to verify manually
- "confidence": 0.0 to 1.0 — your confidence that these are the most important claims to verify
- "sources": array of URLs used for this analysis"""


def _get_client() -> AsyncGroq:
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


# ── Research call ───────────────────────────────────────────────────────────
async def call_groq_research(
    name: str,
    url: str | None = None,
    category: str | None = None,
    model: str | None = None,
) -> dict:
    model = model or settings.RESEARCH_MODEL

    async def _call():
        client = _get_client()
        response = await client.chat.completions.create(
            model=model,
            temperature=0.2,
            max_tokens=1024,
            messages=[
                {"role": "system", "content": RESEARCH_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": RESEARCH_USER_TEMPLATE.format(
                        name=name,
                        url=url or "N/A",
                        category=category or "unknown",
                    ),
                },
            ],
        )
        return response

    response = await retry_with_backoff(_call)
    text = response.choices[0].message.content
    data = _parse_json(text)
    logger.debug("Groq research for %s: keys=%s", name, list(data.keys()))
    return data


# ── Pattern detection call ──────────────────────────────────────────────────
async def call_groq_patterns(
    data: list[dict],
    model: str | None = None,
) -> dict:
    model = model or settings.RESEARCH_MODEL
    data_str = json.dumps(data[:50], indent=2, default=str)

    async def _call():
        client = _get_client()
        response = await client.chat.completions.create(
            model=model,
            temperature=0.3,
            max_tokens=2048,
            messages=[
                {"role": "system", "content": PATTERN_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": PATTERN_USER_TEMPLATE.format(data=data_str),
                },
            ],
        )
        return response

    response = await retry_with_backoff(_call)
    text = response.choices[0].message.content
    data = _parse_json(text)
    logger.debug("Groq patterns: keys=%s", list(data.keys()))
    return data


# ── Verification call ───────────────────────────────────────────────────────
async def call_groq_verify(
    claim: str,
    app_name: str,
    context: str = "",
    model: str | None = None,
) -> dict:
    model = model or settings.VERIFICATION_MODEL

    async def _call():
        client = _get_client()
        response = await client.chat.completions.create(
            model=model,
            temperature=0.1,
            max_tokens=1024,
            messages=[
                {"role": "system", "content": VERIFICATION_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": VERIFICATION_USER_TEMPLATE.format(
                        claim=claim,
                        app_name=app_name,
                        context=context[:2000],
                    ),
                },
            ],
        )
        return response

    response = await retry_with_backoff(_call)
    text = response.choices[0].message.content
    data = _parse_json(text)
    logger.debug("Groq verify for %s: verdict=%s", app_name, data.get("verdict"))
    return data


# ── Auth deep-dive call ────────────────────────────────────────────────────
async def call_groq_auth_deep_dive(
    name: str,
    url: str | None = None,
    auth_methods: list[str] | None = None,
    access_model: str | None = None,
    category: str | None = None,
    model: str | None = None,
) -> dict:
    model = model or settings.RESEARCH_MODEL

    async def _call():
        client = _get_client()
        response = await client.chat.completions.create(
            model=model,
            temperature=0.2,
            max_tokens=1536,
            messages=[
                {"role": "system", "content": AUTH_DEEP_DIVE_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": AUTH_DEEP_DIVE_USER_TEMPLATE.format(
                        app_name=name,
                        url=url or "N/A",
                        auth_methods=", ".join(auth_methods) if auth_methods else "unknown",
                        access_model=access_model or "unknown",
                        category=category or "unknown",
                    ),
                },
            ],
        )
        return response

    response = await retry_with_backoff(_call)
    text = response.choices[0].message.content
    data = _parse_json(text)
    logger.debug("Groq auth deep-dive for %s: primary_auth=%s", name, data.get("primary_auth"))
    return data


# ── API completeness check call ────────────────────────────────────────────
async def call_groq_api_completeness(
    name: str,
    url: str | None = None,
    category: str | None = None,
    pricing_model: str | None = None,
    blockers: list[str] | None = None,
    model: str | None = None,
) -> dict:
    model = model or settings.RESEARCH_MODEL

    async def _call():
        client = _get_client()
        response = await client.chat.completions.create(
            model=model,
            temperature=0.2,
            max_tokens=1536,
            messages=[
                {"role": "system", "content": API_COMPLETENESS_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": API_COMPLETENESS_USER_TEMPLATE.format(
                        app_name=name,
                        url=url or "N/A",
                        category=category or "unknown",
                        pricing_model=pricing_model or "unknown",
                        blockers=", ".join(blockers) if blockers else "none",
                    ),
                },
            ],
        )
        return response

    response = await retry_with_backoff(_call)
    text = response.choices[0].message.content
    data = _parse_json(text)
    logger.debug("Groq API completeness for %s: crud=%s%%", name, data.get("crud_coverage"))
    return data


# ── Competitive intel call ─────────────────────────────────────────────────
async def call_groq_competitive_intel(
    name: str,
    url: str | None = None,
    category: str | None = None,
    pricing_model: str | None = None,
    notable_patterns: str | None = None,
    model: str | None = None,
) -> dict:
    model = model or settings.RESEARCH_MODEL

    async def _call():
        client = _get_client()
        response = await client.chat.completions.create(
            model=model,
            temperature=0.2,
            max_tokens=1536,
            messages=[
                {"role": "system", "content": COMPETITIVE_INTEL_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": COMPETITIVE_INTEL_USER_TEMPLATE.format(
                        app_name=name,
                        url=url or "N/A",
                        category=category or "unknown",
                        pricing_model=pricing_model or "unknown",
                        notable_patterns=notable_patterns or "none noted",
                    ),
                },
            ],
        )
        return response

    response = await retry_with_backoff(_call)
    text = response.choices[0].message.content
    data = _parse_json(text)
    logger.debug("Groq competitive intel for %s: primary=%s, market=%s", name, data.get("is_primary_system"), data.get("market_position"))
    return data


# ── Verification challenge call ────────────────────────────────────────────
async def call_groq_verification_challenge(
    name: str,
    research_json: str,
    model: str | None = None,
) -> dict:
    model = model or settings.VERIFICATION_MODEL

    async def _call():
        client = _get_client()
        response = await client.chat.completions.create(
            model=model,
            temperature=0.2,
            max_tokens=2048,
            messages=[
                {"role": "system", "content": VERIFICATION_CHALLENGE_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": VERIFICATION_CHALLENGE_USER_TEMPLATE.format(
                        app_name=name,
                        research_json=research_json[:4000],
                    ),
                },
            ],
        )
        return response

    response = await retry_with_backoff(_call)
    text = response.choices[0].message.content
    data = _parse_json(text)
    logger.debug("Groq verification challenge for %s: %d claims", name, len(data.get("claims", [])))
    return data
