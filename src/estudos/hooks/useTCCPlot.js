/**
 * useTCCPlot.js — Hook for TCC (Time-Current Characteristic) plot computation.
 *
 * Produces SVG path strings, log-axis tick data, and intersection analysis
 * for up to 5 simultaneous protection curves. All computation is pure math;
 * no React state is written here — results are memoised via useMemo.
 *
 * Coordinate system:
 *   Canvas 600×500 with margins: left=60, right=120, top=20, bottom=50
 *   Plot area: 420×430 px
 *   X: log10(I), range [0, 4] → 1A to 10kA
 *   Y: log10(t), range [-2, 3]  → 0.01s to 1000s, inverted (low t = top)
 */

import { useMemo } from 'react';
import { buildTccDataset, logAxisTicks } from '../engine/graphEngine.js';
import { CURVE_TYPES } from '../engine/tcc.js';

// ---------------------------------------------------------------------------
// Canvas constants
// ---------------------------------------------------------------------------

export const CANVAS_W = 600;
export const CANVAS_H = 500;
export const MARGIN = { left: 60, right: 120, top: 20, bottom: 50 };
export const PLOT_W = CANVAS_W - MARGIN.left - MARGIN.right; // 420
export const PLOT_H = CANVAS_H - MARGIN.top  - MARGIN.bottom; // 430

// Axis domain (log10 values)
const LOG_I_MIN = 0;    // 10^0  = 1 A
const LOG_I_MAX = 4;    // 10^4  = 10 kA
const LOG_T_MIN = -2;   // 10^-2 = 0.01 s
const LOG_T_MAX = 3;    // 10^3  = 1000 s

// Max curves enforced by caller but also capped here as safety
const MAX_CURVES = 5;

// ---------------------------------------------------------------------------
// Coordinate helpers (exported for TCCPlot hover hit-test)
// ---------------------------------------------------------------------------

/**
 * Convert (current A, time s) to SVG pixel coordinates inside the plot area.
 * Call result is relative to the top-left corner of the plot area, i.e.
 * caller must add MARGIN.left and MARGIN.top for absolute SVG position.
 *
 * @param {number} I  - Current in Amperes (> 0)
 * @param {number} t  - Time in seconds (> 0)
 * @returns {{ px: number, py: number }}
 */
export function curveToPixels(I, t) {
  if (I <= 0 || t <= 0) return { px: -999, py: -999 };
  const logI = Math.log10(I);
  const logT = Math.log10(t);
  const px = ((logI - LOG_I_MIN) / (LOG_I_MAX - LOG_I_MIN)) * PLOT_W;
  // Y is inverted: small time → top
  const py = ((LOG_T_MAX - logT) / (LOG_T_MAX - LOG_T_MIN)) * PLOT_H;
  return { px, py };
}

/**
 * Reverse transform: SVG pixel (relative to plot area) → (I, t).
 *
 * @param {number} px - X pixel relative to plot origin
 * @param {number} py - Y pixel relative to plot origin
 * @returns {{ I: number, t: number }}
 */
export function pixelsToCurve(px, py) {
  const logI = LOG_I_MIN + (px / PLOT_W) * (LOG_I_MAX - LOG_I_MIN);
  const logT = LOG_T_MAX - (py / PLOT_H) * (LOG_T_MAX - LOG_T_MIN);
  return { I: Math.pow(10, logI), t: Math.pow(10, logT) };
}

// ---------------------------------------------------------------------------
// generateCurvePath
// ---------------------------------------------------------------------------

/**
 * Build an SVG path string for a single TCC curve.
 *
 * Uses buildTccDataset from graphEngine (which calls generateTccCurve from
 * tcc.js internally) and maps each {I, t} sample to pixel coordinates.
 * Points outside the canvas domain are silently dropped.
 *
 * @param {number} pickup     - Pickup current in secondary A
 * @param {number} timeDial   - Time dial [0.1 .. 10]
 * @param {string} curveType  - Key from CURVE_TYPES
 * @param {number} [sampleCount=80] - Number of log-spaced samples
 * @returns {string} SVG path d attribute ("M x y L x y …")
 */
