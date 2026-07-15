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

describe("buildSaveContent + parseSaveFile — Setting Groups round trip", () => {
  it("[SETTING_GROUPS] section serializes ACTIVE and GROUP_0..GROUP_3 as JSON lines", () => {
    const p = prot();
    p["51"].stages[0].pickup = 6.5;
    p["50"].stages[0].pickup = 12;

    const groups = [
      deepClone(p),
      { ...deepClone(p), "51": { ...deepClone(p["51"]), stages: [{ ...deepClone(p["51"].stages[0]), pickup: 8 }] } },
      { ...deepClone(p), "51": { ...deepClone(p["51"]), stages: [{ ...deepClone(p["51"].stages[0]), pickup: 9 }] } },
      { ...deepClone(p), "51": { ...deepClone(p["51"]), stages: [{ ...deepClone(p["51"].stages[0]), pickup: 10 }] } },
    ];
    const groupsData = { settingGroups: groups, activeGroup: 2 };

    const text = buildSaveContent(sys(), p, matrix(), null, groupsData);

    // Verify file contains [SETTING_GROUPS] section
    expect(text).toContain("[SETTING_GROUPS]");
    expect(text).toContain("ACTIVE=2");
    expect(text).toContain("GROUP_0=");
    expect(text).toContain("GROUP_1=");
    expect(text).toContain("GROUP_2=");
    expect(text).toContain("GROUP_3=");
  });

  it("parseSaveFile recovers settingGroups and activeGroup correctly", () => {
    const p = prot();
    p["51"].stages[0].pickup = 6.5;

    const groups = [
      deepClone(p),
      deepClone(p),
      deepClone(p),
      deepClone(p),
    ];
    groups[1]["51"].stages[0].pickup = 7.5;
    groups[2]["51"].stages[0].pickup = 8.5;

    const groupsData = { settingGroups: groups, activeGroup: 1 };
    const text = buildSaveContent(sys(), p, matrix(), null, groupsData);

    const out = parseSaveFile(text, prot(), matrix());

    expect(out.settingGroups).toHaveLength(4);
    expect(out.activeGroup).toBe(1);
    expect(out.settingGroups[0]["51"].stages[0].pickup).toBe(6.5);
    expect(out.settingGroups[1]["51"].stages[0].pickup).toBe(7.5);
    expect(out.settingGroups[2]["51"].stages[0].pickup).toBe(8.5);
    expect(out.settingGroups[3]["51"].stages[0].pickup).toBe(6.5);
  });

  it("file without [SETTING_GROUPS] returns 4 clones of loaded prot as settingGroups", () => {
    const p = prot();
    p["51"].stages[0].pickup = 5.5;

    // Build file WITHOUT groups data
    const text = buildSaveContent(sys(), p, matrix(), null);

    const out = parseSaveFile(text, prot(), matrix());

    expect(out.settingGroups).toHaveLength(4);
    expect(out.activeGroup).toBe(0);
    // All groups should be clones of the loaded prot
    out.settingGroups.forEach((g, i) => {
      expect(g["51"].stages[0].pickup).toBe(5.5);
      // Each group is independent
      if (i > 0) expect(g).not.toBe(out.settingGroups[0]);
    });
  });

  it("corrupted GROUP line (invalid JSON) is ignored, slot filled with fallback", () => {
    const baseText = buildSaveContent(sys(), prot(), matrix(), null, {
      settingGroups: [prot(), prot(), prot(), prot()],
      activeGroup: 0,
    });

    // Corrupt GROUP_1 by replacing JSON with invalid text
    const corruptedText = baseText.replace(/GROUP_1=\{.*?\}(?=\n|$)/, "GROUP_1=not-valid-json");

    const out = parseSaveFile(corruptedText, prot(), matrix());

    expect(out.settingGroups).toHaveLength(4);
    // GROUP_1 should be filled with a clone of the protection (fallback)
    expect(out.settingGroups[1]).toEqual(out.settingGroups[0]); // Both are fallbacks
  });

  it("ACTIVE index clamped to [0, 3]", () => {
    const text = [
      FILE_HEADER,
      "[SYSTEM]",
      "TP_PRI_V=13800",
      "[SETTING_GROUPS]",
      "ACTIVE=100", // Out of range
      'GROUP_0={"51":{"enabled":true}}',
    ].join("\n");

    const out = parseSaveFile(text, prot(), matrix());

    expect(out.activeGroup).toBe(3); // Clamped to 3
  });

  it("complex scenario: 4 distinct groups with different settings", () => {
    const g0 = prot();
    g0["51"].stages[0].pickup = 5;
    g0["50"].stages[0].pickup = 10;

    const g1 = deepClone(g0);
    g1["51"].stages[0].pickup = 6;
    g1["50"].stages[0].pickup = 12;

    const g2 = deepClone(g0);
    g2["51"].stages[0].pickup = 7;
    g2["67"].enabled = true;

    const g3 = deepClone(g0);
    g3["51"].stages[0].pickup = 8;

    const groupsData = { settingGroups: [g0, g1, g2, g3], activeGroup: 2 };
    const text = buildSaveContent(sys(), g0, matrix(), null, groupsData);

    const out = parseSaveFile(text, prot(), matrix());

    expect(out.activeGroup).toBe(2);
    expect(out.settingGroups[0]["51"].stages[0].pickup).toBe(5);
    expect(out.settingGroups[0]["50"].stages[0].pickup).toBe(10);
    expect(out.settingGroups[1]["51"].stages[0].pickup).toBe(6);
    expect(out.settingGroups[1]["50"].stages[0].pickup).toBe(12);
    expect(out.settingGroups[2]["51"].stages[0].pickup).toBe(7);
    expect(out.settingGroups[2]["67"].enabled).toBe(true);
    expect(out.settingGroups[3]["51"].stages[0].pickup).toBe(8);
  });
});

