import type { AppEntry, AnalysisData, MetricsData } from "../utils/types";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { AuthDeepDive } from "./AuthDeepDive";
import { ApiCompleteness } from "./ApiCompleteness";
import { CompetitiveIntel } from "./CompetitiveIntel";
import { VerificationChallenge } from "./VerificationChallenge";

const COLORS = ["#0052CC", "#059669", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];

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
    <div className="space-y-8">
      <div>
        <h2 className="font-serif italic text-sm font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-4">
          Research Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 stagger-children">
          {[
            { label: "Apps Researched", value: r.apps_completed, sub: `of ${r.apps_total}`, color: "text-primary-500 dark:text-primary-light" },
            { label: "Failed", value: r.apps_failed, color: "text-error" },
            { label: "Avg Confidence", value: `${(r.avg_confidence * 100).toFixed(0)}%`, color: "text-accent" },
            { label: "Low Confidence", value: r.low_confidence_count, color: "text-warning" },
            { label: "Avg Time / App", value: formatSeconds(r.avg_time_per_app), color: "text-purple-500" },
            { label: "Total Time", value: formatSeconds(r.total_research_time), color: "text-secondary-500" },
          ].map((m) => (
            <div key={m.label} className="metric-card">
              <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">
                {m.label}
              </div>
              <div className={`font-display text-2xl font-semibold ${m.color}`}>{m.value}</div>
              {m.sub && <div className="text-[11px] text-secondary-400 mt-1">{m.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-serif italic text-sm font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-4">
          Accuracy Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 stagger-children">
          {[
            { label: "Spot-Check Sample", value: a.spot_check_total, color: "text-primary-500 dark:text-primary-light" },
            { label: "Correct", value: a.spot_check_accurate, color: "text-accent" },
            { label: "Wrong", value: a.spot_check_inaccurate, color: "text-error" },
            { label: "Accuracy Rate", value: a.overall_accuracy_pct !== null ? `${a.overall_accuracy_pct}%` : "—", color: "text-accent" },
            { label: "Auth Accuracy", value: a.auth_method_accuracy_pct !== null ? `${a.auth_method_accuracy_pct}%` : "—", color: "text-purple-500" },
          ].map((m) => (
            <div key={m.label} className="metric-card">
              <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">
                {m.label}
              </div>
              <div className={`font-display text-2xl font-semibold ${m.color}`}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Detection bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="card-flat !p-5">
            <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">
              Self-Serve Detection
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-500" style={{ width: `${a.self_serve_precision * 100}%` }} />
              </div>
              <span className="font-mono text-sm font-medium text-secondary-700 dark:text-secondary-300">{(a.self_serve_precision * 100).toFixed(0)}%</span>
            </div>
            <div className="font-serif italic text-[10px] text-secondary-400 mt-2">precision / recall</div>
          </div>
          <div className="card-flat !p-5">
            <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">
              Gated Detection
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-error to-red-400 rounded-full transition-all duration-500" style={{ width: `${a.gated_precision * 100}%` }} />
              </div>
              <span className="font-mono text-sm font-medium text-secondary-700 dark:text-secondary-300">{(a.gated_precision * 100).toFixed(0)}%</span>
            </div>
            <div className="font-serif italic text-[10px] text-secondary-400 mt-2">precision</div>
          </div>
        </div>

        {/* Accuracy by Category */}
        {Object.keys(a.accuracy_by_category).length > 0 && (
          <div className="mt-4">
            <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">
              Accuracy by Category
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(a.accuracy_by_category)
                .sort(([, a], [, b]) => b.percentage - a.percentage)
                .map(([cat, data]) => (
                  <div key={cat} className="badge bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300">
                    <span className="font-medium not-italic">{cat}</span>
                    <span className={`ml-1 font-mono font-semibold not-italic ${data.percentage >= 80 ? "text-accent" : data.percentage >= 50 ? "text-warning" : "text-error"}`}>
                      {data.percentage}%
                    </span>
                    <span className="ml-1 text-secondary-400 not-italic">({data.total})</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Output Metrics */}
      <div>
        <h2 className="font-serif italic text-sm font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">
          Output
        </h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Categories", value: o.categories_count },
            { label: "Charts", value: o.pattern_visualizations },
            { label: "Searchable Table", value: o.searchable_app_table ? "Yes" : "No", ok: o.searchable_app_table },
            { label: "Mobile Responsive", value: o.mobile_responsive ? "Yes" : "No", ok: o.mobile_responsive },
          ].map((m) => (
            <div key={m.label} className="badge bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300">
              <span className="not-italic">{m.label}:</span>
              <span className={`ml-1 font-mono font-semibold not-italic ${m.ok === false ? "text-error" : m.ok === true ? "text-accent" : ""}`}>
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
      <div className="card-flat">
        <h2 className="font-display text-lg font-semibold text-secondary-900 dark:text-white mb-5">
          Deep Dives
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
          {examples.map((app) => (
            <div
              key={app.id}
              className="card-premium !p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-secondary-900 dark:text-white">{app.name}</h3>
                <span className="badge badge-blue">{app.category}</span>
              </div>
              <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3 line-clamp-3 leading-relaxed">
                {app.research!.summary}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(app.research!.tech_stack ?? []).slice(0, 6).map((t) => (
                  <span key={t} className="badge badge-green text-[10px]">
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-secondary-500 dark:text-secondary-400 pt-3 border-t border-secondary-100 dark:border-secondary-700">
                <span className="font-serif italic">
                  Confidence: {((app.research!.confidence_score ?? 0) * 100).toFixed(0)}%
                </span>
                <div className="flex items-center gap-1.5">
                  {app.url && (
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost !px-2 !py-1 !text-[10px]"
                    >
                      Visit
                    </a>
                  )}
                  <button onClick={() => setAuthAppId(app.id)} className="btn-ghost !px-2 !py-1 !text-[10px] !text-primary-500 dark:!text-primary-light">
                    Auth
                  </button>
                  <button onClick={() => setApiAppId(app.id)} className="btn-ghost !px-2 !py-1 !text-[10px] !text-purple-500">
                    API
                  </button>
                  <button onClick={() => setIntelAppId(app.id)} className="btn-ghost !px-2 !py-1 !text-[10px] !text-amber-500">
                    Intel
                  </button>
                  <button onClick={() => setVerifyAppId(app.id)} className="btn-ghost !px-2 !py-1 !text-[10px] !text-error">
                    Verify
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
        return <AuthDeepDive appId={authAppId} appName={app.name} onClose={() => setAuthAppId(null)} />;
      })()}
      {apiAppId !== null && (() => {
        const app = examples.find((a) => a.id === apiAppId);
        if (!app) return null;
        return <ApiCompleteness appId={apiAppId} appName={app.name} onClose={() => setApiAppId(null)} />;
      })()}
      {intelAppId !== null && (() => {
        const app = examples.find((a) => a.id === intelAppId);
        if (!app) return null;
        return <CompetitiveIntel appId={intelAppId} appName={app.name} onClose={() => setIntelAppId(null)} />;
      })()}
      {verifyAppId !== null && (() => {
        const app = examples.find((a) => a.id === verifyAppId);
        if (!app) return null;
        return <VerificationChallenge appId={verifyAppId} appName={app.name} onClose={() => setVerifyAppId(null)} />;
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
    <div className="space-y-10">
      {metrics && <MetricsDashboard metrics={metrics} />}

      <div className="card-flat">
        <h2 className="font-display text-lg font-semibold text-secondary-900 dark:text-white mb-5">
          Research Summary
        </h2>
        <ul className="space-y-3">
          {lines.map((line, i) => (
            <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-secondary-700 dark:text-secondary-300">
              <span className="text-primary-500 dark:text-primary-light mt-0.5 font-mono text-xs">→</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {pieData.length > 0 && (
        <div className="card-flat">
          <h2 className="font-display text-lg font-semibold text-secondary-900 dark:text-white mb-2">
            Authentication Methods
          </h2>
          <p className="font-serif italic text-xs text-secondary-400 mb-5">Distribution across all researched apps</p>
          <div className="chart-container">
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
        </div>
      )}

      <ExampleCards apps={apps} />
    </div>
  );
}
