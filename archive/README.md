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

## Timeline

- **2026-05-28**: Coordenograma refactoring initiated (extracting from 723 KB monolithic HTML)
- **2026-06-02**: Refactoring completed; integration testing
- **2026-06-03**: Directory reorganization and archiving

## Why Archive?

These files document a completed, successful refactoring. They are kept for reference and historical purposes but are not required for day-to-day development. The application uses production files in /public/coordenograma/ only.

## Next Steps

For Phase 15 development (Visual Scenario Editor, Analytics Dashboard, etc.), refer to .omc/plans/autopilot-impl.md for the implementation roadmap.
