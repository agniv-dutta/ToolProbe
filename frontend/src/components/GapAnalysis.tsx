import { useState, useEffect } from "react";
import { fetchGaps } from "../utils/api";
import type { GapAnalysis as GapData } from "../utils/types";

export function GapAnalysis() {
  const [data, setData] = useState<GapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGaps()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card-flat flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-current border-t-transparent" style={{ color: "var(--text-accent)" }} />
        <span className="ml-4 text-sm" style={{ color: "var(--text-tertiary)", fontFamily: "Lora", fontStyle: "italic" }}>
          Analyzing gaps...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-flat border-l-4" style={{ borderColor: "var(--text-error)" }}>
        <p className="text-sm" style={{ color: "var(--text-error)" }}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="card-flat">
        <h2 className="font-display text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Gap Analysis
        </h2>
        <p className="text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "Lora", fontStyle: "italic" }}>
          Underserved categories and missing opportunities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger-children">
        {/* Underserved Categories */}
        <div className="card-premium">
          <h3 className="font-display text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Underserved Categories
          </h3>
          {data.underserved_categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.underserved_categories.map((cat) => (
                <span key={cat} className="badge badge-yellow">{cat}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No underserved categories found</p>
          )}
        </div>

        {/* Missing Popular Apps */}
        <div className="card-premium">
          <h3 className="font-display text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Missing Popular Apps
          </h3>
          {data.missing_popular_apps.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.missing_popular_apps.map((app) => (
                <span key={app} className="badge badge-red">{app}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No missing apps identified</p>
          )}
        </div>

        {/* Emerging Niches */}
        <div className="card-premium">
          <h3 className="font-display text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Emerging Niches
          </h3>
          {data.emerging_niches.length > 0 ? (
            <ul className="space-y-2">
              {data.emerging_niches.map((niche, i) => (
                <li key={i} className="text-sm flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--text-accent)" }}>&#9670;</span>
                  {niche}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No emerging niches identified</p>
          )}
        </div>

        {/* Priority Adds */}
        <div className="card-premium">
          <h3 className="font-display text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Priority Adds
          </h3>
          {data.priority_adds.length > 0 ? (
            <div className="space-y-2">
              {data.priority_adds.map((app, i) => (
                <div key={app} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--bg-tertiary)" }}>
                  <span className="font-display font-bold text-sm" style={{ color: "var(--text-accent)" }}>#{i + 1}</span>
                  <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{app}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No priority adds identified</p>
          )}
        </div>
      </div>
    </div>
  );
}
