/**
 * catalog.js — Metadata for the 8 protection analysis tools in Estudos
 *
 * Each tool is organized by category and includes complexity rating,
 * description, and icon for the Studies Hub.
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
    sprint: 1,
  },
  {
    id: "fault-calc",
    name: "Cálculo de Faltas",
    category: "Sistema",
    complexity: 2,
    icon: "fault",
    description: "Calcular correntes de falta para 10 tipos de falta diferentes",
    available: true,
    sprint: 1,
  },
  {
    id: "tcc",
    name: "Curvas TCC",
    category: "Coordenação",
    complexity: 3,
    icon: "tcc",
    description: "Tabelas de tempo-corrente IEC, IEEE, ANSI",
    available: true,
    sprint: 2,
  },
  {
    id: "distribution",
    name: "Distribuição",
    category: "Coordenação",
    complexity: 2,
    icon: "dist",
    description: "Queda de tensão, dimensionamento de cabos, confiabilidade",
    available: true,
    sprint: 2,
  },
  {
    id: "distance",
    name: "Distância (21)",
    category: "Proteção",
    complexity: 3,
    icon: "dist21",
    description: "Impedância de linha, zonas Mho/Quadrilateral",
    available: true,
    sprint: 3,
  },
  {
    id: "differential-inrush",
    name: "Diferencial (87) + Inrush",
    category: "Proteção",
    complexity: 2,
    icon: "diff",
    description: "Proteção diferencial com bloqueio de inrush por 2º harmônico",
    available: true,
    sprint: 3,
  },
  {
    id: "ampacity-ct",
    name: "Ampacidade + Saturação TC",
    category: "Componentes",
    complexity: 2,
    icon: "cable",
    description: "Ampacidade de cabos com derating + análise de saturação de TC",
    available: true,
    sprint: 4,
  },
  {
    id: "power-flow",
    name: "Fluxo de Potência NR",
    category: "Sistema",
    complexity: 2,
    icon: "power",
    description: "Simulador Newton-Raphson AC — sistema 8-barras interativo",
    available: true,
    sprint: 1,
  },
  {
    id: "scenario-builder",
    name: "Editor Visual de Cenários",
    category: "Cenários",
    complexity: 2,
    icon: "edit",
    description: "Criar e validar cenários de falta com diagrama fasorial interativo",
    available: true,
    sprint: 10,
  },
  {
    id: "graph-viz",
    name: "Visualização R-X & TCC",
    category: "Coordenação",
    complexity: 3,
    icon: "chart",
    description: "Plano R-X com zonas Mho/Quad e curvas TCC com detecção de coordenação",
    available: true,
    sprint: 10,
  },
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
 * Get tools for a specific sprint.
 * @param {number} sprintNum
 * @returns {Array}
 */
export function toolsForSprint(sprintNum) {
  return TOOLS.filter(t => t.sprint === sprintNum);
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
