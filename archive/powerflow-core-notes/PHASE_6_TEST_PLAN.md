# Phase 6 Test Validation Plan

**Date:** 2026-06-04  
**Objective:** Validate OLD vs NEW solver parity on all 7 relay scenarios  
**Success Criteria:** Trip time parity within ±10% tolerance on all scenarios  
**Estimated Duration:** 2-3 hours manual testing + 1 hour results analysis

---

## Test Environment Setup

### Prerequisites
- [ ] Dev server running: `npm run dev`
- [ ] Access to http://localhost:5173 (or available Vite port)
- [ ] Browser console open for error monitoring (F12)
- [ ] Test matrix spreadsheet created (see Template below)
- [ ] COMTRADE file storage folder prepared

### Browser Compatibility
Test on at least one browser from each major engine:
- [ ] Chrome/Chromium (Blink)
- [ ] Firefox (Gecko)
- [ ] Safari (WebKit) — if on macOS
- [ ] Edge (Blink)

### Network Test Cases (7 Scenarios)

All scenarios are pre-defined in `src/scenarios/educational-scenarios.js`:

1. **3-Phase Fault** — 5.0 A @ 0°/-120°/+120°
   - Expected trip: 50-1 @ ~0.05s
   - Protection function: Instantaneous overcurrent
   - Tolerance: ±10% = 0.045-0.055s

2. **L-G Fault** — 3.5 A / 0.3 A / 0.3 A
   - Expected trip: 50N-1 @ ~0.05s
   - Protection function: Instantaneous ground current
   - Tolerance: ±10% = 0.045-0.055s

3. **L-L Fault** — 4.0 A / 4.0 A / 0.2 A
   - Expected trip: 50-1 @ ~0.05s
   - Protection function: Instantaneous phase overcurrent
   - Tolerance: ±10% = 0.045-0.055s

4. **Inrush Transient** — 4.0 A all phases, timeDial 0.089 for 1.089s
   - Expected trip: 51-1 @ ~1.0-1.2s
   - Protection function: Time overcurrent with damped Newton
   - Tolerance: ±10% = 0.9-1.32s

5. **Undervoltage** — 1.0 A currents / 46.5 V
   - Expected trip: 27-1 @ ~1.0s
   - Protection function: Voltage protection
   - Tolerance: ±10% = 0.9-1.1s

6. **Underfrequency** — 1.5 A currents / 66.4 V
   - Expected trip: 81U-1 @ ~1.0s
   - Protection function: Underfrequency (81U variant)
   - Tolerance: ±10% = 0.9-1.1s

7. **Directional** — 3.0 A / 0.5 A currents / 40 V
   - Expected trip: 67-1 @ ~0.3s
   - Protection function: Directional overcurrent
   - Tolerance: ±10% = 0.27-0.33s

---

## Test Execution Procedure

### Phase 1: OLD Solver Baseline (1 hour)

For each scenario:

1. **Load Scenario**
   - Open application at http://localhost:5173
   - Navigate to Relay/Simulador page
   - Click NR OLD button (if toggle available) or access legacy solver directly
   - Select scenario from dropdown

2. **Run Injection**
   - Click [▶ Injetar] button
   - Monitor TRIP timer display
   - Record trip time (stopwatch: 0.0XXs format)
   - Screenshot for documentation

3. **Export COMTRADE**
   - Click [Export COMTRADE] button
   - Save file as `scenario-N-OLD-trip-time.zip`
   - Verify file contains .cfg, .dat, .hdr files

4. **Record Results**
   ```
   Scenario: 3-Phase Fault
   Solver: OLD
   Trip Time: 0.050s
   Status: PASS / FAIL (within tolerance?)
   COMTRADE: scenario-1-OLD.zip (saved)
   Console Errors: None / [list errors]
   ```

### Phase 2: NEW Solver Testing (1 hour)

Repeat Phase 1 with NR NEW button/solver:

1. **Load Scenario**
   - Same as Phase 1

2. **Run Injection**
   - Monitor TRIP timer
   - Record trip time
   - Screenshot

3. **Export COMTRADE**
   - Save as `scenario-N-NEW-trip-time.zip`

4. **Record Results**
   ```
   Scenario: 3-Phase Fault
   Solver: NEW
   Trip Time: 0.049s
   Status: PASS / FAIL
   COMTRADE: scenario-1-NEW.zip (saved)
   Console Errors: None
   ```

### Phase 3: Results Analysis (1 hour)

For each scenario:

1. **Calculate Parity**
   ```
   OLD trip time: T_old
   NEW trip time: T_new
   Difference: |T_new - T_old|
   % Difference: |T_new - T_old| / T_old × 100%
   Tolerance: ±10%
   Pass Criteria: % Difference ≤ 10%
   ```

2. **Verify COMTRADE Files**
   - Check both .zip files extracted correctly
   - Verify .cfg header (sample rate, channels)
   - Compare .dat sample counts (should be similar)
   - Spot-check phasor values (within ±5% expected)

3. **Console Error Analysis**
   - No critical errors expected
   - Warnings acceptable if non-blocking
   - Document any new errors in NEW solver

---

## Test Matrix Template

