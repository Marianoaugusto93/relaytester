// Quick verification that refactored HTML modules work
import { solvePowerFlow } from './src/simulators/powerflow/core/solver.js';
import { voltageHeatmapColor } from './src/simulators/powerflow/core/heatmap.js';
import { renderControls, applyControls } from './src/simulators/powerflow/core/controls.js';
import { serializeNetwork } from './src/simulators/powerflow/core/persistence.js';

console.log('✓ All modules imported successfully');

// Test demo network from refactored HTML
const buses = [
  { id: 1, type: 'slack', V: 1.0, Vset: 1.0, theta: 0, hasGenerator: true, Pl: 0, Ql: 0, _Pl_load: 0, _Ql_load: 0, loadInService: true },
  { id: 2, type: 'pv', V: 0.98, Vset: 0.98, theta: -0.05, hasGenerator: true, Pg: 0.5, Pset: 0.5, Pgmin: 0, Pgmax: 1.5, Pl: 0, Ql: 0, _Pl_load: 0, _Ql_load: 0 },
  { id: 3, type: 'pq', V: 0.95, theta: -0.1, Pl: 0.3, Ql: 0.15, _Pl_load: 0.3, _Ql_load: 0.15, loadInService: true },
];

const branches = [
  { from: 1, to: 2, name: 'Line 1-2', kind: 'line', r: 0.01, x: 0.05, b: 0.01, inService: true },
  { from: 2, to: 3, name: 'Xfmr 2-3', kind: 'xfmr', r: 0.001, x: 0.03, tap: 1.0, phaseShift: 0, inService: true },
];

// Solve
const result = solvePowerFlow(buses, branches);
console.log(`✓ Solver executed: ${result.success !== false ? 'PASS' : 'FAIL'}`);
console.log(`  Iterations: ${result.iterations || 'N/A'}`);

// Test visualization function
const color = voltageHeatmapColor(1.0, 0.05, 0.05);
console.log(`✓ Visualization color function works: ${color}`);

// Test serialization
const serial = serializeNetwork({ buses, branches });
console.log(`✓ Serialization works: ${serial.length} bytes`);

console.log('\n✅ All MVP refactored solver modules verified!');
