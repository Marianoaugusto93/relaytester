/**
 * ReclosingSequenceTool.jsx — Religamento (79) state machine
 *
 * Simulates an auto-reclose sequence (pattern such as "F-F-C-T") against a
 * fault scenario (permanent / transient / none) and draws the timeline with
 * lockout and trip points. Provides a heuristic success probability.
 *
 * Step codes (single chars):
 *  F = fast reclose
 *  C = capacitor (delayed reclose)
 *  T = trap close (slow / verify)
 *  U = unload
 *  R = reset
 *
 * No external state machine library — pure JS step simulator.
 *
 * Publishes: "reclosing-sequence.result"
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

const STEP_LABELS = {
  F: "Fast",
  C: "Cap. delayed",
  T: "Trap close",
  U: "Unload",
  R: "Reset",
};

const FAULT_SCENARIOS = [
  { id: "none", label: "Sem falta" },
  { id: "permanent", label: "Falta permanente" },
  { id: "transient1", label: "Falta transitória @ passo 1" },
  { id: "transient2", label: "Falta transitória @ passo 2" },
];

/**
 * Parse a pattern like "F-F-C-T" or "FFCT" into an array of step codes.
 * @param {string} pattern
 * @returns {Array<string>}
 */
function parsePattern(pattern) {
  return (pattern || "")
    .toUpperCase()
    .split("")
    .filter((c) => STEP_LABELS[c]);
}

/**
 * Simulate the reclosing sequence step-by-step.
 *
 * @param {string} pattern
 * @param {number} deadTimeMs   Time between trip and reclose attempt
 * @param {number} resetTimeS   If no fault returns within this time, sequence resets
 * @param {string} scenarioId   "none" | "permanent" | "transient1" | "transient2"
 * @returns {{
 *   steps: Array<{ index: number, code: string, label: string, tStart: number, tEnd: number, state: string }>,
 *   outcome: "lockout" | "reset" | "no-fault",
 *   successPct: number,
 *   tLockout: number | null
 * }}
 */
function simulateReclose(pattern, deadTimeMs, resetTimeS, scenarioId) {
  const steps = parsePattern(pattern);
  const results = [];
  let t = 0; // ms

  // No fault scenario: trip never happens, just shows the sequence "armed".
  if (scenarioId === "none" || steps.length === 0) {
    steps.forEach((code, i) => {
      results.push({
        index: i,
        code,
        label: STEP_LABELS[code],
        tStart: i * deadTimeMs,
        tEnd: (i + 1) * deadTimeMs,
        state: "Armado",
      });
    });
    return {
      steps: results,
      outcome: "no-fault",
      successPct: 100,
      tLockout: null,
    };
  }

  // Transient fault: clears after a specific reclose step
  const transientClearStep =
    scenarioId === "transient1" ? 0 : scenarioId === "transient2" ? 1 : -1;

  for (let i = 0; i < steps.length; i++) {
    const code = steps[i];
    const tStart = t;
    // Each step: dead time before reclose
    t += deadTimeMs;
    const tEnd = t;

    let state;
    if (i === transientClearStep) {
      state = "Religado · falta limpa";
      results.push({
        index: i,
        code,
        label: STEP_LABELS[code],
        tStart,
        tEnd,
        state,
      });
      // After successful reclose, sequence resets after resetTimeS
      const tReset = tEnd + resetTimeS * 1000;
      results.push({
        index: i + 1,
        code: "R",
        label: "Reset",
        tStart: tEnd,
        tEnd: tReset,
        state: "Aguardando reset",
      });
      return {
        steps: results,
        outcome: "reset",
        successPct: Math.max(50, 100 - i * 15),
        tLockout: null,
      };
    }

    state = i < steps.length - 1 ? "Religou · falta volta" : "Lockout";
    results.push({
      index: i,
      code,
      label: STEP_LABELS[code],
      tStart,
      tEnd,
      state,
    });
  }

  return {
    steps: results,
    outcome: "lockout",
    successPct: scenarioId === "permanent" ? 0 : 10,
    tLockout: t,
  };
}

