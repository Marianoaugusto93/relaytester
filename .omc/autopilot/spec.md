# MVP Refactored Newton-Raphson Solver — Specification

**Objective**: Expand Phase 6 skeleton to fully functional MVP refactored power flow solver.

**Current State**:
- ✅ Bridge server working (postMessage protocol)
- ✅ Modules extracted (solver, controls, visualization, persistence)
- ❌ HTML visualization is placeholder (gray box, no diagram)
- ❌ No result tables or interactive measurements

**Key Deliverables**:

1. **Power Flow Diagram** (SVG with real-time rendering)
   - Bus nodes with voltage heatmap coloring
   - Branch connections with flow arrows
   - Bus/branch labels with measurement values
   
2. **Interactive Controls**
   - Generator P setpoint sliders
   - Load scale multiplier slider
   - Real-time solver updates on control changes
   
3. **Result Tables**
   - Bus measurements (V, θ, P, Q)
   - Branch flows (S, losses)
   - Generator dispatch
   
4. **Solver Integration**
   - [Solve] button → bridge.solve()
   - [Reset] button → reload demo network
   - [Export] button → serialize to JSON
   - Status display (converged / failed)

**Constraints**:
- Visualization code ≤ 300 lines
- Total HTML ≤ 500 lines
- Reuse extracted modules (no duplicate code)
- Feature parity with legacy solver UI

**Success Criteria**:
- No console errors
- Diagram renders with real data
- Controls are interactive and responsive
- Solver produces valid results
- Build passes (npm run build)
- Toggle comparison works (OLD vs NEW)

**Timeline**: 4-5 hours total
