# Autopilot Implementation Plan — RelaytTester

**Generated**: 2026-05-27 | **Status**: Phase 1 Complete | **Timeline**: 3h 5min (min) → 3h 25min (full)

*[Plan saved from oh-my-claudecode:architect agent — comprehensive execution roadmap]*

## Executive Summary

Three task buckets with clear dependency order:
1. **Translation Unification first** (1.5–2h) — blocks visual polish
2. **Visual Polish second** (40 min)
3. **QA & Validation last** (45 min – 1h)

### Critical Decision: Keep PT/EN/ES (all three locales already complete)

---

## Task 1: Translation Unification (1.5–2h)

### 1.1 Audit i18n key completeness (15 min)
- Verify all three JSON files (pt/en/es.json) have identical key structures
- All currently at 825 lines — structural parity confirmed

### 1.2 Add new i18n keys (20 min)
Add `sectionsUpper`, `buttons`, `hints` namespaces to all three locales with full PT/EN/ES parity

### 1.3 Migrate CampoPage.jsx (35 min)
- Add import: `useTranslation` 
- Replace 20+ hardcoded PT strings with `t()` calls
- Lines: 797, 833, 839, 843, 863, 903, 958, 976, 991, 997, 1004, 1017, 1020, 1027, 1043, 1063, 1068, 1072, 1074, 1081, 1084

### 1.4 Migrate CampoCanvas.jsx (15 min)
- Add import: `useTranslation`
- Replace 11 hardcoded PT strings with `t()` calls
- Lines: 59, 62, 65, 70, 71, 73, 74, 101, 187, 328, 335

### 1.5 Quick wins — adjacent files (15 min, optional)
- `CampoCircuits.jsx`, `InjectionBand.jsx`, `MeasuresPanel.jsx`
- Defer if time-constrained

### 1.6 Verify LanguageSelector (5 min)
- No changes needed — already fully functional

---

## Task 2: Visual Polish (40 min)

### 2.1 Glow animation on terminal selection (15 min)
- Add `@keyframes terminal-pulse` and `terminal-pulse-dest` to CampoCanvas SVG `<defs>`
- Apply `.term-origin` and `.term-valid-dest` classes to `<circle>` elements
- Include `prefers-reduced-motion` media query for accessibility

### 2.2 Increase phase label font sizes (10 min)
- Zone headers: 14→16px
- Section labels: 11→13px, 9→11px
- Phase labels: 13→15px
- Status text: 11→13px, 9→11px

### 2.3 Optimize drag/selection feedback (10 min)
- Add pulse animation to `.banana-jack.sel` and `.borne-opening.sel`
- Animate via `@keyframes jack-selected-pulse` in `campoCSS`

### 2.4 Add status circuits display (5 min)
- Import `CampoCircuits` into CampoPage
- Add to left sidebar below BorneStatusPanel
- Depends on i18n migration (or skip localization for now)

---

## Task 3: QA & Validation (45 min)

### 3.1 Build verification (5 min)
- `npm run build` → exit code 0, size 455–470 kB

### 3.2 Manual testing (25 min)
- Language switching (PT→EN→ES→PT with localStorage check)
- Campo visual polish (pulse animations, font sizes, no clipping)
- Functional regression (presets, switches, scenarios, Painel)
- Browser matrix (Chrome, Firefox, Edge)

### 3.3 Regression sweep (5 min)
- Grep for orphan PT strings in CampoPage.jsx, CampoCanvas.jsx
- Expected: CLEAN (zero hardcoded strings)

### 3.4 Final smoke test (5 min)
- `npm run preview` → http://localhost:4173
- Language toggle, all 3 tabs, no errors

---

## Rollback Points (Safety)

| Point | After | Revert Command |
|-------|-------|-----------------|
| A | 1.2 | `git checkout src/i18n/locales/*.json` |
| B | 1.3 | `git checkout src/CampoPage.jsx` |
| C | 1.4 | `git checkout src/campo/CampoCanvas.jsx` |
| E | 2.1 | Remove keyframes + className from CampoCanvas |
| F | 2.2 | Restore numeric fontSize attributes |
| G | 2.3 | Revert keyframes in campoCSS |

**Safe combined rollback:** `git stash` before starting.

---

## Implementation Order (Dependency-Safe)

```
1. 1.1 (audit JSON) ..................... 15 min
2. 1.2 (add i18n keys) .................. 20 min
3. 1.3 (migrate CampoPage) .............. 35 min
4. 1.4 (migrate CampoCanvas) ............ 15 min
5. 2.2 (font sizes in CampoCanvas) ...... 10 min [depends on 1.4]
6. 2.1 (glow animation) ................. 15 min [depends on 1.4]
7. 2.3 (selection pulse in CampoPage) ... 10 min [depends on 1.3]
8. 2.4 (status circuits display) ........ 5 min  [depends on 1.3 + 1.5]
9. 1.5 (quick wins, optional) ........... 15 min [parallel-safe]
10. QA & Validation ..................... 45 min
```

**Total**: 3h 5min (min) → 3h 25min (with optional 1.5)

---

**Next**: Phase 2 — Executor agents begin implementation in parallel
