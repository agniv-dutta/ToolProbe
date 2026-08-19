import { useMemo } from "react";
import type { AppEntry } from "../utils/types";

interface Props {
  apps: AppEntry[];
}

export function VerificationTab({ apps }: Props) {
  const allVerifications = useMemo(
    () =>
      apps.flatMap((a) =>
        (a.verifications ?? []).map((v) => ({
          ...v,
          appName: a.name,
          appCategory: a.category,
        }))
      ),
    [apps]
  );

  const accurate = allVerifications.filter((v) => v.is_accurate === true).length;
  const wrong = allVerifications.filter((v) => v.is_accurate === false).length;
  const pending = allVerifications.filter((v) => v.is_accurate === null).length;
  const total = allVerifications.length;
  const accuracyRate = total > 0 ? ((accurate / total) * 100).toFixed(1) : "—";

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
        {[
          { label: "Total Checks", value: total, color: "text-primary-500 dark:text-primary-light" },
          { label: "Correct", value: accurate, color: "text-accent" },
          { label: "Wrong", value: wrong, color: "text-error" },
          { label: "Pending", value: pending, color: "text-warning" },
        ].map((s) => (
          <div key={s.label} className="metric-card">
            <div className="font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">{s.label}</div>
            <div className={`font-display text-2xl font-semibold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Accuracy bar */}
      {total > 0 && (
        <div className="card-flat">
          <h2 className="font-display text-lg font-semibold text-secondary-900 dark:text-white mb-2">Accuracy Rate</h2>
          <p className="font-serif italic text-xs text-secondary-400 mb-4">Spot-check verification results</p>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-700"
                style={{ width: `${accurate}%` }}
              />
            </div>
            <span className="font-mono text-sm font-semibold text-secondary-700 dark:text-secondary-300">{accuracyRate}%</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card-flat !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-200 dark:border-secondary-700">
                {["App", "Claim", "Method", "Evidence", "Result", "Date"].map((h) => (
                  <th
                    key={h}
                    className={`text-left px-5 py-3.5 font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider ${h === "Date" ? "hidden md:table-cell" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
              {allVerifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-secondary-200 dark:bg-secondary-700 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-secondary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 12l2 2 4-4" />
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    </div>
                    <p className="text-secondary-500 font-serif italic">No verification logs yet.</p>
                  </td>
                </tr>
              ) : (
                allVerifications.map((v) => (
                  <tr key={v.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors duration-150">
                    <td className="px-5 py-4">
                      <div className="font-medium text-secondary-900 dark:text-white">{v.appName}</div>
                      <div className="font-serif italic text-xs text-secondary-400">{v.appCategory}</div>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <div className="text-sm text-secondary-700 dark:text-secondary-300 line-clamp-2">{v.claim ?? "—"}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="badge badge-blue">{v.method ?? "—"}</span>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <div className="font-serif italic text-xs text-secondary-400 line-clamp-2">{v.evidence ?? "—"}</div>
                    </td>
                    <td className="px-5 py-4">
                      {v.is_accurate === true && <span className="badge badge-green">Correct</span>}
                      {v.is_accurate === false && <span className="badge badge-red">Wrong</span>}
                      {v.is_accurate === null && <span className="badge badge-yellow">Pending</span>}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell font-serif italic text-xs text-secondary-400">
                      {v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
