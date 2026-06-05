# Phase 6: Advanced Features — Specification

## Overview
Add three major features to RelayLab 360: custom scenario builder, waveform visualization, and multi-language support. Total effort: 6 hours.

## Feature 1: Custom Scenario Builder

### Purpose
Enable users to create, save, edit, and export custom test scenarios without code changes. Replace manual JSON editing with intuitive UI.

### Requirements

**UI Location:** Settings Panel (Relay tab), new "Custom Scenarios" section below Educational Scenarios

**Create Scenario UI:**
- Input field: Scenario name (e.g., "Custom 3-Ph Test")
- Input field: Description (e.g., "My custom fault scenario")
- Dropdown: Difficulty level (Beginner / Intermediate / Advanced)
- Form fields (auto-populated from current state):
  - Phasors: Ia, Ib, Ic, Va, Vb, Vc (magnitude + angle, auto-read)
  - Protection functions (checkboxes: 50, 51, 50N, 51N, 67, 67N, 27, 59, 47)
  - Enabled stages per function (multi-select per function)
  - Output matrix (relay stages → BO/LED mappings)
  - Input matrix (CB status → binary inputs)
- Button: "Save Scenario" (saves to browser localStorage + exports as .json)
- Button: "Export as JSON" (download .json file)
- Button: "Clear" (reset form)

**Scenario List UI:**
- Display saved scenarios (from localStorage)
- Each scenario shows: name, description, difficulty level
- Buttons per scenario: Load, Edit, Delete, Export
- Load: applies scenario (same as Educational Scenarios)
- Edit: populate form with scenario data
- Delete: remove from localStorage with confirmation
- Export: download as .json file

**Data Structure:**
```javascript
{
  id: "custom_<timestamp>",
  type: "custom",
  name: "My Custom Scenario",
  description: "Custom test case",
  difficulty: "Intermediate",
  createdAt: "2026-05-04T23:30:00Z",
  phasors: { Ia: { mag: 5, ang: 0 }, ... },
  protections: { "50": { enabled: true, stages: [1, 2] }, ... },
  patch: { ... },  // override values
  out: { ... },    // Output Matrix
  inp: { ... },    // Input Matrix
  expectedTrip: "50-1",
  expectedTime: 0.05
}
```

**Storage:**
- localStorage key: `customScenarios` (JSON array)
- Persists across browser sessions
- Max 10 scenarios (prevent bloat)
- Export/import as .json for sharing

### Acceptance Criteria
✓ Form captures all phasor, protection, matrix data  
✓ Save creates scenario in localStorage  
✓ Load applies scenario correctly (same as Educational Scenarios)  
✓ Edit populates form from saved scenario  
✓ Delete removes scenario with confirmation  
✓ Export downloads .json file  
✓ Import allows loading .json from file  
✓ UI responsive (mobile-friendly)  
✓ Difficulty levels display visually (color-coded or labeled)

---

## Feature 2: Waveform Visualization

### Purpose
Show real-time phasor animation and trip timeline during injection, helping users understand relay behavior visually.

### Requirements

**Waveform Display (New Card in Painel Tab):**
- Location: Right panel, below Relay Display, above Action Buttons
- Size: 300×200px (responsive)

**Phasor Animation:**
- Animated 3-phase sinusoid (Ia, Ib, Ic)
- Update frequency: 60 FPS (or use requestAnimationFrame)
- Colors: 
  - Ia: Red
  - Ib: Green
  - Ic: Blue
- Amplitude: Current magnitude (from phasors)
- Frequency: 60 Hz (standard power frequency)
- Show: magnitude, frequency, RMS values

**Trip Timeline:**
- Horizontal timeline at bottom of waveform area
- Pre-fault period: 500 ms (gray zone, labeled "Pre-Fault")
- Injection period: variable (labeled "Injection")
- Trip point: marked with vertical red line + label (stage name + time)
- Example: "50-1 trip @ 50ms"

**Controls:**
- Button: "Start Injection" (if not already injecting)
- Button: "Stop" (halt injection, keep waveform on screen)
- Button: "Clear" (reset waveform)
- Checkbox: "Loop" (repeat injection automatically)

**Data Sources:**
- Phasors: read from App.jsx state (Ia, Ib, Ic magnitudes)
- Trip event: from relayTrip callback (stage, time)
- Injection state: from App.jsx (isInjecting, injectionTime)

### Acceptance Criteria
✓ 3-phase sinusoid animates smoothly (60 FPS target)  
✓ Amplitude matches current phasor injection  
✓ Trip point marked on timeline with stage label  
✓ Colors: Red (A), Green (B), Blue (C)  
✓ Timeline shows pre-fault + injection periods  
✓ Controls (Start, Stop, Clear, Loop) functional  
✓ Updates in real-time as injection changes  
✓ Responsive on mobile (scales down gracefully)  
✓ No performance impact on relay simulation  

---

## Feature 3: Multi-Language Support (i18n)

### Purpose
Translate UI to English and Spanish while keeping Portuguese as default. Enable users to select language preference.

### Requirements

**Supported Languages:**
1. Portuguese (pt-BR) — default, fully translated ✓
2. English (en) — new
3. Spanish (es) — new

**Translation Scope:**
- UI labels (buttons, headings, tabs)
- Modals (Help, Tutorial)
- Form labels (Ia, Ib, phasors, protection names)
- Messages (errors, confirmations)
- Help topics (6 sections in HelpModal)
- Tutorial steps (6 steps)

