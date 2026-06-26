import { describe, it, expect } from "vitest";
import { generateComtrade } from "./comtrade.js";

const ph = (mag, ang) => ({ mag, ang });
const I = (a, b, c) => ({ Ia: ph(a, 0), Ib: ph(b, -120), Ic: ph(c, 120) });
const V = (a, b, c) => ({ Va: ph(a, 0), Vb: ph(b, -120), Vc: ph(c, 120) });

function baseRecord(overrides = {}) {
  return {
    timestamp: "2026-06-26 10:00:00",
    stages: ["50-1"],
    tripTime: 0.05,
    maletaStopTime: 0.08,
    tripPhase: "fault",
    prefault: {
      enabled: true, duration: 0.1,
      relayCurrents: I(1, 1, 1), relayVoltages: V(66.4, 66.4, 66.4),
    },
    fault: {
      relayCurrents: I(20, 1, 1), relayVoltages: V(20, 66, 66),
    },
    system: { rtc: 120, rtp: 120 },
    ...overrides,
  };
}

describe("generateComtrade — file structure", () => {
  it("returns cfg, dat and hdr strings", () => {
    const out = generateComtrade(baseRecord());
    expect(typeof out.cfg).toBe("string");
    expect(typeof out.dat).toBe("string");
    expect(typeof out.hdr).toBe("string");
  });

  it("CFG declares 8 analog channels and ASCII format", () => {
    const { cfg } = generateComtrade(baseRecord());
    const lines = cfg.split(/\r?\n/);
    expect(lines[1]).toContain("8,8A,0D");
    expect(cfg).toContain("ASCII");
  });

  it("DAT has 960 samples (1s @ 960 sample/s)", () => {
    const { dat } = generateComtrade(baseRecord());
    const rows = dat.trim().split(/\r?\n/);
    expect(rows.length).toBe(960);
  });

  it("each DAT row has sample#, timestamp and 8 channel values", () => {
    const { dat } = generateComtrade(baseRecord());
    const first = dat.trim().split(/\r?\n/)[0].split(",");
    expect(first.length).toBe(2 + 8);
    expect(Number(first[0])).toBe(1);
  });

  it("HDR mentions the tripped stage and trip time", () => {
    const { hdr } = generateComtrade(baseRecord());
    expect(hdr).toContain("50-1");
    expect(hdr).toContain("0.050");
  });
});

describe("generateComtrade — snapshot/idle modes", () => {
  it("snapshot idle marks SNAPSHOT in header and stays finite", () => {
    const rec = baseRecord({ tripPhase: "snapshot", tripTime: null, maletaStopTime: null });
    const { hdr, dat } = generateComtrade(rec);
    expect(hdr).toContain("SNAPSHOT");
    expect(dat.trim().split(/\r?\n/).length).toBe(960);
  });
});

describe("generateComtrade — sample integrity", () => {
  it("produces no NaN values in the DAT body", () => {
    const { dat } = generateComtrade(baseRecord());
    expect(dat.includes("NaN")).toBe(false);
  });
  it("zeroes the signal after maleta stop time", () => {
    const { dat } = generateComtrade(baseRecord({ maletaStopTime: 0.06 }));
    const rows = dat.trim().split(/\r?\n/);
    // last sample (t≈1s) must be all zeros after the stop point
    const last = rows[rows.length - 1].split(",").slice(2).map(Number);
    expect(last.every(v => v === 0)).toBe(true);
  });
});
