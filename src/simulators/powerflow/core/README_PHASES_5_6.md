# Phase 5 & 6: Controls + Diagnostics & Cutover

## Phase 5: Extract Controls + Diagnostics (12 hours, PENDING)

### Modules to Extract:
1. **controls.js** - UI control functions
   - `applyControls()` - Process control inputs (sliders, switches)
   - `renderControls()` - Generate control UI
   - `onCellEdit()` - Handle table cell edits

2. **diagnostics.js** - Convergence diagnostics
   - `findDataIssues()` - Pre-solve validation
   - `runConvergenceDiagnostics()` - Post-solve analysis
   - `tracePvCurve()` - Stability analysis

3. **validator.js** - Input validation
   - Network topology checks
   - Parameter range validation
   - Generator limit enforcement

### Test Coverage:
- Unit tests for each function
- Integration tests with sample networks
- Regression tests against Phase 3 fixtures

### API Surface:
```javascript
import {
  applyControls,
  renderControls,
  findDataIssues,
  runConvergenceDiagnostics,
  tracePvCurve,
} from './controls.js';
```

---

## Phase 6: Cutover + Cleanup (8 hours, PENDING)

### Goals:
1. **Reduce powerflow.html to minimal shell** (<200 lines)
   - Keep only iframe bootstrap and legacy solver
   - Remove all UI rendering (now in React)
   - Remove all solver code (now in library)

2. **Verify all 7 relay scenarios pass**
   - 3-Phase Fault: trip within ±10%
   - L-G Fault: trip within ±10%
   - L-L Fault: trip within ±10%
   - Inrush: trip within ±10%
   - Undervolt: trip within ±10%
   - Underfreq: trip within ±10%
   - Directional: trip within ±10%

3. **Final validation**
   - No regression in relay test suite
   - All parity tests pass (Phase 2)
   - All visualization tests pass (Phase 3)
   - All integration tests pass (Phase 4)
   - Bundle size < 350 kB gzip

### Cutover Checklist:
- [ ] NR OLD button wired to legacy solver
- [ ] NR NEW button wired to refactored solver
- [ ] Toggle functional in SimuladorNRPage.jsx
- [ ] All 7 relay scenarios tested
- [ ] Production build passes
- [ ] Deploy to Cloudflare

### Rollback Plan:
If refactored solver shows >1e-9 drift on any relay scenario:
1. Disable NR NEW button
2. Force NR OLD as default
3. File bug with detailed deviation trace
4. Schedule Phase 5 debug pass

---

## Current Status (after Phase 4)

### Completed:
✅ Phase 0: Tooling (Vitest, CI workflow, docs)
✅ Phase 1: Safety Net (13 parity test cases, 6 JSON fixtures)
✅ Phase 2: Solver Core (solver.js, 8 tests passing)
✅ Phase 3: Persistence + Visualization (heatmap, persistence, labels, 23 tests passing)
✅ Phase 4: Bridge + React Integration (postMessage protocol, embedded component)

### Remaining:
⏳ Phase 5: Controls + Diagnostics (extraction, tests)
⏳ Phase 6: Cutover + Cleanup (finalization, deployment)

### Test Summary:
- Phase 2 Parity Tests: 8 passing, 5 skipped
- Phase 3 Visualization Tests: 23 passing
- Phase 4 Bridge Tests: Ready for implementation
- Total: 31+ passing tests
- Parity gate active: drift ≤ 1e-9 p.u.

---

## Integration Points

### React App → Newton-Raphson
1. SimuladorNRPage.jsx imports PowerFlowEmbedded
2. Props: network state, solver version (old/new)
3. Callbacks: onSolveComplete, onError
4. UI: NR OLD vs NR NEW toggle

### Relay Scenarios
All 7 scenarios available in both old and new solvers:
- Same phasor injection points
- Same protection function evaluation
- Same trip time criteria
- Same COMTRADE export

### Performance Target
- Old solver: baseline (reference)
- New solver: ≤5% slower (acceptable for Phase 4)
- Target for Phase 5: parity performance

---

## Notes for Next Phase

- Fixtures for Q-limit and Zgen-phantom need refinement (low priority)
- Bridge server implementation in HTML is Phase 4.5 (requires postMessage listeners in powerflow.html)
- React component PowerFlowEmbedded.jsx needs testing with real iframe
- Phase 5 can start in parallel if Phase 4 bridge completes
