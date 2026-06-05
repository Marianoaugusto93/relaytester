# Newton-Raphson Refactoring Plan — v2 (TEAM EXECUTION)

**Status:** Ready for parallel team execution  
**Mode:** Option B (library extraction + postMessage bridge)  
**Strategy:** Strangler-fig with parallel OLD/NEW UI toggle  
**Estimated effort:** 60–80 hours (parallelizable into 4 concurrent lanes)

---

## CRITICAL REVISIONS ADDRESSED

### ✅ Phase 0: Tooling Bootstrap (NEW)
**Effort:** 10 hours | **Lane 1 (parallel start)**

**Deliverables:**
1. Install test dependencies: `npm install --save-dev vitest @vitest/ui jsdom`
2. Create `vitest.config.js` with jsdom environment (solver tests are pure math, no canvas yet)
3. Add GitHub Actions workflow: `.github/workflows/newton-raphson-tests.yml`
   - Runs Phase 1 parity harness on every PR
   - Blocks merge if solver output drifts > 1e-9
   - Reports fixture diffs in PR comments
4. Create test directory structure: `tests/fixtures/powerflow/`
5. Document CI in `.omc/PHASE0_TOOLING.md`

**Gating:** Phase 1 cannot start until Phase 0 is merged and CI is green.

---

### ✅ Phase 1: Safety Net + Parity Harness (REVISED)
**Effort:** 8 hours | **Lane 1 (after Phase 0)**

**Deliverables:**
1. Build parity harness in `tests/harness/powerflow-parity.test.js`
   - Load legacy `powerflow.html` via jsdom
   - Run 40-bus demo + 5 stress cases (Q-limit, Zgen, ill-conditioned)
   - Snapshot converged voltages/angles to fixtures (1e-9 tolerance)
2. Create 3 contract fixtures:
   - `fixture-q-limit.json` — Q-limit enforcement case
   - `fixture-zgen-phantom.json` — Zgen phantom bus case
   - `fixture-no-convergence.json` — non-converging case
3. CI gate: PR fails if solver drift > 1e-9 p.u.
4. Document in `.omc/PHASE1_PARITY.md`

**Gating:** Harness must pass on legacy code before Phase 2 starts.

---

### ✅ Cutover Contract (REVISED)
**Backward Compatibility Guarantees:**

| Artifact | Guarantee | Migration Path |
|---|---|---|
| **Legacy URL** | `/newton-rapson/powerflow.html` lives until Phase 6 cutover | Phase 6: thin shell loader, same path |
| **URL-hash share-links** | Base64 + JSON links from 2026 load in 2027+ | Phase 3: JSON round-trip test |
| **JSON file format** | Full + compact JSON export works in both old & new | Phase 3: `fromLegacyJSON` + versioning |
| **Demo on load** | 40-bus demo loads by default | Phase 3+ / Phase 6 |
| **Numeric fidelity** | Solver output ≤ 1e-9 p.u. drift | Phase 1 parity gate (merge blocker) |

**Deprecated (not guaranteed):**
- GIF/video capture (Phase 5 scope — may be moved/reimplemented)
- Internal DOM selectors (Phase 6 cleanup — refactored to internal state)

**Explicit contract:** "Backward compat is a feature. We accept a 15% CI time overhead in Phase 1–5 to guarantee a safe cutover. Phase 6 deletes legacy file only after manual validation."

---

### ✅ Pre-Mortem Scenario 4 (REVISED)
**Failure: Parallel-Path Divergence via UI Mutation During Solve**

**Scenario:**
1. React app calls `bridge.solve(network1)`
2. User drags a bus on diagram during solve (mutation to `network1.buses[5].Vm`)
3. Solver writes result to `result.buses[5].angle` from stale solve
4. UI renders: bus position from mutated `network1` but angle from old result
5. Cascading mismatch in diagram rendering

**Mitigation:**
- **Phase 4:** Add input validation gate in `bridge/postMessage.js`
  - Freeze `network` input during solve (immutable snapshot)
  - Queue UI mutations, apply after solve completes
  - Test with `fixture-concurrent-mutation.test.js`
- **Phase 5:** Add UI diagnostics feedback: "Solve in progress — interactions queued"

**Owner:** Architect (Phase 4) + UI Designer (Phase 5)

---

## UI COMPARISON FEATURE (NEW)
**Effort:** 4 hours | **Lane 2 (parallel with Phase 1)**

**Deliverables:**
1. Add toggle button in `SimuladorNRPage.jsx` header:
   ```jsx
   <button onClick={() => setNRVersion(v === 'old' ? 'new' : 'old')}>
     NR {nrVersion.toUpperCase()}
   </button>
   ```
   - localStorage: `nr_version_preference` (default: "old")
   - Shows current version in topbar badge

