/**
 * EstudosPage — Workbench-lite shell (v2)
 *
 * Layout (3-pane):
 *   [LeftRail 280px] [Canvas flex] [RightDrawer 280px collapsible]
 *
 * Owns:
 *  - selectedTool state (which tool is open in the canvas)
 *  - favorites (persisted in localStorage estudos.favorites.v1)
 *  - workflow & ansi filters (drive Hub filtering)
 *  - rightDrawerOpen
 *
 * Renders selected tool via TOOL_REGISTRY (React.lazy + Suspense).
 */

import { Suspense, useEffect, useState } from "react";
import { runParityTests } from "./engine/faults.js";
import StudiesHub from "./components/StudiesHub.jsx";
import SearchPalette from "./components/SearchPalette.jsx";
import BayContextPanel from "./components/BayContextPanel.jsx";
import LeftRail from "./components/LeftRail.jsx";
import LoadingPlaceholder from "./components/LoadingPlaceholder.jsx";
import AnimatedDrawer from "./components/AnimatedDrawer.jsx";
import { TOOL_REGISTRY } from "./toolRegistry.js";

const FAVORITES_KEY = "estudos.favorites.v1";

/**
 * EstudosPage — main entrypoint for the Estudos tab.
 * @param {Object} props
 * @param {string} props.mainTab - Active main tab id (unused here, forwarded to sub-tools)
 * @param {string} [props.subTab] - Active sub-tab id (controlled externally)
 * @param {Function} [props.setSubTab] - External sub-tab setter (controlled mode)
 */
export default function EstudosPage({ mainTab, subTab: subTabProp, setSubTab: setSubTabProp }) {
  const [localSubTab, setLocalSubTab] = useState("hub");
  const [selectedTool, setSelectedTool] = useState(null); // null | { id, name }
  const [parityStatus, setParityStatus] = useState(null); // null | "pass" | "fail"

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

  // Support both controlled (from App.jsx) and uncontrolled modes for sub-tab
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

  // ⌘B / Ctrl+B toggles the right drawer
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

  const handleSelectTool = (tool) => {
    setSelectedTool(tool);
  };

  const handleBackToHub = () => {
    setSelectedTool(null);
  };

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

  const SelectedComponent = selectedTool
    ? TOOL_REGISTRY[selectedTool.id]?.component
    : null;

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
          {selectedTool && (
            <div style={styles.breadcrumb}>
              <span style={styles.crumbSep}>›</span>
              <span style={styles.crumbCurrent}>{selectedTool.name}</span>
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
        <div style={styles.canvas}>
          {!selectedTool ? (
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
              <button style={styles.backBtn} onClick={handleBackToHub}>
                ← Voltar ao Hub
              </button>
              <div style={styles.toolContent}>
                {SelectedComponent ? (
                  <Suspense fallback={<LoadingPlaceholder />}>
                    <SelectedComponent />
                  </Suspense>
                ) : (
                  <div style={styles.comingSoon}>
                    <div style={styles.comingSoonIcon}>🚀</div>
                    <div style={styles.comingSoonText}>{selectedTool.name}</div>
                    <div style={styles.comingSoonDesc}>Disponível em breve</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Drawer */}
        <AnimatedDrawer
          open={rightDrawerOpen}
          onToggle={() => setRightDrawerOpen((v) => !v)}
          ariaLabel="Painel lateral direito"
        >
          <BayContextPanel embedded />
        </AnimatedDrawer>
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
  backBtn: {
    alignSelf: "flex-start",
    padding: "6px 12px",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    background: "var(--card2)",
    color: "var(--tx3)",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    transition: "all .2s",
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
};
