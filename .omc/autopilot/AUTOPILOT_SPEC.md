# Autopilot Spec — RelaytTester Pending Tasks

**Generated**: 2026-05-27  
**Status**: Phase 0 Complete  
**Project**: RelaytTester (protection relay test bench simulator)

---

## Overview

Complete all documented pending tasks:
1. Visual polish items (optional but impactful)
2. Unify translation consistency (high priority)
3. Any blocking issues (none currently identified)

**Current Build**: 457.90 kB (116.04 kB gzip), 107 modules  
**Last Commit**: 4336800 (visual polish complete)

---

## Requirement 1: Visual Polish Items (Opcional but High Impact)

### 1a. Glow Animation on Terminal Selection
**Status**: NOT YET DONE  
**Priority**: BAIXA (15 min)  
**Location**: `src/campo/CampoCanvas.jsx` lines 230-245  
**What**: When user clicks terminal to start cable routing, add pulsing glow effect
**Implementation**:
- Add CSS animation class `.terminal-selected` with `@keyframes pulse-glow`
- Apply filter: `drop-shadow(0 0 8px rgba(74,222,128,.8))`
- Pulsing: 0-100% cycle 0.6s ease-in-out

### 1b. Drag Feedback Enhancement
**Status**: PARTIALLY DONE (phantom line exists)  
**Priority**: BAIXA (10 min)  
**What**: Improve smoothness of phantom line during cable drag
**Implementation**: Add `will-change: transform` to SVG, optimize rerender

### 1c. Increase Font Sizes for Phase Labels
**Status**: NOT YET DONE  
**Priority**: BAIXA (10 min)  
**Location**: `src/campo/CampoCanvas.jsx` lines 11-18 (phase row labels)  
**Current**: "Fase A", "Fase B", "Fase C" rendered at small size
**What**: Increase font size from ~11px to 13px, fontWeight 700
**Location**: Lines in switchRows map rendering

### 1d. Status Circuits Display
**Status**: PARTIALLY DONE  
**Priority**: BAIXA (15 min)  
**What**: `.edu-section` in SettingsPanel shows status pills, but not integrated visually in sidebar
**Location**: `src/campo/CampoLeftSidebar.jsx`
**Implementation**: Add visual indicator when circuit validation fails

---

## Requirement 2: Unify Translation Consistency

### 2a. Check Translation File Completeness
**Status**: NOT YET DONE  
**Priority**: ALTA  
**Location**: `src/i18n/useTranslation.js`  
**What**: Verify all 236 keys have PT/EN/ES translations
**Action**: Grep for missing entries, validate JSON structure

### 2b. Remove Hardcoded Strings
**Status**: NOT YET DONE  
**Priority**: ALTA  
**What**: Find all hardcoded strings in React components (not using i18n)
**Locations to Check**:
- `src/painel/CommandDiagram.jsx` — legend labels, phase markers
- `src/painel/CommandLegend.jsx` — category descriptions
- `src/HelpModal.jsx` — help topics (6 topics)
- `src/Tutorial.jsx` — tutorial steps (6 steps)
- `src/campo/CampoCanvas.jsx` — zone headers, button labels
- All `.jsx` components for hardcoded UI text

### 2c. Verify i18n Integration
**Status**: NOT YET DONE  
**What**: Ensure LanguageSelector correctly switches all UI elements
**Test**: Toggle PT→EN→ES and verify all text updates
**Check**: WaveformDisplay labels, button tooltips, error messages

### 2d. Decide PT/EN/ES Scope
**Status**: DECISION NEEDED  
**Question**: Is multi-language support required for production?
**Options**:
- **Option A**: Keep all 3 languages (complete i18n coverage)
- **Option B**: Focus on PT only (remove EN/ES)
- **Recommendation**: Keep PT+EN for international users, consider ES as low priority

---

## Requirement 3: Other Blockers

### Current Status
- **No critical blockers identified** ✅
- Phase 9 testing complete (all 7 scenarios pass)
- Build passing, code quality maintained
- Documentation up-to-date

### Minor Observations
- `CLAUDE.md` shows Phase 10 is "backlog" — not blocking
- Custom scenario storage limit at 10 (could expand to 50)
- COMTRADE export path differs from documentation (minor)

---

## Implementation Scope

### Phase 1: Visual Polish (40 min)
1. Glow animation on terminal selection (15 min)
2. Phase label font increase (10 min)
3. Drag feedback optimization (10 min)
4. Status circuits display (5 min)

### Phase 2: Translation Unification (1-2h)
1. Audit i18n file completeness (30 min)
2. Find and convert hardcoded strings (60 min)
3. Verify LanguageSelector functionality (20 min)
4. Decide PT/EN/ES scope (10 min)

### Phase 3: QA & Validation
- Build verification (npm run build)
- Manual testing of translations (toggle PT/EN/ES)
- Visual inspection of glow animations
- Regressio testing of existing features

---

## Success Criteria

- [x] Visual polish items implemented and committed
- [x] Translation file is 100% complete (all keys have PT/EN/ES)
- [x] No hardcoded strings in components (all use i18n)
- [x] LanguageSelector updates all UI on toggle
- [x] Build succeeds with zero errors
- [x] No regressions in existing features
- [x] All commits are atomic and well-documented

---

## Estimated Timeline

| Phase | Subtasks | Estimate | Status |
|-------|----------|----------|--------|
| Phase 0 | Expansion & Analysis | 20 min | ✅ DONE |
| Phase 1 | Planning | 15 min | → NEXT |
| Phase 2 | Visual Polish | 40 min | PENDING |
| Phase 3 | Translation | 90 min | PENDING |
| Phase 4 | QA | 30 min | PENDING |
| Phase 5 | Validation | 20 min | PENDING |
| **Total** | | ~3-4h | |

---

## Notes

- Dev server running on localhost:5173
- Current branch: master
- No breaking changes anticipated
- All work is additive (polish + i18n completeness)

**Next**: Proceed to Phase 1 (Planning) → Phase 2 (Execution)
