/**
 * InrushDiscriminationTool.jsx — Inrush 2nd/5th Harmonic Detection
 *
 * Generates a synthetic inrush-like waveform sample (decaying DC + harmonics),
 * computes harmonic spectrum via FFT, evaluates inrush detection and presents
 * the classification + block window.
 *
 * Reuses engine: inrush.js (calcHarmonicSpectrum, evaluateInrush)
 *
 * Publishes: "inrush-discrimination.result"
 */

import { useState, useMemo, useEffect, useRef } from "react";
import {
  calcHarmonicSpectrum,
  evaluateInrush,
} from "../engine/inrush.js";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

const SAMPLES_PER_CYCLE = 32;

/**
 * Generate one cycle of a synthetic inrush waveform.
 *
 * Inrush model (informal): unipolar current burst with strong DC offset and
 * high 2nd-harmonic content; tunable via %h2 and %h5.
 *
 * @param {number} I1   Fundamental peak (A)
 * @param {number} h2pct  %H2 of fundamental
 * @param {number} h5pct  %H5 of fundamental
 * @param {number} dcPct  DC offset as % of fundamental
 * @returns {Array<number>}
 */
function synthInrushCycle(I1, h2pct, h5pct, dcPct) {
  const samples = new Array(SAMPLES_PER_CYCLE);
  for (let i = 0; i < SAMPLES_PER_CYCLE; i++) {
    const theta = (2 * Math.PI * i) / SAMPLES_PER_CYCLE;
    const fund = I1 * Math.sin(theta);
    const h2 = I1 * (h2pct / 100) * Math.sin(2 * theta + Math.PI / 4);
    const h5 = I1 * (h5pct / 100) * Math.sin(5 * theta);
    const dc = I1 * (dcPct / 100);
    samples[i] = fund + h2 + h5 + dc;
  }
  return samples;
}

