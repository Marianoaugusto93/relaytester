/**
 * wiringHelpers.js — Helpers puros para o painel de cabos do Campo.
 *
 * Módulo sem dependências de React ou de CampoPage — recebe funções por parâmetro
 * para evitar importações circulares.
 */

/**
 * Calcula o conjunto de terminais válidos como destino a partir de um terminal de origem.
 *
 * Itera sobre todos os IDs disponíveis e chama `validateFn(fromTid, tid, switchSt)`.
 * Retorna um Set com os tids cujo resultado tem `valid === true`, excluindo o próprio `fromTid`.
 *
 * @param {string} fromTid - ID do terminal de origem selecionado.
 * @param {string[]} allTids - Lista completa de todos os IDs de terminal disponíveis.
 * @param {Object} switchSt - Estado atual da chave de aferição (posição por polo).
 * @param {function(string, string, Object): {valid: boolean, msg: string}} validateFn
 *   Função de validação elétrica — deve seguir a assinatura de `validateConnection`.
 * @returns {Set<string>} Conjunto de IDs de terminal válidos como destino.
 */
export function computeValidTargets(fromTid, allTids, switchSt, validateFn) {
  const result = new Set();
  for (const tid of allTids) {
    if (tid === fromTid) continue;
    const check = validateFn(fromTid, tid, switchSt);
    if (check.valid) result.add(tid);
  }
  return result;
}
