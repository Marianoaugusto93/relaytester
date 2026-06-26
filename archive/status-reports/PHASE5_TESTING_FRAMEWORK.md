# Newton-Raphson Phase 5: Testing & QA Framework

**Date**: 2026-06-05  
**Status**: 🟡 **TESTING FRAMEWORK READY**  
**Purpose**: Comprehensive manual testing guide for Phase 5 QA

---

## 📋 PHASE 5 TESTING OVERVIEW

### Testing Categories
1. **Cross-Browser Compatibility** (15 min per browser × 4 = 1 hour)
2. **Feature Verification** (45 min - all features manual test)
3. **Performance Testing** (20 min - solver + rendering)
4. **Accessibility Testing** (30 min - WCAG audit)
5. **Regression Testing** (30 min - verify no regressions)
6. **Edge Case Testing** (30 min - unusual scenarios)

**Total Estimated Time**: 3-4 hours of manual testing

---

## ✅ TEST PLAN: FEATURE VERIFICATION

### 1. Diagram Editor Tools (11 Tools × 2 min each = 22 minutes)

#### ✅ Select Tool
```
Procedure:
  1. Click "Select" button in toolbar
  2. Click on a bus in diagram
  3. Verify: Bus should highlight with blue stroke
  4. Click on another bus
  5. Verify: Previous bus deselects, new bus highlights
  6. Press Escape
  7. Verify: Bus deselection, tool returns to select
```

#### ✅ Pan Tool
```
Procedure:
  1. Click "Pan" button in toolbar
  2. Click and drag on diagram
  3. Verify: Diagram pans smoothly
  4. Use Arrow keys to pan
  5. Verify: Diagram pans with keyboard
```

#### ✅ Add Bus
```
Procedure:
  1. Click "Add Bus" button
  2. Click on diagram canvas
  3. Verify: New bus appears
  4. Verify: Bus ID increments
  5. Verify: Auto-solve executes
```

#### ✅ Add Generator
```
Procedure:
  1. Select a bus
  2. Click "Add Generator" button
  3. Verify: Generator indicator appears
  4. Verify: Generator table updates
  5. Verify: Auto-solve executes
```

#### ✅ Add Load
```
Procedure:
  1. Select a bus
  2. Click "Add Load" button
  3. Verify: Load is added to bus
  4. Verify: Load table updates
  5. Verify: Auto-solve executes
```

#### ✅ Add Line (2-click)
```
Procedure:
  1. Click "Add Line" button
  2. Click first bus
  3. Verify: Status shows "Click another bus..."
  4. Click second bus
  5. Verify: Line is created between buses
  6. Verify: Branch table updates
  7. Verify: Auto-solve executes
```

#### ✅ Add Transformer (2-click)
```
Procedure:
  1. Click "Add Transformer" button
  2. Click first bus
  3. Click second bus
  4. Verify: Transformer is created
  5. Verify: Can edit tap ratio and phase shift
```

#### ✅ Add PST (Phase-Shift Transformer)
```
Procedure:
  1. Click "Add PST" button
  2. Click first bus
  3. Click second bus
  4. Verify: PST is created
  5. Verify: Phase shift parameter available
```

#### ✅ Add Capacitor
```
Procedure:
  1. Click "Add Capacitor" button
  2. Click on bus
  3. Verify: Capacitor is added
  4. Verify: Shunt table updates
```

#### ✅ Add Reactor
```
Procedure:
  1. Click "Add Reactor" button
  2. Click on bus
  3. Verify: Reactor is added
  4. Verify: Shunt table updates
```

#### ✅ Delete Tool
```
Procedure:
  1. Click "Delete" button
  2. Select a bus
  3. Verify: Confirmation dialog appears
  4. Click OK
  5. Verify: Bus and connected branches deleted
  6. Verify: Tables update
  7. Verify: Auto-solve executes
```

---

### 2. Equipment Editor (5 Tabs × 5 min each = 25 minutes)

#### ✅ Buses Tab
```
Procedure:
  1. Click "Equipment" button
  2. Verify: Equipment modal opens with Buses tab
  3. Verify: List shows all buses with ID, Type, V, θ, P, Q
  4. Click "Edit" on a bus
  5. Verify: Advanced properties form opens
  6. Change a property (e.g., Voltage Magnitude)
  7. Click "Save Properties"
  8. Verify: Bus list updates
  9. Verify: Diagram updates
  10. Verify: Auto-solve executes
```

