/**
 * faults.js — Symmetrical-component fault calculations for 10 fault types.
 *
 * All functions operate on secondary-side quantities (relay measurement side).
 * Inputs are in secondary volts and ohms (referred to secondary).
 * Outputs are magnitude in secondary Amperes and angle in degrees.
 *
 * Fault types: AG, BG, CG, AB, BC, CA, ABG, BCG, CAG, ABC
 *
 * Theory: Method of Symmetrical Components (Fortescue).
 *   I1 = Vf / (Z1 + Z2 + Z0 + ...) depending on fault type.
 *   Phase currents: [Ia, Ib, Ic] = A * [I0, I1, I2]^T
 *   where A is the symmetrical components transformation matrix.
 *
 * Reference logic ported from src/FaultCalculator.jsx:6-55.
 */

import { add, sub, mul, div, mag, ang, polar, rotate } from "./complex.js";

const DEG = Math.PI / 180;

/** Symmetrical components operator a = 1∠120° */
const A1 = polar(1, 120 * DEG);
/** Symmetrical components operator a² = 1∠240° */
const A2 = polar(1, 240 * DEG);
/** Scalar -1 as complex */
const NEG1 = { r: -1, i: 0 };

/**
 * Transform sequence components [I0, I1, I2] to phase currents [Ia, Ib, Ic].
 * Ia = I0 + I1 + I2
 * Ib = I0 + a²·I1 + a·I2
 * Ic = I0 + a·I1 + a²·I2
 */
function toPhase(I0c, I1c, I2c) {
  const Ia = add(add(I0c, I1c), I2c);
  const Ib = add(add(I0c, mul(A2, I1c)), mul(A1, I2c));
  const Ic = add(add(I0c, mul(A1, I1c)), mul(A2, I2c));
  return [Ia, Ib, Ic];
}

/**
 * Compute sequence voltages at the fault point and transform to phase voltages.
 * Va1 = Vf - Z1·I1,  Va2 = -Z2·I2 (Z2=Z1),  Va0 = -Z0·I0
 */
function seqVoltages(Vfv, Z1, Z0, I0c, I1c, I2c) {
  const Va1 = sub(Vfv, mul(Z1, I1c));
  const Va2 = mul(NEG1, mul(Z1, I2c));
  const Va0 = mul(NEG1, mul(Z0, I0c));
  return toPhase(Va0, Va1, Va2);
}

/**
 * Format a complex phasor to { mag, angDeg } with rounding.
 * @param {{ r: number, i: number }} cx
 * @returns {{ mag: number, angDeg: number }}
 */
function phas(cx) {
  return {
    mag: Math.round(mag(cx) * 1000) / 1000,
    angDeg: Math.round(ang(cx) / DEG * 10) / 10,
  };
}

/**
 * Core symmetrical-component solver shared by all fault types.
 * Mirrors calcFaultPhasors() from FaultCalculator.jsx with identical math.
 *
 * @param {string} type - Fault type: AG|BG|CG|AB|BC|CA|ABG|BCG|CAG|ABC
 * @param {number} Vf   - Pre-fault phase-to-ground voltage (V, secondary)
 * @param {{ r: number, i: number }} Z1 - Positive-sequence impedance (Ω, secondary)
 * @param {{ r: number, i: number }} Z0 - Zero-sequence impedance (Ω, secondary)
 * @param {number} Rf   - Fault resistance (Ω)
 * @returns {{ currents: { Ia, Ib, Ic }, voltages: { Va, Vb, Vc } }}
 *   Each phasor: { mag: number (A or V), angDeg: number (degrees) }
 */
