# Phase 6 Implementation Plan: Advanced Features

## Overview
Implement 3 major features (Custom Scenario Builder, Waveform Visualization, Multi-Language Support) in parallel. Total effort: 6 hours.

## Execution Strategy

### Parallel Execution Model
Features can be parallelized by scope:
- **Track A**: Custom Scenario Builder (localStorage UI) — 2 hours
- **Track B**: Waveform Visualization (Canvas animation) — 2 hours  
- **Track C**: Multi-Language Support (i18n system) — 2 hours

**Timeline:**
- Phase 2 (Execution): Tracks A-C in parallel — 2 hours
- Phase 3 (QA): Build, test, fix — 1 hour
- Phase 4 (Validation): Review all 3 features — 1 hour

---

## Phase 2: Execution Tasks

### Task Group A: Custom Scenario Builder (2 hours)

**Dependency:** None (independent)

**Steps:**

1. **Create UI Form (30 min)**
   - File: `src/SettingsPanel.jsx`
   - Add new section: "Custom Scenarios" (after Educational Scenarios)
   - Form fields:
     - Input: Scenario name
     - Input: Description
     - Dropdown: Difficulty level (Beginner/Intermediate/Advanced)
     - Display (auto-filled from current state):
       - Phasors: Ia, Ib, Ic, Va, Vb, Vc
       - Protection functions (checkboxes)
       - Enabled stages per function
       - Output/Input matrices
   - Buttons: Save, Clear, Export as JSON

2. **Implement localStorage Persistence (30 min)**
   - File: `src/App.jsx` or new `src/scenarios/customScenarios.js`
   - Functions:
     - `saveCustomScenario(scenario)` — save to localStorage
     - `loadCustomScenario(id)` — load from localStorage, call applyTestPreset
     - `deleteCustomScenario(id)` — remove from localStorage
     - `getAllCustomScenarios()` — list saved scenarios
   - Storage key: `customScenarios` (JSON array, max 10 items)

3. **Add Scenario List UI (30 min)**
   - Display saved scenarios in SettingsPanel
   - Buttons per scenario: Load, Edit, Delete, Export
   - Load: call `loadCustomScenario(id)` → applies scenario
   - Edit: populate form from scenario
   - Delete: remove with confirmation
   - Export: download .json file

4. **Import/Export JSON (30 min)**
   - Export: `JSON.stringify(scenario)` → trigger file download
   - Import: File input picker → read .json → save to localStorage
   - Format: standard scenario object (same structure as Educational Scenarios)

**Output:** Custom Scenario Builder fully functional in SettingsPanel

---

### Task Group B: Waveform Visualization (2 hours)

**Dependency:** None (independent)

**Steps:**

1. **Create Waveform Component (45 min)**
   - File: `src/RelayDisplay.jsx` or new `src/WaveformDisplay.jsx`
   - Component props: phasors (Ia, Ib, Ic), isInjecting, injectionTime
   - Size: 300×200px (responsive, use CSS max-width)
   - Canvas-based rendering (or SVG if preferred)

2. **Implement Phasor Animation (45 min)**
   - 3-phase sinusoid: f(t) = A * sin(2π * 60Hz * t + angle)
   - Colors: Red (Ia), Green (Ib), Blue (Ic)
   - Update: requestAnimationFrame (60 FPS)
   - Display amplitude, frequency, RMS values as text overlay
   - Redraw on phasor change or injection state change

3. **Add Trip Timeline (20 min)**
   - Horizontal timeline below waveform
   - Pre-fault zone: 0-500ms (gray)
   - Injection zone: 500ms + (labeled)
   - Trip marker: vertical red line at trip time + label (stage name + ms)
   - Connect to App.jsx relayTrip callback

4. **Add Controls (10 min)**
   - Buttons: Start Injection, Stop, Clear, Loop checkbox
   - Start/Stop: control isInjecting state
   - Clear: reset waveform display
   - Loop: repeat injection automatically (optional)

**Output:** Waveform Display functional in Painel tab

---

### Task Group C: Multi-Language Support (2 hours)

**Dependency:** None (independent)

**Steps:**

1. **Create i18n Infrastructure (30 min)**
   - File: `src/i18n/useTranslation.js` — hook for t() function
   - File: `src/i18n/LanguageContext.jsx` — language context provider
   - Context state: current language (pt, en, es)
   - Function: `setLanguage(lang)` — update language + localStorage

2. **Create Translation Files (45 min)**
   - File: `src/i18n/locales/pt.json` — Portuguese (base, from existing copy)
   - File: `src/i18n/locales/en.json` — English (new)
   - File: `src/i18n/locales/es.json` — Spanish (new)
   - Keys: nav, labels, buttons, messages, help, tutorial
   - Structure: nested JSON for organization (e.g., "buttons.apply", "labels.ia")

3. **Add Language Selector UI (20 min)**
   - File: `src/App.jsx`
   - Location: Top-right corner (next to Help button)
   - Dropdown: Portuguese / English / Español
   - Default: Portuguese
   - Save preference: localStorage key `appLanguage`

