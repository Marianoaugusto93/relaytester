/**
 * ReachLoadabilityTool.jsx — Reach 21 / Loadability
 *
 * Plots standard distance-protection zones (Z1/Z2/Z3) on the R-X plane
 * together with the load line at the maximum load angle. Computes the
 * encroachment margin between Zone 2 (typical loadability concern) and
 * the load line; flags low-margin cases.
 *
 * Reuses engine: distance.js (generateStandardZones)
 *
 * Publishes: "reach-loadability.result"
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { generateStandardZones } from "../engine/distance.js";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

/**
 * Parse "600:5" → 120.
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
 * Compute encroachment margin for a Mho zone vs. load line.
 * The Mho circle reach equals the maximum impedance modulus along the MTA;
 * its impedance along the load-angle line is reach * cos(MTA - loadAngle).
 *
 * Margin (%) = (Z_zone_on_load_line - Z_load) / Z_zone_on_load_line * 100
 * Higher = safer. Negative = encroachment (load already inside zone).
 *
 * @param {number} reach        Zone reach (Ω, primary)
 * @param {number} mtaDeg       MTA of the zone (deg)
 * @param {number} loadAngleDeg Load line angle (deg)
 * @param {number} Z_load       Load impedance modulus (Ω)
 * @returns {number} margin %
 */
function calcEncroachment(reach, mtaDeg, loadAngleDeg, Z_load) {
  const mtaRad = (mtaDeg * Math.PI) / 180;
  const loadRad = (loadAngleDeg * Math.PI) / 180;
  const zOnLoad = reach * Math.cos(mtaRad - loadRad);
  if (zOnLoad <= 0) return 100; // load is on the opposite side
  return ((zOnLoad - Z_load) / zOnLoad) * 100;
}

