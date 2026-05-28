/**
 * graphEngine.js — Pure math engine for R-X plane and TCC visualization.
 *
 * Exports:
 *   mhoCircle        — Mho zone circle parameters in secondary ohms
 *   quadZone         — Quadrilateral impedance zone polygon
 *   impedanceFromPhasors — Calculate Z = V/I from phasor inputs
 *   buildTccDataset  — Wrap tcc.js generateTccCurve into {I, t} arrays
 *   pathFromPoints   — Convert [x,y][] to SVG path string
 *   logAxisTicks     — Generate major/minor log-axis tick values
 *
 * No React dependencies. Reuses complex.js and tcc.js.
 */

import { c, mul, div, polar } from './complex.js';
import { generateTccCurve, calcTripTime, CURVE_TYPES } from './tcc.js';

// ---------------------------------------------------------------------------
// mhoCircle
// ---------------------------------------------------------------------------

/**
 * Generate Mho zone circle parameters in the R-X plane.
 *
 * The Mho characteristic is a circle whose diameter lies along the MTA ray.
 * Center is at (zReach/2 * cos(mta), zReach/2 * sin(mta)) and radius = zReach/2.
 *
 * @param {number} zReach - Zone reach in secondary ohms (e.g. 8 for zone 1)
 * @param {number} mta    - Maximum Torque Angle in degrees [0..180]
 * @returns {{ cx: number, cy: number, r: number }} Circle center and radius
 */
export function mhoCircle(zReach, mta) {
  const rad = (mta * Math.PI) / 180;
  const r = zReach / 2;
  return {
    cx: r * Math.cos(rad),
    cy: r * Math.sin(rad),
    r,
  };
}

// ---------------------------------------------------------------------------
// quadZone
// ---------------------------------------------------------------------------

/**
 * Rotate a 2-D point [x, y] by `deg` degrees around the origin.
 * @param {[number, number]} pt  - Point [x, y]
 * @param {number}           deg - Rotation in degrees (counter-clockwise)
 * @returns {[number, number]}
 */
function rotatePoint([x, y], deg) {
  if (!deg) return [x, y];
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [x * cos - y * sin, x * sin + y * cos];
}

/**
 * Generate a quadrilateral impedance zone polygon in the R-X plane.
 *
 * Returns 4 corner points in counter-clockwise order:
 *   [rMin,xMin] → [rMax,xMin] → [rMax,xMax] → [rMin,xMax]
 *
 * If tiltDeg is provided, all 4 corners are rotated by that angle around
 * the origin (useful for forward/reverse offset characteristics).
 *
 * @param {{ rMin: number, rMax: number, xMin: number, xMax: number, tiltDeg?: number }} params
 * @returns {[number, number][]} Array of 4 corner points [[r,x], ...]
 */
export function quadZone({ rMin, rMax, xMin, xMax, tiltDeg = 0 }) {
  const corners = [
    [rMin, xMin],
    [rMax, xMin],
    [rMax, xMax],
    [rMin, xMax],
  ];
  if (!tiltDeg) return corners;
  return corners.map((pt) => rotatePoint(pt, tiltDeg));
}

// ---------------------------------------------------------------------------
// impedanceFromPhasors
// ---------------------------------------------------------------------------

/**
 * Calculate impedance Z = V / I from phasor inputs.
 *
 * Each phasor is { mag: number, ang: number } where ang is in degrees.
 * Internally converts to rectangular complex form, divides, and returns
 * { r: resistance, x: reactance } in secondary ohms.
 *
 * @param {{ mag: number, ang: number }} V - Voltage phasor
 * @param {{ mag: number, ang: number }} I - Current phasor
 * @returns {{ r: number, x: number }} Impedance components
 * @throws {Error} If current magnitude is zero
 */
export function impedanceFromPhasors(V, I) {
  // Convert polar phasors to rectangular complex numbers
  const vRad = (V.ang * Math.PI) / 180;
  const iRad = (I.ang * Math.PI) / 180;
  const vC = c(V.mag * Math.cos(vRad), V.mag * Math.sin(vRad));
  const iC = c(I.mag * Math.cos(iRad), I.mag * Math.sin(iRad));

  const Z = div(vC, iC);
  return { r: Z.r, x: Z.i };
}

// ---------------------------------------------------------------------------
// buildTccDataset
// ---------------------------------------------------------------------------

