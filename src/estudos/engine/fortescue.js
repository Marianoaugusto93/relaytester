/**
 * fortescue.js — Symmetrical component transformations (ABC ↔ 012)
 *
 * Method of Symmetrical Components (Fortescue) transforms 3-phase quantities
 * to sequence components (positive, negative, zero) and vice versa.
 *
 * Operator a = 1∠120° = e^(j2π/3) = -0.5 + j0.866...
 * Operator a² = 1∠240° = -0.5 - j0.866...
 */

import { c, add, mul, mag, ang, polar } from "./complex.js";

const DEG = Math.PI / 180;

/** Operator a = 1∠120° */
const A1 = polar(1, 120 * DEG);
/** Operator a² = 1∠240° */
const A2 = polar(1, 240 * DEG);

/**
 * Transform phase currents [Ia, Ib, Ic] to sequence components [I0, I1, I2].
 * I0 = (Ia + Ib + Ic) / 3
 * I1 = (Ia + a·Ib + a²·Ic) / 3
 * I2 = (Ia + a²·Ib + a·Ic) / 3
 *
 * @param {{ r: number, i: number }} Ia - Phase A current (complex)
 * @param {{ r: number, i: number }} Ib - Phase B current (complex)
 * @param {{ r: number, i: number }} Ic - Phase C current (complex)
 * @returns {{ I0, I1, I2 }} Sequence components (complex)
 */
export function phaseToSeq(Ia, Ib, Ic) {
  const one3 = { r: 1 / 3, i: 0 };
  const I0 = mul(add(add(Ia, Ib), Ic), one3);
  const I1 = mul(add(add(Ia, mul(A1, Ib)), mul(A2, Ic)), one3);
  const I2 = mul(add(add(Ia, mul(A2, Ib)), mul(A1, Ic)), one3);
  return { I0, I1, I2 };
}

/**
 * Transform sequence components [I0, I1, I2] to phase currents [Ia, Ib, Ic].
 * Ia = I0 + I1 + I2
 * Ib = I0 + a²·I1 + a·I2
 * Ic = I0 + a·I1 + a²·I2
 *
 * @param {{ r: number, i: number }} I0 - Zero-sequence component (complex)
 * @param {{ r: number, i: number }} I1 - Positive-sequence component (complex)
 * @param {{ r: number, i: number }} I2 - Negative-sequence component (complex)
 * @returns {{ Ia, Ib, Ic }} Phase currents (complex)
 */
export function seqToPhase(I0, I1, I2) {
  const Ia = add(add(I0, I1), I2);
  const Ib = add(add(I0, mul(A2, I1)), mul(A1, I2));
  const Ic = add(add(I0, mul(A1, I1)), mul(A2, I2));
  return { Ia, Ib, Ic };
}

/**
 * Transform phase voltages [Va, Vb, Vc] to sequence components [V0, V1, V2].
 *
 * @param {{ r: number, i: number }} Va - Phase A voltage (complex)
 * @param {{ r: number, i: number }} Vb - Phase B voltage (complex)
 * @param {{ r: number, i: number }} Vc - Phase C voltage (complex)
 * @returns {{ V0, V1, V2 }} Sequence components (complex)
 */
export function voltagePhaseToSeq(Va, Vb, Vc) {
  const one3 = { r: 1 / 3, i: 0 };
  const V0 = mul(add(add(Va, Vb), Vc), one3);
  const V1 = mul(add(add(Va, mul(A1, Vb)), mul(A2, Vc)), one3);
  const V2 = mul(add(add(Va, mul(A2, Vb)), mul(A1, Vc)), one3);
  return { V0, V1, V2 };
}

/**
 * Transform sequence voltage components [V0, V1, V2] to phase voltages [Va, Vb, Vc].
 *
 * @param {{ r: number, i: number }} V0 - Zero-sequence component (complex)
 * @param {{ r: number, i: number }} V1 - Positive-sequence component (complex)
 * @param {{ r: number, i: number }} V2 - Negative-sequence component (complex)
 * @returns {{ Va, Vb, Vc }} Phase voltages (complex)
 */
export function voltageSeqToPhase(V0, V1, V2) {
  const Va = add(add(V0, V1), V2);
  const Vb = add(add(V0, mul(A2, V1)), mul(A1, V2));
  const Vc = add(add(V0, mul(A1, V1)), mul(A2, V2));
  return { Va, Vb, Vc };
}

/**
 * Compute positive-sequence (fundamental) symmetry factor.
 * Ratio of I1 magnitude to average of phase magnitudes.
 * Perfect 3-phase (I0=I2=0) → factor = 1
 *
 * @param {{ r: number, i: number }} Ia - Phase A current
 * @param {{ r: number, i: number }} Ib - Phase B current
 * @param {{ r: number, i: number }} Ic - Phase C current
 * @returns {number} Symmetry factor 0..1
 */
export function symmetryFactor(Ia, Ib, Ic) {
  const { I1 } = phaseToSeq(Ia, Ib, Ic);
  const avgMag = (mag(Ia) + mag(Ib) + mag(Ic)) / 3;
  if (avgMag < 1e-9) return 0;
  return Math.min(1, mag(I1) / avgMag);
}
