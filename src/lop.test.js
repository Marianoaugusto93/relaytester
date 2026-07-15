import { describe, it, expect } from "vitest";
import { evaluateLOP, evalProtectionsDirect } from "./protection.js";
import { defaultProtections, deepClone } from "./defaults.js";

// ── Phasor helpers ────────────────────────────────────────────────────────────
const ph = (mag, ang) => ({ mag, ang });
const mkRR = (ia, ib, ic, va, vb, vc) => ({
  currents: { Ia: ph(ia, 0), Ib: ph(ib, -120), Ic: ph(ic, 120) },
  voltages: { Va: ph(va, 0), Vb: ph(vb, -120), Vc: ph(vc, 120) },
});

// Default 60/LOP config (matches defaults.js values)
const cfg60 = { vMin: 10, v2v1Thr: 0.4, i2i1Thr: 0.3, iLoadMin: 0.2 };

// ── evaluateLOP unit tests ────────────────────────────────────────────────────
describe("evaluateLOP — 3φ VT collapse", () => {
  it("returns LOP when all voltages below vMin with load current present", () => {
    // All V < 10 V, load current 1 A (above iLoadMin=0.2, below 1.5×0.2=0.3 ... use iLoadMin=0.2, 1.5× = 0.3)
    // So maxI must be >= 0.2 AND < 0.3 to pass heuristic
    const rr = mkRR(0.25, 0.25, 0.25, 5, 5, 5);
    const r = evaluateLOP(rr, cfg60);
    expect(r.lop).toBe(true);
    expect(r.reason).toMatch(/LOP 3φ/);
  });

  it("does NOT flag LOP when voltages are healthy (real 3φ balanced supply)", () => {
    const rr = mkRR(1, 1, 1, 66.4, 66.4, 66.4);
    const r = evaluateLOP(rr, cfg60);
    expect(r.lop).toBe(false);
  });

  it("does NOT flag LOP when currents are very high (real 3φ fault, not VT loss)", () => {
    // V collapsed AND high current → real fault, not LOP
    // iLoadMin=0.2, maxI must be >= 1.5×iLoadMin = 0.3 to be considered fault
    const rr = mkRR(10, 10, 10, 3, 3, 3); // high fault current
    const r = evaluateLOP(rr, cfg60);
    expect(r.lop).toBe(false);
  });

  it("does NOT flag LOP when no load current (iLoadMin threshold)", () => {
    // V collapsed but I = 0 → no load → can't distinguish from genuine open circuit
    const rr = mkRR(0, 0, 0, 3, 3, 3);
    const r = evaluateLOP(rr, cfg60);
    expect(r.lop).toBe(false);
  });
});

describe("evaluateLOP — 1/2φ VT fuse (V2/V1 without I2/I1)", () => {
  it("returns LOP when V2/V1 high with low I2/I1 and load present", () => {
    // Simulate single-phase VT loss: Va collapses, Vb and Vc healthy
    // Va = 0, Vb = 66.4, Vc = 66.4 → large V2 component
    // Balanced currents → small I2
    const rr = {
      currents: { Ia: ph(1, 0), Ib: ph(1, -120), Ic: ph(1, 120) },
      voltages: { Va: ph(0, 0), Vb: ph(66.4, -120), Vc: ph(66.4, 120) },
    };
    const r = evaluateLOP(rr, cfg60);
    expect(r.lop).toBe(true);
    expect(r.reason).toMatch(/LOP 1\/2φ/);
  });

  it("does NOT flag LOP when I2/I1 is also high (real asymmetric fault)", () => {
    // Large V2 AND large I2 → genuine unbalanced fault, not VT loss
    const rr = {
      currents: { Ia: ph(5, 0), Ib: ph(0.1, -120), Ic: ph(0.1, 120) }, // very unbalanced I
      voltages: { Va: ph(0, 0), Vb: ph(66.4, -120), Vc: ph(66.4, 120) },
    };
    const r = evaluateLOP(rr, cfg60);
    expect(r.lop).toBe(false);
  });
});

// ── evalProtectionsDirect blocking integration ────────────────────────────────
describe("evalProtectionsDirect — LOP blocking of 21/67/67N/32", () => {
  const sys = { tp: { secV: 115 }, freq: 60 };

  function makeProtWith60enabled() {
    const prot = deepClone(defaultProtections);
    prot["60"].enabled = true;
    // Enable 67, 67N, 21, 32 so they would normally be evaluated
    prot["67"].enabled = true;
    prot["67N"].enabled = true;
    prot["21"].enabled = true;
    prot["32"].enabled = true;
    return prot;
  }

  it("blocks 67, 67N, 21, 32 when LOP active (3φ VT collapse with load)", () => {
    const prot = makeProtWith60enabled();
    // Phasors that trigger LOP: all V < 10, balanced load current 0.25 A
    const rr = mkRR(0.25, 0.25, 0.25, 5, 5, 5);
    const { dg, lopActive } = evalProtectionsDirect(rr, prot, sys);
    expect(lopActive).toBe(true);
    const blocked = dg.filter(d => d.status === "blocked");
    const blockedFids = blocked.map(d => d.fid);
    expect(blockedFids).toContain("67");
    expect(blockedFids).toContain("67N");
    expect(blockedFids).toContain("21");
    expect(blockedFids).toContain("32");
  });

  it("does NOT block 67 when 60 is disabled (even if conditions would LOP)", () => {
    const prot = makeProtWith60enabled();
    prot["60"].enabled = false; // disable 60
    const rr = mkRR(0.25, 0.25, 0.25, 5, 5, 5);
    const { dg, lopActive } = evalProtectionsDirect(rr, prot, sys);
    expect(lopActive).toBe(false);
    const blocked = dg.filter(d => d.status === "blocked");
    expect(blocked.length).toBe(0);
  });

  it("does NOT block when 60 enabled but LOP not active (healthy phasors)", () => {
    const prot = makeProtWith60enabled();
    // Healthy balanced phasors → no LOP
    const rr = mkRR(1, 1, 1, 66.4, 66.4, 66.4);
    const { dg, lopActive } = evalProtectionsDirect(rr, prot, sys);
    expect(lopActive).toBe(false);
    const blocked = dg.filter(d => d.status === "blocked");
    expect(blocked.length).toBe(0);
  });

  it("shows 60 in dg with status 'lop' when LOP active", () => {
    const prot = makeProtWith60enabled();
    const rr = mkRR(0.25, 0.25, 0.25, 5, 5, 5);
    const { dg } = evalProtectionsDirect(rr, prot, sys);
    const entry60 = dg.find(d => d.fid === "60");
    expect(entry60).toBeTruthy();
    expect(entry60.status).toBe("lop");
  });

  it("shows 60 in dg with status 'enabled' when LOP not active", () => {
    const prot = makeProtWith60enabled();
    const rr = mkRR(1, 1, 1, 66.4, 66.4, 66.4);
    const { dg } = evalProtectionsDirect(rr, prot, sys);
    const entry60 = dg.find(d => d.fid === "60");
    expect(entry60).toBeTruthy();
    expect(entry60.status).toBe("enabled");
  });
});
