/**
 * TcSizingValidator.jsx — TC Sizing / ANSI Class (C100/C200/C400/C800)
 *
 * Evaluates whether a chosen CT class supports the fault burden without
 * saturating. Reports V_secondary, V_knee, saturation margin, and
 * recommends a higher class if the chosen one is inadequate.
 *
 * Reuses engine: ct_saturation.js (calcSecondaryVoltage, calcExcitationCurrent,
 * evaluateCTTransientResponse).
 *
 * Note: ANSI accuracy classes (C100/C200/C400/C800) are reinterpreted here
 * as knee-point voltages (100/200/400/800 V) — the standard convention.
 *
 * Publishes: "tc-sizing.result" { V_secondary, V_knee, margin, status }
 */

import { useState, useMemo, useEffect, useRef } from "react";
import {
  calcSecondaryVoltage,
  calcExcitationCurrent,
} from "../engine/ct_saturation.js";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

// ANSI C-class knee-point voltages (volts).
const ANSI_CLASSES = [
  { id: "C100", V_knee: 100 },
  { id: "C200", V_knee: 200 },
  { id: "C400", V_knee: 400 },
  { id: "C800", V_knee: 800 },
];

const MARGIN_TARGET = 25; // %; below this is "marginal"

/**
 * Parse "600:5" ratio → 120.
 */
function parseRatio(text) {
  const m = /^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/.exec(text);
  if (!m) return 120;
  const num = parseFloat(m[1]);
  const den = parseFloat(m[2]);
  if (den <= 0) return 120;
  return num / den;
}

/**
 * Pick the smallest ANSI class with V_knee >= V_required * (1 + targetMargin/100).
 */
function autoSelectClass(V_required) {
  const required = V_required * (1 + MARGIN_TARGET / 100);
  for (const c of ANSI_CLASSES) {
    if (c.V_knee >= required) return c.id;
  }
  return ANSI_CLASSES[ANSI_CLASSES.length - 1].id;
}

/**
 * Status from saturation margin (%).
 */
function statusFromMargin(margin) {
  if (margin >= MARGIN_TARGET) return { label: "Adequado", color: "#22c55e" };
  if (margin >= 0) return { label: "Marginal", color: "#f59e0b" };
  return { label: "Inadequado", color: "#ef4444" };
}

