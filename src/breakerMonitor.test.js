import { describe, it, expect } from "vitest";
import {
  BK_MON_DEFAULT_LIMITS,
  mkBkMon,
  recordTripOp,
  bkMonAlarm,
  resetBkMon,
  normalizeBkMon,
} from "./breakerMonitor.js";

describe("breakerMonitor — mkBkMon", () => {
  it("returns initial state with zero operations and zero kA²", () => {
    const mon = mkBkMon();

    expect(mon).toEqual({
      nOps: 0,
      sumKA2: 0,
      lastIkA: 0,
      lastOpTs: null,
    });
  });

  it("each call returns a new object (not shared)", () => {
    const mon1 = mkBkMon();
    const mon2 = mkBkMon();

    expect(mon1).not.toBe(mon2);
    expect(mon1).toEqual(mon2);
  });
});

describe("breakerMonitor — BK_MON_DEFAULT_LIMITS", () => {
  it("defines maxOps=20 and maxKA2=500", () => {
    expect(BK_MON_DEFAULT_LIMITS).toEqual({
      maxOps: 20,
      maxKA2: 500,
    });
  });
});

describe("breakerMonitor — recordTripOp", () => {
  it("accumulates single trip: iSecA=5A, rtc=80 → iPrimKA=0.4, kA²=0.16", () => {
    const mon = mkBkMon();
    const result = recordTripOp(mon, 5, 80);

    expect(result.nOps).toBe(1);
    expect(result.lastIkA).toBeCloseTo(0.4, 5);
    expect(result.sumKA2).toBeCloseTo(0.16, 5);
    expect(result.lastOpTs).toBeTruthy();
  });

  it("accumulates multiple trips: two 0.4kA trips → sumKA2=0.32", () => {
    let mon = mkBkMon();
    mon = recordTripOp(mon, 5, 80); // 0.4 kA → 0.16 kA²
    mon = recordTripOp(mon, 5, 80); // 0.4 kA → 0.16 kA²

    expect(mon.nOps).toBe(2);
    expect(mon.sumKA2).toBeCloseTo(0.32, 5);
    expect(mon.lastIkA).toBeCloseTo(0.4, 5);
  });

  it("treats zero current as valid: iSecA=0 → lastIkA=0, no change", () => {
    const mon = mkBkMon();
    const result = recordTripOp(mon, 0, 80);

    expect(result.nOps).toBe(1);
    expect(result.lastIkA).toBe(0);
    expect(result.sumKA2).toBe(0);
  });

  it("treats negative current as zero (protection)", () => {
    const mon = mkBkMon();
    const result = recordTripOp(mon, -5, 80);

    expect(result.nOps).toBe(1);
    expect(result.lastIkA).toBe(0);
    expect(result.sumKA2).toBe(0);
  });

  it("treats NaN current as zero", () => {
    const mon = mkBkMon();
    const result = recordTripOp(mon, NaN, 80);

    expect(result.nOps).toBe(1);
    expect(result.lastIkA).toBe(0);
    expect(result.sumKA2).toBe(0);
  });

  it("treats Infinity current as zero", () => {
    const mon = mkBkMon();
    const result = recordTripOp(mon, Infinity, 80);

    expect(result.nOps).toBe(1);
    expect(result.lastIkA).toBe(0);
    expect(result.sumKA2).toBe(0);
  });

  it("treats invalid rtc (zero, negative, NaN) as 1 (pass-through)", () => {
    let mon = mkBkMon();

    // rtc=0 → ratio=1 → iPrimKA = 5 * 1 / 1000 = 0.005 kA
    mon = recordTripOp(mon, 5, 0);
    expect(mon.lastIkA).toBeCloseTo(0.005, 5);

    mon = mkBkMon();
    // rtc=-50 → ratio=1 → iPrimKA = 5 * 1 / 1000 = 0.005 kA
    mon = recordTripOp(mon, 5, -50);
    expect(mon.lastIkA).toBeCloseTo(0.005, 5);

    mon = mkBkMon();
    // rtc=NaN → ratio=1 → iPrimKA = 5 * 1 / 1000 = 0.005 kA
    mon = recordTripOp(mon, 5, NaN);
    expect(mon.lastIkA).toBeCloseTo(0.005, 5);
  });

  it("does not mutate input monitor", () => {
    const mon = mkBkMon();
    const result = recordTripOp(mon, 5, 80);

    // Original should be unchanged
    expect(mon.nOps).toBe(0);
    expect(mon.sumKA2).toBe(0);
    expect(mon.lastOpTs).toBeNull();

    // Result is new object
    expect(result).not.toBe(mon);
    expect(result.nOps).toBe(1);
  });

  it("updates lastOpTs on each call", () => {
    const mon = mkBkMon();
    const result1 = recordTripOp(mon, 5, 80);
    const ts1 = result1.lastOpTs;

    // Small delay
    const result2 = recordTripOp(result1, 5, 80);
    const ts2 = result2.lastOpTs;

    expect(ts1).toBeTruthy();
    expect(ts2).toBeTruthy();
    expect(ts2).toBeGreaterThanOrEqual(ts1);
  });
});

