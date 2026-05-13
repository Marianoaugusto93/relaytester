// Manhattan routing utilities + electrical model for Campo refactor

// ── HARDWARE COLORS (IEC 60445 Standard) ──
// Phase A = Blue, Phase B = Red, Phase C = Gray/Black, Ground = Green
// These colors represent real relay hardware and must not change for educational accuracy
export const CHAVE_POLES = [
  { id: 'ia1', group: 'ia', body: '#1565C0', dark: '#0D47A1', shine: '#42A5F5', cable: '#1E88E5', topAnilha: 'A',  botAnilha: 'S1', kind: 'normal' },
  { id: 'ia2', group: 'ia', body: '#1565C0', dark: '#0D47A1', shine: '#42A5F5', cable: '#1E88E5', topAnilha: 'T',  botAnilha: 'S2', kind: 'normal' },
  { id: 'ib1', group: 'ib', body: '#B71C1C', dark: '#7F0000', shine: '#EF5350', cable: '#E53935', topAnilha: 'B',  botAnilha: 'S1', kind: 'normal' },
  { id: 'ib2', group: 'ib', body: '#B71C1C', dark: '#7F0000', shine: '#EF5350', cable: '#E53935', topAnilha: 'T',  botAnilha: 'S2', kind: 'normal' },
  { id: 'ic1', group: 'ic', body: '#9E9E9E', dark: '#616161', shine: '#E0E0E0', cable: '#AAAAAA', topAnilha: 'C',  botAnilha: 'S1', kind: 'normal' },
  { id: 'ic2', group: 'ic', body: '#9E9E9E', dark: '#616161', shine: '#E0E0E0', cable: '#AAAAAA', topAnilha: 'T',  botAnilha: 'S2', kind: 'normal' },
  { id: 'va',  group: 'va', body: '#1565C0', dark: '#0D47A1', shine: '#42A5F5', cable: '#1E88E5', topAnilha: 'VA', botAnilha: 'X1', kind: 'normal' },
  { id: 'vb',  group: 'vb', body: '#B71C1C', dark: '#7F0000', shine: '#EF5350', cable: '#E53935', topAnilha: 'VB', botAnilha: 'X2', kind: 'normal' },
  { id: 'vc',  group: 'vc', body: '#9E9E9E', dark: '#616161', shine: '#E0E0E0', cable: '#AAAAAA', topAnilha: 'VC', botAnilha: 'X1', kind: 'normal' },
  { id: 'terra', group: 'terra', body: '#2E7D32', dark: '#1B5E20', shine: '#66BB6A', cable: '#43A047', topAnilha: 'T', botAnilha: 'T', kind: 'terra' },
];

// Current groups: 3 phases, each with 2 poles (phase + return T)
export const CURRENT_GROUPS = [
  { group: 'ia', id1: 'ia1', id2: 'ia2' },  // Fase A: ia1(A/S1) + ia2(T/S2)
  { group: 'ib', id1: 'ib1', id2: 'ib2' },  // Fase B: ib1(B/S1) + ib2(T/S2)
  { group: 'ic', id1: 'ic1', id2: 'ic2' },  // Fase C: ic1(C/S1) + ic2(T/S2)
];

export const VOLTAGE_POLES = ['va', 'vb', 'vc'];

// ── TERMINAL BLOCK ──
// Terminal block module count. tb_1 ... tb_TB_RANGE (each has _top/_bottom internal short).
export const TB_RANGE = 16;

// ── MALETA ANALOG/BINARY PAIRS ──
// Helper to build pos/neg pair (banana jack pair on suitcase).
function _mkPair(p, n) {
  const l = p + n;
  return { label: l, red: { id: `${p.toLowerCase()}${n}_pos`, label: l, color: 'red' }, blk: { id: `${p.toLowerCase()}${n}_neg`, label: l, color: 'black' } };
}
export const AO_I = [_mkPair('I', 1), _mkPair('I', 2), _mkPair('I', 3)];
export const AO_V = [_mkPair('V', 1), _mkPair('V', 2), _mkPair('V', 3)];
export const BO_PAIRS = [_mkPair('BO', 1), _mkPair('BO', 2), _mkPair('BO', 3), _mkPair('BO', 4)];
export const BI_PAIRS = [_mkPair('BI', 1), _mkPair('BI', 2), _mkPair('BI', 3), _mkPair('BI', 4)];

