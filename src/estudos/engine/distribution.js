/**
 * distribution.js — Distribution system analysis
 *
 * Features:
 * - Voltage drop calculation (3-phase feeders)
 * - Cable sizing by ampacity
 * - System reliability analysis
 * - Feeder impedance and losses
 *
 * Inputs: Current, cable length, cable type, system voltage
 * Outputs: Voltage drop (V and %), cable size recommendation, losses
 */

/**
 * Standard cable types with resistance/reactance per 100m at 20°C.
 * R in Ω/100m, X in Ω/100m (typical for 3-phase, 60 Hz)
 */
export const CABLE_TYPES = {
  // Copper cables (Cu)
  '6_Cu': {
    name: '6 mm² Cu',
    section: 6,
    material: 'Copper',
    Racl: 3.08, // Resistance at 20°C per 100m
    Xacl: 0.083, // Reactance per 100m
    ampacity_60C: 32,
    ampacity_75C: 40,
    ampacity_90C: 46,
  },
  '10_Cu': {
    name: '10 mm² Cu',
    section: 10,
    material: 'Copper',
    Racl: 1.83,
    Xacl: 0.082,
    ampacity_60C: 43,
    ampacity_75C: 55,
    ampacity_90C: 63,
  },
  '16_Cu': {
    name: '16 mm² Cu',
    section: 16,
    material: 'Copper',
    Racl: 1.15,
    Xacl: 0.081,
    ampacity_60C: 57,
    ampacity_75C: 73,
    ampacity_90C: 85,
  },
  '25_Cu': {
    name: '25 mm² Cu',
    section: 25,
    material: 'Copper',
    Racl: 0.727,
    Xacl: 0.081,
    ampacity_60C: 76,
    ampacity_75C: 99,
    ampacity_90C: 114,
  },
  '35_Cu': {
    name: '35 mm² Cu',
    section: 35,
    material: 'Copper',
    Racl: 0.524,
    Xacl: 0.080,
    ampacity_60C: 93,
    ampacity_75C: 121,
    ampacity_90C: 141,
  },
  '50_Cu': {
    name: '50 mm² Cu',
    section: 50,
    material: 'Copper',
    Racl: 0.387,
    Xacl: 0.080,
    ampacity_60C: 113,
    ampacity_75C: 147,
    ampacity_90C: 171,
  },
  '70_Cu': {
    name: '70 mm² Cu',
    section: 70,
    material: 'Copper',
    Racl: 0.268,
    Xacl: 0.079,
    ampacity_60C: 143,
    ampacity_75C: 187,
    ampacity_90C: 216,
  },
  '95_Cu': {
    name: '95 mm² Cu',
    section: 95,
    material: 'Copper',
    Racl: 0.193,
    Xacl: 0.079,
    ampacity_60C: 176,
    ampacity_75C: 230,
    ampacity_90C: 265,
  },

  // Aluminum cables (Al)
  '10_Al': {
    name: '10 mm² Al',
    section: 10,
    material: 'Aluminum',
    Racl: 2.95,
    Xacl: 0.084,
    ampacity_60C: 28,
    ampacity_75C: 36,
    ampacity_90C: 42,
  },
  '16_Al': {
    name: '16 mm² Al',
    section: 16,
    material: 'Aluminum',
    Racl: 1.87,
    Xacl: 0.083,
    ampacity_60C: 37,
    ampacity_75C: 47,
    ampacity_90C: 55,
  },
  '25_Al': {
    name: '25 mm² Al',
    section: 25,
    material: 'Aluminum',
    Racl: 1.15,
    Xacl: 0.082,
    ampacity_60C: 50,
    ampacity_75C: 65,
    ampacity_90C: 76,
  },
  '35_Al': {
    name: '35 mm² Al',
    section: 35,
    material: 'Aluminum',
    Racl: 0.827,
    Xacl: 0.081,
    ampacity_60C: 60,
    ampacity_75C: 79,
    ampacity_90C: 92,
  },
  '50_Al': {
    name: '50 mm² Al',
    section: 50,
    material: 'Aluminum',
    Racl: 0.605,
    Xacl: 0.081,
    ampacity_60C: 73,
    ampacity_75C: 96,
    ampacity_90C: 112,
  },
  '70_Al': {
    name: '70 mm² Al',
    section: 70,
    material: 'Aluminum',
    Racl: 0.434,
    Xacl: 0.080,
    ampacity_60C: 92,
    ampacity_75C: 121,
    ampacity_90C: 141,
  },
};

