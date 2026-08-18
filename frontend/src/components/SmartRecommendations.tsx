import { useState } from "react";
import { fetchRecommendations } from "../utils/api";
import type { SmartRecommendation } from "../utils/types";

export function SmartRecommendations() {
  const [goal, setGoal] = useState("");
  const [data, setData] = useState<SmartRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRecommendations(goal.trim());
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="card-flat">
        <h2 className="font-display text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Smart Recommendations
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)", fontFamily: "Lora", fontStyle: "italic" }}>
          Describe your integration goal and get AI-powered app recommendations
        </p>
        <div className="flex gap-3">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="e.g. Build a sales CRM integrator, Connect support platforms, Sync data across tools"
            className="input-premium flex-1"
          />
          <button onClick={handleSearch} disabled={loading || !goal.trim()} className="btn-primary disabled:opacity-50">
            {loading ? "Analyzing..." : "Get Recommendations"}
          </button>
        </div>
      </div>

      {error && (
        <div className="card-flat border-l-4" style={{ borderColor: "var(--text-error)" }}>
          <p className="text-sm" style={{ color: "var(--text-error)" }}>{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Goal Analysis */}
          <div className="card-flat">
            <h3 className="font-display text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Goal Analysis</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{data.goal_analysis}</p>
          </div>

          {/* Recommendations */}
          <div className="space-y-3 stagger-children">
            {data.recommendations.map((rec) => (
              <div key={rec.rank} className="card-premium flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-white" style={{ background: "var(--gradient-primary)" }}>
                  {rec.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-semibold" style={{ color: "var(--text-primary)" }}>{rec.app_name}</span>
                    <span className="badge badge-blue">{rec.integration_effort_hours}h est.</span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{rec.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
