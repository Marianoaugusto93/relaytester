/**
 * DistanceTool.jsx — Distance protection (21) analysis
 *
 * Impedance measurement, zone evaluation, reach calculation.
 */

import { useState } from "react";
import {
  calcImpedance,
  evaluateDistanceZones,
  generateStandardZones,
} from "../engine/distance.js";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

export default function DistanceTool() {
  const bus = useArtifactBus();

  const [vMag, setVMag] = useState(100);
  const [vAng, setVAng] = useState(0);
  const [iMag, setIMag] = useState(10);
  const [iAng, setIAng] = useState(-60);
  const [lineZ, setLineZ] = useState(50);

  const [result, setResult] = useState(null);

  const handleAnalyze = () => {
    try {
      // Convert to rectangular
      const v_rad = vAng * (Math.PI / 180);
      const i_rad = iAng * (Math.PI / 180);

      const voltage = {
        r: vMag * Math.cos(v_rad),
        i: vMag * Math.sin(v_rad),
      };
      const current = {
        r: iMag * Math.cos(i_rad),
        i: iMag * Math.sin(i_rad),
      };

      const impedance = calcImpedance(voltage, current);
      const zones = generateStandardZones(lineZ);

      const evaluation = evaluateDistanceZones(
        impedance,
        zones,
        vMag,
        iMag,
        20
      );

      setResult({
        impedance,
        evaluation,
        zones,
      });

      bus.publish("distance.result", {
        impedance,
        evaluation,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[DistanceTool]", e);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.title}>Distância (21) — Proteção de Linha</div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Medições</div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Tensão (V)</label>
            <input
              type="number"
              value={vMag}
              onChange={(e) => setVMag(parseFloat(e.target.value) || 100)}
              step={5}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Ângulo (°)</label>
            <input
              type="number"
              value={vAng}
              onChange={(e) => setVAng(parseFloat(e.target.value) || 0)}
              step={5}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Corrente (A)</label>
            <input
              type="number"
              value={iMag}
              onChange={(e) => setIMag(parseFloat(e.target.value) || 10)}
              step={0.5}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Ângulo (°)</label>
            <input
              type="number"
              value={iAng}
              onChange={(e) => setIAng(parseFloat(e.target.value) || -60)}
              step={5}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Impedância de Linha (Ω)</label>
          <input
            type="number"
            value={lineZ}
            onChange={(e) => setLineZ(parseFloat(e.target.value) || 50)}
            step={5}
            style={styles.input}
          />
        </div>

        <button style={styles.analyzeBtn} onClick={handleAnalyze}>
          Analisar Impedância
        </button>
      </div>

      {result && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Impedância Medida</div>

          <div style={styles.resultGrid}>
            <div style={styles.resultCard}>
              <div style={styles.label}>Z Magnitude</div>
              <div style={styles.value}>{result.impedance.Z_mag} Ω</div>
              <div style={styles.sub}>
                R: {result.impedance.Z_r} Ω, X: {result.impedance.Z_i} Ω
              </div>
            </div>

            <div style={styles.resultCard}>
              <div style={styles.label}>Ângulo</div>
              <div style={styles.value}>{result.impedance.Z_angle}°</div>
            </div>

            {result.evaluation.zone && (
              <div style={{...styles.resultCard, background: "rgba(34,197,94,0.1)"}}>
                <div style={styles.label}>Zona Atingida</div>
                <div style={styles.value}>Z{result.evaluation.zone}</div>
                <div style={styles.sub}>
                  {result.evaluation.reach_pct.toFixed(1)}% do alcance
                </div>
              </div>
            )}
          </div>

          <div style={styles.zoneTable}>
            <div style={styles.tableHeader}>Zonas de Proteção</div>
            {result.zones.map((zone, i) => (
              <div key={i} style={styles.tableRow}>
                <div style={styles.zoneLabel}>{zone.id}</div>
                <div style={styles.zoneInfo}>
                  {zone.reach.toFixed(1)} Ω · {zone.timeDelay}s
                </div>
              </div>
            ))}
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
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
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
  analyzeBtn: {
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
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
    marginTop: 10,
  },
  resultCard: {
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
  sub: {
    fontSize: 9,
    color: "var(--tx3)",
    marginTop: 4,
    fontFamily: "var(--fm)",
  },
  zoneTable: {
    marginTop: 16,
    border: "1px solid var(--bdr)",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    padding: "8px 12px",
    background: "var(--card2)",
    fontSize: 10,
    fontWeight: 700,
    color: "var(--tx3)",
    fontFamily: "var(--fh)",
    textTransform: "uppercase",
    borderBottom: "1px solid var(--bdr)",
  },
  tableRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderBottom: "1px solid var(--bdr)",
    fontSize: 11,
  },
  zoneLabel: {
    fontWeight: 600,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
  },
  zoneInfo: {
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
  },
};