/**
 * Build initial switch state: all normal poles start 'up' (closed).
 * @returns {Object} Map of pole id → 'up'|'down'
 */
export function initSwitchState() {
  const s = {};
  CHAVE_POLES.filter(p => p.kind === 'normal').forEach(p => { s[p.id] = 'up'; });
  return s;
}

// ── WIRING PRESETS ──────────────────────────────────────────────────────────
// Cable presets for common test bench wiring configurations.
// Each preset: { id, label, desc, switchGroups (groups to OPEN/'down'), conns ([from,to] pairs) }
const CB_INTERFACE_CONNS = [
  ['bi1_pos','tb_1_top'],   // BI1+ → BO3-1
  ['bi1_neg','tb_2_top'],   // BI1- → BO3-2
  ['tb_1_top','tb_13_top'], // BO3-1 → TC-1 (trip coil via BO3)
  ['tb_2_top','tb_14_top'], // BO3-2 → TC-2
  ['bi2_pos','tb_9_top'],   // BI2+ → 52a-1 (feedback disjuntor fechado)
  ['bi2_neg','tb_10_top'],  // BI2- → 52a-2
  ['bi3_pos','tb_11_top'],  // BI3+ → 52b-1 (feedback disjuntor aberto)
  ['bi3_neg','tb_12_top'],  // BI3- → 52b-2
  ['tb_15_top','tb_16_top'],// FC-1 → FC-2 (bobina de fechamento pronta)
];

export const WIRING_PRESETS = [
  { id:'i3ph',  label:'I Trifásico',     desc:'Injeção trifásica de corrente (3 fases + retorno)',
    switchGroups:['ia','ib','ic'],
    conns:[['i1_pos','ia1_top'],['i1_neg','ia2_top'],['i2_pos','ib1_top'],['i2_neg','ib2_top'],['i3_pos','ic1_top'],['i3_neg','ic2_top']] },
  { id:'i1ph',  label:'I Mono A',        desc:'Injeção monofásica corrente na fase A',
    switchGroups:['ia'],
    conns:[['i1_pos','ia1_top'],['i1_neg','ia2_top']] },
  { id:'v3ph',  label:'V Trifásico',     desc:'Injeção trifásica de tensão (3 fases + terra)',
    switchGroups:['va','vb','vc'],
    conns:[['v1_pos','va_top'],['v1_neg','terra_top'],['v2_pos','vb_top'],['v2_neg','terra_top'],['v3_pos','vc_top'],['v3_neg','terra_top']] },
  { id:'iv3ph', label:'I+V Completo',    desc:'Injeção trifásica completa: 3 correntes + 3 tensões',
    switchGroups:['ia','ib','ic','va','vb','vc'],
    conns:[['i1_pos','ia1_top'],['i1_neg','ia2_top'],['i2_pos','ib1_top'],['i2_neg','ib2_top'],['i3_pos','ic1_top'],['i3_neg','ic2_top'],['v1_pos','va_top'],['v1_neg','terra_top'],['v2_pos','vb_top'],['v2_neg','terra_top'],['v3_pos','vc_top'],['v3_neg','terra_top']] },
  { id:'cb_if', label:'Interface CB',    desc:'Interface do disjuntor: BO3, 52a/52b, TC, FC',
    switchGroups:[],
    conns:CB_INTERFACE_CONNS },
  { id:'full',  label:'Bancada Completa', desc:'I+V trifásico + interface completa do disjuntor',
    switchGroups:['ia','ib','ic','va','vb','vc'],
    conns:[['i1_pos','ia1_top'],['i1_neg','ia2_top'],['i2_pos','ib1_top'],['i2_neg','ib2_top'],['i3_pos','ic1_top'],['i3_neg','ic2_top'],['v1_pos','va_top'],['v1_neg','terra_top'],['v2_pos','vb_top'],['v2_neg','terra_top'],['v3_pos','vc_top'],['v3_neg','terra_top'],...CB_INTERFACE_CONNS] },
];

