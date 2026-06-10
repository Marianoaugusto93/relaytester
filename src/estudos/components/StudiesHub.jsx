/**
 * StudiesHub.jsx — Grid display of protection analysis tools (v2)
 *
 * Filters:
 *  - workflow (array of workflow phase ids — match if tool.workflow intersects)
 *  - ansi (array of ANSI codes — match if tool.ansi intersects)
 * Both default to empty arrays (show everything).
 *
 * Favorites:
 *  - `favorites` is an array of tool ids (persisted by EstudosPage)
 *  - each card has a ★ toggle that calls onToggleFavorite(id)
 *
 * Status:
 *  - Sprint badge replaced by <StatusBadge status={tool.status} />
 */

import { useMemo, useState } from "react";
import { toolsByCategory } from "../catalog.js";
import { loadAnalytics, clearStoredAnalytics } from "../utils/analyticsStorage.js";
import AnalyticsDashboard from "./AnalyticsDashboard.jsx";
import StatusBadge from "./StatusBadge.jsx";

export default function StudiesHub({
  onSelectTool,
  favorites = [],
  onToggleFavorite,
  workflow = [],
  ansiFilters = [],
}) {
  const categoryMap = useMemo(() => toolsByCategory(), []);
  const categories = Object.keys(categoryMap).sort();
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState(() => loadAnalytics());

  const handleClearAnalytics = () => {
    clearStoredAnalytics();
    setAnalytics(loadAnalytics());
  };

  // Apply workflow + ANSI filters to each category list
  const filterTools = (tools) => {
    return tools.filter((tool) => {
      const wfOk =
        workflow.length === 0 ||
        workflow.some((w) => (tool.workflow || []).includes(w));
      const ansiOk =
        ansiFilters.length === 0 ||
        ansiFilters.some((a) => (tool.ansi || []).includes(a));
      return wfOk && ansiOk;
    });
  };

  const filtersActive = workflow.length > 0 || ansiFilters.length > 0;
  const visibleCategories = categories
    .map((cat) => ({ cat, tools: filterTools(categoryMap[cat]) }))
    .filter(({ tools }) => tools.length > 0);

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Hub de Ferramentas</div>
          <div style={styles.subtitle}>
            Análise de Proteção Elétrica
            {filtersActive && (
              <span style={styles.filterHint}>
                {" "}
                · {workflow.length + ansiFilters.length} filtro
                {workflow.length + ansiFilters.length > 1 ? "s" : ""} ativo
                {workflow.length + ansiFilters.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <button
          style={styles.analyticsBtn}
          onClick={() => setShowAnalytics(true)}
          title="Ver Analytics de Uso"
        >
          📊 Analytics
        </button>
      </div>

      {/* Grid by category */}
      <div style={styles.content}>
        {visibleCategories.length === 0 ? (
          <div style={styles.empty}>
            Nenhuma ferramenta corresponde aos filtros selecionados.
          </div>
        ) : (
          visibleCategories.map(({ cat, tools }) => (
            <div key={cat} style={styles.section}>
              <div style={styles.categoryTitle}>{cat}</div>
              <div style={styles.grid}>
                {tools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    onSelect={() => onSelectTool?.(tool)}
                    isFavorite={favorites.includes(tool.id)}
                    onToggleFavorite={() => onToggleFavorite?.(tool.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Analytics Modal */}
      {showAnalytics && (
        <div style={styles.modalOverlay} onClick={() => setShowAnalytics(false)}>
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-title"
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowAnalytics(false);
            }}
          >
            <div style={styles.modalHeader}>
              <h2 id="analytics-title" style={styles.modalTitle}>
                Analytics de Uso
              </h2>
              <button
                style={styles.modalClose}
                onClick={() => setShowAnalytics(false)}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              <AnalyticsDashboard
                analytics={analytics}
                onClear={handleClearAnalytics}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolCard({ tool, onSelect, isFavorite, onToggleFavorite }) {
  const handleKeyDown = (e) => {
    if (tool.available && (e.key === "Enter" || e.key === " ")) {
      onSelect();
      e.preventDefault();
    }
  };
  return (
    <div
      style={{
        ...styles.card,
        ...(tool.available
          ? { cursor: "pointer", transition: "all .2s" }
          : { opacity: 0.6, cursor: "default" }),
      }}
      onClick={() => tool.available && onSelect()}
      onKeyDown={handleKeyDown}
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
      role="button"
      tabIndex={tool.available ? 0 : -1}
      aria-disabled={!tool.available}
      aria-label={tool.name}
    >
      {/* Favorite toggle (top-right) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite?.();
        }}
        style={{
          ...styles.favBtn,
          color: isFavorite ? "#eab308" : "var(--tx3)",
        }}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        {isFavorite ? "★" : "☆"}
      </button>

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

        {/* ANSI inline chips */}
        {(tool.ansi || []).length > 0 && (
          <div style={styles.ansiRow}>
            {tool.ansi.slice(0, 4).map((code) => (
              <span key={code} style={styles.ansiChip}>
                {code}
              </span>
            ))}
          </div>
        )}

        {/* Complexity indicator */}
        <div style={styles.complexity}>
          {"★".repeat(tool.complexity)}
          {"☆".repeat(3 - tool.complexity)}
        </div>

        {/* Status badge */}
        <StatusBadge status={tool.status || (tool.available ? "stable" : "planned")} />
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px 24px",
    borderBottom: "1px solid var(--bdr)",
    flexShrink: 0,
    gap: 16,
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
  filterHint: {
    color: "var(--cyan)",
    fontWeight: 700,
  },
  analyticsBtn: {
    padding: "8px 14px",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    background: "var(--card2)",
    color: "var(--tx2)",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all .15s",
  },
  content: {
    flex: 1,
    overflow: "auto",
    padding: "20px 24px",
  },
  empty: {
    padding: 40,
    textAlign: "center",
    color: "var(--tx3)",
    fontSize: 13,
    fontFamily: "var(--fm)",
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
    position: "relative",
    padding: 16,
    background: "var(--card)",
    border: "1px solid var(--bdr)",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  favBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
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
  ansiRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
  },
  ansiChip: {
    padding: "2px 6px",
    borderRadius: 4,
    background: "var(--card2)",
    border: "1px solid var(--bdr)",
    color: "var(--tx2)",
    fontSize: 9,
    fontWeight: 700,
    fontFamily: "var(--fm)",
  },
  complexity: {
    fontSize: 12,
    color: "var(--cyan)",
    fontWeight: 700,
    fontFamily: "var(--fm)",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  modalContent: {
    background: "var(--bg)",
    border: "1px solid var(--bdr)",
    borderRadius: 12,
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
    maxWidth: 900,
    width: "90vw",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid var(--bdr)",
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 800,
    fontFamily: "var(--fh)",
    color: "var(--tx)",
    margin: 0,
  },
  modalClose: {
    background: "transparent",
    border: "none",
    color: "var(--tx3)",
    fontSize: 24,
    cursor: "pointer",
    padding: 0,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    flex: 1,
    overflow: "auto",
  },
};