/**
 * Calculate 3-phase voltage drop.
 *
 * Formula: ΔV = √3 · (R·cos(φ) + X·sin(φ)) · I · L / 100
 *   where L is in km, result is in volts
 *
 * @param {number} current - Phase current (A, primary side)
 * @param {number} length - Cable length (km)
 * @param {string} cableType - Cable ID from CABLE_TYPES
 * @param {number} voltage - System line voltage (V)
 * @param {number} powerFactor - Power factor [0...1], default 0.85
 * @returns {Object} {dV_V, dV_pct, I_cable, losses_kW}
 */
export function calcVoltageDropAndLosses(
  current,
  length,
  cableType,
  voltage,
  powerFactor = 0.85
) {
  const cable = CABLE_TYPES[cableType];
  if (!cable) {
    throw new Error(`Unknown cable type: ${cableType}`);
  }

  // Resistance and reactance per km
  const R_km = (cable.Racl / 100) * length; // Ω
  const X_km = (cable.Xacl / 100) * length; // Ω

  // Angle from power factor
  const phi = Math.acos(powerFactor);
  const cos_phi = Math.cos(phi);
  const sin_phi = Math.sin(phi);

  // 3-phase voltage drop
  const dV = Math.sqrt(3) * (R_km * cos_phi + X_km * sin_phi) * current;

  // Percentage drop
  const dV_pct = (dV / voltage) * 100;

  // Power losses (3-phase)
  const losses_kW = (3 * current * current * R_km) / 1000;

  return {
    dV_V: parseFloat(dV.toFixed(3)),
    dV_pct: parseFloat(dV_pct.toFixed(3)),
    R_km: parseFloat(R_km.toFixed(4)),
    X_km: parseFloat(X_km.toFixed(4)),
    I_cable: current,
    losses_kW: parseFloat(losses_kW.toFixed(3)),
    cable: cable.name,
  };
}

/**
 * Recommend cable size based on ampacity and voltage drop limit.
 *
 * @param {number} current - Required current (A)
 * @param {number} length - Feeder length (km)
 * @param {number} voltage - System voltage (V)
 * @param {number} dV_limit_pct - Voltage drop limit [%], typical 3-5%
 * @param {string} material - 'Copper' or 'Aluminum'
 * @param {string} insulation - '60C', '75C', or '90C'
 * @returns {Object} {recommended, alternative, analysis}
 */
export function recommendCableSize(
  current,
  length,
  voltage,
  dV_limit_pct = 3,
  material = 'Copper',
  insulation = '75C'
) {
  const candidates = Object.entries(CABLE_TYPES).filter(
    ([, cable]) =>
      cable.material === material &&
      cable[`ampacity_${insulation}`] >= current
  );

  if (candidates.length === 0) {
    return {
      recommended: null,
      alternative: null,
      analysis: `No cable found with ${current}A ampacity at ${insulation}°C`,
    };
  }

  // Find first cable that meets voltage drop limit
  let recommended = null;
  for (const [id, cable] of candidates) {
    const result = calcVoltageDropAndLosses(current, length, id, voltage);
    if (result.dV_pct <= dV_limit_pct) {
      recommended = { id, cable, result };
      break;
    }
  }

  // If no cable meets voltage drop, return smallest that meets ampacity
  if (!recommended) {
    const [id, cable] = candidates[0];
    const result = calcVoltageDropAndLosses(current, length, id, voltage);
    recommended = { id, cable, result };
  }

  // Alternative (one size larger)
  let alternative = null;
  const rec_idx = candidates.findIndex(([id]) => id === recommended.id);
  if (rec_idx < candidates.length - 1) {
    const [id, cable] = candidates[rec_idx + 1];
    const result = calcVoltageDropAndLosses(current, length, id, voltage);
    alternative = { id, cable, result };
  }

  return {
    recommended: {
      id: recommended.id,
      name: recommended.cable.name,
      ampacity: recommended.cable[`ampacity_${insulation}`],
      ...recommended.result,
    },
    alternative: alternative ? {
      id: alternative.id,
      name: alternative.cable.name,
      ampacity: alternative.cable[`ampacity_${insulation}`],
      ...alternative.result,
    } : null,
    analysis: `Voltage drop limit: ${dV_limit_pct}%`,
  };
}

