/**
 * complex.js — Purely functional complex-number arithmetic.
 * No external dependencies. All functions are stateless and pure.
 *
 * A complex number is represented as a plain object: { r: number, i: number }
 * where `r` is the real part and `i` is the imaginary part.
 */

/**
 * Construct a complex number from real and imaginary parts.
 * @param {number} r - Real part
 * @param {number} i - Imaginary part
 * @returns {{ r: number, i: number }}
 */
export function c(r, i) {
  return { r, i };
}

/**
 * Add two complex numbers.
 * @param {{ r: number, i: number }} a
 * @param {{ r: number, i: number }} b
 * @returns {{ r: number, i: number }}
 */
export function add(a, b) {
  return { r: a.r + b.r, i: a.i + b.i };
}

/**
 * Subtract complex b from complex a.
 * @param {{ r: number, i: number }} a
 * @param {{ r: number, i: number }} b
 * @returns {{ r: number, i: number }}
 */
export function sub(a, b) {
  return { r: a.r - b.r, i: a.i - b.i };
}

/**
 * Multiply two complex numbers.
 * @param {{ r: number, i: number }} a
 * @param {{ r: number, i: number }} b
 * @returns {{ r: number, i: number }}
 */
export function mul(a, b) {
  return {
    r: a.r * b.r - a.i * b.i,
    i: a.r * b.i + a.i * b.r,
  };
}

/**
 * Divide complex a by complex b.
 * @param {{ r: number, i: number }} a
 * @param {{ r: number, i: number }} b
 * @returns {{ r: number, i: number }}
 * @throws {Error} If b is zero (denominator magnitude is zero)
 */
export function div(a, b) {
  const d = b.r * b.r + b.i * b.i;
  if (d === 0) throw new Error("Division by zero in complex arithmetic");
  return {
    r: (a.r * b.r + a.i * b.i) / d,
    i: (a.i * b.r - a.r * b.i) / d,
  };
}

/**
 * Complex conjugate of a.
 * @param {{ r: number, i: number }} a
 * @returns {{ r: number, i: number }}
 */
export function conj(a) {
  return { r: a.r, i: -a.i };
}

/**
 * Magnitude (modulus) of a complex number.
 * @param {{ r: number, i: number }} a
 * @returns {number}
 */
export function mag(a) {
  return Math.sqrt(a.r * a.r + a.i * a.i);
}

/**
 * Phase angle of a complex number in radians.
 * @param {{ r: number, i: number }} a
 * @returns {number} Angle in radians, range [-π, π]
 */
export function ang(a) {
  return Math.atan2(a.i, a.r);
}

/**
 * Construct a complex number from polar form.
 * @param {number} magnitude
 * @param {number} angleRad - Angle in radians
 * @returns {{ r: number, i: number }}
 */
export function polar(magnitude, angleRad) {
  return {
    r: magnitude * Math.cos(angleRad),
    i: magnitude * Math.sin(angleRad),
  };
}

/**
 * Rotate a complex number by `deg` degrees (counter-clockwise).
 * Equivalent to multiplying by e^(j*deg*π/180).
 * @param {{ r: number, i: number }} a
 * @param {number} deg - Degrees to rotate
 * @returns {{ r: number, i: number }}
 */
export function rotate(a, deg) {
  return mul(a, polar(1, deg * Math.PI / 180));
}
