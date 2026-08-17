import { useMemo, useState } from "react";
import type { AppEntry } from "../utils/types";

interface Props {
  apps: AppEntry[];
}

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
  appName?: string;
}

function buildLog(apps: AppEntry[]): LogEntry[] {
  const logs: LogEntry[] = [];

  logs.push({
    timestamp: "2025-01-01T00:00:00Z",
    level: "info",
    message: `Loaded ${apps.length} apps for research`,
  });

  const completed = apps.filter((a) => a.status === "completed");
  const failed = apps.filter((a) => a.status === "failed");

  for (const app of completed) {
    logs.push({
      timestamp: app.created_at,
      level: "success",
      message: `Research completed – confidence ${((app.research?.confidence_score ?? 0) * 100).toFixed(0)}%`,
      appName: app.name,
    });

    for (const v of app.verifications) {
      logs.push({
        timestamp: v.created_at ?? app.created_at,
        level: v.is_accurate === true ? "success" : v.is_accurate === false ? "error" : "warn",
        message: `Verification: ${v.claim ?? "—"} [${v.method ?? "—"}]`,
        appName: app.name,
      });
    }
  }

  for (const app of failed) {
    logs.push({
      timestamp: app.updated_at,
      level: "error",
      message: "Research failed",
      appName: app.name,
    });
  }

  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return logs;
}

const LEVEL_STYLES: Record<string, string> = {
  info: "text-blue-600 dark:text-blue-400",
  warn: "text-yellow-600 dark:text-yellow-400",
  error: "text-red-600 dark:text-red-400",
  success: "text-green-600 dark:text-green-400",
};

const LEVEL_DOT: Record<string, string> = {
  info: "bg-blue-500",
  warn: "bg-yellow-500",
  error: "bg-red-500",
  success: "bg-green-500",
};

export function AgentLogTab({ apps }: Props) {
  const logs = useMemo(() => buildLog(apps), [apps]);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? logs : logs.filter((l) => l.level === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Filter:</span>
        {["all", "info", "success", "warn", "error"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === f
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} entries</span>
      </div>

      <div className="card !p-0 overflow-hidden font-mono text-xs">
        <div className="max-h-[600px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No log entries.</div>
          ) : (
            filtered.map((log, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${LEVEL_DOT[log.level]}`} />
                <div className="shrink-0 text-gray-400 w-36">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
                {log.appName && (
                  <div className="shrink-0 text-gray-600 dark:text-gray-300 w-28 truncate">
                    [{log.appName}]
                  </div>
                )}
                <div className={`flex-1 ${LEVEL_STYLES[log.level]}`}>{log.message}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
