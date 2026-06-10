/**
 * directionalLogic.js — Directional element polarization (32/67/67N)
 *
 * Implements torque-style directional logic for protection elements that need
 * to distinguish forward vs. reverse fault directions. The operating quantity
 * (I) is compared against a polarizing reference (V) rotated by the Maximum
 * Torque Angle (MTA).
 *
 * Torque equation: T = |V| * |I| * cos(angle(V) - angle(I) - MTA)
 *   T > 0 → Forward
 *   T < 0 → Reverse
 *   |T| ≈ 0 (near boundary) → Dead-zone
 *
 * Polarization methods:
 *  - V2  (negative-sequence voltage)
 *  - 3V0 (zero-sequence / residual voltage)
 *  - I2  (negative-sequence current — cross-polarized)
 *
 * All angles are degrees. All trigonometry is local — no external dependencies.
 */

const DEAD_ZONE_DEG = 5; // ±5° of the perpendicular: torque essentially zero

/**
 * Normalize angle to (-180, 180].
 * @param {number} deg
 * @returns {number}
 */
function normalizeDeg(deg) {
  let a = deg % 360;
  if (a > 180) a -= 360;
  if (a <= -180) a += 360;
  return a;
}

/**
 * Compute the directional decision for a given operating + polarizing pair.
 *
 * @param {number} Vmag        Polarizing voltage magnitude (V) — must be > 0
 * @param {number} Vang        Polarizing voltage angle (deg)
 * @param {number} Imag        Operating current magnitude (A)
 * @param {number} Iang        Operating current angle (deg)
 * @param {number} mtaAngle    Maximum Torque Angle (deg), e.g. 30/60/-45
 * @param {string} [polarity="forward"]  "forward" | "reverse" — element polarity
 * @returns {{
 *   torque: number,
 *   torqueMax: number,
 *   torqueAngle: number,
 *   quadrant: "Forward" | "Reverse" | "Dead-zone" | "Unknown",
 *   forward: boolean,
 *   phasor: { Vr: number, Vi: number, Ir: number, Ii: number, mtaR: number, mtaI: number }
 * }}
 */
export function evaluateDirectional(Vmag, Vang, Imag, Iang, mtaAngle, polarity = "forward") {
  if (!isFinite(Vmag) || !isFinite(Imag) || Vmag <= 1e-6 || Imag <= 1e-6) {
    return {
      torque: 0,
      torqueMax: 0,
      torqueAngle: 0,
      quadrant: "Unknown",
      forward: false,
      phasor: { Vr: 0, Vi: 0, Ir: 0, Ii: 0, mtaR: 0, mtaI: 0 },
    };
  }

  const Vrad = (Vang * Math.PI) / 180;
  const Irad = (Iang * Math.PI) / 180;
  const mtaRad = (mtaAngle * Math.PI) / 180;

  const Vr = Vmag * Math.cos(Vrad);
  const Vi = Vmag * Math.sin(Vrad);
  const Ir = Imag * Math.cos(Irad);
  const Ii = Imag * Math.sin(Irad);

  // Torque = Vmag * Imag * cos((angle(V) - angle(I)) - MTA)
  const torqueAngle = normalizeDeg(Vang - Iang - mtaAngle);
  const torque = Vmag * Imag * Math.cos((torqueAngle * Math.PI) / 180);
  const torqueMax = Vmag * Imag;

  // MTA reference vector (unit) for plotting
  const mtaR = Math.cos(Vrad - mtaRad);
  const mtaI = Math.sin(Vrad - mtaRad);

  let quadrant;
  const absAngle = Math.abs(torqueAngle);
  if (absAngle > 90 - DEAD_ZONE_DEG && absAngle < 90 + DEAD_ZONE_DEG) {
    quadrant = "Dead-zone";
  } else if (absAngle < 90) {
    quadrant = "Forward";
  } else {
    quadrant = "Reverse";
  }

  let forward = quadrant === "Forward";
  // If polarity is "reverse", invert the trip decision.
  if (polarity === "reverse") {
    forward = !forward;
  }

  return {
    torque,
    torqueMax,
    torqueAngle,
    quadrant,
    forward,
    phasor: { Vr, Vi, Ir, Ii, mtaR, mtaI },
  };
}

/**
 * Convenience: produce a textual recommendation based on the directional result.
 *
 * @param {ReturnType<typeof evaluateDirectional>} result
 * @returns {string}
 */
export function directionalRecommendation(result) {
  if (result.quadrant === "Unknown") {
    return "Polarização insuficiente — verifique Vpol > 0";
  }
  if (result.quadrant === "Dead-zone") {
    return "Zona morta — reduza MTA ou aumente operação";
  }
  if (result.forward) {
    return "Trip em Forward — elemento atua";
  }
  return "Trip bloqueado em Reverse — elemento não atua";
}