export default function ReachLoadabilityTool() {
  const bus = useArtifactBus();

  const [Z_line, setZLine] = useState(10); // Ω primary
  const [Z_source, setZSource] = useState(2); // Ω primary
  const [ctText, setCTText] = useState("600:5");
  const [ptText, setPTText] = useState("138000:115");
  const [loadAngle, setLoadAngle] = useState(30);
  const [Z_load, setZLoad] = useState(15); // Ω primary modulus

  const canvasRef = useRef(null);

  const ratios = useMemo(
    () => ({
      CT: parseRatio(ctText),
      PT: parseRatio(ptText),
    }),
    [ctText, ptText]
  );

  const Z_sec_factor = useMemo(() => {
    // Z_sec = Z_prim * (CT_ratio / PT_ratio)
    return ratios.CT / ratios.PT;
  }, [ratios]);

  const zones = useMemo(() => generateStandardZones(Z_line), [Z_line]);

  const encroachments = useMemo(() => {
    return zones.map((z) => ({
      id: z.id,
      name: z.name,
      reach: z.reach,
      reachSec: z.reach * Z_sec_factor,
      mtaAngle: z.mtaAngle || 60,
      type: z.type,
      margin: calcEncroachment(z.reach, z.mtaAngle || 60, loadAngle, Z_load),
    }));
  }, [zones, Z_sec_factor, loadAngle, Z_load]);

  const worst = useMemo(() => {
    // Worst margin among forward Mho zones
    const forward = encroachments.filter((e) => e.type === "mho");
    if (forward.length === 0) return null;
    return forward.reduce((a, b) => (a.margin < b.margin ? a : b));
  }, [encroachments]);

  // Render R-X plane
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = "#0e1015";
    ctx.fillRect(0, 0, W, H);

    // Plot range: dominated by largest zone reach
    const maxReach = Math.max(...zones.map((z) => z.reach || 0), Z_load) * 1.3;
    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 36;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const cx = padL + plotW / 2;
    const cy = padT + plotH / 2;
    const scale = Math.min(plotW, plotH) / (2 * maxReach);

    // Grid
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 0.5;
    const grid = 4;
    for (let i = -grid; i <= grid; i++) {
      const x = cx + (i * maxReach * scale) / grid;
      const y = cy + (i * maxReach * scale) / grid;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, H - padB);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, cy);
    ctx.lineTo(W - padR, cy);
    ctx.moveTo(cx, padT);
    ctx.lineTo(cx, H - padB);
    ctx.stroke();

    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px monospace";
    ctx.fillText("R (Ω)", W - 40, cy - 4);
    ctx.fillText("X (Ω)", cx + 6, padT + 8);

    // Draw zones
    const drawMho = (reach, mtaDeg, color) => {
      const mtaRad = (mtaDeg * Math.PI) / 180;
      const centerR = (reach / 2) * Math.cos(mtaRad);
      const centerX = (reach / 2) * Math.sin(mtaRad);
      const radius = reach / 2;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(
        cx + centerR * scale,
        cy - centerX * scale,
        radius * scale,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    };

    const drawQuad = (reach, color) => {
      const r_min = -0.1 * reach;
      const r_max = 1.1 * reach;
      const x_min = -0.5 * reach;
      const x_max = 0.5 * reach;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(
        cx + r_min * scale,
        cy - x_max * scale,
        (r_max - r_min) * scale,
        (x_max - x_min) * scale
      );
      ctx.setLineDash([]);
    };

    const ZONE_COLORS = ["#22c55e", "#0ea5e9", "#a855f7", "#f59e0b"];
    zones.forEach((z, idx) => {
      const color = ZONE_COLORS[idx % ZONE_COLORS.length];
      if (z.type === "mho") drawMho(z.reach, z.mtaAngle || 60, color);
      else drawQuad(z.reach, color);
    });

    // Source impedance (back along the same MTA as Z1)
    ctx.fillStyle = "#fbbf24";
    const mta = (zones[0]?.mtaAngle || 60) * Math.PI / 180;
    const sx = cx - Z_source * Math.cos(mta) * scale;
    const sy = cy + Z_source * Math.sin(mta) * scale;
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText("Source", sx + 6, sy - 4);

    // Load line (from origin at loadAngle, length = Z_load)
    const loadRad = (loadAngle * Math.PI) / 180;
    const lx = cx + Z_load * Math.cos(loadRad) * scale;
    const ly = cy - Z_load * Math.sin(loadRad) * scale;
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(`Load (${loadAngle}°)`, lx + 6, ly - 4);

    // Origin label
    ctx.fillStyle = "#9ca3af";
    ctx.fillText("0", cx + 4, cy + 12);
  }, [zones, Z_source, Z_load, loadAngle]);

  useEffect(() => {
    bus.publish("reach-loadability.result", {
      inputs: { Z_line, Z_source, ratios, loadAngle, Z_load },
      zones,
      encroachments,
      worst,
      timestamp: new Date().toISOString(),
    });
  }, [zones, encroachments, worst, Z_line, Z_source, ratios, loadAngle, Z_load, bus]);

  return (
    <div style={styles.root}>
      <div style={styles.title}>Reach 21 / Loadability</div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Entradas</div>
        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Z linha (Ω primário)</label>
            <input
              type="number"
              value={Z_line}
              onChange={(e) => setZLine(parseFloat(e.target.value) || 1)}
              step={0.5}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Z fonte (Ω primário)</label>
            <input
              type="number"
              value={Z_source}
              onChange={(e) => setZSource(parseFloat(e.target.value) || 0)}
              step={0.1}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label} title="Ex: 600:5">
              Razão TC
            </label>
            <input
              type="text"
              value={ctText}
              onChange={(e) => setCTText(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label} title="Ex: 138000:115">
              Razão TP
            </label>
            <input
              type="text"
              value={ptText}
              onChange={(e) => setPTText(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label
              style={styles.label}
              title="Ângulo máximo de carga (típico 30-45°)"
            >
              Load angle (°)
            </label>
            <input
              type="number"
              value={loadAngle}
              onChange={(e) => setLoadAngle(parseFloat(e.target.value) || 0)}
              step={5}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label} title="|Z_load| primário (Ω)">
              |Z_load| (Ω)
            </label>
            <input
              type="number"
              value={Z_load}
              onChange={(e) => setZLoad(parseFloat(e.target.value) || 0)}
              step={0.5}
              style={styles.input}
            />
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Plano R-X</div>
        <canvas
          ref={canvasRef}
          width={560}
          height={400}
          style={styles.canvas}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Zonas</div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Zona</th>
                <th style={styles.th}>Reach (prim)</th>
                <th style={styles.th}>Reach (sec)</th>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>MTA</th>
                <th style={styles.th}>Margem</th>
              </tr>
            </thead>
            <tbody>
              {encroachments.map((e) => (
                <tr key={e.id}>
                  <td style={styles.td}>{e.id}</td>
                  <td style={styles.td}>{e.reach.toFixed(2)} Ω</td>
                  <td style={styles.td}>{e.reachSec.toFixed(3)} Ω</td>
                  <td style={styles.td}>{e.type}</td>
                  <td style={styles.td}>{e.mtaAngle}°</td>
                  <td
                    style={{
                      ...styles.td,
                      color:
                        e.margin >= 30
                          ? "#22c55e"
                          : e.margin >= 10
                          ? "#f59e0b"
                          : "#ef4444",
                      fontWeight: 700,
                    }}
                  >
                    {e.margin.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {worst && worst.margin < 10 && (
          <div style={styles.errorBox}>
            Baixa margem em <strong>{worst.id}</strong> ({worst.margin.toFixed(1)}%).
            Reduza Zone 2 reach ou aumente o load angle.
          </div>
        )}
        {worst && worst.margin >= 10 && worst.margin < 30 && (
          <div style={styles.warnBox}>
            Margem moderada em {worst.id} ({worst.margin.toFixed(1)}%). Considere
            ajustes de loadability.
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