describe("breakerMonitor — bkMonAlarm", () => {
  it("no alarm when nOps < maxOps and sumKA2 < maxKA2", () => {
    const mon = mkBkMon();
    const lim = BK_MON_DEFAULT_LIMITS;

    const result = bkMonAlarm(mon, lim);

    expect(result.alarm).toBe(false);
    expect(result.byOps).toBe(false);
    expect(result.byKA2).toBe(false);
  });

  it("byOps alarm when nOps >= maxOps", () => {
    let mon = mkBkMon();
    const lim = BK_MON_DEFAULT_LIMITS; // maxOps=20

    // Simulate 20 operations
    for (let i = 0; i < 20; i++) {
      mon = recordTripOp(mon, 1, 80);
    }

    const result = bkMonAlarm(mon, lim);

    expect(result.alarm).toBe(true);
    expect(result.byOps).toBe(true);
    expect(result.byKA2).toBe(false);
  });

  it("byKA2 alarm when sumKA2 >= maxKA2", () => {
    let mon = mkBkMon();
    const lim = BK_MON_DEFAULT_LIMITS; // maxKA2=500, maxOps=20

    // Each trip: iSecA=100A, rtc=50 → iPrimKA=5kA → kA²=25
    // Need 500/25 = 20 trips to reach alarm (nOps also hits limit)
    // So use 10 trips to avoid byOps trigger
    for (let i = 0; i < 10; i++) {
      mon = recordTripOp(mon, 100, 50); // 5kA → 25 kA² each
    }

    const result = bkMonAlarm(mon, lim);

    // sumKA2 = 250 < 500, so byKA2 should still be false
    // Let's use a custom limit to isolate byKA2
    const customLim = { maxOps: 100, maxKA2: 250 };
    const result2 = bkMonAlarm(mon, customLim);

    expect(result2.alarm).toBe(true);
    expect(result2.byOps).toBe(false); // nOps=10 < maxOps=100
    expect(result2.byKA2).toBe(true); // sumKA2=250 >= maxKA2=250
  });

  it("both byOps and byKA2 true when both limits exceeded", () => {
    let mon = mkBkMon();
    const lim = BK_MON_DEFAULT_LIMITS;

    // 25 high-current trips: exceeds both limits
    for (let i = 0; i < 25; i++) {
      mon = recordTripOp(mon, 100, 50); // 5kA → 25 kA²
    }

    const result = bkMonAlarm(mon, lim);

    expect(result.alarm).toBe(true);
    expect(result.byOps).toBe(true); // nOps=25 >= maxOps=20
    expect(result.byKA2).toBe(true); // sumKA2=625 >= maxKA2=500
  });

  it("alarm at exact limits (nOps === maxOps triggers)", () => {
    let mon = mkBkMon();
    const lim = { maxOps: 10, maxKA2: 100 };

    for (let i = 0; i < 10; i++) {
      mon = recordTripOp(mon, 10, 80); // 0.1 kA → 0.01 kA² each
    }

    const result = bkMonAlarm(mon, lim);

    // Verify the monitor state
    expect(mon.nOps).toBe(10);
    // Verify the alarm result
    expect(result.byOps).toBe(true); // nOps=10 >= maxOps=10
    expect(result.byKA2).toBe(false); // sumKA2=0.1 < maxKA2=100
    expect(result.alarm).toBe(true);
  });

  it("works with custom limits", () => {
    let mon = mkBkMon();
    const customLim = { maxOps: 5, maxKA2: 50 };

    for (let i = 0; i < 6; i++) {
      mon = recordTripOp(mon, 10, 100);
    }

    const result = bkMonAlarm(mon, customLim);

    expect(result.alarm).toBe(true);
    expect(result.byOps).toBe(true); // nOps=6 >= maxOps=5
  });
});

