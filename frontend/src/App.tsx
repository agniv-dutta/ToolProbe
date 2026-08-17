import { useState, useEffect, useCallback } from "react";
import { fetchExport, fetchAnalysis, fetchMetrics } from "./utils/api";
import type { AppEntry, AnalysisData, MetricsData } from "./utils/types";
import { Layout } from "./components/Layout";
import { SummaryTab } from "./components/SummaryTab";
import { AllAppsTab } from "./components/AllAppsTab";
import { PatternsTab } from "./components/PatternsTab";
import { VerificationTab } from "./components/VerificationTab";
import { AgentLogTab } from "./components/AgentLogTab";

const TABS = ["Summary", "All Apps", "Patterns", "Verification", "Agent Log"] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const [active, setActive] = useState<Tab>("Summary");
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [appsData, analysisData, metricsData] = await Promise.all([
        fetchExport(),
        fetchAnalysis().catch(() => null),
        fetchMetrics().catch(() => null),
      ]);
      setApps(appsData);
      setAnalysis(analysisData);
      setMetrics(metricsData);
    } catch {
      try {
        const appsData = await fetchExport();
        setApps(appsData);
      } catch {
        setError("Failed to load data. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Layout
      activeTab={active}
      onTabChange={(t) => setActive(t as Tab)}
      onRefresh={load}
      dark={dark}
      onToggleDark={() => setDark(!dark)}
      loading={loading}
      tabs={TABS}
    >
      {loading && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="metric-card">
                <div className="skeleton h-8 w-20 mx-auto mb-3" />
                <div className="skeleton h-3 w-24 mx-auto" />
              </div>
            ))}
          </div>
          <div className="card-flat">
            <div className="skeleton h-6 w-48 mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card-flat border-error/30 bg-error/5 text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
            Unable to load data
          </h3>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">{error}</p>
          <button onClick={load} className="btn-primary text-xs !px-6 !py-2">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="animate-fade-in">
          {active === "Summary" && <SummaryTab apps={apps} analysis={analysis} metrics={metrics} />}
          {active === "All Apps" && <AllAppsTab apps={apps} />}
          {active === "Patterns" && <PatternsTab analysis={analysis} />}
          {active === "Verification" && <VerificationTab apps={apps} />}
          {active === "Agent Log" && <AgentLogTab apps={apps} />}
        </div>
      )}
    </Layout>
  );
}
