/**
 * StudiesHub.jsx — Grid display of 8 protection analysis tools
 *
 * Shows all 8 tools organized by category in a 4-column responsive grid.
 * Available tools are clickable; coming-soon tools show Sprint number.
 */

import { useMemo } from "react";
import { toolsByCategory } from "../catalog.js";

export default function StudiesHub({ onSelectTool }) {
  const categoryMap = useMemo(() => toolsByCategory(), []);
  const categories = Object.keys(categoryMap).sort();

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Hub de Ferramentas</div>
          <div style={styles.subtitle}>
            Análise de Proteção Elétrica — 8 ferramentas
          </div>
        </div>
      </div>

      {/* Grid by category */}
      <div style={styles.content}>
        {categories.map((category) => (
          <div key={category} style={styles.section}>
            <div style={styles.categoryTitle}>{category}</div>
            <div style={styles.grid}>
              {categoryMap[category].map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onSelect={() => onSelectTool?.(tool)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolCard({ tool, onSelect }) {
  return (
    <div
      style={{
        ...styles.card,
        ...(tool.available
          ? { cursor: "pointer", transition: "all .2s" }
          : { opacity: 0.6, cursor: "default" }),
      }}
      onClick={() => tool.available && onSelect()}
      onMouseEnter={(e) => {
        if (tool.available) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.2)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
      }}
    >
      {/* Icon placeholder */}
      <div style={styles.iconBox}>
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="rgba(14,165,233,0.08)"
            stroke="#0ea5e9"
            strokeWidth="1"
          />
          <path
            d="M16 10 L18 14 L22 14 L19 17 L20 21 L16 18 L12 21 L13 17 L10 14 L14 14 Z"
            fill="#0ea5e9"
          />
        </svg>
      </div>

      {/* Card content */}
      <div style={styles.cardContent}>
        <div style={styles.toolName}>{tool.name}</div>
        <div style={styles.toolDesc}>{tool.description}</div>

        {/* Complexity indicator */}
        <div style={styles.complexity}>
          {"★".repeat(tool.complexity)}
          {"☆".repeat(3 - tool.complexity)}
        </div>

        {/* Status badge */}
        {tool.available ? (
          <div style={styles.badgeAvailable}>Disponível</div>
        ) : (
          <div style={styles.badgeComingSoon}>Sprint {tool.sprint}</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "var(--bg)",
    overflow: "hidden",
  },
  header: {
    padding: "20px 24px",
    borderBottom: "1px solid var(--bdr)",
    flexShrink: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
    fontFamily: "var(--fh)",
    color: "var(--tx)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 12,
    color: "var(--tx3)",
    fontWeight: 500,
    marginTop: 4,
    fontFamily: "var(--fm)",
  },
  content: {
    flex: 1,
    overflow: "auto",
    padding: "20px 24px",
  },
  section: {
    marginBottom: 32,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--tx3)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
    paddingLeft: 4,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  },
  card: {
    padding: 16,
    background: "var(--card)",
    border: "1px solid var(--bdr)",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  iconBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
  },
  cardContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  toolName: {
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "var(--fm)",
    color: "var(--tx)",
  },
  toolDesc: {
    fontSize: 11,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
    lineHeight: 1.5,
    flex: 1,
  },
  complexity: {
    fontSize: 12,
    color: "var(--cyan)",
    fontWeight: 700,
    fontFamily: "var(--fm)",
  },
  badgeAvailable: {
    padding: "4px 8px",
    borderRadius: 4,
    background: "rgba(34,197,94,0.12)",
    color: "#22c55e",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    textAlign: "center",
    border: "1px solid rgba(34,197,94,0.25)",
  },
  badgeComingSoon: {
    padding: "4px 8px",
    borderRadius: 4,
    background: "rgba(107,114,128,0.12)",
    color: "var(--tx3)",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    textAlign: "center",
    border: "1px solid rgba(107,114,128,0.25)",
  },
};
