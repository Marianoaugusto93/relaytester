import { describe, it, expect } from "vitest";
import { generatePoints } from "./PointGenerator.js";
import { evaluate } from "./PassFailEvaluator.js";
import { deepClone, defaultProtections } from "../defaults.js";

const prot = () => deepClone(defaultProtections);

describe("PointGenerator — funções da Leva 2 (50BF/49/25)", () => {
  it("50BF: pontos de tempo definido em tBF, sem pré-falta", () => {
    const stage = prot()["50BF"].stages50bf[0]; // pickup 1, tBF 0.15
    const pts = generatePoints("50BF", stage, { minMult: 1.5, maxMult: 5, nPoints: 3, spacing: "linear" });
    expect(pts.length).toBe(3);
    pts.forEach(p => {
      expect(p.kind).toBe("definite");
      expect(p.tExpected).toBeCloseTo(0.15, 6);
      expect(p.Iamps).toBeCloseTo(p.IxIpk * 1, 6);
      expect(p.prefaultDur).toBe(0);
    });
  });

  it("49: tempo térmico finito e decrescente com a corrente", () => {
    const stage = prot()["49"].stages49[0]; // Ib5 k1.05 tau10 → Iθ=5.25
    const pts = generatePoints("49", stage, { minMult: 1.5, maxMult: 4, nPoints: 4, spacing: "log" });
    expect(pts.length).toBe(4);
    pts.forEach(p => {
      expect(p.kind).toBe("curve");
      expect(Number.isFinite(p.tExpected)).toBe(true);
      expect(p.tExpected).toBeGreaterThan(0);
      // Iamps = mult * Iθ
      expect(p.Iamps).toBeCloseTo(p.IxIpk * 5.25, 3);
    });
    // curva inversa: mais corrente → menos tempo
    expect(pts[pts.length - 1].tExpected).toBeLessThan(pts[0].tExpected);
  });

  it("25: ponto único de sincronismo em tCheck", () => {
    const stage = prot()["25"].stages25[0]; // tCheck 0.1
    const pts = generatePoints("25", stage, {});
    expect(pts.length).toBe(1);
    expect(pts[0].kind).toBe("definite");
    expect(pts[0].tExpected).toBeCloseTo(0.1, 6);
    expect(pts[0].sync).toBe(true);
    expect(pts[0].prefaultDur).toBe(0);
  });

  it("81R: pontos com df/dt acima do pickup, tempo em tOp", () => {
    const stage = prot()["81R"].stages81r[0]; // pickup 0.5, tOp 0.1, dir both
    const pts = generatePoints("81R", stage, {});
    expect(pts.length).toBe(3);
    pts.forEach(p => {
      expect(p.kind).toBe("definite");
      expect(p.tExpected).toBeCloseTo(0.1, 6);
      expect(Math.abs(p.dfdt)).toBeGreaterThanOrEqual(0.5);
      expect(p.prefaultDur).toBe(0);
    });
  });

  it("81R: direção 'fall' gera df/dt negativo", () => {
    const stage = { id: "81R-2", pickup: 0.5, tOp: 0.1, dir: "fall" };
    const pts = generatePoints("81R", stage, {});
    pts.forEach(p => expect(p.dfdt).toBeLessThanOrEqual(-0.5));
  });

  it("pass/fail de tempo aceita medida dentro da tolerância (50BF)", () => {
    const stage = prot()["50BF"].stages50bf[0];
    const pt = generatePoints("50BF", stage, { minMult: 2, maxMult: 2, nPoints: 1, spacing: "linear" })[0];
    const pass = evaluate("50BF", pt, { tMeasured: 0.151, tripDetected: true });
    expect(pass.pass).toBe(true);
    const fail = evaluate("50BF", pt, { tMeasured: 0.40, tripDetected: true });
    expect(fail.pass).toBe(false);
  });
});
