/**
 * GraphVizContainer.jsx — Standalone R-X Plane + TCC Overlay visualization tool.
 *
 * Provides a tabbed view of RXPlane and TCCPlot with default demo data so
 * the tool is immediately useful without requiring a scenario to be loaded.
 *
 * ArtifactBus: subscribes to "scenario.built" to receive operating point
 * and curve defs from VisualScenarioBuilder.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import RXPlane from "./RXPlane.jsx";
import TCCPlot from "../tools/TCCPlot.jsx";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

// ---------------------------------------------------------------------------
// Demo defaults shown before any scenario is received
// ---------------------------------------------------------------------------

const DEMO_ZONES = {
  mho: { cx: 0, cy: 1.5, r: 2.0 },
};

const DEMO_OP = { r: 0.8, x: 1.2 };

const DEMO_CURVES = [
  {
    id: "51-demo",
    fn: "51",
    label: "51 (demo)",
    pickup: 2.0,
    timeDial: 0.5,
    curveType: "IEC - Standard Inverse",
  },
  {
    id: "51N-demo",
    fn: "51N",
    label: "51N (demo)",
    pickup: 0.8,
    timeDial: 0.3,
    curveType: "IEC - Very Inverse",
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GraphVizContainer() {
  const [activeTab, setActiveTab] = useState("rx");
  const [scenario, setScenario] = useState(null); // populated from ArtifactBus
  const bus = useArtifactBus();

  // Subscribe to scenario.built from VisualScenarioBuilder
  useEffect(() => {
    const unsub = bus.subscribe("scenario.built", (payload) => {
      setScenario(payload);
    });
    return unsub;
  }, [bus]);

  // Derive operating point from received scenario phasors
  const operatingPoint = useMemo(() => {
    if (!scenario?.phasors) return DEMO_OP;
    const { currents, voltages } = scenario.phasors;
    const Ia = currents?.Ia?.mag;
    const Va = voltages?.Va?.mag;
    if (!Ia || !Va || Ia <= 0 || Va <= 0) return DEMO_OP;
    const Z = Va / Ia;
    return { r: Z * 0.8, x: Z * 0.6 };
  }, [scenario]);

  // Derive TCC curve defs from received scenario patch
  const curveDefs = useMemo(() => {
    if (!scenario?.fns || !scenario?.patch) return DEMO_CURVES;
    const defs = [];
    const timeFns = ["51", "51N", "67", "67N"];
    for (const fn of scenario.fns) {
      if (!timeFns.includes(fn)) continue;
      const entry = scenario.patch[fn];
      if (!entry) continue;
      const arr = entry.stages || [];
      if (!arr[0]) continue;
      const st = arr[0];
      defs.push({
        id: `${fn}-1`,
        fn,
        label: `${fn}-1`,
        pickup: st.pickup || 1.0,
        timeDial: st.timeDial || 0.5,
        curveType: st.curve || "IEC - Standard Inverse",
      });
    }
    return defs.length > 0 ? defs : DEMO_CURVES;
  }, [scenario]);

  const tabs = [
    { id: "rx",  label: "Plano R-X" },
    { id: "tcc", label: "Sobreposição TCC" },
  ];

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.bar} />
          <div>
            <div style={S.title}>Visualização R-X & TCC</div>
            <div style={S.subtitle}>
              Plano R-X com zonas Mho/Quad e curvas TCC com detecção de coordenação
            </div>
          </div>
        </div>
        {scenario && (
          <div style={S.sourceBadge}>
            Cenário: {scenario.name || scenario.id}
          </div>
        )}
        {!scenario && (
          <div style={S.demoBadge}>Dados de demonstração</div>
        )}
      </div>

      {/* Tab bar */}
      <div style={S.tabBar}>
        {tabs.map(t => (
          <button
            key={t.id}
            style={{ ...S.tab, ...(activeTab === t.id ? S.tabActive : {}) }}
            onClick={() => setActiveTab(t.id)}
            aria-pressed={activeTab === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={S.content}>
        {activeTab === "rx" && (
          <div style={S.panel}>
            <div style={S.panelLabel}>
              Ponto operativo: R={operatingPoint.r.toFixed(2)} Ω, X={operatingPoint.x.toFixed(2)} Ω
            </div>
            <RXPlane
              zones={DEMO_ZONES}
              operatingPoint={operatingPoint}
              scale={1.0}
            />
          </div>
        )}
        {activeTab === "tcc" && (
          <div style={S.panel}>
            <TCCPlot
              curveDefs={curveDefs}
              showCoordination={curveDefs.length >= 2}
              userTrips={[]}
            />
          </div>
        )}
      </div>

      {/* Integration hint */}
      <div style={S.hint}>
        Use o Editor Visual de Cenários e clique em "Enviar ao Relé" para visualizar os dados do cenário aqui.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const S = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: "0 0 24px 0",
    fontFamily: "var(--fm)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
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
    fontSize: 15,
    fontWeight: 800,
    color: "var(--tx)",
    fontFamily: "var(--fh)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 10,
    color: "var(--tx3)",
    fontWeight: 500,
    marginTop: 1,
  },
  sourceBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--cyan)",
    background: "rgba(14,165,233,0.1)",
    border: "1px solid rgba(14,165,233,0.25)",
    borderRadius: 6,
    padding: "4px 10px",
    fontFamily: "var(--fh)",
    letterSpacing: 0.4,
  },
  demoBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--tx3)",
    background: "var(--card2)",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    padding: "4px 10px",
    fontFamily: "var(--fh)",
    letterSpacing: 0.4,
  },
  tabBar: {
    display: "flex",
    gap: 4,
    background: "var(--card2)",
    borderRadius: 8,
    padding: 3,
    alignSelf: "flex-start",
  },
  tab: {
    padding: "6px 16px",
    border: "none",
    borderRadius: 6,
    background: "transparent",
    color: "var(--tx3)",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    transition: "all .15s",
  },
  tabActive: {
    background: "var(--cyan-dim, rgba(14,165,233,.12))",
    color: "var(--cyan)",
  },
  content: {
    background: "var(--card)",
    border: "1px solid var(--bdr)",
    borderRadius: "var(--r)",
    overflow: "auto",
  },
  panel: {
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  panelLabel: {
    fontSize: 11,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
  },
  hint: {
    fontSize: 11,
    color: "var(--tx3)",
    fontFamily: "var(--fi)",
    padding: "8px 12px",
    background: "var(--card2)",
    borderRadius: 6,
    border: "1px solid var(--bdr)",
  },
};
