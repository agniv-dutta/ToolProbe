import { useState, useEffect } from "react";
import { fetchCompareApps } from "../utils/api";
import type { AppEntry, AppComparison } from "../utils/types";

interface Props {
  apps: AppEntry[];
}

export function AppComparison({ apps }: Props) {
  const [app1Id, setApp1Id] = useState<number | null>(null);
  const [app2Id, setApp2Id] = useState<number | null>(null);
  const [data, setData] = useState<AppComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!app1Id || !app2Id || app1Id === app2Id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCompareApps(app1Id, app2Id);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const completedApps = apps.filter((a) => a.status === "completed");

  return (
    <div className="space-y-6">
      {/* Selector */}
      <div className="card-flat">
        <h2 className="font-display text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          App Comparison
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)", fontFamily: "Lora", fontStyle: "italic" }}>
          Compare two apps on buildability, ease of use, and reliability
        </p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>App 1</label>
            <select value={app1Id ?? ""} onChange={(e) => setApp1Id(Number(e.target.value) || null)} className="select-premium w-full">
              <option value="">Select app...</option>
              {completedApps.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="text-lg font-bold" style={{ color: "var(--text-muted)" }}>vs</div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>App 2</label>
            <select value={app2Id ?? ""} onChange={(e) => setApp2Id(Number(e.target.value) || null)} className="select-premium w-full">
              <option value="">Select app...</option>
              {completedApps.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCompare}
            disabled={loading || !app1Id || !app2Id || app1Id === app2Id}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? "Comparing..." : "Compare"}
          </button>
        </div>
      </div>

      {error && (
        <div className="card-flat border-l-4" style={{ borderColor: "var(--text-error)" }}>
          <p className="text-sm" style={{ color: "var(--text-error)" }}>{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-4 stagger-children">
          {/* Winners */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Buildability", winner: data.winner_for_buildability },
              { label: "Ease of Use", winner: data.winner_for_easeofuse },
              { label: "Reliability", winner: data.winner_for_reliability },
            ].map((w) => (
              <div key={w.label} className="metric-card">
                <div className="text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)", fontFamily: "Lora", fontStyle: "italic" }}>
                  {w.label}
                </div>
                <div className="font-display text-lg font-semibold" style={{ color: "var(--text-accent)" }}>
                  {w.winner}
                </div>
              </div>
            ))}
          </div>

          {/* Recommendation */}
          <div className="card-flat">
            <h3 className="font-display text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Recommendation</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{data.recommendation}</p>
          </div>

          {/* Tradeoffs */}
          <div className="card-flat">
            <h3 className="font-display text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Tradeoffs</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{data.tradeoffs}</p>
          </div>
        </div>
      )}
    </div>
  );
}
