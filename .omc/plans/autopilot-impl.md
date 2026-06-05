# Phase 2 Execution Plan: MVP Refactored Newton-Raphson Solver

## Architecture Overview

The refactored solver HTML will be organized in three sections:

1. **Imports Section** (Fixed paths to modules)
   - solver.js: solvePowerFlow, buildYbus, solveLinear
   - controls.js: renderControls, applyControls
   - persistence.js: serializeNetwork, deserializeNetwork
   - visualization: voltageHeatmapColor, angleHeatmapColor
   
2. **HTML Structure** (3-column layout)
   - Left: SVG diagram (power flow visualization)
   - Right: 2 panels
     - Top: Controls (generators, load scale, buttons)
     - Bottom: Result tables (buses, branches, generators)

3. **JavaScript Logic** (~250 lines)
   - Demo network initialization
   - SVG diagram rendering function
   - Table population functions
   - Event listener wiring
   - Bridge communication handlers

## Implementation Tasks

### Task 1: Fix Module Import Paths (CRITICAL)
**Priority**: P0 (Blocks everything)
**File**: `public/newton-rapson/powerflow-refactored.html`
**Current Issue**: Relative paths `../../src/` don't resolve in public directory
**Solution**: Change to absolute paths `/src/simulators/...`
**Status**: ✅ Already fixed in earlier edit
**Verification**: Console should show no module import errors

### Task 2: Implement SVG Diagram Rendering
**Priority**: P0
**Code Location**: `renderDiagram()` function in HTML
**What to implement**:
- Parse buses array, calculate x/y positions (circle or horizontal layout)
- Draw circles (radius 20px) for each bus
- Color circles using voltageHeatmapColor(bus.V)
- Draw lines between buses for each branch
- Add text labels (bus ID, V, θ)
- Add branch labels (name, S values)
- Draw arrows on branches to show power flow direction
**Estimated Lines**: ~150 lines
**Dependencies**: voltageHeatmapColor, angleHeatmapColor from modules

### Task 3: Implement Interactive Controls
**Priority**: P1
**Code Location**: Controls panel HTML + event listeners
**What to implement**:
- Generate sliders for each generator (Pg setpoint)
- Generate slider for load scale
- Wire onChange events
- On slider change:
  - Call applyControls() to update model
  - Call solvePowerFlow() to re-solve
  - Call renderDiagram() to update display
  - Update result tables
**Estimated Lines**: ~80 lines
**Dependencies**: renderControls, applyControls from modules

### Task 4: Implement Result Tables
**Priority**: P1
**Code Location**: Tables section in HTML + population functions
**What to implement**:
- Bus measurements table function:
  - Iterate buses array
  - Display ID, type, V (pu), θ (deg), P (MW), Q (Mvar)
- Branch flows table function:
  - Calculate S_from and S_to for each branch
  - Display losses as percentage
  - Format numbers with 4 decimal places
- Generator table function:
  - Show Pset, Qgen, Qlim for each generator
**Estimated Lines**: ~100 lines
**Dependencies**: formatAmps, formatNumber utilities

### Task 5: Implement Bridge Communication
**Priority**: P0
**Code Location**: Bridge server message handler
**What to implement**:
- postMessage listener for solve/serialize/deserialize
- Error handling with try-catch
- Status display on message completion
- Handle timeouts (10 second max)
**Estimated Lines**: ~40 lines
**Dependencies**: Built into HTML already (lines 184-211)

### Task 6: Add Event Handlers
**Priority**: P1
**Code Location**: wireEventListeners() function
**What to implement**:
- [Solve] button → manual solve
- [Reset] button → reload demo network
- [Export] button → download JSON
- Slider changes → auto-solve
- Status display update
**Estimated Lines**: ~60 lines
**Dependencies**: All above functions

### Task 7: Testing & QA
**Priority**: P2
**Manual Tests**:
1. Load page → check for console errors
2. Click [Solve] → diagram should update
3. Move sliders → diagram should react
4. Verify tables populate with correct values
5. Compare values with legacy solver (±5% tolerance)
6. Test [Reset] button
7. Test [Export] button

## Implementation Sequence

**Phase 2 Execution (Parallel Work)**:
- **Worker 1**: Tasks 1-2 (Module paths + Diagram rendering)
- **Worker 2**: Tasks 3-4 (Controls + Result tables)
- **Worker 3**: Tasks 5-6 (Bridge + Event handlers)

**After Phase 2**:
- **Phase 3 QA**: Verify all tests pass, no console errors
- **Phase 4 Validation**: Code review, feature completeness check

## File Dependencies

```
powerflow-refactored.html
├── /src/simulators/powerflow/core/solver.js
├── /src/simulators/powerflow/core/controls.js
├── /src/simulators/powerflow/core/diagnostics.js
├── /src/simulators/powerflow/core/persistence.js
├── /src/simulators/powerflow/core/heatmap.js
└── Bridge server (inline in HTML)
```

## Success Metrics

- ✅ All 6 tasks completed
- ✅ No console errors (F12 DevTools)
- ✅ Diagram renders with real network data
- ✅ Controls are responsive
- ✅ Tables populate correctly
- ✅ Bridge communication works
- ✅ npm run build succeeds
- ✅ Toggle comparison works (OLD vs NEW)

## Risk Assessment

| Risk | Mitigation | Status |
|------|-----------|--------|
| Module imports fail | Already fixed, verify console | ✅ Addressed |
| SVG rendering is complex | Use simple circle layout first | 🟡 TBD |
| Controls don't bind correctly | Test with demo network first | 🟡 TBD |
| Bridge timeout issues | Add 10s timeout handler | 🟡 TBD |
| Performance regression | Monitor bundle size increase | 🟡 TBD |

---

**Plan Status**: Ready for Phase 2 Execution
**Estimated Duration**: 2-3 hours execution + 1 hour QA