describe("buildSaveContent + parseSaveFile — Breaker Monitor round trip", () => {
  it("[BREAKER_MONITOR] section serializes and recovers nOps, sumKA2, lastIkA, lastOpTs", () => {
    const mon = { nOps: 7, sumKA2: 123.45, lastIkA: 4.2, lastOpTs: 1720000000000 };
    const text = buildSaveContent(sys(), prot(), matrix(), null, null, mon);

    expect(text).toContain("[BREAKER_MONITOR]");
    expect(text).toContain("NOPS=7");
    expect(text).toContain("SUMKA2=123.45");

    const out = parseSaveFile(text, prot(), matrix());
    expect(out.bkMon.nOps).toBe(7);
    expect(out.bkMon.sumKA2).toBeCloseTo(123.45, 2);
    expect(out.bkMon.lastIkA).toBeCloseTo(4.2, 2);
    expect(out.bkMon.lastOpTs).toBe(1720000000000);
  });

  it("file without [BREAKER_MONITOR] returns zeroed bkMon (retrocompat)", () => {
    const text = buildSaveContent(sys(), prot(), matrix(), null);
    const out = parseSaveFile(text, prot(), matrix());

    expect(out.bkMon).toBeDefined();
    expect(out.bkMon.nOps).toBe(0);
    expect(out.bkMon.sumKA2).toBe(0);
    expect(out.bkMon.lastIkA).toBe(0);
    expect(out.bkMon.lastOpTs).toBeNull();
  });

  it("corrupt NOPS value falls back to 0, not NaN", () => {
    const mon = { nOps: 5, sumKA2: 50, lastIkA: 2.0, lastOpTs: null };
    let text = buildSaveContent(sys(), prot(), matrix(), null, null, mon);
    text = text.replace("NOPS=5", "NOPS=notanumber");

    const out = parseSaveFile(text, prot(), matrix());
    expect(Number.isNaN(out.bkMon.nOps)).toBe(false);
    expect(out.bkMon.nOps).toBe(0);
  });

  it("lastOpTs=empty string parses as null", () => {
    const mon = { nOps: 1, sumKA2: 10, lastIkA: 1.0, lastOpTs: null };
    const text = buildSaveContent(sys(), prot(), matrix(), null, null, mon);
    const out = parseSaveFile(text, prot(), matrix());
    expect(out.bkMon.lastOpTs).toBeNull();
  });
});
