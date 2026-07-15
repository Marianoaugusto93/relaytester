// breakerMonitor.js — Monitor de Desgaste do Disjuntor (Breaker Wear Monitor)
// Módulo puro (sem React): acumula número de aberturas e somatório I² interrompido (kA²)
// por ciclo de vida da máquina, com alarme configurável por limites de manutenção.

/**
 * Limites padrão de alarme do monitor (didáticos, para demonstração).
 * Um relé comercial típico usa valores muito maiores (ex: maxOps=1000, maxKA2=50000).
 */
export const BK_MON_DEFAULT_LIMITS = {
  maxOps: 20,      // máximo de aberturas permitidas
  maxKA2: 500,     // máximo somatório de kA² permitido
};

/**
 * Cria estado inicial do monitor de desgaste.
 * @returns {{nOps: number, sumKA2: number, lastIkA: number, lastOpTs: number|null}}
 */
export function mkBkMon() {
  return {
    nOps: 0,         // número de operações (aberturas)
    sumKA2: 0,       // somatório de corrente² interrompida (kA²)
    lastIkA: 0,      // últimas corrente primária interrompida (kA)
    lastOpTs: null,  // timestamp da última operação (ms)
  };
}

/**
 * Registra uma operação de abertura do disjuntor (trip/falha).
 * Calcula corrente primária em kA a partir da secundária e relação TC.
 * Atualiza estado de forma imutável.
 *
 * @param {Object} mon - estado do monitor
 * @param {number} iSecA - corrente secundária interrompida (A)
 * @param {number} rtc - relação TC (primário/secundário)
 * @returns {Object} novo estado (imutável)
 */
export function recordTripOp(mon, iSecA, rtc) {
  // Protege contra valores não-finitos ou negativos
  const iSec = Number.isFinite(iSecA) && iSecA >= 0 ? iSecA : 0;
  const ratio = Number.isFinite(rtc) && rtc > 0 ? rtc : 1;

  // Converte para primária em kA
  const iPrimKA = (iSec * ratio) / 1000;
  const iKA2 = iPrimKA * iPrimKA;

  return {
    nOps: mon.nOps + 1,
    sumKA2: mon.sumKA2 + iKA2,
    lastIkA: iPrimKA,
    lastOpTs: Date.now(),
  };
}

/**
 * Verifica se o monitor está em condição de alarme
 * (excedeu um ou ambos os limites de manutenção).
 *
 * @param {Object} mon - estado do monitor
 * @param {Object} lim - limites {maxOps, maxKA2}
 * @returns {{alarm: boolean, byOps: boolean, byKA2: boolean}}
 *   alarm: true se QUALQUER limite excedido
 *   byOps: true se nOps >= maxOps
 *   byKA2: true se sumKA2 >= maxKA2
 */
export function bkMonAlarm(mon, lim) {
  const byOps = mon.nOps >= lim.maxOps;
  const byKA2 = mon.sumKA2 >= lim.maxKA2;
  return {
    alarm: byOps || byKA2,
    byOps,
    byKA2,
  };
}

/**
 * Redefine monitor ao estado inicial (zero aberturas, zero kA²).
 * @returns {Object} estado zerado (mesmo shape de mkBkMon)
 */
export function resetBkMon() {
  return mkBkMon();
}

/**
 * Normaliza um objeto de monitor vindo de um arquivo (load retrocompatível).
 * Campos ausentes, não-finitos ou null viram 0/null; valida o shape.
 *
 * @param {Object|null|undefined} raw
 * @returns {Object} monitor válido
 */
export function normalizeBkMon(raw) {
  if (!raw || typeof raw !== "object") return mkBkMon();

  const nOps = Number.isFinite(raw.nOps) ? raw.nOps : 0;
  const sumKA2 = Number.isFinite(raw.sumKA2) ? raw.sumKA2 : 0;
  const lastIkA = Number.isFinite(raw.lastIkA) ? raw.lastIkA : 0;
  const lastOpTs =
    typeof raw.lastOpTs === "number" && Number.isFinite(raw.lastOpTs)
      ? raw.lastOpTs
      : null;

  return {
    nOps: Math.max(0, nOps), // força não-negativo
    sumKA2: Math.max(0, sumKA2),
    lastIkA: Math.max(0, lastIkA),
    lastOpTs,
  };
}
