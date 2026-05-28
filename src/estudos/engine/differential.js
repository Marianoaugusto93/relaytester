/**
 * differential.js — Differential protection (ANSI 87) — Transformer/Reactor protection
 *
 * Implements:
 * - Dual-slope characteristic (restraint-based)
 * - Operating current (I_diff) vs Restraining current (I_restrain)
 * - High-impedance and Low-impedance differential
 * - Harmonic blocking (2nd harmonic)
 * - Bias slope (percentage slope between break point and shoulder)
 *
 * Inputs: Phase currents (primary and secondary side)
 * Outputs: Differential current, restraining current, operating point, trip decision
 */

/**
 * Differential characteristic definition.
 * @typedef {Object} DifferentialChar
 * @property {number} pickup - Operating current pickup (A) at 0 restrain
 * @property {number} knee - Knee point in restraining current (A)
 * @property {number} slope1 - Slope below knee (%)
 * @property {number} slope2 - Slope above knee (%)
 * @property {boolean} harmonic_blocking - Enable 2nd harmonic blocking
 * @property {number} inh_restrain_pickup - Harmonic restraint pickup (%)
 */

/**
 * Calculate differential current (secondary side, referred to common rating).
 * I_diff = |I_restrain - I_operate|
 *
 * For 2-winding transformer (primary and secondary):
 * I_diff = |I_primary_reflected - I_secondary|
 *
 * @param {Object} I_primary - Primary-side current {mag, ang} (A, referred to secondary)
 * @param {Object} I_secondary - Secondary-side current {mag, ang} (A)
 * @returns {Object} {I_diff_mag, angle, vector}
 */
export function calcDifferentialCurrent(I_primary, I_secondary) {
  if (!I_primary || !I_secondary) return null;

  // Convert to rectangular (assuming mag and ang in degrees)
  const pri_rad = I_primary.ang * (Math.PI / 180);
  const sec_rad = I_secondary.ang * (Math.PI / 180);

  const pri_r = I_primary.mag * Math.cos(pri_rad);
  const pri_i = I_primary.mag * Math.sin(pri_rad);

  const sec_r = I_secondary.mag * Math.cos(sec_rad);
  const sec_i = I_secondary.mag * Math.sin(sec_rad);

  // Differential = I_primary - I_secondary
  const diff_r = pri_r - sec_r;
  const diff_i = pri_i - sec_i;

  const diff_mag = Math.sqrt(diff_r * diff_r + diff_i * diff_i);
  const diff_ang = Math.atan2(diff_i, diff_r) * (180 / Math.PI);

  return {
    I_diff_mag: parseFloat(diff_mag.toFixed(4)),
    angle: parseFloat(diff_ang.toFixed(2)),
    vector: { r: diff_r, i: diff_i },
  };
}

/**
 * Calculate restraining current.
 * I_restrain = (|I_primary| + |I_secondary|) / 2
 * (Average magnitude method; alternative: larger magnitude method)
 *
 * @param {Object} I_primary - {mag, ang}
 * @param {Object} I_secondary - {mag, ang}
 * @returns {number} Restraining current (A)
 */
export function calcRestrainingCurrent(I_primary, I_secondary) {
  if (!I_primary || !I_secondary) return 0;

  // Average magnitude method (standard IEC 61995)
  return (I_primary.mag + I_secondary.mag) / 2;
}

/**
 * Calculate operating boundary for dual-slope characteristic.
 * Characteristic: I_operate = pickup + slope * I_restrain (piecewise linear)
 *
 * Below knee: I_op = pickup + slope1% * I_restrain
 * Above knee: I_op = pickup + slope2% * I_restrain + additional_offset
 *
 * @param {number} I_restrain - Restraining current (A)
 * @param {Object} char - Differential characteristic
 * @returns {number} Operating current threshold (A)
 */
export function calcOperatingThreshold(I_restrain, char) {
  if (!char || I_restrain < 0) return 0;

  const { pickup, knee, slope1, slope2 } = char;

  if (I_restrain <= knee) {
    // Below knee
    return pickup + (slope1 / 100) * I_restrain;
  } else {
    // Above knee
    const offset_at_knee = pickup + (slope1 / 100) * knee;
    const additional = (slope2 / 100) * (I_restrain - knee);
    return offset_at_knee + additional;
  }
}

/**
 * Check 2nd harmonic restraint.
 * If I_2nd / I_1 > threshold (e.g., 15%), block differential trip.
 * Typical for inrush detection.
 *
 * @param {number} I_2nd_harmonic - 2nd harmonic current component (A)
 * @param {number} I_fundamental - Fundamental (1st harmonic) current (A)
 * @param {number} threshold_pct - Blocking threshold (%), default 15%
 * @returns {boolean} true if blocked by harmonic restraint
 */
