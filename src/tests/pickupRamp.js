import { evalProtectionsDirect } from "../protection.js";
import { deepClone } from "../defaults.js";

// ── Leva 3 — Rampa de pickup (busca automática do limiar de atuação) ──────────
// Em vez de checar pontos discretos, a rampa eleva a corrente em degraus a partir
// de um valor abaixo do ajuste até o elemento operar, e registra a corrente exata
// de atuação (pickup medido) + erro % vs. ajustado. Reaproveita o motor real
// (evalProtectionsDirect) para decidir a operação em cada degrau.
//
// Suporta funções de sobrecorrente de fase e neutro: 50, 51, 50N, 51N.
// A injeção é monofásica (fase A): para 50/51 a maior corrente de fase = I; para
// 50N/51N o 3I0 (= Ia+Ib+Ic, com Ib=Ic=0) também = I. Assim a corrente injetada
// mapeia 1:1 na grandeza vista pelo elemento.

const RAMP_FUNCS = ["50", "51", "50N", "51N"];

/**
 * Monta leituras do relé com injeção monofásica (fase A) de magnitude I.
 * @param {number} I - corrente de fase A (A secundário)
 * @param {number} vNom - tensão fase-neutro nominal (V); padrão 66.4
 * @returns {{currents:Object, voltages:Object}}
 */
export function rrAtCurrent(I, vNom = 66.4) {
  return {
    currents: { Ia: { mag: I, ang: 0 }, Ib: { mag: 0, ang: -120 }, Ic: { mag: 0, ang: 120 } },
    voltages: { Va: { mag: vNom, ang: 0 }, Vb: { mag: vNom, ang: -120 }, Vc: { mag: vNom, ang: 120 } },
  };
}

/**
 * Isola uma função/estágio: clona relayProt, desabilita todas as outras funções
 * e mantém apenas o estágio alvo habilitado, para que allTrips contenha somente ele.
 * @param {Object} relayProt - ajustes completos do relé
 * @param {string} fid - id da função (ex.: "51")
 * @param {string} stageId - id do estágio alvo (ex.: "51-1")
 * @returns {Object} relayProt isolado
 */
export function isolateStage(relayProt, fid, stageId) {
  const iso = deepClone(relayProt);
  Object.keys(iso).forEach(k => { if (k !== fid && iso[k]) iso[k].enabled = false; });
  if (!iso[fid]) return iso;
  iso[fid].enabled = true;
  (iso[fid].stages || []).forEach(s => { s.enabled = s.id === stageId; });
  return iso;
}

/**
 * Executa a rampa de pickup para um estágio de sobrecorrente.
 * @param {string} fid - função: "50" | "51" | "50N" | "51N"
 * @param {Object} stage - estágio do relé (usa stage.pickup, stage.id)
 * @param {Object} opts - {relayProt, sys, startMult=0.8, stopMult=1.2, step}
 *   step é o degrau em A (padrão = 1% do pickup, mínimo 0.01 A).
 * @returns {{ok:boolean, fid:string, pickupSet:number, pickupMeasured:number|null,
 *   errorPct:number|null, stepA:number, nSteps:number, steps:Array<{I:number,operated:boolean}>, reason?:string}}
 */
export function runPickupRamp(fid, stage, opts = {}) {
  if (!RAMP_FUNCS.includes(fid)) {
    return { ok: false, fid, pickupSet: stage?.pickup ?? null, pickupMeasured: null, errorPct: null, stepA: 0, nSteps: 0, steps: [], reason: `Rampa não suportada para ${fid}` };
  }
  if (!stage || !(stage.pickup > 0)) {
    return { ok: false, fid, pickupSet: stage?.pickup ?? null, pickupMeasured: null, errorPct: null, stepA: 0, nSteps: 0, steps: [], reason: "Pickup inválido" };
  }
  const { relayProt, sys, startMult = 0.8, stopMult = 1.2 } = opts;
  const set = stage.pickup;
  const stepA = opts.step || Math.max(set * 0.01, 0.01);
  const start = set * startMult;
  const stop = set * stopMult;

  const iso = relayProt ? isolateStage(relayProt, fid, stage.id) : null;
  const sysSafe = sys || { tp: { secV: 115 }, freq: 60 };

  const steps = [];
  let measured = null;
  // Limite de segurança de iterações para evitar loop infinito com step minúsculo.
  const maxSteps = 5000;
  let n = 0;
  for (let I = start; I <= stop + 1e-9 && n < maxSteps; I += stepA, n++) {
    const rr = rrAtCurrent(I);
    let operated;
    if (iso) {
      const { allTrips } = evalProtectionsDirect(rr, iso, sysSafe);
      operated = allTrips.some(t => t.stage === stage.id);
    } else {
      // Sem relayProt: comparação direta com o ajuste (modelo ideal).
      operated = I >= set;
    }
    steps.push({ I: +I.toFixed(4), operated });
    if (operated && measured === null) { measured = I; break; }
  }

  const errorPct = measured != null ? ((measured - set) / set) * 100 : null;
  return {
    ok: measured != null,
    fid,
    pickupSet: set,
    pickupMeasured: measured != null ? +measured.toFixed(4) : null,
    errorPct: errorPct != null ? +errorPct.toFixed(2) : null,
    stepA: +stepA.toFixed(4),
    nSteps: steps.length,
    steps,
    reason: measured != null ? undefined : "Não atuou na faixa da rampa",
  };
}

export const RAMP_SUPPORTED = RAMP_FUNCS;
