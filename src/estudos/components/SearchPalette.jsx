/**
 * SearchPalette.jsx — ⌘K search overlay for finding tools
 *
 * Features:
 * - Overlay triggered by ⌘K (Cmd+K on Mac, Ctrl+K on Windows)
 * - Fuzzy search on tool names and descriptions
 * - Recent tools section
 * - Keyboard navigation (Arrow up/down, Enter to select, Esc to close)
 */

import { useState, useEffect, useRef } from "react";
import { TOOLS } from "../catalog.js";

function statusLabel(status) {
  if (status === "beta") return "Beta";
  if (status === "planned") return "Planejado";
  return "Disponível";
}

export default function SearchPalette({ onSelectTool, favorites = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recent, setRecent] = useState([]);
  const inputRef = useRef(null);

  // Load recent tools from localStorage
  useEffect(() => {
    try {
      const json = localStorage.getItem("estudos.recent.v1");
      if (json) setRecent(JSON.parse(json));
    } catch {
      // ignore
    }
  }, []);

  // Register ⌘K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setQuery("");
        setSelectedIdx(0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((idx) => (idx + 1) % filtered.length);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((idx) => (idx - 1 + filtered.length) % filtered.length);
    }
    if (e.key === "Enter" && filtered.length > 0) {
      selectTool(filtered[selectedIdx]);
    }
  };

  const selectTool = (tool) => {
    onSelectTool?.(tool);
    // Save to recent
    const item = {
      id: tool.id,
      name: tool.name,
      timestamp: new Date().toISOString(),
      category: tool.category,
    };
    const updated = [
      item,
      ...recent.filter((r) => r.id !== tool.id),
    ].slice(0, 20);
    setRecent(updated);
    localStorage.setItem("estudos.recent.v1", JSON.stringify(updated));
    setIsOpen(false);
  };

  // Fuzzy search filter with favorites + recents ranking
  const recentIds = recent.map((r) => r.id);
  const filtered =
    query.length === 0 ? [] : filterTools(TOOLS, query, { favorites, recentIds });

  return (
    <>
      {/* Overlay backdrop */}
      {isOpen && (
        <div
          style={styles.backdrop}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Search palette */}
      {isOpen && (
        <div style={styles.root}>
          {/* Search input */}
          <div style={styles.searchBox}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar ferramentas..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIdx(0);
              }}
              onKeyDown={handleKeyDown}
              style={styles.input}
              autoFocus
            />
            <div style={styles.hint}>⌘K</div>
          </div>

          {/* Results */}
          <div style={styles.results}>
            {query.length === 0 ? (
              <>
                {favorites.length > 0 && (
                  <>
                    <div style={styles.section}>
                      <div style={styles.sectionTitle}>Favoritos</div>
                      {favorites
                        .map((id) => TOOLS.find((t) => t.id === id))
                        .filter(Boolean)
                        .slice(0, 5)
                        .map((tool) => (
                          <div
                            key={`fav-${tool.id}`}
                            style={styles.resultItem}
                            onClick={() => selectTool(tool)}
                          >
                            <div style={styles.resultName}>
                              <span style={styles.favStar}>★</span> {tool.name}
                            </div>
                            <div style={styles.resultCategory}>{tool.category}</div>
                          </div>
                        ))}
                    </div>
                    <div style={styles.divider} />
                  </>
                )}
                {recent.length > 0 && (
                  <>
                    <div style={styles.section}>
                      <div style={styles.sectionTitle}>Recentes</div>
                      {recent.slice(0, 5).map((item, idx) => {
                        const tool = TOOLS.find((t) => t.id === item.id);
                        if (!tool) return null;
                        return (
                          <div
                            key={item.id}
                            style={styles.resultItem}
                            onClick={() => selectTool(tool)}
                          >
                            <div style={styles.resultName}>{tool.name}</div>
                            <div style={styles.resultCategory}>
                              {tool.category}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={styles.divider} />
                  </>
                )}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>Todas as Ferramentas</div>
                  {TOOLS.map((tool) => (
                    <div
                      key={tool.id}
                      style={{
                        ...styles.resultItem,
                        opacity: tool.available ? 1 : 0.5,
                      }}
                      onClick={() => tool.available && selectTool(tool)}
                    >
                      <div style={styles.resultName}>
                        {tool.name}
                        {!tool.available && (
                          <span style={styles.badge}> ({statusLabel(tool.status)})</span>
                        )}
                      </div>
                      <div style={styles.resultCategory}>
                        {tool.category}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : filtered.length === 0 ? (
              <div style={styles.empty}>Nenhuma ferramenta encontrada</div>
            ) : (
              <div style={styles.section}>
                {filtered.map((tool, idx) => (
                  <div
                    key={tool.id}
                    style={{
                      ...styles.resultItem,
                      ...(idx === selectedIdx ? styles.resultItemSelected : {}),
                    }}
                    onClick={() => selectTool(tool)}
                  >
                    <div style={styles.resultName}>{tool.name}</div>
                    <div style={styles.resultDesc}>{tool.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div style={styles.footer}>
            <div style={styles.hint}>↑↓ Navegar · Enter Selecionar · Esc Fechar</div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Fuzzy filter tools by query string with ANSI / keyword / domain matching.
 *
 * Match dimensions (any hit qualifies):
 *  - tool.name        (weight 5 for exact, 4 prefix, 3 contains)
 *  - tool.ansi[]      (weight 6 — explicit ANSI lookup like "21", "51N")
 *  - tool.keywords[]  (weight 3)
 *  - tool.domain[]    (weight 2)
 *  - tool.description (weight 1)
 *
 * Ranking bonus:
 *  + 2 if favorited
 *  + 1 if recently used
 *
 * @param {Array} tools
 * @param {string} query
 * @param {Object} [opts]
 * @param {Array<string>} [opts.favorites]
 * @param {Array<string>} [opts.recentIds]
 * @returns {Array} Filtered tools, sorted by relevance
 */
function filterTools(tools, query, opts = {}) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return [];
  const favorites = opts.favorites || [];
  const recentIds = opts.recentIds || [];

  const scored = tools
    .map((tool) => {
      const name = tool.name.toLowerCase();
      const desc = (tool.description || "").toLowerCase();
      const ansi = (tool.ansi || []).map((a) => a.toLowerCase());
      const keywords = (tool.keywords || []).map((k) => k.toLowerCase());
      const domain = (tool.domain || []).map((d) => d.toLowerCase());

      let score = 0;

      // Name scoring
      if (name === q) score += 5;
      else if (name.startsWith(q)) score += 4;
      else if (name.includes(q)) score += 3;

      // ANSI: support exact match (best) or contains
      if (ansi.includes(q)) score += 6;
      else if (ansi.some((a) => a.includes(q))) score += 4;

      // Keywords
      if (keywords.some((k) => k === q)) score += 4;
      else if (keywords.some((k) => k.includes(q))) score += 3;

      // Domain tags
      if (domain.some((d) => d.includes(q))) score += 2;

      // Description fallback
      if (desc.includes(q)) score += 1;

      // Ranking bonuses
      if (favorites.includes(tool.id)) score += 2;
      if (recentIds.includes(tool.id)) score += 1;

      return { tool, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ tool }) => tool);

  return scored;
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 9998,
  },
  root: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "90%",
    maxWidth: 600,
    maxHeight: "80vh",
    background: "var(--card)",
    borderRadius: 12,
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
    display: "flex",
    flexDirection: "column",
    zIndex: 9999,
    overflow: "hidden",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid var(--bdr)",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: "none",
    background: "transparent",
    color: "var(--tx)",
    fontSize: 14,
    fontFamily: "var(--fm)",
    outline: "none",
  },
  hint: {
    fontSize: 10,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
    marginLeft: 8,
  },
  results: {
    flex: 1,
    overflow: "auto",
    padding: "8px 0",
  },
  section: {
    paddingBottom: 8,
  },
  sectionTitle: {
    padding: "8px 16px",
    fontSize: 10,
    fontWeight: 700,
    color: "var(--tx3)",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "var(--fh)",
  },
  resultItem: {
    padding: "10px 16px",
    cursor: "pointer",
    transition: "background .1s",
  },
  resultItemSelected: {
    background: "var(--card2)",
  },
  resultName: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
  },
  resultDesc: {
    fontSize: 11,
    color: "var(--tx3)",
    marginTop: 2,
    fontFamily: "var(--fm)",
    lineHeight: 1.4,
  },
  resultCategory: {
    fontSize: 10,
    color: "var(--tx3)",
    marginTop: 2,
    fontFamily: "var(--fm)",
  },
  badge: {
    fontSize: 9,
    color: "var(--cyan)",
    fontWeight: 700,
  },
  favStar: {
    color: "#eab308",
    marginRight: 4,
  },
  divider: {
    height: 1,
    background: "var(--bdr)",
    margin: "8px 0",
  },
  empty: {
    padding: "20px 16px",
    textAlign: "center",
    color: "var(--tx3)",
    fontSize: 12,
    fontFamily: "var(--fm)",
  },
  footer: {
    padding: "8px 16px",
    borderTop: "1px solid var(--bdr)",
    fontSize: 10,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
    flexShrink: 0,
  },
};
