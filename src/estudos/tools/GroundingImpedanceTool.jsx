/**
 * GroundingImpedanceTool.jsx — Aterramento / Impedância de Neutro (Zn)
 *
 * Computes the limited ground-fault current for several neutral-grounding
 * options (solid, resistive, reactive, resonant) and recommends the
 * 50N/51N pickup with a safety margin. Also flags the case where Zn is too
 * high (insensitive ground protection) or too low (neutral overstress).
 *
 * Uses a simple symmetrical-component network: I_terra = 3 * V_phase / (Z0_tot + 3*Zn)
 * where Z0_tot is the per-phase zero-sequence impedance of the transformer.
 *
 * Publishes: "grounding-impedance.result"
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

const GROUNDING_TYPES = [
  { id: "solid", label: "Sólido" },
  { id: "resistive", label: "Resistivo (R Ω)" },
  { id: "reactive", label: "Reativo (X Ω)" },
  { id: "resonant", label: "Ressonante" },
];

/**
 * Build the equivalent ground-fault impedance for the selected grounding type.
 * Returns Zn as a complex (R + jX).
 *
 * @param {string} type
 * @param {number} ZnValue   |Zn| as configured by the user (Ω)
 * @param {number} Z0_R      Transformer Z0 resistive part (Ω)
 * @param {number} Z0_X      Transformer Z0 reactive part (Ω)
 * @returns {{ Zn_R: number, Zn_X: number, Zn_mag: number, mode: string }}
 */
function buildZn(type, ZnValue, Z0_R, Z0_X) {
  let Zn_R = 0;
  let Zn_X = 0;
  let mode = "Sólido";

  switch (type) {
    case "solid":
      mode = "Sólido (Zn = 0)";
      break;
    case "resistive":
      Zn_R = Math.max(0, ZnValue);
      mode = `Resistivo (${ZnValue} Ω)`;
      break;
    case "reactive":
      Zn_X = Math.max(0, ZnValue);
      mode = `Reativo (${ZnValue} Ω)`;
      break;
    case "resonant":
      // X_zn = -X0/3 so that 3*Zn + Z0_X = 0 (Petersen coil)
      Zn_X = -Z0_X / 3;
      mode = `Ressonante (Petersen)`;
      break;
    default:
      break;
  }

  const Zn_mag = Math.sqrt(Zn_R * Zn_R + Zn_X * Zn_X);
  return { Zn_R, Zn_X, Zn_mag, mode };
}

/**
 * Calculate ground-fault current using:
 *   I_terra = 3 * Vph / |Z0_tot + 3*Zn|
 *
 * @param {number} Vph     Phase voltage (V)
 * @param {number} Z0_R
 * @param {number} Z0_X
 * @param {number} Zn_R
 * @param {number} Zn_X
 * @returns {number}
 */
function calcGroundFault(Vph, Z0_R, Z0_X, Zn_R, Zn_X) {
  const R = Z0_R + 3 * Zn_R;
  const X = Z0_X + 3 * Zn_X;
  const mag = Math.sqrt(R * R + X * X);
  if (mag < 1e-6) return 0;
  return (3 * Vph) / mag;
}

