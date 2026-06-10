/**
 * catalog.js — Metadata for the protection analysis tools in Estudos (v2 schema)
 *
 * Each tool includes enriched discovery metadata:
 *  - ansi: array of ANSI/IEEE device function codes
 *  - workflow: high-level workflow phases (sistema, componentes, protecao, coordenacao, cenarios)
 *  - domain: domain area tags (e.g. faltas, distancia, diferencial)
 *  - needsBay: whether the tool requires bay context (Vn, TC/TP)
 *  - inputs / outputs: artifact shapes expected/produced
 *  - publishesTopics / subscribesTopics: ArtifactBus topic names
 *  - keywords: free-form search hints
 *  - status: "stable" | "beta" | "planned"
 */

export const TOOLS = [
  {
    id: "symm-components",
    name: "Componentes Simétricos",
    category: "Sistema",
    complexity: 1,
    icon: "symm",
    description: "Transformar correntes trifásicas em componentes de sequência (I0, I1, I2)",
    available: true,
    status: "stable",
    ansi: [],
    workflow: ["sistema"],
    domain: ["sequencia", "fasores"],
    needsBay: false,
    inputs: ["phasors3ph"],
    outputs: ["sequenceComponents"],
    publishesTopics: ["symm.sequence"],
    subscribesTopics: [],
    keywords: ["fortescue", "i0", "i1", "i2", "sequence", "sequencia", "simetricas", "symmetric"],
  },
  {
    id: "fault-calc",
    name: "Cálculo de Faltas",
    category: "Sistema",
    complexity: 2,
    icon: "fault",
    description: "Calcular correntes de falta para 10 tipos de falta diferentes",
    available: true,
    status: "stable",
    ansi: [],
    workflow: ["sistema", "protecao"],
    domain: ["faltas", "curto-circuito"],
    needsBay: true,
    inputs: ["systemImpedance"],
    outputs: ["faultCurrents"],
    publishesTopics: ["fault.currents"],
    subscribesTopics: [],
    keywords: ["falta", "fault", "curto", "short", "circuito", "lg", "ll", "lll", "lll-g"],
  },
  {
    id: "tcc",
    name: "Curvas TCC",
    category: "Coordenação",
    complexity: 3,
    icon: "tcc",
    description: "Tabelas de tempo-corrente IEC, IEEE, ANSI",
    available: true,
    status: "stable",
    ansi: ["51", "50", "51N", "50N"],
    workflow: ["coordenacao", "protecao"],
    domain: ["sobrecorrente", "curvas"],
    needsBay: true,
    inputs: ["protectionSettings"],
    outputs: ["tccCurve"],
    publishesTopics: ["tcc.curve"],
    subscribesTopics: ["fault.currents"],
    keywords: ["tcc", "curve", "curva", "tempo", "corrente", "iec", "ieee", "ansi", "definite", "overcurrent", "sobrecorrente", "51", "50"],
  },
  {
    id: "distribution",
    name: "Distribuição",
    category: "Coordenação",
    complexity: 2,
    icon: "dist",
    description: "Queda de tensão, dimensionamento de cabos, confiabilidade",
    available: true,
    status: "stable",
    ansi: [],
    workflow: ["coordenacao", "componentes"],
    domain: ["distribuicao", "cabos", "confiabilidade"],
    needsBay: true,
    inputs: ["systemLoad"],
    outputs: ["voltageDrop", "cableSize"],
    publishesTopics: ["dist.voltageDrop"],
    subscribesTopics: [],
    keywords: ["distribuicao", "distribution", "queda", "tensao", "voltage", "drop", "cabo", "cable", "sizing", "dimensionamento", "confiabilidade", "saidi", "saifi"],
  },
  {
    id: "distance",
    name: "Distância (21)",
    category: "Proteção",
    complexity: 3,
    icon: "dist21",
    description: "Impedância de linha, zonas Mho/Quadrilateral",
    available: true,
    status: "stable",
    ansi: ["21", "21N"],
    workflow: ["protecao"],
    domain: ["distancia", "impedancia"],
    needsBay: true,
    inputs: ["lineImpedance"],
    outputs: ["zones", "rxLocus"],
    publishesTopics: ["distance.zones"],
    subscribesTopics: ["fault.currents"],
    keywords: ["distancia", "distance", "21", "mho", "quad", "quadrilateral", "impedancia", "impedance", "linha", "line", "zone", "zona"],
  },
  {
    id: "differential-inrush",
    name: "Diferencial (87) + Inrush",
    category: "Proteção",
    complexity: 2,
    icon: "diff",
    description: "Proteção diferencial com bloqueio de inrush por 2º harmônico",
    available: true,
    status: "stable",
    ansi: ["87", "87T", "87L"],
    workflow: ["protecao"],
    domain: ["diferencial", "inrush", "transformador"],
    needsBay: true,
    inputs: ["ctMeasurements"],
    outputs: ["differentialOperating"],
    publishesTopics: ["differential.operating"],
    subscribesTopics: [],
    keywords: ["diferencial", "differential", "87", "inrush", "harmonic", "harmonico", "transformador", "transformer", "magnetizacao"],
  },
  {
    id: "ampacity-ct",
    name: "Ampacidade + Saturação TC",
    category: "Componentes",
    complexity: 2,
    icon: "cable",
    description: "Ampacidade de cabos com derating + análise de saturação de TC",
    available: true,
    status: "stable",
    ansi: [],
    workflow: ["componentes"],
    domain: ["cabos", "tc", "saturacao"],
    needsBay: true,
    inputs: ["cableSpec", "ctSpec"],
    outputs: ["ampacity", "ctSaturation"],
    publishesTopics: ["component.ampacity", "component.ctSaturation"],
    subscribesTopics: ["fault.currents"],
    keywords: ["ampacidade", "ampacity", "cabo", "cable", "tc", "ct", "saturacao", "saturation", "derating", "ieee", "c57"],
  },
  {
    id: "scenario-builder",
    name: "Editor Visual de Cenários",
    category: "Cenários",
    complexity: 2,
    icon: "edit",
    description: "Criar e validar cenários de falta com diagrama fasorial interativo",
    available: true,
    status: "stable",
    ansi: [],
    workflow: ["cenarios"],
    domain: ["cenarios", "fasores", "validacao"],
    needsBay: false,
    inputs: ["faultDef"],
    outputs: ["scenarioJson"],
    publishesTopics: ["scenario.json"],
    subscribesTopics: [],
    keywords: ["cenario", "scenario", "editor", "visual", "builder", "fasor", "phasor", "falta", "fault", "validacao"],
  },
  {
    id: "graph-viz",
    name: "Visualização R-X & TCC",
    category: "Coordenação",
    complexity: 3,
    icon: "chart",
    description: "Plano R-X com zonas Mho/Quad e curvas TCC com detecção de coordenação",
    available: true,
    status: "stable",
    ansi: ["21", "51", "50"],
    workflow: ["coordenacao", "protecao"],
    domain: ["coordenacao", "visualizacao", "distancia", "sobrecorrente"],
    needsBay: true,
    inputs: ["zones", "tccCurve"],
    outputs: ["coordinationReport"],
    publishesTopics: ["graph.coordination"],
    subscribesTopics: ["distance.zones", "tcc.curve"],
    keywords: ["rx", "r-x", "tcc", "grafico", "graph", "plot", "visualizacao", "coordenacao", "coordination", "mho", "quad"],
  },
  {
    id: "coordination-tcc",
    name: "Coordenação TCC (50/51)",
    category: "Proteção",
    complexity: 2,
    icon: "tcc",
    description: "Análise de coordenação entre funções 50/51 primária e backup. Verifica CTI, sugere ajustes.",
    available: true,
    status: "stable",
    ansi: ["50", "51"],
    workflow: ["coordenacao"],
    domain: ["curves", "tempo"],
    needsBay: false,
    inputs: ["Iprim1", "TD1", "curve1", "Iprim2", "TD2", "curve2", "CTI", "Imin", "Imax"],
    outputs: ["coordTable", "tccOverlay", "gaps"],
    publishesTopics: ["coordination-tcc.result"],
    subscribesTopics: [],
    keywords: ["selectivity", "seletividade", "coordenacao", "coordination", "50", "51", "gap", "CTI", "tcc"],
    sprint: 0,
  },
  {
    id: "tc-sizing",
    name: "TC Sizing / ANSI Class",
    category: "Componentes",
    complexity: 2,
    icon: "cable",
    description: "Dimensionamento de TC contra saturação. V_knee, margem de saturação, recomendação de classe.",
    available: true,
    status: "stable",
    ansi: [],
    workflow: ["componentes"],
    domain: ["hardware"],
    needsBay: false,
    inputs: ["Ifault", "CTratio", "burden", "XR", "ANSIclass"],
    outputs: ["Vsecondary", "Vknee", "margin", "status"],
    publishesTopics: ["tc-sizing.result"],
    subscribesTopics: [],
    keywords: ["tc", "ct", "saturacao", "saturation", "ansi", "knee", "c100", "c200", "c400", "c800", "sizing", "dimensionamento", "burden"],
    sprint: 0,
  },
  {
    id: "reach-loadability",
    name: "Reach 21 / Loadability",
    category: "Proteção",
    complexity: 2,
    icon: "dist21",
    description: "Zonas 1/2/3 no plano R-X com círculo de loadability. Margem de encroachment.",
    available: true,
    status: "stable",
    ansi: ["21"],
    workflow: ["protecao"],
    domain: ["impedance"],
    needsBay: false,
    inputs: ["Zline", "Zsource", "CTratio", "PTratio", "loadAngle", "Zload"],
    outputs: ["zones", "loadability", "encroachment"],
    publishesTopics: ["reach-loadability.result"],
    subscribesTopics: [],
    keywords: ["reach", "loadability", "21", "distance", "distancia", "encroachment", "mho", "zone", "zona", "load", "carga"],
    sprint: 0,
  },
  {
    id: "differential-transformer",
    name: "Trafo Diferencial 87T",
    category: "Proteção",
    complexity: 3,
    icon: "diff",
    description: "Diferencial 87T com vector group (Yd1/Dy1/Yd11...), tap LTC e slopes ANSI 5/10/15/25%.",
    available: true,
    status: "beta",
    ansi: ["87T"],
    workflow: ["protecao"],
    domain: ["hardware"],
    needsBay: false,
    inputs: ["Iprimary", "Isecondary", "vectorGroup", "tap", "slope"],
    outputs: ["Idiff", "Irestrain", "region", "tripped"],
    publishesTopics: ["differential-transformer.result"],
    subscribesTopics: [],
    keywords: ["differential", "diferencial", "87", "87t", "trafo", "transformer", "vector", "vetor", "yd1", "dy1", "slope", "tap"],
    sprint: 0,
  },
  {
    id: "inrush-discrimination",
    name: "Inrush Discrimination 2nd/5th",
    category: "Proteção",
    complexity: 2,
    icon: "diff",
    description: "Detecção de inrush por harmônicos 2º/5º com espectro, timeline de bloqueio e classificação.",
    available: true,
    status: "stable",
    ansi: ["87"],
    workflow: ["protecao"],
    domain: ["harmonics"],
    needsBay: false,
    inputs: ["waveform", "thresholdH2", "thresholdH5", "blocking"],
    outputs: ["spectrum", "classification", "blockWindow"],
    publishesTopics: ["inrush-discrimination.result"],
    subscribesTopics: [],
    keywords: ["inrush", "harmonic", "harmonico", "2nd", "5th", "blocking", "bloqueio", "energizacao", "transformer", "spectrum", "espectro"],
    sprint: 0,
  },
  {
    id: "directional-logic",
    name: "Polarização Direcional 32/67",
    category: "Proteção",
    complexity: 2,
    icon: "dist21",
    description: "Avalia elemento direcional via torque V·I·cos(θ−MTA). Plano complexo com quadrante Forward/Reverse/Dead-zone.",
    available: true,
    status: "stable",
    ansi: ["32", "67", "67N"],
    workflow: ["protecao"],
    domain: ["direcional", "polarizacao", "fasores"],
    needsBay: false,
    inputs: ["Vmag", "Vang", "Imag", "Iang", "mtaAngle", "polarity"],
    outputs: ["torque", "quadrant", "forward", "phasor"],
    publishesTopics: ["directional-logic.result"],
    subscribesTopics: [],
    keywords: ["direcional", "directional", "67", "67n", "32", "torque", "mta", "polarizacao", "polarization", "forward", "reverse", "dead-zone", "quadrant", "quadrante"],
    sprint: 2,
  },
  {
    id: "under-frequency",
    name: "Subfrequência 81U/81O + df/dt",
    category: "Proteção",
    complexity: 2,
    icon: "chart",
    description: "Simula trajetória de frequência com pickup 81U/81O, dead-band e detecção de variação rápida df/dt.",
    available: true,
    status: "stable",
    ansi: ["81"],
    workflow: ["protecao"],
    domain: ["frequencia", "81u", "81o", "dfdt"],
    needsBay: false,
    inputs: ["f0", "pickup81u", "pickup81o", "deadBand", "delayUn", "delayOv"],
    outputs: ["status", "pickup", "stage", "delay", "timeToTrip"],
    publishesTopics: ["under-frequency.result"],
    subscribesTopics: [],
    keywords: ["frequencia", "frequency", "81", "81u", "81o", "dfdt", "df/dt", "subfrequencia", "underfrequency", "overfrequency", "pickup", "dead-band", "load shedding"],
    sprint: 2,
  },
  {
    id: "reclosing-sequence",
    name: "Religamento (79)",
    category: "Proteção",
    complexity: 2,
    icon: "edit",
    description: "Simula sequência de religamento automático (F-F-C-T) contra faltas permanentes e transitórias. Timeline + lockout.",
    available: true,
    status: "stable",
    ansi: ["79"],
    workflow: ["protecao", "coordenacao"],
    domain: ["religamento", "reclose", "sequencia"],
    needsBay: false,
    inputs: ["pattern", "deadTimeMs", "resetTimeS", "scenarioId"],
    outputs: ["steps", "outcome", "successPct", "tLockout"],
    publishesTopics: ["reclosing-sequence.result"],
    subscribesTopics: [],
    keywords: ["79", "religamento", "reclosing", "reclose", "autorecloser", "lockout", "dead time", "fast reclose", "sequencia", "permanent", "transient", "transitoria", "permanente"],
    sprint: 2,
  },
  {
    id: "arc-flash",
    name: "Arc-Flash IEEE 1584-2018",
    category: "Segurança",
    complexity: 3,
    icon: "fault",
    description: "Energia incidente, categoria PPE e limite arc-flash por IEEE 1584-2018. Tabela comparativa por clearing time.",
    available: true,
    status: "stable",
    ansi: [],
    workflow: ["componentes", "protecao"],
    domain: ["arco", "seguranca", "ppe", "ieee1584"],
    needsBay: false,
    inputs: ["Ibf_kA", "gap_mm", "workingDist_cm", "systemV_kV", "electrodeConfig", "t_clear_s"],
    outputs: ["Iarc_kA", "energy", "category", "label", "boundary"],
    publishesTopics: ["arc-flash.result"],
    subscribesTopics: [],
    keywords: ["arc", "arco", "arco-flash", "arc-flash", "ieee 1584", "ppe", "energia incidente", "incident energy", "categoria", "category", "boundary", "nfpa 70e", "clearing time", "seguranca", "safety"],
    sprint: 2,
  },
  {
    id: "grounding-impedance",
    name: "Aterramento / Zn",
    category: "Segurança",
    complexity: 2,
    icon: "dist21",
    description: "Corrente de falta terra para aterramento sólido, resistivo, reativo e ressonante (Petersen). Recomenda pickup 50N.",
    available: true,
    status: "stable",
    ansi: ["50N", "51N", "67N"],
    workflow: ["sistema", "protecao"],
    domain: ["aterramento", "neutro", "terra", "50n"],
    needsBay: false,
    inputs: ["groundingType", "ZnValue", "Z0_R", "Z0_X", "Vph", "CTratio"],
    outputs: ["Iground", "Zn_mag", "recommended50N", "flag"],
    publishesTopics: ["grounding-impedance.result"],
    subscribesTopics: [],
    keywords: ["aterramento", "grounding", "neutro", "neutral", "zn", "impedancia", "impedance", "terra", "ground", "50n", "51n", "petersen", "ressonante", "resonant", "resistivo", "resistive", "solido", "solid"],
    sprint: 2,
  },
];

