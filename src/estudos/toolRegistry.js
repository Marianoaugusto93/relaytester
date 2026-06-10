/**
 * toolRegistry.js — Lazy-loaded tool component map
 *
 * Maps each catalog tool id to a React.lazy() wrapper around its component module.
 * Consumers (EstudosPage) wrap the rendered component in <Suspense>.
 *
 * Adding a new tool:
 *  1. Add a metadata entry in catalog.js
 *  2. Add a TOOL_REGISTRY entry below pointing to its module
 *  3. (Optional) export a label override for the breadcrumb
 */

import { lazy } from "react";

// Lazy imports — each module is fetched on demand the first time the tool is opened.
const SymmetricalComponentsTool = lazy(() => import("./tools/SymmetricalComponentsTool.jsx"));
const FaultStudyTool = lazy(() => import("./tools/FaultStudyTool.jsx"));
const TccTool = lazy(() => import("./tools/TccTool.jsx"));
const DistributionTool = lazy(() => import("./tools/DistributionTool.jsx"));
const DistanceTool = lazy(() => import("./tools/DistanceTool.jsx"));
const DifferentialInrushTool = lazy(() => import("./tools/DifferentialInrushTool.jsx"));
const AmpacityCTSaturationTool = lazy(() => import("./tools/AmpacityCTSaturationTool.jsx"));
const VisualScenarioBuilder = lazy(() => import("./components/VisualScenarioBuilder.jsx"));
const GraphVizContainer = lazy(() => import("./components/GraphVizContainer.jsx"));

/**
 * @typedef {Object} ToolRegistryEntry
 * @property {React.LazyExoticComponent} component - Lazy React component
 * @property {string} label - Short display label (matches catalog name by default)
 */

/** @type {Object.<string, ToolRegistryEntry>} */
export const TOOL_REGISTRY = {
  "symm-components": {
    component: SymmetricalComponentsTool,
    label: "Componentes Simétricos",
  },
  "fault-calc": {
    component: FaultStudyTool,
    label: "Cálculo de Faltas",
  },
  "tcc": {
    component: TccTool,
    label: "Curvas TCC",
  },
  "distribution": {
    component: DistributionTool,
    label: "Distribuição",
  },
  "distance": {
    component: DistanceTool,
    label: "Distância (21)",
  },
  "differential-inrush": {
    component: DifferentialInrushTool,
    label: "Diferencial (87) + Inrush",
  },
  "ampacity-ct": {
    component: AmpacityCTSaturationTool,
    label: "Ampacidade + Saturação TC",
  },
  "scenario-builder": {
    component: VisualScenarioBuilder,
    label: "Editor Visual de Cenários",
  },
  "graph-viz": {
    component: GraphVizContainer,
    label: "Visualização R-X & TCC",
  },
};

/**
 * Resolve a tool id to its lazy component, or null if unknown.
 * @param {string} id
 * @returns {React.LazyExoticComponent | null}
 */
export function getToolComponent(id) {
  return TOOL_REGISTRY[id]?.component || null;
}
