/**
 * AmpacityCTSaturationTool.jsx — Cable ampacity + CT saturation analysis
 */

import { useState } from "react";
import {
  calcEffectiveAmpacity,
  checkAmpacitySafety,
  getCableSizes,
} from "../engine/ampacity.js";
import {
  evaluateCTTransientResponse,
  recommendCTClass,
  getCTClasses,
} from "../engine/ct_saturation.js";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

export default function AmpacityCTSaturationTool() {
  const bus = useArtifactBus();

  // Ampacity inputs
  const [cableId, setCableId] = useState("25_Cu");
  const [I_load, setILoad] = useState(50);
  const [T_ambient, setTAmbient] = useState(30);
  const [numCables, setNumCables] = useState(1);
  const [installType, setInstallType] = useState("open");

  // CT inputs
  const [I_primary, setIPrimary] = useState(1000);
  const [CT_ratio, setCTRatio] = useState(50);
  const [Z_burden, setZBurden] = useState(2.0);
  const [CT_class, setCTClass] = useState("5P10");

  const [ampResult, setAmpResult] = useState(null);
  const [ctResult, setCtResult] = useState(null);

  const cables = getCableSizes();
  const ct_classes = getCTClasses();

  const handleAnalyzeAmpacity = () => {
    try {
      const amp = calcEffectiveAmpacity(
        cableId,
        T_ambient,
        60,
        numCables,
        installType
      );
      const safety = checkAmpacitySafety(I_load, amp.I_effective, 80);

      setAmpResult({ ...amp, ...safety });

      bus.publish("ampacity.result", {
        cable: amp,
        safety,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[AmpacityCTSaturationTool]", e);
    }
  };

  const handleAnalyzeCT = () => {
    try {
      const ct = evaluateCTTransientResponse(
        I_primary,
        CT_ratio,
        Z_burden,
        CT_class
      );
      const rec = recommendCTClass(I_primary, CT_ratio, Z_burden);

      setCtResult({ ...ct, recommended: rec.recommended_class });

      bus.publish("ct_saturation.result", {
        evaluation: ct,
        recommendation: rec,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[AmpacityCTSaturationTool]", e);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.title}>Ampacidade + Saturação de TC</div>

      {/* Ampacity Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Ampacidade de Cabos</div>

        <div style={styles.field}>
          <label style={styles.label}>Cabo</label>
          <select
            value={cableId}
            onChange={(e) => setCableId(e.target.value)}
            style={styles.select}
          >
            {cables.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} ({c.ampacity}A)
              </option>
            ))}
          </select>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Corrente (A)</label>
            <input
              type="number"
              value={I_load}
              onChange={(e) => setILoad(parseFloat(e.target.value) || 50)}
              step={10}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Temp. Ambiente (°C)</label>
            <input
              type="number"
              value={T_ambient}
              onChange={(e) => setTAmbient(parseFloat(e.target.value) || 30)}
              step={5}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Qtd Cabos</label>
            <input
              type="number"
              value={numCables}
              onChange={(e) => setNumCables(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={20}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Instalação</label>
            <select
              value={installType}
              onChange={(e) => setInstallType(e.target.value)}
              style={styles.select}
            >
              <option value="open">Livre</option>
              <option value="conduit">Conduite</option>
              <option value="buried_direct">Enterrado</option>
              <option value="buried_duct">Duto Enterrado</option>
            </select>
          </div>
        </div>

        <button style={styles.btn} onClick={handleAnalyzeAmpacity}>
          Analisar Ampacidade
        </button>
      </div>

      {ampResult && (
        <div style={styles.section}>
          <div style={styles.resultGrid}>
            <div style={styles.card}>
              <div style={styles.label}>I Nominal</div>
              <div style={styles.value}>{ampResult.I_rated} A</div>
            </div>

            <div style={styles.card}>
              <div style={styles.label}>I Efetiva</div>
              <div style={styles.value}>{ampResult.I_effective} A</div>
            </div>

            <div
              style={{
                ...styles.card,
                background: ampResult.safe
                  ? "rgba(34,197,94,0.1)"
                  : "rgba(239,68,68,0.1)",
              }}
            >
              <div style={styles.label}>Carregamento</div>
              <div style={styles.value}>{ampResult.loading_pct}%</div>
            </div>
          </div>

          <div
            style={{
              ...styles.status,
              background: ampResult.safe
                ? "rgba(34,197,94,0.12)"
                : "rgba(239,68,68,0.12)",
            }}
          >
            {ampResult.status}
            {" · Margem: "}
            {ampResult.margin_A} A
          </div>
        </div>
      )}

      {/* CT Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Saturação de TC</div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Corrente Primária (A)</label>
            <input
              type="number"
              value={I_primary}
              onChange={(e) => setIPrimary(parseFloat(e.target.value) || 1000)}
              step={100}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Relação TC</label>
            <input
              type="number"
              value={CT_ratio}
              onChange={(e) => setCTRatio(parseFloat(e.target.value) || 50)}
              step={5}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Burden (Ω)</label>
            <input
              type="number"
              value={Z_burden}
              onChange={(e) => setZBurden(parseFloat(e.target.value) || 2.0)}
              step={0.5}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Classe TC</label>
            <select
              value={CT_class}
              onChange={(e) => setCTClass(e.target.value)}
              style={styles.select}
            >
              {ct_classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button style={styles.btn} onClick={handleAnalyzeCT}>
          Analisar TC
        </button>
      </div>

      {ctResult && (
        <div style={styles.section}>
          <div style={styles.resultGrid}>
            <div style={styles.card}>
              <div style={styles.label}>V Secundária</div>
              <div style={styles.value}>{ctResult.V_secondary} V</div>
            </div>

            <div style={styles.card}>
              <div style={styles.label}>V Joelho</div>
              <div style={styles.value}>{ctResult.V_knee} V</div>
            </div>

            <div
              style={{
                ...styles.card,
                background: ctResult.saturated
                  ? "rgba(239,68,68,0.1)"
                  : "rgba(34,197,94,0.1)",
              }}
            >
              <div style={styles.label}>Precisão</div>
              <div style={styles.value}>{ctResult.accuracy_pct}%</div>
            </div>
          </div>

          <div
            style={{
              ...styles.status,
              background: ctResult.saturated
                ? "rgba(239,68,68,0.12)"
                : "rgba(34,197,94,0.12)",
            }}
          >
            {ctResult.saturated ? "⚠ Saturado" : "✓ Normal"}
            {" · Recomendado: "}
            {ctResult.recommended}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    padding: "20px",
    background: "var(--card)",
    borderRadius: 10,
    maxWidth: 640,
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
    fontFamily: "var(--fh)",
    color: "var(--tx)",
    marginBottom: 20,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: "1px solid var(--bdr)",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--tx3)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  field: {
    marginBottom: 10,
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--tx3)",
    marginBottom: 4,
    fontFamily: "var(--fm)",
  },
  input: {
    width: "100%",
    padding: "6px 8px",
    border: "1px solid var(--bdr)",
    borderRadius: 4,
    background: "var(--card2)",
    color: "var(--tx)",
    fontSize: 11,
    fontFamily: "var(--fm)",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "6px 8px",
    border: "1px solid var(--bdr)",
    borderRadius: 4,
    background: "var(--card2)",
    color: "var(--tx)",
    fontSize: 11,
    fontFamily: "var(--fm)",
    boxSizing: "border-box",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  btn: {
    width: "100%",
    padding: "8px",
    marginTop: 12,
    border: "1px solid var(--cyan)",
    borderRadius: 6,
    background: "rgba(14,165,233,0.08)",
    color: "var(--cyan)",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    transition: "all .2s",
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 10,
    marginTop: 10,
  },
  card: {
    padding: 12,
    background: "var(--card2)",
    borderRadius: 6,
    border: "1px solid var(--bdr)",
  },
  value: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--cyan)",
    fontFamily: "var(--fm)",
  },
  status: {
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    fontSize: 11,
    fontWeight: 600,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
  },
};
