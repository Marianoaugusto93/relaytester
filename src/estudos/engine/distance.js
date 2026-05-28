/**
 * distance.js — Distance protection (ANSI 21) — Impedance-based zone protection
 *
 * Implements:
 * - Mho characteristic (circular, polarized by MTA voltage)
 * - Quadrilateral characteristic (rectangular on R-X plane)
 * - Multiple zones with time delays
 * - Blinder logic (voltage/current ratio)
 * - Phase-to-phase and phase-to-ground variants
 *
 * Inputs: Voltage, current, fault type, MTA angle, zone impedance
 * Outputs: Zone reach (in Ω), reach % of line, trip signal by zone
 */

/**
 * Distance zone definition.
 * @typedef {Object} DistanceZone
 * @property {number} reach - Primary-side impedance reach in Ω
 * @property {number} timeDelay - Trip delay in seconds
 * @property {string} type - "mho" or "quadrilateral"
 * @property {number} mtaAngle - MTA (Max Torque Angle) in degrees (mho only)
 * @property {number} rBias - Resistance bias factor (mho only)
 */

/**
 * Calculate complex impedance from voltage and current phasors.
 * Z = V / I (in Ω)
 *
 * @param {Object} voltage - {r, i} complex voltage
 * @param {Object} current - {r, i} complex current
 * @returns {Object} {Z_r, Z_i, Z_mag, Z_angle}
 */
export function calcImpedance(voltage, current) {
  if (!voltage || !current) {
    return null;
  }

  const { r: vr, i: vi } = voltage;
  const { r: ir, i: ii } = current;

  // Z = V / I = (vr + j*vi) / (ir + j*ii)
  // Multiply by conjugate: Z = (V * conj(I)) / (I * conj(I))
  const denominator = ir * ir + ii * ii;
  if (denominator === 0) {
    return null;
  }

  const Z_r = (vr * ir + vi * ii) / denominator;
  const Z_i = (vi * ir - vr * ii) / denominator;
  const Z_mag = Math.sqrt(Z_r * Z_r + Z_i * Z_i);
  const Z_angle = Math.atan2(Z_i, Z_r) * (180 / Math.PI);

  return {
    Z_r: parseFloat(Z_r.toFixed(4)),
    Z_i: parseFloat(Z_i.toFixed(4)),
    Z_mag: parseFloat(Z_mag.toFixed(4)),
    Z_angle: parseFloat(Z_angle.toFixed(2)),
  };
}

/**
 * Check if impedance point falls within Mho circle.
 * Mho: Circle centered on R axis at (Z_reach/2, 0), radius = Z_reach/2
 *
 * @param {number} Z_r - Measured impedance real part (Ω)
 * @param {number} Z_i - Measured impedance imag part (Ω)
 * @param {number} reach - Zone reach (Ω)
 * @param {number} mtaAngle - MTA angle (deg), rotates circle
 * @returns {boolean}
 */
export function isMhoTrip(Z_r, Z_i, reach, mtaAngle = 60) {
  if (reach <= 0) return false;

  // Rotate impedance by -MTA to align with standard circle
  const angle_rad = -mtaAngle * (Math.PI / 180);
  const cos_a = Math.cos(angle_rad);
  const sin_a = Math.sin(angle_rad);

  const Z_r_rot = Z_r * cos_a - Z_i * sin_a;
  const Z_i_rot = Z_r * sin_a + Z_i * cos_a;

  // Standard Mho: circle center at (reach/2, 0), radius = reach/2
  const center_r = reach / 2;
  const dist_sq = (Z_r_rot - center_r) * (Z_r_rot - center_r) + Z_i_rot * Z_i_rot;
  const radius_sq = (reach / 2) * (reach / 2);

  return dist_sq <= radius_sq;
}

/**
 * Check if impedance point falls within Quadrilateral zone.
 * Quadrilateral: Rectangular box in R-X plane
 *   R: [-10%, +110%] of reach
 *   X: [-50%, +50%] of reach
 *
 * @param {number} Z_r - Real part (Ω)
 * @param {number} Z_i - Imag part (Ω)
 * @param {number} reach - Zone reach (Ω)
 * @returns {boolean}
 */
export function isQuadrilateralTrip(Z_r, Z_i, reach) {
  if (reach <= 0) return false;

  const r_min = -0.1 * reach;
  const r_max = 1.1 * reach;
  const x_min = -0.5 * reach;
  const x_max = 0.5 * reach;

  return Z_r >= r_min && Z_r <= r_max && Z_i >= x_min && Z_i <= x_max;
}

/**
 * Apply blinder logic: check voltage/current ratio to block pickup.
 * Blinders prevent false trips on low-voltage events (e.g., load encroachment).
 *
 * Blinder condition: V_rms > blinder_v (typically 10% of nominal)
 * If V < threshold, block distance trip and depend on overcurrent fallback.
 *
 * @param {number} voltage_mag - Voltage magnitude (V)
 * @param {number} current_mag - Current magnitude (A)
 * @param {number} blinder_threshold - Voltage threshold (V)
 * @returns {boolean} true if blinder allows trip (voltage sufficient)
 */
