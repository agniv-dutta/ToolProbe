import type { AnalysisData } from "../utils/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

const COLORS = ["#0052CC", "#059669", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];

interface Props {
  analysis: AnalysisData | null;
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card-flat">
      <h2 className="font-display text-lg font-semibold text-secondary-900 dark:text-white mb-1">{title}</h2>
      {subtitle && <p className="font-serif italic text-xs text-secondary-400 mb-5">{subtitle}</p>}
      {!subtitle && <div className="mb-5" />}
      {children}
    </div>
  );
}

export function PatternsTab({ analysis }: Props) {
  if (!analysis) {
    return (
      <div className="card-flat text-center py-16">
        <div className="w-16 h-16 rounded-full bg-secondary-200 dark:bg-secondary-700 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-secondary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3v18h18" />
            <path d="m7 16 4-4 4 4 5-6" />
          </svg>
        </div>
        <h3 className="font-display text-lg font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
          No analysis data
        </h3>
        <p className="text-sm text-secondary-500">Run the pattern analyzer first.</p>
      </div>
    );
  }

  const authPie = analysis.auth_distribution.labels.map((l, i) => ({
    name: l,
    value: analysis.auth_distribution.values[i],
  }));

  const blockerBar = analysis.top_blockers.labels.map((l, i) => ({
    name: l.length > 18 ? l.slice(0, 16) + "…" : l,
    count: analysis.top_blockers.values[i],
  }));

  const accessData = analysis.access_matrix.categories.slice(0, 12).map((cat, i) => ({
    category: cat.length > 14 ? cat.slice(0, 12) + "…" : cat,
    self_serve: analysis.access_matrix.series.self_serve[i] ?? 0,
    gated: analysis.access_matrix.series.gated[i] ?? 0,
    unknown: analysis.access_matrix.series.unknown[i] ?? 0,
  }));

  const radarData = analysis.tech_clusters.clusters.map((cl) => ({
    cluster: `C${cl.cluster_id}`,
    confidence: cl.avg_confidence * 100,
    size: cl.size,
    techs: cl.top_techs.length,
  }));

  const gv = analysis.correlations.gated_vs_selfserve;

  return (
    <div className="space-y-8">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
        {[
          { label: "Total Apps", value: analysis.summary.total_apps },
          { label: "Categories", value: analysis.summary.categories },
          { label: "Self-Serve %", value: `${analysis.summary.self_serve_pct}%` },
          { label: "With Blockers", value: analysis.summary.apps_with_blockers },
        ].map((s) => (
          <div key={s.label} className="metric-card">
            <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">{s.label}</div>
            <div className="font-display text-2xl font-semibold text-primary-500 dark:text-primary-light">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Section title="Authentication Methods" subtitle="Distribution across all apps">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={authPie} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {authPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Top Blockers" subtitle="Most common integration barriers">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={blockerBar} layout="vertical" margin={{ left: 100 }}>
                <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 11, fill: "#6B7280" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#EF4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Access Model by Category" subtitle="Self-serve vs gated breakdown">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={accessData}>
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#6B7280" }} angle={-35} textAnchor="end" height={60} stroke="#D1D5DB" />
                <YAxis stroke="#D1D5DB" tick={{ fontSize: 11, fill: "#6B7280" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="self_serve" fill="#059669" name="Self-Serve" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gated" fill="#EF4444" name="Gated" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unknown" fill="#9CA3AF" name="Unknown" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Tech Cluster Overview" subtitle="Radar comparison of clusters">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="cluster" tick={{ fontSize: 11, fill: "#6B7280" }} />
                <PolarRadiusAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                <Radar name="Confidence" dataKey="confidence" stroke="#0052CC" fill="#0052CC" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Size" dataKey="size" stroke="#059669" fill="#059669" fillOpacity={0.15} strokeWidth={2} />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <Section title="Gated vs Self-Serve Comparison" subtitle="Key differences between access models">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="card-premium !p-5 border-l-4 border-l-accent">
            <div className="font-serif italic text-[11px] font-medium text-accent uppercase tracking-wider mb-2">Self-Serve</div>
            <div className="font-display text-3xl font-semibold text-secondary-900 dark:text-white">{gv.self_serve.count}</div>
            <div className="font-serif italic text-xs text-secondary-400 mt-2">
              Avg confidence: <span className="font-mono not-italic">{(gv.self_serve.avg_confidence * 100).toFixed(0)}%</span><br />
              Avg techs: <span className="font-mono not-italic">{gv.self_serve.avg_tech_count}</span>
            </div>
          </div>
          <div className="card-premium !p-5 border-l-4 border-l-error">
            <div className="font-serif italic text-[11px] font-medium text-error uppercase tracking-wider mb-2">Gated</div>
            <div className="font-display text-3xl font-semibold text-secondary-900 dark:text-white">{gv.gated.count}</div>
            <div className="font-serif italic text-xs text-secondary-400 mt-2">
              Avg confidence: <span className="font-mono not-italic">{(gv.gated.avg_confidence * 100).toFixed(0)}%</span><br />
              Avg techs: <span className="font-mono not-italic">{gv.gated.avg_tech_count}</span>
            </div>
          </div>
          <div className="card-premium !p-5 border-l-4 border-l-primary-500">
            <div className="font-serif italic text-[11px] font-medium text-primary-500 dark:text-primary-light uppercase tracking-wider mb-2">Insight</div>
            <p className="text-sm text-secondary-700 dark:text-secondary-300 leading-relaxed">{gv.insight}</p>
          </div>
        </div>
      </Section>

      <Section title="Correlations" subtitle="Cramér's V between categorical variables">
        <div className="space-y-3">
          {analysis.correlations.categorical_correlations.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-secondary-50 dark:bg-secondary-800/50 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 transition-colors duration-150">
              <span className="font-mono text-sm text-secondary-700 dark:text-secondary-300">
                {c.pair[0]} × {c.pair[1]}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-secondary-500">{c.cramers_v.toFixed(3)}</span>
                <span className={`badge ${c.strength === "strong" ? "badge-green" : c.strength === "moderate" ? "badge-yellow" : "badge-red"}`}>
                  {c.strength}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tech Clusters" subtitle="KMeans clustering of technology stacks">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
          {analysis.tech_clusters.clusters.map((cl) => (
            <div key={cl.cluster_id} className="card-premium !p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display font-semibold text-secondary-900 dark:text-white">Cluster {cl.cluster_id}</span>
                <span className="badge badge-blue">{cl.size} apps</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {cl.top_techs.slice(0, 5).map((t) => (
                  <span key={t} className="badge badge-green text-[10px]">{t}</span>
                ))}
              </div>
              <div className="font-serif italic text-xs text-secondary-400">
                Categories: {cl.top_categories.join(", ")}<br />
                Confidence: <span className="font-mono not-italic">{(cl.avg_confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
