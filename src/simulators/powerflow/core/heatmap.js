/**
 * Voltage & Angle Heatmap Color Mapping
 *
 * Diverging color scales for bus visualization:
 * - Voltage: blue (low) → white (nominal 1.0) → red (high)
 * - Angle: purple (negative) → white (0° slack ref) → orange (positive)
 */

/**
 * Map bus voltage to RGB color.
 * Symmetric scaling around nominal (1.0 pu).
 *
 * @param {number} v - Voltage magnitude (pu)
 * @param {number} devLow - Deviation limit below 1.0
 * @param {number} devHigh - Deviation limit above 1.0
 * @returns {string} RGB color string
 */
export function voltageHeatmapColor(v, devLow, devHigh) {
  if (v == null || !isFinite(v)) return '#cfcfd1';

  let t;
  if (v < 1.0) {
    t = (v - 1.0) / Math.max(devLow, 1e-9);
  } else {
    t = (v - 1.0) / Math.max(devHigh, 1e-9);
  }
  const tc = Math.max(-1, Math.min(1, t));
  const lerp = (a, b, k) => Math.round(a + (b - a) * k);

  let r, g, bl;
  if (tc < 0) {
    // Below nominal: white → blue
    const k = -tc;
    r = lerp(255, 30, k);
    g = lerp(255, 111, k);
    bl = lerp(255, 206, k);
  } else {
    // Above nominal: white → red
    const k = tc;
    r = lerp(255, 217, k);
    g = lerp(255, 38, k);
    bl = lerp(255, 38, k);
  }
  return `rgb(${r},${g},${bl})`;
}

/**
 * Map bus angle to RGB color.
 * Asymmetric scaling: negative angles (purple) vs positive (orange).
 * Centered at 0° (slack bus reference).
 *
 * @param {number} thetaDeg - Angle in degrees
 * @param {number} devLowDeg - Magnitude limit for negative angles
 * @param {number} devHighDeg - Magnitude limit for positive angles
 * @returns {string} RGB color string
 */
export function angleHeatmapColor(thetaDeg, devLowDeg, devHighDeg) {
  if (thetaDeg == null || !isFinite(thetaDeg)) return '#cfcfd1';

  let t;
  if (thetaDeg < 0) {
    t = thetaDeg / Math.max(devLowDeg, 1e-9);
  } else {
    t = thetaDeg / Math.max(devHighDeg, 1e-9);
  }
  const tc = Math.max(-1, Math.min(1, t));
  const lerp = (a, b, k) => Math.round(a + (b - a) * k);

  let r, g, bl;
  if (tc < 0) {
    // Negative angles: white → purple (#5d3fa2)
    const k = -tc;
    r = lerp(255, 93, k);
    g = lerp(255, 63, k);
    bl = lerp(255, 162, k);
  } else {
    // Positive angles: white → orange (#cc5a18)
    const k = tc;
    r = lerp(255, 204, k);
    g = lerp(255, 90, k);
    bl = lerp(255, 24, k);
  }
  return `rgb(${r},${g},${bl})`;
}

/**
 * Format current value for display.
 * Thresholds: <1A (2 decimals), <1kA (integer), <10kA (1 decimal), ≥10kA (integer kA)
 *
 * @param {number} amps - Current in amperes
 * @returns {string} Formatted string with unit
 */
export function formatAmps(amps) {
  if (amps == null || !isFinite(amps) || amps < 0) return '— A';
  if (amps < 1) return amps.toFixed(2) + ' A';
  if (amps < 1000) return amps.toFixed(0) + ' A';
  if (amps < 10000) return (amps / 1000).toFixed(1) + ' kA';
  return (amps / 1000).toFixed(0) + ' kA';
}