describe("breakerMonitor — resetBkMon", () => {
  it("returns initial state", () => {
    const result = resetBkMon();

    expect(result).toEqual({
      nOps: 0,
      sumKA2: 0,
      lastIkA: 0,
      lastOpTs: null,
    });
  });

  it("same as mkBkMon", () => {
    const reset = resetBkMon();
    const fresh = mkBkMon();

    expect(reset).toEqual(fresh);
  });
});

describe("breakerMonitor — normalizeBkMon", () => {
  it("null → initial state", () => {
    const result = normalizeBkMon(null);

    expect(result).toEqual(mkBkMon());
  });

  it("undefined → initial state", () => {
    const result = normalizeBkMon(undefined);

    expect(result).toEqual(mkBkMon());
  });

  it("empty object → initial state", () => {
    const result = normalizeBkMon({});

    expect(result).toEqual(mkBkMon());
  });

  it("missing fields → zero/null defaults", () => {
    const result = normalizeBkMon({ nOps: 5 });

    expect(result.nOps).toBe(5);
    expect(result.sumKA2).toBe(0);
    expect(result.lastIkA).toBe(0);
    expect(result.lastOpTs).toBeNull();
  });

  it("NaN fields → zero/null", () => {
    const result = normalizeBkMon({
      nOps: NaN,
      sumKA2: NaN,
      lastIkA: NaN,
      lastOpTs: NaN,
    });

    expect(result.nOps).toBe(0);
    expect(result.sumKA2).toBe(0);
    expect(result.lastIkA).toBe(0);
    expect(result.lastOpTs).toBeNull();
  });

  it("Infinity fields → zero/null", () => {
    const result = normalizeBkMon({
      nOps: Infinity,
      sumKA2: -Infinity,
      lastIkA: Infinity,
      lastOpTs: -Infinity,
    });

    expect(result.nOps).toBe(0);
    expect(result.sumKA2).toBe(0);
    expect(result.lastIkA).toBe(0);
    expect(result.lastOpTs).toBeNull();
  });

  it("string values → zero/null (type coercion fails)", () => {
    const result = normalizeBkMon({
      nOps: "5",
      sumKA2: "100",
      lastIkA: "10",
      lastOpTs: "2000",
    });

    // String doesn't pass Number.isFinite, so defaults to zero/null
    expect(result.nOps).toBe(0);
    expect(result.sumKA2).toBe(0);
    expect(result.lastIkA).toBe(0);
    expect(result.lastOpTs).toBeNull();
  });

  it("negative values → forced to zero (Math.max)", () => {
    const result = normalizeBkMon({
      nOps: -5,
      sumKA2: -100,
      lastIkA: -10,
    });

    expect(result.nOps).toBe(0);
    expect(result.sumKA2).toBe(0);
    expect(result.lastIkA).toBe(0);
  });

  it("valid numeric lastOpTs → preserved", () => {
    const now = Date.now();
    const result = normalizeBkMon({
      nOps: 5,
      sumKA2: 25,
      lastIkA: 2.5,
      lastOpTs: now,
    });

    expect(result.nOps).toBe(5);
    expect(result.sumKA2).toBe(25);
    expect(result.lastIkA).toBe(2.5);
    expect(result.lastOpTs).toBe(now);
  });

  it("mixed valid/invalid → preserves valid, defaults invalid", () => {
    const result = normalizeBkMon({
      nOps: 15,
      sumKA2: NaN,
      lastIkA: 0.5,
      lastOpTs: null,
    });

    expect(result.nOps).toBe(15);
    expect(result.sumKA2).toBe(0);
    expect(result.lastIkA).toBe(0.5);
    expect(result.lastOpTs).toBeNull();
  });

  it("non-object input → initial state", () => {
    expect(normalizeBkMon("string")).toEqual(mkBkMon());
    expect(normalizeBkMon(123)).toEqual(mkBkMon());
    expect(normalizeBkMon(true)).toEqual(mkBkMon());
    expect(normalizeBkMon([])).toEqual(mkBkMon());
  });
});