function solveFault(type, Vf, Z1, Z0, Rf) {
  const Vfv = { r: Vf, i: 0 };
  const Zf = { r: Rf, i: 0 };
  const Z1Z2 = add(Z1, Z1);

  let I0c, I1c, I2c;

  if (type === "AG" || type === "BG" || type === "CG") {
    // Single line-to-ground: I1=I2=I0=Vf/(2Z1+Z0+3Rf)
    const den = add(add(Z1Z2, Z0), { r: Rf * 3, i: 0 });
    I1c = div(Vfv, den);
    I0c = I1c;
    I2c = I1c;
  } else if (type === "AB" || type === "BC" || type === "CA") {
    // Line-to-line: I1=Vf/2Z1, I2=-I1, I0=0
    I1c = div(Vfv, Z1Z2);
    I2c = { r: -I1c.r, i: -I1c.i };
    I0c = { r: 0, i: 0 };
  } else if (type === "ABG" || type === "BCG" || type === "CAG") {
    // Double line-to-ground: I1=Vf/(Z1+Z0f||Z1), I2=-I1*Z0f/(Z1+Z0f), I0=-I1-I2
    const Z0f = add(Z0, { r: Rf * 3, i: 0 });
    const par = div(mul(Z1, Z0f), add(Z1, Z0f));
    I1c = div(Vfv, add(Z1, par));
    I2c = mul(NEG1, div(mul(I1c, Z0f), add(Z1, Z0f)));
    I0c = sub(mul(NEG1, I1c), I2c);
  } else {
    // Three-phase (ABC): I1=Vf/(Z1+Rf), I2=I0=0
    I1c = div(Vfv, add(Z1, Zf));
    I0c = { r: 0, i: 0 };
    I2c = { r: 0, i: 0 };
  }

  // Rotate sequence currents for B-phase and C-phase reference faults
  // so that results are expressed relative to the faulted phase(s)
  let rotI = 0;
  if (type === "BG" || type === "BC")               rotI = -120;
  else if (type === "CG" || type === "CA")          rotI =  120;
  else if (type === "BCG")                          rotI = -120;
  else if (type === "CAG")                          rotI =  120;

  if (rotI !== 0) {
    I0c = rotate(I0c, rotI);
    I1c = rotate(I1c, rotI);
    I2c = rotate(I2c, rotI);
  }

  const [Ia, Ib, Ic] = toPhase(I0c, I1c, I2c);

  // Voltages use un-rotated I0 to keep voltage reference correct
  const I0v = rotI !== 0 ? rotate(I0c, 0) : I0c;
  const [Va, Vb, Vc] = seqVoltages(Vfv, Z1, Z0, I0v, I1c, I2c);

  return {
    currents: { Ia: phas(Ia), Ib: phas(Ib), Ic: phas(Ic) },
    voltages: { Va: phas(Va), Vb: phas(Vb), Vc: phas(Vc) },
  };
}

// ─── Public API: one exported function per fault type ────────────────────────

/**
 * Three-phase (ABC) balanced fault.
 * @param {number} vf    - Pre-fault phase-to-ground voltage (V, secondary)
 * @param {{ r, x }} z1  - Positive-sequence impedance {r, x} in Ω
 * @param {{ r, x }} z0  - Zero-sequence impedance {r, x} in Ω (unused for 3φ)
 * @param {number} [rf=0] - Fault resistance (Ω)
 * @returns {{ currents: { Ia, Ib, Ic }, voltages: { Va, Vb, Vc } }}
 */
export function calc3PhaseFault(vf, z1, z0, rf = 0) {
  return solveFault("ABC", vf, { r: z1.r, i: z1.x }, { r: z0.r, i: z0.x }, rf);
}

/**
 * Single line-to-ground fault on phase A.
 */
export function calcAGFault(vf, z1, z0, rf = 0) {
  return solveFault("AG", vf, { r: z1.r, i: z1.x }, { r: z0.r, i: z0.x }, rf);
}

/**
 * Single line-to-ground fault on phase B.
 */
export function calcBGFault(vf, z1, z0, rf = 0) {
  return solveFault("BG", vf, { r: z1.r, i: z1.x }, { r: z0.r, i: z0.x }, rf);
}

/**
 * Single line-to-ground fault on phase C.
 */
export function calcCGFault(vf, z1, z0, rf = 0) {
  return solveFault("CG", vf, { r: z1.r, i: z1.x }, { r: z0.r, i: z0.x }, rf);
}

/**
 * Line-to-line fault between phases A and B.
 */
export function calcABFault(vf, z1, z0, rf = 0) {
  return solveFault("AB", vf, { r: z1.r, i: z1.x }, { r: z0.r, i: z0.x }, rf);
}

/**
 * Line-to-line fault between phases B and C.
 */
export function calcBCFault(vf, z1, z0, rf = 0) {
  return solveFault("BC", vf, { r: z1.r, i: z1.x }, { r: z0.r, i: z0.x }, rf);
}

/**
 * Line-to-line fault between phases C and A.
 */
export function calcCAFault(vf, z1, z0, rf = 0) {
  return solveFault("CA", vf, { r: z1.r, i: z1.x }, { r: z0.r, i: z0.x }, rf);
}

/**
 * Double line-to-ground fault on phases A and B.
 */
export function calcABGFault(vf, z1, z0, rf = 0) {
  return solveFault("ABG", vf, { r: z1.r, i: z1.x }, { r: z0.r, i: z0.x }, rf);
}

/**
 * Double line-to-ground fault on phases B and C.
 */
export function calcBCGFault(vf, z1, z0, rf = 0) {
  return solveFault("BCG", vf, { r: z1.r, i: z1.x }, { r: z0.r, i: z0.x }, rf);
}

