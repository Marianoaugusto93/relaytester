// settingGroups.js — Grupos de Ajustes G1–G4 (setting groups) do lado de parametrização.
// Módulo puro (sem React). Um relé real guarda vários conjuntos de ajustes e permite
// comutar qual está ativo; aqui os grupos vivem no "software" (prot), e "Send" continua
// levando apenas o grupo ativo ao relé (relayProt).
import { deepClone } from "./defaults.js";

export const GROUP_COUNT = 4;
// Rótulos exibidos na UI (G1..G4).
export const GROUP_LABELS = Array.from({ length: GROUP_COUNT }, (_, i) => `G${i + 1}`);

/**
 * Materializa 4 grupos a partir de um objeto prot (deep clone de cada slot).
 * @param {Object} prot
 * @returns {Array<Object>} 4 clones independentes de prot
 */
export function mkGroups(prot) {
  return Array.from({ length: GROUP_COUNT }, () => deepClone(prot));
}

/**
 * Normaliza um array de grupos vindo de um arquivo: garante exatamente 4 slots,
 * clonando prot para preencher faltantes. Retrocompatível com saves antigos.
 * @param {Array<Object>|null|undefined} groups
 * @param {Object} prot - fallback para slots ausentes
 * @returns {Array<Object>} 4 grupos válidos
 */
export function normalizeGroups(groups, prot) {
  if (!Array.isArray(groups) || groups.length === 0) return mkGroups(prot);
  const out = [];
  for (let i = 0; i < GROUP_COUNT; i++) {
    out.push(deepClone(groups[i] != null ? groups[i] : prot));
  }
  return out;
}

/** Restringe um índice de grupo ao intervalo [0, GROUP_COUNT-1]. */
export function clampGroupIdx(idx) {
  const n = Math.trunc(Number(idx));
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n >= GROUP_COUNT) return GROUP_COUNT - 1;
  return n;
}

/**
 * Comuta o grupo ativo. Salva o prot atual (edições em andamento) no slot do grupo
 * ativo antigo e devolve o snapshot do novo grupo para virar o novo prot.
 * NÃO envia ao relé — o fluxo real exige um "Send" explícito.
 * @param {Array<Object>} groups - grupos (os inativos ficam materializados)
 * @param {number} active - índice do grupo ativo atual
 * @param {Object} prot - objeto de ajustes em edição (representa o grupo ativo)
 * @param {number} idx - índice do grupo destino
 * @returns {{groups:Array<Object>, active:number, prot:Object}}
 */
export function applyGroupSwitch(groups, active, prot, idx) {
  const from = clampGroupIdx(active);
  const to = clampGroupIdx(idx);
  const next = groups.slice();
  next[from] = deepClone(prot); // congela edições no slot antigo
  if (to === from) {
    return { groups: next, active: from, prot: deepClone(next[from]) };
  }
  return { groups: next, active: to, prot: deepClone(next[to]) };
}

/**
 * Copia um grupo para outro (deep clone). Primeiro sincroniza o slot ativo com o
 * prot atual para não perder edições em andamento. Se o destino for o grupo ativo,
 * também devolve o novo prot; caso contrário prot permanece o mesmo.
 * @param {Array<Object>} groups
 * @param {number} active - índice do grupo ativo
 * @param {Object} prot - ajustes em edição (grupo ativo)
 * @param {number} from - índice de origem
 * @param {number} to - índice de destino
 * @returns {{groups:Array<Object>, prot:Object}}
 */
export function copyGroupPure(groups, active, prot, from, to) {
  const a = clampGroupIdx(active);
  const f = clampGroupIdx(from);
  const t = clampGroupIdx(to);
  const next = groups.slice();
  next[a] = deepClone(prot); // sincroniza grupo ativo antes de copiar
  next[t] = deepClone(next[f]);
  const nextProt = t === a ? deepClone(next[t]) : prot;
  return { groups: next, prot: nextProt };
}
