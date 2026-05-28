/**
 * ampacity.js — Cable ampacity and thermal ratings
 *
 * Calculates maximum allowable current based on:
 * - Cable cross-section and material
 * - Insulation type and temperature rating
 * - Ambient temperature
 * - Loading conditions (grouping, burial, etc.)
 * - Thermal derating factors
 */

/**
 * Standard cable ampacity table (60°C insulation, 30°C ambient, single cable).
 * Values in Amperes for different conductor sizes.
 */
const AMPACITY_TABLE = {
  "1.5_Cu": { ampacity: 17, R: 12.1 },
  "2.5_Cu": { ampacity: 24, R: 7.41 },
  "4_Cu": { ampacity: 32, R: 4.61 },
  "6_Cu": { ampacity: 41, R: 3.08 },
  "10_Cu": { ampacity: 57, R: 1.83 },
  "16_Cu": { ampacity: 76, R: 1.15 },
  "25_Cu": { ampacity: 101, R: 0.727 },
  "35_Cu": { ampacity: 135, R: 0.524 },
  "50_Cu": { ampacity: 171, R: 0.387 },
  "70_Cu": { ampacity: 221, R: 0.268 },
  "95_Cu": { ampacity: 271, R: 0.193 },
  "120_Cu": { ampacity: 311, R: 0.153 },
  "150_Cu": { ampacity: 360, R: 0.129 },
  "185_Cu": { ampacity: 407, R: 0.099 },
  "240_Cu": { ampacity: 482, R: 0.075 },
  "300_Cu": { ampacity: 555, R: 0.0606 },
};

/**
 * Temperature derating factor.
 * Correction for ambient temperature different from reference (30°C).
 *
 * Formula: k_T = (T_max - T_amb) / (T_max - T_ref)
 *
 * @param {number} T_ambient - Ambient temperature (°C)
 * @param {number} T_insulation - Insulation max temperature (60, 75, or 90°C)
 * @param {number} T_ref - Reference ambient (typically 30°C)
 * @returns {number} Derating factor (0-1)
 */
export function calcTemperatureDerating(T_ambient, T_insulation = 60, T_ref = 30) {
  if (T_ambient >= T_insulation) return 0; // Unsafe

  const k_T = (T_insulation - T_ambient) / (T_insulation - T_ref);
  return Math.max(0.1, Math.min(1.0, k_T));
}

/**
 * Grouping derating factor.
 * Reduction when multiple cables are close together.
 *
 * Number of cables | Factor
 * 1                | 1.00
 * 2-3              | 0.80
 * 4-6              | 0.65
 * 7-9              | 0.55
 * 10+              | 0.45
 *
 * @param {number} numCables - Number of cables in group
 * @returns {number} Grouping factor
 */
export function calcGroupingFactor(numCables) {
  if (numCables <= 1) return 1.0;
  if (numCables <= 3) return 0.8;
  if (numCables <= 6) return 0.65;
  if (numCables <= 9) return 0.55;
  return 0.45;
}

/**
 * Burial/conduit derating factor.
 * Underground or in conduit reduces cooling.
 *
 * Condition              | Factor
 * Open air / free air    | 1.00
 * In raceway/conduit     | 0.85
 * Buried (direct)        | 0.80
 * Buried (in duct)       | 0.75
 *
 * @param {string} installationType - "open", "conduit", "buried_direct", "buried_duct"
 * @returns {number} Installation factor
 */
export function calcInstallationFactor(installationType = "open") {
  const factors = {
    open: 1.0,
    conduit: 0.85,
    buried_direct: 0.8,
    buried_duct: 0.75,
  };
  return factors[installationType] || 1.0;
}

/**
 * Calculate effective ampacity with all derating factors applied.
 *
 * I_eff = I_0 × k_T × k_grouping × k_installation
 *
 * @param {string} cableId - Cable identifier (e.g., "25_Cu")
 * @param {number} T_ambient - Ambient temperature (°C)
 * @param {number} T_insulation - Insulation rating (60, 75, 90)
 * @param {number} numCables - Number of cables grouped
 * @param {string} installationType - Installation condition
 * @returns {Object} {I_rated, k_T, k_group, k_install, I_effective, margin}
 */
export function calcEffectiveAmpacity(
  cableId,
  T_ambient = 30,
  T_insulation = 60,
  numCables = 1,
  installationType = "open"
) {
  const cable = AMPACITY_TABLE[cableId];
  if (!cable) {
    return { error: `Cable not found: ${cableId}` };
  }

  const I_rated = cable.ampacity;
  const k_T = calcTemperatureDerating(T_ambient, T_insulation);
  const k_group = calcGroupingFactor(numCables);
  const k_install = calcInstallationFactor(installationType);

  const I_effective = I_rated * k_T * k_group * k_install;

  return {
    cable_id: cableId,
    I_rated: parseFloat(I_rated.toFixed(1)),
    R_ohm_km: parseFloat(cable.R.toFixed(4)),
    k_T: parseFloat(k_T.toFixed(3)),
    k_group: parseFloat(k_group.toFixed(3)),
    k_install: parseFloat(k_install.toFixed(3)),
    I_effective: parseFloat(I_effective.toFixed(1)),
    margin_pct: parseFloat(
      (((I_effective - I_rated) / I_rated) * 100).toFixed(1)
    ),
  };
}

/**
 * Check if current exceeds ampacity limit.
 * Returns safety status and loading percentage.
 *
 * @param {number} I_load - Operating current (A)
 * @param {number} I_ampacity - Effective ampacity (A)
 * @param {number} safety_margin_pct - Safety threshold (%), default 80%
 * @returns {Object} {safe, loading_pct, status}
 */
export function checkAmpacitySafety(
  I_load,
  I_ampacity,
  safety_margin_pct = 80
) {
  const loading_pct = (I_load / I_ampacity) * 100;
  const safe = loading_pct <= safety_margin_pct;

  let status = "✓ Safe";
  if (loading_pct > 100) {
    status = "✗ Overload";
  } else if (loading_pct > safety_margin_pct) {
    status = "⚠ High Loading";
  }

  return {
    safe,
    loading_pct: parseFloat(loading_pct.toFixed(1)),
    status,
    margin_A: parseFloat((I_ampacity - I_load).toFixed(1)),
  };
}

/**
 * Get list of available cable sizes.
 */
export function getCableSizes() {
  return Object.keys(AMPACITY_TABLE).map((id) => {
    const cable = AMPACITY_TABLE[id];
    return {
      id,
      ampacity: cable.ampacity,
      R: cable.R,
    };
  });
}

/**
 * Validate ampacity parameters.
 */
export function validateAmpacityParams(cableId, I_load, T_ambient) {
  const errors = [];

  if (!(cableId in AMPACITY_TABLE)) errors.push(`Cable not found: ${cableId}`);
  if (I_load < 0) errors.push("Current must be >= 0");
  if (T_ambient < -10 || T_ambient > 50)
    errors.push("Ambient temp must be -10 to 50°C");

  return {
    valid: errors.length === 0,
    errors,
  };
}
