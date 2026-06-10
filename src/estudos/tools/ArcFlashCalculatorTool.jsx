/**
 * ArcFlashCalculatorTool.jsx — Arc-Flash IEEE 1584-2018
 *
 * Computes incident energy, PPE category and arc-flash boundary using a
 * simplified IEEE 1584-2018 closed-form model. Also produces a comparison
 * table across multiple clearing times to demonstrate the energy/time
 * trade-off.
 *
 * Reuses engine: arcFlashLogic.js
 *
 * Publishes: "arc-flash.result"
 */

import { useState, useMemo, useEffect } from "react";
import {
  calcIncidentEnergy,
  compareClearingTimes,
} from "../engine/arcFlashLogic.js";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

const CONFIGS = [
  { id: "Ungrounded", label: "Ungrounded" },
  { id: "Grounded", label: "Grounded" },
  { id: "GroundedY20", label: "Grounded Y / 20Ω" },
];

const ELECTRODES = [
  { id: "VCB", label: "VCB — vertical em caixa" },
  { id: "VCBB", label: "VCBB — vertical em barramento" },
  { id: "HCB", label: "HCB — horizontal em caixa" },
];

export default function ArcFlashCalculatorTool() {
  const bus = useArtifactBus();

  const [Ibf, setIbf] = useState(25);               // kA
  const [gap, setGap] = useState(32);               // mm
  const [workingDist, setWorkingDist] = useState(45); // cm
  const [systemV, setSystemV] = useState(0.48);     // kV (480V)
  const [electrodeConfig, setElectrodeConfig] = useState("Ungrounded");
  const [electrode, setElectrode] = useState("VCB");
  const [tClearMs, setTClearMs] = useState(200);

  const result = useMemo(
    () =>
      calcIncidentEnergy(
        Ibf,
        gap,
        workingDist,
        systemV,
        electrodeConfig,
        tClearMs / 1000,
      ),
    [Ibf, gap, workingDist, systemV, electrodeConfig, tClearMs],
  );

  const comparison = useMemo(
    () =>
      compareClearingTimes(Ibf, gap, workingDist, systemV, electrodeConfig, [
        50,
        100,
        200,
        300,
      ]),
    [Ibf, gap, workingDist, systemV, electrodeConfig],
  );

  const recommendation = useMemo(() => {
    if (result.energy < 1.2) {
      return "Distância de trabalho OK — categoria mínima ou nenhuma EPP requerida.";
    }
    if (result.energy < 8) {
      return "Use EPP categoria 1-2 — ou reduza clearing time para ~100 ms para baixar para categoria 0.";
    }
    if (result.energy < 25) {
      return "EPP categoria 3-4 obrigatório. Reduza clearing time ou aumente distância para baixar energia.";
    }
    return "PERIGO EXTREMO — reduza imediatamente clearing time (alvo ≤ 100 ms) ou re-projete arranjo.";
  }, [result]);

  useEffect(() => {
    bus.publish("arc-flash.result", {
      inputs: {
        Ibf,
        gap,
        workingDist,
        systemV,
        electrodeConfig,
        electrode,
        tClearMs,
      },
      result,
      comparison,
      recommendation,
      timestamp: new Date().toISOString(),
    });
  }, [
    result,
    comparison,
    recommendation,
    Ibf,
    gap,
    workingDist,
    systemV,
    electrodeConfig,
    electrode,
    tClearMs,
    bus,
  ]);

  return (
    <div style={styles.root}>
      <div style={styles.title}>Arc-Flash IEEE 1584-2018</div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Entradas</div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label} title="Bolted fault current trifásica">
              I_bf (kA)
            </label>
            <input
              type="number"
              value={Ibf}
              onChange={(e) => setIbf(parseFloat(e.target.value) || 0)}
              step={1}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Gap (mm)</label>
            <input
              type="number"
              value={gap}
              onChange={(e) => setGap(parseFloat(e.target.value) || 0)}
              step={1}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Working distance (cm)</label>
            <input
              type="number"
              value={workingDist}
              onChange={(e) => setWorkingDist(parseFloat(e.target.value) || 0)}
              step={5}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label} title="kV nominal">
              Tensão (kV)
            </label>
            <input
              type="number"
              value={systemV}
              onChange={(e) => setSystemV(parseFloat(e.target.value) || 0)}
              step={0.1}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Configuração</label>
            <select
              value={electrodeConfig}
              onChange={(e) => setElectrodeConfig(e.target.value)}
              style={styles.input}
            >
              {CONFIGS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Eletrodo</label>
            <select
              value={electrode}
              onChange={(e) => setElectrode(e.target.value)}
              style={styles.input}
            >
              {ELECTRODES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label} title="Tempo total de extinção (relé + disjuntor)">
            Clearing time (ms)
          </label>
          <input
            type="number"
            value={tClearMs}
            onChange={(e) => setTClearMs(parseFloat(e.target.value) || 0)}
            step={10}
            style={styles.input}
          />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Resultado</div>
        <div style={styles.resultGrid}>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Iarc</div>
            <div style={styles.cardValue}>{result.Iarc_kA} kA</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Energia incidente</div>
            <div
              style={{ ...styles.cardValue, color: result.color }}
            >
              {result.energy} cal/cm²
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Categoria PPE</div>
            <div
              style={{ ...styles.cardValue, color: result.color }}
            >
              {result.category}
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Classificação</div>
            <div
              style={{ ...styles.cardValue, color: result.color }}
            >
              {result.label}
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Arc-flash boundary</div>
            <div style={styles.cardValue}>{result.boundary} cm</div>
          </div>
        </div>

        <div
          style={{
            ...styles.infoBox,
            background:
              result.energy >= 25
                ? "rgba(239,68,68,0.10)"
                : "rgba(14,165,233,0.08)",
            borderLeftColor: result.energy >= 25 ? "#ef4444" : "var(--cyan)",
          }}
        >
          {recommendation}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Comparação por Clearing Time</div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>t_clear</th>
                <th style={styles.th}>Energia (cal/cm²)</th>
                <th style={styles.th}>Categoria</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((c) => (
                <tr key={c.t_ms}>
                  <td style={styles.td}>{c.t_ms} ms</td>
                  <td style={styles.td}>{c.energy}</td>
                  <td style={styles.td}>{c.category}</td>
                  <td style={styles.td}>{c.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  field: { marginBottom: 10 },
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
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 10,
  },
  card: {
    padding: 10,
    background: "var(--card2)",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
  },
  cardLabel: {
    fontSize: 10,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--cyan)",
    fontFamily: "var(--fm)",
  },
  tableWrap: {
    border: "1px solid var(--bdr)",
    borderRadius: 4,
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 11,
    fontFamily: "var(--fm)",
  },
  th: {
    textAlign: "left",
    padding: "6px 8px",
    background: "var(--card2)",
    color: "var(--tx3)",
    borderBottom: "1px solid var(--bdr)",
  },
  td: {
    padding: "5px 8px",
    color: "var(--tx)",
    borderBottom: "1px solid var(--bdr)",
  },
  infoBox: {
    marginTop: 12,
    padding: 10,
    background: "rgba(14,165,233,0.08)",
    borderLeft: "3px solid var(--cyan)",
    borderRadius: 4,
    fontSize: 11,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
  },
};
