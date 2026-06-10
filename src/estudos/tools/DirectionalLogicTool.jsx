/**
 * DirectionalLogicTool.jsx — Polarização Direcional (32/67/67N)
 *
 * Evaluates a directional element via torque-style polarization. Shows the
 * phasor diagram with V (polarizing), I (operating), and the MTA reference,
 * plus the resulting quadrant (Forward / Reverse / Dead-zone / Unknown).
 *
 * Reuses engine: directionalLogic.js
 *
 * Publishes: "directional-logic.result"
 */

import { useState, useMemo, useEffect, useRef } from "react";
import {
  evaluateDirectional,
  directionalRecommendation,
} from "../engine/directionalLogic.js";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

const METHODS = [
  { id: "V2", label: "V2 (sequência negativa)" },
  { id: "3V0", label: "3V0 (residual)" },
  { id: "I2", label: "I2 (cross-polarização)" },
];

const POLARITIES = [
  { id: "forward", label: "Forward" },
  { id: "reverse", label: "Reverse" },
];

export default function DirectionalLogicTool() {
  const bus = useArtifactBus();

  const [Vmag, setVmag] = useState(67);
  const [Vang, setVang] = useState(0);
  const [Imag, setImag] = useState(5);
  const [Iang, setIang] = useState(-60);
  const [mta, setMta] = useState(30);
  const [method, setMethod] = useState("V2");
  const [polarity, setPolarity] = useState("forward");

  const canvasRef = useRef(null);

  const result = useMemo(
    () => evaluateDirectional(Vmag, Vang, Imag, Iang, mta, polarity),
    [Vmag, Vang, Imag, Iang, mta, polarity],
  );

  const recommendation = useMemo(
    () => directionalRecommendation(result),
    [result],
  );

  // Render phasor diagram on the complex plane
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = "#0e1015";
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const Rmax = Math.min(W, H) / 2 - 24;

    // Normalize magnitudes for plotting
    const VmagNorm = Vmag > 0 ? Rmax * 0.8 : 0;
    const ImagNorm = Imag > 0 ? Rmax * 0.6 : 0;

    // Concentric grid
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (Rmax * i) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Cross
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - Rmax, cy);
    ctx.lineTo(cx + Rmax, cy);
    ctx.moveTo(cx, cy - Rmax);
    ctx.lineTo(cx, cy + Rmax);
    ctx.stroke();

    // Forward / Reverse zones (semi-transparent wedges)
    const Vrad = (Vang * Math.PI) / 180;
    const mtaRad = (mta * Math.PI) / 180;
    // Forward direction is V rotated by -MTA (operating current must be within ±90° of it).
    const fwdRad = Vrad - mtaRad;
    const sweepStart = fwdRad - Math.PI / 2;
    const sweepEnd = fwdRad + Math.PI / 2;

    ctx.fillStyle = "rgba(34, 197, 94, 0.10)";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, Rmax, -sweepEnd, -sweepStart);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(239, 68, 68, 0.10)";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, Rmax, -sweepEnd + Math.PI, -sweepStart + Math.PI);
    ctx.closePath();
    ctx.fill();

    // MTA reference line
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(fwdRad) * Rmax,
      cy - Math.sin(fwdRad) * Rmax,
    );
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#f59e0b";
    ctx.font = "10px monospace";
    ctx.fillText(
      `MTA ${mta}°`,
      cx + Math.cos(fwdRad) * (Rmax - 30) + 4,
      cy - Math.sin(fwdRad) * (Rmax - 30) - 4,
    );

    // V phasor (cyan)
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(Vrad) * VmagNorm, cy - Math.sin(Vrad) * VmagNorm);
    ctx.stroke();
    ctx.fillStyle = "#0ea5e9";
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(Vrad) * VmagNorm,
      cy - Math.sin(Vrad) * VmagNorm,
      4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillText(
      `V (${Vmag.toFixed(0)}V ∠${Vang}°)`,
      cx + Math.cos(Vrad) * VmagNorm + 6,
      cy - Math.sin(Vrad) * VmagNorm - 4,
    );

    // I phasor (purple)
    const Irad = (Iang * Math.PI) / 180;
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(Irad) * ImagNorm, cy - Math.sin(Irad) * ImagNorm);
    ctx.stroke();
    ctx.fillStyle = "#a855f7";
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(Irad) * ImagNorm,
      cy - Math.sin(Irad) * ImagNorm,
      4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillText(
      `I (${Imag.toFixed(2)}A ∠${Iang}°)`,
      cx + Math.cos(Irad) * ImagNorm + 6,
      cy - Math.sin(Irad) * ImagNorm + 12,
    );

    // Quadrant label
    ctx.fillStyle =
      result.quadrant === "Forward"
        ? "#22c55e"
        : result.quadrant === "Reverse"
        ? "#ef4444"
        : "#9ca3af";
    ctx.font = "bold 12px monospace";
    ctx.fillText(result.quadrant, 12, 20);
  }, [Vmag, Vang, Imag, Iang, mta, result]);

  useEffect(() => {
    bus.publish("directional-logic.result", {
      inputs: { Vmag, Vang, Imag, Iang, mta, method, polarity },
      result,
      recommendation,
      timestamp: new Date().toISOString(),
    });
  }, [result, recommendation, Vmag, Vang, Imag, Iang, mta, method, polarity, bus]);

  const torquePctOfMax =
    result.torqueMax > 0
      ? (result.torque / result.torqueMax) * 100
      : 0;

  return (
    <div style={styles.root}>
      <div style={styles.title}>Polarização Direcional 32/67/67N</div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Entradas</div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>V polarização (V)</label>
            <input
              type="number"
              value={Vmag}
              onChange={(e) => setVmag(parseFloat(e.target.value) || 0)}
              step={1}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>V ângulo (°)</label>
            <input
              type="number"
              value={Vang}
              onChange={(e) => setVang(parseFloat(e.target.value) || 0)}
              step={5}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>I corrente (A)</label>
            <input
              type="number"
              value={Imag}
              onChange={(e) => setImag(parseFloat(e.target.value) || 0)}
              step={0.1}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>I ângulo (°)</label>
            <input
              type="number"
              value={Iang}
              onChange={(e) => setIang(parseFloat(e.target.value) || 0)}
              step={5}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label} title="Maximum Torque Angle, 0-180°">
              MTA (°)
            </label>
            <input
              type="number"
              value={mta}
              onChange={(e) => setMta(parseFloat(e.target.value) || 0)}
              step={5}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Polaridade</label>
            <select
              value={polarity}
              onChange={(e) => setPolarity(e.target.value)}
              style={styles.input}
            >
              {POLARITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Método</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={styles.input}
          >
            {METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Plano Complexo</div>
        <canvas
          ref={canvasRef}
          width={560}
          height={360}
          style={styles.canvas}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Resultado</div>
        <div style={styles.resultGrid}>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Quadrante</div>
            <div
              style={{
                ...styles.cardValue,
                color:
                  result.quadrant === "Forward"
                    ? "#22c55e"
                    : result.quadrant === "Reverse"
                    ? "#ef4444"
                    : "#f59e0b",
              }}
            >
              {result.quadrant}
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Ângulo de torque</div>
            <div style={styles.cardValue}>
              {result.torqueAngle.toFixed(1)}°
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Torque (rel.)</div>
            <div style={styles.cardValue}>
              {torquePctOfMax.toFixed(1)}%
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Decisão</div>
            <div
              style={{
                ...styles.cardValue,
                color: result.forward ? "#22c55e" : "#ef4444",
              }}
            >
              {result.forward ? "TRIP" : "BLOQUEADO"}
            </div>
          </div>
        </div>

        <div style={styles.infoBox}>{recommendation}</div>
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
