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
    timestamp: new Date().toISOString(),
    level: "info",
    message: `Loaded ${apps.length} apps for research`,
  });

  const completed = apps.filter((a) => a.status === "completed");
  const failed = apps.filter((a) => a.status === "failed");

  for (const app of completed) {
    logs.push({
      timestamp: app.created_at,
      level: "success",
      message: `Research completed — confidence ${((app.research?.confidence_score ?? 0) * 100).toFixed(0)}%`,
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

const LEVEL_CONFIG: Record<string, { dot: string; text: string; border: string; icon: string }> = {
  info: {
    dot: "bg-info",
    text: "text-info",
    border: "border-l-info",
    icon: "ℹ",
  },
  warn: {
    dot: "bg-warning",
    text: "text-warning",
    border: "border-l-warning",
    icon: "⚠",
  },
  error: {
    dot: "bg-error",
    text: "text-error",
    border: "border-l-error",
    icon: "✕",
  },
  success: {
    dot: "bg-accent",
    text: "text-accent",
    border: "border-l-accent",
    icon: "✓",
  },
};

export function AgentLogTab({ apps }: Props) {
  const logs = useMemo(() => buildLog(apps), [apps]);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? logs : logs.filter((l) => l.level === filter);

  return (
    <div className="space-y-6">
      {/* Filter buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-serif italic text-xs text-secondary-500 dark:text-secondary-400 mr-1">Filter:</span>
        {["all", "success", "info", "warn", "error"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-serif italic font-medium transition-all duration-150 ${
              filter === f
                ? "bg-primary-500 dark:bg-primary-light text-white shadow-card-sm"
                : "text-secondary-500 dark:text-secondary-400 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto font-mono text-xs text-secondary-400">{filtered.length} entries</span>
      </div>

      {/* Timeline */}
      <div className="card-flat !p-0 overflow-hidden">
        <div className="max-h-[700px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-secondary-200 dark:bg-secondary-700 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-secondary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 8v4l3 3" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <p className="font-serif italic text-secondary-500">No log entries.</p>
            </div>
          ) : (
            <div className="divide-y divide-secondary-100 dark:divide-secondary-800">
              {filtered.map((log, i) => {
                const cfg = LEVEL_CONFIG[log.level];
                return (
                  <div
                    key={i}
                    className={`relative flex items-start gap-4 px-6 py-4 border-l-[3px] ${cfg.border} hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors duration-150`}
                  >
                    {/* Dot */}
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />

                    {/* Timestamp */}
                    <div className="shrink-0 w-36">
                      <div className="font-serif italic text-[11px] font-medium text-secondary-400 dark:text-secondary-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>

                    {/* App name */}
                    {log.appName && (
                      <div className="shrink-0 w-28">
                        <span className="badge badge-gray text-[10px] truncate block">{log.appName}</span>
                      </div>
                    )}

                    {/* Message */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono ${cfg.text}`}>{cfg.icon}</span>
                        <span className="text-sm text-secondary-700 dark:text-secondary-300">{log.message}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
