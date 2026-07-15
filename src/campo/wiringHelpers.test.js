import { describe, it, expect, vi } from "vitest";
import { computeValidTargets } from "./wiringHelpers.js";

// ── Fake validateFn ───────────────────────────────────────────────────────────
// Simula as regras de validateConnection de CampoPage sem importar o módulo real:
//   - corrente↔corrente: válido
//   - tensão↔tensão: válido
//   - binário↔binário: válido
//   - corrente↔tensão: inválido
//   - analógico↔borne: inválido
//   - switch_bot: sempre inválido
const getGroup = (tid) => {
  if (tid.endsWith("_bot") && /^(ia|ib|ic|va|vb|vc|terra)/.test(tid)) return "switch_bot";
  if (/^(i\d_)/.test(tid)) return "maleta_current";
  if (/^(v\d_)/.test(tid)) return "maleta_voltage";
  if (/^(bi\d_)/.test(tid)) return "maleta_bi";
  if (/^(bo\d_)/.test(tid)) return "maleta_bo";
  if (/^(ia|ib|ic)/.test(tid)) return "switch_current";
  if (/^(va|vb|vc)/.test(tid)) return "switch_voltage";
  if (/^tb_/.test(tid)) return "borne";
  return "unknown";
};

const fakeValidate = (tidA, tidB, _switchSt) => {
  const gA = getGroup(tidA);
  const gB = getGroup(tidB);
  if (gA === "switch_bot" || gB === "switch_bot") return { valid: false, msg: "switch_bot proibido" };
  const isCurrent = (g) => g === "maleta_current" || g === "switch_current";
  const isVoltage = (g) => g === "maleta_voltage" || g === "switch_voltage";
  const isBorne = (g) => g === "borne";
  if (isCurrent(gA) && isVoltage(gB)) return { valid: false, msg: "corrente↔tensão" };
  if (isVoltage(gA) && isCurrent(gB)) return { valid: false, msg: "corrente↔tensão" };
  if ((isCurrent(gA) || isVoltage(gA)) && isBorne(gB)) return { valid: false, msg: "analógico↔borne" };
  if (isBorne(gA) && (isCurrent(gB) || isVoltage(gB))) return { valid: false, msg: "analógico↔borne" };
  return { valid: true, msg: "" };
};

// IDs de exemplo representando a maleta e a régua
const SAMPLE_TIDS = [
  "i1_pos", "i1_neg",   // corrente maleta
  "i2_pos", "i2_neg",
  "v1_pos", "v1_neg",   // tensão maleta
  "bi1_pos", "bi1_neg", // binário entrada
  "bo1_pos", "bo1_neg", // binário saída
  "tb_1_top", "tb_1_bottom", // bornes
  "ia1_top", "ia1_bot",  // chave corrente (bot proibido)
];

const switchSt = {}; // fakeValidate não usa switchSt — valor irrelevante

describe("computeValidTargets — filtragem básica", () => {
  it("retorna apenas tids válidos para origem de corrente", () => {
    const result = computeValidTargets("i1_pos", SAMPLE_TIDS, switchSt, fakeValidate);
    // corrente↔corrente: válido
    expect(result.has("i1_neg")).toBe(true);
    expect(result.has("i2_pos")).toBe(true);
    expect(result.has("i2_neg")).toBe(true);
    expect(result.has("ia1_top")).toBe(true); // switch_current ↔ maleta_current: válido no fake
    // corrente↔tensão: inválido
    expect(result.has("v1_pos")).toBe(false);
    expect(result.has("v1_neg")).toBe(false);
    // corrente↔borne: inválido
    expect(result.has("tb_1_top")).toBe(false);
    expect(result.has("tb_1_bottom")).toBe(false);
  });

  it("exclui o próprio fromTid do resultado", () => {
    const result = computeValidTargets("i1_pos", SAMPLE_TIDS, switchSt, fakeValidate);
    expect(result.has("i1_pos")).toBe(false);
  });

  it("retorna set vazio quando nenhum destino é válido", () => {
    // Cria um validateFn que sempre retorna inválido
    const neverValid = () => ({ valid: false, msg: "nunca" });
    const result = computeValidTargets("i1_pos", SAMPLE_TIDS, switchSt, neverValid);
    expect(result.size).toBe(0);
  });

  it("switch_bot nunca aparece no resultado", () => {
    // ia1_bot tem grupo switch_bot — deve ser excluído independente da origem
    const result = computeValidTargets("i1_pos", SAMPLE_TIDS, switchSt, fakeValidate);
    expect(result.has("ia1_bot")).toBe(false);
  });

  it("repassa switchSt para o validateFn", () => {
    const spy = vi.fn(() => ({ valid: true, msg: "" }));
    const customSt = { ia1: "up", ib1: "down" };
    computeValidTargets("i1_pos", ["i2_pos"], customSt, spy);
    expect(spy).toHaveBeenCalledWith("i1_pos", "i2_pos", customSt);
  });

  it("retorna Set (não array)", () => {
    const result = computeValidTargets("i1_pos", SAMPLE_TIDS, switchSt, fakeValidate);
    expect(result).toBeInstanceOf(Set);
  });
});

describe("computeValidTargets — borne↔borne permitido", () => {
  it("tb tids são válidos entre si", () => {
    const result = computeValidTargets("tb_1_top", SAMPLE_TIDS, switchSt, fakeValidate);
    expect(result.has("tb_1_bottom")).toBe(true);
  });

  it("borne não aceita corrente como destino", () => {
    const result = computeValidTargets("tb_1_top", SAMPLE_TIDS, switchSt, fakeValidate);
    expect(result.has("i1_pos")).toBe(false);
  });
});
