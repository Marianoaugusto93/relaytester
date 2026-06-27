import { describe, it, expect } from "vitest";
import { buildSaveContent, parseSaveFile, FILE_HEADER } from "./fileIO.js";
import { deepClone, defaultProtections, defaultSystem, buildDefaultMatrix } from "./defaults.js";

const sys = () => deepClone(defaultSystem);
const prot = () => deepClone(defaultProtections);
const matrix = () => buildDefaultMatrix();

describe("buildSaveContent", () => {
  it("emits the file header and SYSTEM section", () => {
    const text = buildSaveContent(sys(), prot(), matrix(), null);
    expect(text.startsWith(FILE_HEADER)).toBe(true);
    expect(text).toContain("[SYSTEM]");
    expect(text).toContain("TP_PRI_V=");
  });
});

describe("parseSaveFile — round trip", () => {
  it("system parameters survive save+load", () => {
    const s = sys();
    s.tp.priV = 13800; s.tp.secV = 115; s.tc.priA = 600; s.tc.secA = 5;
    const text = buildSaveContent(s, prot(), matrix(), null);
    const out = parseSaveFile(text, prot(), matrix());
    expect(out.sys.tp.priV).toBe(13800);
    expect(out.sys.tp.secV).toBe(115);
    expect(out.sys.tc.priA).toBe(600);
    expect(out.sys.tc.secA).toBe(5);
  });

  it("protection enabled flag survives round trip", () => {
    const p = prot();
    p["51"].enabled = true;
    const text = buildSaveContent(sys(), p, matrix(), null);
    const out = parseSaveFile(text, prot(), matrix());
    expect(out.prot["51"].enabled).toBe(true);
  });

  it("Leva 2 functions (50BF/49/25/81R) survive round trip", () => {
    const p = prot();
    p["50BF"].stages50bf[0].pickup = 3.5; p["50BF"].stages50bf[0].tBF = 0.2;
    p["49"].stages49[0].Ib = 6; p["49"].stages49[0].k = 1.1; p["49"].stages49[0].tau = 8;
    p["25"].ref25 = { Vmag: 100, Vang: 5, fHz: 60.1 };
    p["25"].stages25[0].dVmax = 4; p["25"].stages25[0].dAngMax = 8;
    p["81R"].inj81r = { dfdt: -0.7 };
    p["81R"].stages81r[0].pickup = 0.8; p["81R"].stages81r[0].dir = "fall";
    const text = buildSaveContent(sys(), p, matrix(), null);
    const out = parseSaveFile(text, prot(), matrix());
    expect(out.prot["50BF"].stages50bf[0].pickup).toBe(3.5);
    expect(out.prot["50BF"].stages50bf[0].tBF).toBe(0.2);
    expect(out.prot["49"].stages49[0].Ib).toBe(6);
    expect(out.prot["49"].stages49[0].tau).toBe(8);
    expect(out.prot["25"].ref25.Vmag).toBe(100);
    expect(out.prot["25"].ref25.fHz).toBe(60.1);
    expect(out.prot["25"].stages25[0].dVmax).toBe(4);
    expect(out.prot["81R"].inj81r.dfdt).toBe(-0.7);
    expect(out.prot["81R"].stages81r[0].pickup).toBe(0.8);
    expect(out.prot["81R"].stages81r[0].dir).toBe("fall");
  });

  it("output matrix mappings survive round trip", () => {
    const m = matrix();
    const firstRow = Object.keys(m)[0];
    const firstCol = Object.keys(m[firstRow])[0];
    m[firstRow][firstCol] = true;
    const text = buildSaveContent(sys(), prot(), m, null);
    const out = parseSaveFile(text, prot(), matrix());
    expect(out.outMatrix[firstRow][firstCol]).toBe(true);
  });
});

describe("parseSaveFile — safeNum guards (regression 2026-06-26)", () => {
  it("corrupt numeric value falls back to default, never NaN", () => {
    const text = [
      FILE_HEADER,
      "[SYSTEM]",
      "TP_PRI_V=not_a_number",
      "TC_PRI_A=",
    ].join("\n");
    const out = parseSaveFile(text, prot(), matrix());
    expect(Number.isNaN(out.sys.tp.priV)).toBe(false);
    expect(Number.isFinite(out.sys.tp.priV)).toBe(true);
    expect(Number.isFinite(out.sys.tc.priA)).toBe(true);
  });

  it("corrupt stage pickup does not inject NaN into the engine", () => {
    const p = prot();
    p["51"].enabled = true;
    // Build a valid file, then corrupt the first 51 stage line's pickup field
    let text = buildSaveContent(sys(), p, matrix(), null);
    text = text.replace(/(\[PROT:51\][\s\S]*?STAGE_0=[^|]*\|[^|]*\|)[^|]*/, "$1NaNValue");
    const out = parseSaveFile(text, prot(), matrix());
    const pickup = out.prot["51"].stages[0].pickup;
    expect(Number.isNaN(pickup)).toBe(false);
    expect(Number.isFinite(pickup)).toBe(true);
  });
});

describe("parseSaveFile — robustness", () => {
  it("ignores comments and blank lines", () => {
    const text = [FILE_HEADER, "# a comment", "", "[SYSTEM]", "TP_SEC_V=115"].join("\n");
    const out = parseSaveFile(text, prot(), matrix());
    expect(out.sys.tp.secV).toBe(115);
  });
  it("returns wiring=null when no wiring section present", () => {
    const text = buildSaveContent(sys(), prot(), matrix(), null);
    const out = parseSaveFile(text, prot(), matrix());
    expect(out.wiring).toBeNull();
  });
});