export default function GroundingImpedanceTool() {
  const bus = useArtifactBus();

  const [type, setType] = useState("resistive");
  const [ZnValue, setZnValue] = useState(20); // Ω
  const [Z0_R, setZ0R] = useState(0.5);       // Ω
  const [Z0_X, setZ0X] = useState(3.0);       // Ω
  const [Vph, setVph] = useState(7967);       // V (13.8 kV / √3)
  const [CTratio, setCTratio] = useState(200); // 200:1

  const canvasRef = useRef(null);

  const analysis = useMemo(() => {
    const zn = buildZn(type, ZnValue, Z0_R, Z0_X);
    const Iground = calcGroundFault(Vph, Z0_R, Z0_X, zn.Zn_R, zn.Zn_X);
    const IgroundSec = Iground / Math.max(1, CTratio);

    // Recommend 50N pickup at ~50% of the available fault current (sensitivity margin).
    const recommended50N = Iground * 0.5;
    const recommended50N_sec = recommended50N / Math.max(1, CTratio);

    // Capacitive ground-fault component (rough proxy, only meaningful for resonant)
    const Icap = type === "resonant" ? Math.abs(3 * Vph * 0.001) : 0;

    let flag = "ok";
    let message = `Pickup 50N recomendado: ${recommended50N.toFixed(1)} A primário (${recommended50N_sec.toFixed(2)} A secundário).`;
    if (zn.Zn_mag > 200) {
      flag = "high";
      message =
        "Zn muito alta — corrente de falta limitada; proteção de terra pode ficar insensível. Aumente sensibilidade de 50N ou use 51N.";
    } else if (type === "solid" && Iground > 5000) {
      flag = "low";
      message =
        "Aterramento sólido com altíssima corrente — verifique dimensionamento do neutro/cabos. Considere Zn limitador.";
    } else if (type === "resonant") {
      flag = "tuned";
      message =
        "Petersen coil ressintonizada — corrente de falta capacitiva apenas; use 67N ou wattmétrica para detecção.";
    }

    return {
      ...zn,
      Iground,
      IgroundSec,
      recommended50N,
      recommended50N_sec,
      Icap,
      flag,
      message,
    };
  }, [type, ZnValue, Z0_R, Z0_X, Vph, CTratio]);

  // Render the simplified equivalent circuit
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = "#0e1015";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#9ca3af";
    ctx.fillStyle = "#9ca3af";
    ctx.lineWidth = 1.5;
    ctx.font = "11px monospace";

    const y = H / 2;
    const x0 = 30;
    const x1 = 150;
    const x2 = 280;
    const x3 = 400;
    const x4 = W - 30;

    // Source (V)
    ctx.beginPath();
    ctx.arc(x0, y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText("V", x0 - 4, y + 4);
    ctx.fillStyle = "#0ea5e9";
    ctx.fillText(`${(Vph / 1000).toFixed(2)} kV`, x0 - 22, y + 36);

    // Wire to Z0
    ctx.fillStyle = "#9ca3af";
    ctx.strokeStyle = "#9ca3af";
    ctx.beginPath();
    ctx.moveTo(x0 + 14, y);
    ctx.lineTo(x1 - 20, y);
    ctx.stroke();

    // Z0 box (transformer)
    ctx.strokeStyle = "#a855f7";
    ctx.strokeRect(x1 - 20, y - 14, 40, 28);
    ctx.fillStyle = "#a855f7";
    ctx.fillText("Z0", x1 - 8, y + 4);
    ctx.fillStyle = "#a855f7";
    ctx.fillText(`${Z0_R.toFixed(2)}+j${Z0_X.toFixed(2)}`, x1 - 36, y + 36);

    // Wire to Zn
    ctx.strokeStyle = "#9ca3af";
    ctx.beginPath();
    ctx.moveTo(x1 + 20, y);
    ctx.lineTo(x2 - 20, y);
    ctx.stroke();

    // Zn box
    ctx.strokeStyle = "#f59e0b";
    ctx.strokeRect(x2 - 20, y - 14, 40, 28);
    ctx.fillStyle = "#f59e0b";
    ctx.fillText("Zn", x2 - 8, y + 4);
    ctx.fillText(`${analysis.Zn_mag.toFixed(2)} Ω`, x2 - 28, y + 36);

    // Wire to fault
    ctx.strokeStyle = "#9ca3af";
    ctx.beginPath();
    ctx.moveTo(x2 + 20, y);
    ctx.lineTo(x3 - 20, y);
    ctx.stroke();

    // Fault icon
    ctx.strokeStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(x3 - 14, y - 10);
    ctx.lineTo(x3 + 14, y + 10);
    ctx.moveTo(x3 + 14, y - 10);
    ctx.lineTo(x3 - 14, y + 10);
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.fillText("F", x3 - 4, y - 16);

    // Wire to ground
    ctx.strokeStyle = "#9ca3af";
    ctx.beginPath();
    ctx.moveTo(x3 + 14, y);
    ctx.lineTo(x4, y);
    ctx.stroke();

    // Ground symbol
    ctx.beginPath();
    ctx.moveTo(x4 - 18, y);
    ctx.lineTo(x4 + 18, y);
    ctx.moveTo(x4 - 12, y + 6);
    ctx.lineTo(x4 + 12, y + 6);
    ctx.moveTo(x4 - 6, y + 12);
    ctx.lineTo(x4 + 6, y + 12);
    ctx.stroke();

    // Current label
    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 12px monospace";
    ctx.fillText(
      `I_terra = ${analysis.Iground.toFixed(1)} A`,
      x2,
      y - 30,
    );
  }, [Vph, Z0_R, Z0_X, analysis]);

  useEffect(() => {
    bus.publish("grounding-impedance.result", {
      inputs: { type, ZnValue, Z0_R, Z0_X, Vph, CTratio },
      analysis,
      timestamp: new Date().toISOString(),
    });
  }, [analysis, type, ZnValue, Z0_R, Z0_X, Vph, CTratio, bus]);

  const flagColor =
    analysis.flag === "ok"
      ? "var(--cyan)"
      : analysis.flag === "high"
      ? "#f59e0b"
      : analysis.flag === "low"
      ? "#ef4444"
      : "#a855f7";

  return (
    <div style={styles.root}>
      <div style={styles.title}>Aterramento / Zn</div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Configuração</div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={styles.input}
            >
              {GROUNDING_TYPES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>|Zn| (Ω)</label>
            <input
              type="number"
              value={ZnValue}
              onChange={(e) => setZnValue(parseFloat(e.target.value) || 0)}
              step={1}
              disabled={type === "solid" || type === "resonant"}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label} title="Z0 do transformador parte resistiva">
              Z0 R (Ω)
            </label>
            <input
              type="number"
              value={Z0_R}
              onChange={(e) => setZ0R(parseFloat(e.target.value) || 0)}
              step={0.1}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label} title="Z0 do transformador parte reativa">
              Z0 X (Ω)
            </label>
            <input
              type="number"
              value={Z0_X}
              onChange={(e) => setZ0X(parseFloat(e.target.value) || 0)}
              step={0.1}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label} title="Tensão fase-neutro">
              V fase (V)
            </label>
            <input
              type="number"
              value={Vph}
              onChange={(e) => setVph(parseFloat(e.target.value) || 0)}
              step={100}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>TC ratio (n:1)</label>
            <input
              type="number"
              value={CTratio}
              onChange={(e) => setCTratio(parseFloat(e.target.value) || 1)}
              step={10}
              style={styles.input}
            />
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Circuito Equivalente</div>
        <canvas
          ref={canvasRef}
          width={560}
          height={180}
          style={styles.canvas}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Resultado</div>
        <div style={styles.resultGrid}>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Modo</div>
            <div style={styles.cardValue}>{analysis.mode}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>I_terra primária</div>
            <div style={styles.cardValue}>
              {analysis.Iground.toFixed(1)} A
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>I_terra secundária</div>
            <div style={styles.cardValue}>
              {analysis.IgroundSec.toFixed(2)} A
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Pickup 50N (prim)</div>
            <div style={styles.cardValue}>
              {analysis.recommended50N.toFixed(1)} A
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Pickup 50N (sec)</div>
            <div style={styles.cardValue}>
              {analysis.recommended50N_sec.toFixed(2)} A
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>|Zn|</div>
            <div style={styles.cardValue}>
              {analysis.Zn_mag.toFixed(2)} Ω
            </div>
          </div>
        </div>

        <div
          style={{
            ...styles.infoBox,
            borderLeftColor: flagColor,
            color: "var(--tx)",
          }}
        >
          {analysis.message}
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
  canvas: {
    width: "100%",
    maxWidth: 560,
    height: "auto",
    border: "1px solid var(--bdr)",
    borderRadius: 4,
    background: "var(--card2)",
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
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
