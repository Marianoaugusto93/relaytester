# Phase 5 Implementation Plan: Testing & Accessibility

## Overview
Execute comprehensive testing for RelayLab 360 across WCAG compliance, keyboard navigation, screen reader support, cross-browser compatibility, and mobile responsiveness. Total effort: 4.5 hours.

## Execution Strategy

### Parallel Execution Model
Testing can be parallelized by scope:
- **Track A**: Automated compliance (axe, Lighthouse) — independent
- **Track B**: Keyboard-only navigation — requires manual browser testing
- **Track C**: Screen reader testing — sequential (NVDA/online tool)
- **Track D**: Cross-browser testing — can test multiple browsers in parallel
- **Track E**: Mobile responsiveness — DevTools testing (parallel)

**Timeline:**
- Phase 2 (Execution): Tracks A-E in parallel — 3.5 hours
- Phase 3 (QA): Compile results — 0.5 hours
- Phase 4 (Validation): Review findings — 0.5 hours

---

## Phase 2: Execution Tasks

### Task Group 1: Automated Compliance Scanning (30 min)
**Tools:** Chrome DevTools (Lighthouse), axe DevTools extension

**Steps:**
1. Open http://localhost:5173 in Chrome (or build + preview)
2. Run Lighthouse accessibility audit:
   - DevTools → Lighthouse → tick "Accessibility"
   - Generate report
   - Record: score, violations by severity
3. Install axe DevTools extension
4. Run axe scan on each page:
   - Page 1: Home/Dashboard (App root)
   - Page 2: Campo tab
   - Page 3: Relay tab (SettingsPanel)
   - Page 4: Painel tab
   - Page 5: Help Modal (open via ? button)
   - Page 6: Tutorial (trigger on first load or localStorage clear)
5. Document violations:
   - Severity (critical, serious, moderate, minor)
   - WCAG criterion (1.4.3, 2.1.1, etc.)
   - Affected elements
   - Remediation steps
6. Export results (screenshots + JSON if available)

**Output:** Automated compliance report (violations list, scores)

---

### Task Group 2: Keyboard-Only Navigation Test (45 min)
**Method:** Manual testing — user disables mouse, navigates app using Tab/Shift+Tab/Enter/Escape

**Navigation Flows to Test:**

**A. Main Navigation:**
- [ ] Tab from page load → first focusable element
- [ ] Tab through top-bar (help button, nav pills)
- [ ] Verify focus visible on all elements
- [ ] Verify logical order (left-to-right)
- [ ] Escape/Tab escapes help button without opening modal

**B. Navigation Pills:**
- [ ] Focus nav pill (data-tutorial-target="nav-campo")
- [ ] Press Enter → navigates to Campo tab
- [ ] Tab through next pill (nav-relay)
- [ ] Verify pills are ordered correctly

**C. Tutorial Modal (trigger via localStorage clear or first load):**
- [ ] Tutorial appears on page load
- [ ] Tab through: Prev, Skip, Next, dot buttons, "Não mostrar" checkbox
- [ ] Verify focus visible on all buttons
- [ ] Next button → navigates step, focus remains in bubble
- [ ] Escape → confirmation dialog → confirm → closes
- [ ] Step dots: click via keyboard (Tab + Enter)

**D. Help Modal (click ? button via Tab):**
- [ ] Tab to help button, press Enter
- [ ] Focus should be on close button (or first focusable)
- [ ] Tab through: close button, nav buttons (topics), expandable headers
- [ ] Expandable header: Tab, press Enter → toggle expand
- [ ] Space/Enter both work on expandable headers
- [ ] Shift+Tab → reverse navigation
- [ ] Tab at end → wraps to beginning (focus trap)
- [ ] Escape → closes modal
- [ ] After close, focus should return to help button (verify focus restoration)

