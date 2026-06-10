/**
 * LeftRail.jsx — Workbench-lite Left Rail (280px)
 *
 * Sections (top → bottom):
 *  - Search input (filters the visible tool lists locally)
 *  - Favoritos (★) — pulls from `favorites` prop
 *  - Recentes — pulls from localStorage estudos.recent.v1
 *  - Por Fluxo — hardcoded workflow phase order (Sistema → ... → Cenários)
 *  - Por Função ANSI — clickable tag cloud (filters Hub via parent state)
 *
 * Parent (EstudosPage) handles persistence of favorites and filter state.
 */

import { useEffect, useMemo, useState } from "react";
import { TOOLS, WORKFLOW_ORDER, ANSI_CODES, toolsForWorkflow } from "../catalog.js";

export default function LeftRail({
  onSelectTool,
  favorites = [],
  onToggleFavorite,
  workflowFilter = [],
  onToggleWorkflow,
  ansiFilter = [],
  onToggleAnsi,
}) {
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState([]);

  // Load recents from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("estudos.recent.v1");
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // Resolve favorite tool objects (ignore stale ids)
  const favoriteTools = useMemo(
    () => favorites.map((id) => TOOLS.find((t) => t.id === id)).filter(Boolean),
    [favorites]
  );

  const recentTools = useMemo(
    () => recent.map((r) => TOOLS.find((t) => t.id === r.id)).filter(Boolean).slice(0, 5),
    [recent]
  );

  // Local search filter (matches name, description, keywords, ansi)
  const matchesSearch = (tool) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    if (tool.name.toLowerCase().includes(q)) return true;
    if (tool.description.toLowerCase().includes(q)) return true;
    if ((tool.keywords || []).some((k) => k.toLowerCase().includes(q))) return true;
    if ((tool.ansi || []).some((a) => a.toLowerCase().includes(q))) return true;
    return false;
  };

  return (
    <aside style={styles.root} aria-label="Navegação de ferramentas">
      {/* Search */}
      <div style={styles.searchBox}>
        <input
          type="search"
          placeholder="Buscar (nome, ANSI, palavra-chave)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
          aria-label="Buscar ferramentas"
        />
      </div>

      <div style={styles.scrollArea}>
        {/* Favoritos */}
        {favoriteTools.length > 0 && (
          <Section title="Favoritos">
            {favoriteTools.filter(matchesSearch).map((tool) => (
              <RailItem
                key={tool.id}
                tool={tool}
                onSelect={() => onSelectTool?.(tool)}
                isFavorite
                onToggleFavorite={() => onToggleFavorite?.(tool.id)}
              />
            ))}
          </Section>
        )}

        {/* Recentes */}
        {recentTools.length > 0 && (
          <Section title="Recentes">
            {recentTools.filter(matchesSearch).map((tool) => (
              <RailItem
                key={tool.id}
                tool={tool}
                onSelect={() => onSelectTool?.(tool)}
                isFavorite={favorites.includes(tool.id)}
                onToggleFavorite={() => onToggleFavorite?.(tool.id)}
              />
            ))}
          </Section>
        )}

        {/* Por Fluxo */}
        <Section title="Por Fluxo">
          {WORKFLOW_ORDER.map((wf) => {
            const tools = toolsForWorkflow(wf.id).filter(matchesSearch);
            if (tools.length === 0) return null;
            const isActive = workflowFilter.includes(wf.id);
            return (
              <div key={wf.id} style={styles.workflowBlock}>
                <button
                  type="button"
                  style={{
                    ...styles.workflowHeader,
                    ...(isActive ? styles.workflowHeaderActive : {}),
                  }}
                  onClick={() => onToggleWorkflow?.(wf.id)}
                  aria-pressed={isActive}
                  title={`Filtrar por ${wf.label}`}
                >
                  <span>{wf.label}</span>
                  <span style={styles.workflowCount}>{tools.length}</span>
                </button>
                <div style={styles.workflowChildren}>
                  {tools.map((tool) => (
                    <RailItem
                      key={tool.id}
                      tool={tool}
                      onSelect={() => onSelectTool?.(tool)}
                      isFavorite={favorites.includes(tool.id)}
                      onToggleFavorite={() => onToggleFavorite?.(tool.id)}
                      compact
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </Section>

        {/* Por Função ANSI */}
        <Section title="Por Função ANSI">
          <div style={styles.ansiCloud}>
            {ANSI_CODES.map((code) => {
              const active = ansiFilter.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => onToggleAnsi?.(code)}
                  style={{
                    ...styles.ansiChip,
                    ...(active ? styles.ansiChipActive : {}),
                  }}
                  aria-pressed={active}
                  title={`Filtrar por ANSI ${code}`}
                >
                  {code}
                </button>
              );
            })}
          </div>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      <div style={styles.sectionBody}>{children}</div>
    </div>
  );
}

function RailItem({ tool, onSelect, isFavorite, onToggleFavorite, compact = false }) {
  return (
    <div
      style={{
        ...styles.item,
        ...(compact ? styles.itemCompact : {}),
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        style={styles.itemBtn}
        title={tool.description}
      >
        <div style={styles.itemName}>{tool.name}</div>
        {!compact && (
          <div style={styles.itemMeta}>
            {(tool.ansi || []).slice(0, 3).join(" · ")}
          </div>
        )}
      </button>
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
        aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        aria-pressed={isFavorite}
      >
        {isFavorite ? "★" : "☆"}
      </button>
    </div>
  );
}

const styles = {
  root: {
    width: 280,
    minWidth: 280,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    background: "var(--card)",
    borderRight: "1px solid var(--bdr)",
    overflow: "hidden",
    height: "100%",
  },
  searchBox: {
    padding: "10px 12px",
    borderBottom: "1px solid var(--bdr)",
    flexShrink: 0,
    background: "var(--card2)",
  },
  searchInput: {
    width: "100%",
    padding: "7px 10px",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    background: "var(--card)",
    color: "var(--tx)",
    fontSize: 12,
    fontFamily: "var(--fm)",
    boxSizing: "border-box",
    outline: "none",
  },
  scrollArea: {
    flex: 1,
    overflow: "auto",
    padding: "8px 0",
  },
  section: {
    padding: "8px 12px 12px 12px",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--tx3)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  sectionBody: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 4px",
    borderRadius: 6,
  },
  itemCompact: {
    paddingLeft: 8,
  },
  itemBtn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
    padding: "5px 8px",
    border: "1px solid transparent",
    borderRadius: 6,
    background: "transparent",
    color: "var(--tx)",
    cursor: "pointer",
    textAlign: "left",
    transition: "background .12s, border-color .12s",
  },
  itemName: {
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "var(--fm)",
    color: "var(--tx)",
    lineHeight: 1.3,
  },
  itemMeta: {
    fontSize: 10,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
  },
  favBtn: {
    width: 24,
    height: 24,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 14,
    lineHeight: 1,
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  workflowBlock: {
    marginBottom: 6,
  },
  workflowHeader: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 8px",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    background: "var(--card2)",
    color: "var(--tx2)",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    cursor: "pointer",
    transition: "all .12s",
  },
  workflowHeaderActive: {
    background: "var(--cyan-dim)",
    color: "var(--cyan)",
    borderColor: "rgba(14,165,233,0.4)",
  },
  workflowCount: {
    fontSize: 10,
    fontWeight: 600,
    opacity: 0.7,
  },
  workflowChildren: {
    paddingTop: 2,
  },
  ansiCloud: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
  },
  ansiChip: {
    padding: "3px 8px",
    border: "1px solid var(--bdr)",
    borderRadius: 12,
    background: "var(--card2)",
    color: "var(--tx2)",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--fm)",
    cursor: "pointer",
    transition: "all .12s",
  },
  ansiChipActive: {
    background: "var(--cyan-dim)",
    color: "var(--cyan)",
    borderColor: "rgba(14,165,233,0.4)",
  },
};
