import { useState, useEffect } from "react";
import { fetchVerificationChallenge } from "../utils/api";
import type { VerificationChallenge as VCData } from "../utils/types";

interface Props {
  appId: number;
  appName: string;
  onClose: () => void;
}

const IMPORTANCE_COLORS: Record<string, string> = {
  high: "badge-red",
  medium: "badge-yellow",
  low: "badge-blue",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  trivial: "text-green-600 dark:text-green-400",
  easy: "text-green-600 dark:text-green-400",
  moderate: "text-yellow-600 dark:text-yellow-400",
  hard: "text-red-600 dark:text-red-400",
};

const CATEGORY_ICONS: Record<string, string> = {
  auth: "🔐",
  pricing: "💰",
  tech_stack: "⚙️",
  feature: "✨",
  access: "🚪",
  other: "📋",
};

export function VerificationChallenge({ appId, appName, onClose }: Props) {
  const [data, setData] = useState<VCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(0);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-semibold">Verification Challenge</h2>
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
              <span className="ml-3 text-sm text-gray-500">Challenge-loading research claims…</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-red-500 text-sm">
              <p>{error}</p>
              <button onClick={onClose} className="mt-2 underline text-xs">Close</button>
            </div>
          )}

          {data && <ChallengeContent data={data} expanded={expanded} setExpanded={setExpanded} />}
        </div>
      </div>
    </div>
  );
}

function ChallengeContent({ data, expanded, setExpanded }: { data: VCData; expanded: number | null; setExpanded: (i: number | null) => void }) {
  return (
    <div className="space-y-4">
      {data.claims.map((c, i) => {
        const isOpen = expanded === i;
        return (
          <div
            key={i}
            className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <button
              onClick={() => setExpanded(isOpen ? null : i)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="text-xl shrink-0">{CATEGORY_ICONS[c.category] ?? "📋"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`badge text-[9px] ${IMPORTANCE_COLORS[c.importance] ?? "badge-gray"}`}>
                    {c.importance}
                  </span>
                  <span className="badge badge-gray text-[9px]">{c.category}</span>
                  <span className={`text-[9px] font-medium ${DIFFICULTY_COLORS[c.difficulty] ?? "text-gray-500"}`}>
                    {c.difficulty}
                  </span>
                </div>
                <p className="text-sm font-medium truncate">{c.claim}</p>
              </div>
              <span className="text-gray-400 text-sm shrink-0">{isOpen ? "▾" : "▸"}</span>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                {/* Verification Steps */}
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-2">How to Verify</h4>
                  <ol className="space-y-1.5">
                    {c.verification_steps.map((step, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500 font-mono text-xs mt-0.5 shrink-0">{j + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Proof */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                    <div className="text-[10px] font-medium text-green-600 dark:text-green-400 mb-1">Would PROVE</div>
                    <p className="text-sm">{c.proof_url}</p>
                    <p className="text-xs text-gray-500 mt-1 italic">{c.proof_screenshot}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                    <div className="text-[10px] font-medium text-red-600 dark:text-red-400 mb-1">Would DISPROVE</div>
                    <p className="text-sm">{c.disproof}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Confidence + Sources */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
        <span>Confidence: {(data.confidence * 100).toFixed(0)}%</span>
        <span>{data.sources.length} source{data.sources.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