**E. Settings Panel Inputs (Relay tab):**
- [ ] Tab through: all input fields, dropdowns, toggles
- [ ] Type numbers in current/voltage inputs
- [ ] Dropdown focus → arrow keys open/select (browser default)
- [ ] Checkboxes: Tab + Space to toggle
- [ ] Apply button: Tab + Enter to apply

**F. Protection Settings (Relay tab):**
- [ ] Tab through function toggles (50, 51, 67, etc.)
- [ ] Tab through stage enables/disables
- [ ] Tab through parameter inputs (pickup, time dial, curve)
- [ ] Verify all inputs reachable

**G. Matrix (Output / Input):**
- [ ] Tab through matrix checkboxes (if interactive)
- [ ] Verify grid navigation logical

**Documentation:**
- [ ] Record any trapped focus (element can't be exited via Tab)
- [ ] Record any skipped elements (focus jumps unexpectedly)
- [ ] Record any missing focus indicators
- [ ] Record logical order issues (Tab goes bottom-to-top, right-to-left)
- [ ] Pass/Fail per section

**Output:** Keyboard navigation test report (pass/fail, issues, screenshots of focus indicators)

---

### Task Group 3: Screen Reader Testing (45 min)
**Method:** NVDA (Windows, free) or online accessibility tool

**Setup:**
1. Download + install NVDA (free from nvaccess.org) — OR use online tool
2. Open http://localhost:5173 in Firefox + NVDA
3. Start NVDA (Ctrl+Alt+N on Windows)
4. Configure: default verbosity, enable speech feedback

**Test Flows:**

**A. Page Title & Main Heading:**
- [ ] NVDA announces page title on load
- [ ] Press H → navigate headings
- [ ] Record heading hierarchy (H1, H2, H3)
- [ ] Verify headings describe page content

**B. Form Labels:**
- [ ] Tab to input field (e.g., Ia current magnitude)
- [ ] NVDA announces: "label text, input field, current value"
- [ ] Verify all inputs have associated labels
- [ ] Check ARIA labels work (if used)

**C. Buttons:**
- [ ] Tab to button
- [ ] NVDA announces: "button text, button"
- [ ] Verify purpose clear (not just "Apply")
- [ ] Check aria-labels for icon-only buttons (help button)

**D. Modals (Help Modal):**
- [ ] Open help modal
- [ ] NVDA announces: "dialog, HELP & REFERENCE"
- [ ] Press H to navigate headings within modal
- [ ] Tab through topics — verify nav buttons announced clearly
- [ ] Expandable section — NVDA announces: "button, Protection Settings, expanded/collapsed"
- [ ] Close modal — NVDA announces role and context

**E. Tutorial Overlay:**
- [ ] NVDA announces tutorial step counter
- [ ] Announces title + description
- [ ] Announces button purposes (Anterior, Pular, Próximo)
- [ ] Announces checkbox ("Não mostrar novamente")

**F. Status Updates (if relay trips during test):**
- [ ] NVDA announces trip event in relay panel
- [ ] Announces protection stage name + trip time

**Documentation:**
- [ ] Record NVDA output for each section (screenshot or log)
- [ ] Note any announcements that are unclear or missing
- [ ] Identify elements that should have aria-labels but don't
- [ ] Verify Portuguese text announced correctly
- [ ] Pass/Fail: all critical content announced

**Output:** Screen reader compatibility report (NVDA output samples, missing ARIA, clarity issues)

---

### Task Group 4: Cross-Browser Testing (1 hour)
**Browsers:** Chrome, Firefox, Edge, Safari (if available)

**Per-Browser Checklist:**

**1. Console Cleanliness:**
- [ ] Open DevTools (F12)
- [ ] Navigate each tab (Campo, Relay, Painel)
- [ ] Open Help Modal, Tutorial
- [ ] Trigger file I/O (save, load)
- [ ] Record: any errors, warnings, stack traces
- [ ] Pass: 0 errors

**2. Visual Consistency:**
- [ ] Colors render correctly (orange, cyan match brand palette)
- [ ] Fonts render (Inter, JetBrains Mono, Rajdhani)
- [ ] Layout pixel-perfect across browsers
- [ ] Modal centering correct
- [ ] SVG diagrams (wiring, ladder, single-line) render
- [ ] No distorted text or icons

**3. Functionality Tests:**
- [ ] Phasors input: type values, apply, verify accepted
- [ ] Dropdowns (curves, functions): open/select work
- [ ] Toggles (50/51 enable): click + state changes
- [ ] File I/O: save → download triggers correctly
- [ ] Load JSON: file picker works, data loads
- [ ] COMTRADE export: generates .zip with .cfg, .dat, .hdr
- [ ] Tutorial: all 6 steps visible, navigation works
- [ ] Help modal: topics switch, expandable sections work
- [ ] Resize/scroll listener: highlight box follows target element
- [ ] Focus trap: Escape closes modals, focus returns

**4. Edge Cases:**
- [ ] Very large window (>1920px width) — layout stable
- [ ] Very small window (800×600) — layout responsive
- [ ] Rapid switching tabs — no visual glitches
- [ ] Hold-and-drag file picker — no hang
- [ ] Rapid modal open/close — no stack-up

**Browsers to Test:**
- Chrome (latest) — 1 hour baseline
- Firefox (latest) — 30 min form/input focus
- Edge (latest) — 20 min compatibility
- Safari (if macOS available) — 20 min webkit issues

**Documentation:**
- Per-browser: pass/fail on console, visuals, functionality
- Screenshot console (should be clean)
- Record any browser-specific issues

**Output:** Cross-browser compatibility report (per-browser matrix, console logs, issues)

---

### Task Group 5: Mobile Responsiveness Testing (45 min)
**Method:** Chrome DevTools device emulation + real device if available

**Viewport Sizes:**
- iPhone 12 (390×844, 460dpi)
- iPad (768×1024)
- Android tablet (600×960)
- Generic mobile (375×667)

**Per-Viewport Tests:**

**A. Layout Responsiveness:**
- [ ] All sections stack vertically (no horizontal scroll)
- [ ] Text readable (not too small)
- [ ] Buttons/inputs clickable (≥44×44px touch targets)
- [ ] Modals fit screen (responsive max-width)
- [ ] Tables scroll horizontally if needed (not wrapped awkwardly)

**B. Navigation:**
- [ ] Top bar adapts (logo, nav pills, help button)
- [ ] Nav pills stack or scroll if needed
- [ ] Settings panel fits without scroll if possible

**C. Tutorial/Help Modals:**
- [ ] Modal width responsive (not 700px fixed)
- [ ] Content readable on small screens
- [ ] Close button reachable
- [ ] Expandable sections work on touch

**D. Phasor Injection:**
- [ ] Inputs fit in viewport
- [ ] Dropdown choices visible
- [ ] Apply button accessible

**E. Protection Settings:**
- [ ] Toggle switches clickable (44px min)
- [ ] Checkboxes properly sized
- [ ] Input fields full-width or sensibly wrapped

**F. Relay Display:**
- [ ] LCD panel readable (font sizes)
- [ ] Relay status section scrollable
- [ ] Action buttons properly spaced

**Tools:**
- Chrome DevTools → Device Toolbar (Ctrl+Shift+M)
- Preset sizes: iPhone 12, iPad, Galaxy Tab

**Documentation:**
- Screenshot each viewport (main page, settings, help modal)
- Note any layout issues (overflow, unreadable text, uncatchable buttons)
- Pass/Fail: layouts responsive, no horizontal scroll

**Output:** Mobile responsiveness report (screenshots per viewport, responsive CSS observations)

---

## Parallel Execution Timeline

**Phase 2 Parallel Tracks (all start simultaneously):**

| Time | Track A (Automated) | Track B (Keyboard) | Track C (ScreenReader) | Track D (CrossBrowser) | Track E (Mobile) |
|------|-------|---------|----------|-----------|--------|
| 0-15 min | axe scan (3 pages) | Tab nav top-bar | NVDA setup | Chrome console | DevTools setup |
| 15-30 min | Lighthouse audit | Tutorial keyboard | Form labels | Chrome functionality | iPhone 12 layout |
| 30-45 min | Violations doc | Help modal keyboard | Modal/buttons | Firefox tests | iPad layout |
| 45-60 min | Export results | Settings inputs | Screen reader output | Edge tests | Mobile modals |
| 60-75 min | — | Matrix nav | Documentation | Safari (if avail) | Android tablet |
| 75-90 min | — | Focus indicators | — | Issue summary | Touch targets |
| 90+ min | — | Issue doc | — | — | Final checks |

**Actual Duration:** ~3.5 hours (all tracks run in parallel, longest track determines duration)

---

## Phase 3: QA (30 min)

**Compilation Tasks:**
1. Aggregate all test results (5 reports)
2. Identify common issues (e.g., focus indicators missing in multiple browsers)
3. Categorize by severity:
   - **Critical**: WCAG violations (hard requirement for AA)
   - **High**: Keyboard/screen reader broken paths
   - **Medium**: Minor a11y gaps (missing aria-labels)
   - **Low**: Polish (color contrast edge cases, minor layout tweaks)
4. Cross-reference: e.g., if Chrome shows issue, verify in other browsers
5. Determine if any issues block Phase 6 or are deferrable

**Output:** Consolidated test summary (5 reports merged, priority matrix)

---

## Phase 4: Validation (30 min)

**Review Checklist:**
- [ ] Test coverage sufficient (all pages, modals, flows tested)
- [ ] Methodology sound (axe + manual, not just automated)
- [ ] Results documented clearly (reproducible, actionable)
- [ ] WCAG compliance verdict clear (AA achieved Y/N, with justification)
- [ ] Browser matrix complete (Chrome, Firefox, Edge, Safari)
- [ ] Mobile testing covered (3+ viewport sizes)
- [ ] Recommendations prioritized (critical vs. nice-to-have)

**Verdict:** Phase 5 testing complete ✓ or Phase 5 incomplete (blockers identified)

---

## Success Criteria

✓ Automated compliance report generated (axe + Lighthouse)  
✓ Keyboard navigation: all flows documented, no trapped focus  
✓ Screen reader: NVDA output verified, critical content announced  
✓ Cross-browser: all 4+ browsers tested, console clean  
✓ Mobile: 4+ viewports tested, responsive layouts verified  
✓ Consolidated report with priorities + recommendations  

---

## Known Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| NVDA install fails | Low | Use online tool (WebAIM accessibility check) |
| Safari unavailable | Medium | Test Edge + Firefox comprehensively, note Safari as deferred |
| Real mobile device unavailable | High | Use DevTools emulation (acceptable for responsive design) |
| Accessibility violations found | Medium | Document + prioritize; may defer non-critical to Phase 6 |
| Browser-specific bugs | Low | If found, escalate to Phase 6 for polishing |

---

## Deliverables Summary

1. **Automated Compliance Report** — axe + Lighthouse results
2. **Keyboard Navigation Report** — flows tested, issues, screenshots
3. **Screen Reader Report** — NVDA output samples, clarity notes
4. **Cross-Browser Report** — per-browser matrix, console logs
5. **Mobile Responsiveness Report** — viewport screenshots, observations
6. **Consolidated Testing Summary** — all 5 reports merged, priority matrix, recommendations

---

## Notes

- Phase 5 is testing-only (no code changes unless critical a11y bugs found)
- Results feed into Phase 6 roadmap + bug fix prioritization
- User can execute manually per plan, or use tools for automation where possible
- All findings should be reproducible and documented with evidence (screenshots, NVDA output, console logs)
