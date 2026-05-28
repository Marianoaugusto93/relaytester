/**
 * inrush.js — Inrush (transient) blocking and detection
 *
 * Implements:
 * - 2nd harmonic ratio detection (I_2 / I_1 threshold)
 * - DC offset detection
 * - Flux linkage saturation detection
 * - Inrush vs. Fault discrimination
 *
 * Inrush waveform has high 2nd harmonic content due to transformer core saturation.
 * Faults have minimal even harmonic content.
 *
 * Inputs: Phase current waveform or harmonic spectrum
 * Outputs: Inrush flag, confidence level, 2nd/1st harmonic ratio
 */

/**
 * Inrush detection configuration.
 * @typedef {Object} InrushConfig
 * @property {number} h2_threshold_pct - 2nd harmonic threshold as % of fundamental
 * @property {number} dc_threshold_pct - DC offset threshold
 * @property {number} flux_threshold - Flux saturation indicator
 * @property {boolean} use_restraint - Use as restraint (block diff) vs. alarm
 */

/**
 * Calculate harmonic spectrum from waveform samples.
 * Returns fundamental (1st), 2nd, and 3rd harmonic amplitudes.
 * Assumes 16 samples per cycle at 60 Hz.
 *
 * @param {Array<number>} samples - Current waveform samples (16 per cycle typical)
 * @returns {Object} {I_1, I_2, I_3, dc_offset}
 */
export function calcHarmonicSpectrum(samples) {
  if (!samples || samples.length < 4) {
    return { I_1: 0, I_2: 0, I_3: 0, dc_offset: 0 };
  }

  const n = samples.length;
  const two_pi_n = (2 * Math.PI) / n;

  // DC offset
  const dc_offset = samples.reduce((a, b) => a + b, 0) / n;

  // Remove DC
  const ac = samples.map(s => s - dc_offset);

  // Fundamental (1st harmonic)
  let I_1_cos = 0,
    I_1_sin = 0;
  for (let i = 0; i < n; i++) {
    I_1_cos += ac[i] * Math.cos(1 * two_pi_n * i);
    I_1_sin += ac[i] * Math.sin(1 * two_pi_n * i);
  }
  I_1_cos = (I_1_cos * 2) / n;
  I_1_sin = (I_1_sin * 2) / n;
  const I_1 = Math.sqrt(I_1_cos * I_1_cos + I_1_sin * I_1_sin);

  // 2nd harmonic
  let I_2_cos = 0,
    I_2_sin = 0;
  for (let i = 0; i < n; i++) {
    I_2_cos += ac[i] * Math.cos(2 * two_pi_n * i);
    I_2_sin += ac[i] * Math.sin(2 * two_pi_n * i);
  }
  I_2_cos = (I_2_cos * 2) / n;
  I_2_sin = (I_2_sin * 2) / n;
  const I_2 = Math.sqrt(I_2_cos * I_2_cos + I_2_sin * I_2_sin);

  // 3rd harmonic
  let I_3_cos = 0,
    I_3_sin = 0;
  for (let i = 0; i < n; i++) {
    I_3_cos += ac[i] * Math.cos(3 * two_pi_n * i);
    I_3_sin += ac[i] * Math.sin(3 * two_pi_n * i);
  }
  I_3_cos = (I_3_cos * 2) / n;
  I_3_sin = (I_3_sin * 2) / n;
  const I_3 = Math.sqrt(I_3_cos * I_3_cos + I_3_sin * I_3_sin);

  return {
    I_1: parseFloat(I_1.toFixed(4)),
    I_2: parseFloat(I_2.toFixed(4)),
    I_3: parseFloat(I_3.toFixed(4)),
    dc_offset: parseFloat(dc_offset.toFixed(4)),
  };
}

/**
 * Detect inrush based on 2nd harmonic ratio.
 * Inrush: I_2 / I_1 typically > 15-20%
 * Fault: I_2 / I_1 typically < 5%
 *
 * @param {number} I_1 - Fundamental current (A)
 * @param {number} I_2 - 2nd harmonic current (A)
 * @param {number} threshold_pct - Detection threshold (%), default 15%
 * @returns {boolean} true if inrush detected
 */
export function detectInrushBy2ndHarmonic(I_1, I_2, threshold_pct = 15) {
  if (I_1 <= 0) return false;

  const ratio_pct = (I_2 / I_1) * 100;
  return ratio_pct > threshold_pct;
}

