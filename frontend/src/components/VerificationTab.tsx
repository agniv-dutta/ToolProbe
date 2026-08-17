import { useMemo } from "react";
import type { AppEntry } from "../utils/types";

interface Props {
  apps: AppEntry[];
}

export function VerificationTab({ apps }: Props) {
  const allVerifications = useMemo(
    () =>
      apps.flatMap((a) =>
        a.verifications.map((v) => ({
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Checks", value: total, color: "text-blue-600 dark:text-blue-400" },
          { label: "Correct", value: accurate, color: "text-green-600 dark:text-green-400" },
          { label: "Wrong", value: wrong, color: "text-red-600 dark:text-red-400" },
          { label: "Pending", value: pending, color: "text-yellow-600 dark:text-yellow-400" },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Accuracy Rate</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${accurate}%` }}
              />
            </div>
            <span className="text-sm font-medium">{accuracyRate}%</span>
          </div>
        </div>
      )}

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium">App</th>
                <th className="text-left px-4 py-3 font-medium">Claim</th>
                <th className="text-left px-4 py-3 font-medium">Method</th>
                <th className="text-left px-4 py-3 font-medium">Evidence</th>
                <th className="text-left px-4 py-3 font-medium">Result</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {allVerifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    No verification logs yet.
                  </td>
                </tr>
              ) : (
                allVerifications.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{v.appName}</div>
                      <div className="text-xs text-gray-500">{v.appCategory}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="text-sm line-clamp-2">{v.claim ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-blue">{v.method ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="text-xs text-gray-500 line-clamp-2">
                        {v.evidence ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {v.is_accurate === true && (
                        <span className="badge badge-green">Correct</span>
                      )}
                      {v.is_accurate === false && (
                        <span className="badge badge-red">Wrong</span>
                      )}
                      {v.is_accurate === null && (
                        <span className="badge badge-yellow">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                      {v.created_at
                        ? new Date(v.created_at).toLocaleDateString()
                        : "—"}
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
