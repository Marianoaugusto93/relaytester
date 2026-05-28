/**
 * tcc.js — Time-Current Characteristic calculations
 *
 * Implements standard protective device curves:
 * - IEC 60255-4 (Normal, Very Inverse, Extremely Inverse, Long-time)
 * - IEEE C37.112 (Moderate, Very, Extremely Inverse)
 * - ANSI/IEEE curves
 * - Fuse curves (RK1, RK5, CC)
 * - Instantaneous pickup
 *
 * Theory: I = f(t, M, curve) where M = I_fault / I_pickup
 * All times in seconds, currents in secondary Amperes.
 */

export const CURVE_TYPES = {
  // Relay curves (IEC 60255-4)
  IEC_NORMAL: 'IEC_NORMAL',
  IEC_VERY_INVERSE: 'IEC_VERY_INVERSE',
  IEC_EXTREMELY_INVERSE: 'IEC_EXTREMELY_INVERSE',
  IEC_LONG_TIME: 'IEC_LONG_TIME',

  // Relay curves (IEEE C37.112)
  IEEE_MODERATE: 'IEEE_MODERATE',
  IEEE_VERY_INVERSE: 'IEEE_VERY_INVERSE',
  IEEE_EXTREMELY_INVERSE: 'IEEE_EXTREMELY_INVERSE',

  // ANSI/IEEE Standard Inverse
  ANSI_INVERSE: 'ANSI_INVERSE',
  ANSI_VERY_INVERSE: 'ANSI_VERY_INVERSE',
  ANSI_EXTREMELY_INVERSE: 'ANSI_EXTREMELY_INVERSE',

  // Fuse curves
  FUSE_RK1: 'FUSE_RK1',
  FUSE_RK5: 'FUSE_RK5',
  FUSE_CC: 'FUSE_CC',

  // Special
  INSTANTANEOUS: 'INSTANTANEOUS',
  DEFINITE_TIME: 'DEFINITE_TIME',
};

/**
 * IEC 60255-4 curves: t = T_d * (K / (M^p - 1))
 * M = I_fault / I_pickup, T_d = time dial [0.1...1.0]
 *
 * where K and p depend on curve type.
 */
const IEC_CURVES = {
  [CURVE_TYPES.IEC_NORMAL]: {
    K: 0.14,
    p: 0.02,
    label: 'IEC Normal Inverse',
    minM: 1.05,
  },
  [CURVE_TYPES.IEC_VERY_INVERSE]: {
    K: 13.5,
    p: 1.0,
    label: 'IEC Very Inverse',
    minM: 1.05,
  },
  [CURVE_TYPES.IEC_EXTREMELY_INVERSE]: {
    K: 80,
    p: 2.0,
    label: 'IEC Extremely Inverse',
    minM: 1.05,
  },
  [CURVE_TYPES.IEC_LONG_TIME]: {
    K: 120,
    p: 1.0,
    label: 'IEC Long-time',
    minM: 1.05,
  },
};

/**
 * IEEE C37.112 curves: t = T_d * (K / (M^p - 1))
 * Similar to IEC but with different K values.
 */
const IEEE_CURVES = {
  [CURVE_TYPES.IEEE_MODERATE]: {
    K: 0.0515,
    p: 0.02,
    label: 'IEEE Moderate Inverse',
    minM: 1.05,
  },
  [CURVE_TYPES.IEEE_VERY_INVERSE]: {
    K: 19.61,
    p: 2.0,
    label: 'IEEE Very Inverse',
    minM: 1.05,
  },
  [CURVE_TYPES.IEEE_EXTREMELY_INVERSE]: {
    K: 28.1,
    p: 2.0,
    label: 'IEEE Extremely Inverse',
    minM: 1.05,
  },
};

/**
 * ANSI/IEEE Standard Inverse curves: t = T_d * (K / (M^p - 1))
 */
