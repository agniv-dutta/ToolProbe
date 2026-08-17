import { useState, useEffect } from "react";
import { fetchAuthDeepDive } from "../utils/api";
import type { AuthDeepDive } from "../utils/types";

interface Props {
  appId: number;
  appName: string;
  onClose: () => void;
}

const ONBOARDING_COLORS: Record<string, string> = {
  instant: "text-accent",
  minutes: "text-accent",
  hours: "text-warning",
  days: "text-amber-600",
  weeks: "text-error",
  unknown: "text-secondary-400",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-secondary-900 rounded-2xl shadow-card-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-secondary-200 dark:border-secondary-700 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/90 dark:bg-secondary-900/90 backdrop-blur-xl border-b border-secondary-200 dark:border-secondary-700 px-8 py-5 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="font-display text-lg font-semibold text-secondary-900 dark:text-white">Auth Deep Dive</h2>
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
              <span className="ml-4 font-serif italic text-sm text-secondary-500">Analyzing authentication…</span>
            </div>
          )}

          {error && (
            <div className="text-center py-16">
              <p className="text-error text-sm">{error}</p>
              <button onClick={onClose} className="btn-ghost mt-3 text-xs">Close</button>
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
      <div className="p-5 rounded-xl bg-primary-50 dark:bg-primary-50/10 border border-primary-200 dark:border-primary-500/20">
        <div className="font-serif italic text-[11px] font-medium text-primary-500 dark:text-primary-light uppercase tracking-wider mb-2">Recommended Auth Method</div>
        <div className="font-display text-lg font-semibold text-secondary-900 dark:text-white">{data.primary_auth}</div>
      </div>

      {/* Key Facts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="metric-card">
          <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Onboarding Time</div>
          <div className={`font-display text-xl font-semibold ${ONBOARDING_COLORS[data.onboarding_time] ?? "text-secondary-600"}`}>
            {data.onboarding_time}
          </div>
        </div>
        <div className="metric-card">
          <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Manual Approval</div>
          <div className={`font-display text-xl font-semibold ${data.requires_verification ? "text-warning" : "text-accent"}`}>
            {data.requires_verification ? "Required" : "Not Required"}
          </div>
          {data.verification_details && (
            <div className="font-serif italic text-[10px] text-secondary-400 mt-2">{data.verification_details}</div>
          )}
        </div>
      </div>

      {/* Auth Methods */}
      {data.all_auth_methods.length > 0 && (
        <div>
          <h3 className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">All Auth Methods</h3>
          <div className="space-y-2">
            {data.all_auth_methods.map((m) => (
              <div key={m.method} className="flex items-start gap-3 p-4 rounded-xl bg-secondary-50 dark:bg-secondary-800/50">
                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${m.recommended ? "bg-accent" : "bg-secondary-300 dark:bg-secondary-600"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-secondary-900 dark:text-white">{m.method}</span>
                    {m.recommended && <span className="badge badge-green text-[9px]">Recommended</span>}
                  </div>
                  <p className="font-serif italic text-xs text-secondary-500 dark:text-secondary-400 mt-1">{m.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onboarding Flow */}
      <div>
        <h3 className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Onboarding Flow</h3>
        <p className="text-sm text-secondary-700 dark:text-secondary-300 leading-relaxed">{data.onboarding_flow}</p>
      </div>

      {/* Credential Provisioning */}
      <div>
        <h3 className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Credential Provisioning</h3>
        <p className="text-sm text-secondary-700 dark:text-secondary-300 leading-relaxed">{data.credential_provisioning}</p>
      </div>

      {/* Unusual Constraints */}
      {data.unusual_constraints.length > 0 && (
        <div>
          <h3 className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Unusual Constraints</h3>
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
          <h3 className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Developer Gotchas</h3>
          <ul className="space-y-2">
            {data.gotchas.map((g, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-secondary-700 dark:text-secondary-300">
                <span className="text-warning mt-0.5">⚠</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
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
