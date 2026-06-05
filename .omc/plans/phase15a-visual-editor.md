# Phase 15A: Visual Scenario Editor — Implementation Plan

**Date**: 2026-06-03  
**Status**: Planning Phase  
**Estimated Effort**: 6–8 hours  
**Priority**: HIGH — Directly improves user experience by eliminating manual JSON editing

## Executive Summary

**Problem**: Users currently create custom scenarios by manually editing JSON objects in a form field. This is error-prone and requires technical knowledge.

**Solution**: Build a visual, point-and-click scenario builder with:
- Phasor magnitude/angle sliders (visual controls)
- Protection function selector with stage/curve configuration
- Real-time trip simulation preview
- Save/load/export workflow

**User Impact**: Non-technical users can now build custom test cases without understanding JSON syntax.

## User Stories

### US-1501: Visual Phasor Editor
**Title**: Drag-and-drop phasor editor for current and voltage

**Acceptance Criteria**:
- [ ] 6 slider pairs: Ia/Ib/Ic MAG, Ia/Ib/Ic ANG (current)
- [ ] 6 slider pairs: Va/Vb/Vc MAG, Va/Vb/Vc ANG (voltage)
- [ ] Live preview: current values displayed in a 2-row grid
- [ ] Input validation: magnitude 0–100A (secondary), angle 0–360°
- [ ] Presets: 3-phase, single-phase, zero-sequence selections

### US-1502: Protection Stage Configurator
**Title**: Visual interface for selecting and configuring protection functions and stages

**Acceptance Criteria**:
- [ ] Dropdown: Select protection function (50, 51, 50N, 51N, 67, 67N, 27, 59, 47, 81U, 81O)
- [ ] Stage selector: Choose which stage trips (1–3 for multi-stage functions)
- [ ] Pickup/curve configurator:
  - Pickup value slider
  - Curve type selector (IEC, IEEE, ANSI) for 51/51N
  - Time dial slider (0.05–10s)
- [ ] Expected trip time input: Manual override for scenario annotation

### US-1503: Scenario Builder Modal
**Title**: Modal dialog for creating/editing custom scenarios with all controls

**Acceptance Criteria**:
- [ ] Modal layout:
  - Left: Phasor editor (US-1501)
  - Right: Protection configurator (US-1502)
  - Bottom: Scenario metadata (name, description, difficulty)
- [ ] Actions: Preview trip, Save scenario, Cancel
- [ ] Validation: Prevent save if name is empty
- [ ] Responsiveness: Modal adapts to viewport size

### US-1504: Trip Simulation Preview
**Title**: Real-time preview showing whether the scenario triggers the selected protection stage

**Acceptance Criteria**:
- [ ] Live calculation: User adjusts sliders, protection engine re-runs
- [ ] Visual feedback: Green checkmark if trip occurs, red X if no trip
- [ ] Trip time display: "Expected 0.05s" (from protection engine)
- [ ] Comparison: Show actual vs. expected trip time delta

### US-1505: Scenario Persistence
**Title**: Save/load custom scenarios with localStorage and export capability

**Acceptance Criteria**:
- [ ] Auto-save to localStorage as user edits
- [ ] "My Scenarios" list with edit/delete actions
- [ ] Export: Download scenario as .json file
- [ ] Import: Load scenario from .json file with validation
- [ ] Difficulty tags: Beginner/Intermediate/Advanced dropdown

---

## Technical Architecture

### Data Model (Scenario)
`javascript
{
  id: "uuid",
  name: "Custom Inrush Test",
  description: "4A inrush current with 51 TOR protection",
  difficulty: "intermediate",
  phasors: {
    currents: {
      Ia: { mag: 4.0, ang: 0 },
      Ib: { mag: 4.0, ang: -120 },
      Ic: { mag: 4.0, ang: 120 },
    },
    voltages: {
      Va: { mag: 66.4, ang: 0 },
      Vb: { mag: 66.4, ang: -120 },
      Vc: { mag: 66.4, ang: 120 },
    },
  },
  protection: {
    functionCode: "51",
    stageNum: 1,
    config: {
      pickup: 2.5,
      curve: "IEC",
      timeDial: 0.3,
    },
    expectedTripTime: 1.2,
  },
  createdAt: "2026-06-03T12:00:00Z",
  lastModified: "2026-06-03T12:00:00Z",
}
`