2. Dual iframe/component structure:
   - **NR OLD:** `<iframe src="public/newton-rapson/powerflow.html" />`
   - **NR NEW:** `<PowerFlowEmbedded mode="inline" />` (Phase 4+, initially disabled)
   - Both share same scenario input + export/import
   - Side-by-side diff not needed until Phase 4 (before then, NR NEW is blank)

3. Document toggle behavior in `.omc/NR_COMPARISON_UI.md`

**Gating:** Merge after Phase 1. NR NEW button disabled until Phase 4 ships.

---

## PHASED ROADMAP (Parallelizable)

### Lanes Structure
- **Lane 1:** Phase 0 → Phase 1 → Phase 2 → Phase 3 (sequential, critical path, ~33h)
- **Lane 2:** Phase 4 bridge + Phase 5 UI (parallel after Phase 3, ~22h)
- **Lane 3:** Phase 6 cutover + cleanup (after Lanes 1 & 2, ~8h)
- **Parallel:** UI comparison toggle (Phase 0 end, ~4h)

```
Phase 0    ▼ (10h, Lane 1)
Phase 1    ▼ (8h, Lane 1)
Phase 2    ▼ (15h, Lane 1)
Phase 3    ▼ (12h, Lane 1)
           ├─→ Phase 4 (10h, Lane 2)
           │   └─→ Phase 5 (12h, Lane 2)
           └─→ UI Toggle (4h, Lane 2, can start at Phase 0 end)
           
Phase 6    ▼ (8h, Lane 3, after all above)
```

**Total wall-clock time with parallelization:** ~40 hours (vs. 60–80 sequential)

---

## PHASE DETAILS (Unchanged from v1, but clarified entry points)

### Phase 0 — Tooling Bootstrap (Lane 1)
- [ ] Install Vitest + jsdom
- [ ] Create CI workflow (`.github/workflows/newton-raphson-tests.yml`)
- [ ] Document in `.omc/PHASE0_TOOLING.md`
- **Owner:** Build/DevOps specialist

### Phase 1 — Safety Net (Lane 1, after Phase 0)
- [ ] Parity harness in `tests/harness/powerflow-parity.test.js`
- [ ] 3 contract fixtures + 2 concurrent-mutation fixture
- [ ] CI gate (merge blocker if drift > 1e-9)
- **Owner:** QA/Test engineer

### Phase 2 — Extract Solver Core (Lane 1, after Phase 1)
- [ ] Extract `src/simulators/powerflow/core/solver.js`
- [ ] Extract `src/simulators/powerflow/core/network.js`
- [ ] Compatibility shim in legacy `powerflow.html`
- [ ] Parity harness passes
- **Owner:** Core engineer (Haiku or Sonnet)

### Phase 3 — Extract Persistence + Visualization (Lane 1, after Phase 2)
- [ ] Extract `core/persistence.js` (toJSON, fromJSON, legacy parser)
- [ ] Extract `view/diagram.js`, `view/labels.js`, `view/heatmap.js`
- [ ] Theme tokens extracted
- [ ] JSON round-trip test (legacy ↔ new)
- [ ] Parity harness passes
- **Owner:** UI engineer + Architect

### Phase 4 — postMessage Bridge (Lane 2, parallel after Phase 3)
- [ ] Extract `bridge/postMessage.js` (versioned protocol)
- [ ] `<PowerFlowEmbedded mode="iframe" | "inline" />`
- [ ] Update `SimuladorNRPage.jsx` to new component (default iframe)
- [ ] Input validation + concurrent-mutation fixture
- [ ] NR NEW button enabled
- **Owner:** Integration engineer + Architect

### Phase 5 — Extract Controls + Diagnostics (Lane 2, parallel with Phase 4)
- [ ] Extract `ui/controls.js` (tables, edit handlers)
- [ ] Extract `ui/diagnostics.js` (PV curve, capture, convergence)
- [ ] Feature-detection for GIF/video capture
- [ ] Manual smoke test in browser
- **Owner:** UI engineer

### Phase 6 — Cutover + Cleanup (Lane 3, after all above)
- [ ] Reduce `powerflow.html` to < 200 lines (module loader shell)
- [ ] Delete dead code, dead globals
- [ ] README in `src/simulators/powerflow/` (public API)
- [ ] All 7 relay scenarios pass (regression test)
- [ ] Parity harness green
- [ ] Manual validation: NR OLD and NR NEW identical behavior
- [ ] Delete legacy file → consolidate to NR NEW
- **Owner:** Architect + QA

---

## TEAM EXECUTION (4 parallel workers)