const ANSI_CURVES = {
  [CURVE_TYPES.ANSI_INVERSE]: {
    K: 0.086,
    p: 0.02,
    label: 'ANSI Standard Inverse',
    minM: 1.05,
  },
  [CURVE_TYPES.ANSI_VERY_INVERSE]: {
    K: 19.61,
    p: 2.0,
    label: 'ANSI Very Inverse',
    minM: 1.05,
  },
  [CURVE_TYPES.ANSI_EXTREMELY_INVERSE]: {
    K: 28.1,
    p: 2.0,
    label: 'ANSI Extremely Inverse',
    minM: 1.05,
  },
};

/**
 * Fuse curves (approx from NFPA 70 and manufacturer data)
 * Stored as lookup tables: [currentRatio] -> tripTime
 */
const FUSE_CURVES = {
  [CURVE_TYPES.FUSE_RK1]: {
    label: 'Fuse RK1 (Time-Delay)',
    points: [
      // [M, t_sec]
      [1.5, 300],
      [2.0, 120],
      [3.0, 20],
      [5.0, 3],
      [10, 0.15],
      [20, 0.01],
    ],
  },
  [CURVE_TYPES.FUSE_RK5]: {
    label: 'Fuse RK5 (Faster)',
    points: [
      [1.5, 100],
      [2.0, 50],
      [3.0, 10],
      [5.0, 1.5],
      [10, 0.08],
      [20, 0.005],
    ],
  },
  [CURVE_TYPES.FUSE_CC]: {
    label: 'Fuse Class CC (Very Fast)',
    points: [
      [1.5, 50],
      [2.0, 20],
      [3.0, 5],
      [5.0, 0.8],
      [10, 0.04],
      [20, 0.002],
    ],
  },
};

/**
 * Calculate trip time for a given current.
 *
 * @param {number} Ifault - Fault current (secondary A)
 * @param {number} Ipickup - Pickup current (secondary A)
 * @param {string} curve - Curve type from CURVE_TYPES
 * @param {number} timeDial - Time dial [0.1...10.0] for IEC/IEEE/ANSI
 * @returns {number} Trip time in seconds (or Infinity if below pickup)
 */
export function calcTripTime(Ifault, Ipickup, curve, timeDial = 0.5) {
  if (Ifault <= 0 || Ipickup <= 0 || timeDial <= 0) {
    return Infinity;
  }

  const M = Ifault / Ipickup;

  // Check pickup threshold
  if (M <= 1.0) {
    return Infinity;
  }

  // Instantaneous
  if (curve === CURVE_TYPES.INSTANTANEOUS) {
    return 0.01; // ~10ms minimum
  }

  // Definite time
  if (curve === CURVE_TYPES.DEFINITE_TIME) {
    return timeDial; // timeDial is the actual delay time
  }

  // IEC curves
  if (curve in IEC_CURVES) {
    const c = IEC_CURVES[curve];
    if (M <= c.minM) return Infinity;
    return timeDial * (c.K / (Math.pow(M, c.p) - 1));
  }

  // IEEE curves
  if (curve in IEEE_CURVES) {
    const c = IEEE_CURVES[curve];
    if (M <= c.minM) return Infinity;
    return timeDial * (c.K / (Math.pow(M, c.p) - 1));
  }

  // ANSI curves
  if (curve in ANSI_CURVES) {
    const c = ANSI_CURVES[curve];
    if (M <= c.minM) return Infinity;
    return timeDial * (c.K / (Math.pow(M, c.p) - 1));
  }

  // Fuse curves (interpolate)
  if (curve in FUSE_CURVES) {
    return interpolateFuseCurve(M, FUSE_CURVES[curve]);
  }

  return Infinity; // Unknown curve
}

/**
 * Interpolate fuse curve at a given multiple M.
 * Linear interpolation between known points.
 */
function interpolateFuseCurve(M, fuseCurve) {
  const points = fuseCurve.points;
  if (!points || points.length === 0) return Infinity;

  // Below first point: return a long time
  if (M <= points[0][0]) {
    return points[0][1] * 2;
  }

  // Above last point: return a short time
  if (M >= points[points.length - 1][0]) {
    return Math.max(0.001, points[points.length - 1][1] / 2);
  }

  // Find surrounding points
  for (let i = 0; i < points.length - 1; i++) {
    const [M1, t1] = points[i];
    const [M2, t2] = points[i + 1];
    if (M >= M1 && M <= M2) {
      // Log-log interpolation for fuses (more accurate)
      const logM = Math.log(M);
      const logM1 = Math.log(M1);
      const logM2 = Math.log(M2);
      const logt = Math.log(t1) + (logM - logM1) * (Math.log(t2) - Math.log(t1)) / (logM2 - logM1);
      return Math.exp(logt);
    }
  }

  return Infinity;
}