export default function ReclosingSequenceTool() {
  const bus = useArtifactBus();

  const [pattern, setPattern] = useState("F-F-C-T");
  const [deadTimeMs, setDeadTimeMs] = useState(500);
  const [resetTimeS, setResetTimeS] = useState(10);
  const [scenario, setScenario] = useState("transient1");

  const canvasRef = useRef(null);

  const sim = useMemo(
    () => simulateReclose(pattern, deadTimeMs, resetTimeS, scenario),
    [pattern, deadTimeMs, resetTimeS, scenario],
  );

  const recommendation = useMemo(() => {
    if (sim.outcome === "no-fault") return "Sequência armada — sem ocorrências.";
    if (sim.outcome === "reset")
      return "Sequência adequada: falta transitória limpada antes de lockout.";
    if (sim.outcome === "lockout" && scenario === "permanent")
      return "Lockout esperado — falta permanente, manutenção necessária.";
    return "Aumente dead time antes de passo C para dar tempo ao arco extinguir.";
  }, [sim, scenario]);

  // Render timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = "#0e1015";
    ctx.fillRect(0, 0, W, H);

    if (sim.steps.length === 0) {
      ctx.fillStyle = "#9ca3af";
      ctx.font = "12px monospace";
      ctx.fillText("Padrão vazio", W / 2 - 30, H / 2);
      return;
    }

    const padL = 50;
    const padR = 20;
    const padT = 30;
    const padB = 32;

    const tEnd = sim.steps[sim.steps.length - 1]?.tEnd || 1;
    const xOf = (t) => padL + (t / tEnd) * (W - padL - padR);

    // Axis
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, H - padB);
    ctx.lineTo(W - padR, H - padB);
    ctx.stroke();

    // Time ticks
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px monospace";
    const ticks = 6;
    for (let i = 0; i <= ticks; i++) {
      const tt = (tEnd * i) / ticks;
      const x = xOf(tt);
      ctx.beginPath();
      ctx.moveTo(x, H - padB);
      ctx.lineTo(x, H - padB + 4);
      ctx.stroke();
      ctx.fillText(`${(tt / 1000).toFixed(1)}s`, x - 12, H - padB + 18);
    }

    // Steps
    const COLORS = {
      F: "#0ea5e9",
      C: "#a855f7",
      T: "#f59e0b",
      U: "#9ca3af",
      R: "#22c55e",
    };
    sim.steps.forEach((s) => {
      const x = xOf(s.tStart);
      const w = Math.max(2, xOf(s.tEnd) - xOf(s.tStart));
      const color = COLORS[s.code] || "#9ca3af";
      ctx.fillStyle = color;
      ctx.fillRect(x, padT, w, H - padT - padB);
      ctx.fillStyle = "#0e1015";
      ctx.font = "bold 12px monospace";
      ctx.fillText(s.code, x + 4, padT + 16);
      ctx.fillStyle = "#e5e7eb";
      ctx.font = "10px monospace";
      ctx.fillText(s.state, x + 4, padT + 30);
    });

    // Lockout marker
    if (sim.tLockout != null) {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xOf(sim.tLockout), padT - 6);
      ctx.lineTo(xOf(sim.tLockout), H - padB);
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 11px monospace";
      ctx.fillText("LOCKOUT", xOf(sim.tLockout) - 28, padT - 10);
    }

    // Legend at top
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px monospace";
    ctx.fillText(`Outcome: ${sim.outcome}`, padL, 14);
  }, [sim]);

  useEffect(() => {
    bus.publish("reclosing-sequence.result", {
      inputs: { pattern, deadTimeMs, resetTimeS, scenario },
      sim,
      recommendation,
      timestamp: new Date().toISOString(),
    });
  }, [sim, pattern, deadTimeMs, resetTimeS, scenario, recommendation, bus]);

  return (
    <div style={styles.root}>
      <div style={styles.title}>Religamento (79)</div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Sequência</div>
        <div style={styles.field}>
          <label
            style={styles.label}
            title="Padrão de passos: F=fast, C=cap delayed, T=trap, U=unload, R=reset. Ex: F-F-C-T"
          >
            Pattern
          </label>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Dead time (ms)</label>
            <input
              type="number"
              value={deadTimeMs}
              onChange={(e) => setDeadTimeMs(parseFloat(e.target.value) || 0)}
              step={50}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Reset time (s)</label>
            <input
              type="number"
              value={resetTimeS}
              onChange={(e) => setResetTimeS(parseFloat(e.target.value) || 0)}
              step={1}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Cenário</label>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            style={styles.input}
          >
            {FAULT_SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Timeline</div>
        <canvas
          ref={canvasRef}
          width={560}
          height={200}
          style={styles.canvas}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Estado dos Passos</div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Passo</th>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>Início</th>
                <th style={styles.th}>Fim</th>
                <th style={styles.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {sim.steps.map((s) => (
                <tr key={s.index}>
                  <td style={styles.td}>{s.index + 1}</td>
                  <td style={styles.td}>{s.code}</td>
                  <td style={styles.td}>{s.label}</td>
                  <td style={styles.td}>{(s.tStart / 1000).toFixed(2)}s</td>
                  <td style={styles.td}>{(s.tEnd / 1000).toFixed(2)}s</td>
                  <td style={styles.td}>{s.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Resultado</div>
        <div style={styles.resultGrid}>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Outcome</div>
            <div
              style={{
                ...styles.cardValue,
                color:
                  sim.outcome === "reset"
                    ? "#22c55e"
                    : sim.outcome === "lockout"
                    ? "#ef4444"
                    : "#9ca3af",
              }}
            >
              {sim.outcome}
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Probabilidade sucesso</div>
            <div style={styles.cardValue}>{sim.successPct}%</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Passos no padrão</div>
            <div style={styles.cardValue}>{parsePattern(pattern).length}</div>
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
