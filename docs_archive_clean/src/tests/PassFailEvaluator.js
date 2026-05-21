import { getDefaults } from './testDefaults.js';

export function evaluate(fn, point, measured, customTol = null) {
  if (!point.kind) return { pass: false, failReason: 'missing-kind' };

  const tol = customTol || getDefaults(fn);

  if (point.kind === 'curve' || point.kind === 'definite') {
    return evaluateTime(point, measured, tol);
  }

  if (point.kind.startsWith('pickup-')) {
    return evaluatePickup(point, measured, tol);
  }

  if (point.kind === 'frequency') {
    return evaluateFrequency(point, measured, tol);
  }

  if (point.kind === 'directional-angle') {
    return evaluateDirectional(point, measured, tol);
  }

  return { pass: false, failReason: 'unknown-kind' };
}

function evaluateTime(point, measured, tol) {
  if (!measured.tMeasured && measured.tMeasured !== 0) {
    return { pass: false, failReason: 'no-measurement' };
  }

  const { tExpected } = point;
  const { tMeasured } = measured;

  if (tExpected === Infinity) {
    return { pass: false, failReason: 'infinite-expected-time' };
  }

  const dtAbs = Math.abs(tMeasured - tExpected);
  const dtPct = dtAbs / tExpected;

  const tolPct = tol.tolPctTime || 0.05;
  const tolAbs = tol.tolAbsTime || 0.025;

  // Passar se cumprir QUALQUER uma das tolerâncias (padrão IEC/ANSI)
  const passTime = dtPct <= tolPct || dtAbs <= tolAbs;

  console.log(`[PassFail] tExpected=${tExpected.toFixed(3)}s, tMeasured=${tMeasured.toFixed(3)}s, dtAbs=${dtAbs.toFixed(4)}s (${(dtAbs*1000).toFixed(2)}ms), dtPct=${(dtPct*100).toFixed(2)}%, tolPct=${(tolPct*100).toFixed(2)}%, tolAbs=${(tolAbs*1000).toFixed(2)}ms → ${passTime ? 'PASS' : 'FAIL'}`);

  return {
    pass: passTime,
    tMeasured,
    tExpected,
    dtAbs,
    dtPct: dtPct * 100,
    failReason: passTime ? null : `time-deviation: ${(dtPct * 100).toFixed(2)}%`,
  };
}

function evaluatePickup(point, measured, tol) {
  if (!measured.IpickupMeasured && measured.IpickupMeasured !== 0) {
    return { pass: false, failReason: 'no-pickup-measurement' };
  }

  const { Ipk } = point;
  const { IpickupMeasured } = measured;

  const dI = Math.abs(IpickupMeasured - Ipk);
  const dIPct = dI / Ipk;

  const tolPct = tol.tolPctI || 0.03;

  const pass = dIPct <= tolPct;

  return {
    pass,
    IpickupMeasured,
    Ipk,
    dI,
    dIPct: dIPct * 100,
    failReason: pass ? null : `pickup-deviation: ${(dIPct * 100).toFixed(2)}%`,
  };
}

function evaluateFrequency(point, measured, tol) {
  if (measured.freqMeasured == null) {
    return { pass: false, failReason: 'no-frequency-measurement' };
  }

  const { frequency } = point;
  const { freqMeasured } = measured;

  const dFreq = Math.abs(freqMeasured - frequency);
  const tolHz = tol.tolHz || 0.05;

  const pass = dFreq <= tolHz;

  return {
    pass,
    freqMeasured,
    frequency,
    dFreq,
    failReason: pass ? null : `frequency-deviation: ${dFreq.toFixed(2)} Hz`,
  };
}

function evaluateDirectional(point, measured, tol) {
  if (measured.tripDetected === undefined) {
    return { pass: false, failReason: 'no-trip-detected' };
  }

  const tolAngle = tol.tolAngleDeg || 3;
  const angleOK = measured.tripDetected === true;

  return {
    pass: angleOK,
    tripDetected: measured.tripDetected,
    failReason: angleOK ? null : 'no-trip-in-directional-zone',
  };
}

export const PassFailEvaluator = {
  evaluate,
};
