/**
 * UnderFrequencyTool.jsx — 81U/81O + df/dt
 *
 * Simulates a frequency trajectory (analytical sine model or constant ramp) and
 * evaluates 81U / 81O pickup with configurable dead-band and delays. Renders a
 * timeline with shaded pickup zones, df/dt subplot, and event log.
 *
 * Reuses engine: frequencyLogic.js
 *
 * Publishes: "under-frequency.result"
 */

import { useState, useMemo, useEffect, useRef } from "react";
import {
  simulateFrequencyTrajectory,
  buildSyntheticTrajectory,
} from "../engine/frequencyLogic.js";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

const DURATION_S = 15; // simulated window
const SAMPLES = 240;

export default function UnderFrequencyTool() {
  const bus = useArtifactBus();

  const [f0, setF0] = useState(60);
  const [pickup81u, setPickup81u] = useState(58.5);
  const [pickup81o, setPickup81o] = useState(61.5);
  const [deadBand, setDeadBand] = useState(0.2);
  const [delayUn, setDelayUn] = useState(5);
  const [delayOv, setDelayOv] = useState(3);

  // Trajectory model: f(t) = f0 + dF*sin(2π t / period)
  const [dF, setDF] = useState(2.5);
  const [period, setPeriod] = useState(20);

  const freqCanvas = useRef(null);
  const dfdtCanvas = useRef(null);

  const trajectory = useMemo(
    () => buildSyntheticTrajectory(f0, dF, period, DURATION_S, SAMPLES),
    [f0, dF, period],
  );

  const sim = useMemo(
    () =>
      simulateFrequencyTrajectory(trajectory, f0, pickup81u, pickup81o, {
        deadBand,
        delayUn,
        delayOv,
      }),
    [trajectory, f0, pickup81u, pickup81o, deadBand, delayUn, delayOv],
  );

  // Render frequency-vs-time
  useEffect(() => {
    const canvas = freqCanvas.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = "#0e1015";
    ctx.fillRect(0, 0, W, H);

    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 32;

    const fmin = Math.min(pickup81u - 1, ...sim.samples.map((s) => s.f));
    const fmax = Math.max(pickup81o + 1, ...sim.samples.map((s) => s.f));
    const tmax = sim.samples[sim.samples.length - 1]?.t || 1;

    const xOf = (t) => padL + (t / tmax) * (W - padL - padR);
    const yOf = (f) =>
      padT + ((fmax - f) / Math.max(1e-6, fmax - fmin)) * (H - padT - padB);

    // Grid
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 5; i++) {
      const y = padT + (i / 5) * (H - padT - padB);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      const x = padL + (i / 5) * (W - padL - padR);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, H - padB);
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

    // Pickup zones (shaded)
    ctx.fillStyle = "rgba(239, 68, 68, 0.10)";
    ctx.fillRect(padL, yOf(fmin) - 1, W - padL - padR, yOf(pickup81u) - yOf(fmin));
    ctx.fillStyle = "rgba(245, 158, 11, 0.10)";
    ctx.fillRect(padL, yOf(pickup81o), W - padL - padR, yOf(fmax) - yOf(pickup81o));

    // Threshold lines
    ctx.strokeStyle = "#ef4444";
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, yOf(pickup81u));
    ctx.lineTo(W - padR, yOf(pickup81u));
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.font = "10px monospace";
    ctx.fillText(`81U ${pickup81u}Hz`, W - padR - 80, yOf(pickup81u) - 4);

    ctx.strokeStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(padL, yOf(pickup81o));
    ctx.lineTo(W - padR, yOf(pickup81o));
    ctx.stroke();
    ctx.fillStyle = "#f59e0b";
    ctx.fillText(`81O ${pickup81o}Hz`, W - padR - 80, yOf(pickup81o) - 4);
    ctx.setLineDash([]);

    // Nominal
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(padL, yOf(f0));
    ctx.lineTo(W - padR, yOf(f0));
    ctx.stroke();

    // Trace
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    sim.samples.forEach((s, i) => {
      const x = xOf(s.t);
      const y = yOf(s.f);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Trip marker
    if (sim.tripped && sim.tripTime != null) {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xOf(sim.tripTime), padT);
      ctx.lineTo(xOf(sim.tripTime), H - padB);
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.fillText("TRIP", xOf(sim.tripTime) + 4, padT + 12);
    }

    // Labels
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px monospace";
    ctx.fillText("Hz", 8, padT + 8);
    ctx.fillText("t (s)", W - 38, H - 8);
    ctx.fillText(`${fmin.toFixed(1)}`, 8, H - padB);
    ctx.fillText(`${fmax.toFixed(1)}`, 8, padT + 16);
  }, [sim, f0, pickup81u, pickup81o]);

  // Render df/dt subplot
  useEffect(() => {
    const canvas = dfdtCanvas.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = "#0e1015";
    ctx.fillRect(0, 0, W, H);

    const padL = 50;
    const padR = 20;
    const padT = 14;
    const padB = 28;

    const tmax = sim.samples[sim.samples.length - 1]?.t || 1;
    const dvals = sim.samples.map((s) => s.dfdt);
    const dmax = Math.max(1, ...dvals.map(Math.abs));

    const xOf = (t) => padL + (t / tmax) * (W - padL - padR);
    const yOf = (d) => padT + (1 - (d + dmax) / (2 * dmax)) * (H - padT - padB);

    // Grid
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(padL, yOf(0));
    ctx.lineTo(W - padR, yOf(0));
    ctx.stroke();

    // Axes
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, H - padB);
    ctx.lineTo(W - padR, H - padB);
    ctx.stroke();

    // Trace
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    sim.samples.forEach((s, i) => {
      const x = xOf(s.t);
      const y = yOf(s.dfdt);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px monospace";
    ctx.fillText("df/dt", 8, padT + 8);
    ctx.fillText("Hz/s", 8, H - padB);
  }, [sim]);

  useEffect(() => {
    bus.publish("under-frequency.result", {
      inputs: { f0, pickup81u, pickup81o, deadBand, delayUn, delayOv, dF, period },
      events: sim.events,
      tripped: sim.tripped,
      tripTime: sim.tripTime,
      maxDfdt: sim.maxDfdt,
      timestamp: new Date().toISOString(),
    });
  }, [sim, f0, pickup81u, pickup81o, deadBand, delayUn, delayOv, dF, period, bus]);

  return (
    <div style={styles.root}>
      <div style={styles.title}>Subrequência 81U/81O + df/dt</div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Trajetória de Frequência</div>
        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>f nominal (Hz)</label>
            <select
              value={f0}
              onChange={(e) => setF0(parseFloat(e.target.value))}
              style={styles.input}
            >
              <option value={60}>60</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Excursão dF (Hz)</label>
            <input
              type="number"
              value={dF}
              onChange={(e) => setDF(parseFloat(e.target.value) || 0)}
              step={0.1}
              style={styles.input}
            />
          </div>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Período (s)</label>
          <input
            type="number"
            value={period}
            onChange={(e) => setPeriod(parseFloat(e.target.value) || 1)}
            step={1}
            style={styles.input}
          />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Pickups & Dead-band</div>
        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Pickup 81U (Hz)</label>
            <input
              type="number"
              value={pickup81u}
              onChange={(e) => setPickup81u(parseFloat(e.target.value) || 0)}
              step={0.1}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Pickup 81O (Hz)</label>
            <input
              type="number"
              value={pickup81o}
              onChange={(e) => setPickup81o(parseFloat(e.target.value) || 0)}
              step={0.1}
              style={styles.input}
            />
          </div>
        </div>
        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Dead-band (Hz)</label>
            <input
              type="number"
              value={deadBand}
              onChange={(e) => setDeadBand(parseFloat(e.target.value) || 0)}
              step={0.05}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Delay 81U (s)</label>
            <input
              type="number"
              value={delayUn}
              onChange={(e) => setDelayUn(parseFloat(e.target.value) || 0)}
              step={0.5}
              style={styles.input}
            />
          </div>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Delay 81O (s)</label>
          <input
            type="number"
            value={delayOv}
            onChange={(e) => setDelayOv(parseFloat(e.target.value) || 0)}
            step={0.5}
            style={styles.input}
          />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Timeline f(t)</div>
        <canvas
          ref={freqCanvas}
          width={560}
          height={280}
          style={styles.canvas}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>df/dt</div>
        <canvas
          ref={dfdtCanvas}
          width={560}
          height={120}
          style={styles.canvas}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Resultados</div>
        <div style={styles.resultGrid}>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Tripped</div>
            <div
              style={{
                ...styles.cardValue,
                color: sim.tripped ? "#ef4444" : "#22c55e",
              }}
            >
              {sim.tripped ? "SIM" : "NÃO"}
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Trip t</div>
            <div style={styles.cardValue}>
              {sim.tripTime != null ? `${sim.tripTime.toFixed(2)} s` : "—"}
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>df/dt máx</div>
            <div style={styles.cardValue}>
              {sim.maxDfdt.toFixed(2)} Hz/s
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Eventos</div>
            <div style={styles.cardValue}>{sim.events.length}</div>
          </div>
        </div>

        <div style={styles.eventLog}>
          {sim.events.length === 0 ? (
            <div style={{ color: "var(--tx3)", fontSize: 11 }}>
              Sem eventos — frequência dentro dos limites.
            </div>
          ) : (
            sim.events.map((e, i) => (
              <div key={i} style={styles.eventRow}>
                <span style={styles.eventTime}>{e.t.toFixed(2)} s</span>
                <span style={styles.eventType}>{e.type}</span>
                <span>{e.message}</span>
              </div>
            ))
          )}
        </div>

        {sim.tripped && (
          <div style={styles.infoBox}>
            Recomendação: ative load shedding ou verifique geração — frequência
            cruzou pickup por {Math.abs(sim.tripTime || 0).toFixed(1)} s.
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
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: 10,
    marginBottom: 12,
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
  eventLog: {
    background: "var(--card2)",
    border: "1px solid var(--bdr)",
    borderRadius: 4,
    padding: 10,
    maxHeight: 140,
    overflow: "auto",
    fontSize: 11,
    fontFamily: "var(--fm)",
    color: "var(--tx)",
  },
  eventRow: {
    display: "grid",
    gridTemplateColumns: "60px 70px 1fr",
    gap: 6,
    padding: "2px 0",
    borderBottom: "1px solid var(--bdr)",
  },
  eventTime: { color: "var(--cyan)" },
  eventType: { color: "var(--tx3)", textTransform: "uppercase" },
  infoBox: {
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