// ── CUSTOM PRESET PERSISTENCE ─────────────────────────────────────────────
// Stores user-defined wiring presets in localStorage.
// Storage key: "campo_custom_presets" (JSON array, max 50 items)
const CUSTOM_PRESETS_KEY = 'campo_custom_presets';
const MAX_CUSTOM_PRESETS = 50;

/**
 * Load all custom wiring presets from localStorage.
 * @returns {Array} Array of custom preset objects (may be empty)
 */
export function loadCustomPresets() {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save a new custom wiring preset.
 * @param {string} name - Preset name (required, non-empty)
 * @param {string} description - Optional description
 * @param {Array<{from:string,to:string}>} cables - Cable connection list
 * @param {Object} switchSt - Switch state map
 * @param {Array<string>} tags - Optional tag list (e.g. ["Beginner", "Current"])
 * @returns {{success: boolean, message: string, preset: Object|null}}
 */
export function saveCustomPreset(name, description, cables, switchSt, tags = []) {
  if (!name || !name.trim()) {
    return { success: false, message: 'Nome do preset é obrigatório', preset: null };
  }
  try {
    const all = loadCustomPresets();
    if (all.length >= MAX_CUSTOM_PRESETS) {
      return { success: false, message: `Máximo de ${MAX_CUSTOM_PRESETS} presets atingido`, preset: null };
    }
    const preset = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      description: (description || '').trim(),
      cables: (cables || []).map(c => ({ from: c.from, to: c.to })),
      switchSt: { ...(switchSt || {}) },
      tags: Array.isArray(tags) ? tags : [],
      createdAt: new Date().toISOString(),
      custom: true,
    };
    all.unshift(preset);
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(all));
    return { success: true, message: 'Preset salvo com sucesso', preset };
  } catch (err) {
    return { success: false, message: `Erro ao salvar: ${err.message}`, preset: null };
  }
}

/**
 * Delete a custom preset by id.
 * @param {string} presetId
 * @returns {{success: boolean}}
 */
export function deleteCustomPreset(presetId) {
  try {
    const all = loadCustomPresets();
    const next = all.filter(p => p.id !== presetId);
    if (next.length === all.length) return { success: false };
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(next));
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Update fields of an existing custom preset.
 * @param {string} presetId
 * @param {Object} updates - { name?, description?, tags? }
 * @returns {{success: boolean}}
 */
export function updateCustomPreset(presetId, updates) {
  try {
    const all = loadCustomPresets();
    const idx = all.findIndex(p => p.id === presetId);
    if (idx < 0) return { success: false };
    const cur = all[idx];
    all[idx] = {
      ...cur,
      name: updates.name != null ? String(updates.name).trim() : cur.name,
      description: updates.description != null ? String(updates.description).trim() : cur.description,
      tags: Array.isArray(updates.tags) ? updates.tags : cur.tags,
    };
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(all));
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Export an array of presets as a JSON string.
 * @param {Array} presets
 * @returns {string} JSON serialized presets
 */
export function exportPresetsAsJSON(presets) {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), presets: presets || [] }, null, 2);
}

/**
 * Import presets from a JSON string. Validates structure and merges with existing
 * (skips duplicates by id). Returns counts and any errors encountered.
 * @param {string} jsonString
 * @returns {{success: boolean, imported: number, errors: Array<string>}}
 */