export default function InrushDiscriminationTool() {
  const bus = useArtifactBus();

  const [I1, setI1] = useState(100);
  const [h2pct, setH2pct] = useState(25);
  const [h5pct, setH5pct] = useState(8);
  const [dcPct, setDcPct] = useState(20);

  const [thresholdH2, setThresholdH2] = useState(20);
  const [thresholdH5, setThresholdH5] = useState(10);
  const [blocking, setBlocking] = useState(true);

  const spectrumCanvas = useRef(null);
  const timelineCanvas = useRef(null);

  const samples = useMemo(
    () => synthInrushCycle(I1, h2pct, h5pct, dcPct),
    [I1, h2pct, h5pct, dcPct]
  );

  const spectrum = useMemo(() => calcHarmonicSpectrum(samples), [samples]);

  const evaluation = useMemo(() => {
    const ev = evaluateInrush(
      spectrum.I_1,
      spectrum.I_2,
      spectrum.dc_offset,
      { h2_threshold_pct: thresholdH2 }
    );
    return ev;
  }, [spectrum, thresholdH2]);

  const classification = useMemo(() => {
    const h2 = evaluation.I_2_pct || 0;
    const h5_pct =
      spectrum.I_1 > 0 ? (spectrum.I_3 / spectrum.I_1) * 100 : 0; // I_3 used as proxy
    // 5th harmonic is not directly computed; we use H5 sample provided
    const h5_input = h5pct;
    if (h2 > thresholdH2 || h5_input > thresholdH5) {
      return {
        label: "Inrush",
        color: "#f59e0b",
        action: blocking ? "BLOQUEADO" : "Detectado",
      };
    }
    if (h2 < thresholdH2 / 2) {
      return { label: "Falta", color: "#ef4444", action: "TRIP liberado" };
    }
    return { label: "Indeterminado", color: "#9ca3af", action: "—" };
  }, [evaluation, spectrum, h5pct, thresholdH2, thresholdH5, blocking]);

  // Spectrum bar chart
  useEffect(() => {
    const canvas = spectrumCanvas.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = "#0e1015";
    ctx.fillRect(0, 0, W, H);

    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 40;

    const h2_pct = spectrum.I_1 > 0 ? (spectrum.I_2 / spectrum.I_1) * 100 : 0;
    const h3_pct = spectrum.I_1 > 0 ? (spectrum.I_3 / spectrum.I_1) * 100 : 0;

    const bars = [
      { label: "Fund.", value: 100, color: "#0ea5e9" },
      { label: "H2", value: h2_pct, color: "#f59e0b" },
      { label: "H3", value: h3_pct, color: "#a855f7" },
      { label: "H5", value: h5pct, color: "#ec4899" },
    ];

    const maxVal = Math.max(100, ...bars.map((b) => b.value)) * 1.1;
    const slot = (W - padL - padR) / bars.length;
    const barW = slot * 0.55;

    // Grid
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 4; i++) {
      const y = padT + (i / 4) * (H - padT - padB);
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
    ctx.fillText("%", 4, padT + 8);

    // Threshold lines
    const yOf = (v) => padT + ((maxVal - v) / maxVal) * (H - padT - padB);

    ctx.strokeStyle = "#f59e0b";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, yOf(thresholdH2));
    ctx.lineTo(W - padR, yOf(thresholdH2));
    ctx.stroke();
    ctx.fillStyle = "#f59e0b";
    ctx.fillText(`H2 thr ${thresholdH2}%`, W - padR - 80, yOf(thresholdH2) - 4);
    ctx.setLineDash([]);

    // Bars
    bars.forEach((b, idx) => {
      const x = padL + slot * idx + (slot - barW) / 2;
      const y = yOf(b.value);
      const h = H - padB - y;
      ctx.fillStyle = b.color;
      ctx.fillRect(x, y, barW, h);
      ctx.fillStyle = "#e5e7eb";
      ctx.fillText(`${b.value.toFixed(0)}%`, x + 2, y - 4);
      ctx.fillStyle = "#9ca3af";
      ctx.fillText(b.label, x + 4, H - padB + 14);
    });
  }, [spectrum, h5pct, thresholdH2]);

  // Timeline: simple bar showing block window in first 150 ms
  useEffect(() => {
    const canvas = timelineCanvas.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = "#0e1015";
    ctx.fillRect(0, 0, W, H);

    const padL = 40;
    const padR = 20;
    const padT = 16;
    const padB = 28;
    const T_max = 500; // ms
    const T_block = 150; // ms typical inrush window

    const xOf = (t) => padL + (t / T_max) * (W - padL - padR);

    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, H - padB);
    ctx.lineTo(W - padR, H - padB);
    ctx.stroke();

    // Ticks
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px monospace";
    for (let t = 0; t <= T_max; t += 100) {
      const x = xOf(t);
      ctx.beginPath();
      ctx.moveTo(x, H - padB);
      ctx.lineTo(x, H - padB + 4);
      ctx.stroke();
      ctx.fillText(`${t}ms`, x - 12, H - padB + 18);
    }
    ctx.fillText("Energização", padL, padT + 4);

    // Block window
    const blockColor = blocking && classification.label === "Inrush"
      ? "rgba(245, 158, 11, 0.5)"
      : "rgba(107, 114, 128, 0.25)";
    ctx.fillStyle = blockColor;
    ctx.fillRect(xOf(0), padT + 10, xOf(T_block) - xOf(0), H - padB - padT - 14);

    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(
      blocking && classification.label === "Inrush"
        ? `Bloqueio ativo 0-${T_block}ms`
        : "Sem bloqueio",
      xOf(0) + 6,
      padT + 28
    );

    // Post-block release marker
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xOf(T_block), padT + 6);
    ctx.lineTo(xOf(T_block), H - padB);
    ctx.stroke();
    ctx.fillStyle = "#22c55e";
    ctx.fillText("trip liberado", xOf(T_block) + 4, padT + 18);
  }, [blocking, classification]);

  useEffect(() => {
    bus.publish("inrush-discrimination.result", {
      inputs: { I1, h2pct, h5pct, dcPct, thresholdH2, thresholdH5, blocking },
      spectrum,
      evaluation,
      classification,
      timestamp: new Date().toISOString(),
    });
  }, [
    spectrum,
    evaluation,
    classification,
    I1,
    h2pct,
    h5pct,
    dcPct,
    thresholdH2,
    thresholdH5,
    blocking,
    bus,
  ]);

  return (
    <div style={styles.root}>
      <div style={styles.title}>Inrush Discrimination 2nd/5th</div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Onda Sintética</div>
        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Fundamental I_1 (A)</label>
            <input
              type="number"
              value={I1}
              onChange={(e) => setI1(parseFloat(e.target.value) || 1)}
              step={5}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>DC offset (% de I_1)</label>
            <input
              type="number"
              value={dcPct}
              onChange={(e) => setDcPct(parseFloat(e.target.value) || 0)}
              step={1}
              style={styles.input}
            />
          </div>
        </div>
        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>%H2</label>
            <input
              type="number"
              value={h2pct}
              onChange={(e) => setH2pct(parseFloat(e.target.value) || 0)}
              step={1}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>%H5</label>
            <input
              type="number"
              value={h5pct}
              onChange={(e) => setH5pct(parseFloat(e.target.value) || 0)}
              step={1}
              style={styles.input}
            />
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Thresholds & Bloqueio</div>
        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Threshold %H2</label>
            <input
              type="number"
              value={thresholdH2}
              onChange={(e) => setThresholdH2(parseFloat(e.target.value) || 0)}
              step={1}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Threshold %H5</label>
            <input
              type="number"
              value={thresholdH5}
              onChange={(e) => setThresholdH5(parseFloat(e.target.value) || 0)}
              step={1}
              style={styles.input}
            />
          </div>
        </div>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={blocking}
            onChange={(e) => setBlocking(e.target.checked)}
          />
          <span style={{ marginLeft: 6 }}>Bloqueia (visualizar)</span>
        </label>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Espectro Harmônico</div>
        <canvas
          ref={spectrumCanvas}
          width={560}
          height={260}
          style={styles.canvas}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Timeline de Bloqueio</div>
        <canvas
          ref={timelineCanvas}
          width={560}
          height={120}
          style={styles.canvas}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Classificação</div>
        <div style={styles.resultGrid}>
          <div style={styles.card}>
            <div style={styles.cardLabel}>%H2 medido</div>
            <div style={styles.cardValue}>{evaluation.I_2_pct}%</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>DC offset</div>
            <div style={styles.cardValue}>{evaluation.dc_offset_pct}%</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Saturação</div>
            <div style={styles.cardValue}>{evaluation.saturation}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Classificação</div>
            <div
              style={{ ...styles.cardValue, color: classification.color }}
            >
              {classification.label}
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Ação</div>
            <div
              style={{ ...styles.cardValue, color: classification.color }}
            >
              {classification.action}
            </div>
          </div>
        </div>

        <div style={styles.exampleBox}>
          Exemplo: energização de trafo a 0.0s → alta %H2 no período 0-150ms →
          bloqueio → após 150ms %H2 cai, trip liberado.
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
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: 11,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
    marginTop: 6,
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
  exampleBox: {
    marginTop: 12,
    padding: 10,
    background: "rgba(14,165,233,0.08)",
    borderLeft: "3px solid var(--cyan)",
    borderRadius: 4,
    fontSize: 11,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
    fontStyle: "italic",
  },
};
