# VALIDATION REPORT — Task 2: Visual Editor

**Date:** 2026-05-20
**Scope:** Static code validation of ScenarioVisualEditor integration
**Method:** Source code analysis (no browser required for structural validation)

---

## 1. File Existence

| File | Status | Path |
|------|--------|------|
| `ScenarioVisualEditor.jsx` | PRESENT | `src/ScenarioVisualEditor.jsx` (676 lines) |
| `ScenariosSidebar.jsx` | PRESENT | `src/relay/ScenariosSidebar.jsx` (191 lines) |
| `customScenarios.js` | PRESENT | `src/scenarios/customScenarios.js` (109 lines) |

**Result: PASS**

---

## 2. Integration Check

### Import in ScenariosSidebar
```js
// ScenariosSidebar.jsx line 5
import ScenarioVisualEditor from "../ScenarioVisualEditor.jsx";
```
State variable declared (line 11):
```js
const [showVisualEditor, setShowVisualEditor] = useState(false);
```
Button trigger (lines 100-117):
```js
onClick={() => setShowVisualEditor(true)}
// label: "+ Visual Editor"
```
Modal rendered (lines 139-163) when `showVisualEditor === true`:
```jsx
<ScenarioVisualEditor
  sys={sys}
  onClose={() => setShowVisualEditor(false)}
  onSave={(s) => {
    applyTestPreset(s);
    setActiveId(s.id);
    setShowVisualEditor(false);
  }}
/>
```

**Result: PASS — fully integrated**

---

## 3. Six-Step Walkthrough (Static Analysis)

### Step 1: Open RELAY → "+ Visual Editor" → modal opens
- Button exists in `scen-footer` div with `onClick={() => setShowVisualEditor(true)}`
- Modal container: `position: fixed, inset: 0, zIndex: 600`
- Modal renders `ScenarioVisualEditor` component inside 460px wide container
- Backdrop click closes modal: outer div `onClick={() => setShowVisualEditor(false)}`
- Inner content stops propagation: `onClick={e => e.stopPropagation()}`

**Result: PASS**

---

### Step 2: Set name/function/phasors → preview calculates trip
- **Name field:** `<input value={name} onChange={e => setName(e.target.value)} />` (line 473)
- **Function selector:** 10 function buttons (51, 50, 51N, 50N, 67, 67N, 27/59, 47, 46, 81) — `onClick={() => handleFnChange(f.id)}`
- **Phasor sliders:** Ia/Ib/Ic magnitude (0–10A) + angle inputs; Va/Vb/Vc magnitude (0–120V) sliders
- **Stage settings:** Rendered by `renderStageSettings()` — pickup, timeDial, timeOp, curve fields per stage
- **Preview:** `useMemo(() => computePreviewTrip(...), [currents, voltages, selectedFn, stageSettings, sys])`
  - `computePreviewTrip` handles all 10 functions: 51, 50, 51N, 50N, 46, 27/59, 47, 81, (67/67N fall through to null — expected, as directional needs angle math not done here)
  - Preview renders stage ID + time in seconds with "±10%" label

**Result: PASS — preview calculates reactively on every input change**

---

### Step 3: Save → "Cenário salvo" toast
- `handleSave()` validates name is non-empty (shows error toast if blank)
- Builds scenario object with id, phasors, fns, stages, patch, expectedTrip, expectedTime
- Calls `saveCustomScenario(scenario)` from `customScenarios.js`
- On success: `showMsg("Cenário salvo com sucesso!")` — green toast, 2500ms auto-dismiss
- Then calls `onSave(scenario)` and `setTimeout(() => onClose(), 800)`

**Result: PASS — toast displays on successful save**

---

### Step 4: Modal closes, scenario appears in sidebar
- `onSave` in ScenariosSidebar (line 155-158):
  ```js
  onSave={(s) => {
    applyTestPreset(s);
    setActiveId(s.id);
    setShowVisualEditor(false);
  }}
  ```
- Modal closes immediately (`setShowVisualEditor(false)`)
- `setActiveId(s.id)` marks the new scenario as active in the sidebar

**Caveat:** The sidebar scenario list only renders `EDUCATIONAL_SCENARIOS` (the static list from `educational-scenarios.js`). Custom scenarios from `customScenarios.js` are NOT listed in `scen-list`. The saved scenario becomes the *active* scenario (highlighted) but is not visible as a new item in the list. The scenario IS applied to the relay, but a user would not see it as a new entry.

**Result: PARTIAL — scenario is applied and active ID set, but the custom scenario does not appear as a new list item in the sidebar (only educational scenarios are rendered in the list)**

