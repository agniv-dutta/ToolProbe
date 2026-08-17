import { useState, useMemo } from "react";
import type { AppEntry } from "../utils/types";

interface Props {
  apps: AppEntry[];
}

const STATUS_STYLES: Record<string, string> = {
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
    () => [...new Set(apps.map((a) => a.category).filter((c): c is string => c != null))].sort(),
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
      return (b.research?.confidence_score ?? 0) - (a.research?.confidence_score ?? 0);
    });
    return list;
  }, [apps, search, catFilter, sortKey]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search apps…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-premium !pl-10"
          />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="select-premium">
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as typeof sortKey)} className="select-premium">
          <option value="name">Sort by Name</option>
          <option value="category">Sort by Category</option>
          <option value="confidence">Sort by Confidence</option>
        </select>
      </div>

      <div className="font-serif italic text-xs text-secondary-500 dark:text-secondary-400">
        {filtered.length} app{filtered.length !== 1 ? "s" : ""}
      </div>

      {/* Table */}
      <div className="card-flat !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-200 dark:border-secondary-700">
                {["Name", "Category", "Tech Stack", "Confidence", "Status"].map((h) => (
                  <th
                    key={h}
                    className={`text-left px-5 py-3.5 font-serif italic text-[11px] font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider ${h === "Tech Stack" ? "hidden md:table-cell" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
              {filtered.map((app, i) => (
                <tr
                  key={app.id}
                  className="hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors duration-150"
                  style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                >
                  <td className="px-5 py-4">
                    <div className="font-medium text-secondary-900 dark:text-white">{app.name}</div>
                    {app.description && (
                      <div className="text-xs text-secondary-400 line-clamp-1 max-w-xs mt-0.5">{app.description}</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="badge badge-blue">{app.category ?? "—"}</span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(app.research?.tech_stack ?? []).slice(0, 4).map((t) => (
                        <span key={t} className="badge badge-green text-[10px]">{t}</span>
                      ))}
                      {(app.research?.tech_stack?.length ?? 0) > 4 && (
                        <span className="text-xs text-secondary-400 font-serif italic">+{(app.research!.tech_stack!.length - 4)} more</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-16 h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-primary-light rounded-full transition-all duration-500"
                          style={{ width: `${(app.research?.confidence_score ?? 0) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-secondary-500 dark:text-secondary-400">
                        {((app.research?.confidence_score ?? 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`badge ${STATUS_STYLES[app.status] ?? "badge-yellow"}`}>
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
