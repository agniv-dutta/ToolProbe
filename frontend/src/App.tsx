import { useState, useEffect, useCallback } from "react";
import { fetchExport, fetchAnalysis, fetchMetrics } from "./utils/api";
import type { AppEntry, AnalysisData, MetricsData } from "./utils/types";
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
      return localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
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
    } catch (e) {
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
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                TP
              </div>
              <h1 className="text-lg font-semibold">ToolProbe</h1>
              <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">App Research Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDark(!dark)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                aria-label="Toggle dark mode"
              >
                {dark ? "☀️" : "🌙"}
              </button>
              <button
                onClick={load}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="sticky top-16 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  active === tab
                    ? "tab-active"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-3 text-gray-500">Loading data…</span>
          </div>
        )}
        {error && (
          <div className="card border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-center py-12">
            <p className="text-lg font-medium">{error}</p>
            <button onClick={load} className="mt-3 text-sm underline hover:no-underline">
              Retry
            </button>
          </div>
        )}
        {!loading && !error && (
          <>
            {active === "Summary" && <SummaryTab apps={apps} analysis={analysis} metrics={metrics} />}
            {active === "All Apps" && <AllAppsTab apps={apps} />}
            {active === "Patterns" && <PatternsTab analysis={analysis} />}
            {active === "Verification" && <VerificationTab apps={apps} />}
            {active === "Agent Log" && <AgentLogTab apps={apps} />}
          </>
        )}
      </main>
    </div>
  );
}
