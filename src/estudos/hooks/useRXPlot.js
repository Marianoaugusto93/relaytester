/**
 * useRXPlot.js — R-X plane computation hook
 *
 * Provides:
 *   - SVG path strings for mho (circle) and quad (polygon) zones
 *   - Grid lines (major every 1Ω, minor every 0.5Ω)
 *   - Axis tick values
 *   - hitTest(r, x) → {inZone1, inZone2, inZone3}
 *   - Coordinate transform helpers
 */

import { useMemo } from "react";

// SVG canvas constants — origin at center
const SVG_W = 500;
const SVG_H = 500;
const ORIGIN_X = SVG_W / 2; // 250
const ORIGIN_Y = SVG_H / 2; // 250

// Default pixels-per-ohm at scale=1
const BASE_PX_PER_OHM = 40;

/**
 * Convert physical ohms to SVG pixel coordinates.
 * R-axis is horizontal (right = positive R).
 * X-axis is vertical (up = positive X, so svgY decreases as x increases).
 *
 * @param {number} r     - Resistance in ohms
 * @param {number} x     - Reactance in ohms
 * @param {number} scale - Zoom scale factor
 * @returns {{ svgX: number, svgY: number }}
 */
export function transformToSvg(r, x, scale = 1) {
  const pxPerOhm = BASE_PX_PER_OHM * scale;
  return {
    svgX: ORIGIN_X + r * pxPerOhm,
    svgY: ORIGIN_Y - x * pxPerOhm,
  };
}

/**
 * Convert SVG pixel coordinates back to physical ohms.
 *
 * @param {number} svgX  - Horizontal SVG pixel
 * @param {number} svgY  - Vertical SVG pixel
 * @param {number} scale - Zoom scale factor
 * @returns {{ r: number, x: number }}
 */
export function transformFromSvg(svgX, svgY, scale = 1) {
  const pxPerOhm = BASE_PX_PER_OHM * scale;
  return {
    r: (svgX - ORIGIN_X) / pxPerOhm,
    x: -(svgY - ORIGIN_Y) / pxPerOhm,
  };
}

/**
 * Test whether point (px, py) lies inside a circle (cx, cy, r).
 *
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} cx - Circle center X
 * @param {number} cy - Circle center Y
 * @param {number} r  - Circle radius
 * @returns {boolean}
 */
