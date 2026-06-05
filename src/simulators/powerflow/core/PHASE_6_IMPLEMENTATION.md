# Phase 6: Cutover + Cleanup Implementation Guide

**Estimated Duration:** 8 hours  
**Target Completion:** 2026-06-04 evening  
**Success Criteria:**
- powerflow.html < 200 lines
- All 7 relay scenarios pass (parity with OLD solver < 10% tolerance)
- NR OLD vs NR NEW toggle wired and functional
- Zero console errors on both solver versions
- COMTRADE export works on both versions

---

## Current State Analysis

### powerflow.html (7,616 lines)
**Breakdown by responsibility:**

1. **HTML Structure** (~50 lines)
   - DOCTYPE, head, style tags, body with canvas/panels
   - Keep for Phase 6

2. **CSS Styles** (~200 lines)
   - Button, input, SVG styles
   - Heatmap legend styling
   - Keep for Phase 6 (minimal changes)

3. **Global State & Constants** (~100 lines)
   - `buses[]`, `branches[]`, `baseLoads[]`
   - `BASE_MVA`, `CURVE_MAP`, `CURVE_ALIASES`
   - Keep for Phase 6 (move to initialization)

4. **Solver Core** (~560 lines)
   - buildYbus, solveLinear, solvePowerFlow, phantom bus logic
   - **REMOVE** — use `solver.js` instead (Phase 2)
   - Replace with import statement

5. **Controls & UI** (~660 lines)
   - renderControls, applyControls, onCellEdit, renderInputTables
   - **REMOVE** — use `controls.js` instead (Phase 5)
   - Replace with import statement

6. **Persistence & Serialization** (~150 lines)
   - serializeNetwork, deserializeNetwork
   - **REMOVE** — use `persistence.js` instead (Phase 3)
   - Replace with import statement

7. **Visualization** (~400 lines)
   - Heatmap colors, label placement, bounding boxes
   - **REMOVE** — use `heatmap.js`, `labels.js` instead (Phase 3)
   - Replace with import statement

8. **Diagnostics** (~650 lines)
   - tracePvCurve, runConvergenceDiagnostics, findDataIssues
   - **REMOVE** — use `diagnostics.js` instead (Phase 5)
   - Replace with import statement

9. **Diagram Rendering** (~300 lines)
   - renderDiagram, SVG canvas manipulation, event handlers
   - **KEEP** — this is UI-specific to HTML canvas
   - Refactor to import visualization helpers

10. **Event Listeners & Callbacks** (~200 lines)
    - Click handlers, input listeners, solve/reset buttons
    - Mostly **REMOVE** — replaced by bridge server
    - Keep minimal event wiring for demo mode

11. **Data I/O** (~100 lines)
    - Load/save JSON, COMTRADE export
    - **REFACTOR** — move serialize/deserialize calls to bridge
    - Keep file handling in HTML

12. **Bridge Server** (0 lines → ~150 lines)
    - **NEW for Phase 6**
    - Listen for postMessage from React
    - Invoke solver and return results

---

## Phase 6 Cutover Strategy

### Step 1: Create Minimal powerflow.html (Hours 0-2)

