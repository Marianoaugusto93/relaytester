# Phase 5: Testing & Accessibility — Specification

## Overview
Comprehensive testing and accessibility audit of RelayLab 360 after Phase 4 (UI/UX Polish) completion. Scope: WCAG 2.1 Level AA compliance, keyboard-only navigation, screen reader compatibility, cross-browser support, and mobile responsiveness.

## Acceptance Criteria

### 1. WCAG 2.1 Level AA Compliance (Primary)
**Success Criteria to Verify:**
- 1.4.3 Contrast (Minimum) — text/background ratios ≥ 4.5:1 (normal) / ≥ 3:1 (large)
- 2.1.1 Keyboard — all functionality keyboard accessible
- 2.1.2 No Keyboard Trap — focus not trapped unless modal/dialog
- 2.4.3 Focus Order — logical tab order
- 2.4.7 Focus Visible — focus indicator visible on all interactive elements
- 3.2.1 On Focus — no unexpected behavior on focus alone
- 3.3.1 Error Identification — error messages clear and associated with input
- 4.1.2 Name, Role, Value — semantic HTML, ARIA attributes correct

**Testing Method:**
- Automated: axe DevTools, Lighthouse, WAVE
- Manual: color contrast checker (Stark, Color Contrast Analyzer)
- Sample pages: App root, Tutorial, Help Modal, SettingsPanel
- Tools: Chrome DevTools (Lighthouse), Firefox accessibility inspector

### 2. Keyboard-Only Navigation
**Scope:** All interactive elements accessible via keyboard (Tab, Shift+Tab, Enter, Space, Escape)