#### ✅ Generators Tab
```
Procedure:
  1. Switch to Generators tab
  2. Verify: List shows all generators
  3. Click "Edit" on a generator
  4. Change Zgen r or x value
  5. Click "Save Properties"
  6. Verify: Generator table updates
  7. Verify: Auto-solve executes
```

#### ✅ Loads Tab
```
Procedure:
  1. Switch to Loads tab
  2. Verify: List shows all loads
  3. Click "Edit" on a load
  4. Change load model (ZIP, Constant, etc.)
  5. Modify P and Q values
  6. Click "Save Properties"
  7. Verify: Load table updates
  8. Verify: Auto-solve executes
```

#### ✅ Branches Tab
```
Procedure:
  1. Switch to Branches tab
  2. Verify: List shows all branches
  3. Click "Edit" on a branch
  4. Verify: Branch properties form opens
  5. Change R, X, or B values
  6. For transformer: Change tap ratio or phase shift
  7. Click "Save Properties"
  8. Verify: Branch table updates
  9. Verify: Auto-solve executes
```

#### ✅ Shunts Tab
```
Procedure:
  1. Switch to Shunts tab
  2. Verify: List shows capacitors and reactors
  3. Click "Add" button
  4. Verify: New shunt can be added
  5. Click "Remove" button
  6. Verify: Shunt is deleted
  7. Verify: Auto-solve executes
```

---

### 3. Visualization Features (5 modes + 6 labels = 11 × 2 min = 22 minutes)

#### ✅ Display Mode Buttons
```
Procedure:
  1. Click "Power Flow" button
  2. Verify: Button highlights blue
  3. Verify: Diagram renders normally
  4. Click "Current" button
  5. Verify: Lines color by current magnitude
  6. Click "Loading %" button
  7. Verify: Lines color by loading percentage
  8. Click "Voltage" button
  9. Verify: Bus circles and labels color by voltage (blue→red)
  10. Click "Angle" button
  11. Verify: Bus circles and labels color by angle (blue→red)
```

#### ✅ Label Visibility Checkboxes
```
Procedure:
  1. Uncheck "Bus ID"
  2. Verify: Bus ID labels disappear
  3. Uncheck "Voltage"
  4. Verify: Voltage labels disappear
  5. Uncheck "Angle"
  6. Verify: Angle labels disappear
  7. Uncheck "Power"
  8. Verify: P/Q labels disappear
  9. Uncheck "Branch Name"
  10. Verify: Branch name labels disappear
  11. Uncheck "Generator"
  12. Verify: "G" indicators disappear
  13. Re-check all to restore
```

---

### 4. Fullscreen Mode (5 minutes)

```
Procedure:
  1. Click "Fullscreen" button
  2. Verify: Diagram expands to full viewport
  3. Verify: Right panel (controls) hidden
  4. Verify: Floating toolbar appears in top-right
  5. Click zoom buttons in floating toolbar
  6. Verify: Zoom in/out works
  7. Click "✕" button in floating toolbar
  8. Verify: Fullscreen exits, layout returns to normal
```

---

### 5. Keyboard Shortcuts (15 shortcuts × 1 min = 15 minutes)

```
Procedure:
  For each shortcut:
  1. Press the key combination
  2. Verify: Expected action occurs
  
  Test cases:
  - Arrow Keys: Pan canvas
  - + / - : Zoom in/out
  - 0: Reset view
  - R: Reset view (alternate)
  - F: Fit to view
  - H / Home: Fit to view (alternate)
  - Delete: Delete selected element
  - Esc: Cancel/Deselect
  - Ctrl+S: Save Model dialog opens
  - Ctrl+L: Load Model dialog opens
  - ?: Equipment modal opens (if available)
```

---

### 6. Model Save/Load (10 minutes)

```
Procedure:
  1. Create a simple network (3-4 buses, 2 lines)
  2. Add a generator and load
  3. Click "Save Model" button
  4. Verify: File download dialog appears
  5. Save the JSON file to desktop
  6. Click "Clear All" button
  7. Verify: All elements removed
  8. Click "Load Model" button
  9. Select the saved JSON file
  10. Verify: Network is restored
  11. Verify: All parameters match original
```

---

### 7. Scenario Loading (5 minutes)

