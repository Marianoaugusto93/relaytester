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
];

/**
 * Master ANSI function code list for the Left Rail tag cloud.
 * Keep in sync with tool ansi entries.
 */
export const ANSI_CODES = [
  "21", "27", "32", "46", "47",
  "50", "50N", "51", "51N",
  "59", "67", "67N", "81", "87",
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
