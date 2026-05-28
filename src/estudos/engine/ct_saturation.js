/**
 * ct_saturation.js — Current Transformer saturation analysis
 *
 * Evaluates CT saturation risk for:
 * - Protective relay class CT (5P, 10P, etc.)
 * - Metering class CT (0.2, 0.5, etc.)
 * - Transient overreach during through-fault conditions
 * - Saturation voltage and knee-point determination
 */

/**
 * Standard CT classes and saturation parameters.
 * Data based on IEC 61869-2 (protective CTs).
 *
 * Knee point voltage = (Rated burden + excitation loss) at rated secondary current
 */
const CT_CLASSES = {
  "5P10": {
    class: "5P10",
    V_knee: 50,
    I_sat: 200,
    description: "Protective CT, 5% error at 10x rated",
  },
  "5P20": {
    class: "5P20",
    V_knee: 100,
    I_sat: 400,
    description: "Protective CT, 5% error at 20x rated",
  },
  "10P10": {
    class: "10P10",
    V_knee: 50,
    I_sat: 100,
    description: "Protective CT, 10% error at 10x rated",
  },
  "10P20": {
    class: "10P20",
    V_knee: 100,
    I_sat: 200,
    description: "Protective CT, 10% error at 20x rated",
  },
  "0.2S": {
    class: "0.2S",
    V_knee: 10,
    I_sat: 50,
    description: "Metering CT, 0.2% error",
  },
  "0.5S": {
    class: "0.5S",
    V_knee: 20,
    I_sat: 100,
    description: "Metering CT, 0.5% error",
  },
};

/**
 * Calculate CT secondary voltage from primary current.
 * V_s = I_p / CT_ratio × Z_burden
 *
 * @param {number} I_primary - Primary current (A)
 * @param {number} CT_ratio - CT ratio (e.g., 100/5 = 20)
 * @param {number} Z_burden - Secondary burden impedance (Ω)
 * @returns {number} Secondary voltage (V)
 */
export function calcSecondaryVoltage(I_primary, CT_ratio, Z_burden = 2.0) {
  const I_secondary = I_primary / CT_ratio;
  const V_secondary = I_secondary * Z_burden;
  return parseFloat(V_secondary.toFixed(2));
}

/**
 * Check CT saturation condition.
 * Saturation occurs when V_secondary > V_knee (knee point voltage).
 *
 * After saturation, secondary current becomes distorted (flattens).
 * Excitation current: I_e = V_secondary / (X_core + R_core)
 * Secondary current error: I_err = I_s - I_e
 *
 * @param {number} V_secondary - Secondary voltage (V)
 * @param {number} V_knee - Knee point voltage (V)
 * @returns {Object} {saturated, V_knee, margin_pct}
 */
export function checkCTSaturation(V_secondary, V_knee) {
  const margin_pct = ((V_knee - V_secondary) / V_knee) * 100;
  const saturated = V_secondary > V_knee;

  return {
    saturated,
    V_secondary: parseFloat(V_secondary.toFixed(2)),
    V_knee: parseFloat(V_knee.toFixed(2)),
    margin_pct: parseFloat(margin_pct.toFixed(1)),
  };
}

/**
 * Calculate excitation (magnetizing) curve.
 * Non-linear saturation characteristic.
 *
 * Below knee: I_e ≈ V / X_m (linear, high impedance)
 * Above knee: I_e ≈ sqrt(V) / k (non-linear, rapid rise)
 *
 * @param {number} V - Voltage applied to CT (V)
 * @param {number} V_knee - Knee point voltage (V)
 * @returns {number} Excitation current (A)
 */
export function calcExcitationCurrent(V, V_knee) {
  const X_m = V_knee / 0.1; // Magnetizing reactance
  const k = 10; // Non-linearity factor

  if (V <= V_knee) {
    // Linear region
    return V / X_m;
  } else {
    // Saturation region (approximation)
    const V_excess = V - V_knee;
    const I_sat_rise = Math.sqrt(V_excess);
    return 0.1 + I_sat_rise / k;
  }
}

