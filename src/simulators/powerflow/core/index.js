/**
 * Power Flow Solver Library Export
 *
 * Unified interface for Newton-Raphson solver integration:
 * - Direct JS imports for testing and React integration
 * - postMessage bridge for iframe isolation (Phase 4)
 */

// Phase 2: Solver core
export { buildYbus, solveLinear, solvePowerFlow } from './solver.js';

// Phase 3: Persistence and visualization
export {
  serializeNetwork,
  deserializeNetwork,
  validateRoundTrip,
} from './persistence.js';

export {
  voltageHeatmapColor,
  angleHeatmapColor,
  formatAmps,
} from './heatmap.js';

export {
  bboxForText,
  bboxOverlap,
  bboxCollisionCount,
  pickBestPosition,
  getLabelOffset,
  setLabelOffset,
  clearAllLabelOffsets,
} from './labels.js';

// Phase 4: postMessage bridge
export {
  createMessage,
  createResult,
  createError,
  SolverBridgeClient,
  SolverBridgeServer,
} from './bridge.js';