/**
 * Detect inrush based on DC offset (asymmetrical transient).
 * Inrush: significant DC offset (>10-20% of AC)
 * Fault: minimal DC offset
 *
 * @param {number} dc_offset - DC component (A)
 * @param {number} ac_fundamental - AC fundamental (A)
 * @param {number} threshold_pct - Threshold (%), default 15%
 * @returns {boolean} true if DC offset indicates inrush
 */
export function detectInrushByDcOffset(dc_offset, ac_fundamental, threshold_pct = 15) {
  if (ac_fundamental <= 0) return false;

  const ratio_pct = Math.abs(dc_offset / ac_fundamental) * 100;
  return ratio_pct > threshold_pct;
}

/**
 * Flux linkage saturation indicator.
 * Saturation occurs when dΦ/dt is limited (v = N*dΦ/dt), causing voltage to flatten.
 * Approximated by checking for even harmonic content and DC offset.
 *
 * Saturation level = sqrt(I_2^2 + I_4^2) / I_1
 * High values indicate core saturation (inrush condition).
 *
 * @param {number} I_1 - Fundamental
 * @param {number} I_2 - 2nd harmonic
 * @param {number} I_4 - 4th harmonic (approximated as 0.3*I_2)
 * @returns {number} Saturation indicator (0-1 scale)
 */
export function calcFluxSaturation(I_1, I_2, I_4 = 0) {
  if (I_1 <= 0) return 0;

  const I_4_approx = I_4 || 0.3 * I_2;
  const even_harmonics = Math.sqrt(I_2 * I_2 + I_4_approx * I_4_approx);

  return Math.min(even_harmonics / I_1, 1.0);
}

/**
 * Comprehensive inrush detection combining multiple methods.
 * Returns overall inrush flag and confidence score.
 *
 * @param {number} I_1 - Fundamental current (A)
 * @param {number} I_2 - 2nd harmonic (A)
 * @param {number} dc_offset - DC component (A)
 * @param {Object} config - InrushConfig
 * @returns {Object} {is_inrush, confidence, I_2_pct, dc_offset_pct, saturation}
 */
export function evaluateInrush(
  I_1,
  I_2,
  dc_offset,
  config = {}
) {
  const {
    h2_threshold_pct = 15,
    dc_threshold_pct = 15,
    flux_threshold = 0.3,
  } = config;

  if (I_1 <= 0) {
    return { is_inrush: false, confidence: 0, reason: "No current" };
  }

  const h2_pct = (I_2 / I_1) * 100;
  const dc_pct = Math.abs(dc_offset / I_1) * 100;
  const saturation = calcFluxSaturation(I_1, I_2);

  // Voting system: each method contributes to confidence
  let votes = 0;
  let max_votes = 3;

  if (h2_pct > h2_threshold_pct) votes++; // 2nd harmonic high
  if (dc_pct > dc_threshold_pct) votes++; // DC offset high
  if (saturation > flux_threshold) votes++; // Saturation evident

  const confidence = votes / max_votes;
  const is_inrush = confidence >= 0.67; // Require 2 out of 3 methods

  return {
    is_inrush,
    confidence: parseFloat(confidence.toFixed(2)),
    I_2_pct: parseFloat(h2_pct.toFixed(2)),
    dc_offset_pct: parseFloat(dc_pct.toFixed(2)),
    saturation: parseFloat(saturation.toFixed(3)),
    votes,
  };
}

/**
 * Apply inrush blocking to differential protection.
 * If inrush detected, block differential trip (prevent nuisance trip during transformer energization).
 *
 * @param {boolean} is_inrush - Inrush detection flag
 * @param {number} confidence - Confidence score (0-1)
 * @param {number} confidence_threshold - Confidence required to block (default 0.67)
 * @returns {boolean} true if trip should be blocked
 */
export function shouldBlockDifferential(is_inrush, confidence, confidence_threshold = 0.67) {
  return is_inrush && confidence >= confidence_threshold;
}

/**
 * Validate inrush parameters.
 */
export function validateInrushParams(I_1, I_2, dc_offset) {
  const errors = [];

  if (I_1 < 0) errors.push("I_1 must be >= 0");
  if (I_2 < 0) errors.push("I_2 must be >= 0");
  if (isNaN(dc_offset)) errors.push("DC offset must be a number");

  return {
    valid: errors.length === 0,
    errors,
  };
}