4. **Refactor Components for i18n (25 min)**
   - Replace hardcoded strings with `t('key.path')`
   - Files affected:
     - `src/SettingsPanel.jsx` (all labels)
     - `src/HelpModal.jsx` (all topic text)
     - `src/Tutorial.jsx` (all step text)
     - `src/CampoPage.jsx` (labels, tooltips)
     - `src/PainelPage.jsx` (labels, status messages)
     - `src/RelayDisplay.jsx` (labels)
     - `src/App.jsx` (error messages, buttons)

**Output:** Multi-language support fully functional

---

## Parallel Execution Timeline

| Time | Track A (Scenarios) | Track B (Waveform) | Track C (i18n) |
|------|-------|---------|--------|
| 0-30 min | Form UI | Waveform component | i18n infrastructure |
| 30-60 min | localStorage persistence | Phasor animation | Translation files |
| 60-90 min | Scenario list UI | Trip timeline + controls | Language selector |
| 90-120 min | Import/export JSON | Polish + testing | Component refactoring |

**Actual Duration:** ~2 hours (all tracks run in parallel; longest track determines duration)

---

## Phase 3: QA (1 hour)

**Build Verification (20 min):**
- `npm run build`
- Verify: 0 errors, bundle size < 300 kB
- Verify: no console warnings

**Feature Testing (40 min):**

**Track A - Custom Scenarios:**
- [ ] Create scenario form renders
- [ ] Save button stores scenario in localStorage
- [ ] Load button applies scenario correctly
- [ ] Edit button populates form from scenario
- [ ] Delete button removes scenario with confirmation
- [ ] Export downloads .json file
- [ ] Import loads .json file into scenario
- [ ] Max 10 scenarios enforced
- [ ] Mobile responsive

**Track B - Waveform:**
- [ ] Waveform animates smoothly (60 FPS)
- [ ] Colors correct (Red A, Green B, Blue C)
- [ ] Amplitude matches phasor values
- [ ] Trip marker appears at correct time
- [ ] Timeline shows pre-fault and injection zones
- [ ] Start/Stop/Clear buttons work
- [ ] Loop toggle works
- [ ] No performance impact on relay sim
- [ ] Mobile responsive

**Track C - i18n:**
- [ ] Language selector appears in top-right
- [ ] Portuguese (default) displays correctly
- [ ] English translation complete + correct
- [ ] Spanish translation complete + correct
- [ ] Language preference persists in localStorage
- [ ] All UI switches on language change
- [ ] Help topics translated
- [ ] Tutorial steps translated
- [ ] No hardcoded strings visible
- [ ] Mobile responsive

---

## Phase 4: Validation (1 hour)

**Architect Review (20 min):**
- Functional completeness (all 3 features working)
- Architecture sound (composition, state management)
- No major regressions
- Code organization logical

**Code-Reviewer Review (20 min):**
- Code quality (naming, consistency, no smells)
- Performance acceptable (Canvas rendering efficient)
- No memory leaks
- Accessibility maintained (WCAG AA)

**Security Review (10 min):**
- localStorage data safe (no sensitive info stored)
- JSON import safe (no code injection)
- No XSS vulnerabilities

**Sign-off (10 min):**
- All reviewers approve
- Ready for release

---

## Success Criteria

✓ Custom Scenario Builder complete (create, save, load, edit, delete, export, import)  
✓ Waveform Visualization complete (animation, trip timeline, controls)  
✓ Multi-Language Support complete (pt, en, es with selector)  
✓ Build succeeds (0 errors/warnings)  
✓ All features tested end-to-end  
✓ Mobile responsive  
✓ Code quality approved  
✓ Performance acceptable  

---

## Known Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Canvas rendering performance | Low | Use requestAnimationFrame, optimize redraw logic |
| localStorage quota exceeded | Low | Enforce max 10 scenarios, warn user |
| i18n key misses (untranslated strings) | Medium | Grep for hardcoded strings in review phase |
| Multiple language selectors (duplicate UI) | Low | Centralize language selector in App.jsx top-bar |
| Translation quality (grammar) | Medium | Use native speakers or professional translator if needed |

---

## Deliverables Summary

1. **Custom Scenario Builder**
   - UI form in SettingsPanel
   - localStorage persistence
   - List view with CRUD operations
   - Import/export JSON

2. **Waveform Visualization**
   - Canvas-based 3-phase animation
   - Trip timeline with markers
   - Control buttons (Start, Stop, Clear, Loop)

3. **Multi-Language Support**
   - i18n hook + context
   - 3 translation files (pt, en, es)
   - Language selector in top-bar
   - All components using translation keys

---

## Notes

- Custom scenarios stored in localStorage only (no cloud sync)
- Waveform uses Canvas (recommended) or SVG (acceptable)
- i18n is custom solution (no npm packages)
- All features must work on mobile (responsive design)
- Portuguese language strings preserved exactly (use existing copy as base)
- Phase 6 is LOW priority but HIGH user impact

---

## Build & Commit Strategy

1. After execution (Phase 2): commit `feat: add Phase 6 features (scenarios, waveform, i18n)`
2. After QA (Phase 3): verify build, run tests
3. After validation (Phase 4): final approval, ready for merge
4. Final commit: `feat: Phase 6 complete — custom scenarios, waveform visualization, multi-language support`

---

**Prepared by:** Autopilot Phase 1 (Planning)  
**Estimated Duration:** 6 hours total (2h execution + 1h QA + 1h validation + contingency)