```
Procedure:
  1. Click scenario dropdown at bottom
  2. Select "IEEE 5-Bus System"
  3. Verify: Network loads with 5 buses
  4. Verify: Auto-solve executes
  5. Select "IEEE 14-Bus System"
  6. Verify: Network loads with 14 buses
  7. Verify: Auto-solve executes
```

---

## 🌐 TEST PLAN: CROSS-BROWSER COMPATIBILITY

### Browsers to Test
- ✅ Chrome (verified, primary)
- ⏳ Firefox
- ⏳ Safari
- ⏳ Edge

### Test Procedure (for each browser)
```
1. Open http://localhost:5175
2. Run Feature Verification checklist (above)
3. Verify layout renders correctly
4. Verify all colors display properly
5. Verify interactions responsive
6. Check console for errors (F12 → Console)
7. Verify no warnings or errors present
8. Test touch events (if applicable on mobile)
```

### Known Issues to Check
- Hover states display properly
- Animations are smooth (60fps)
- Text is readable and properly formatted
- SVG elements render correctly
- All buttons are clickable
- Forms are accessible

---

## ⚡ TEST PLAN: PERFORMANCE TESTING

### Solver Performance
```
Procedure:
  1. Create network with 5 buses, 4 lines
  2. Open browser DevTools (F12)
  3. Go to Performance tab
  4. Start recording
  5. Click "Add Bus"
  6. Stop recording
  7. Check timeline: should show solver execution <500ms
  
Expected Results:
  - Solver execution: <500ms
  - SVG rendering: ~16ms (60fps)
  - No lag or stuttering
```

### Diagram Rendering Performance
```
Procedure:
  1. Zoom in/out rapidly 10 times
  2. Pan around the diagram
  3. Verify: Rendering is smooth at 60fps
  4. Open Equipment modal
  5. Verify: Modal appears without lag
  6. Close Equipment modal
  7. Verify: Diagram re-renders smoothly
```

### Memory Usage
```
Procedure:
  1. Open DevTools → Memory tab
  2. Take heap snapshot
  3. Note memory usage: ~50-100 MB expected
  4. Interact with application for 5 minutes
  5. Take another heap snapshot
  6. Verify: Memory doesn't grow unbounded
  7. Memory increase <20 MB is acceptable
```

---

## ♿ TEST PLAN: ACCESSIBILITY TESTING

### Keyboard Navigation
```
Procedure:
  1. Tab through all interactive elements
  2. Verify: Focus indicators visible (cyan outline)
  3. Verify: Can operate all buttons with keyboard
  4. Verify: Can navigate form fields with Tab/Shift+Tab
  5. Verify: Can submit forms with Enter
  6. Verify: Can close modals with Escape
```

### Screen Reader Testing (with NVDA/JAWS)
```
Procedure:
  1. Enable screen reader
  2. Tab to interactive element
  3. Verify: Element role announced (button, checkbox, etc.)
  4. Verify: Label text announced
  5. Verify: State announced (checked, disabled, etc.)
  6. Test all form fields
  7. Test all buttons
  8. Test modal dialogs
```

### Color Contrast Verification
```
Procedure:
  1. Check color contrast ratio using browser extension
  2. Verify: All text ≥ 4.5:1 contrast ratio
  3. Verify: Focus outline is visible (cyan, 2px)
  4. Verify: Heatmap colors are distinguishable
  5. Verify: Error messages are visible and readable
```

---

## 🔄 TEST PLAN: REGRESSION TESTING

### Phase 1 Features
```
Verify all diagram tools still work:
- [ ] Select tool functional
- [ ] Pan tool functional
- [ ] Add Bus tool functional
- [ ] Add Generator tool functional
- [ ] Add Load tool functional
- [ ] Add Line tool functional
- [ ] Add Transformer tool functional
- [ ] Add PST tool functional
- [ ] Add Capacitor tool functional
- [ ] Add Reactor tool functional
- [ ] Delete tool functional
```

### Phase 2 Features
```
Verify all equipment editing still works:
- [ ] Bus editing functional
- [ ] Generator editing functional
- [ ] Load editing functional
- [ ] Branch editing functional
- [ ] Shunt equipment functional
```

### Phase 3 Features
```
Verify all visualization still works:
- [ ] Display mode switching functional
- [ ] Label visibility toggles functional
- [ ] Color-coded rendering functional
- [ ] Heatmaps display correctly
```