**Language Selector UI:**
- Location: Top-right corner, next to Help button (?)
- Dropdown: Portuguese / English / Español
- Default: Portuguese (pt-BR)
- Save preference: localStorage key `appLanguage`

**Implementation Approach:**
- Create `src/i18n/locales/` folder with translation files:
  - `pt.json` (Portuguese)
  - `en.json` (English)
  - `es.json` (Spanish)
- Create `src/i18n/useTranslation.js` hook
- Wrap App.jsx with language context
- Replace hardcoded strings with translation keys

**Translation Files Structure:**
```javascript
// pt.json (Portuguese - BASE LANGUAGE)
{
  "nav": {
    "campo": "Campo",
    "relay": "Relé",
    "painel": "Painel"
  },
  "labels": {
    "ia": "Ia (Corrente A)",
    "ib": "Ib (Corrente B)",
    "ic": "Ic (Corrente C)",
    ...
  },
  "buttons": {
    "apply": "Aplicar",
    "save": "Salvar",
    "load": "Carregar",
    ...
  },
  "help": {
    "title": "AJUDA & REFERÊNCIA",
    "getting_started": "Como Começar",
    ...
  },
  "tutorial": {
    "step1": { "title": "...", "description": "..." },
    ...
  }
}

// en.json (English)
{
  "nav": {
    "campo": "Field",
    "relay": "Relay",
    "painel": "Panel"
  },
  ...
}

// es.json (Spanish)
{
  "nav": {
    "campo": "Campo",
    "relay": "Relé",
    "painel": "Panel"
  },
  ...
}
```

**Hook Usage:**
```javascript
const { t } = useTranslation();
// In JSX: <button>{t('buttons.apply')}</button>
```

**Files to Modify:**
1. App.jsx — wrap with LanguageProvider, add language selector
2. HelpModal.jsx — use translation keys for topics
3. Tutorial.jsx — use translation keys for steps
4. SettingsPanel.jsx — use translation keys for labels
5. CampoPage.jsx, PainelPage.jsx — use translation keys
6. All components with hardcoded text

### Acceptance Criteria
✓ Portuguese translations complete (existing copy)  
✓ English translations complete  
✓ Spanish translations complete  
✓ Language selector in top-right corner  
✓ Preference persists in localStorage  
✓ All UI switches language on selection  
✓ Help topics translated  
✓ Tutorial steps translated  
✓ No hardcoded strings in components  
✓ Support pluralization (if needed)  
✓ RTL languages (future-proofing)  

---

## Files to Create/Modify

### New Files
- `src/i18n/useTranslation.js` — i18n hook
- `src/i18n/LanguageContext.jsx` — language context provider
- `src/i18n/locales/pt.json` — Portuguese translations
- `src/i18n/locales/en.json` — English translations
- `src/i18n/locales/es.json` — Spanish translations

### Modified Files
- `src/App.jsx` — wrap with LanguageProvider, add language selector
- `src/SettingsPanel.jsx` — add Custom Scenarios section, use translation keys
- `src/HelpModal.jsx` — use translation keys
- `src/Tutorial.jsx` — use translation keys
- `src/CampoPage.jsx` — use translation keys
- `src/PainelPage.jsx` — use translation keys
- `src/RelayDisplay.jsx` — new Waveform component, use translation keys
- `src/appStyles.js` — add styles for Custom Scenarios, Waveform, Language selector

---

## Integration Points

### Custom Scenarios ↔ App.jsx
- Load scenario: call `applyTestPreset(scenario)` (already exists)
- Save scenario: read current state from App.jsx (phasors, protections, matrix)
- Edit scenario: update form from saved scenario

### Waveform ↔ App.jsx
- Read: phasors (Ia, Ib, Ic), isInjecting, injectionTime
- Listen: relayTrip callback (stage, time)
- Animate: requestAnimationFrame in RelayDisplay

### Multi-Language ↔ All Components
- Context API for language state (pt, en, es)
- useTranslation() hook for accessing translations
- Replace all hardcoded strings with t('key.path')

---

## Technical Constraints

- No TypeScript (JSX only)
- No external i18n library (Intl.js / react-intl) — build custom solution
- Use React Context for language state
- CSS-in-JS pattern (appStyles.js)
- Portuguese language strings preserved exactly
- No backend API calls

---

## Success Criteria (Phase 6)

✓ Custom Scenario Builder complete (create, save, load, export, import)  
✓ Waveform Visualization complete (3-phase animation, trip timeline)  
✓ Multi-Language Support complete (pt, en, es with selector)  
✓ Build succeeds (no errors/warnings)  
✓ All 3 features tested end-to-end  
✓ Mobile responsiveness verified  
✓ Code quality approved  

---

## Effort Estimate

- Feature 1 (Custom Scenarios): 2 hours
  - UI form (1h)
  - localStorage persistence (0.5h)
  - Import/export (0.5h)

- Feature 2 (Waveform): 2 hours
  - Phasor animation (1.5h)
  - Trip timeline (0.5h)

- Feature 3 (i18n): 2 hours
  - Translation files + hook (1h)
  - Component refactoring (1h)

**Total: 6 hours**

---

## Dependencies

- Phase 4 (UI/UX Polish) — COMPLETE ✓
- Phase 5 (Testing & Accessibility) — COMPLETE ✓
- No external packages required

---

## Notes

- Custom scenarios stored in localStorage (browser-only; not synced to cloud)
- Waveform uses Canvas or SVG (recommend Canvas for performance)
- i18n is custom solution (no npm packages)
- Phase 6 is "nice-to-have" (LOW priority) but improves user experience significantly
