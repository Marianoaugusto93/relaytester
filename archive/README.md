# Archive Directory Structure

This directory contains files and documentation from completed project phases and refactoring efforts.

## Folders

### coordenograma-refactoring/
Files from Phase 0 (2026-06-02): Refactoring of coordination diagram (Coordenograma) module.

**Contents:**
- src-coordenograma/ — Development/source files for the coordenograma module
- *.md / *.txt — Documentation from refactoring process
  - ANALISE_COORDENOGRAMA.md — Technical analysis
  - REFACTORING_SUMMARY.md — Summary of changes
  - COORDENOGRAMA_STATUS.txt — Final status
  - And others documenting the refactoring effort

**Status**: ✅ Integration complete. App now has a 7th tab ("📊 Coordenograma") that loads the coordenogram visualization from /public/coordenograma/index.html.

**Note**: The production coordenograma files are in /public/coordenograma/ (CSS, JS, HTML). This archive contains the development source files and documentation.

### original-sources/
Original source files and materials from before refactoring efforts.

**Contents:**
- 	cc_relatorio/ — Original TCC report folder (source material for coordenograma extraction)

### phase-notes/
Documentation and notes from each project phase.

**Contents:**
- phase-0-expansion/ — Phase 0 (2026-06-03) expansion notes and specification

### status-reports/
Historical status/progress/completion reports moved from the repository root (2026-06-26 cleanup). Snapshots of completed phases — not used by the build. Includes FINAL_STATUS_*, PHASE*_COMPLETION, ANALISE_*, PROJECT_PROGRESS_FINAL, etc.

### powerflow-core-notes/
Phase 5/6 implementation and test-plan notes that previously lived inside src/simulators/powerflow/core/ (PHASE_6_IMPLEMENTATION.md, PHASE_6_TEST_PLAN.md, README_PHASES_5_6.md).

### test-scripts/
Ad-hoc one-off verification scripts from the root (test-refactored.mjs, test-svg-render.mjs) — not part of the Vitest suite.

## Timeline

- **2026-05-28**: Coordenograma refactoring initiated (extracting from 723 KB monolithic HTML)
- **2026-06-02**: Refactoring completed; integration testing
- **2026-06-03**: Directory reorganization and archiving

## Why Archive?

These files document a completed, successful refactoring. They are kept for reference and historical purposes but are not required for day-to-day development. The application uses production files in /public/coordenograma/ only.

## Next Steps

For Phase 15 development (Visual Scenario Editor, Analytics Dashboard, etc.), refer to .omc/plans/autopilot-impl.md for the implementation roadmap.
