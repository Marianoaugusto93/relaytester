/**
 * RecommendedTools.jsx — Analytics-driven tool recommendations (Track 3 / Feature 5)
 *
 * Reads analytics.actions (per-tool open counts via key "tool.open.<id>")
 * and surfaces up to 3 recommendations in the Left Rail.
 *
 * Strategy:
 *  1. Compute usage counts from analytics.actions where key starts with "tool.open."
 *  2. Suggest top 3 tools the user has NEVER opened
 *  3. If user has opened all, fall back to top 3 most-used globally
 *
 * Props:
 *  @param {Function} onSelectTool - (tool) => void, mirrors Left Rail handler
 */

import { useEffect, useMemo, useState } from "react";
import { TOOLS } from "../catalog.js";
import { loadAnalytics } from "../utils/analyticsStorage.js";

const ACTION_PREFIX = "tool.open.";

function parseUsage(actions = {}) {
  const usage = {};
  Object.entries(actions).forEach(([key, count]) => {
    if (key.startsWith(ACTION_PREFIX)) {
      const id = key.slice(ACTION_PREFIX.length);
      usage[id] = count;
    }
  });
  return usage;
}

function pickRecommendations(usage) {
  // Discover unseen tools (catalog ids not in usage map)
  const opened = new Set(Object.keys(usage));
  const unseen = TOOLS.filter((t) => t.available && !opened.has(t.id));

  if (unseen.length > 0) {
    // Rank unseen by global popularity (most-used among others), fall back to catalog order
    const ranked = [...unseen].sort((a, b) => {
      const ua = usage[a.id] || 0;
      const ub = usage[b.id] || 0;
      return ub - ua;
    });
    return ranked.slice(0, 3).map((t) => ({ tool: t, score: usage[t.id] || 0, reason: "novo" }));
  }
  // Fallback: top 3 most-used overall
  const sortedIds = Object.entries(usage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
  return sortedIds
    .map((id) => TOOLS.find((t) => t.id === id))
    .filter(Boolean)
    .map((tool) => ({ tool, score: usage[tool.id] || 0, reason: "popular" }));
}

function starRating(score) {
  if (score >= 5) return "★★★";
  if (score >= 2) return "★★";
  return "★";
}

export default function RecommendedTools({ onSelectTool }) {
  const [analytics, setAnalytics] = useState(() => loadAnalytics());

  // Re-read analytics every time the rail mounts; a "storage" event update keeps
  // the widget fresh without polling.
  useEffect(() => {
    const refresh = () => setAnalytics(loadAnalytics());
    window.addEventListener("storage", refresh);
    window.addEventListener("estudos.analytics.updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("estudos.analytics.updated", refresh);
    };
  }, []);

  const recommendations = useMemo(() => {
    const usage = parseUsage(analytics.actions || {});
    return pickRecommendations(usage);
  }, [analytics]);

  if (recommendations.length === 0) return null;

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Recomendado para você</div>
      <div style={styles.list}>
        {recommendations.map(({ tool, score, reason }) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSelectTool?.(tool)}
            style={styles.item}
            title={tool.description}
          >
            <div style={styles.itemHead}>
              <span style={styles.itemName}>{tool.name}</span>
              <span style={styles.stars}>{starRating(score)}</span>
            </div>
            <div style={styles.itemMeta}>
              {reason === "novo" ? "novo para você" : "muito usado"}
              {(tool.ansi || []).length > 0 && (
                <> · {(tool.ansi || []).slice(0, 3).join(" · ")}</>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  section: {
    padding: "8px 12px 12px 12px",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--cyan)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  item: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "6px 8px",
    border: "1px solid rgba(14,165,233,0.25)",
    borderRadius: 6,
    background: "rgba(14,165,233,0.06)",
    color: "var(--tx)",
    cursor: "pointer",
    textAlign: "left",
    transition: "all .12s",
  },
  itemHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  itemName: {
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "var(--fm)",
    color: "var(--tx)",
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  stars: {
    fontSize: 10,
    color: "#eab308",
    flexShrink: 0,
  },
  itemMeta: {
    fontSize: 10,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
  },
};
