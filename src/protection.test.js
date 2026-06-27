import { describe, it, expect } from "vitest";
import {
  toRad, toRect, fromRect, calc3, calcPower, calcI2,
  evalCurveTime, calcTheoreticalTripTime, calc51NTheoreticalTripTime,
  resolveCurveName, CURVE_MAP,
  evaluate27Stage, evaluate59Stage, getVoltagesPu,
  evaluate67Stage, evaluate67NStage,
  getCurrentForFunc, calcTripTime,
  evaluate87Stage, calc87TripTimeReal,
  calc21Impedance, evaluate21Stage, calc21TripTimeReal, isMho21,
  evaluate50BFStage, calc50BFTripTimeReal,
  calc49TripTime, evaluate49Stage,
  evaluate25Stage, calc25TripTimeReal,
  evaluate81RStage, calc81RTripTimeReal,
} from "./protection.js";

// Helpers
const ph = (mag, ang) => ({ mag, ang });
const currents = (a, b, c) => ({ Ia: a, Ib: b, Ic: c });
const voltages = (a, b, c) => ({ Va: a, Vb: b, Vc: c });

describe("87 differential (evaluate87Stage)", () => {
  const stage = { Ipu: 0.2, knee: 2, slope1: 25, slope2: 50, thr2h: 15, tOp: 0.025 };
  it("does not trip on through-fault (IW1 ≈ IW2)", () => {
    const r = evaluate87Stage(stage, { IW1: ph(5, 0), IW2: ph(5, 0), h2pct: 0 });
    expect(r.tripped).toBe(false);
    expect(r.Idiff).toBeCloseTo(0, 3);
  });
  it("trips on internal fault (IW2 = 0) above the dual-slope characteristic", () => {
    const inj = { IW1: ph(5, 0), IW2: ph(0, 0), h2pct: 0 };
    const r = evaluate87Stage(stage, inj);
    expect(r.tripped).toBe(true);
    expect(r.Idiff).toBeCloseTo(5, 3);
    expect(calc87TripTimeReal(stage, inj)).toBeCloseTo(0.025, 6);
  });
  it("is blocked by 2nd-harmonic restraint (inrush) above threshold", () => {
    const inj = { IW1: ph(5, 0), IW2: ph(0, 0), h2pct: 20 };
    const r = evaluate87Stage(stage, inj);
    expect(r.blocked).toBe(true);
    expect(r.tripped).toBe(false);
    expect(calc87TripTimeReal(stage, inj)).toBe(Infinity);
  });
});

describe("21 distance (evaluate21Stage)", () => {
  // Falta na fase A: V=20∠0, I=5∠-75 → Z = 4Ω∠75° (loop A)
  const faultRR = {
    currents: currents(ph(5, -75), ph(0.05, -195), ph(0.05, 45)),
    voltages: voltages(ph(20, 0), ph(66.4, -120), ph(66.4, 120)),
  };
  // Carga normal: V nominal, I de carga pequena → Z grande, fora das zonas
  const loadRR = {
    currents: currents(ph(1, -30), ph(1, -150), ph(1, 90)),
    voltages: voltages(ph(66.4, 0), ph(66.4, -120), ph(66.4, 120)),
  };
  it("measures Z = V/I on the faulted-phase loop", () => {
    const Z = calc21Impedance(faultRR);
    expect(Z.loop).toBe("A");
    expect(Z.Z_mag).toBeCloseTo(4, 1);
    expect(Z.Z_angle).toBeCloseTo(75, 0);
  });
  it("trips when impedance falls inside the mho zone", () => {
    const z1 = { id: "21-Z1", type: "mho", reach: 8, mta: 75, tDelay: 0, minV: 0 };
    const r = evaluate21Stage(z1, faultRR);
    expect(r.tripped).toBe(true);
    expect(calc21TripTimeReal(z1, faultRR)).toBe(0);
  });
  it("does not trip on load (Z outside the zone)", () => {
    const z1 = { id: "21-Z1", type: "mho", reach: 8, mta: 75, tDelay: 0, minV: 0 };
    const r = evaluate21Stage(z1, loadRR);
    expect(r.tripped).toBe(false);
    expect(calc21TripTimeReal(z1, loadRR)).toBe(Infinity);
  });
  it("blocks on undervoltage blinder when minV set above measured V", () => {
    const z1 = { id: "21-Z1", type: "mho", reach: 8, mta: 75, tDelay: 0, minV: 30 };
    const r = evaluate21Stage(z1, faultRR); // Vmag=20 < 30 → blocked
    expect(r.blocked).toBe(true);
    expect(r.tripped).toBe(false);
  });
  it("mho geometry: point at center is inside, far point is outside", () => {
    expect(isMho21(4, 0, 8, 0)).toBe(true);
    expect(isMho21(20, 0, 8, 0)).toBe(false);
  });
});

