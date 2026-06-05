# RelayLab 360 Rebranding — Complete Application Spec

## Overview

Apply complete RelayLab 360 rebranding (from Relay Tester Pro) across all remaining UI components. The design system palette, typography, and nomenclature are partially applied; this work finalizes comprehensive brand consistency.

## Current Status

### ✅ Already Applied
- **index.html**: Title "RelayLab 360"
- **appStyles.js**: Complete design system (colors, typography, CSS variables)
- **App.jsx**: Topbar branding, relay display styling
- **PainelPage.jsx**: Orange tab styling, design tokens
- **comtrade.js**: Relay name "ReGrid Pro 1000", station metadata

### ⚠️ Pending Review/Refinement
- **HelpModal.jsx**: Help system topics — verify orange accents on headers
- **Tutorial.jsx**: Tutorial component — ensure orange highlight boxes
- **WaveformDisplay.jsx**: Waveform visualization — cyan accent for technical data
- **LanguageSelector.jsx**: Language picker — orange pill styling
- **RelayDisplay/**: Relay display components — orange glow on tripped states
- **SettingsPanel.jsx**: Settings and scenario builder — verify orange CTAs
- **CampoPage.jsx**: Field wiring simulator — ensure cyan for technical elements
- **FaultCalculator.jsx**: Fault calculator — orange calculation triggers, cyan results
- **PhasorDiagram.jsx**: Phasor visualization — cyan phasors

### ❓ Verification Needed
- Favicon application (public/favicon.svg should be RelayLab logo)
- All modal overlays using correct z-index and brand colors
- Button hover states consistent with --orange-dim
- Text colors using correct tx/tx2/tx3 palette
- No leftover references to "Relay Tester Pro" or "VPR-700"
- Status indicators (green/red/amber) not mixed with orange/cyan

## Design System Rules

### Color Palette
- **--orange** (#f97316) — PRIMARY BRAND: CTAs, active states, logo
- **--orange-dim** (rgba(249,115,22,.12)) — Backgrounds for orange elements
- **--cyan** (#0ea5e9) — TECHNICAL: values, phasors, technical labels
- **--cyan-dim** (rgba(14,165,233,.1)) — Backgrounds for cyan elements
- **--green** (#4ade80) — STATE: breaker closed, system energized
- **--red** (#f87171) — STATE: trip, fault, error
- **--amber** (#fbbf24) — STATE: spring loaded, transient

### Typography
- **Rajdhani** (--fh) — Headers, titles, navigation
- **JetBrains Mono** (--fm) — Technical data, values, code
- **Inter** (--fi) — Body text, descriptions

### Naming Conventions
- App: **RelayLab 360** (branded everywhere)
- Relay: **ReGrid Pro 1000** (in COMTRADE, status displays)
- Tagline: "INTEGRAL PROTECTION ENGINEERING PLATFORM"
- FILE_HEADER: "# RELAYLAB 360 — Parametrization File"

### Segregation Rules
- Orange/Cyan: Branding + technical data only
- Green/Red/Amber: EXCLUSIVE for logical states (never mixed)

## Scope: Component Updates

### High Priority (Brand Visibility)
1. **HelpModal.jsx** — Orange headers, cyan code blocks
2. **Tutorial.jsx** — Orange highlight boxes, cyan step indicators
3. **SettingsPanel.jsx** — Orange "Save" button, orange pills for scenarios
4. **RelayDisplay.jsx** — Orange glow on trip state, cyan status values

### Medium Priority (Data Presentation)
5. **WaveformDisplay.jsx** — Cyan waveform overlay, orange trip marker
6. **PhasorDiagram.jsx** — Cyan phasors, orange fault condition indicator
7. **FaultCalculator.jsx** — Orange calculate button, cyan result boxes
8. **LanguageSelector.jsx** — Orange language pills, hover effects

### Lower Priority (Consistency)
9. **CampoPage.jsx** — Verify cyan for technical labels (I/V names, ratios)
10. **Verify all modals** — Consistent border colors, shadow depth
11. **Check hover states** — All buttons follow orange-dim on hover
12. **Verify z-indexes** — Modals, overlays, tooltips layered correctly

## Success Criteria

### Visual Consistency
- [ ] No visible "Relay Tester Pro" or "VPR-700" references in UI
- [ ] All primary CTAs use --orange background
- [ ] All hover states use --orange-dim
- [ ] Technical values consistently use --cyan text
- [ ] Status indicators (green/red/amber) never mixed with orange/cyan
- [ ] All headers in --fh (Rajdhani) font

### Functional Verification
- [ ] Build succeeds with no console errors
- [ ] All pages (Campo, Painel) display correct branding
- [ ] Help modal opens/closes with orange accent
- [ ] Tutorial highlights with orange clip-path boxes
- [ ] Waveform display shows cyan elements correctly
- [ ] Language selector works with orange styling
- [ ] Settings panel saves with orange button feedback

### Browser Testing
- [ ] Chrome: Colors render accurately, no visual glitches
- [ ] Firefox: Font loading correct, no FOUC
- [ ] Edge: Gradient fills work as expected
- [ ] No text clipping or overflow issues

## Files Affected

```
src/
  ├── App.jsx (verify topbar brand logo reference)
  ├── HelpModal.jsx (orange headers)
  ├── Tutorial.jsx (orange highlights)
  ├── SettingsPanel.jsx (orange CTAs)
  ├── RelayDisplay.jsx (orange glow)
  ├── WaveformDisplay.jsx (cyan overlays)
  ├── PhasorDiagram.jsx (cyan phasors)
  ├── FaultCalculator.jsx (orange/cyan styling)
  ├── LanguageSelector.jsx (orange pills)
  ├── CampoPage.jsx (verify cyan labels)
  ├── appStyles.js (add any missing component styles)
  └── i18n/locales/*.json (verify "RelayLab 360" text references)

index.html (already done)
public/favicon.svg (verify updated)
```

## Timeline

- **Phase 1 (Planning)**: 15 min — Detailed implementation plan per component
- **Phase 2 (Execution)**: 45 min — Apply all CSS and JSX changes in parallel
- **Phase 3 (QA)**: 20 min — Build, visual inspection, console check
- **Phase 4 (Validation)**: 20 min — Architecture + code quality review

**Total: ~2 hours**

## Notes

- Changes are CSS-first (appStyles.js) then JSX selectors
- No functionality changes — pure visual rebranding
- Maintain accessibility (color contrast, focus states)
- Verify no breaking changes to existing features (Phase 6)
