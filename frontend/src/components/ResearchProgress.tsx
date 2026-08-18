import { useState, useEffect, useRef } from "react";
import type { ResearchProgress } from "../utils/types";

export function ResearchProgress() {
  const [stats, setStats] = useState<ResearchProgress | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws/research-progress`;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => setConnected(true);
        ws.onclose = () => {
          setConnected(false);
          setTimeout(connect, 3000);
        };
        ws.onerror = () => ws.close();
        ws.onmessage = (e) => {
          try {
            setStats(JSON.parse(e.data));
          } catch {}
        };
      } catch {
        setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  if (!stats) {
    return (
      <div className="card-flat flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" style={{ color: "var(--text-accent)" }} />
        <span className="ml-3 text-sm" style={{ color: "var(--text-tertiary)" }}>Connecting to research progress...</span>
      </div>
    );
  }

  return (
    <div className="card-flat space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Research Progress</h2>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{connected ? "Live" : "Disconnected"}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${stats.progress_pct}%`,
            background: "var(--gradient-primary)",
          }}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
        {[
          { label: "Completed", value: stats.completed, color: "var(--text-success)" },
          { label: "Failed", value: stats.failed, color: "var(--text-error)" },
          { label: "Pending", value: stats.pending, color: "var(--text-warning)" },
          { label: "Progress", value: `${stats.progress_pct}%`, color: "var(--text-accent)" },
        ].map((s) => (
          <div key={s.label} className="metric-card !p-4">
            <div className="text-xs font-medium mb-1" style={{ color: "var(--text-tertiary)", fontFamily: "Lora", fontStyle: "italic" }}>
              {s.label}
            </div>
            <div className="font-display text-xl font-semibold" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-tertiary)" }}>
        <span>Avg confidence: {(stats.avg_confidence * 100).toFixed(1)}%</span>
        <span>~{stats.estimated_remaining_mins.toFixed(0)} mins remaining</span>
      </div>
    </div>
  );
}
