import { useState, useEffect } from "react";
import { fetchCompetitiveIntel } from "../utils/api";
import type { CompetitiveIntel } from "../utils/types";

interface Props {
  appId: number;
  appName: string;
  onClose: () => void;
}

const MARKET_COLORS: Record<string, string> = {
  dominant: "text-green-600 dark:text-green-400",
  strong: "text-green-600 dark:text-green-400",
  niche: "text-blue-600 dark:text-blue-400",
  emerging: "text-purple-600 dark:text-purple-400",
  declining: "text-red-600 dark:text-red-400",
  unknown: "text-gray-500",
};

const RISK_COLORS: Record<string, string> = {
  low: "text-green-600 dark:text-green-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  high: "text-red-600 dark:text-red-400",
  unknown: "text-gray-500",
};

const QUALITY_COLORS: Record<string, string> = {
  strong: "badge-green",
  moderate: "badge-yellow",
  weak: "badge-red",
  none: "badge-red",
  unknown: "badge-gray",
};

const COMMUNITY_COLORS: Record<string, string> = {
  active: "text-green-600 dark:text-green-400",
  moderate: "text-yellow-600 dark:text-yellow-400",
  quiet: "text-red-600 dark:text-red-400",
  unknown: "text-gray-500",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-semibold">Competitive Intel</h2>
            <p className="text-sm text-gray-500">{appName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            ✕
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              <span className="ml-3 text-sm text-gray-500">Gathering competitive intel…</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-red-500 text-sm">
              <p>{error}</p>
              <button onClick={onClose} className="mt-2 underline text-xs">Close</button>
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
      <div className="grid grid-cols-2 gap-3">
        <div className="card !py-3 !px-4">
          <div className="text-[10px] text-gray-500 mb-1">Market Position</div>
          <div className={`text-lg font-bold ${MARKET_COLORS[data.market_position] ?? "text-gray-600"}`}>
            {data.market_position}
          </div>
        </div>
        <div className="card !py-3 !px-4">
          <div className="text-[10px] text-gray-500 mb-1">Primary System</div>
          <div className={`text-lg font-bold ${data.is_primary_system ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`}>
            {data.is_primary_system ? "Yes" : "No"}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 line-clamp-2">{data.primary_system_reasoning}</div>
        </div>
      </div>

      {/* Stability Risk */}
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-medium text-gray-500">Stability Risk</div>
          <span className={`text-sm font-bold ${RISK_COLORS[data.stability_risk.level]}`}>
            {data.stability_risk.level}
          </span>
        </div>
        <p className="text-sm mb-2">{data.stability_risk.reasoning}</p>
        {data.stability_risk.signals.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.stability_risk.signals.map((s, i) => (
              <span key={i} className="badge badge-yellow text-[9px]">{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Consolidation Rumors */}
      {data.consolidation_rumors.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Consolidation / Sunsetting Signals</h3>
          <ul className="space-y-1.5">
            {data.consolidation_rumors.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-orange-500 mt-0.5">⚠</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Competitor APIs */}
      {data.competitor_apis.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Competitor APIs</h3>
          <div className="space-y-2">
            {data.competitor_apis.map((c) => (
              <div key={c.competitor} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{c.competitor}</span>
                    <span className={`badge text-[9px] ${c.has_api ? QUALITY_COLORS[c.api_quality] ?? "badge-gray" : "badge-gray"}`}>
                      {c.has_api ? c.api_quality : "no API"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{c.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ecosystem Health */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card !py-3 !px-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">Community</div>
          <div className={`text-sm font-bold ${COMMUNITY_COLORS[data.ecosystem_health.community_activity] ?? "text-gray-600"}`}>
            {data.ecosystem_health.community_activity}
          </div>
        </div>
        <div className="card !py-3 !px-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">Partners</div>
          <div className="text-sm font-bold">{data.ecosystem_health.partner_count ?? "—"}</div>
        </div>
        <div className="card !py-3 !px-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">Last Major Update</div>
          <div className="text-sm font-bold">{data.ecosystem_health.last_major_update ?? "—"}</div>
        </div>
      </div>

      {/* Confidence + Sources */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
        <span>Confidence: {(data.confidence * 100).toFixed(0)}%</span>
        <span>{data.sources.length} source{data.sources.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
