/**
 * DifferentialTransformerTool.jsx — Trafo Diferencial 87T com vector group
 *
 * Applies a vector-group rotation to the primary current before computing
 * I_diff/I_restrain, evaluates the dual-slope differential characteristic,
 * and plots the operating point on the slope diagram.
 *
 * Reuses engine: differential.js (evaluateDifferential, generateStandardTransformerChar)
 *
 * Publishes: "differential-transformer.result"
 */

import { useState, useMemo, useEffect, useRef } from "react";
import {
  evaluateDifferential,
  generateStandardTransformerChar,
} from "../engine/differential.js";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

// Common transformer vector groups → primary-side phase rotation (deg).
// Positive rotation = HV leads LV.
const VECTOR_GROUPS = [
  { id: "Yy0", rotation: 0, label: "Yy0 — sem deslocamento" },
  { id: "Yd1", rotation: -30, label: "Yd1 — Y(HV) Δ(LV), HV atrasa 30°" },
  { id: "Dy1", rotation: -30, label: "Dy1 — Δ(HV) Y(LV), HV atrasa 30°" },
  { id: "Yd5", rotation: -150, label: "Yd5 — atraso 150°" },
  { id: "Dy5", rotation: -150, label: "Dy5 — atraso 150°" },
  { id: "Yd11", rotation: 30, label: "Yd11 — HV adianta 30°" },
  { id: "Dy11", rotation: 30, label: "Dy11 — HV adianta 30°" },
];

const SLOPES = [5, 10, 15, 25];