| # | Scenario | OLD Time | NEW Time | Diff (%) | Tolerance | Status | COMTRADE OK | Notes |
|---|----------|----------|----------|----------|-----------|--------|------------|-------|
| 1 | 3-Ph Fault | | | | ±10% | | | |
| 2 | L-G Fault | | | | ±10% | | | |
| 3 | L-L Fault | | | | ±10% | | | |
| 4 | Inrush | | | | ±10% | | | |
| 5 | Undervolt | | | | ±10% | | | |
| 6 | Underfreq | | | | ±10% | | | |
| 7 | Directional | | | | ±10% | | | |

**Summary:**
- Total scenarios: 7
- Pass (within tolerance): ___/7
- Fail (outside tolerance): ___/7
- Overall Status: PASS / FAIL

---

## Performance Profiling (Optional)

### Latency Comparison

For each scenario, measure solve time:

```javascript
// In browser console
console.time('solve');
// [inject scenario and wait for trip]
console.timeEnd('solve');
```

Compare:
- OLD solver: baseline
- NEW solver: expected ≤ OLD + 5% (due to bridge overhead)

### Memory Usage

Monitor via DevTools → Performance tab:
- Heap size before solve
- Heap size after solve
- GC pressure (frequency of garbage collection)

Record outliers for debugging.

---

## Issue Triage

### If Trip Time Outside Tolerance

**Example:** 3-Phase Fault
- OLD: 0.050s (expected)
- NEW: 0.062s (actual)
- Diff: 24% (FAIL)

**Investigation Steps:**

1. **Verify Test Setup**
   - Both solvers using same input phasors (screenshot confirm)
   - Same protection settings (tap settings, timer dials)
   - Same load scale

2. **Check Console Errors**
   - Any JavaScript errors from bridge server?
   - Solver convergence warnings?
   - Missing DOM elements?

3. **Inspect Solver Output**
   - Bus voltages: are they similar on both solvers?
   - Branch currents: matching?
   - Relay trip detection logic: same code path?

4. **Trace Bridge Communication**
   - Did postMessage succeed?
   - Did bridge server invoke correct function?
   - Check browser console for bridge errors

5. **File Issue**
   - Create GitHub issue with:
     * Scenario name and phasors
     * OLD vs NEW trip times
     * Console error logs (if any)
     * Browser version
     * Screenshot of both results

### If COMTRADE Export Fails

**Symptoms:** Export button doesn't download file, or file is corrupted

**Investigation:**

1. Check if both solvers support COMTRADE export
2. Verify file size is reasonable (expect ~5-50 kB)
3. Try extracting .zip manually — should contain 3 files
4. If corrupted, check console for serialization errors

### If Console Errors

**Priority by severity:**

1. **CRITICAL** (STOP TESTING)
   - Uncaught SyntaxError
   - Module import failures
   - Bridge server crash
   - → File bug immediately, don't proceed

2. **WARNING** (DOCUMENT, CONTINUE)
   - Deprecation warnings
   - Non-critical solver diagnostics
   - Missing optional DOM elements
   - → Record in test notes, continue

3. **EXPECTED** (IGNORE)
   - "Did not converge" for intentional load-scaling tests
   - Network.onmessage in dev tools (expected behavior)
   - React warnings in dev mode

---

## Sign-Off Checklist

- [ ] All 7 scenarios tested on OLD solver (baseline established)
- [ ] All 7 scenarios tested on NEW solver (refactored version)
- [ ] All trip times within ±10% tolerance
- [ ] All COMTRADE exports successful on both versions
- [ ] Zero critical console errors on both versions
- [ ] Test matrix completed and signed
- [ ] Browser compatibility verified (≥ 1 browser tested)
- [ ] Results documented in Phase 6 completion memo
- [ ] No blockers identified for production deployment

---

## Results Documentation

After completing all tests, document findings:

**Example Report Template:**

```markdown
# Phase 6 Test Results — ALL SCENARIOS PASS ✅

**Date:** 2026-06-04  
**Tested By:** [Your Name]  
**Browser:** Chrome 126 (Blink)

## Summary
- 7/7 scenarios pass trip time parity check (±10% tolerance)
- All COMTRADE files export correctly
- Zero critical errors on both OLD and NEW solvers
- NEW solver latency +3% vs OLD (acceptable, < 5% threshold)

## Detailed Results

### Scenario 1: 3-Phase Fault
- OLD Trip: 0.050s
- NEW Trip: 0.051s
- Diff: +2% ✅ PASS
- COMTRADE: Both files valid

### Scenario 2: L-G Fault
... [etc for all 7]

## Issues Found
None. Ready for production deployment.

## Deployment Recommendation
✅ APPROVED — Proceed with Cloudflare deployment
```

---

## Post-Test Actions

1. **If PASS (All 7 ✅)**
   - Commit test results to repo
   - Push Phase 6 final commit
   - Deploy to Cloudflare
   - Update status page

2. **If FAIL (Any scenario outside tolerance)**
   - Do NOT deploy to production
   - File GitHub issue with full test data
   - Schedule debug session
   - Review Phase 2 solver implementation for drift source
   - Re-test after fix

---

## Reference Documents

- Educational scenarios: `src/scenarios/educational-scenarios.js`
- Solver core: `src/simulators/powerflow/core/solver.js`
- Phase 2 parity harness: `tests/harness/powerflow-parity.test.js`
- Legacy solver reference: `public/newton-rapson/powerflow.html`
- Refactored solver: `public/newton-rapson/powerflow-refactored.html`

---

**Test Plan Version:** 1.0  
**Last Updated:** 2026-06-04  
**Next Review:** After Phase 6 completion
