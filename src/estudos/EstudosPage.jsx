/**
 * EstudosPage — Workbench-lite shell (v3, Track 3 / UX Polish)
 *
 * Layout (3-pane):
 *   [LeftRail 280px] [Canvas flex] [RightDrawer 280px collapsible]
 *
 * Track 3 features:
 *  - Canvas tabs: up to 3 open tools simultaneously (openTools / activeToolId)
 *  - Deep-link: URL params ?tools=a,b&focus=a restore open tabs on mount
 *  - Tool analytics: tool.open.<id> counters drive RecommendedTools
 *  - Artifacts panel + Notes panel (handled inside BayContextPanel)
 *
 * Owns:
 *  - openTools array (canvas tabs)
 *  - activeToolId (focused tab)
 *  - favorites (localStorage estudos.favorites.v1)
 *  - workflow & ansi filters
 *  - rightDrawerOpen
 *
 * Renders each open tool's component lazily but keeps inactive ones mounted
 * (display:none) so scroll/form state is preserved between tab switches.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { runParityTests } from "./engine/faults.js";
import StudiesHub from "./components/StudiesHub.jsx";
import SearchPalette from "./components/SearchPalette.jsx";
import BayContextPanel from "./components/BayContextPanel.jsx";
import LeftRail from "./components/LeftRail.jsx";
import LoadingPlaceholder from "./components/LoadingPlaceholder.jsx";
import AnimatedDrawer from "./components/AnimatedDrawer.jsx";
import TabBar from "./components/TabBar.jsx";
import { TOOL_REGISTRY } from "./toolRegistry.js";
import { getTool } from "./catalog.js";
import { loadAnalytics, saveAnalytics } from "./utils/analyticsStorage.js";
import { recordAction } from "./utils/analyticsEngine.js";

const FAVORITES_KEY = "estudos.favorites.v1";
const OPEN_TOOLS_KEY = "estudos.openTools.v1";
const MAX_OPEN_TOOLS = 3;

function readOpenToolsFromStorage() {
  try {
    const raw = localStorage.getItem(OPEN_TOOLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t && typeof t.id === "string" && TOOL_REGISTRY[t.id])
      .map((t) => ({ id: t.id, name: t.name || getTool(t.id)?.name || t.id }));
  } catch {
    return [];
  }
}

function readUrlParams() {
  if (typeof window === "undefined") return { tools: [], focus: null };
  const params = new URLSearchParams(window.location.search);
  const toolsParam = params.get("tools");
  const focus = params.get("focus");
  const tools = toolsParam
    ? toolsParam
        .split(",")
        .map((s) => s.trim())
        .filter((id) => id && TOOL_REGISTRY[id])
    : [];
  return { tools, focus };
}

function writeUrlParams(openTools, activeToolId) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (openTools.length === 0) {
    params.delete("tools");
    params.delete("focus");
  } else {
    params.set("tools", openTools.map((t) => t.id).join(","));
    if (activeToolId) params.set("focus", activeToolId);
    else params.delete("focus");
  }
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

function recordToolOpen(toolId) {
  try {
    const a = loadAnalytics();
    const updated = recordAction(a, `tool.open.${toolId}`);
    saveAnalytics(updated);
    window.dispatchEvent(new Event("estudos.analytics.updated"));
  } catch {
    /* ignore */
  }
}

/**
 * EstudosPage — main entrypoint for the Estudos tab.
 * @param {Object} props
 * @param {string} props.mainTab - Active main tab id
 * @param {string} [props.subTab] - External sub-tab id (controlled)
 * @param {Function} [props.setSubTab] - External sub-tab setter
 */