/**
 * Build TCC dataset by wrapping generateTccCurve from tcc.js.
 *
 * generateTccCurve signature: (Ipickup, curve, timeDial, minCurrent, maxCurrent)
 * Returns array of [current, time] pairs; this function unpacks into {I, t}.
 *
 * Fixture: IEC_VERY_INVERSE, pickup=1A, TD=0.5, M=2 → t ≈ 6.75s (±1%)
 *   Formula: t = 0.5 * 13.5 / (2^1 - 1) = 6.75 ✓
 *
 * @param {object[]} stages     - Array of stage objects (not used internally;
 *                                caller supplies curveType/pickup/timeDial per stage)
 * @param {string}   curveType  - Curve type key from CURVE_TYPES
 * @param {number}   [pickup=1] - Pickup current in secondary Amperes
 * @param {number}   [timeDial=0.5] - Time dial setting
 * @param {number}   [sampleCount=80] - Number of sample points
 * @returns {{ I: number[], t: number[] }} Parallel arrays of current and trip time
 */
export function buildTccDataset(
  stages,
  curveType,
  pickup = 1,
  timeDial = 0.5,
  sampleCount = 80
) {
  // Log-spaced curve from just above pickup to 100× pickup
  const minCurrent = pickup * 1.001;
  const maxCurrent = pickup * 100;

  const raw = generateTccCurve(pickup, curveType, timeDial, minCurrent, maxCurrent);

  // Inject exact anchor points at integer multiples (2×, 3×, 5×, 10×, 20×, 50×)
  // so that fixture checks at M=2 always land within numerical precision.
  const anchors = [2, 3, 5, 10, 20, 50].map((m) => {
    const current = pickup * m;
    const time = calcTripTime(current, pickup, curveType, timeDial);
    return isFinite(time) && time > 0 ? [current, time] : null;
  }).filter(Boolean);

  // Merge raw + anchors, sort by current, remove near-duplicates (within 0.1%)
  const merged = [...raw, ...anchors].sort((a, b) => a[0] - b[0]);
  const deduped = merged.filter((pt, idx) => {
    if (idx === 0) return true;
    return Math.abs(pt[0] - merged[idx - 1][0]) > merged[idx - 1][0] * 0.001;
  });

  const I = deduped.map(([current]) => current);
  const t = deduped.map(([, time]) => time);

  return { I, t };
}

// ---------------------------------------------------------------------------
// pathFromPoints
// ---------------------------------------------------------------------------

/**
 * Convert an array of [x, y] points to an SVG path string.
 *
 * Scaling is applied before output: finalX = x * scaleX, finalY = y * scaleY.
 * For log-scale axes, pass Math.log10 transformation already applied in x/y,
 * then multiply by pixel-per-decade here.
 *
 * Output format: "M x0 y0 L x1 y1 L x2 y2 ..."
 * No curve smoothing — linear segments only.
 *
 * @param {[number, number][]} points - Array of [x, y] coordinate pairs
 * @param {number}             scaleX - Horizontal scale factor
 * @param {number}             scaleY - Vertical scale factor
 * @returns {string} SVG path d attribute string
 */
export function pathFromPoints(points, scaleX, scaleY) {
  if (!points || points.length === 0) return '';

  const parts = points.map(([x, y], idx) => {
    const sx = x * scaleX;
    const sy = y * scaleY;
    return `${idx === 0 ? 'M' : 'L'} ${sx} ${sy}`;
  });

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// logAxisTicks
// ---------------------------------------------------------------------------

/**
 * Generate major (decade) and minor (intermediate) tick values for log axes.
 *
 * Current axis (1A–10kA): major decades [1, 10, 100, 1000, 10000]
 *   minor: 1.5, 2, 3, 5 within each decade (×1 multiplier per decade)
 *
 * Time axis (0.01s–1000s): major decades [0.01, 0.1, 1, 10, 100, 1000]
 *   minor: same intermediate ratios [1.5, 2, 3, 5] per decade
 *
 * Both filtered to the [min, max] window inclusive of endpoints.
 *
 * @param {number}          min  - Axis minimum value
 * @param {number}          max  - Axis maximum value
 * @param {'current'|'time'} axis - Axis type selector
 * @returns {{ major: number[], minor: number[] }}
 */
export function logAxisTicks(min, max, axis) {
  // Determine decade span
  const minExp = Math.floor(Math.log10(min));
  const maxExp = Math.ceil(Math.log10(max));

  const major = [];
  const minor = [];

  // Intermediate ratios within each decade (relative to decade base)
  const minorRatios = [1.5, 2, 3, 5];

  for (let exp = minExp; exp <= maxExp; exp++) {
    const base = Math.pow(10, exp);

    // Major tick at each decade
    if (base >= min && base <= max) {
      major.push(base);
    }

    // Minor ticks between this decade and the next
    for (const ratio of minorRatios) {
      const val = base * ratio;
      if (val >= min && val <= max) {
        minor.push(val);
      }
    }
  }

  return { major, minor };
}