export function importPresetsFromJSON(jsonString) {
  const errors = [];
  let imported = 0;
  try {
    const parsed = JSON.parse(jsonString);
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.presets) ? parsed.presets : null;
    if (!list) {
      return { success: false, imported: 0, errors: ['Formato JSON inválido — esperado array ou {presets:[]}'] };
    }
    const all = loadCustomPresets();
    const existingIds = new Set(all.map(p => p.id));
    list.forEach((item, i) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Item ${i}: não é um objeto`);
        return;
      }
      if (!item.name || !Array.isArray(item.cables) || !item.switchSt) {
        errors.push(`Item ${i} (${item.name || 'sem nome'}): estrutura inválida`);
        return;
      }
      if (all.length + imported >= MAX_CUSTOM_PRESETS) {
        errors.push(`Item ${i}: limite de ${MAX_CUSTOM_PRESETS} presets atingido`);
        return;
      }
      const id = item.id && !existingIds.has(item.id)
        ? item.id
        : `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${i}`;
      existingIds.add(id);
      all.unshift({
        id,
        name: String(item.name).trim(),
        description: String(item.description || '').trim(),
        cables: item.cables.map(c => ({ from: c.from, to: c.to })),
        switchSt: { ...item.switchSt },
        tags: Array.isArray(item.tags) ? item.tags : [],
        createdAt: item.createdAt || new Date().toISOString(),
        custom: true,
      });
      imported++;
    });
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(all));
    return { success: imported > 0, imported, errors };
  } catch (err) {
    return { success: false, imported: 0, errors: [`Erro de parse: ${err.message}`] };
  }
}

/**
 * Apply a custom preset: load cables + switchSt directly.
 * @param {Object} preset - Custom preset object
 * @returns {{ switchSt: Object, cables: Array<{from:string,to:string}> }}
 */
export function applyCustomPreset(preset) {
  return {
    switchSt: { ...(preset.switchSt || initSwitchState()) },
    cables: (preset.cables || []).map(c => ({ from: c.from, to: c.to })),
  };
}

/**
 * Apply a wiring preset: produce new switchSt + cables list.
 * @param {Object} preset - WIRING_PRESETS entry { switchGroups, conns }
 * @returns {{ switchSt: Object, cables: Array<{from:string,to:string}> }}
 */
export function applyWiringPreset(preset) {
  const switchSt = initSwitchState();
  (preset.switchGroups || []).forEach(group => {
    CHAVE_POLES.filter(p => p.group === group).forEach(p => { switchSt[p.id] = 'down'; });
  });
  const cables = (preset.conns || []).map(([from, to]) => ({ from, to }));
  return { switchSt, cables };
}

/**
 * Determine if the breaker close coil (FC) is wired in the field.
 * FC is wired when tb_15 and tb_16 are in the same electrical group.
 * @param {{areConnected: Function}} electricalGraph - Resolved Union-Find graph
 * @returns {boolean} true if FC coil is wired and ready to close breaker
 */
export function computeCloseCoilWired(electricalGraph) {
  if (!electricalGraph) return false;
  return electricalGraph.areConnected('tb_15_top', 'tb_16_top');
}

/**
 * Determine cable color based on terminal phase (IEC 60445).
 * A (phase 1) = Gold/Yellow, B (phase 2) = Red, C (phase 3) = Gray, Neutral/Return = Light Gray
 * @param {string} a - First terminal ID
 * @param {string} b - Second terminal ID
 * @returns {string} Hex color code
 */
export function cableColorFor(a, b) {
  const isC = id => id.endsWith('_top') || id.endsWith('_bot');
  const isB = id => id.startsWith('tb_');
  if (!isC(a) && !isB(a) && !isC(b) && !isB(b)) return '#444444';
  const all = a + ' ' + b;
  if (/ia1|ia2|va_|i1_|v1_|bo1|bi1/.test(all)) return '#D4AA00';
  if (/ib1|ib2|vb_|i2_|v2_|bo2|bi2/.test(all)) return '#CC2222';
  if (/ic1|ic2|vc_|i3_|v3_|bo3|bi3/.test(all)) return '#888888';
  return '#AAAAAA';
}

/**
 * Get internal connections from switch and terminal block state.
 * Always includes: T phase interconnects, terminal block top↔bottom shorts.
 * @param {Object} switchSt - Switch positions per pole ('up'|'down')
 * @returns {Array<[string, string]>} Internal connection pairs
 */
export function getInternalConnections(switchSt) {
  const conns = [];

  // PERMANENT: all T (return) terminals are interconnected — relay current star point.
  conns.push(['ia2_top', 'ib2_top']);  // T fase A ↔ T fase B
  conns.push(['ib2_top', 'ic2_top']);  // T fase B ↔ T fase C

  // PERMANENT: each terminal block module top↔bottom is the same conductor.
  for (let i = 1; i <= TB_RANGE; i++) conns.push([`tb_${i}_top`, `tb_${i}_bottom`]);

  CURRENT_GROUPS.forEach(({ id1, id2 }) => {
    if (switchSt[id1] === 'up') {
      // CLOSED: A↔S1, T↔S2 (continuity through switch)
      conns.push([`${id1}_top`, `${id1}_bot`]);
      conns.push([`${id2}_top`, `${id2}_bot`]);
    } else {
      // SHORTED (open): S1↔S2 same electrical point
      conns.push([`${id1}_bot`, `${id2}_bot`]);
    }
  });

  VOLTAGE_POLES.forEach(id => {
    if (switchSt[id] === 'up') {
      // CLOSED: top↔bot continuity
      conns.push([`${id}_top`, `${id}_bot`]);
    }
    // OPEN: no connection
  });

  return conns;
}

/**
 * Build electrical connectivity graph using Union-Find.
 * Resolves which terminals are electrically connected via manual cables and switch state.
 * @param {Array<{from: string, to: string}>} manualConnections - User-created cable connections
 * @param {Array<[string, string]>} internalConns - Internal switch connections (tuple pairs)
 * @returns {{areConnected: Function, getGroup: Function}} Graph with connectivity queries
 */
export function buildElectricalGraph(manualConnections, internalConns) {
  const parent = {};
  const find = (x) => {
    if (!x) return x;
    if (!parent[x]) parent[x] = x;
    let root = x;
    while (parent[root] !== root) { root = parent[root]; }
    let cur = x;
    while (parent[cur] !== root) { const next = parent[cur]; parent[cur] = root; cur = next; }
    return root;
  };
  const union = (a, b) => { if (!a || !b) return; const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };
  (internalConns || []).forEach(([a, b]) => union(a, b));
  (manualConnections || []).forEach(({ from, to }) => union(from, to));
  return {
    areConnected: (a, b) => { if (!a || !b) return false; return find(a) === find(b); },
    getGroup: (a) => find(a),
  };
}

// ── Manhattan routing ─────────────────────────────────────────────────────────

const LANE_Y_MAP = {
  'A': 60,
  'B': 90,
  'C': 120,
  'gnd': 150,
  'cmd': 180
};

export function laneY(phase) {
  return LANE_Y_MAP[phase] || 180;
}

export function buildManhattanPath(p1, p2, phase) {
  const ly = laneY(phase);
  return `M ${p1.x} ${p1.y} L ${p1.x} ${ly} L ${p2.x} ${ly} L ${p2.x} ${p2.y}`;
}

export function suggestDestinations(srcTerminal, fieldState) {
  const dests = new Set();
  if (srcTerminal?.includes('i1')) {
    dests.add('ia1_top');
    dests.add('ia1_bot');
  }
  if (srcTerminal?.includes('i2')) {
    dests.add('ib1_top');
    dests.add('ib1_bot');
  }
  if (srcTerminal?.includes('i3')) {
    dests.add('ic1_top');
    dests.add('ic1_bot');
  }
  return dests;
}

// ── Terminal classification helpers ─────────────────────────────────────────

const CURRENT_TERMINALS = new Set([
  'i1_pos','i1_neg','i2_pos','i2_neg','i3_pos','i3_neg'
]);
const VOLTAGE_TERMINALS = new Set([
  'v1_pos','v1_neg','v2_pos','v2_neg','v3_pos','v3_neg'
]);
const ANALOG_PREFIX_RE = /^(i\d|v\d|bo\d|bi\d)/;
const TB_PREFIX_RE = /^tb_\d+_(top|bottom)$/;
// switch bottom terminals must never be a destination for external cables
const SWITCH_BOT_RE = /^(ia1|ia2|ib1|ib2|ic1|ic2|va|vb|vc)_bot$/;

function isCurrent(id) { return CURRENT_TERMINALS.has(id); }
function isVoltage(id) { return VOLTAGE_TERMINALS.has(id); }
function isAnalog(id)  { return ANALOG_PREFIX_RE.test(id); }
function isTb(id)      { return TB_PREFIX_RE.test(id); }
function isSwitchBot(id) { return SWITCH_BOT_RE.test(id); }

/**
 * Validate whether a new cable from→to is electrically permissible.
 * @param {string} fromTermId
 * @param {string} toTermId
 * @param {Array<{from:string,to:string}>} existingCables
 * @returns {{valid: boolean, reason: string}}
 */
export function validateConnection(fromTermId, toTermId, existingCables) {
  if (!fromTermId || !toTermId) return { valid: false, reason: 'Terminal inválido' };

  // Self-loop
  if (fromTermId === toTermId) return { valid: false, reason: 'Autorrelação proibida' };

  // Switch bottom — cannot be external destination
  if (isSwitchBot(fromTermId) || isSwitchBot(toTermId)) {
    return { valid: false, reason: 'Terminal bot da chave não aceita cabo externo' };
  }

  // Current ↔ Voltage
  if ((isCurrent(fromTermId) && isVoltage(toTermId)) ||
      (isVoltage(fromTermId) && isCurrent(toTermId))) {
    return { valid: false, reason: 'Não pode conectar corrente a tensão' };
  }

  // Analog ↔ Terminal Block
  if ((isAnalog(fromTermId) && isTb(toTermId)) ||
      (isTb(fromTermId) && isAnalog(toTermId))) {
    return { valid: false, reason: 'Analógico não pode ir para borneira' };
  }

  // Duplicate cable check (order-independent)
  const cables = existingCables || [];
  const dup = cables.some(c =>
    (c.from === fromTermId && c.to === toTermId) ||
    (c.from === toTermId   && c.to === fromTermId)
  );
  if (dup) return { valid: false, reason: 'Conexão já existe' };

  return { valid: true, reason: '' };
}

/**
 * Validate that a BO terminal is wired into the Trip Coil (TC) bus.
 * A BO is considered correctly wired if its terminal reaches either
 * TC borne (tb_13_top or tb_14_top) through the electrical graph.
 * @param {string} boTermId - BO terminal id (e.g. "bo1_pos", "bo2_neg")
 * @param {Array<{from:string,to:string}>} cables - Cable list (kept for API symmetry; graph already includes them)
 * @param {{areConnected: Function}} electricalGraph - Resolved Union-Find graph
 * @returns {{valid: boolean, reason: string}}
 */
export function validateBOWiring(boTermId, cables, electricalGraph) {
  if (!boTermId) return { valid: false, reason: 'Terminal BO inválido' };
  if (!electricalGraph) return { valid: false, reason: 'Grafo elétrico indisponível' };
  const reachTC = electricalGraph.areConnected(boTermId, 'tb_13_top')
               || electricalGraph.areConnected(boTermId, 'tb_14_top');
  if (reachTC) return { valid: true, reason: 'BO conectado a TC' };
  return { valid: false, reason: 'BO não conectado a TC' };
}

/**
 * Validate circuit completeness using the electrical graph.
 * @param {Array<{from:string,to:string}>} cables
 * @param {{areConnected: Function}} electricalGraph
 * @returns {Map<string, 'OK'|'WARN'|'FAIL'>}
 */
export function validateCircuit(cables, electricalGraph) {
  const status = new Map();
  const g = electricalGraph;

  // Helper: is any terminal in the set reachable to any in another set?
  const anyConnected = (setA, setB) => {
    if (!g) return false;
    for (const a of setA) {
      for (const b of setB) {
        if (g.areConnected(a, b)) return true;
      }
    }
    return false;
  };

  // Relay current input terminals (top of switch = relay side)
  const relayI_A = ['ia1_top'];
  const relayI_B = ['ib1_top'];
  const relayI_C = ['ic1_top'];
  // Return T terminals (star point)
  const returnT = ['ia2_top', 'ib2_top', 'ic2_top'];
  // Suitcase current outputs
  const suitI1 = ['i1_pos', 'i1_neg'];
  const suitI2 = ['i2_pos', 'i2_neg'];
  const suitI3 = ['i3_pos', 'i3_neg'];
  // Voltage
  const suitV = ['v1_pos','v1_neg','v2_pos','v2_neg','v3_pos','v3_neg'];
  const relayV = ['va_top','vb_top','vc_top'];
  // Binary outputs / inputs for trip coil
  const boPins = ['bo1_pos','bo1_neg','bo2_pos','bo2_neg','bo3_pos','bo3_neg'];
  const biPins = ['bi1_pos','bi1_neg','bi2_pos','bi2_neg','bi3_pos','bi3_neg'];

  // Fase A: suitcase I1 connected to relay IA1 AND has a return path
  const phA_path = anyConnected(suitI1, relayI_A);
  const phA_ret  = anyConnected(suitI1, returnT) || anyConnected(relayI_A, returnT);
  if (phA_path && phA_ret) status.set('Fase A', 'OK');
  else if (phA_path || cables.some(c => c.from?.includes('i1') || c.to?.includes('i1'))) status.set('Fase A', 'WARN');
  else status.set('Fase A', 'FAIL');

  // Fase B
  const phB_path = anyConnected(suitI2, relayI_B);
  const phB_ret  = anyConnected(suitI2, returnT) || anyConnected(relayI_B, returnT);
  if (phB_path && phB_ret) status.set('Fase B', 'OK');
  else if (phB_path || cables.some(c => c.from?.includes('i2') || c.to?.includes('i2'))) status.set('Fase B', 'WARN');
  else status.set('Fase B', 'FAIL');

  // Fase C
  const phC_path = anyConnected(suitI3, relayI_C);
  const phC_ret  = anyConnected(suitI3, returnT) || anyConnected(relayI_C, returnT);
  if (phC_path && phC_ret) status.set('Fase C', 'OK');
  else if (phC_path || cables.some(c => c.from?.includes('i3') || c.to?.includes('i3'))) status.set('Fase C', 'WARN');
  else status.set('Fase C', 'FAIL');

  // Tensão: suitcase voltage connected to relay voltage terminals
  const volt_ok = anyConnected(suitV, relayV);
  const volt_any = cables.some(c =>
    c.from?.startsWith('v') || c.to?.startsWith('v') ||
    c.from?.startsWith('va') || c.to?.startsWith('va')
  );
  if (volt_ok) status.set('Tensão', 'OK');
  else if (volt_any) status.set('Tensão', 'WARN');
  else status.set('Tensão', 'FAIL');

  // Trip Coil: any BO terminal must reach the TC bus (tb_13/tb_14)
  const anyBOWired = boPins.some(bo => validateBOWiring(bo, cables, g).valid);
  const tripAny = cables.some(c =>
    boPins.includes(c.from) || boPins.includes(c.to) ||
    biPins.includes(c.from) || biPins.includes(c.to)
  );
  if (anyBOWired) status.set('Trip Coil', 'OK');
  else if (tripAny) status.set('Trip Coil', 'WARN');
  else status.set('Trip Coil', 'FAIL');

  return status;
}

/** All suitcase/switch terminals with their SVG coordinates, groups, labels, and fill colors. */
export const TERMINALS = [
  // Current outputs (left)
  { id: 'i1_pos', x: 50,  y: 30,  label: 'I1+',   group: 'A',   fill: '#1e88e5' },
  { id: 'i1_neg', x: 70,  y: 30,  label: 'I1-',   group: 'A',   fill: '#1e88e5' },
  { id: 'i2_pos', x: 100, y: 30,  label: 'I2+',   group: 'B',   fill: '#e53935' },
  { id: 'i2_neg', x: 120, y: 30,  label: 'I2-',   group: 'B',   fill: '#e53935' },
  { id: 'i3_pos', x: 150, y: 30,  label: 'I3+',   group: 'C',   fill: '#9e9e9e' },
  { id: 'i3_neg', x: 170, y: 30,  label: 'I3-',   group: 'C',   fill: '#9e9e9e' },
  // Voltage outputs (middle-top)
  { id: 'v1_pos', x: 220, y: 30,  label: 'V1+',   group: 'A',   fill: '#1e88e5' },
  { id: 'v1_neg', x: 240, y: 30,  label: 'V1-',   group: 'A',   fill: '#1e88e5' },
  { id: 'v2_pos', x: 270, y: 30,  label: 'V2+',   group: 'B',   fill: '#e53935' },
  { id: 'v2_neg', x: 290, y: 30,  label: 'V2-',   group: 'B',   fill: '#e53935' },
  { id: 'v3_pos', x: 320, y: 30,  label: 'V3+',   group: 'C',   fill: '#9e9e9e' },
  { id: 'v3_neg', x: 340, y: 30,  label: 'V3-',   group: 'C',   fill: '#9e9e9e' },
  // Binary outputs — BO1..BO4 (purple)
  { id: 'bo1_pos', x: 400, y: 30, label: 'BO1+',  group: 'cmd', fill: '#7C3AED' },
  { id: 'bo1_neg', x: 420, y: 30, label: 'BO1-',  group: 'cmd', fill: '#7C3AED' },
  { id: 'bo2_pos', x: 450, y: 30, label: 'BO2+',  group: 'cmd', fill: '#7C3AED' },
  { id: 'bo2_neg', x: 470, y: 30, label: 'BO2-',  group: 'cmd', fill: '#7C3AED' },
  { id: 'bo3_pos', x: 500, y: 30, label: 'BO3+',  group: 'cmd', fill: '#7C3AED' },
  { id: 'bo3_neg', x: 520, y: 30, label: 'BO3-',  group: 'cmd', fill: '#7C3AED' },
  { id: 'bo4_pos', x: 550, y: 30, label: 'BO4+',  group: 'cmd', fill: '#7C3AED' },
  { id: 'bo4_neg', x: 570, y: 30, label: 'BO4-',  group: 'cmd', fill: '#7C3AED' },
  // Binary inputs — BI1..BI4 (cyan)
  { id: 'bi1_pos', x: 620, y: 30, label: 'BI1+',  group: 'cmd', fill: '#06B6D4' },
  { id: 'bi1_neg', x: 640, y: 30, label: 'BI1-',  group: 'cmd', fill: '#06B6D4' },
  { id: 'bi2_pos', x: 670, y: 30, label: 'BI2+',  group: 'cmd', fill: '#06B6D4' },
  { id: 'bi2_neg', x: 690, y: 30, label: 'BI2-',  group: 'cmd', fill: '#06B6D4' },
  { id: 'bi3_pos', x: 720, y: 30, label: 'BI3+',  group: 'cmd', fill: '#06B6D4' },
  { id: 'bi3_neg', x: 740, y: 30, label: 'BI3-',  group: 'cmd', fill: '#06B6D4' },
  // Switch top (relay current sensors)
  { id: 'ia1_top', x: 50,  y: 450, label: 'IA-S1', group: 'A',  fill: '#1e88e5' },
  { id: 'ia1_bot', x: 70,  y: 470, label: 'IA-S2', group: 'A',  fill: '#1e88e5' },
  { id: 'ib1_top', x: 100, y: 450, label: 'IB-S1', group: 'B',  fill: '#e53935' },
  { id: 'ib1_bot', x: 120, y: 470, label: 'IB-S2', group: 'B',  fill: '#e53935' },
  { id: 'ic1_top', x: 150, y: 450, label: 'IC-S1', group: 'C',  fill: '#9e9e9e' },
  { id: 'ic1_bot', x: 170, y: 470, label: 'IC-S2', group: 'C',  fill: '#9e9e9e' },
];

/** Lookup map from terminal id to {x, y} built from TERMINALS for O(1) access. */
const _termPos = Object.fromEntries(TERMINALS.map(t => [t.id, { x: t.x, y: t.y }]));

export function computeTerminalPosition(terminalId) {
  return _termPos[terminalId] || { x: 100, y: 100 };
}
