/**
 * CoordinationTccTool.jsx — Coordenação Primária/Backup (selectivity study)
 *
 * Verifies CTI (Coordination Time Interval) between two TCC curves
 * (primary + backup) across a defined current window. Computes gaps,
 * flags violations, and suggests a minimum TD adjustment for the backup.
 *
 * Reuses engine: tcc.js (calcTripTime, generateTccCurve)
 *
 * Publishes: "coordination-tcc.result" { curve1, curve2, CTI, gaps, status }
 *
 * @typedef {Object} CoordResultRow
 * @property {number} I       - Current sample (A)
 * @property {number} tPri    - Trip time of primary curve (s)
 * @property {number} tBak    - Trip time of backup curve (s)
 * @property {number} gap     - tBak - tPri (s)
 * @property {string} status  - "OK" | "FALHA"
 */

import { useState, useMemo, useEffect, useRef } from "react";
import {
  CURVE_TYPES,
  calcTripTime,
  generateTccCurve,
} from "../engine/tcc.js";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

const CURVE_OPTIONS = [
  { id: CURVE_TYPES.IEC_NORMAL, label: "IEC Normal Inverse" },
  { id: CURVE_TYPES.IEC_VERY_INVERSE, label: "IEC Very Inverse" },
  { id: CURVE_TYPES.IEC_EXTREMELY_INVERSE, label: "IEC Extremely Inverse" },
  { id: CURVE_TYPES.IEEE_MODERATE, label: "IEEE Moderate Inverse" },
  { id: CURVE_TYPES.IEEE_VERY_INVERSE, label: "IEEE Very Inverse" },
  { id: CURVE_TYPES.IEEE_EXTREMELY_INVERSE, label: "IEEE Extremely Inverse" },
  { id: CURVE_TYPES.ANSI_INVERSE, label: "ANSI Standard Inverse" },
  { id: CURVE_TYPES.ANSI_VERY_INVERSE, label: "ANSI Very Inverse" },
  { id: CURVE_TYPES.ANSI_EXTREMELY_INVERSE, label: "ANSI Extremely Inverse" },
  { id: CURVE_TYPES.DEFINITE_TIME, label: "Definite Time" },
];

const SAMPLE_COUNT = 16;

/**
 * Suggest minimum backup TD so gap >= CTI across the window.
 * Scales linearly: TD_min = TD_bak_actual * worstGap_required / worstGap_observed.
 *
 * @param {number} TD_bak    Current backup time dial
 * @param {number} worstGap  Smallest observed gap (s)
 * @param {number} CTI       Coordination Time Interval (s)
 * @returns {number} Suggested TD (rounded to 2 decimals)
 */
function suggestBackupTD(TD_bak, worstGap, CTI) {
  if (worstGap <= 0 || TD_bak <= 0) return TD_bak;
  const scale = CTI / worstGap;
  return Math.max(TD_bak, parseFloat((TD_bak * scale).toFixed(2)));
}

