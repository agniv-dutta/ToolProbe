const API = import.meta.env.VITE_API_BASE || "/api";

export async function fetchApps(): Promise<{ items: import("./types").AppEntry[]; total: number }> {
  const res = await fetch(`${API}/apps?limit=500`);
  if (!res.ok) throw new Error(`GET /apps failed: ${res.status}`);
  return res.json();
}

export async function fetchResults(appId?: number): Promise<import("./types").AppEntry[]> {
  const url = appId ? `${API}/results?app_id=${appId}` : `${API}/results?limit=500`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET /results failed: ${res.status}`);
  return res.json();
}

export async function fetchExport(): Promise<import("./types").AppEntry[]> {
  const res = await fetch("/data.json");
  if (!res.ok) throw new Error("Failed to load data.json");
  return res.json();
}

export async function fetchAnalysis(): Promise<import("./types").AnalysisData> {
  const res = await fetch(`${API}/analysis`);
  if (!res.ok) throw new Error(`GET /analysis failed: ${res.status}`);
  return res.json();
}

export async function fetchMetrics(): Promise<import("./types").MetricsData> {
  const res = await fetch(`${API}/metrics`);
  if (!res.ok) throw new Error(`GET /metrics failed: ${res.status}`);
  return res.json();
}

export async function fetchAuthDeepDive(appId: number): Promise<import("./types").AuthDeepDive> {
  const res = await fetch(`${API}/apps/${appId}/auth-deep-dive`);
  if (!res.ok) throw new Error(`GET /apps/${appId}/auth-deep-dive failed: ${res.status}`);
  return res.json();
}

export async function fetchApiCompleteness(appId: number): Promise<import("./types").ApiCompleteness> {
  const res = await fetch(`${API}/apps/${appId}/api-completeness`);
  if (!res.ok) throw new Error(`GET /apps/${appId}/api-completeness failed: ${res.status}`);
  return res.json();
}

export async function fetchCompetitiveIntel(appId: number): Promise<import("./types").CompetitiveIntel> {
  const res = await fetch(`${API}/apps/${appId}/competitive-intel`);
  if (!res.ok) throw new Error(`GET /apps/${appId}/competitive-intel failed: ${res.status}`);
  return res.json();
}

export async function fetchVerificationChallenge(appId: number): Promise<import("./types").VerificationChallenge> {
  const res = await fetch(`${API}/apps/${appId}/verification-challenge`);
  if (!res.ok) throw new Error(`GET /apps/${appId}/verification-challenge failed: ${res.status}`);
  return res.json();
}

// ── LLM Feature API calls ────────────────────────────────────────────

export async function fetchCategorize(appName: string, description: string): Promise<import("./types").CategorizeResult> {
  const res = await fetch(`${API}/llm/categorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_name: appName, description }),
  });
  if (!res.ok) throw new Error(`POST /llm/categorize failed: ${res.status}`);
  return res.json();
}

export async function fetchBuildabilityScore(appId: number): Promise<import("./types").BuildabilityScore> {
  const res = await fetch(`${API}/llm/buildability-score/${appId}`);
  if (!res.ok) throw new Error(`GET /llm/buildability-score/${appId} failed: ${res.status}`);
  return res.json();
}

export async function fetchCompareApps(app1Id: number, app2Id: number): Promise<import("./types").AppComparison> {
  const res = await fetch(`${API}/llm/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app1_id: app1Id, app2_id: app2Id }),
  });
  if (!res.ok) throw new Error(`POST /llm/compare failed: ${res.status}`);
  return res.json();
}

export async function fetchGaps(): Promise<import("./types").GapAnalysis> {
  const res = await fetch(`${API}/llm/gaps`);
  if (!res.ok) throw new Error(`GET /llm/gaps failed: ${res.status}`);
  return res.json();
}

export async function fetchRecommendations(goal: string): Promise<import("./types").SmartRecommendation> {
  const res = await fetch(`${API}/llm/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal }),
  });
  if (!res.ok) throw new Error(`POST /llm/recommend failed: ${res.status}`);
  return res.json();
}

export async function fetchDocQuality(appId: number): Promise<import("./types").DocQuality> {
  const res = await fetch(`${API}/llm/doc-quality/${appId}`);
  if (!res.ok) throw new Error(`GET /llm/doc-quality/${appId} failed: ${res.status}`);
  return res.json();
}

export async function fetchResearchProgress(): Promise<import("./types").ResearchProgress> {
  const res = await fetch(`${API}/research/progress`);
  if (!res.ok) throw new Error(`GET /research/progress failed: ${res.status}`);
  return res.json();
}