export function pointInCircle(px, py, cx, cy, r) {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

/**
 * Test whether point (px, py) lies inside a polygon defined by an array
 * of [x, y] vertices using the ray-casting algorithm.
 *
 * @param {number}          px      - Point X
 * @param {number}          py      - Point Y
 * @param {[number,number][]} polygon - Array of [x, y] vertices
 * @returns {boolean}
 */
export function pointInPolygon(px, py, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Build SVG path string for a mho circle zone.
 * Uses SVG <circle> approach but returns an arc path for memo-ability
 * (callers can also just use the cx/cy/r directly).
 *
 * @param {{ cx: number, cy: number, r: number }} mho   - Zone in ohms
 * @param {number}                                scale  - Zoom scale
 * @returns {string} SVG path d string (full circle arc)
 */
function buildMhoPath(mho, scale) {
  if (!mho) return "";
  const { svgX: cx, svgY: cy } = transformToSvg(mho.cx, mho.cy, scale);
  const pxPerOhm = BASE_PX_PER_OHM * scale;
  const r = mho.r * pxPerOhm;
  // Two arcs forming a full circle
  return (
    `M ${cx - r} ${cy} ` +
    `A ${r} ${r} 0 1 1 ${cx + r} ${cy} ` +
    `A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
  );
}

/**
 * Build SVG path string for a quadrilateral zone polygon.
 *
 * @param {[number,number][]} polygon - Array of [r, x] corner points in ohms
 * @param {number}            scale   - Zoom scale
 * @returns {string} SVG path d string
 */
function buildQuadPath(polygon, scale) {
  if (!polygon || polygon.length === 0) return "";
  return polygon
    .map(([r, x], i) => {
      const { svgX, svgY } = transformToSvg(r, x, scale);
      return `${i === 0 ? "M" : "L"} ${svgX} ${svgY}`;
    })
    .join(" ") + " Z";
}

/**
 * Generate major and minor grid lines for the R-X plane.
 * Major every 1Ω, minor every 0.5Ω.
 *
 * @param {number} scale - Zoom scale
 * @returns {{ major: {x1,y1,x2,y2,axis}[], minor: {x1,y1,x2,y2,axis}[] }}
 */
function buildGridLines(scale) {
  const pxPerOhm = BASE_PX_PER_OHM * scale;
  // Visible ohm range from origin: how many ohms fit in half the SVG
  const halfW = ORIGIN_X / pxPerOhm;
  const halfH = ORIGIN_Y / pxPerOhm;

  const major = [];
  const minor = [];

  // Vertical lines (constant R)
  const rMin = Math.ceil(-halfW);
  const rMax = Math.floor(halfW);
  for (let r = rMin; r <= rMax; r += 0.5) {
    const svgX = ORIGIN_X + r * pxPerOhm;
    const line = { x1: svgX, y1: 0, x2: svgX, y2: SVG_H, axis: "r", value: r };
    if (Number.isInteger(r)) {
      major.push(line);
    } else {
      minor.push(line);
    }
  }

  // Horizontal lines (constant X)
  const xMin = Math.ceil(-halfH);
  const xMax = Math.floor(halfH);
  for (let x = xMin; x <= xMax; x += 0.5) {
    const svgY = ORIGIN_Y - x * pxPerOhm;
    const line = { x1: 0, y1: svgY, x2: SVG_W, y2: svgY, axis: "x", value: x };
    if (Number.isInteger(x)) {
      major.push(line);
    } else {
      minor.push(line);
    }
  }

  return { major, minor };
}

/**
 * Generate axis tick label positions for R and X axes.
 *
 * @param {number} scale - Zoom scale
 * @returns {{ r: {value, svgX, svgY}[], x: {value, svgX, svgY}[] }}
 */
function buildTicks(scale) {
  const pxPerOhm = BASE_PX_PER_OHM * scale;
  const halfW = ORIGIN_X / pxPerOhm;
  const halfH = ORIGIN_Y / pxPerOhm;

  const rTicks = [];
  const xTicks = [];

  const rMin = Math.ceil(-halfW);
  const rMax = Math.floor(halfW);
  for (let r = rMin; r <= rMax; r++) {
    if (r === 0) continue;
    rTicks.push({ value: r, svgX: ORIGIN_X + r * pxPerOhm, svgY: ORIGIN_Y });
  }

  const xMin = Math.ceil(-halfH);
  const xMax = Math.floor(halfH);
  for (let x = xMin; x <= xMax; x++) {
    if (x === 0) continue;
    xTicks.push({ value: x, svgX: ORIGIN_X, svgY: ORIGIN_Y - x * pxPerOhm });
  }

  return { r: rTicks, x: xTicks };
}

/**
 * useRXPlot — R-X plane visualization hook.
 *
 * @param {{ mho?: {cx,cy,r}, quad?: [number,number][], [key]: any }} zones  - Zone geometry
 * @param {number} scale - Zoom scale (default 1.0)
 * @returns {{
 *   svgPaths: { mho: string, quad: string },
 *   gridLines: { major: object[], minor: object[] },
 *   ticks: { r: object[], x: object[] },
 *   hitTest: (r: number, x: number) => { inZone1: bool, inZone2: bool, inZone3: bool }
 * }}
 */
export default function useRXPlot(zones = {}, scale = 1) {
  const svgPaths = useMemo(() => {
    return {
      mho: zones.mho ? buildMhoPath(zones.mho, scale) : "",
      quad: zones.quad ? buildQuadPath(zones.quad, scale) : "",
    };
  }, [zones, scale]);

  const gridLines = useMemo(() => buildGridLines(scale), [scale]);

  const ticks = useMemo(() => buildTicks(scale), [scale]);

  const hitTest = useMemo(() => {
    return function(r, x) {
      let inZone1 = false;
      let inZone2 = false;
      let inZone3 = false;

      if (zones.mho) {
        inZone1 = pointInCircle(r, x, zones.mho.cx, zones.mho.cy, zones.mho.r);
      }
      if (zones.zone2Mho) {
        inZone2 = pointInCircle(r, x, zones.zone2Mho.cx, zones.zone2Mho.cy, zones.zone2Mho.r);
      } else if (zones.quad) {
        inZone2 = pointInPolygon(r, x, zones.quad);
      }
      if (zones.zone3Mho) {
        inZone3 = pointInCircle(r, x, zones.zone3Mho.cx, zones.zone3Mho.cy, zones.zone3Mho.r);
      } else if (zones.zone3Quad) {
        inZone3 = pointInPolygon(r, x, zones.zone3Quad);
      }

      return { inZone1, inZone2, inZone3 };
    };
  }, [zones]);

  return { svgPaths, gridLines, ticks, hitTest };
}