export function checkBlinder(voltage_mag, current_mag, blinder_threshold = 20) {
  return voltage_mag >= blinder_threshold;
}

/**
 * Evaluate all zones for a given impedance point.
 * Returns which zone (if any) has reached and the trip time.
 *
 * @param {Object} impedance - {Z_r, Z_i, Z_mag, Z_angle}
 * @param {Array<DistanceZone>} zones - Array of zone definitions
 * @param {number} voltage_mag - Voltage magnitude for blinder check
 * @param {number} current_mag - Current magnitude
 * @param {number} blinder_v - Blinder threshold voltage
 * @returns {Object} {zone, reach_pct, time_delay, tripped}
 */
export function evaluateDistanceZones(
  impedance,
  zones,
  voltage_mag,
  current_mag,
  blinder_v = 20
) {
  if (!impedance || !zones || zones.length === 0) {
    return { zone: null, reach_pct: 0, time_delay: 0, tripped: false };
  }

  const blinder_ok = checkBlinder(voltage_mag, current_mag, blinder_v);
  if (!blinder_ok) {
    return {
      zone: null,
      reach_pct: 0,
      time_delay: 0,
      tripped: false,
      blinded: true,
    };
  }

  const { Z_r, Z_i, Z_mag } = impedance;

  // Check each zone in order (Zone 1, Zone 2, Zone 3, Zone 4)
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    let trip = false;

    if (zone.type === "mho") {
      trip = isMhoTrip(Z_r, Z_i, zone.reach, zone.mtaAngle || 60);
    } else if (zone.type === "quadrilateral") {
      trip = isQuadrilateralTrip(Z_r, Z_i, zone.reach);
    }

    if (trip) {
      const reach_pct = (Z_mag / zone.reach) * 100;
      return {
        zone: i + 1, // Zone numbering starts at 1
        reach_pct: parseFloat(reach_pct.toFixed(2)),
        time_delay: zone.timeDelay || 0,
        tripped: true,
        zone_def: zone,
      };
    }
  }

  // No zone reached
  const max_reach = Math.max(...zones.map(z => z.reach || 0));
  const reach_pct = (Z_mag / max_reach) * 100;
  return {
    zone: null,
    reach_pct: Math.min(reach_pct, 100),
    time_delay: 0,
    tripped: false,
  };
}

/**
 * Calculate zone reach as percentage of line length.
 * Typical line length varies; this assumes a standard 50-100 km line.
 *
 * @param {number} zone_impedance_ohms - Zone reach in Ω
 * @param {number} line_impedance_per_km - Typically 0.03-0.05 Ω/km
 * @returns {number} Zone reach as % of line length
 */
export function calcZoneReachPct(zone_impedance_ohms, line_impedance_per_km = 0.04) {
  if (line_impedance_per_km <= 0) return 0;
  const line_length_km = zone_impedance_ohms / line_impedance_per_km;
  const typical_line_km = 80;
  return (line_length_km / typical_line_km) * 100;
}

/**
 * Generate standard 4-zone configuration for transmission line distance protection.
 * Zone 1: 85% of line, instantaneous
 * Zone 2: 120% of line, delayed (0.5s)
 * Zone 3: 150% of line, delayed (1.0s)
 * Zone 4: Reverse (for backup), delayed (2.0s)
 *
 * @param {number} line_impedance_ohms - Total primary-side line impedance (Ω)
 * @returns {Array<DistanceZone>}
 */
export function generateStandardZones(line_impedance_ohms) {
  return [
    {
      id: "Z1",
      name: "Zone 1 (85% line)",
      reach: line_impedance_ohms * 0.85,
      timeDelay: 0,
      type: "mho",
      mtaAngle: 60,
    },
    {
      id: "Z2",
      name: "Zone 2 (120% line)",
      reach: line_impedance_ohms * 1.2,
      timeDelay: 0.5,
      type: "mho",
      mtaAngle: 60,
    },
    {
      id: "Z3",
      name: "Zone 3 (150% line)",
      reach: line_impedance_ohms * 1.5,
      timeDelay: 1.0,
      type: "mho",
      mtaAngle: 60,
    },
    {
      id: "Z4",
      name: "Zone 4 Reverse (0.85 line backward)",
      reach: line_impedance_ohms * 0.85,
      timeDelay: 2.0,
      type: "quadrilateral",
    },
  ];
}

/**
 * Validate distance protection parameters.
 */
export function validateDistanceParams(voltage_mag, current_mag, zones) {
  const errors = [];

  if (voltage_mag < 0) errors.push("Voltage must be >= 0 V");
  if (current_mag < 0) errors.push("Current must be >= 0 A");
  if (!zones || zones.length === 0) errors.push("At least one zone required");

  zones?.forEach((z, i) => {
    if (z.reach <= 0) errors.push(`Zone ${i + 1}: reach must be > 0`);
    if (z.timeDelay < 0) errors.push(`Zone ${i + 1}: timeDelay must be >= 0`);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
