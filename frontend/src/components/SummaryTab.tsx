import type { AppEntry, AnalysisData, MetricsData } from "../utils/types";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { AuthDeepDive } from "./AuthDeepDive";
import { ApiCompleteness } from "./ApiCompleteness";
import { CompetitiveIntel } from "./CompetitiveIntel";
import { VerificationChallenge } from "./VerificationChallenge";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

interface Props {
  apps: AppEntry[];
  analysis: AnalysisData | null;
  metrics: MetricsData | null;
}

function formatSeconds(s: number | null): string {
  if (s === null) return "—";
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = (s % 60).toFixed(0);
  return `${m}m ${rem}s`;
}

// ── Metrics Dashboard ─────────────────────────────────────────────────────
function MetricsDashboard({ metrics }: { metrics: MetricsData }) {
  const r = metrics.research;
  const a = metrics.accuracy;
  const o = metrics.output;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Key Metrics</h2>

      {/* Research Metrics */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Research</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Apps Researched", value: r.apps_completed, sub: `of ${r.apps_total}`, color: "text-blue-600 dark:text-blue-400" },
            { label: "Failed", value: r.apps_failed, color: "text-red-600 dark:text-red-400" },
            { label: "Avg Confidence", value: `${(r.avg_confidence * 100).toFixed(0)}%`, color: "text-green-600 dark:text-green-400" },
            { label: "Low Confidence (<0.7)", value: r.low_confidence_count, color: "text-yellow-600 dark:text-yellow-400" },
            { label: "Avg Time/App", value: formatSeconds(r.avg_time_per_app), color: "text-purple-600 dark:text-purple-400" },
            { label: "Total Research Time", value: formatSeconds(r.total_research_time), color: "text-gray-600 dark:text-gray-300" },
          ].map((m) => (
            <div key={m.label} className="card text-center !py-3 !px-2">
              <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
              {m.sub && <div className="text-[10px] text-gray-400">{m.sub}</div>}
              <div className="text-[10px] text-gray-500 mt-1 leading-tight">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Accuracy Metrics */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Accuracy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Spot-Check Sample", value: a.spot_check_total, color: "text-blue-600 dark:text-blue-400" },
            { label: "Correct", value: a.spot_check_accurate, color: "text-green-600 dark:text-green-400" },
            { label: "Wrong", value: a.spot_check_inaccurate, color: "text-red-600 dark:text-red-400" },
            { label: "Accuracy Rate", value: a.overall_accuracy_pct !== null ? `${a.overall_accuracy_pct}%` : "—", color: "text-green-600 dark:text-green-400" },
            { label: "Auth Accuracy", value: a.auth_method_accuracy_pct !== null ? `${a.auth_method_accuracy_pct}%` : "—", color: "text-purple-600 dark:text-purple-400" },
          ].map((m) => (
            <div key={m.label} className="card text-center !py-3 !px-2">
              <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
              <div className="text-[10px] text-gray-500 mt-1 leading-tight">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Self-Serve vs Gated Detection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="card !py-3 !px-4">
            <div className="text-xs text-gray-500 mb-1">Self-Serve Detection</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${a.self_serve_precision * 100}%` }} />
              </div>
              <span className="text-sm font-medium">{(a.self_serve_precision * 100).toFixed(0)}%</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-1">precision / recall</div>
          </div>
          <div className="card !py-3 !px-4">
            <div className="text-xs text-gray-500 mb-1">Gated Detection</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${a.gated_precision * 100}%` }} />
              </div>
              <span className="text-sm font-medium">{(a.gated_precision * 100).toFixed(0)}%</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-1">precision</div>
          </div>
        </div>

        {/* Accuracy by Category */}
        {Object.keys(a.accuracy_by_category).length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-2">Accuracy by Category</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(a.accuracy_by_category)
                .sort(([, a], [, b]) => b.percentage - a.percentage)
                .map(([cat, data]) => (
                  <div
                    key={cat}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800 text-xs"
                  >
                    <span className="font-medium">{cat}</span>
                    <span className={`font-bold ${data.percentage >= 80 ? "text-green-600" : data.percentage >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                      {data.percentage}%
                    </span>
                    <span className="text-gray-400">({data.total})</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Output Metrics */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Output</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Categories", value: o.categories_count },
            { label: "Charts", value: o.pattern_visualizations },
            { label: "Searchable Table", value: o.searchable_app_table ? "Yes" : "No", ok: o.searchable_app_table },
            { label: "Mobile Responsive", value: o.mobile_responsive ? "Yes" : "No", ok: o.mobile_responsive },
          ].map((m) => (
            <div key={m.label} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs">
              <span className="text-gray-500">{m.label}:</span>
              <span className={`font-medium ${m.ok === false ? "text-red-500" : m.ok === true ? "text-green-600" : ""}`}>
                {m.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Summary sentences ─────────────────────────────────────────────────────
function generateSummary(apps: AppEntry[], analysis: AnalysisData | null): string[] {
  const lines: string[] = [];
  const completed = apps.filter((a) => a.status === "completed");
  const withResearch = completed.filter((a) => a.research);

  lines.push(
    `Researched ${completed.length} apps across ${analysis?.summary.categories ?? "—"} categories.`
  );

  if (analysis) {
    const s = analysis.summary;
    lines.push(
      `${s.self_serve_pct}% are self-serve, ${s.gated_pct}% are gated behind approval or sales calls.`
    );
    lines.push(
      `Average tech stack includes ${s.avg_tech_count} technologies per app.`
    );
    lines.push(`${s.apps_with_blockers} apps have identified integration blockers.`);
  }

  const catCounts: Record<string, number> = {};
  for (const a of withResearch) {
    const cat = a.category || "unknown";
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }
  const topCats = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (topCats.length > 0) {
    lines.push(
      `Top categories: ${topCats.map(([c, n]) => `${c} (${n})`).join(", ")}.`
    );
  }

  const avgConf =
    withResearch.reduce((s, a) => s + (a.research?.confidence_score ?? 0), 0) /
    (withResearch.length || 1);
  lines.push(`Average research confidence: ${(avgConf * 100).toFixed(0)}%.`);

  const techFreq: Record<string, number> = {};
  for (const a of withResearch) {
    for (const t of a.research?.tech_stack ?? []) {
      techFreq[t] = (techFreq[t] || 0) + 1;
    }
  }
  const topTechs = Object.entries(techFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if (topTechs.length > 0) {
    lines.push(
      `Most common technologies: ${topTechs.map(([t, n]) => `${t} (${n})`).join(", ")}.`
    );
  }

  const verified = apps.flatMap((a) => a.verifications);
  const accurate = verified.filter((v) => v.is_accurate === true).length;
  const wrong = verified.filter((v) => v.is_accurate === false).length;
  if (verified.length > 0) {
    lines.push(
      `Verification: ${accurate} correct, ${wrong} incorrect out of ${verified.length} checks.`
    );
  }

  return lines.slice(0, 50);
}

// ── Deep dive cards ───────────────────────────────────────────────────────
function ExampleCards({ apps }: { apps: AppEntry[] }) {
  const [authAppId, setAuthAppId] = useState<number | null>(null);
  const [apiAppId, setApiAppId] = useState<number | null>(null);
  const [intelAppId, setIntelAppId] = useState<number | null>(null);
  const [verifyAppId, setVerifyAppId] = useState<number | null>(null);

  const examples = apps
    .filter((a) => a.research?.summary && a.research.tech_stack?.length)
    .slice(0, 5);

  if (examples.length === 0) return null;

  return (
    <>
      <div className="card mt-8">
        <h2 className="text-lg font-semibold mb-4">Deep Dives</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {examples.map((app) => (
            <div
              key={app.id}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{app.name}</h3>
                <span className="badge badge-blue">{app.category}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">
                {app.research!.summary}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(app.research!.tech_stack ?? []).slice(0, 6).map((t) => (
                  <span key={t} className="badge badge-green text-[10px]">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>Confidence: {((app.research!.confidence_score ?? 0) * 100).toFixed(0)}%</span>
                <div className="flex items-center gap-2">
                  {app.url && (
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Visit →
                    </a>
                  )}
                  <button
                    onClick={() => setAuthAppId(app.id)}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Auth →
                  </button>
                  <button
                    onClick={() => setApiAppId(app.id)}
                    className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                  >
                    API →
                  </button>
                  <button
                    onClick={() => setIntelAppId(app.id)}
                    className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
                  >
                    Intel →
                  </button>
                  <button
                    onClick={() => setVerifyAppId(app.id)}
                    className="text-red-600 dark:text-red-400 hover:underline font-medium"
                  >
                    Verify →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {authAppId !== null && (() => {
        const app = examples.find((a) => a.id === authAppId);
        if (!app) return null;
        return (
          <AuthDeepDive
            appId={authAppId}
            appName={app.name}
            onClose={() => setAuthAppId(null)}
          />
        );
      })()}

      {apiAppId !== null && (() => {
        const app = examples.find((a) => a.id === apiAppId);
        if (!app) return null;
        return (
          <ApiCompleteness
            appId={apiAppId}
            appName={app.name}
            onClose={() => setApiAppId(null)}
          />
        );
      })()}

      {intelAppId !== null && (() => {
        const app = examples.find((a) => a.id === intelAppId);
        if (!app) return null;
        return (
          <CompetitiveIntel
            appId={intelAppId}
            appName={app.name}
            onClose={() => setIntelAppId(null)}
          />
        );
      })()}

      {verifyAppId !== null && (() => {
        const app = examples.find((a) => a.id === verifyAppId);
        if (!app) return null;
        return (
          <VerificationChallenge
            appId={verifyAppId}
            appName={app.name}
            onClose={() => setVerifyAppId(null)}
          />
        );
      })()}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export function SummaryTab({ apps, analysis, metrics }: Props) {
  const lines = generateSummary(apps, analysis);

  const pieData =
    analysis?.auth_distribution.labels.map((l, i) => ({
      name: l,
      value: analysis.auth_distribution.values[i],
    })) ?? [];

  return (
    <div className="space-y-8">
      {metrics && <MetricsDashboard metrics={metrics} />}

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Research Summary</h2>
        <ul className="space-y-2">
          {lines.map((line, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {pieData.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Authentication Methods</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <ExampleCards apps={apps} />
    </div>
  );
}
