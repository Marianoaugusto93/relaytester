# RelayLab 360 Rebranding Implementation Plan

## Phase 2 Execution Map

### Component Group 1: Modal & Overlay Components (10 min)
Target: High-impact visibility

**1. HelpModal.jsx**
- Update `.help-modal-header` to use `background: var(--orange-dim); color: var(--orange);`
- Update `.help-topic-title` to `color: var(--orange)`
- Ensure code blocks use `.code-block { color: var(--cyan); background: var(--cyan-dim); }`
- Verify modal border uses `border: 1px solid rgba(249,115,22,.2)`

**2. Tutorial.jsx**
- Update highlight box clip-path to use `box-shadow: 0 0 0 3px rgba(249,115,22,.4)`
- Button styling: `.tut-btn-next { background: var(--orange); color: #0e1015; }`
- Progress indicator: `.tut-step.active { background: var(--cyan); }`
- Ensure z-index is 4000 (already set)

**3. SettingsPanel.jsx**
- Orange button for "Save Scenario": `.btn-save { background: var(--orange); color: #0e1015; }`
- Scenario pills: `.pill { background: var(--orange-dim); border: 1px solid rgba(249,115,22,.2); color: var(--orange); }`
- Delete button: Keep red (`#f87171`)
- Difficulty badges: `.diff-badge { background: var(--cyan-dim); color: var(--cyan); }`

---

### Component Group 2: Data Display & Visualization (12 min)
Target: Technical data consistency

**4. RelayDisplay.jsx** (if exists)
- Trip state glow: `.relay-tripped { box-shadow: 0 0 16px rgba(249,115,22,.4); border-color: var(--orange); }`
- Status text: `.status-value { color: var(--cyan); }`
- Relay name: Use "ReGrid Pro 1000" in headers

**5. WaveformDisplay.jsx**
- Waveform line color: Use `#0ea5e9` (cyan) for trace
- Trip marker: Use `var(--orange)` for vertical line at trip time
- Grid background: `rgba(14,165,233,.05)`
- Axis labels: `color: var(--cyan)`

**6. PhasorDiagram.jsx**
- Phasor vectors: Use `#0ea5e9` (cyan) for color
- Fault phasor overlay: Use `var(--orange)` with opacity 0.6
- Labels (A, B, C): `color: var(--cyan); font-family: var(--fm);`

**7. FaultCalculator.jsx**
- Calculate button: `background: var(--orange); color: #0e1015;`
- Result boxes: `background: var(--cyan-dim); border-left: 3px solid var(--cyan);`
- Input fields: `color: var(--cyan);` (already set in appStyles)

---

### Component Group 3: Navigation & Selection (8 min)
Target: UI consistency

**8. LanguageSelector.jsx**
- Language pills: `.lang-pill { background: var(--card2); color: var(--tx2); }`
- Active language: `.lang-pill.active { background: var(--orange); color: #0e1015; border: none; }`
- Hover: `.lang-pill:hover { border-color: rgba(249,115,22,.3); }`

---

### Component Group 4: Verification & Cleanup (10 min)
Target: Consistency across all components

**9. CampoPage.jsx**
- Terminal block labels: Ensure `color: var(--cyan)`
- Transformer ratio display: `.ratio { color: var(--cyan); background: var(--cyan-dim); }`
- Connection buttons: `.conn-b.on { background: var(--orange-dim); color: var(--orange); }`

**10. App.jsx**
- Verify topbar: `.tb-t span { color: var(--orange); }` (ReGrid Pro 1000 in relay brand)
- File header save: Ensure FILE_HEADER includes "RELAYLAB 360 — Parametrization File"

**11. appStyles.js**
- Verify all --orange, --cyan, --orange-dim, --cyan-dim variables are defined
- Add missing component styles if gaps found during implementation

**12. Check all modals**
- Modal borders: `border: 1px solid rgba(249,115,22,.15)`
- Modal header: Background should be `var(--card)` with orange accent bar
- Overlay: `background: rgba(0,0,0,.65)`

---

## Phase 2 Execution Strategy

### Parallel Execution (By Component Group)

**Lane 1: Group 1 (Modals)** — HelpModal, Tutorial, SettingsPanel
- 10 min: CSS updates to appStyles.js
- 5 min: JSX component updates

**Lane 2: Group 2 (Visualization)** — RelayDisplay, Waveform, Phasor, Fault
- 12 min: Visualization component styling

**Lane 3: Group 3+4 (Navigation & Verification)** — LanguageSelector, CampoPage, final checks
- 8 min: Navigation styling
- 5 min: Cross-file verification

### Integration & Testing
- Merge all changes
- Build: `npm run build`
- Visual QA: Open http://localhost:5173
- Console check: F12 → Console (expect 0 errors)

---

## Phase 3 QA Checklist

### Build Verification
- [ ] `npm run build` completes without errors
- [ ] No CSS parsing errors
- [ ] Bundle size within expected range (< 280 kB)

### Visual QA
- [ ] Topbar displays correctly with orange branding
- [ ] Help modal has orange headers (open via ? button)
- [ ] Tutorial has orange highlights (localStorage reset if needed)
- [ ] SettingsPanel shows orange Save button
- [ ] Waveform display shows cyan traces
- [ ] Phasor diagram shows cyan vectors
- [ ] All modals have consistent borders and shadows
- [ ] Language selector has orange active pill

### Functional QA
- [ ] Help modal opens/closes cleanly
- [ ] Tutorial steps forward/back correctly
- [ ] Settings save with orange button feedback
- [ ] Waveform rendering smooth (no console errors)
- [ ] Phasor diagram interactive (zoom, rotate if applicable)
- [ ] No visual glitches on any page

### Browser/Platform
- [ ] Chrome: Colors accurate, fonts load
- [ ] Firefox: Layout intact
- [ ] Dark theme: No contrast issues

---

## Phase 4 Validation Checklist

### Architecture Review
- [ ] No breaking changes to component props
- [ ] No new dependencies added
- [ ] CSS variables properly scoped
- [ ] Z-index hierarchy respected

### Code Quality
- [ ] No hardcoded colors (all use CSS variables)
- [ ] Hover states follow design system
- [ ] Accessibility maintained (color contrast >= 4.5:1)
- [ ] No duplicate styles (DRY principle)

### Branding Completeness
- [ ] "RelayLab 360" appears in all appropriate places
- [ ] "ReGrid Pro 1000" in metadata/relay info
- [ ] No "Relay Tester Pro" or "VPR-700" visible
- [ ] Orange/cyan segregation rules followed
- [ ] All text uses correct font family (--fh, --fm, --fi)

---

## Rollback Plan

If issues arise:
1. Revert changes to appStyles.js (contains design tokens)
2. Revert changes to individual component files
3. Rebuild: `npm run build`
4. Return to previous state within 5 min

---

## Success Criteria

**Build**: ✅ No errors, all assets included
**Visual**: ✅ Orange/cyan branding visible, consistent, professional
**Functional**: ✅ All features work, no console errors
**Brand**: ✅ Complete RelayLab 360 identity applied
