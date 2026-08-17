import { useState, useEffect } from "react";
import { fetchVerificationChallenge } from "../utils/api";
import type { VerificationChallenge as ChallengeData } from "../utils/types";

interface Props {
  appId: number;
  appName: string;
  onClose: () => void;
}

const CATEGORY_BADGE: Record<string, string> = {
  critical: "badge-red",
  high: "badge-red",
  medium: "badge-yellow",
  low: "badge-blue",
};

const DIFFICULTY_BADGE: Record<string, string> = {
  easy: "badge-green",
  moderate: "badge-yellow",
  hard: "badge-red",
};

export function VerificationChallenge({ appId, appName, onClose }: Props) {
  const [data, setData] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchVerificationChallenge(appId)
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
            <h2 className="font-display text-lg font-semibold text-secondary-900 dark:text-white">Verification Challenge</h2>
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
              <span className="ml-4 font-serif italic text-sm text-secondary-500">Running verification challenge…</span>
            </div>
          )}
          {error && (
            <div className="text-center py-16">
              <p className="text-error text-sm">{error}</p>
              <button onClick={onClose} className="btn-ghost mt-3 text-xs">Close</button>
            </div>
          )}
          {data && <ChallengeContent data={data} />}
        </div>
      </div>
    </div>
  );
}

function ChallengeContent({ data }: { data: ChallengeData }) {
  return (
    <div className="space-y-6">
      {/* Summary stat */}
      <div className="grid grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Claims to Verify</div>
          <div className="font-display text-2xl font-semibold text-primary-500 dark:text-primary-light">{data.claims.length}</div>
        </div>
        <div className="metric-card">
          <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Confidence</div>
          <div className="font-display text-2xl font-semibold text-secondary-900 dark:text-white">{(data.confidence * 100).toFixed(0)}%</div>
        </div>
        <div className="metric-card">
          <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Sources</div>
          <div className="font-display text-2xl font-semibold text-secondary-900 dark:text-white">{data.sources.length}</div>
        </div>
      </div>

      {/* Claims */}
      {data.claims.length > 0 && (
        <div>
          <h3 className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">Claims</h3>
          <div className="space-y-4">
            {data.claims.map((cl, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-secondary-50 dark:bg-secondary-800/50 border border-secondary-200 dark:border-secondary-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-secondary-900 dark:text-white">{cl.claim}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`badge text-[9px] ${CATEGORY_BADGE[cl.category] ?? "badge-gray"}`}>{cl.category}</span>
                      <span className="font-serif italic text-[10px] text-secondary-400">importance: {cl.importance}</span>
                    </div>
                  </div>
                  <span className={`badge text-[9px] ${DIFFICULTY_BADGE[cl.difficulty] ?? "badge-gray"} shrink-0 ml-3`}>{cl.difficulty}</span>
                </div>

                {/* Verification steps */}
                {cl.verification_steps.length > 0 && (
                  <div className="mb-3">
                    <div className="font-serif italic text-[10px] font-medium text-secondary-400 uppercase tracking-wider mb-1.5">Verification Steps</div>
                    <ol className="space-y-1.5">
                      {cl.verification_steps.map((step, si) => (
                        <li key={si} className="flex items-start gap-2 text-xs text-secondary-600 dark:text-secondary-400">
                          <span className="font-mono text-secondary-400 shrink-0 mt-0.5">{si + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Proof */}
                {cl.proof_url && (
                  <div className="mb-2">
                    <div className="font-serif italic text-[10px] font-medium text-secondary-400 uppercase tracking-wider mb-1">Proof URL</div>
                    <a href={cl.proof_url} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-primary-500 dark:text-primary-light hover:underline break-all">
                      {cl.proof_url}
                    </a>
                  </div>
                )}

                {cl.proof_screenshot && (
                  <div className="mb-2">
                    <div className="font-serif italic text-[10px] font-medium text-secondary-400 uppercase tracking-wider mb-1">Proof Screenshot</div>
                    <p className="text-xs text-secondary-600 dark:text-secondary-400">{cl.proof_screenshot}</p>
                  </div>
                )}

                {/* Disproof */}
                {cl.disproof && (
                  <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/30">
                    <div className="font-serif italic text-[10px] font-medium text-error uppercase tracking-wider mb-1">Disproof</div>
                    <p className="text-xs text-secondary-700 dark:text-secondary-300">{cl.disproof}</p>
                  </div>
                )}
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