### Phase 4 Features
```
Verify all polish features still work:
- [ ] Fullscreen mode functional
- [ ] Tooltips display on hover
- [ ] Keyboard shortcuts functional
- [ ] Animations smooth
- [ ] Responsive design working
```

---

## 🧪 TEST PLAN: EDGE CASE TESTING

### Large Networks
```
Procedure:
  1. Create network with 20+ buses
  2. Verify: Diagram renders correctly
  3. Verify: Solver completes (<500ms)
  4. Verify: Tables display all items
  5. Verify: No performance degradation
```

### Empty Network
```
Procedure:
  1. Click "Clear All"
  2. Verify: Diagram is empty
  3. Verify: Tables are empty
  4. Verify: Status shows "Ready"
  5. Click "Add Bus"
  6. Verify: Network starts fresh
```

### Malformed Input
```
Procedure:
  1. Try to input invalid values in forms:
     - Negative impedance values
     - Non-numeric values in numeric fields
     - Empty required fields
  2. Verify: Validation prevents invalid input
  3. Verify: Error messages display
```

### Solver Non-Convergence
```
Procedure:
  1. Create network with impossible parameters
     (e.g., contradictory power flow requirements)
  2. Verify: Solver reports non-convergence
  3. Verify: Status shows error message
  4. Verify: No crashes or hangs occur
```

---

## 📝 TEST EXECUTION CHECKLIST

### Pre-Testing Setup
- [ ] Development environment running (`npm run dev`)
- [ ] Server accessible at http://localhost:5175
- [ ] Browser DevTools available (F12)
- [ ] Screen reader installed (NVDA or JAWS for accessibility testing)
- [ ] Color contrast checker installed (browser extension)
- [ ] Test checklist printed or displayed

### Testing Execution
- [ ] Feature verification completed (all 11 tools)
- [ ] Equipment editor tested (all 5 tabs)
- [ ] Visualization features tested (all 5 modes + 6 labels)
- [ ] Fullscreen mode tested
- [ ] Keyboard shortcuts verified (15+ shortcuts)
- [ ] Model save/load tested
- [ ] Scenario loading tested
- [ ] Cross-browser testing completed (4 browsers)
- [ ] Performance testing completed (solver, rendering, memory)
- [ ] Accessibility testing completed (keyboard, screen reader, contrast)
- [ ] Regression testing completed (all phases)
- [ ] Edge case testing completed (large networks, empty, malformed input)

### Post-Testing Documentation
- [ ] Test results documented
- [ ] Any issues logged with:
  - Browser/OS information
  - Steps to reproduce
  - Expected vs. actual behavior
  - Screenshots if applicable
- [ ] Performance metrics recorded
- [ ] Accessibility audit results recorded
- [ ] Sign-off documentation completed

---

## 📋 BUG TRACKING TEMPLATE

For each issue found during testing:

```
BUG ID: [auto-generated]
Title: [Short description]
Severity: Critical / High / Medium / Low
Browser: [Chrome / Firefox / Safari / Edge]
Steps to Reproduce:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]

Expected Result: [What should happen]
Actual Result: [What actually happened]

Screenshots: [If applicable]
Console Errors: [If applicable]

Status: Open / In Progress / Fixed / Closed
```

---

## ✅ TEST SIGN-OFF

**When all tests pass:**
```
Tested By: [Name]
Date: [Date]
Browser Coverage: [List of browsers tested]
Total Issues Found: [Number]
Critical Issues: [Number]
All Critical Issues Fixed: [Yes/No]
Regression Test Status: [Pass/Fail]
Performance Acceptable: [Yes/No]
Accessibility Compliant: [Yes/No]

RECOMMENDATION: [Release/Hold for fixes/Requires further testing]
```

---

## 🎯 SUCCESS CRITERIA

Phase 5 is **COMPLETE** when:
- ✅ All features verified across all browsers
- ✅ All critical issues identified and fixed
- ✅ Performance meets targets (<500ms solver, 60fps rendering)
- ✅ Accessibility audit passes (WCAG 2.1 AA)
- ✅ No regressions from Phases 1-4
- ✅ Edge cases handled gracefully
- ✅ All tests documented and signed off

---

**This framework provides everything needed to execute comprehensive Phase 5 testing and QA.** 🚀