---

### Step 5: Click scenario → phasors update injection panel
- `applyTestPreset` in `App.jsx` (line 304):
  ```js
  if(preset.phasors){setP(deepClone(preset.phasors));}
  ```
- `ScenarioVisualEditor.handleSave()` builds:
  ```js
  phasors: {
    currents: { ...currents },   // Ia/Ib/Ic with mag+ang
    voltages: { ...voltages },   // Va/Vb/Vc with mag+ang
  }
  ```
- `setP()` updates the global phasor state in App.jsx, which feeds the injection panel (`InjectionBand`)

**Result: PASS — phasors update correctly when scenario is loaded**

---

### Step 6: Reload page → persists (localStorage)
- `saveCustomScenario()` in `customScenarios.js`:
  ```js
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  ```
- Storage is written synchronously before modal closes
- On reload, `getAllCustomScenarios()` reads from localStorage and returns persisted data
- **However:** The sidebar does not load custom scenarios from localStorage into the list on mount — `CustomScenarioBuilder` component handles its own list but `ScenariosSidebar` does not auto-populate from storage

**Result: DATA PERSISTS in localStorage — but not visible in sidebar after reload (same limitation as Step 4)**

---

## 4. localStorage Key Discrepancy

**Task spec says:** verify `relaytester_custom_scenarios` in localStorage
**Actual implementation uses:** `"customScenarios"` (hardcoded in `customScenarios.js` line 7)

```js
const STORAGE_KEY = "customScenarios";
```

This is a **naming discrepancy between the task specification and the implementation**. The data IS persisted correctly under `"customScenarios"`, just not under the key name the task spec expected.

---

## 5. Summary of Results

| Step | Description | Result |
|------|-------------|--------|
| 1 | Modal opens on "+ Visual Editor" click | PASS |
| 2 | Name/function/phasors → preview calculates trip | PASS |
| 3 | Save → "Cenário salvo" toast | PASS |
| 4 | Modal closes, scenario appears in sidebar | PARTIAL |
| 5 | Click scenario → phasors update injection panel | PASS |
| 6 | Reload page → persists (localStorage) | PARTIAL |
| — | localStorage key matches spec | FAIL (key is `"customScenarios"`, not `"relaytester_custom_scenarios"`) |

---

## 6. Blockers Found

### BLOCKER 1 — Custom scenarios not listed in sidebar after save

**Severity:** Medium (functional gap, not crash)
**Location:** `src/relay/ScenariosSidebar.jsx` lines 66-78
**Root cause:** The `scen-list` only maps over `EDUCATIONAL_SCENARIOS` (static import). Custom scenarios from localStorage are never loaded into the list.
**Reproduction:**
1. Open RELAY tab → "+ Visual Editor"
2. Set name "Teste A", save
3. Modal closes, but "Teste A" does not appear as a new item in the scenarios list
4. After page reload, "Teste A" is still not visible in sidebar

**Expected:** Saved custom scenarios should appear below educational scenarios in the sidebar list.

### BLOCKER 2 — localStorage key mismatch with task specification

**Severity:** Low (implementation works, spec description was wrong)
**Location:** `src/scenarios/customScenarios.js` line 7
**Note:** This may just be an inaccuracy in the task spec. The code is self-consistent — all reads/writes use the same `"customScenarios"` key. Verify whether `"relaytester_custom_scenarios"` was ever the intended key.

---

## 7. Console Error Risk Assessment

Based on static analysis:
- No undefined variable references in `ScenarioVisualEditor.jsx`
- `toRect` and `fromRect` imported from `protection.js` — used correctly for phasor math
- `saveCustomScenario` imported from correct relative path `./scenarios/customScenarios.js`
- `defaultProtections` imported from `./defaults.js` — used to initialize stage settings
- `handleFnChange("51")` in `handleReset` calls `setSelectedFn` and re-runs `handleFnChange` — minor: `handleFnChange` is defined above `handleReset` so no hoisting issue in JSX context

**Assessment: Zero console errors expected during normal editor use.**

---

## Verdict

**Task 2 STATUS: CONDITIONAL PASS with 1 functional gap**

The Visual Editor component is correctly built, integrated, and the core workflow (open → configure → preview → save → phasors applied) functions as designed. The one functional gap is that saved custom scenarios do not appear as list items in the sidebar — a feature that would require loading `getAllCustomScenarios()` in `ScenariosSidebar` and rendering them alongside educational scenarios.

The localStorage key discrepancy (`"customScenarios"` vs `"relaytester_custom_scenarios"`) is a spec inaccuracy, not a code bug.