describe("50BF breaker failure (evaluate50BFStage)", () => {
  const rrHigh = { currents: currents(ph(6, 0), ph(0.1, -120), ph(0.1, 120)), voltages: voltages(ph(0, 0), ph(0, 0), ph(0, 0)) };
  const rrLow = { currents: currents(ph(0.2, 0), ph(0.2, -120), ph(0.2, 120)), voltages: voltages(ph(66, 0), ph(66, -120), ph(66, 120)) };
  const stage = { pickup: 1, tBF: 0.15 };
  it("trips when phase current persists above pickup", () => {
    const r = evaluate50BFStage(stage, rrHigh);
    expect(r.tripped).toBe(true);
    expect(r.iMax).toBeCloseTo(6, 3);
    expect(calc50BFTripTimeReal(stage, rrHigh)).toBeCloseTo(0.15, 6);
  });
  it("does not trip when current is below the check element", () => {
    const r = evaluate50BFStage(stage, rrLow);
    expect(r.tripped).toBe(false);
    expect(calc50BFTripTimeReal(stage, rrLow)).toBe(Infinity);
  });
});

describe("49 thermal image (calc49TripTime / evaluate49Stage)", () => {
  const stage = { Ib: 5, k: 1.05, tau: 10, ipPrior: 0 };
  it("does not trip at or below the thermal threshold Iθ = k·Ib", () => {
    expect(calc49TripTime(stage, 5)).toBe(Infinity); // 5 < 5.25
    expect(calc49TripTime(stage, 5.25)).toBe(Infinity);
  });
  it("computes finite trip time above Iθ (cold curve)", () => {
    // t = τ·ln(I²/(I²-Iθ²)), Iθ=5.25, I=10 → 10·ln(100/72.4375)=3.225s
    const t = calc49TripTime(stage, 10);
    expect(t).toBeCloseTo(3.225, 2);
    const ev = evaluate49Stage(stage, { currents: currents(ph(10, 0), ph(1, -120), ph(1, 120)), voltages: voltages(ph(0,0),ph(0,0),ph(0,0)) });
    expect(ev.tripped).toBe(true);
    expect(ev.Ith).toBeCloseTo(5.25, 3);
  });
  it("higher current trips faster (inverse behaviour)", () => {
    expect(calc49TripTime(stage, 20)).toBeLessThan(calc49TripTime(stage, 10));
  });
});

describe("25 synchronism check (evaluate25Stage)", () => {
  const ref = { Vmag: 66.4, Vang: 0, fHz: 60 };
  const stage = { dVmax: 5, dAngMax: 10, dFmax: 0.1, tCheck: 0.1 };
  const mkRR = (vmag, vang) => ({ currents: currents(ph(0,0),ph(0,0),ph(0,0)), voltages: voltages(ph(vmag, vang), ph(66.4, -120), ph(66.4, 120)) });
  it("permits closing when ΔV, Δθ and Δf are within limits", () => {
    const r = evaluate25Stage(stage, mkRR(66.4, 3), ref, 60.05);
    expect(r.inSync).toBe(true);
    expect(calc25TripTimeReal(stage, mkRR(66.4, 3), ref, 60.05)).toBeCloseTo(0.1, 6);
  });
  it("blocks when angle difference exceeds the limit", () => {
    const r = evaluate25Stage(stage, mkRR(66.4, 30), ref, 60);
    expect(r.inSync).toBe(false);
    expect(r.dAng).toBeCloseTo(30, 1);
  });
  it("blocks when there is no live voltage (no wiring)", () => {
    expect(evaluate25Stage(stage, mkRR(0, 0), ref, 60).inSync).toBe(false);
  });
});

