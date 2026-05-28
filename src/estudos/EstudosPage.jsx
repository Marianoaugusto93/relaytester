import { useState, useEffect } from "react";
import { runParityTests } from "./engine/faults.js";
import StudiesHub from "./components/StudiesHub.jsx";
import SymmetricalComponentsTool from "./tools/SymmetricalComponentsTool.jsx";
import FaultStudyTool from "./tools/FaultStudyTool.jsx";
import TccTool from "./tools/TccTool.jsx";
import DistributionTool from "./tools/DistributionTool.jsx";
import DistanceTool from "./tools/DistanceTool.jsx";
import DifferentialInrushTool from "./tools/DifferentialInrushTool.jsx";
import AmpacityCTSaturationTool from "./tools/AmpacityCTSaturationTool.jsx";
import PowerFlowTool from "./tools/PowerFlowTool.jsx";
import SearchPalette from "./components/SearchPalette.jsx";
import BayContextPanel from "./components/BayContextPanel.jsx";

const SUB_TABS = [
  { id: "hub", label: "Hub" },
];

/**
 * EstudosPage — placeholder shell for the Estudos tab.
 * Receives mainTab/subTab navigation props from App.jsx.
 * Will host StudiesHub, FaultStudyTool, SymmetricalComponentsTool, etc. in Sprint 1+.
 * @param {Object} props
 * @param {string} props.mainTab - Active main tab id (unused here, forwarded to sub-tools)
 * @param {string} [props.subTab] - Active sub-tab id (controlled externally)
 * @param {Function} [props.setSubTab] - External sub-tab setter (controlled mode)
 */
export default function EstudosPage({ mainTab, subTab: subTabProp, setSubTab: setSubTabProp }) {
  const [localSubTab, setLocalSubTab] = useState("hub");
  const [selectedTool, setSelectedTool] = useState(null); // null | { id, name }
  const [parityStatus, setParityStatus] = useState(null); // null | "pass" | "fail"

  // Support both controlled (from App.jsx) and uncontrolled modes
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

  const handleSelectTool = (tool) => {
    setSelectedTool(tool);
  };

  const handleBackToHub = () => {
    setSelectedTool(null);
  };

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.bar} />
          <div>
            <div style={styles.title}>Estudos</div>
            <div style={styles.subtitle}>Sprint 1: 2 ferramentas ativas</div>
          </div>
          {parityStatus === "pass" && (
            <div style={styles.parityBadge}>Paridade ✓</div>
          )}
          {parityStatus === "fail" && (
            <div style={{ ...styles.parityBadge, ...styles.parityBadgeFail }}>Paridade ✗</div>
          )}
        </div>
      </div>

      {/* Main layout: content + sidebar */}
      <div style={styles.mainLayout}>
        {/* Left content area */}
        <div style={styles.content}>
          {!selectedTool ? (
            <>
              <StudiesHub onSelectTool={handleSelectTool} />
              <SearchPalette onSelectTool={handleSelectTool} />
            </>
          ) : (
            <div style={styles.toolContainer}>
              <button style={styles.backBtn} onClick={handleBackToHub}>
                ← Voltar ao Hub
              </button>
              <div style={styles.toolContent}>
                {selectedTool.id === "symm-components" && <SymmetricalComponentsTool />}
                {selectedTool.id === "fault-calc" && <FaultStudyTool />}
                {selectedTool.id === "tcc" && <TccTool />}
                {selectedTool.id === "distribution" && <DistributionTool />}
                {selectedTool.id === "distance" && <DistanceTool />}
                {selectedTool.id === "differential-inrush" && <DifferentialInrushTool />}
                {selectedTool.id === "ampacity-ct" && <AmpacityCTSaturationTool />}
                {selectedTool.id === "power-flow" && <PowerFlowTool />}
                {!["symm-components", "fault-calc", "tcc", "distribution", "distance", "differential-inrush", "ampacity-ct", "power-flow"].includes(selectedTool.id) && (
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

        {/* Right sidebar: Bay Context */}
        <BayContextPanel />
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
    overflow: "hidden",
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
  subTabs: {
    display: "flex",
    gap: 4,
    background: "var(--card2)",
    borderRadius: 10,
    padding: 3,
  },
  subTabBtn: {
    padding: "6px 16px",
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: "var(--tx3)",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    transition: "all .2s",
  },
  subTabActive: {
    background: "var(--cyan-dim)",
    color: "var(--cyan)",
    borderColor: "rgba(14,165,233,.2)",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
    padding: "20px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    padding: 40,
    textAlign: "center",
    maxWidth: 380,
  },
  emptyIcon: {
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "var(--tx)",
    fontFamily: "var(--fh)",
    letterSpacing: 0.5,
  },
  emptyDesc: {
    fontSize: 13,
    color: "var(--tx3)",
    lineHeight: 1.6,
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