export default function TcSizingValidator() {
  const bus = useArtifactBus();

  const [I_fault, setIFault] = useState(8000); // primary fault A
  const [ratioText, setRatioText] = useState("600:5");
  const [Z_burden, setZBurden] = useState(2.0);
  const [XoverR, setXoverR] = useState(5);
  const [selectedClass, setSelectedClass] = useState("auto");

  const canvasRef = useRef(null);

  const CT_ratio = useMemo(() => parseRatio(ratioText), [ratioText]);

  // Account for the DC offset: V_required = V_ss * (1 + X/R)  (IEEE C37.110)
  const analysis = useMemo(() => {
    const V_steadyState = calcSecondaryVoltage(I_fault, CT_ratio, Z_burden);
    const V_required = V_steadyState * (1 + Math.max(0, XoverR));

    const classId =
      selectedClass === "auto" ? autoSelectClass(V_required) : selectedClass;
    const cls = ANSI_CLASSES.find((c) => c.id === classId) || ANSI_CLASSES[0];

    const margin = ((cls.V_knee - V_required) / cls.V_knee) * 100;
    const status = statusFromMargin(margin);

    // Find a higher class only if current one is inadequate
    let recommended = null;
    if (margin < MARGIN_TARGET) {
      const recId = autoSelectClass(V_required);
      if (recId !== classId) recommended = recId;
    }

    return {
      V_steadyState: parseFloat(V_steadyState.toFixed(2)),
      V_required: parseFloat(V_required.toFixed(2)),
      V_knee: cls.V_knee,
      classId,
      margin: parseFloat(margin.toFixed(1)),
      status,
      recommended,
      I_secondary_ideal: parseFloat((I_fault / CT_ratio).toFixed(3)),
    };
  }, [I_fault, CT_ratio, Z_burden, XoverR, selectedClass]);

  // Draw magnetization curve with operating point.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = "#0e1015";
    ctx.fillRect(0, 0, W, H);

    const Vmax = Math.max(analysis.V_knee * 2, analysis.V_required * 1.2);
    const Ie_max = Math.max(0.5, calcExcitationCurrent(Vmax, analysis.V_knee));

    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 36;

    const xOf = (Ie) =>
      padL + (Ie / Ie_max) * (W - padL - padR);
    const yOf = (V) =>
      padT + ((Vmax - V) / Vmax) * (H - padT - padB);

    // Grid
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 5; i++) {
      const x = padL + (i / 5) * (W - padL - padR);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, H - padB);
      ctx.stroke();
      const y = padT + (i / 5) * (H - padT - padB);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, H - padB);
    ctx.lineTo(W - padR, H - padB);
    ctx.stroke();

    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px monospace";
    ctx.fillText("I_exc (A)", W - 60, H - 10);
    ctx.fillText("V_sec (V)", 4, padT + 8);

    // Excitation curve (sweep V from 0 to Vmax)
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const STEPS = 60;
    for (let i = 0; i <= STEPS; i++) {
      const V = (i / STEPS) * Vmax;
      const Ie = calcExcitationCurrent(V, analysis.V_knee);
      const x = xOf(Ie);
      const y = yOf(V);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Knee point line
    ctx.strokeStyle = "#f59e0b";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, yOf(analysis.V_knee));
    ctx.lineTo(W - padR, yOf(analysis.V_knee));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#f59e0b";
    ctx.fillText(`V_knee=${analysis.V_knee}V`, W - 110, yOf(analysis.V_knee) - 4);

    // Operating point
    const Ie_op = calcExcitationCurrent(analysis.V_required, analysis.V_knee);
    const opX = xOf(Math.min(Ie_op, Ie_max));
    const opY = yOf(Math.min(analysis.V_required, Vmax));
    ctx.fillStyle =
      analysis.margin >= MARGIN_TARGET
        ? "#22c55e"
        : analysis.margin >= 0
        ? "#f59e0b"
        : "#ef4444";
    ctx.beginPath();
    ctx.arc(opX, opY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(
      `Op (${analysis.V_required.toFixed(0)}V)`,
      opX + 8,
      opY - 6
    );
  }, [analysis]);

  useEffect(() => {
    bus.publish("tc-sizing.result", {
      inputs: {
        I_fault,
        CT_ratio,
        Z_burden,
        XoverR,
        selectedClass,
      },
      analysis,
      timestamp: new Date().toISOString(),
    });
  }, [analysis, I_fault, CT_ratio, Z_burden, XoverR, selectedClass, bus]);

  return (
    <div style={styles.root}>
      <div style={styles.title}>TC Sizing / ANSI Class</div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Entradas</div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>I falta primária (A)</label>
            <input
              type="number"
              value={I_fault}
              onChange={(e) => setIFault(parseFloat(e.target.value) || 0)}
              step={100}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label} title="Ex: 600:5">
              Razão TC
            </label>
            <input
              type="text"
              value={ratioText}
              onChange={(e) => setRatioText(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label
              style={styles.label}
              title="Burden total: secundário + cabos + relé"
            >
              Z burden (Ω)
            </label>
            <input
              type="number"
              value={Z_burden}
              onChange={(e) => setZBurden(parseFloat(e.target.value) || 0)}
              step={0.1}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label
              style={styles.label}
              title="Razão X/R do sistema — afeta offset DC"
            >
              X/R
            </label>
            <input
              type="number"
              value={XoverR}
              onChange={(e) => setXoverR(parseFloat(e.target.value) || 0)}
              step={0.5}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Classe ANSI desejada</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={styles.input}
          >
            <option value="auto">Auto-select</option>
            {ANSI_CLASSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} (V_knee={c.V_knee} V)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Curva de Magnetização</div>
        <canvas
          ref={canvasRef}
          width={560}
          height={300}
          style={styles.canvas}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Resultado</div>
        <div style={styles.resultGrid}>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Classe</div>
            <div style={styles.cardValue}>{analysis.classId}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>V_sec (steady)</div>
            <div style={styles.cardValue}>{analysis.V_steadyState} V</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>V_sec (c/ DC)</div>
            <div style={styles.cardValue}>{analysis.V_required} V</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>V_knee</div>
            <div style={styles.cardValue}>{analysis.V_knee} V</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Margem</div>
            <div
              style={{
                ...styles.cardValue,
                color: analysis.status.color,
              }}
            >
              {analysis.margin}%
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Status</div>
            <div
              style={{
                ...styles.cardValue,
                color: analysis.status.color,
              }}
            >
              {analysis.status.label}
            </div>
          </div>
        </div>

        {analysis.recommended && (
          <div style={styles.warnBox}>
            Recomende classe mais alta: <strong>{analysis.recommended}</strong>{" "}
            ou reduza o burden ({Z_burden} Ω).
          </div>
        )}
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
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
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
  warnBox: {
    marginTop: 12,
    padding: 10,
    background: "rgba(245,158,11,0.08)",
    borderLeft: "3px solid #f59e0b",
    borderRadius: 4,
    fontSize: 11,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
  },
};