/**
 * Ordered list of workflow phases used by the Left Rail (fluxo).
 * Hardcoded order — do NOT sort alphabetically.
 */
export const WORKFLOW_ORDER = [
  { id: "sistema", label: "Sistema", category: "Sistema" },
  { id: "componentes", label: "Componentes", category: "Componentes" },
  { id: "protecao", label: "Proteção", category: "Proteção" },
  { id: "coordenacao", label: "Coordenação", category: "Coordenação" },
  { id: "cenarios", label: "Cenários", category: "Cenários" },
  { id: "seguranca", label: "Segurança", category: "Segurança" },
];

/**
 * Master ANSI function code list for the Left Rail tag cloud.
 * Keep in sync with tool ansi entries.
 */
export const ANSI_CODES = [
  "21", "27", "32", "46", "47",
  "50", "50N", "51", "51N",
  "59", "67", "67N", "79", "81", "87",
];

/**
 * Get tool by id.
 * @param {string} id
 * @returns {Object | null}
 */
export function getTool(id) {
  return TOOLS.find(t => t.id === id) || null;
}

/**
 * Get all available tools (ready to use).
 * @returns {Array}
 */
export function getAvailableTools() {
  return TOOLS.filter(t => t.available);
}

/**
 * Group tools by category.
 * @returns {Object} { "Sistema": [...], "Coordenação": [...], ... }
 */
export function toolsByCategory() {
  const grouped = {};
  TOOLS.forEach(tool => {
    if (!grouped[tool.category]) grouped[tool.category] = [];
    grouped[tool.category].push(tool);
  });
  return grouped;
}

/**
 * Get tools matching a workflow phase id (e.g. "protecao").
 * @param {string} workflowId
 * @returns {Array}
 */
export function toolsForWorkflow(workflowId) {
  return TOOLS.filter(t => Array.isArray(t.workflow) && t.workflow.includes(workflowId));
}

/**
 * Get tools matching an ANSI function code (e.g. "51").
 * @param {string} ansiCode
 * @returns {Array}
 */
export function toolsForAnsi(ansiCode) {
  return TOOLS.filter(t => Array.isArray(t.ansi) && t.ansi.includes(ansiCode));
}

/**
 * Get icon component reference for a tool icon name.
 * Icons are defined in icons.jsx and imported as SVG components.
 * This function returns the icon id to be used by <IconComponent icon={...} />
 *
 * @param {string} iconId
 * @returns {string}
 */
export function getIconForTool(iconId) {
  return iconId;
}