/**
 * Calculate current for a given trip time (inverse).
 * Solves: I_fault = I_pickup * M where M is found from t = f(M, timeDial).
 *
 * @param {number} tripTime - Desired trip time in seconds
 * @param {number} Ipickup - Pickup current (secondary A)
 * @param {string} curve - Curve type
 * @param {number} timeDial - Time dial
 * @returns {number} Required current in secondary Amperes
 */
export function calcCurrentForTime(tripTime, Ipickup, curve, timeDial = 0.5) {
  if (tripTime <= 0 || Ipickup <= 0) {
    return 0;
  }

  if (curve === CURVE_TYPES.INSTANTANEOUS) {
    return Ipickup * 1000; // Very high
  }

  if (curve === CURVE_TYPES.DEFINITE_TIME) {
    return tripTime === timeDial ? Ipickup * 2 : Ipickup * 1000;
  }

  // Binary search for M
  let M_low = 1.01;
  let M_high = 1000;

  for (let iter = 0; iter < 30; iter++) {
    const M_mid = (M_low + M_high) / 2;
    const t_calc = calcTripTime(M_mid * Ipickup, Ipickup, curve, timeDial);

    if (Math.abs(t_calc - tripTime) < 0.001 * tripTime) {
      return M_mid * Ipickup;
    }

    if (t_calc > tripTime) {
      M_low = M_mid;
    } else {
      M_high = M_mid;
    }
  }

  return M_high * Ipickup;
}

/**
 * Get all available curve types grouped by family.
 */
export function getCurveGroups() {
  return {
    iec: Object.keys(IEC_CURVES).map(k => ({
      id: k,
      label: IEC_CURVES[k].label,
      family: 'IEC 60255-4',
    })),
    ieee: Object.keys(IEEE_CURVES).map(k => ({
      id: k,
      label: IEEE_CURVES[k].label,
      family: 'IEEE C37.112',
    })),
    ansi: Object.keys(ANSI_CURVES).map(k => ({
      id: k,
      label: ANSI_CURVES[k].label,
      family: 'ANSI/IEEE',
    })),
    fuse: Object.keys(FUSE_CURVES).map(k => ({
      id: k,
      label: FUSE_CURVES[k].label,
      family: 'Fuse',
    })),
    special: [
      { id: CURVE_TYPES.INSTANTANEOUS, label: 'Instantaneous', family: 'Special' },
      { id: CURVE_TYPES.DEFINITE_TIME, label: 'Definite Time', family: 'Special' },
    ],
  };
}

/**
 * Generate TCC curve points for graphing.
 * Returns array of [current, time] pairs.
 */
export function generateTccCurve(Ipickup, curve, timeDial, minCurrent = 1.0, maxCurrent = 100.0) {
  const points = [];

  // Logarithmic spacing for better curve resolution
  const numPoints = 80;
  for (let i = 0; i < numPoints; i++) {
    const ratio = i / (numPoints - 1); // 0 to 1
    const logI = Math.log(minCurrent) + ratio * (Math.log(maxCurrent) - Math.log(minCurrent));
    const current = Math.exp(logI);

    const t = calcTripTime(current, Ipickup, curve, timeDial);
    if (isFinite(t) && t > 0) {
      points.push([current, t]);
    }
  }

  return points;
}

/**
 * Validate TCC parameters.
 */
export function validateTccParams(Ipickup, curve, timeDial) {
  const errors = [];

  if (Ipickup <= 0) errors.push('Pickup must be > 0 A');
  if (!(curve in Object.values(CURVE_TYPES))) errors.push(`Unknown curve: ${curve}`);
  if (timeDial <= 0 || timeDial > 10) errors.push('Time dial must be between 0 and 10');

  return {
    valid: errors.length === 0,
    errors,
  };
}