**Worker assignments:**
1. **Architect** — Design (Phase 0 strategy, Phase 3/4/6 decisions)
2. **Core Engineer** — Extraction (Phase 0/1/2 implementation)
3. **UI Engineer** — Visualization (Phase 3/4/5 controls + bridge)
4. **QA/Test** — Harnesses (Phase 1 parity, Phase 4/6 validation)

**Coordination:**
- Weekly sync on parity harness status + fixture updates
- Phase gate: before moving to next phase, previous phase's PR must be merged
- Conflict resolution: Architect final call on API boundaries

**Communication:**
- `.omc/PHASE*_<NAME>.md` for each completed phase (deliverables checklist)
- Commit messages: `feat: Phase N — <deliverable>` (enables `git log | grep Phase`)
- PR titles: `[NR Refactor] Phase N — <deliverable>`

---

## SUCCESS CRITERIA

### Phase 0
- [ ] Vitest + jsdom installed
- [ ] CI workflow runs on every push
- [ ] `.github/workflows/newton-raphson-tests.yml` green

### Phase 1
- [ ] Parity harness runs legacy code → green
- [ ] 5 fixtures (40-bus, Q-limit, Zgen, no-convergence, concurrent-mutation) committed
- [ ] CI gate: PR fails if solver drift > 1e-9

### Phase 2
- [ ] `solver.js` + `network.js` have zero DOM refs, zero globals
- [ ] Parity harness still green
- [ ] Legacy URL still works

### Phase 3
- [ ] `persistence.js`, `diagram.js`, `labels.js`, `heatmap.js` are pure (no globals)
- [ ] JSON round-trip test passes (legacy ↔ new)
- [ ] Parity harness still green
- [ ] Theme tokens extracted

### Phase 4
- [ ] `postMessage.js` protocol documented
- [ ] `<PowerFlowEmbedded mode="iframe" | "inline" />` working
- [ ] NR NEW button enabled + toggles successfully
- [ ] Input validation fixture passes
- [ ] Manual test: React app can drive scenario + read results

### Phase 5
- [ ] Controls + diagnostics extracted
- [ ] GIF/video capture works (with feature-detection for test env)
- [ ] Manual smoke test in browser (PV curve, convergence plot)

### Phase 6
- [ ] `powerflow.html` < 200 lines
- [ ] All 7 relay scenarios pass (regression)
- [ ] Parity harness green
- [ ] NR OLD and NR NEW produce identical results
- [ ] Manual validation: user can't tell the difference
- [ ] Legacy file deleted → NR NEW is now "the" version

---

## KNOWN RISKS & MITIGATIONS

| Risk | Mitigation | Owner |
|---|---|---|
| Solver numeric drift | Phase 1 parity gate + 1e-9 tolerance + pre-mortem scenario 4 | QA |
| Concurrent mutations during solve | Input validation + immutable snapshot in Phase 4 | Architect |
| GIF/video capture breaks in Node | Feature-detection + graceful degrade | UI Engineer |
| Phase 3 JSON round-trip fails | Explicit legacy parser `fromLegacyJSON` + test fixtures | Core Engineer |
| Share-links break | Phase 3 tests against base64 + JSON from 2026 archive | QA |

---

## DELIVERABLES BY PHASE

- **Phase 0:** `.omc/PHASE0_TOOLING.md` + `.github/workflows/newton-raphson-tests.yml`
- **Phase 1:** `.omc/PHASE1_PARITY.md` + `tests/fixtures/powerflow/` (5 fixtures)
- **Phase 2:** `src/simulators/powerflow/core/` (solver.js + network.js) + parity passed
- **Phase 3:** `src/simulators/powerflow/{view,core}/persistence.js` + JSON round-trip test + parity passed
- **Phase 4:** `src/simulators/powerflow/bridge/postMessage.js` + `<PowerFlowEmbedded />` + `.omc/NR_COMPARISON_UI.md` + NR toggle enabled
- **Phase 5:** `src/simulators/powerflow/ui/{controls,diagnostics}.js` + manual smoke test
- **Phase 6:** `powerflow.html` < 200 lines + all 7 scenarios pass + `.omc/PHASE6_CUTOVER.md` + legacy file deleted

---

## NEXT STEPS

1. Review this plan (v2)
2. Confirm team membership (4 workers as above)
3. Invoke: `/oh-my-claudecode:team --plan .omc/plans/newton-raphson-refactor-v2-TEAM.md`
4. Team coordinates via weekly syncs + phase gates
5. On Phase 6 completion: NR OLD is gone, NR NEW is production, toggle removed

---

**Created:** 2026-06-04  
**Reviewed by:** User (Augusto César)  
**Approved for execution:** ✅ READY
