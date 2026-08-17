import { useState, useMemo } from "react";
import type { AppEntry } from "../utils/types";

interface Props {
  apps: AppEntry[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: "badge-green",
  failed: "badge-red",
  pending: "badge-yellow",
  researching: "badge-blue",
};

export function AllAppsTab({ apps }: Props) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"name" | "category" | "confidence">("name");

  const categories = useMemo(
    () => [...new Set(apps.map((a) => a.category).filter(Boolean))].sort(),
    [apps]
  );

  const filtered = useMemo(() => {
    let list = [...apps];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.research?.summary?.toLowerCase().includes(q)
      );
    }
    if (catFilter !== "all") {
      list = list.filter((a) => a.category === catFilter);
    }
    list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "category") return (a.category ?? "").localeCompare(b.category ?? "");
      return (
        (b.research?.confidence_score ?? 0) - (a.research?.confidence_score ?? 0)
      );
    });
    return list;
  }, [apps, search, catFilter, sortKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search apps…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
        >
          <option value="name">Sort by Name</option>
          <option value="category">Sort by Category</option>
          <option value="confidence">Sort by Confidence</option>
        </select>
      </div>

      <div className="text-sm text-gray-500">{filtered.length} apps</div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Tech Stack</th>
                <th className="text-left px-4 py-3 font-medium">Confidence</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((app) => (
                <tr
                  key={app.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{app.name}</div>
                    {app.description && (
                      <div className="text-xs text-gray-500 line-clamp-1 max-w-xs">
                        {app.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge badge-blue">{app.category ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(app.research?.tech_stack ?? []).slice(0, 4).map((t) => (
                        <span key={t} className="badge badge-green text-[10px]">
                          {t}
                        </span>
                      ))}
                      {(app.research?.tech_stack?.length ?? 0) > 4 && (
                        <span className="text-xs text-gray-400">
                          +{(app.research!.tech_stack!.length - 4)} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${(app.research?.confidence_score ?? 0) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {((app.research?.confidence_score ?? 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COLORS[app.status] ?? "badge-yellow"}`}>
                      {app.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
