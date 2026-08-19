from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Any, Optional


# --- App ---
class AppResearchSummary(BaseModel):
    summary: Optional[str] = None
    tech_stack: Optional[list[str]] = None
    confidence_score: Optional[float] = None
    sources: Optional[list[str]] = None
    raw_findings: Optional[dict] = None


class AppVerificationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    method: Optional[str] = None
    claim: Optional[str] = None
    evidence: Optional[str] = None
    is_accurate: Optional[bool] = None
    created_at: Optional[datetime] = None


class AppCreate(BaseModel):
    name: str = Field(..., max_length=255)
    url: Optional[str] = Field(None, max_length=2048)
    category: Optional[str] = Field(None, max_length=128)
    description: Optional[str] = None


class AppRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    url: Optional[str]
    category: Optional[str]
    description: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    research: Optional[AppResearchSummary] = None
    verifications: list[AppVerificationSummary] = Field(default_factory=list)


class AppList(BaseModel):
    items: list[AppRead]
    total: int


# --- ResearchResult ---
class ResearchResultCreate(BaseModel):
    app_id: int
    agent_version: Optional[str] = None
    raw_findings: Optional[dict] = None
    summary: Optional[str] = None
    tech_stack: Optional[list[str]] = None
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    sources: Optional[list[str]] = None


class ResearchResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    app_id: int
    agent_version: Optional[str]
    raw_findings: Optional[dict]
    summary: Optional[str]
    tech_stack: Optional[list[str]]
    confidence_score: Optional[float]
    sources: Optional[list[str]]
    created_at: datetime


# --- VerificationLog ---
class VerificationLogCreate(BaseModel):
    app_id: int
    research_result_id: Optional[int] = None
    method: Optional[str] = None
    claim: Optional[str] = None
    evidence: Optional[str] = None
    is_accurate: Optional[bool] = None
    confidence_delta: Optional[int] = None
    notes: Optional[str] = None
    source_url: Optional[str] = None


class VerificationLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    app_id: int
    research_result_id: Optional[int]
    method: Optional[str]
    claim: Optional[str]
    evidence: Optional[str]
    is_accurate: Optional[bool]
    confidence_delta: Optional[int]
    notes: Optional[str]
    source_url: Optional[str]
    raw_response: Optional[dict]
    created_at: datetime


# --- Pattern ---
class PatternRead(BaseModel):
    category: str
    count: int
    avg_confidence: Optional[float]
    common_tech: list[str]


# --- Chart data schemas ---
class PieChartData(BaseModel):
    title: str
    labels: list[str]
    values: list[int]
    total_apps: int


class BarChartData(BaseModel):
    title: str
    labels: list[str]
    values: list[int]


class AccessMatrixData(BaseModel):
    title: str
    categories: list[str]
    series: dict[str, list[int]]


class CorrelationResult(BaseModel):
    pair: list[str]
    cramers_v: float
    strength: str


class AccessComparison(BaseModel):
    count: int
    avg_confidence: float
    avg_tech_count: float


class CorrelationData(BaseModel):
    title: str
    categorical_correlations: list[CorrelationResult]
    gated_vs_selfserve: dict[str, Any]


class TechCluster(BaseModel):
    cluster_id: int
    size: int
    apps: list[str]
    top_techs: list[str]
    top_categories: list[str]
    avg_confidence: float


class TechClusterData(BaseModel):
    title: str
    n_clusters: int
    clusters: list[TechCluster]


class AnalysisSummary(BaseModel):
    total_apps: int
    categories: int
    self_serve_pct: float
    gated_pct: float
    apps_with_blockers: int
    avg_tech_count: float


class FullAnalysisResponse(BaseModel):
    auth_distribution: PieChartData
    access_matrix: AccessMatrixData
    top_blockers: BarChartData
    correlations: CorrelationData
    tech_clusters: TechClusterData
    summary: AnalysisSummary


# --- Metrics ---
class ResearchMetrics(BaseModel):
    apps_total: int
    apps_completed: int
    apps_failed: int
    avg_confidence: float
    low_confidence_count: int
    avg_time_per_app: Optional[float] = None
    total_research_time: Optional[float] = None


class CategoryAccuracy(BaseModel):
    total: int
    accurate: int
    percentage: float


class AccuracyMetrics(BaseModel):
    spot_check_total: int
    spot_check_accurate: int
    spot_check_inaccurate: int
    spot_check_pending: int
    overall_accuracy_pct: Optional[float] = None
    accuracy_by_category: dict[str, CategoryAccuracy]
    auth_method_accuracy_pct: Optional[float] = None
    self_serve_precision: float
    self_serve_recall: float
    gated_precision: float
    buildability_match_pct: Optional[float] = None


class OutputMetrics(BaseModel):
    categories_count: int
    pattern_visualizations: int
    searchable_app_table: bool
    mobile_responsive: bool


class MetricsResponse(BaseModel):
    research: ResearchMetrics
    accuracy: AccuracyMetrics
    output: OutputMetrics


# --- Auth Deep-Dive ---
class AuthMethodDetail(BaseModel):
    method: str
    recommended: bool
    notes: str


class AuthDeepDiveResponse(BaseModel):
    app_name: str
    primary_auth: str
    all_auth_methods: list[AuthMethodDetail]
    onboarding_flow: str
    onboarding_time: str
    requires_verification: bool
    verification_details: Optional[str] = None
    unusual_constraints: list[str]
    credential_provisioning: str
    gotchas: list[str]
    confidence: float
    sources: list[str]


# --- API Completeness Check ---
class CrudDetails(BaseModel):
    create: bool
    read: bool
    update: bool
    delete: bool


class RateLimitInfo(BaseModel):
    documented: bool
    requests_per_minute: Optional[int] = None
    details: str


class PaidFeature(BaseModel):
    feature: str
    required_plan: str


class WebhookInfo(BaseModel):
    supported: bool
    method: str
    details: str


class KnownGap(BaseModel):
    gap: str
    severity: str
    source: Optional[str] = None


class ApiCompletenessResponse(BaseModel):
    app_name: str
    crud_coverage: int
    crud_details: CrudDetails
    rate_limits: RateLimitInfo
    requires_paid_features: list[PaidFeature]
    webhook_support: WebhookInfo
    known_gaps: list[KnownGap]
    api_versioning: str
    sdk_availability: list[str]
    docs_quality: str
    confidence: float
    sources: list[str]


# --- Competitive Intel ---
class CompetitorApi(BaseModel):
    competitor: str
    has_api: bool
    api_quality: str
    notes: str


class StabilityRisk(BaseModel):
    level: str
    reasoning: str
    signals: list[str]


class EcosystemHealth(BaseModel):
    partner_count: Optional[int] = None
    community_activity: str
    last_major_update: Optional[str] = None


class CompetitiveIntelResponse(BaseModel):
    app_name: str
    is_primary_system: bool
    primary_system_reasoning: str
    competitor_apis: list[CompetitorApi]
    market_position: str
    stability_risk: StabilityRisk
    consolidation_rumors: list[str]
    ecosystem_health: EcosystemHealth
    confidence: float
    sources: list[str]


# --- Verification Challenge ---
class VerificationClaim(BaseModel):
    claim: str
    category: str
    importance: str
    verification_steps: list[str]
    proof_url: str
    proof_screenshot: str
    disproof: str
    difficulty: str


class VerificationChallengeResponse(BaseModel):
    app_name: str
    claims: list[VerificationClaim]
    confidence: float
    sources: list[str]


# --- Generic ---
class ErrorResponse(BaseModel):
    detail: str


class StatusResponse(BaseModel):
    status: str
    message: str