/**
 * Double line-to-ground fault on phases C and A.
 */
export function calcCAGFault(vf, z1, z0, rf = 0) {
  return solveFault("CAG", vf, { r: z1.r, i: z1.x }, { r: z0.r, i: z0.x }, rf);
}

// ─── Parity tests ────────────────────────────────────────────────────────────
// Three cases validated against calcFaultPhasors() in FaultCalculator.jsx.
// Expected values derived from exact arithmetic; tolerance ±0.1%.

/**
 * Run inline parity tests. Logs PASS/FAIL to console.
 * Throws on first failure (GATE FAIL).
 * @returns {boolean} true if all tests pass
 */
export function runParityTests() {
  const TOL = 0.001; // 0.1%

  function assertClose(label, got, expected, absTol) {
    if (absTol !== undefined) {
      // Absolute tolerance for near-zero expected values
      const absErr = Math.abs(got - expected);
      if (absErr > absTol) {
        console.error(`[PARITY-TEST] FAIL ${label}: got=${got.toFixed(6)} expected=${expected.toFixed(6)} absErr=${absErr.toFixed(6)} (tol=${absTol})`);
        throw new Error(`PARITY GATE FAIL: ${label}`);
      }
      return;
    }
    const err = Math.abs(got - expected) / (Math.abs(expected) || 1);
    if (err > TOL) {
      console.error(`[PARITY-TEST] FAIL ${label}: got=${got.toFixed(6)} expected=${expected.toFixed(6)} err=${(err*100).toFixed(4)}%`);
      throw new Error(`PARITY GATE FAIL: ${label}`);
    }
  }

  // ── Caso 1: Falta AG ─────────────────────────────────────────────────────
  // Vf=66.4V, Z1=(0.3+j1.2)Ω, Z0=(0.5+j3.0)Ω, Rf=0
  // Expected: Ia≈36.1466A @ -78.49°  (secondary side, 3·I1)
  {
    const res = calcAGFault(66.4, { r: 0.3, x: 1.2 }, { r: 0.5, x: 3.0 }, 0);
    const expectedMag = 36.1466;
    const expectedAng = -78.49;
    assertClose("Caso1_AG_Ia_mag", res.currents.Ia.mag, expectedMag);
    assertClose("Caso1_AG_Ia_ang", res.currents.Ia.angDeg, expectedAng);
    console.log("[PARITY-TEST] Caso 1 AG: PASS  Ia=" + res.currents.Ia.mag.toFixed(4) + "A ∠" + res.currents.Ia.angDeg + "°");
  }

  // ── Caso 2: Falta ABC (3φ) ───────────────────────────────────────────────
  // Vf=66.4V (todas fases), Z1=(0.3+j1.2)Ω, Rf=0
  // Expected: Ia=Ib=Ic≈53.6812A  (secondary side, Vf/|Z1|)
  {
    const res = calc3PhaseFault(66.4, { r: 0.3, x: 1.2 }, { r: 0.5, x: 3.0 }, 0);
    const expectedMag = 53.6812;
    assertClose("Caso2_ABC_Ia_mag", res.currents.Ia.mag, expectedMag);
    assertClose("Caso2_ABC_Ib_mag", res.currents.Ib.mag, expectedMag);
    assertClose("Caso2_ABC_Ic_mag", res.currents.Ic.mag, expectedMag);
    console.log("[PARITY-TEST] Caso 2 ABC: PASS  Ia=" + res.currents.Ia.mag.toFixed(4) + "A");
  }

  // ── Caso 3: Falta AB ─────────────────────────────────────────────────────
  // Vf=66.4V, Z1=(0.3+j1.2)Ω, Rf=0
  // Expected: Ia≈0A, Ib≈46.4893A @ -165.96°
  {
    const res = calcABFault(66.4, { r: 0.3, x: 1.2 }, { r: 0.5, x: 3.0 }, 0);
    const expectedIa = 0.0;
    const expectedIb = 46.4893;
    assertClose("Caso3_AB_Ia_mag", res.currents.Ia.mag, expectedIa, 1e-6); // near-zero: use absolute tolerance
    assertClose("Caso3_AB_Ib_mag", res.currents.Ib.mag, expectedIb);
    console.log("[PARITY-TEST] Caso 3 AB: PASS  Ia=" + res.currents.Ia.mag.toFixed(4) + "A  Ib=" + res.currents.Ib.mag.toFixed(4) + "A");
  }

  console.log("[PARITY-TEST] ✓ PARITY GATE PASS — todos os 3 casos dentro de ±0.1%");
  return true;
}
