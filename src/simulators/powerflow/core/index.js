/**
 * Power Flow Solver Library Export
 *
 * Unified interface for Newton-Raphson solver integration:
 * - Direct JS imports for testing and React integration
 * - postMessage bridge for iframe isolation (Phase 4)
 */

export { buildYbus, solveLinear, solvePowerFlow } from './solver.js';