**Target Structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Newton Raphson Power Flow Simulator</title>
  <style>
    /* Essential styles only — ~100 lines */
    body { margin: 0; padding: 20px; }
    #diagram { width: 100%; height: auto; }
    .panel { padding: 16px; border: 1px solid #ccc; }
    /* Control + table styles */
  </style>
</head>
<body>
  <div id="model-name"></div>
  <div class="container">
    <div id="diagram-fs-container">
      <svg id="diagram"></svg>
    </div>
    <div id="status"></div>
    <div id="convergence-diagnostic"></div>
    <div id="ctrl-xfmrs"></div>
    <div id="ctrl-gens"></div>
    <div id="gentable"></div>
    <div id="loadscale"></div>
    <!-- ... other UI elements ... -->
  </div>

  <!-- ES6 Modules: Import extracted libraries -->
  <script type="module">
    import { buildYbus, solvePowerFlow } from './core/solver.js';
    import { renderControls, applyControls, onCellEdit } from './core/controls.js';
    import { tracePvCurve, runConvergenceDiagnostics } from './core/diagnostics.js';
    import { serializeNetwork, deserializeNetwork } from './core/persistence.js';
    
    // Global state
    let buses = [];
    let branches = [];
    let baseLoads = [];
    const BASE_MVA = 100;
    
    // Diagram rendering (keep simple SVG code)
    function renderDiagram() {
      // ... minimal SVG rendering logic ...
    }
    
    // Bridge Server: Listen for postMessage from React
    window.addEventListener('message', async (event) => {
      const { id, type, payload } = event.data;
      try {
        let result;
        if (type === 'solve') {
          applyControls(buses, branches, baseLoads, BASE_MVA);
          result = solvePowerFlow(buses, branches);
        } else if (type === 'serialize') {
          result = serializeNetwork({ buses, branches });
        } else if (type === 'deserialize') {
          const data = deserializeNetwork(JSON.parse(payload));
          buses = data.buses;
          branches = data.branches;
          result = { ok: true };
        }
        event.source.postMessage({ id, result });
      } catch (error) {
        event.source.postMessage({ id, error: error.message });
      }
    });
    
    // Demo mode: wire legacy buttons if not running in iframe
    if (window === window.top) {
      document.getElementById('solve').addEventListener('click', () => {
        applyControls(buses, branches, baseLoads, BASE_MVA);
        renderDiagram();
      });
    }
  </script>
</body>
</html>
```

**What to Remove:**
- All solver functions (buildYbus, solveLinear, solvePowerFlow) — use Module import
- All control functions (renderControls, applyControls, onCellEdit) — use Module import
- All persistence/serialization — use Module import
- All heatmap/label functions — use Module import
- All diagnostics functions — use Module import
- Complex event handling (now in bridge)

**What to Keep:**
- HTML structure (DOCTYPE, containers, form elements)
- CSS styling (buttons, inputs, panels)
- SVG rendering (renderDiagram and related)
- Global state initialization (buses, branches, baseLoads, BASE_MVA)
- Bridge server postMessage listener
- Demo mode event listeners (for standalone use)

### Step 2: Update SimuladorNRPage.jsx (Hours 2-3)

**Wire NR OLD vs NR NEW Toggle:**

```jsx
export default function SimuladorNRPage() {
  const [solverVersion, setSolverVersion] = useState('new'); // 'old' or 'new'
  const [network, setNetwork] = useState({ buses: [], branches: [] });
  
  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <button onClick={() => setSolverVersion('old')}>NR OLD</button>
        <button onClick={() => setSolverVersion('new')}>NR NEW</button>
        <span>{solverVersion === 'old' ? '🔴 Legacy' : '🟢 Refactored'}</span>
      </div>
      
      <PowerFlowEmbedded
        network={network}
        version={solverVersion}
        onSolveComplete={setNetwork}
      />
    </div>
  );
}
```

**PowerFlowEmbedded.jsx Updates:**

```jsx
const iframeUrl = version === 'old'
  ? '/newton-rapson/powerflow.html?mode=legacy'
  : '/newton-rapson/powerflow.html?mode=refactored';
```

### Step 3: Test All 7 Relay Scenarios (Hours 3-6)

Create a test matrix:

| Scenario | OLD Trip Time | NEW Trip Time | Tolerance | Status |
|----------|---------------|---------------|-----------|--------|
| 3-Ph Fault | ? | ? | ±10% | TBD |
| L-G Fault | ? | ? | ±10% | TBD |
| L-L Fault | ? | ? | ±10% | TBD |
| Inrush | ? | ? | ±10% | TBD |
| Undervolt | ? | ? | ±10% | TBD |
| Underfreq | ? | ? | ±10% | TBD |
| Directional | ? | ? | ±10% | TBD |

**Testing Procedure:**
1. Load each scenario in OLD solver (baseline)
2. Record trip time and COMTRADE file
3. Load same scenario in NEW solver
4. Record trip time and COMTRADE file
5. Compare: |OLD - NEW| / OLD ≤ 10%
6. Verify COMTRADE structure (sample count, time range, phasor values)

### Step 4: Validation & Deployment (Hours 6-8)

**Checklist:**
- [ ] powerflow.html < 200 lines
- [ ] All imports working (solver, controls, persistence, heatmap, labels, diagnostics)
- [ ] Bridge server receives/sends postMessage correctly
- [ ] NR OLD toggle loads legacy solver
- [ ] NR NEW toggle loads refactored solver
- [ ] All 7 scenarios trip within ±10% tolerance
- [ ] COMTRADE files match expected structure
- [ ] Zero console errors on both versions
- [ ] Build succeeds (npm run build)
- [ ] Production bundle size acceptable (< 350 kB gzip)
- [ ] Cloudflare deployment successful

---

## Critical Code Snippets

### Bridge Server in ES6 Module Context

```javascript
// In powerflow.html <script type="module">
import { SolverBridgeServer } from './core/bridge.js';

