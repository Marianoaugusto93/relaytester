# Phase 7 Implementation Plan: Custom Scenario Builder UI Integration

**Status**: Draft for Review  
**Last Updated**: 2026-05-11  
**Target Effort**: 4-6 hours (including manual testing)

---

## 1. Requirements Summary

Integrate and verify the **Custom Scenario Builder UI** for Phase 6, providing users with preset educational scenarios and a framework for custom scenario management.

### Key Deliverables
- ✅ **Verify Educational Scenarios UI** is visible and accessible in SettingsPanel
- ✅ **Test all 7 preset scenarios** load correctly and apply expected phasors/protection settings
- ✅ **Verify trip behavior** matches expected trip stage and approximate trip time for each scenario
- ✅ **Custom Scenario Builder** form is functional (or identify what's needed for Phase 8)
- ✅ **End-to-end workflow**: Select scenario → Load settings → Run injection → Verify trip

### Scenarios to Test
1. **3-Ph Fault** (3-phase symmetrical) → Expected: 50-1 @ ~0.05s
2. **L-G Fault** (single line-to-ground) → Expected: 50N-1 @ ~0.05s
3. **L-L Fault** (line-to-line) → Expected: 50-1 @ ~0.05s
4. **Inrush** (motor/transformer) → Expected: 51-1 @ ~1.2s
5. **Undervolt** (27 function) → Expected: 27-1 @ ~1.0s
6. **Underfreq** (81U function) → Expected: 81U-1 @ ~1.0s
7. **Directional** (67 phase overcurrent) → Expected: 67-1 @ ~0.3s

---

## 2. Current State Analysis

### ✅ What Already Exists
- **SettingsPanel.jsx**: Has `.edu-section` with scenario buttons (lines 200-218)
- **educational-scenarios.js**: 7 scenarios fully defined with:
  - Phasor values (Ia, Ib, Ic, Va, Vb, Vc)
  - Protection functions to enable (fns: ["50", "51"], etc.)
  - Stage configuration (stages object with indices)
  - Expected trip stage and time
  - Output/Input matrix mappings
- **applyTestPreset()**: Already handles scenario loading (App.jsx:240-262)
- **Translation keys**: `settings.preset` and `settings.eduScenarios` defined

### ⚠️ What Might Need Work
- **UI Visibility**: Confirm `.edu-section` CSS is styled and visible
- **Trip verification**: Scenarios define `expectedTrip` and `expectedTime` — confirm these match actual behavior
- **Custom Scenario Builder**: Form exists (CustomScenarioBuilder.jsx) but may need enhancement
- **Help/Documentation**: Scenario descriptions need to be in help system

---

## 3. Implementation Steps

### Step 1: Verify UI Rendering (15 min)
**Task**: Confirm educational scenarios are displayed in SettingsPanel

1. Start dev server: `npm run dev`
2. Navigate to RELÉ tab → Relay Settings
3. **Verify `.edu-section` is visible**:
   - [ ] "Educational Scenarios" heading appears
   - [ ] All 7 scenario buttons display (3-Ph Fault, L-G Fault, L-L Fault, Inrush, Undervolt, Underfreq, Directional)
   - [ ] Buttons are clickable
   - [ ] Hover shows description (from `scenario.description`)
   - [ ] CSS styling is clean (not broken layout)

**File Reference**: `src/SettingsPanel.jsx:208-218`

**Success Criteria**:
- [ ] All 7 scenario buttons visible and styled consistently with preset buttons
- [ ] No console errors when component renders

---

### Step 2: Test Individual Scenario Loading (90 min)
**Task**: Load each scenario and verify phasors/protection settings apply correctly

**For each of the 7 scenarios:**

1. **Load scenario**:
   - Click the scenario button (e.g., "3-Ph Fault")
   - Wait for settings to apply (visual feedback: send flash)
   - Check event log: should show "Preset loaded: [scenario name]"

2. **Verify phasors**:
   - Open "Current Injection" card (left column)
   - **Expected values** (from educational-scenarios.js):
     - 3-Ph: Ia 100A @ 0°, Ib 100A @ -120°, Ic 100A @ 120°
     - L-G: Ia 150A @ 0°, Ib 50A @ -120°, Ic 50A @ 120° (example; check actual)
     - [Continue for all 7]
   - **Verify**: Display matches expected magnitudes ±5%

3. **Verify protection functions enabled**:
   - Check "Relay Settings" tab → Relay Function tabs
   - **Expected functions per scenario** (from `scenario.fns`):
     - 3-Ph: [50, 51] should be visible, others disabled/grayed
     - L-G: [50N, 51N]
     - [Continue for all 7]
   - **Verify**: Correct functions are enabled

4. **Verify stage settings** (for selected function):
   - Click on first enabled function (e.g., "50" for 3-Ph)
   - Check stage 0 settings (pickup, time curve, etc.)
   - **Verify**: Match scenario `patch` overrides (if any)

**File Reference**: `src/scenarios/educational-scenarios.js` (data)  
**Integration Point**: `src/App.jsx:applyTestPreset()` (loads settings)

**Success Criteria** (per scenario):
- [ ] Phasors display correctly
- [ ] Protection functions match `scenario.fns`
- [ ] Stage settings apply from `scenario.stages` and `scenario.patch`
- [ ] No console errors during load

---

### Step 3: Test Trip Behavior (90 min)
**Task**: Run injection for each scenario and verify trip matches expected behavior

**For each scenario:**

1. **Load scenario** (as in Step 2)

2. **Run injection**:
   - Click "▶ Start Injection" button (Controls panel)
   - Watch waveform display (if using "Live Waveform" modal)
   - Observe relay trip state in Status panel

3. **Verify trip event**:
   - **Expected trip stage**: `scenario.expectedTrip` (e.g., "50-1")
   - **Expected trip time**: `scenario.expectedTime` (e.g., 0.05s for 3-Ph)
   - **Actual values**:
     - Check Status panel: "Tripped [stage]"
     - Check Trip Timer value (should match expectedTime ±10%)
     - Check Event Log: "Trip detected: [stage] @ [time]s"

4. **Verify COMTRADE record**:
   - Click "∿ Waveform" button (Relay Actions)
   - Modal opens showing trip history
   - Latest record shows:
     - Timestamp (current time)
     - Stages: should include `scenario.expectedTrip` stage
     - Trip time: ~`scenario.expectedTime`

**Acceptance Criteria** (per scenario):
- [ ] Trip stage matches `expectedTrip` ±1 stage
- [ ] Trip time matches `expectedTime` ±10% (0.05s → 0.045-0.055s)
- [ ] COMTRADE record captured correctly
- [ ] No console errors during injection

---

### Step 4: Test Custom Scenario Builder (30 min)
**Task**: Verify custom scenario form is functional

1. **Verify form exists**:
   - In SettingsPanel, "Relay Settings" tab
   - CustomScenarioBuilder component visible below Educational Scenarios
   - [ ] Form fields present (name, description, save button)
   - [ ] "My Scenarios" list visible (empty initially)

2. **Create a custom scenario**:
   - Enter name: "Test Custom"
   - Enter description: "Test scenario"
   - [Current form may auto-use current phasors/settings]
   - Click Save
   - [ ] Scenario appears in "My Scenarios" list
   - [ ] Clicking it reloads settings

3. **Document findings**:
   - If form is complete: ✅ Ready
   - If form needs enhancement: 📝 Note for Phase 8

**File Reference**: `src/CustomScenarioBuilder.jsx`

**Success Criteria**:
- [ ] Form renders without errors
- [ ] Can create and load custom scenarios
- [ ] Or: Document what's needed for Phase 8

---

### Step 5: Regression Testing (30 min)
**Task**: Ensure Phase 6 features and existing functionality still work

1. **Test WaveformDisplay** (Phase 6):
   - [ ] "Live Waveform" button present and functional
   - [ ] Modal opens during injection
   - [ ] Waveform renders in real-time
   - [ ] Speed/Zoom/Markers work

2. **Test LanguageSelector** (Phase 6):
   - [ ] Language dropdown visible (topbar)
   - [ ] Switch PT → EN → ES
   - [ ] UI text updates correctly
   - [ ] No console errors

3. **Test CAMPO tab**:
   - [ ] Wiring diagram loads
   - [ ] Can draw connections
   - [ ] No console errors

4. **Test Help system**:
   - [ ] "?" button opens help modal
   - [ ] Help topics display
   - [ ] Can dismiss

**Success Criteria**:
- [ ] All Phase 6 features intact
- [ ] No regressions in existing tabs

---

## 4. Acceptance Criteria (Testable)

### Functional
- [ ] All 7 scenarios load without errors
- [ ] Phasors display match expected values ±5%
- [ ] Protection functions enabled match scenario definition
- [ ] Trip stage matches `expectedTrip`
- [ ] Trip time matches `expectedTime` ±10%
- [ ] COMTRADE records capture correctly
- [ ] Custom scenario builder form is functional (or documented for Phase 8)

### Quality
- [ ] No console errors during scenario loading or injection
- [ ] UI layout clean (no broken styling, elements properly aligned)
- [ ] Phase 6 features (WaveformDisplay, LanguageSelector) still work
- [ ] Event log entries created for preset loads and trips

### Documentation
- [ ] All scenarios have descriptive `description` fields
- [ ] Expected trip values documented in code comments (already done)
- [ ] Help system includes scenario descriptions (Phase 7.6+)

---

## 5. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Scenarios not loading | Low | High | Test each scenario individually in Step 2 |
| Trip times don't match expected | Medium | Medium | Verify protection engine calculations; may need scenario data tuning |
| Custom scenario form incomplete | Medium | Low | Document findings; move advanced features to Phase 8 |
| CSS styling issues for edu-section | Low | Low | Check SettingsPanel CSS; fix alignment if needed |
| Console errors during testing | Low | Low | Use dev tools to catch and report errors |

---

## 6. Verification Steps

### Manual Testing Checklist
- [ ] Dev server running on http://localhost:5176
- [ ] All 7 scenarios test completed (Step 3)
- [ ] Each scenario trip verified (Step 3)
- [ ] Custom scenario form tested (Step 4)
- [ ] Regressions checked (Step 5)

### Automated Checks
- [ ] Build passes: `npm run build`
- [ ] No console errors during scenario loading
- [ ] Event log captures preset loads and trips

### Success Definition
**Phase 7 is complete when:**
- ✅ All 7 scenarios load correctly
- ✅ Trip behavior matches expected values (±10% tolerance)
- ✅ Custom scenario builder is functional
- ✅ No regressions in existing features
- ✅ Manual testing checklist complete

---

## 7. RALPLAN-DR Summary

### Principles
1. **Verify before enhancing** — Confirm existing UI works before adding features
2. **Data-driven scenarios** — Use actual protection engine behavior to validate expected trip values
3. **User-centric workflow** — Simple button → load scenario → observe trip

### Decision Drivers
1. **Scenarios already implemented** (data + UI) — minimal work needed
2. **applyTestPreset() already handles loading** — leverage existing integration
3. **Trip verification is critical** — ensures scenarios teach correct behavior

### Options Considered

**Option A: Verify & Test (Recommended)** ✅
- Validate existing scenario UI and trip behavior
- Identify any gaps (CSS, trip time calibration)
- Document findings for Phase 8
- **Effort**: 4-6 hours
- **Risk**: Low (testing only, no new code)
- **Benefit**: Confidence in Phase 6 completeness

**Option B: Skip verification, move to Phase 8 enhancements**
- Assume scenarios work, add advanced features (custom builder, export/import)
- **Effort**: 8-10 hours
- **Risk**: High (untested scenarios could mislead learners)
- **Benefit**: Faster progress
- **Con**: Ship without verification

**Option C: Lightweight verification + quick custom builder fixes**
- Test only 2-3 key scenarios
- Add custom scenario save/load persistence
- **Effort**: 6-8 hours
- **Risk**: Medium (incomplete coverage)
- **Benefit**: Balance speed and quality

### Why Option A is Chosen
Scenarios are critical for educational use — verifying they work correctly builds trust in the platform. Option A provides data (trip times, scenario behavior) needed for Phase 8 enhancements. Low risk, high learning value.

---

## 8. Implementation Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Step 1: UI Verification | 15 min | Confirm scenarios render correctly |
| Step 2: Scenario Loading | 90 min | Verify all 7 scenarios load phasors/settings |
| Step 3: Trip Behavior | 90 min | Verify trip stage and timing for all scenarios |
| Step 4: Custom Builder | 30 min | Test custom scenario form |
| Step 5: Regression Testing | 30 min | Ensure Phase 6 features intact |
| **Total** | **4.5 hours** | **Phase 7 Complete** |

---

## 9. Notes & Follow-ups

### For Phase 8 (Custom Scenario Builder Enhancements)
- [ ] Persistence: Save/load custom scenarios from localStorage or server
- [ ] Export/Import: Allow users to share scenarios as JSON
- [ ] Difficulty levels: Tag scenarios (Beginner/Intermediate/Advanced)
- [ ] Scenario editor: UI to create scenarios without code
- [ ] Help integration: Add scenario descriptions to help modal

### Calibration Notes
- Trip times in `expectedTime` may need tuning based on actual protection engine behavior
- Document any discrepancies found (e.g., "50-1 expected 0.05s, actual 0.052s" → tolerance ±10%)

---

## 10. Files to Review/Test

| File | Purpose | Status |
|------|---------|--------|
| `src/SettingsPanel.jsx` | UI for scenarios | Existing (lines 208-218) |
| `src/scenarios/educational-scenarios.js` | Scenario data | Existing (7 scenarios) |
| `src/App.jsx` | applyTestPreset() function | Existing (lines 240-262) |
| `src/CustomScenarioBuilder.jsx` | Custom scenario form | Existing (verify functionality) |
| `src/defaults.js` | TEST_PRESETS, mainTabs | Existing |

---

## 11. Success Metrics

- **Scenario Load Success Rate**: 7/7 scenarios load without errors (100%)
- **Trip Accuracy**: Trip times within ±10% of expected values
- **User Workflow**: Scenario selection → Load → Trip happens in <5 seconds
- **Test Coverage**: All 7 scenarios tested manually
- **Regression**: Phase 6 features (WaveformDisplay, LanguageSelector) confirmed working

---

**Prepared for**: Phase 7 Implementation  
**Ready for**: Manual Testing & Verification