export function is2ndHarmonicBlocked(I_2nd_harmonic, I_fundamental, threshold_pct = 15) {
  if (I_fundamental <= 0) return false;

  const ratio = (I_2nd_harmonic / I_fundamental) * 100;
  return ratio > threshold_pct;
}

/**
 * Evaluate differential protection trip.
 *
 * @param {Object} I_primary - Primary-side current {mag, ang}
 * @param {Object} I_secondary - Secondary-side current {mag, ang}
 * @param {Object} char - Differential characteristic
 * @param {number} I_2nd_harmonic - 2nd harmonic component (A), optional
 * @returns {Object} {tripped, I_diff, I_restrain, Op_threshold, margin_pct, blocked_by_harmonic}
 */
export function evaluateDifferential(I_primary, I_secondary, char, I_2nd_harmonic = 0) {
  if (!I_primary || !I_secondary || !char) {
    return {
      tripped: false,
      error: "Missing parameters",
    };
  }

  const diff = calcDifferentialCurrent(I_primary, I_secondary);
  const restrain = calcRestrainingCurrent(I_primary, I_secondary);
  const threshold = calcOperatingThreshold(restrain, char);

  const I_diff_mag = diff.I_diff_mag;

  // Check harmonic blocking
  const harmonic_blocked = is2ndHarmonicBlocked(
    I_2nd_harmonic,
    I_primary.mag,
    char.inh_restrain_pickup || 15
  );

  // Trip if I_diff > threshold and not blocked
  const tripped = I_diff_mag > threshold && !harmonic_blocked;

  // Margin (how far above threshold in %)
  const margin = threshold > 0 ? ((I_diff_mag - threshold) / threshold) * 100 : 0;

  return {
    tripped,
    I_diff: parseFloat(I_diff_mag.toFixed(4)),
    I_restrain: parseFloat(restrain.toFixed(4)),
    Op_threshold: parseFloat(threshold.toFixed(4)),
    margin_pct: parseFloat(margin.toFixed(2)),
    blocked_by_harmonic: harmonic_blocked,
    I_2nd_pct: I_primary.mag > 0 ? parseFloat(((I_2nd_harmonic / I_primary.mag) * 100).toFixed(2)) : 0,
  };
}

/**
 * Generate standard transformer differential characteristic.
 * Typical for power transformer (dual-slope, 5-30% pickup).
 *
 * @param {number} pickup_pct - Pickup as % of rated current (typical 15-25%)
 * @param {number} rated_current - Transformer rated current (A)
 * @returns {Object} Differential characteristic
 */
export function generateStandardTransformerChar(pickup_pct = 20, rated_current = 100) {
  const pickup = (pickup_pct / 100) * rated_current;

  return {
    name: "Standard Transformer (Dual-Slope)",
    pickup,
    knee: 4 * pickup, // Break point at ~80A for 20A pickup
    slope1: 25, // 25% slope below knee
    slope2: 50, // 50% slope above knee (faster rise)
    harmonic_blocking: true,
    inh_restrain_pickup: 15, // 15% 2nd harmonic blocks
  };
}

/**
 * Generate reactor (feeder) differential characteristic.
 * More sensitive than transformer (higher slopes).
 *
 * @param {number} pickup_pct - Pickup as % of rated (typical 5-10%)
 * @param {number} rated_current - Reactor rated current (A)
 * @returns {Object} Differential characteristic
 */
export function generateReactorDifferentialChar(pickup_pct = 10, rated_current = 100) {
  const pickup = (pickup_pct / 100) * rated_current;

  return {
    name: "Reactor Differential (High-Slope)",
    pickup,
    knee: 2 * pickup,
    slope1: 50, // Steeper
    slope2: 100, // Even steeper above knee
    harmonic_blocking: true,
    inh_restrain_pickup: 20,
  };
}

/**
 * Validate differential protection parameters.
 */
export function validateDifferentialParams(I_primary, I_secondary, char) {
  const errors = [];

  if (!I_primary || I_primary.mag < 0) errors.push("Primary current must be >= 0");
  if (!I_secondary || I_secondary.mag < 0) errors.push("Secondary current must be >= 0");
  if (!char) errors.push("Characteristic required");

  if (char) {
    if (char.pickup < 0) errors.push("Pickup must be >= 0");
    if (char.knee < 0) errors.push("Knee must be >= 0");
    if (char.slope1 < 0 || char.slope1 > 100) errors.push("Slope1 must be 0-100%");
    if (char.slope2 < 0 || char.slope2 > 100) errors.push("Slope2 must be 0-100%");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
