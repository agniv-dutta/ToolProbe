import { useState, useEffect } from "react";
import { fetchApiCompleteness } from "../utils/api";
import type { ApiCompleteness } from "../utils/types";

interface Props {
  appId: number;
  appName: string;
  onClose: () => void;
}

const DOCS_COLORS: Record<string, string> = {
  excellent: "text-green-600 dark:text-green-400",
  good: "text-green-600 dark:text-green-400",
  fair: "text-yellow-600 dark:text-yellow-400",
  poor: "text-orange-600 dark:text-orange-400",
  none: "text-red-600 dark:text-red-400",
};

const SEVERITY_COLORS: Record<string, string> = {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-semibold">API Completeness</h2>
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
              <span className="ml-3 text-sm text-gray-500">Evaluating API coverage…</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-red-500 text-sm">
              <p>{error}</p>
              <button onClick={onClose} className="mt-2 underline text-xs">Close</button>
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
      <div className="grid grid-cols-2 gap-3">
        <div className="card !py-3 !px-4">
          <div className="text-[10px] text-gray-500 mb-1">CRUD Coverage</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${data.crud_coverage >= 80 ? "bg-green-500" : data.crud_coverage >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${data.crud_coverage}%` }}
              />
            </div>
            <span className="text-lg font-bold">{data.crud_coverage}%</span>
          </div>
          <div className="flex gap-2 mt-2">
            {(["create", "read", "update", "delete"] as const).map((op) => (
              <span key={op} className={`text-[10px] px-1.5 py-0.5 rounded ${data.crud_details[op] ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-gray-100 text-gray-400 dark:bg-gray-800"}`}>
                {op.charAt(0).toUpperCase() + op.slice(1)}
              </span>
            ))}
          </div>
        </div>
        <div className="card !py-3 !px-4">
          <div className="text-[10px] text-gray-500 mb-1">Docs Quality</div>
          <div className={`text-lg font-bold ${DOCS_COLORS[data.docs_quality] ?? "text-gray-600"}`}>
            {data.docs_quality}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Versioning: {data.api_versioning}</div>
        </div>
      </div>

      {/* Rate Limits */}
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Rate Limits</div>
          {data.rate_limits.documented && data.rate_limits.requests_per_minute !== null && (
            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
              {data.rate_limits.requests_per_minute} req/min
            </span>
          )}
        </div>
        <p className="text-sm">{data.rate_limits.details}</p>
      </div>

      {/* Webhook Support */}
      <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-xs font-medium text-purple-600 dark:text-purple-400">Webhook Support</div>
          <span className={`badge text-[9px] ${data.webhook_support.supported ? "badge-green" : "badge-red"}`}>
            {data.webhook_support.method}
          </span>
        </div>
        <p className="text-sm">{data.webhook_support.details}</p>
      </div>

      {/* SDK Availability */}
      {data.sdk_availability.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">SDK Availability</h3>
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
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Features Requiring Paid Plans</h3>
          <div className="space-y-1.5">
            {data.requires_paid_features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="font-medium">{f.feature}</span>
                <span className="badge badge-yellow text-[9px]">{f.required_plan}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Known Gaps */}
      {data.known_gaps.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Known Gaps</h3>
          <div className="space-y-1.5">
            {data.known_gaps.map((g, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className={`mt-0.5 badge ${SEVERITY_COLORS[g.severity] ?? "badge-gray"} text-[9px] shrink-0`}>
                  {g.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <span>{g.gap}</span>
                  {g.source && (
                    <a href={g.source} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:underline text-[10px]">
                      source →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence + Sources */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
        <span>Confidence: {(data.confidence * 100).toFixed(0)}%</span>
        <span>{data.sources.length} source{data.sources.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
