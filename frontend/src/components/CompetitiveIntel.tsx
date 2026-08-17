import { useState, useEffect } from "react";
import { fetchCompetitiveIntel } from "../utils/api";
import type { CompetitiveIntel } from "../utils/types";

interface Props {
  appId: number;
  appName: string;
  onClose: () => void;
}

const MARKET_COLORS: Record<string, string> = {
  dominant: "text-accent",
  strong: "text-accent",
  niche: "text-primary-500 dark:text-primary-light",
  emerging: "text-purple-500",
  declining: "text-error",
  unknown: "text-secondary-400",
};

const RISK_COLORS: Record<string, string> = {
  low: "text-accent",
  medium: "text-warning",
  high: "text-error",
  unknown: "text-secondary-400",
};

const QUALITY_BADGE: Record<string, string> = {
  strong: "badge-green",
  moderate: "badge-yellow",
  weak: "badge-red",
  none: "badge-red",
  unknown: "badge-gray",
};

const COMMUNITY_COLORS: Record<string, string> = {
  active: "text-accent",
  moderate: "text-warning",
  quiet: "text-error",
  unknown: "text-secondary-400",
};

export function CompetitiveIntel({ appId, appName, onClose }: Props) {
  const [data, setData] = useState<CompetitiveIntel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCompetitiveIntel(appId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [appId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-secondary-900 rounded-2xl shadow-card-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-secondary-200 dark:border-secondary-700 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/90 dark:bg-secondary-900/90 backdrop-blur-xl border-b border-secondary-200 dark:border-secondary-700 px-8 py-5 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="font-display text-lg font-semibold text-secondary-900 dark:text-white">Competitive Intel</h2>
            <p className="font-serif italic text-sm text-secondary-400">{appName}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-all duration-150 text-secondary-500">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary-500 border-t-transparent" />
              <span className="ml-4 font-serif italic text-sm text-secondary-500">Gathering competitive intel…</span>
            </div>
          )}
          {error && (
            <div className="text-center py-16">
              <p className="text-error text-sm">{error}</p>
              <button onClick={onClose} className="btn-ghost mt-3 text-xs">Close</button>
            </div>
          )}
          {data && <IntelContent data={data} />}
        </div>
      </div>
    </div>
  );
}

function IntelContent({ data }: { data: CompetitiveIntel }) {
  return (
    <div className="space-y-6">
      {/* Market Position + Primary System */}
      <div className="grid grid-cols-2 gap-4">
        <div className="metric-card">
          <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Market Position</div>
          <div className={`font-display text-xl font-semibold ${MARKET_COLORS[data.market_position] ?? "text-secondary-600"}`}>
            {data.market_position}
          </div>
        </div>
        <div className="metric-card">
          <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Primary System</div>
          <div className={`font-display text-xl font-semibold ${data.is_primary_system ? "text-accent" : "text-primary-500 dark:text-primary-light"}`}>
            {data.is_primary_system ? "Yes" : "No"}
          </div>
          <div className="font-serif italic text-[10px] text-secondary-400 mt-2 line-clamp-2">{data.primary_system_reasoning}</div>
        </div>
      </div>

      {/* Stability Risk */}
      <div className="p-5 rounded-xl bg-secondary-50 dark:bg-secondary-800/50 border border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center justify-between mb-2">
          <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">Stability Risk</div>
          <span className={`font-display text-sm font-semibold ${RISK_COLORS[data.stability_risk.level]}`}>
            {data.stability_risk.level}
          </span>
        </div>
        <p className="text-sm text-secondary-700 dark:text-secondary-300 mb-2">{data.stability_risk.reasoning}</p>
        {data.stability_risk.signals.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.stability_risk.signals.map((s, i) => (
              <span key={i} className="badge badge-yellow">{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Consolidation Rumors */}
      {data.consolidation_rumors.length > 0 && (
        <div>
          <h3 className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Consolidation / Sunsetting Signals</h3>
          <ul className="space-y-2">
            {data.consolidation_rumors.map((r, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-secondary-700 dark:text-secondary-300">
                <span className="text-warning mt-0.5">⚠</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Competitor APIs */}
      {data.competitor_apis.length > 0 && (
        <div>
          <h3 className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">Competitor APIs</h3>
          <div className="space-y-2">
            {data.competitor_apis.map((c) => (
              <div key={c.competitor} className="flex items-start gap-3 p-4 rounded-xl bg-secondary-50 dark:bg-secondary-800/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-secondary-900 dark:text-white">{c.competitor}</span>
                    <span className={`badge text-[9px] ${c.has_api ? QUALITY_BADGE[c.api_quality] ?? "badge-gray" : "badge-gray"}`}>
                      {c.has_api ? c.api_quality : "no API"}
                    </span>
                  </div>
                  <p className="font-serif italic text-xs text-secondary-500 dark:text-secondary-400 mt-1">{c.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ecosystem Health */}
      <div className="grid grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Community</div>
          <div className={`font-display text-sm font-semibold ${COMMUNITY_COLORS[data.ecosystem_health.community_activity] ?? "text-secondary-600"}`}>
            {data.ecosystem_health.community_activity}
          </div>
        </div>
        <div className="metric-card">
          <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Partners</div>
          <div className="font-display text-sm font-semibold text-secondary-900 dark:text-white">{data.ecosystem_health.partner_count ?? "—"}</div>
        </div>
        <div className="metric-card">
          <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Last Update</div>
          <div className="font-display text-sm font-semibold text-secondary-900 dark:text-white">{data.ecosystem_health.last_major_update ?? "—"}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-secondary-200 dark:border-secondary-700">
        <span className="font-serif italic text-xs text-secondary-400">Confidence: {(data.confidence * 100).toFixed(0)}%</span>
        <span className="font-serif italic text-xs text-secondary-400">{data.sources.length} source{data.sources.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