**Test Cases:**
- Tab order flows logically top→bottom, left→right
- No elements "stuck" during Tab traversal
- Tutorial: Step navigation (Prev/Next/Skip via keyboard)
- Help Modal: Topic nav, expandable sections, close via Escape
- Settings Panel: Input fields, buttons, dropdowns, checkboxes
- Protection Settings: All inputs/toggles accessible
- Relay Display: All sections keyboard-navigable
- Edge case: Modal focus trapping (focus doesn't escape)

**Verification:**
- User tests keyboard-only navigation without mouse
- Document any skipped elements or logical gaps
- Verify focus indicators visible at each step

### 3. Screen Reader Compatibility
**Scope:** NVDA (Windows), JAWS (if available), or online testing tool

**Test Checklist:**
- Page title/heading announces correctly
- Form labels associated with inputs (ARIA labels work)
- Button purposes clear (aria-label, text content)
- Modal role="dialog" announced correctly
- Expandable sections (aria-expanded) announced
- Status updates (trip events, relay state) announced
- Link text meaningful (not "click here")
- Table headers announced correctly (Output/Input matrices)

**Tools:**
- NVDA (free, Windows-native)
- WebAIM screenreader tests online tool
- axe accessibility plugin (simulates screen reader output)

### 4. Cross-Browser Testing
**Browsers:**
- Chrome (latest) — baseline
- Firefox (latest) — rendering, form inputs
- Safari (if macOS available) — webkit-specific issues
- Edge (latest) — Chromium-based, compatibility check
- Mobile: iOS Safari (if available), Chrome Android

**Scope:** Visual consistency, functional correctness, layout stability

**Test Points:**
- Page loads without errors (console clean)
- Phasors render correctly (3D visualization / canvas elements)
- Relay panel displays properly (grid layout, font rendering)
- Modals centered and properly styled
- Dropdowns functional and styled
- SVG diagrams (wiring, ladder) render correctly
- File I/O (save/load) works
- COMTRADE export downloads correctly

### 5. Mobile Responsiveness
**Viewport Sizes to Test:**
- iPhone 12 (390×844)
- iPad (768×1024)
- Android tablet (600×960)
- Generic mobile (375×667)

**Test Cases:**
- All layouts stack vertically (mobile-first)
- Touch targets ≥ 44×44px (Apple HIG)
- No horizontal scroll on mobile
- Modals sized appropriately (responsive max-width)
- Tables scroll horizontally if needed (not wrapped awkwardly)
- Navigation pills adapt to narrow screens
- Tutorial/Help modals readable on small screens
- Phasor injection on mobile (if applicable)

**Tools:**
- Chrome DevTools device emulation
- Firefox responsive design mode
- Real device testing (if available)

## Test Execution Plan

### Phase 2 (Execution) Tasks

**Task 1: Automated Compliance Scanning (30 min)**
- Run axe DevTools on all pages
- Run Lighthouse accessibility audit
- Document any WCAG violations
- Export results (screenshot, JSON)

**Task 2: Manual Keyboard Navigation Test (45 min)**
- Disable mouse, navigate entire app with Tab/Shift+Tab
- Test Tutorial (Step 1-6, Escape, Previous/Next)
- Test Help Modal (Tab through topics, expandable sections, close)
- Test SettingsPanel (all inputs, dropdowns, buttons)
- Document any focus issues or trapped elements

**Task 3: Screen Reader Testing (45 min)**
- Launch NVDA (or online tool)
- Test page announcement (title, main headings)
- Test form labels and inputs
- Test modals and dialogs
- Test status updates (relay trip events)
- Document output clarity and any missing ARIA

**Task 4: Cross-Browser Testing (1 hour)**
- Test Chrome, Firefox, Safari (if available), Edge
- Verify page loads without console errors
- Check visual consistency (colors, fonts, layout)
- Verify functionality (phasors, file I/O, modals)
- Document any browser-specific issues

**Task 5: Mobile Responsiveness Testing (45 min)**
- DevTools: iPhone 12, iPad, Android tablet, 375×667
- Verify layouts stack vertically
- Check touch target sizes
- Test navigation on mobile
- Document any layout issues or missing responsive rules

### Phase 3 (QA)
- Compile all test results
- Identify blocking vs. non-blocking issues
- Categorize by WCAG criterion, browser, viewport
- Generate summary report

### Phase 4 (Validation)
- Architect: Completeness of test coverage
- Code-reviewer: Test methodology quality
- Security-reviewer: (if any security considerations in accessibility testing)

## Deliverables

1. **Automated Test Report** (axe + Lighthouse)
   - Violations by severity
   - Affected components
   - Remediation guidance

2. **Manual Test Report**
   - Keyboard navigation results (pass/fail per component)
   - Screen reader testing outcomes
   - Cross-browser findings
   - Mobile responsiveness summary

3. **Accessibility Audit Summary**
   - WCAG 2.1 Level AA compliance: Y/N + details
   - Known issues and workarounds
   - Priority fixes vs. future enhancements

4. **Test Evidence**
   - Screenshots of console (clean state)
   - NVDA output samples
   - Lighthouse scores by browser
   - Mobile screenshots

## Known Constraints

- No automated Selenium/Playwright tests (per CLAUDE.md: "no test suite configured")
- Screen reader testing relies on free tools (NVDA) or online simulators
- Cross-browser testing limited to available browsers (local machine)
- Mobile testing via DevTools emulation (prefer real devices if available)
- Visual regression testing manual (screenshot comparison)

## Success Definition

✓ All WCAG 2.1 Level AA must-have criteria verified  
✓ Keyboard navigation fully functional (no trapped focus)  
✓ Screen reader announces all critical content  
✓ No breaking issues in major browsers (Chrome, Firefox, Edge)  
✓ Mobile layouts stack properly, no horizontal scroll  
✓ Report documents findings and recommends next steps  

## Time Estimate

- Execution: 3.5 hours (5 parallel tasks)
- QA: 0.5 hours
- Validation: 0.5 hours
- **Total: ~4.5 hours**

## Notes

- Phase 5 is testing-focused (no code changes expected unless critical a11y issues found)
- Results inform Phase 6 roadmap prioritization
- If critical WCAG violations found, may require patches before Phase 6
- User should run manual tests in their browser environment (this spec guides the process)