export function generateCurvePath(pickup, timeDial, curveType, sampleCount = 80) {
  if (!pickup || pickup <= 0 || !timeDial || timeDial <= 0) return '';
  if (!Object.values(CURVE_TYPES).includes(curveType)) return '';

  const { I: currents, t: times } = buildTccDataset(
    null,
    curveType,
    pickup,
    timeDial,
    sampleCount
  );

  const parts = [];
  for (let i = 0; i < currents.length; i++) {
    const Iv = currents[i];
    const tv = times[i];
    if (!isFinite(Iv) || !isFinite(tv) || Iv <= 0 || tv <= 0) continue;

    const logI = Math.log10(Iv);
    const logT = Math.log10(tv);
    if (logI < LOG_I_MIN || logI > LOG_I_MAX) continue;
    if (logT < LOG_T_MIN || logT > LOG_T_MAX) continue;

    const { px, py } = curveToPixels(Iv, tv);
    parts.push(`${parts.length === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// findIntersection
// ---------------------------------------------------------------------------

/**
 * Find intersection points between two TCC curves sampled at identical
 * current points.  Uses sign-change detection in log-log space to locate
 * crossings, then linear interpolation to refine the current value.
 *
 * Numerically stable: all arithmetic is in log space to avoid divide-by-zero
 * near the axis edges; degenerate segments (Δlog = 0) are skipped.
 *
 * @param {{ I: number[], t: number[] }} dataset1 - Curve 1 samples
 * @param {{ I: number[], t: number[] }} dataset2 - Curve 2 samples
 * @returns {Array<{ I: number, t: number, delta_t: number }>} Intersection list
 */
export function findIntersection(dataset1, dataset2) {
  const { I: I1, t: t1 } = dataset1;
  const { I: I2, t: t2 } = dataset2;

  if (!I1 || !I2 || I1.length < 2 || I2.length < 2) return [];

  // Build a unified current grid (log-spaced, 200 points in plot domain)
  const N = 200;
  const logMin = LOG_I_MIN;
  const logMax = LOG_I_MAX;
  const grid = [];
  for (let k = 0; k <= N; k++) {
    grid.push(Math.pow(10, logMin + (k / N) * (logMax - logMin)));
  }

  // Interpolate times for each curve at each grid point (log-log interpolation)
  function interpTime(currents, times, Itarget) {
    if (Itarget <= currents[0]) return times[0];
    if (Itarget >= currents[currents.length - 1]) return times[times.length - 1];
    for (let i = 0; i < currents.length - 1; i++) {
      if (Itarget >= currents[i] && Itarget <= currents[i + 1]) {
        const logI0 = Math.log10(currents[i]);
        const logI1 = Math.log10(currents[i + 1]);
        const logT0 = Math.log10(times[i]);
        const logT1 = Math.log10(times[i + 1]);
        const dLogI = logI1 - logI0;
        if (Math.abs(dLogI) < 1e-12) return times[i];
        const frac = (Math.log10(Itarget) - logI0) / dLogI;
        return Math.pow(10, logT0 + frac * (logT1 - logT0));
      }
    }
    return Infinity;
  }

  // For each grid point compute delta = log(t1) - log(t2); sign change = crossing
  const intersections = [];
  let prevDelta = null;
  let prevI = null;

  for (let k = 0; k < grid.length; k++) {
    const Ig = grid[k];
    const ta = interpTime(I1, t1, Ig);
    const tb = interpTime(I2, t2, Ig);

    if (!isFinite(ta) || !isFinite(tb) || ta <= 0 || tb <= 0) {
      prevDelta = null;
      prevI = null;
      continue;
    }

    const delta = Math.log10(ta) - Math.log10(tb);

    if (prevDelta !== null && prevI !== null && prevDelta * delta < 0) {
      // Sign change: interpolate crossing in log space
      const denom = delta - prevDelta;
      if (Math.abs(denom) < 1e-12) {
        prevDelta = delta;
        prevI = Ig;
        continue;
      }
      const frac = -prevDelta / denom;
      const logIcross = Math.log10(prevI) + frac * (Math.log10(Ig) - Math.log10(prevI));
      const Icross = Math.pow(10, logIcross);
      const tcross = interpTime(I1, t1, Icross);
      const tcross2 = interpTime(I2, t2, Icross);
      const dt = Math.abs(tcross - tcross2);

      if (isFinite(tcross) && tcross > 0) {
        intersections.push({
          I: parseFloat(Icross.toFixed(3)),
          t: parseFloat(tcross.toFixed(4)),
          delta_t: parseFloat(dt.toFixed(4)),
        });
      }
    }

    prevDelta = delta;
    prevI = Ig;
  }

  return intersections;
}

// ---------------------------------------------------------------------------
// buildAxisData
// ---------------------------------------------------------------------------

/**
 * Build tick arrays for the X (current) and Y (time) log axes.
 * Uses logAxisTicks from graphEngine.
 *
 * @returns {{ xTicks, xLabels, xMinorTicks, yTicks, yLabels, yMinorTicks }}
 */
function buildAxisData() {
  const { major: xMajor, minor: xMinor } = logAxisTicks(1, 10000, 'current');
  const { major: yMajor, minor: yMinor } = logAxisTicks(0.01, 1000, 'time');

  const fmtI = (v) => {
    if (v >= 1000) return `${v / 1000}kA`;
    return `${v}A`;
  };
  const fmtT = (v) => {
    if (v >= 1) return `${v}s`;
    return `${v}s`;
  };

  return {
    xTicks: xMajor,
    xLabels: xMajor.map(fmtI),
    xMinorTicks: xMinor,
    yTicks: yMajor,
    yLabels: yMajor.map(fmtT),
    yMinorTicks: yMinor,
  };
}

// ---------------------------------------------------------------------------
// useTCCPlot hook
// ---------------------------------------------------------------------------

/**
 * Hook that computes all data needed by TCCPlot:
 *   - SVG path strings keyed by curve descriptor
 *   - Intersection analysis between every pair
 *   - Axis tick data
 *
 * @param {object[]} curveDefs   - Array of curve descriptors:
 *   [{ id: string, pickup: number, timeDial: number, curveType: string }, ...]
 *   Up to MAX_CURVES (5) items; extras are silently ignored.
 * @param {boolean}  showCoordination - Whether to compute intersections
 * @returns {{
 *   paths: Record<string, string>,
 *   datasets: Record<string, { I: number[], t: number[] }>,
 *   intersections: Array<{curve1: string, curve2: string, I: number, t: number, delta_t: number}>,
 *   axis: object,
 *   capped: boolean
 * }}
 */
export function useTCCPlot(curveDefs = [], showCoordination = false) {
  const capped = curveDefs.length > MAX_CURVES;
  const safeDefs = curveDefs.slice(0, MAX_CURVES);

  const defsSignature = safeDefs.map(d => `${d.id}:${d.curveType}:${d.pickup}:${d.timeDial}`).join('|');

  const axis = useMemo(() => buildAxisData(), []);

  const { paths, datasets } = useMemo(() => {
    const paths = {};
    const datasets = {};
    for (const def of safeDefs) {
      const key = def.id;
      const ds = buildTccDataset(null, def.curveType, def.pickup, def.timeDial, 80);
      datasets[key] = ds;
      paths[key] = generateCurvePath(def.pickup, def.timeDial, def.curveType, 80);
    }
    return { paths, datasets };
  }, [defsSignature]);

  const intersections = useMemo(() => {
    if (!showCoordination || safeDefs.length < 2) return [];
    const result = [];
    for (let a = 0; a < safeDefs.length; a++) {
      for (let b = a + 1; b < safeDefs.length; b++) {
        const keyA = safeDefs[a].id;
        const keyB = safeDefs[b].id;
        if (!datasets[keyA] || !datasets[keyB]) continue;
        const pts = findIntersection(datasets[keyA], datasets[keyB]);
        for (const pt of pts) {
          result.push({ curve1: keyA, curve2: keyB, ...pt });
        }
      }
    }
    return result;
  }, [showCoordination, defsSignature]);

  return { paths, datasets, intersections, axis, capped };
}