describe("81R rate-of-change of frequency (evaluate81RStage)", () => {
  const fall = { pickup: 0.5, tOp: 0.1, dir: "fall" };
  it("trips on fast frequency decline (df/dt ≤ -pickup)", () => {
    const r = evaluate81RStage(fall, { dfdt: -0.8 });
    expect(r.tripped).toBe(true);
    expect(calc81RTripTimeReal(fall, { dfdt: -0.8 })).toBeCloseTo(0.1, 6);
  });
  it("does not trip on a rising df/dt when dir=fall", () => {
    expect(evaluate81RStage(fall, { dfdt: 0.8 }).tripped).toBe(false);
  });
  it("dir=both trips on either sign above the magnitude pickup", () => {
    const both = { pickup: 0.5, tOp: 0.1, dir: "both" };
    expect(evaluate81RStage(both, { dfdt: 0.6 }).tripped).toBe(true);
    expect(evaluate81RStage(both, { dfdt: -0.6 }).tripped).toBe(true);
    expect(evaluate81RStage(both, { dfdt: 0.3 }).tripped).toBe(false);
  });
});

describe("phasor primitives", () => {
  it("toRect/fromRect roundtrip", () => {
    const r = toRect(10, 30);
    const p = fromRect(r.re, r.im);
    expect(p.mag).toBeCloseTo(10, 6);
    expect(p.ang).toBeCloseTo(30, 6);
  });
  it("toRad converts degrees to radians", () => {
    expect(toRad(180)).toBeCloseTo(Math.PI, 9);
  });
});

describe("calc3 — three-phase sum (3I0/3V0)", () => {
  it("balanced set sums to zero", () => {
    const r = calc3(currents(ph(5, 0), ph(5, -120), ph(5, 120)), ["Ia", "Ib", "Ic"]);
    expect(r.mag).toBeCloseTo(0, 6);
  });
  it("single-phase Ia=6 gives 3I0=6", () => {
    const r = calc3(currents(ph(6, 0), ph(0, 0), ph(0, 0)), ["Ia", "Ib", "Ic"]);
    expect(r.mag).toBeCloseTo(6, 6);
  });
});

describe("calcI2 — negative-sequence current (regression: bug 2026-06-26)", () => {
  it("balanced positive-sequence load => I2 = 0", () => {
    const r = calcI2(currents(ph(5, 0), ph(5, -120), ph(5, 120)));
    expect(r.mag).toBeCloseTo(0, 6);
  });
  it("pure negative-sequence set => I2 = full magnitude", () => {
    const r = calcI2(currents(ph(5, 0), ph(5, 120), ph(5, -120)));
    expect(r.mag).toBeCloseTo(5, 6);
  });
  it("single-phase fault Ia=6 => I2 = 2.0", () => {
    const r = calcI2(currents(ph(6, 0), ph(0, 0), ph(0, 0)));
    expect(r.mag).toBeCloseTo(2, 6);
  });
});

describe("calcPower", () => {
  it("unity power factor: P=V*I, Q=0", () => {
    const r = calcPower(100, 5, 0, 0);
    expect(r.P).toBeCloseTo(500, 6);
    expect(r.Q).toBeCloseTo(0, 6);
    expect(r.fp).toBeCloseTo(1, 6);
  });
  it("90deg lagging: P=0, Q=V*I", () => {
    const r = calcPower(100, 5, 0, -90);
    expect(r.P).toBeCloseTo(0, 6);
    expect(r.Q).toBeCloseTo(500, 6);
  });
});