// Handler functions must call the extracted modules
const handlers = {
  solve: () => {
    applyControls(buses, branches, baseLoads, BASE_MVA);
    return solvePowerFlow(buses, branches);
  },
  serialize: () => serializeNetwork({ buses, branches }),
  deserialize: (json) => {
    const data = deserializeNetwork(JSON.parse(json));
    buses = data.buses;
    branches = data.branches;
    return { ok: true };
  }
};

const server = new SolverBridgeServer(handlers);
server.listen(); // Starts postMessage listener
```

### NR OLD vs NR NEW Iframe Switching

```jsx
// PowerFlowEmbedded.jsx
const iframeUrl = version === 'old'
  ? '/newton-rapson/powerflow.html?mode=legacy'
  : '/newton-rapson/powerflow.html?mode=refactored';

// In powerflow.html, detect mode and load appropriate solver:
const params = new URLSearchParams(window.location.search);
const mode = params.get('mode') || 'legacy';

if (mode === 'legacy') {
  // Use old solver (keep full legacy implementation)
} else {
  // Use new solver (bridge server + extracted modules)
}
```

---

## Known Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Bridge server doesn't pass messages | All solves fail | Test bridge before cutting over |
| Module imports fail | Blank screen | Verify all paths, check console |
| Parity drift on relay scenarios | Rollback required | Run full test matrix before deploy |
| COMTRADE export breaks | Data loss | Keep both serializers, test exports |
| CSS/styling lost | UI broken | Keep original styles, minimal refactor |
| Event handlers don't fire | No solver runs | Wire demo mode listeners as fallback |

---

## Post-Cutover Verification (Phase 6.1)

After initial cutover, before production deployment:

1. **Smoke Test**
   - Load a simple network
   - Run solve on both OLD and NEW
   - Verify SVG renders
   - Check console for errors

2. **Relay Scenario Test** (all 7)
   - Record trip times on both solvers
   - Calculate %difference
   - Verify COMTRADE files

3. **Performance Check**
   - Measure solve time: OLD vs NEW
   - Expected: NEW ≤ OLD + 5% (due to bridge overhead)
   - If slower: profile and optimize

4. **Data Persistence**
   - Load → Solve → Export JSON
   - Load JSON → Solve again
   - Verify results consistent

5. **Production Build**
   - `npm run build`
   - Check bundle size
   - Verify no console warnings
   - Deploy to Cloudflare staging first

---

## Rollback Plan

If Phase 6 cutover fails:

1. **Revert commits:** `git reset --hard a370542` (Phase 4)
2. **Disable NR NEW button** in SimuladorNRPage.jsx
3. **File issue** with detailed failure trace
4. **Schedule Phase 6 debug pass** within 1-2 days

**Never force-push to master** — maintain full history for post-mortem analysis.

---

## Success Metrics

Phase 6 is complete when:
- ✅ powerflow.html reduced from 7,616 → <200 lines
- ✅ All 57 tests still passing (Phases 2-5)
- ✅ All 7 relay scenarios pass (parity within ±10%)
- ✅ NR OLD vs NR NEW toggle functional
- ✅ COMTRADE export working on both versions
- ✅ Zero console errors or warnings
- ✅ Production build succeeds (< 350 kB gzip)
- ✅ Deployed to Cloudflare with zero incidents

**Final Deliverable:** Unified React app with embedded legacy + refactored power flow solvers, user-selectable via toggle, ready for production.