export default function EstudosPage({ mainTab, subTab: subTabProp, setSubTab: setSubTabProp }) {
  const [localSubTab, setLocalSubTab] = useState("hub");
  const [parityStatus, setParityStatus] = useState(null);

  // Canvas tabs state: open tools array + active id
  const [openTools, setOpenTools] = useState(() => {
    // Priority: URL params > localStorage
    const { tools: urlTools } = readUrlParams();
    if (urlTools.length > 0) {
      return urlTools.map((id) => ({ id, name: getTool(id)?.name || id }));
    }
    return readOpenToolsFromStorage();
  });

  const [activeToolId, setActiveToolId] = useState(() => {
    const { tools, focus } = readUrlParams();
    if (focus && tools.includes(focus)) return focus;
    if (tools.length > 0) return tools[0];
    const stored = readOpenToolsFromStorage();
    return stored.length > 0 ? stored[0].id : null;
  });

  const [toast, setToast] = useState(null); // { text, ts }

  // Favorites (persisted)
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Filters
  const [workflowFilter, setWorkflowFilter] = useState([]);
  const [ansiFilter, setAnsiFilter] = useState([]);

  // Right drawer state
  const [rightDrawerOpen, setRightDrawerOpen] = useState(true);

  // Persist favorites
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      /* ignore quota */
    }
  }, [favorites]);

  // Persist openTools to localStorage + URL on change
  useEffect(() => {
    try {
      localStorage.setItem(
        OPEN_TOOLS_KEY,
        JSON.stringify(openTools.map((t) => ({ id: t.id, name: t.name })))
      );
    } catch {
      /* ignore quota */
    }
    writeUrlParams(openTools, activeToolId);
  }, [openTools, activeToolId]);

  // Track tool opens for analytics on first appearance
  const trackedRef = useRef(new Set());
  useEffect(() => {
    openTools.forEach((t) => {
      if (!trackedRef.current.has(t.id)) {
        trackedRef.current.add(t.id);
        recordToolOpen(t.id);
      }
    });
  }, [openTools]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const tid = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(tid);
  }, [toast]);

  // Support both controlled and uncontrolled sub-tab
  const subTab = subTabProp !== undefined ? subTabProp : localSubTab;
  const setSubTab = setSubTabProp !== undefined ? setSubTabProp : setLocalSubTab;

  useEffect(() => {
    try {
      runParityTests();
      setParityStatus("pass");
    } catch {
      setParityStatus("fail");
    }
  }, []);

  // Ctrl/Cmd+B toggles the right drawer
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setRightDrawerOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSelectTool = useCallback((tool) => {
    if (!tool || !tool.id) return;
    setOpenTools((prev) => {
      const exists = prev.find((t) => t.id === tool.id);
      if (exists) {
        // Already open → just focus
        setActiveToolId(tool.id);
        return prev;
      }
      if (prev.length >= MAX_OPEN_TOOLS) {
        setToast({ text: `Máx ${MAX_OPEN_TOOLS} abas — feche uma para abrir outra`, ts: Date.now() });
        return prev;
      }
      setActiveToolId(tool.id);
      return [...prev, { id: tool.id, name: tool.name || getTool(tool.id)?.name || tool.id }];
    });
  }, []);

  const handleCloseTab = useCallback((toolId) => {
    setOpenTools((prev) => {
      const next = prev.filter((t) => t.id !== toolId);
      // If we closed the active tab, focus the previous (or first)
      setActiveToolId((curr) => {
        if (curr !== toolId) return curr;
        if (next.length === 0) return null;
        const idx = prev.findIndex((t) => t.id === toolId);
        const fallback = next[Math.max(0, idx - 1)] || next[0];
        return fallback.id;
      });
      return next;
    });
  }, []);

  const handleActivateTab = useCallback((toolId) => {
    setActiveToolId(toolId);
  }, []);

  const handleBackToHub = useCallback(() => {
    setActiveToolId(null);
  }, []);

  const toggleFavorite = (id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleArrayItem = (arr, item) =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const toggleWorkflow = (id) =>
    setWorkflowFilter((prev) => toggleArrayItem(prev, id));

  const toggleAnsi = (code) =>
    setAnsiFilter((prev) => toggleArrayItem(prev, code));

  // Active tool metadata for NotesPanel / breadcrumb
  const activeTool = useMemo(() => {
    if (!activeToolId) return null;
    return openTools.find((t) => t.id === activeToolId) || null;
  }, [openTools, activeToolId]);

  // Re-emit artifact onto bus when user clicks "Abrir" — handled inside BayContextPanel,
  // here we surface a toast/log hook for future enhancement.
  const handleArtifactOpen = useCallback((artifact) => {
    setToast({
      text: `Artefato de ${getTool(artifact.toolId)?.name || artifact.toolId} disponível na ferramenta ativa`,
      ts: Date.now(),
    });
  }, []);

  const showCanvas = !!activeToolId;

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.bar} />
          <div>
            <div style={styles.title}>Estudos</div>
            <div style={styles.subtitle}>
              Workbench · {Object.keys(TOOL_REGISTRY).length} ferramentas disponíveis
            </div>
          </div>
          {parityStatus === "pass" && (
            <div style={styles.parityBadge}>Paridade ✓</div>
          )}
          {parityStatus === "fail" && (
            <div style={{ ...styles.parityBadge, ...styles.parityBadgeFail }}>Paridade ✗</div>
          )}
          {activeTool && (
            <div style={styles.breadcrumb}>
              <span style={styles.crumbSep}>›</span>
              <span style={styles.crumbCurrent}>{activeTool.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main layout: 3-pane Workbench */}
      <div style={styles.mainLayout}>
        {/* Left Rail */}
        <LeftRail
          onSelectTool={handleSelectTool}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          workflowFilter={workflowFilter}
          onToggleWorkflow={toggleWorkflow}
          ansiFilter={ansiFilter}
          onToggleAnsi={toggleAnsi}
        />

        {/* Canvas */}
        <div style={styles.canvasColumn}>
          {/* Tab strip — visible whenever at least one tool is open */}
          {openTools.length > 0 && (
            <TabBar
              openTools={openTools}
              activeToolId={activeToolId}
              onActivate={handleActivateTab}
              onClose={handleCloseTab}
              onBackToHub={handleBackToHub}
            />
          )}

          <div style={styles.canvas}>
            {!showCanvas ? (
              <>
                <StudiesHub
                  onSelectTool={handleSelectTool}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  workflow={workflowFilter}
                  ansiFilters={ansiFilter}
                />
                <SearchPalette
                  onSelectTool={handleSelectTool}
                  favorites={favorites}
                />
              </>
            ) : (
              <div style={styles.toolContainer}>
                {/* Render each open tool but only display the active one.
                    Keeping inactive panels mounted preserves their internal state
                    (form fields, scroll position) across tab switches. */}
                {openTools.map((t) => {
                  const Comp = TOOL_REGISTRY[t.id]?.component;
                  const isActive = t.id === activeToolId;
                  return (
                    <div
                      key={t.id}
                      style={{
                        ...styles.toolContent,
                        display: isActive ? "block" : "none",
                      }}
                      aria-hidden={!isActive}
                    >
                      {Comp ? (
                        <Suspense fallback={<LoadingPlaceholder />}>
                          <Comp />
                        </Suspense>
                      ) : (
                        <div style={styles.comingSoon}>
                          <div style={styles.comingSoonIcon}>🚀</div>
                          <div style={styles.comingSoonText}>{t.name}</div>
                          <div style={styles.comingSoonDesc}>Disponível em breve</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Drawer */}
        <AnimatedDrawer
          open={rightDrawerOpen}
          onToggle={() => setRightDrawerOpen((v) => !v)}
          ariaLabel="Painel lateral direito"
        >
          <BayContextPanel
            embedded
            activeToolId={activeToolId}
            activeToolName={activeTool?.name || null}
            onArtifactOpen={handleArtifactOpen}
          />
        </AnimatedDrawer>
      </div>

      {/* Toast */}
      {toast && (
        <div style={styles.toast} role="status" aria-live="polite">
          {toast.text}
        </div>
      )}
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
    position: "relative",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    background: "var(--card)",
    borderBottom: "1px solid var(--bdr)",
    flexShrink: 0,
  },
  mainLayout: {
    flex: 1,
    display: "flex",
    flexDirection: "row",
    overflow: "hidden",
    minHeight: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  bar: {
    width: 4,
    height: 22,
    borderRadius: 2,
    background: "var(--cyan)",
    flexShrink: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
    color: "var(--tx)",
    fontFamily: "var(--fh)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 10,
    color: "var(--tx3)",
    fontWeight: 500,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  crumbSep: {
    color: "var(--tx3)",
    fontSize: 14,
  },
  crumbCurrent: {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--fm)",
    color: "var(--cyan)",
  },
  canvasColumn: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "var(--bg)",
  },
  canvas: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
    background: "var(--bg)",
  },
  parityBadge: {
    padding: "3px 10px",
    borderRadius: 6,
    background: "rgba(34,197,94,0.12)",
    color: "#22c55e",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    letterSpacing: 0.5,
    border: "1px solid rgba(34,197,94,0.25)",
  },
  parityBadgeFail: {
    background: "rgba(239,68,68,0.12)",
    color: "#ef4444",
    border: "1px solid rgba(239,68,68,0.25)",
  },
  toolContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 20,
    overflow: "auto",
  },
  toolContent: {
    flex: 1,
  },
  comingSoon: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 40,
    textAlign: "center",
    minHeight: 300,
  },
  comingSoonIcon: {
    fontSize: 48,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: 700,
    color: "var(--tx)",
    fontFamily: "var(--fh)",
    letterSpacing: 0.5,
  },
  comingSoonDesc: {
    fontSize: 13,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
  },
  toast: {
    position: "absolute",
    bottom: 20,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "8px 14px",
    background: "var(--card)",
    border: "1px solid rgba(14,165,233,0.45)",
    borderRadius: 8,
    color: "var(--cyan)",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "var(--fm)",
    boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
    zIndex: 100,
    pointerEvents: "none",
  },
};
