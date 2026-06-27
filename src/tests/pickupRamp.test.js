import { describe, it, expect } from "vitest";
import { runPickupRamp, isolateStage, RAMP_SUPPORTED } from "./pickupRamp.js";
import { deepClone, defaultProtections } from "../defaults.js";

const prot = () => deepClone(defaultProtections);

describe("runPickupRamp — busca de limiar de sobrecorrente", () => {
  it("mede o pickup do 51 dentro de um degrau do ajuste", () => {
    const p = prot();
    const stage = p["51"].stages[0]; // pickup = 5 A
    const r = runPickupRamp("51", stage, { relayProt: p });
    expect(r.ok).toBe(true);
    expect(r.pickupSet).toBe(5);
    expect(r.pickupMeasured).toBeGreaterThanOrEqual(5);
    expect(r.pickupMeasured - r.pickupSet).toBeLessThanOrEqual(r.stepA + 1e-9);
    expect(Math.abs(r.errorPct)).toBeLessThan(2);
  });

  it("mede o pickup do 50N (neutro, injeção monofásica → 3I0=I)", () => {
    const p = prot();
    const stage = p["50N"].stages[0]; // pickup = 2 A
    const r = runPickupRamp("50N", stage, { relayProt: p });
    expect(r.ok).toBe(true);
    expect(r.pickupSet).toBe(2);
    expect(r.pickupMeasured).toBeGreaterThanOrEqual(2);
    expect(r.pickupMeasured - r.pickupSet).toBeLessThanOrEqual(r.stepA + 1e-9);
  });

  it("não opera abaixo do ajuste: o último degrau antes do pickup não atua", () => {
    const p = prot();
    const stage = p["51"].stages[0];
    const r = runPickupRamp("51", stage, { relayProt: p });
    const belowSet = r.steps.filter(s => s.I < r.pickupSet);
    expect(belowSet.every(s => s.operated === false)).toBe(true);
  });

  it("respeita um degrau (step) customizado", () => {
    const p = prot();
    const stage = p["51"].stages[0];
    const r = runPickupRamp("51", stage, { relayProt: p, step: 0.1 });
    expect(r.stepA).toBe(0.1);
  });

  it("isola o estágio alvo: só ele fica habilitado", () => {
    const p = prot();
    const iso = isolateStage(p, "51", "51-1");
    expect(iso["51"].enabled).toBe(true);
    expect(iso["50"].enabled).toBe(false);
    expect(iso["51"].stages.find(s => s.id === "51-1").enabled).toBe(true);
    expect(iso["51"].stages.filter(s => s.id !== "51-1").every(s => !s.enabled)).toBe(true);
  });

  it("rejeita funções não suportadas pela rampa", () => {
    const r = runPickupRamp("67", { id: "67-1", pickup: 5 }, {});
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/não suportada/i);
    expect(RAMP_SUPPORTED).toContain("51");
    expect(RAMP_SUPPORTED).not.toContain("67");
  });

  it("modo ideal (sem relayProt) mede ≈ ajuste", () => {
    const r = runPickupRamp("50", { id: "50-1", pickup: 10 }, {});
    expect(r.ok).toBe(true);
    expect(r.pickupMeasured).toBeGreaterThanOrEqual(10);
    expect(r.pickupMeasured - 10).toBeLessThanOrEqual(r.stepA + 1e-9);
  });
});