describe("evalCurveTime — shared curve evaluator", () => {
  it("IEC Standard Inverse at M=2, TD=1 (~10.0s)", () => {
    const c = CURVE_MAP["IEC - Standard Inverse"];
    const t = evalCurveTime(c, 2, 1);
    expect(t).toBeCloseTo(0.14 / (Math.pow(2, 0.02) - 1), 6);
    expect(t).toBeGreaterThan(9);
    expect(t).toBeLessThan(11);
  });
  it("time dial scales linearly", () => {
    const c = CURVE_MAP["IEC - Very Inverse"];
    expect(evalCurveTime(c, 5, 2)).toBeCloseTo(2 * evalCurveTime(c, 5, 1), 6);
  });
  it("DT returns the time dial directly", () => {
    expect(evalCurveTime(CURVE_MAP["Tempo Definido"], 5, 0.3)).toBeCloseTo(0.3, 6);
  });
  it("returns Infinity for null curve or M<=1", () => {
    expect(evalCurveTime(null, 5, 1)).toBe(Infinity);
    expect(evalCurveTime(CURVE_MAP["IEC - Standard Inverse"], 1, 1)).toBe(Infinity);
  });
  it("higher multiple => faster trip (monotonic)", () => {
    const c = CURVE_MAP["IEC - Standard Inverse"];
    expect(evalCurveTime(c, 10, 1)).toBeLessThan(evalCurveTime(c, 2, 1));
  });
});

describe("calcTheoreticalTripTime (51)", () => {
  const stage = { enabled: true, pickup: 1, curve: "IEC - Standard Inverse", timeDial: 1 };
  it("Infinity below pickup", () => {
    expect(calcTheoreticalTripTime(stage, 0.5)).toBe(Infinity);
  });
  it("finite trip above pickup", () => {
    expect(calcTheoreticalTripTime(stage, 5)).toBeGreaterThan(0);
    expect(Number.isFinite(calcTheoreticalTripTime(stage, 5))).toBe(true);
  });
  it("disabled stage never trips", () => {
    expect(calcTheoreticalTripTime({ ...stage, enabled: false }, 5)).toBe(Infinity);
  });
});

describe("calc51NTheoreticalTripTime matches 51 curve math", () => {
  it("same coefficients give same time as 51", () => {
    const stage = { enabled: true, pickup: 1, curve: "IEC - Very Inverse", timeDial: 1 };
    expect(calc51NTheoreticalTripTime(stage, 4)).toBeCloseTo(calcTheoreticalTripTime(stage, 4), 9);
  });
});

describe("resolveCurveName — legacy aliases", () => {
  it("maps old short name to full name", () => {
    expect(resolveCurveName("IEC SI (Standard)")).toBe("IEC - Standard Inverse");
  });
  it("passes through unknown/current names", () => {
    expect(resolveCurveName("IEC - Very Inverse")).toBe("IEC - Very Inverse");
  });
});

describe("evaluate27Stage — undervoltage", () => {
  const stage = { enabled: true, pickup: 0.8 };
  it("picks up when any phase below pickup (startPhases=any)", () => {
    const r = evaluate27Stage(stage, [0.7, 1.0, 1.0], "any", 0);
    expect(r.started).toBe(true);
    expect(r.faultedCount).toBe(1);
  });
  it("does not start in 3φ mode unless all three below", () => {
    expect(evaluate27Stage(stage, [0.7, 1.0, 1.0], "3φ", 0).started).toBe(false);
    expect(evaluate27Stage(stage, [0.7, 0.7, 0.7], "3φ", 0).started).toBe(true);
  });
  it("low-voltage block prevents pickup", () => {
    const r = evaluate27Stage(stage, [0.1, 0.1, 0.1], "any", 0.2);
    expect(r.blocked).toBe(true);
    expect(r.started).toBe(false);
  });
});

describe("evaluate59Stage — overvoltage", () => {
  const stage = { enabled: true, pickup: 1.1 };
  it("picks up above threshold", () => {
    expect(evaluate59Stage(stage, [1.2, 1.0, 1.0], "any").started).toBe(true);
  });
  it("no pickup when all below", () => {
    expect(evaluate59Stage(stage, [1.0, 1.0, 1.0], "any").started).toBe(false);
  });
});