/**
 * Evaluate CT performance during fault transient.
 * Through-fault (primary side faulted with CT on unfaulted side).
 *
 * The CT sees a high transient current and may saturate,
 * reducing secondary output and delaying relay operation.
 *
 * @param {number} I_primary - Primary fault current (A)
 * @param {number} CT_ratio - CT ratio
 * @param {number} Z_burden - Secondary burden (Ω)
 * @param {string} CT_class - CT class ID
 * @returns {Object} Analysis result
 */
export function evaluateCTTransientResponse(
  I_primary,
  CT_ratio,
  Z_burden = 2.0,
  CT_class = "5P10"
) {
  const ct = CT_CLASSES[CT_class];
  if (!ct) {
    return { error: `CT class not found: ${CT_class}` };
  }

  const V_secondary = calcSecondaryVoltage(I_primary, CT_ratio, Z_burden);
  const saturation = checkCTSaturation(V_secondary, ct.V_knee);
  const I_excitation = calcExcitationCurrent(V_secondary, ct.V_knee);

  // Secondary current (ideal vs. saturated)
  const I_secondary_ideal = I_primary / CT_ratio;
  const I_secondary_actual = I_secondary_ideal - I_excitation;
  const accuracy = (I_secondary_actual / I_secondary_ideal) * 100;

  return {
    CT_class,
    I_primary: parseFloat(I_primary.toFixed(1)),
    I_secondary_ideal: parseFloat(I_secondary_ideal.toFixed(3)),
    I_secondary_actual: parseFloat(I_secondary_actual.toFixed(3)),
    V_secondary: saturation.V_secondary,
    V_knee: saturation.V_knee,
    I_excitation: parseFloat(I_excitation.toFixed(4)),
    saturated: saturation.saturated,
    accuracy_pct: parseFloat(accuracy.toFixed(1)),
    margin_pct: saturation.margin_pct,
    warning: saturation.saturated
      ? "CT saturated - secondary current distorted"
      : "CT operating normally",
  };
}

/**
 * Recommend CT class for a given through-fault current.
 * Higher through-fault = higher class (better saturation immunity).
 *
 * @param {number} I_through_fault - Expected through-fault (A)
 * @param {number} CT_ratio - CT ratio
 * @param {number} Z_burden - Secondary burden (Ω)
 * @returns {Object} {recommended_class, analysis}
 */
export function recommendCTClass(
  I_through_fault,
  CT_ratio,
  Z_burden = 2.0
) {
  const V_secondary = calcSecondaryVoltage(I_through_fault, CT_ratio, Z_burden);

  let recommended = "5P10"; // Default

  // Check against available classes (from best to worst saturation immunity)
  const ordered_classes = ["10P20", "5P20", "10P10", "5P10", "0.5S", "0.2S"];

  for (const cls of ordered_classes) {
    const ct = CT_CLASSES[cls];
    if (V_secondary <= ct.V_knee * 1.1) {
      // Allow 10% margin
      recommended = cls;
      break;
    }
  }

  const analysis = evaluateCTTransientResponse(
    I_through_fault,
    CT_ratio,
    Z_burden,
    recommended
  );

  return {
    recommended_class: recommended,
    reason: `V_secondary ${V_secondary.toFixed(1)}V requires ${recommended}`,
    analysis,
  };
}

/**
 * Get list of available CT classes.
 */
export function getCTClasses() {
  return Object.entries(CT_CLASSES).map(([id, data]) => ({
    id,
    ...data,
  }));
}

/**
 * Validate CT parameters.
 */
export function validateCTParams(I_primary, CT_ratio, Z_burden, CT_class) {
  const errors = [];

  if (I_primary < 0) errors.push("Primary current must be >= 0");
  if (CT_ratio <= 0) errors.push("CT ratio must be > 0");
  if (Z_burden < 0) errors.push("Burden impedance must be >= 0");
  if (!(CT_class in CT_CLASSES)) errors.push(`CT class not found: ${CT_class}`);

  return {
    valid: errors.length === 0,
    errors,
  };
}
