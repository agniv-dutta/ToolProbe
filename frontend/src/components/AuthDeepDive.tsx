import { useState, useEffect } from "react";
import { fetchAuthDeepDive } from "../utils/api";
import type { AuthDeepDive } from "../utils/types";

interface Props {
  appId: number;
  appName: string;
  onClose: () => void;
}

const ONBOARDING_COLORS: Record<string, string> = {
  instant: "text-green-600 dark:text-green-400",
  minutes: "text-green-600 dark:text-green-400",
  hours: "text-yellow-600 dark:text-yellow-400",
  days: "text-orange-600 dark:text-orange-400",
  weeks: "text-red-600 dark:text-red-400",
  unknown: "text-gray-500",
};

export function AuthDeepDive({ appId, appName, onClose }: Props) {
  const [data, setData] = useState<AuthDeepDive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAuthDeepDive(appId)
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
            <h2 className="text-lg font-semibold">Auth Deep Dive</h2>
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
              <span className="ml-3 text-sm text-gray-500">Analyzing authentication…</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-red-500 text-sm">
              <p>{error}</p>
              <button onClick={onClose} className="mt-2 underline text-xs">Close</button>
            </div>
          )}

          {data && <AuthContent data={data} />}
        </div>
      </div>
    </div>
  );
}

function AuthContent({ data }: { data: AuthDeepDive }) {
  return (
    <div className="space-y-6">
      {/* Primary Auth */}
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
        <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Recommended Auth Method</div>
        <div className="text-base font-semibold">{data.primary_auth}</div>
      </div>

      {/* Key Facts Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card !py-3 !px-4">
          <div className="text-[10px] text-gray-500 mb-1">Onboarding Time</div>
          <div className={`text-lg font-bold ${ONBOARDING_COLORS[data.onboarding_time] ?? "text-gray-600"}`}>
            {data.onboarding_time}
          </div>
        </div>
        <div className="card !py-3 !px-4">
          <div className="text-[10px] text-gray-500 mb-1">Manual Approval Required</div>
          <div className={`text-lg font-bold ${data.requires_verification ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}>
            {data.requires_verification ? "Yes" : "No"}
          </div>
          {data.verification_details && (
            <div className="text-[10px] text-gray-400 mt-1">{data.verification_details}</div>
          )}
        </div>
      </div>

      {/* Auth Methods Table */}
      {data.all_auth_methods.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">All Auth Methods</h3>
          <div className="space-y-2">
            {data.all_auth_methods.map((m) => (
              <div
                key={m.method}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${m.recommended ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{m.method}</span>
                    {m.recommended && <span className="badge badge-green text-[9px]">Recommended</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{m.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onboarding Flow */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Onboarding Flow</h3>
        <p className="text-sm leading-relaxed">{data.onboarding_flow}</p>
      </div>

      {/* Credential Provisioning */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Credential Provisioning</h3>
        <p className="text-sm leading-relaxed">{data.credential_provisioning}</p>
      </div>

      {/* Unusual Constraints */}
      {data.unusual_constraints.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Unusual Constraints</h3>
          <div className="flex flex-wrap gap-2">
            {data.unusual_constraints.map((c, i) => (
              <span key={i} className="badge badge-yellow">{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Gotchas */}
      {data.gotchas.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Developer Gotchas</h3>
          <ul className="space-y-1.5">
            {data.gotchas.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-orange-500 mt-0.5">⚠</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources + Confidence */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
        <span>Confidence: {(data.confidence * 100).toFixed(0)}%</span>
        <span>{data.sources.length} source{data.sources.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
