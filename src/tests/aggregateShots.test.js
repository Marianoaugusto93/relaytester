import { describe, it, expect } from "vitest";
import { aggregateShots } from "./TestRunnerEngine.js";

describe("aggregateShots — agregação de repetições (Leva 3)", () => {
  it("calcula média, mín, máx e dispersão", () => {
    const a = aggregateShots([0.10, 0.12, 0.11]);
    expect(a.nValid).toBe(3);
    expect(a.nTotal).toBe(3);
    expect(a.tAvg).toBeCloseTo(0.11, 6);
    expect(a.tMin).toBeCloseTo(0.10, 6);
    expect(a.tMax).toBeCloseTo(0.12, 6);
    expect(a.tScatterPct).toBeCloseTo((0.02 / 0.11) * 100, 4);
  });

  it("ignora shots sem trip (null) mas conta no total", () => {
    const a = aggregateShots([0.10, null, 0.12]);
    expect(a.nValid).toBe(2);
    expect(a.nTotal).toBe(3);
    expect(a.tAvg).toBeCloseTo(0.11, 6);
  });

  it("retorna nulos quando nenhum shot disparou", () => {
    const a = aggregateShots([null, null]);
    expect(a.nValid).toBe(0);
    expect(a.tAvg).toBeNull();
    expect(a.tScatterPct).toBeNull();
  });

  it("lida com lista vazia", () => {
    const a = aggregateShots([]);
    expect(a.nValid).toBe(0);
    expect(a.nTotal).toBe(0);
    expect(a.tAvg).toBeNull();
  });
});
