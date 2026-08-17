import { useState, useEffect } from "react";
import { fetchApiCompleteness } from "../utils/api";
import type { ApiCompleteness } from "../utils/types";

interface Props {
  appId: number;
  appName: string;
  onClose: () => void;
}

const DOCS_COLORS: Record<string, string> = {
  excellent: "text-accent",
  good: "text-accent",
  fair: "text-warning",
  poor: "text-amber-600",
  none: "text-error",
};

const SEVERITY_BADGE: Record<string, string> = {
  high: "badge-red",
  medium: "badge-yellow",
  low: "badge-blue",
};

export function ApiCompleteness({ appId, appName, onClose }: Props) {
  const [data, setData] = useState<ApiCompleteness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchApiCompleteness(appId)
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
            <h2 className="font-display text-lg font-semibold text-secondary-900 dark:text-white">API Completeness</h2>
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
              <span className="ml-4 font-serif italic text-sm text-secondary-500">Evaluating API coverage…</span>
            </div>
          )}
          {error && (
            <div className="text-center py-16">
              <p className="text-error text-sm">{error}</p>
              <button onClick={onClose} className="btn-ghost mt-3 text-xs">Close</button>
            </div>
          )}
          {data && <CompletenessContent data={data} />}
        </div>
      </div>
    </div>
  );
}

function CompletenessContent({ data }: { data: ApiCompleteness }) {
  return (
    <div className="space-y-6">
      {/* CRUD Coverage + Docs Quality */}
      <div className="grid grid-cols-2 gap-4">
        <div className="metric-card">
          <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">CRUD Coverage</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${data.crud_coverage >= 80 ? "bg-gradient-to-r from-accent to-accent-light" : data.crud_coverage >= 50 ? "bg-gradient-to-r from-warning to-amber-400" : "bg-gradient-to-r from-error to-red-400"}`} style={{ width: `${data.crud_coverage}%` }} />
            </div>
            <span className="font-display text-xl font-semibold text-secondary-900 dark:text-white">{data.crud_coverage}%</span>
          </div>
          <div className="flex gap-2 mt-3">
            {(["create", "read", "update", "delete"] as const).map((op) => (
              <span key={op} className={`badge text-[10px] ${data.crud_details[op] ? "badge-green" : "badge-gray"}`}>
                {op.charAt(0).toUpperCase() + op.slice(1)}
              </span>
            ))}
          </div>
        </div>
        <div className="metric-card">
          <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Docs Quality</div>
          <div className={`font-display text-xl font-semibold ${DOCS_COLORS[data.docs_quality] ?? "text-secondary-600"}`}>
            {data.docs_quality}
          </div>
          <div className="font-serif italic text-[10px] text-secondary-400 mt-2">Versioning: {data.api_versioning}</div>
        </div>
      </div>

      {/* Rate Limits */}
      <div className="p-5 rounded-xl bg-primary-50 dark:bg-primary-50/10 border border-primary-200 dark:border-primary-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="font-serif italic text-[11px] font-medium text-primary-500 dark:text-primary-light uppercase tracking-wider">Rate Limits</div>
          {data.rate_limits.documented && data.rate_limits.requests_per_minute !== null && (
            <span className="font-mono text-sm font-semibold text-primary-500 dark:text-primary-light">
              {data.rate_limits.requests_per_minute} req/min
            </span>
          )}
        </div>
        <p className="text-sm text-secondary-700 dark:text-secondary-300">{data.rate_limits.details}</p>
      </div>

      {/* Webhook Support */}
      <div className="p-5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/30">
        <div className="flex items-center gap-2 mb-2">
          <div className="font-serif italic text-[11px] font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Webhook Support</div>
          <span className={`badge text-[9px] ${data.webhook_support.supported ? "badge-green" : "badge-red"}`}>
            {data.webhook_support.method}
          </span>
        </div>
        <p className="text-sm text-secondary-700 dark:text-secondary-300">{data.webhook_support.details}</p>
      </div>

      {/* SDK Availability */}
      {data.sdk_availability.length > 0 && (
        <div>
          <h3 className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">SDK Availability</h3>
          <div className="flex flex-wrap gap-2">
            {data.sdk_availability.map((lang) => (
              <span key={lang} className="badge badge-green">{lang}</span>
            ))}
          </div>
        </div>
      )}

      {/* Paid Features */}
      {data.requires_paid_features.length > 0 && (
        <div>
          <h3 className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Features Requiring Paid Plans</h3>
          <div className="space-y-2">
            {data.requires_paid_features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="font-medium text-secondary-900 dark:text-white">{f.feature}</span>
                <span className="badge badge-yellow text-[9px]">{f.required_plan}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Known Gaps */}
      {data.known_gaps.length > 0 && (
        <div>
          <h3 className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Known Gaps</h3>
          <div className="space-y-2">
            {data.known_gaps.map((g, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-secondary-50 dark:bg-secondary-800/50">
                <span className={`badge ${SEVERITY_BADGE[g.severity] ?? "badge-gray"} text-[9px] shrink-0 mt-0.5`}>{g.severity}</span>
                <div className="flex-1 min-w-0 text-sm text-secondary-700 dark:text-secondary-300">
                  <span>{g.gap}</span>
                  {g.source && (
                    <a href={g.source} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary-500 dark:text-primary-light hover:underline text-[10px] font-serif italic">
                      source →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-secondary-200 dark:border-secondary-700">
        <span className="font-serif italic text-xs text-secondary-400">Confidence: {(data.confidence * 100).toFixed(0)}%</span>
        <span className="font-serif italic text-xs text-secondary-400">{data.sources.length} source{data.sources.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