describe("getVoltagesPu", () => {
  it("phase-to-neutral pu uses Vnom/sqrt3 base", () => {
    const rr = { voltages: voltages(ph(66.4, 0), ph(66.4, -120), ph(66.4, 120)) };
    const pu = getVoltagesPu(rr, "ph-n", 115);
    expect(pu[0]).toBeCloseTo(66.4 / (115 / Math.sqrt(3)), 4);
    expect(pu[0]).toBeCloseTo(1.0, 2);
  });
  it("phase-to-phase pu near 1.0 for nominal balanced set", () => {
    const rr = { voltages: voltages(ph(66.4, 0), ph(66.4, -120), ph(66.4, 120)) };
    const pu = getVoltagesPu(rr, "ph-ph", 115);
    expect(pu[0]).toBeCloseTo(1.0, 2);
  });
});

describe("evaluate67Stage — directional phase OC", () => {
  // Forward fault: current roughly in phase with reference, voltage present
  const stage = {
    enabled: true, pickup: 1, mta: 45, pol: "quadratura", dir: "forward",
    curve: "Tempo Definido", timeDial: 0.1,
  };
  it("disabled => not tripped", () => {
    expect(evaluate67Stage({ ...stage, enabled: false }, {
      currents: currents(ph(5, -45), ph(5, -165), ph(5, 75)),
      voltages: voltages(ph(66, 0), ph(66, -120), ph(66, 120)),
    }).tripped).toBe(false);
  });
  it("below pickup => reason 'below pickup'", () => {
    const r = evaluate67Stage(stage, {
      currents: currents(ph(0.1, -45), ph(0.1, -165), ph(0.1, 75)),
      voltages: voltages(ph(66, 0), ph(66, -120), ph(66, 120)),
    });
    expect(r.tripped).toBe(false);
    expect(r.reason).toBe("below pickup");
  });
  it("forward fault trips with finite time", () => {
    const r = evaluate67Stage(stage, {
      currents: currents(ph(5, -45), ph(5, -165), ph(5, 75)),
      voltages: voltages(ph(66, 0), ph(66, -120), ph(66, 120)),
    });
    expect(r.tripped).toBe(true);
    expect(Number.isFinite(r.simulatedTime)).toBe(true);
  });
});

describe("evaluate67NStage — directional neutral OC", () => {
  const stage = {
    enabled: true, pickup: 0.5, mta: 45, pol: "-V0", dir: "forward",
    curve: "Tempo Definido", timeDial: 0.1, minPolV: 1,
  };
  it("3I0 below pickup => not tripped", () => {
    const r = evaluate67NStage(stage, {
      currents: currents(ph(5, 0), ph(5, -120), ph(5, 120)), // balanced => 3I0=0
      voltages: voltages(ph(66, 0), ph(66, -120), ph(66, 120)),
    });
    expect(r.tripped).toBe(false);
    expect(r.reason).toBe("3I0 below pickup");
  });
});

describe("getCurrentForFunc — function-appropriate current", () => {
  const rr = { currents: currents(ph(3, 0), ph(5, -120), ph(4, 120)) };
  it("phase functions use max phase current", () => {
    expect(getCurrentForFunc("50", rr)).toBeCloseTo(5, 6);
    expect(getCurrentForFunc("51", rr)).toBeCloseTo(5, 6);
  });
  it("neutral functions use 3I0", () => {
    expect(getCurrentForFunc("50N", rr)).toBeCloseTo(calc3(rr.currents, ["Ia", "Ib", "Ic"]).mag, 6);
  });
  it("46 uses negative-sequence I2", () => {
    expect(getCurrentForFunc("46", rr)).toBeCloseTo(calcI2(rr.currents).mag, 6);
  });
});

describe("calcTripTime routing (50/50N/46)", () => {
  it("50 instantaneous returns basic time for timeOp=0", () => {
    const t = calcTripTime("50", { enabled: true, pickup: 1, timeOp: 0 }, 5);
    expect(t).toBeGreaterThan(0);
    expect(Number.isFinite(t)).toBe(true);
  });
  it("below pickup => Infinity", () => {
    expect(calcTripTime("50", { enabled: true, pickup: 10, timeOp: 0 }, 5)).toBe(Infinity);
  });
});