export default function DifferentialTransformerTool() {
  const bus = useArtifactBus();

  const [I_pri, setIPri] = useState(50);
  const [I_sec, setISec] = useState(48);
  const [vectorId, setVectorId] = useState("Yd1");
  const [tapPct, setTapPct] = useState(0);
  const [slope, setSlope] = useState(25);

  const canvasRef = useRef(null);

  const vector = useMemo(
    () => VECTOR_GROUPS.find((v) => v.id === vectorId) || VECTOR_GROUPS[0],
    [vectorId]
  );

  const analysis = useMemo(() => {
    // Tap correction: scale primary current by (1 + tap%/100)
    const tapFactor = 1 + tapPct / 100;
    const I_pri_corrected = I_pri * tapFactor;

    // Apply vector-group phase rotation
    const I_primary = { mag: I_pri_corrected, ang: vector.rotation };
    const I_secondary = { mag: I_sec, ang: 0 };

    // Build characteristic — slope2 uses chosen slope, slope1 stays at half
    const char = generateStandardTransformerChar(20, 100);
    char.slope1 = Math.max(5, slope / 2);
    char.slope2 = slope;

    const result = evaluateDifferential(I_primary, I_secondary, char, 0);

    // Decide operation region
    let region = "Restrain";
    let regionColor = "#22c55e";
    if (result.tripped) {
      region = "TRIP";
      regionColor = "#ef4444";
    } else if (
      result.I_diff > char.pickup * 0.8 &&
      result.I_diff < result.Op_threshold
    ) {
      region = "Retenção";
      regionColor = "#f59e0b";
    }

    return {
      ...result,
      char,
      region,
      regionColor,
      I_pri_corrected,
    };
  }, [I_pri, I_sec, vector, tapPct, slope]);

  // Plot dual-slope characteristic with operating point.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = "#0e1015";
    ctx.fillRect(0, 0, W, H);

    const Imax_axis = Math.max(
      analysis.I_restrain * 1.4,
      analysis.char.knee * 3,
      40
    );
    const Diff_max = Math.max(
      analysis.I_diff * 1.4,
      analysis.Op_threshold * 1.4,
      30
    );

    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 36;

    const xOf = (Ir) =>
      padL + (Ir / Imax_axis) * (W - padL - padR);
    const yOf = (Id) =>
      padT + ((Diff_max - Id) / Diff_max) * (H - padT - padB);

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
    ctx.fillText("I_restrain (A)", W - 90, H - 8);
    ctx.fillText("I_diff (A)", 4, padT + 8);

    // Operating curve (dual-slope)
    const STEPS = 60;
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const c = analysis.char;
    for (let i = 0; i <= STEPS; i++) {
      const Ir = (i / STEPS) * Imax_axis;
      const Id =
        Ir <= c.knee
          ? c.pickup + (c.slope1 / 100) * Ir
          : c.pickup +
            (c.slope1 / 100) * c.knee +
            (c.slope2 / 100) * (Ir - c.knee);
      const x = xOf(Ir);
      const y = yOf(Id);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Knee marker
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(
      xOf(c.knee),
      yOf(c.pickup + (c.slope1 / 100) * c.knee),
      3,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.fillText(`Knee=${c.knee.toFixed(0)}A`, xOf(c.knee) + 6, yOf(c.pickup + (c.slope1 / 100) * c.knee) - 4);

    // Operating point
    const opX = xOf(Math.min(analysis.I_restrain, Imax_axis));
    const opY = yOf(Math.min(analysis.I_diff, Diff_max));
    ctx.fillStyle = analysis.regionColor;
    ctx.beginPath();
    ctx.arc(opX, opY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(
      `(${analysis.I_restrain.toFixed(1)}, ${analysis.I_diff.toFixed(1)})`,
      opX + 8,
      opY - 6
    );
  }, [analysis]);

  useEffect(() => {
    bus.publish("differential-transformer.result", {
      inputs: { I_pri, I_sec, vectorGroup: vector.id, tapPct, slope },
      analysis,
      timestamp: new Date().toISOString(),
    });
  }, [analysis, I_pri, I_sec, vector, tapPct, slope, bus]);

  return (
    <div style={styles.root}>
      <div style={styles.title}>Trafo Diferencial 87T</div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Entradas</div>
        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>I primária (A)</label>
            <input
              type="number"
              value={I_pri}
              onChange={(e) => setIPri(parseFloat(e.target.value) || 0)}
              step={1}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>I secundária (A)</label>
            <input
              type="number"
              value={I_sec}
              onChange={(e) => setISec(parseFloat(e.target.value) || 0)}
              step={1}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Vector group</label>
          <select
            value={vectorId}
            onChange={(e) => setVectorId(e.target.value)}
            style={styles.input}
          >
            {VECTOR_GROUPS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label} title="LTC tap position">
              Tap (%)
            </label>
            <input
              type="number"
              value={tapPct}
              onChange={(e) => setTapPct(parseFloat(e.target.value) || 0)}
              step={1}
              min={-15}
              max={15}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label} title="Slope ANSI (slope2 do dual-slope)">
              Slope (%)
            </label>
            <select
              value={slope}
              onChange={(e) => setSlope(parseFloat(e.target.value))}
              style={styles.input}
            >
              {SLOPES.map((s) => (
                <option key={s} value={s}>
                  {s}%
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Característica Dual-Slope</div>
        <canvas
          ref={canvasRef}
          width={560}
          height={320}
          style={styles.canvas}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Resultado</div>
        <div style={styles.resultGrid}>
          <div style={styles.card}>
            <div style={styles.cardLabel}>I_diff (A)</div>
            <div style={styles.cardValue}>{analysis.I_diff}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>I_restrain (A)</div>
            <div style={styles.cardValue}>{analysis.I_restrain}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Threshold (A)</div>
            <div style={styles.cardValue}>{analysis.Op_threshold}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Margem</div>
            <div style={styles.cardValue}>{analysis.margin_pct}%</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Região</div>
            <div
              style={{
                ...styles.cardValue,
                color: analysis.regionColor,
              }}
            >
              {analysis.region}
            </div>
          </div>
        </div>

        {analysis.region === "TRIP" && (
          <div style={styles.errorBox}>
            TRIP: I_diff {analysis.I_diff} A &gt; threshold {analysis.Op_threshold} A.
            Verifique se a slope ({slope}%) é adequada para evitar falsos trips
            em through-faults.
          </div>
        )}
        {analysis.region === "Retenção" && (
          <div style={styles.warnBox}>
            Operando na zona de retenção. Slope {slope}% adequada — ou aumente
            slope para maior segurança.
          </div>
        )}
        {analysis.region === "Restrain" && (
          <div style={styles.okBox}>
            Estável (Restrain). Slope {slope}% adequada para o ponto atual.
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
    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
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
  okBox: {
    marginTop: 12,
    padding: 10,
    background: "rgba(34,197,94,0.08)",
    borderLeft: "3px solid #22c55e",
    borderRadius: 4,
    fontSize: 11,
    color: "var(--tx)",
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
  errorBox: {
    marginTop: 12,
    padding: 10,
    background: "rgba(239,68,68,0.08)",
    borderLeft: "3px solid #ef4444",
    borderRadius: 4,
    fontSize: 11,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
  },
};
