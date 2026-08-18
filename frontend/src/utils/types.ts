export interface AppEntry {
  id: number;
  name: string;
  url: string | null;
  category: string | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  research: {
    summary: string | null;
    tech_stack: string[] | null;
    confidence_score: number | null;
    sources: string[] | null;
    raw_findings: Record<string, unknown> | null;
  } | null;
  verifications: VerificationEntry[];
}

export interface VerificationEntry {
  id: number;
  method: string | null;
  claim: string | null;
  evidence: string | null;
  is_accurate: boolean | null;
  created_at: string | null;
}

export interface AnalysisData {
  auth_distribution: {
    title: string;
    labels: string[];
    values: number[];
    total_apps: number;
  };
  access_matrix: {
    title: string;
    categories: string[];
    series: Record<string, number[]>;
  };
  top_blockers: {
    title: string;
    labels: string[];
    values: number[];
  };
  correlations: {
    title: string;
    categorical_correlations: Array<{
      pair: string[];
      cramers_v: number;
      strength: string;
    }>;
    gated_vs_selfserve: {
      gated: { count: number; avg_confidence: number; avg_tech_count: number };
      self_serve: { count: number; avg_confidence: number; avg_tech_count: number };
      insight: string;
    };
  };
  tech_clusters: {
    title: string;
    n_clusters: number;
    clusters: Array<{
      cluster_id: number;
      size: number;
      apps: string[];
      top_techs: string[];
      top_categories: string[];
      avg_confidence: number;
    }>;
  };
  summary: {
    total_apps: number;
    categories: number;
    self_serve_pct: number;
    gated_pct: number;
    apps_with_blockers: number;
    avg_tech_count: number;
  };
}

export interface MetricsData {
  research: {
    apps_total: number;
    apps_completed: number;
    apps_failed: number;
    avg_confidence: number;
    low_confidence_count: number;
    avg_time_per_app: number | null;
    total_research_time: number | null;
  };
  accuracy: {
    spot_check_total: number;
    spot_check_accurate: number;
    spot_check_inaccurate: number;
    spot_check_pending: number;
    overall_accuracy_pct: number | null;
    accuracy_by_category: Record<string, { total: number; accurate: number; percentage: number }>;
    auth_method_accuracy_pct: number | null;
    self_serve_precision: number;
    self_serve_recall: number;
    gated_precision: number;
    buildability_match_pct: number | null;
  };
  output: {
    categories_count: number;
    pattern_visualizations: number;
    searchable_app_table: boolean;
    mobile_responsive: boolean;
  };
}

export interface AuthDeepDive {
  app_name: string;
  primary_auth: string;
  all_auth_methods: Array<{ method: string; recommended: boolean; notes: string }>;
  onboarding_flow: string;
  onboarding_time: string;
  requires_verification: boolean;
  verification_details: string | null;
  unusual_constraints: string[];
  credential_provisioning: string;
  gotchas: string[];
  confidence: number;
  sources: string[];
}

export interface CompetitiveIntel {
  app_name: string;
  is_primary_system: boolean;
  primary_system_reasoning: string;
  competitor_apis: Array<{ competitor: string; has_api: boolean; api_quality: string; notes: string }>;
  market_position: string;
  stability_risk: { level: string; reasoning: string; signals: string[] };
  consolidation_rumors: string[];
  ecosystem_health: { partner_count: number | null; community_activity: string; last_major_update: string | null };
  confidence: number;
  sources: string[];
}

export interface VerificationClaim {
  claim: string;
  category: string;
  importance: string;
  verification_steps: string[];
  proof_url: string;
  proof_screenshot: string;
  disproof: string;
  difficulty: string;
}

export interface VerificationChallenge {
  app_name: string;
  claims: VerificationClaim[];
  confidence: number;
  sources: string[];
}

export interface ApiCompleteness {
  app_name: string;
  crud_coverage: number;
  crud_details: { create: boolean; read: boolean; update: boolean; delete: boolean };
  rate_limits: { documented: boolean; requests_per_minute: number | null; details: string };
  requires_paid_features: Array<{ feature: string; required_plan: string }>;
  webhook_support: { supported: boolean; method: string; details: string };
  known_gaps: Array<{ gap: string; severity: string; source: string | null }>;
  api_versioning: string;
  sdk_availability: string[];
  docs_quality: string;
  confidence: number;
  sources: string[];
}

// ── LLM Feature Types ─────────────────────────────────────────────────

export interface CategorizeResult {
  category: string;
  confidence: number;
}

export interface BuildabilityScore {
  score: number;
  reasoning: string;
  effort_hours: number;
}

export interface AppComparison {
  winner_for_buildability: string;
  winner_for_easeofuse: string;
  winner_for_reliability: string;
  recommendation: string;
  tradeoffs: string;
}

export interface GapAnalysis {
  underserved_categories: string[];
  missing_popular_apps: string[];
  emerging_niches: string[];
  priority_adds: string[];
}

export interface SmartRecommendation {
  goal_analysis: string;
  recommendations: Array<{
    rank: number;
    app_name: string;
    reason: string;
    integration_effort_hours: number;
  }>;
}

export interface DocQuality {
  completeness: number;
  clarity: number;
  examples: number;
  auth_guide: number;
  error_handling: number;
  rate_limits: number;
  overall_score: number;
  recommendation: string;
}

export interface ResearchProgress {
  total_apps: number;
  completed: number;
  failed: number;
  pending: number;
  progress_pct: number;
  avg_confidence: number;
  estimated_remaining_mins: number;
}