export default function CoordinationTccTool() {
  const bus = useArtifactBus();

  const [Ipickup1, setIpickup1] = useState(5.0);
  const [TD1, setTD1] = useState(0.1);
  const [curve1, setCurve1] = useState(CURVE_TYPES.IEC_VERY_INVERSE);

  const [Ipickup2, setIpickup2] = useState(5.0);
  const [TD2, setTD2] = useState(0.4);
  const [curve2, setCurve2] = useState(CURVE_TYPES.IEC_VERY_INVERSE);

  const [CTI, setCTI] = useState(0.2);
  const [Imin, setImin] = useState(10);
  const [Imax, setImax] = useState(200);

  const canvasRef = useRef(null);

  // Coordination table — sampled across the [Imin, Imax] window
  const tableRows = useMemo(() => {
    const rows = [];
    if (Imin <= 0 || Imax <= Imin) return rows;

    const logMin = Math.log(Imin);
    const logMax = Math.log(Imax);

    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const ratio = i / (SAMPLE_COUNT - 1);
      const I = Math.exp(logMin + ratio * (logMax - logMin));
      const tPri = calcTripTime(I, Ipickup1, curve1, TD1);
      const tBak = calcTripTime(I, Ipickup2, curve2, TD2);

      const gap = isFinite(tBak) && isFinite(tPri) ? tBak - tPri : Infinity;
      const status = gap >= CTI ? "OK" : "FALHA";
      rows.push({ I, tPri, tBak, gap, status });
    }
    return rows;
  }, [Ipickup1, TD1, curve1, Ipickup2, TD2, curve2, CTI, Imin, Imax]);

  const summary = useMemo(() => {
    const valid = tableRows.filter(
      (r) => isFinite(r.gap) && isFinite(r.tPri) && isFinite(r.tBak)
    );
    if (valid.length === 0) {
      return { worstGap: 0, worstI: 0, failures: 0, suggestion: TD2 };
    }
    let worst = valid[0];
    valid.forEach((r) => {
      if (r.gap < worst.gap) worst = r;
    });
    const failures = tableRows.filter((r) => r.status === "FALHA").length;
    const suggestion =
      failures > 0 ? suggestBackupTD(TD2, worst.gap, CTI) : TD2;
    return {
      worstGap: worst.gap,
      worstI: worst.I,
      failures,
      suggestion,
    };
  }, [tableRows, CTI, TD2]);

  // Draw TCC overlay on Canvas (log-log)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = "#0e1015";
    ctx.fillRect(0, 0, W, H);

    // Axis ranges (log)
    const Imin_axis = Math.min(Ipickup1, Ipickup2) * 0.8;
    const Imax_axis = Math.max(Imax, Ipickup1 * 50, Ipickup2 * 50);
    const Tmin = 0.01;
    const Tmax = 100;

    const logImin = Math.log10(Imin_axis);
    const logImax = Math.log10(Imax_axis);
    const logTmin = Math.log10(Tmin);
    const logTmax = Math.log10(Tmax);

    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 36;

    const xOf = (I) =>
      padL +
      ((Math.log10(I) - logImin) / (logImax - logImin)) * (W - padL - padR);
    const yOf = (t) =>
      padT +
      ((logTmax - Math.log10(t)) / (logTmax - logTmin)) * (H - padT - padB);

    // Grid (decades)
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 0.5;
    for (let d = Math.floor(logImin); d <= Math.ceil(logImax); d++) {
      const x = xOf(Math.pow(10, d));
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, H - padB);
      ctx.stroke();
    }
    for (let d = Math.floor(logTmin); d <= Math.ceil(logTmax); d++) {
      const y = yOf(Math.pow(10, d));
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
    }

    // Window shading (Imin → Imax)
    if (Imin > 0 && Imax > Imin) {
      ctx.fillStyle = "rgba(249, 115, 22, 0.08)";
      ctx.fillRect(xOf(Imin), padT, xOf(Imax) - xOf(Imin), H - padT - padB);
    }

    // Axes
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, H - padB);
    ctx.lineTo(W - padR, H - padB);
    ctx.stroke();

    // Labels
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px monospace";
    ctx.fillText("I (A)", W - 30, H - 8);
    ctx.fillText("t (s)", 4, padT + 8);

    // Decade tick labels
    for (let d = Math.floor(logImin); d <= Math.ceil(logImax); d++) {
      const x = xOf(Math.pow(10, d));
      ctx.fillText(`10^${d}`, x - 10, H - padB + 14);
    }
    for (let d = Math.floor(logTmin); d <= Math.ceil(logTmax); d++) {
      const y = yOf(Math.pow(10, d));
      ctx.fillText(`10^${d}`, 4, y + 4);
    }

    // Curve drawing helper
    const drawCurve = (Ipickup, curveId, TD, color) => {
      const points = generateTccCurve(Ipickup, curveId, TD, Imin_axis, Imax_axis);
      if (points.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach(([I, t], idx) => {
        if (t < Tmin || t > Tmax || I < Imin_axis || I > Imax_axis) return;
        const x = xOf(I);
        const y = yOf(t);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    drawCurve(Ipickup1, curve1, TD1, "#22c55e"); // primary — green
    drawCurve(Ipickup2, curve2, TD2, "#f97316"); // backup — orange

    // Legend
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(padL + 6, padT + 6, 10, 10);
    ctx.fillStyle = "#9ca3af";
    ctx.fillText("Primária", padL + 22, padT + 15);

    ctx.fillStyle = "#f97316";
    ctx.fillRect(padL + 90, padT + 6, 10, 10);
    ctx.fillStyle = "#9ca3af";
    ctx.fillText("Backup", padL + 106, padT + 15);
  }, [Ipickup1, TD1, curve1, Ipickup2, TD2, curve2, Imin, Imax]);

  // Publish result whenever inputs settle
  useEffect(() => {
    bus.publish("coordination-tcc.result", {
      curve1: { Ipickup: Ipickup1, TD: TD1, type: curve1 },
      curve2: { Ipickup: Ipickup2, TD: TD2, type: curve2 },
      CTI,
      window: { Imin, Imax },
      rows: tableRows,
      summary,
      timestamp: new Date().toISOString(),
    });
  }, [tableRows, summary, Ipickup1, TD1, curve1, Ipickup2, TD2, curve2, CTI, Imin, Imax, bus]);

  return (
    <div style={styles.root}>
      <div style={styles.title}>Coordenação TCC (50/51)</div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Curva 1 — Primária</div>
        <div style={styles.threeCol}>
          <div style={styles.field}>
            <label style={styles.label}>Pickup (A)</label>
            <input
              type="number"
              value={Ipickup1}
              onChange={(e) => setIpickup1(parseFloat(e.target.value) || 1)}
              step={0.5}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Time Dial</label>
            <input
              type="number"
              value={TD1}
              onChange={(e) => setTD1(parseFloat(e.target.value) || 0.1)}
              step={0.05}
              min={0.05}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Tipo</label>
            <select
              value={curve1}
              onChange={(e) => setCurve1(e.target.value)}
              style={styles.input}
            >
              {CURVE_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Curva 2 — Backup</div>
        <div style={styles.threeCol}>
          <div style={styles.field}>
            <label style={styles.label}>Pickup (A)</label>
            <input
              type="number"
              value={Ipickup2}
              onChange={(e) => setIpickup2(parseFloat(e.target.value) || 1)}
              step={0.5}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Time Dial</label>
            <input
              type="number"
              value={TD2}
              onChange={(e) => setTD2(parseFloat(e.target.value) || 0.1)}
              step={0.05}
              min={0.05}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Tipo</label>
            <select
              value={curve2}
              onChange={(e) => setCurve2(e.target.value)}
              style={styles.input}
            >
              {CURVE_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Janela & CTI</div>
        <div style={styles.threeCol}>
          <div style={styles.field}>
            <label style={styles.label} title="Coordination Time Interval">
              CTI (s)
            </label>
            <input
              type="number"
              value={CTI}
              onChange={(e) => setCTI(parseFloat(e.target.value) || 0.2)}
              step={0.05}
              min={0.05}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Imin (A)</label>
            <input
              type="number"
              value={Imin}
              onChange={(e) => setImin(parseFloat(e.target.value) || 1)}
              step={1}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Imax (A)</label>
            <input
              type="number"
              value={Imax}
              onChange={(e) => setImax(parseFloat(e.target.value) || 100)}
              step={5}
              style={styles.input}
            />
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Gráfico TCC Sobreposto</div>
        <canvas
          ref={canvasRef}
          width={560}
          height={320}
          style={styles.canvas}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Tabela de Coordenação</div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>I (A)</th>
                <th style={styles.th}>t_prim (s)</th>
                <th style={styles.th}>t_bak (s)</th>
                <th style={styles.th}>GAP (s)</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, idx) => (
                <tr key={idx}>
                  <td style={styles.td}>{r.I.toFixed(1)}</td>
                  <td style={styles.td}>
                    {isFinite(r.tPri) ? r.tPri.toFixed(3) : "∞"}
                  </td>
                  <td style={styles.td}>
                    {isFinite(r.tBak) ? r.tBak.toFixed(3) : "∞"}
                  </td>
                  <td style={styles.td}>
                    {isFinite(r.gap) ? r.gap.toFixed(3) : "—"}
                  </td>
                  <td
                    style={{
                      ...styles.td,
                      color: r.status === "OK" ? "#22c55e" : "#ef4444",
                      fontWeight: 700,
                    }}
                  >
                    {r.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Resumo</div>
        {summary.failures === 0 ? (
          <div style={styles.okBox}>
            Coordenação OK em toda a janela. Pior gap:{" "}
            <strong>{summary.worstGap.toFixed(3)} s</strong> em {summary.worstI.toFixed(1)} A.
          </div>
        ) : (
          <div style={styles.errorBox}>
            <div>
              Coordenação falha em <strong>{summary.failures}</strong> ponto(s).
              Pior gap <strong>{summary.worstGap.toFixed(3)} s</strong> em {summary.worstI.toFixed(1)} A.
            </div>
            <div style={{ marginTop: 6 }}>
              Sugestão: aumente TD backup para{" "}
              <strong>{summary.suggestion.toFixed(2)}</strong> (mínimo).
            </div>
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
  threeCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1.4fr",
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
  tableWrap: {
    maxHeight: 220,
    overflowY: "auto",
    border: "1px solid var(--bdr)",
    borderRadius: 4,
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
    position: "sticky",
    top: 0,
  },
  td: {
    padding: "5px 8px",
    color: "var(--tx)",
    borderBottom: "1px solid var(--bdr)",
  },
  okBox: {
    padding: 10,
    background: "rgba(34,197,94,0.08)",
    borderLeft: "3px solid #22c55e",
    borderRadius: 4,
    fontSize: 11,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
  },
  errorBox: {
    padding: 10,
    background: "rgba(239,68,68,0.08)",
    borderLeft: "3px solid #ef4444",
    borderRadius: 4,
    fontSize: 11,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
  },
};