### Component Hierarchy
`
VisualScenarioBuilder (Modal wrapper)
├── PhasorEditor (US-1501)
│   ├── CurrentSection
│   │   ├── SliderPair (Ia: mag, ang)
│   │   ├── SliderPair (Ib: mag, ang)
│   │   └── SliderPair (Ic: mag, ang)
│   ├── VoltageSection
│   │   ├── SliderPair (Va: mag, ang)
│   │   ├── SliderPair (Vb: mag, ang)
│   │   └── SliderPair (Vc: mag, ang)
│   └── PresetButtons (3-Ph, 1-Ph, etc.)
├── ProtectionConfigurator (US-1502)
│   ├── FunctionSelector
│   ├── StageSelector
│   ├── PickupConfigurator
│   ├── CurveSelector
│   ├── TimeDialSlider
│   └── ExpectedTripTimeInput
├── PreviewPanel (US-1504)
│   ├── TripStatusIndicator (✓ / ✗)
│   ├── TimeDeltaDisplay
│   └── WarningMessages
├── ScenarioMetadata
│   ├── NameInput
│   ├── DescriptionInput
│   └── DifficultySelector
└── ActionButtons (Preview, Save, Cancel)
`

### Integration Points
- **App.jsx**: Pass setProt, setP to builder modal
- **protection.js**: Reuse calc3, calcPower for trip simulation
- **defaults.js**: Use defaultProtections for presets
- **customScenarios.js**: Extend with localStorage persistence methods

---

## Implementation Phases

### Phase 15A.1: Component Foundation (2 hours)
**Tasks**:
1. Create src/VisualScenarioBuilder.jsx main component
2. Create src/components/PhasorEditor.jsx with slider controls
3. Create src/components/ProtectionConfigurator.jsx
4. Wire up basic state management (useState for scenario data)

**Acceptance**: Components render without errors, sliders respond to input

### Phase 15A.2: Logic Integration (2 hours)
**Tasks**:
1. Implement trip simulation preview (run protection engine on every change)
2. Add validation (prevent save if invalid)
3. Implement localStorage persistence (auto-save, load)
4. Add scenario metadata (name, description, difficulty)

**Acceptance**: Preview updates in real-time, scenarios persist across page reload

### Phase 15A.3: Polish & Testing (2–3 hours)
**Tasks**:
1. Styling: Match app design system (dark theme, orange/cyan accents)
2. Accessibility: ARIA labels, keyboard navigation, focus management
3. Error handling: Graceful degradation, helpful error messages
4. Manual testing: All 5 user stories verified

**Acceptance**: UI matches design, no console errors, all 7 existing scenarios still work

---

## Files to Create

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| src/VisualScenarioBuilder.jsx | Main modal component | 250 | TODO |
| src/components/PhasorEditor.jsx | Phasor controls | 180 | TODO |
| src/components/ProtectionConfigurator.jsx | Protection settings | 200 | TODO |
| src/components/SliderPair.jsx | Magnitude/angle slider | 60 | TODO |
| src/components/TripPreview.jsx | Preview panel | 100 | TODO |

## Files to Modify

| File | Changes | Reason |
|------|---------|--------|
| src/App.jsx | Add state for builder modal, prop drilling | Open/close builder |
| src/SettingsPanel.jsx | Add "Edit Visual" button in CustomScenarioBuilder | Alternative editor |
| src/scenarios/customScenarios.js | Add methods for import/export, validation | Persistence |
| src/appStyles.js | Add CSS for builder components | Styling |

---

## Risk Mitigation

**Risk**: Slider changes cause frequent re-renders (performance)
**Mitigation**: Debounce trip simulation to 300ms, use React.memo for slider components

**Risk**: Trip simulation runs during every keystroke (UX lag)
**Mitigation**: Separate "Preview" button; live calculation only after user confirms changes

**Risk**: localStorage quota exceeded with many scenarios
**Mitigation**: Limit to 50 scenarios; offer export/archive workflow

---

## Success Criteria (Phase 15A Completion)

- ✅ All 5 user stories implemented
- ✅ Zero console errors during normal usage
- ✅ All 7 existing scenarios still trip correctly (regression test)
- ✅ New scenarios can be created, saved, and re-loaded
- ✅ UI styling matches app design system
- ✅ Build size: ≤ 125 kB gzip (acceptable delta from current 117.50 kB)
- ✅ Lighthouse performance: ≥ 80

---

## Next Actions

1. **Review & Approval**: User confirms Phase 15A approach
2. **Phase 15A.1 Execution**: Build component foundation (start immediately after approval)
3. **QA Cycles**: UltraQA mode (run tests, fix failures, repeat)
4. **Validation**: Multi-perspective review (architect, security, code quality)
5. **Deployment**: Merge to main, stage for production release
