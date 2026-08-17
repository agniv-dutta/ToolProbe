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

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

interface Props {
  analysis: AnalysisData | null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

export function PatternsTab({ analysis }: Props) {
  if (!analysis) {
    return (
      <div className="card text-center py-12 text-gray-500">
        No analysis data available. Run the pattern analyzer first.
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Apps", value: analysis.summary.total_apps },
          { label: "Categories", value: analysis.summary.categories },
          { label: "Self-Serve %", value: `${analysis.summary.self_serve_pct}%` },
          { label: "With Blockers", value: analysis.summary.apps_with_blockers },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Section title="Authentication Methods">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={authPie}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
              >
                {authPie.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Top Blockers">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={blockerBar} layout="vertical" margin={{ left: 100 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Access Model by Category">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={accessData}>
              <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="self_serve" fill="#10b981" name="Self-Serve" />
              <Bar dataKey="gated" fill="#ef4444" name="Gated" />
              <Bar dataKey="unknown" fill="#9ca3af" name="Unknown" />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Tech Cluster Overview">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="cluster" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis />
              <Radar name="Confidence" dataKey="confidence" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              <Radar name="Size" dataKey="size" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <Section title="Gated vs Self-Serve Comparison">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <div className="text-sm font-medium text-green-700 dark:text-green-300">Self-Serve</div>
            <div className="text-2xl font-bold mt-1">{gv.self_serve.count}</div>
            <div className="text-xs text-gray-500 mt-1">
              Avg confidence: {(gv.self_serve.avg_confidence * 100).toFixed(0)}%<br />
              Avg techs: {gv.self_serve.avg_tech_count}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <div className="text-sm font-medium text-red-700 dark:text-red-300">Gated</div>
            <div className="text-2xl font-bold mt-1">{gv.gated.count}</div>
            <div className="text-xs text-gray-500 mt-1">
              Avg confidence: {(gv.gated.avg_confidence * 100).toFixed(0)}%<br />
              Avg techs: {gv.gated.avg_tech_count}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Insight</div>
            <p className="text-sm mt-1">{gv.insight}</p>
          </div>
        </div>
      </Section>

      <Section title="Correlations">
        <div className="space-y-3">
          {analysis.correlations.categorical_correlations.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <span className="text-sm font-mono">
                {c.pair[0]} × {c.pair[1]}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-sm">Cramér's V: {c.cramers_v.toFixed(3)}</span>
                <span
                  className={`badge ${
                    c.strength === "strong"
                      ? "badge-green"
                      : c.strength === "moderate"
                      ? "badge-yellow"
                      : "badge-red"
                  }`}
                >
                  {c.strength}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tech Clusters">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysis.tech_clusters.clusters.map((cl) => (
            <div
              key={cl.cluster_id}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Cluster {cl.cluster_id}</span>
                <span className="badge badge-blue">{cl.size} apps</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {cl.top_techs.slice(0, 5).map((t) => (
                  <span key={t} className="badge badge-green text-[10px]">{t}</span>
                ))}
              </div>
              <div className="text-xs text-gray-500">
                Categories: {cl.top_categories.join(", ")}<br />
                Confidence: {(cl.avg_confidence * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
