// soe.js — Registro Sequencial de Eventos (SOE)
// Módulo puro (sem React): constantes, factory, push e exportação CSV.

export const SOE_TYPES = {
  INJ_START:       "INJ_START",
  INJ_STOP:        "INJ_STOP",
  TRIP:            "TRIP",
  TRIP_MALETA:     "TRIP_MALETA",
  CB_OPEN:         "CB_OPEN",
  CB_CLOSE:        "CB_CLOSE",
  CB_MAINT_ALARM:  "CB_MAINT_ALARM",
  RECLOSE:         "RECLOSE",
  LOCKOUT:         "LOCKOUT",
  SETTINGS_SEND:   "SETTINGS_SEND",
  SETTINGS_GET:    "SETTINGS_GET",
  SETTINGS_CHANGE: "SETTINGS_CHANGE",
  LED_RESET:       "LED_RESET",
  GROUP_CHANGE:    "GROUP_CHANGE",
  PRESET:          "PRESET",
  WARN:            "WARN",
  INFO:            "INFO",
  LOP_ON:          "LOP_ON",
  LOP_OFF:         "LOP_OFF",
};

// hh:mm:ss.mmm (hora local)
function nowMs() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

/**
 * Cria um evento SOE.
 * @param {{type:string, icon:string, text:string, dt:string}} param
 * @returns {{time:string, tsMs:number, type:string, icon:string, text:string, dt:string}}
 */
export function soeEvent({ type, icon, text, dt = "" }) {
  return { time: nowMs(), tsMs: Date.now(), type, icon, text, dt };
}

/**
 * Insere evento no início da lista e trunca em cap (FIFO).
 * @param {Array} list
 * @param {Object} e - resultado de soeEvent()
 * @param {number} [cap=500]
 * @returns {Array}
 */
export function soePush(list, e, cap = 500) {
  return [e, ...list].slice(0, cap);
}

// Envolve um campo em aspas duplas CSV (dobra aspas internas).
// Células iniciando com =, +, -, @, tab ou CR ganham apóstrofo de prefixo para
// não serem interpretadas como fórmula no Excel/LibreOffice (CSV injection).
function csvCell(v) {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (s.includes(";") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Exporta lista de eventos como string CSV (mais antigo primeiro).
 * Header: timestamp;type;text;dt
 * @param {Array} list
 * @returns {string}
 */
export function soeToCsv(list) {
  const header = "timestamp;type;text;dt";
  const rows = [...list].reverse().map(e =>
    [csvCell(e.time), csvCell(e.type || ""), csvCell(e.text || ""), csvCell(e.dt || "")].join(";")
  );
  return [header, ...rows].join("\r\n");
}