/**
 * Calculate feeder impedance (complex).
 * Z = R + jX (per km, then scale to length)
 *
 * @returns {Object} {Z_real, Z_imag, Z_mag_ohms, Z_angle_deg}
 */
export function calcFeederImpedance(length, cableType) {
  const cable = CABLE_TYPES[cableType];
  if (!cable) {
    throw new Error(`Unknown cable type: ${cableType}`);
  }

  const R = (cable.Racl / 100) * length;
  const X = (cable.Xacl / 100) * length;

  const Z_mag = Math.sqrt(R * R + X * X);
  const Z_ang = Math.atan2(X, R) * (180 / Math.PI);

  return {
    Z_real: parseFloat(R.toFixed(4)),
    Z_imag: parseFloat(X.toFixed(4)),
    Z_mag_ohms: parseFloat(Z_mag.toFixed(4)),
    Z_angle_deg: parseFloat(Z_ang.toFixed(2)),
  };
}

/**
 * System reliability analysis: calculate probability of feeder failure
 * over a given time horizon (simplified lambda model).
 *
 * Failure rate λ ≈ base_λ × length × age_factor
 * MTBF = 1 / λ
 * Unavailability U = λ × MTTR (where MTTR = mean time to repair)
 *
 * @param {number} length - Cable length (km)
 * @param {number} baseFailureRate - Failures per km-year, typical 0.1-0.2
 * @param {number} ageYears - Cable age in years
 * @param {number} mttr_hours - Mean time to repair
 * @returns {Object} {lambda, MTBF_years, unavailability_pct}
 */
export function calcFeederReliability(
  length,
  baseFailureRate = 0.15,
  ageYears = 10,
  mttr_hours = 4
) {
  // Age degradation: 10% increase per year after 5 years
  const ageFactor = ageYears <= 5 ? 1.0 : 1.0 + (ageYears - 5) * 0.1;

  // Annual failure rate (failures per year)
  const lambda = baseFailureRate * length * ageFactor;

  // Mean Time Between Failures (years)
  const MTBF = 1 / (lambda || 0.0001);

  // Unavailability (assuming MTTR in hours)
  const unavailability_pct = (lambda * (mttr_hours / 8760)) * 100;

  return {
    lambda: parseFloat(lambda.toFixed(4)),
    MTBF_years: parseFloat(MTBF.toFixed(2)),
    unavailability_pct: parseFloat(unavailability_pct.toFixed(4)),
    ageFactor,
  };
}

/**
 * Get all available cable types as a list.
 */
export function getCableList() {
  return Object.entries(CABLE_TYPES).map(([id, cable]) => ({
    id,
    name: cable.name,
    material: cable.material,
    section: cable.section,
    ampacity_75C: cable.ampacity_75C,
  }));
}

/**
 * Validate distribution parameters.
 */
export function validateDistributionParams(current, length, cableType, voltage) {
  const errors = [];

  if (current <= 0) errors.push('Current must be > 0 A');
  if (length <= 0 || length > 100) errors.push('Length must be between 0 and 100 km');
  if (!(cableType in CABLE_TYPES)) errors.push(`Unknown cable type: ${cableType}`);
  if (voltage <= 0) errors.push('Voltage must be > 0 V');

  return {
    valid: errors.length === 0,
    errors,
  };
}
