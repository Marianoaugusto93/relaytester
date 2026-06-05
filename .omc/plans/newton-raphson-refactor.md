# Newton-Raphson Power Flow Simulator — Strategic Refactoring Plan

**Plan type:** Consensus (RALPLAN-DR) — Strategic / architectural
**Mode:** DELIBERATE (high-risk: 7,616-line load-bearing simulator, numerically sensitive solver, embedded in production app via iframe)
**Status:** Draft — awaiting Architect + Critic review
**Target artifact:** `public/newton-rapson/powerflow.html` (current) → new modular package under `src/simulators/powerflow/` (new)

---

## 1. Context

The Newton-Raphson Power Flow Simulator is a single self-contained HTML file (`public/newton-rapson/powerflow.html`, 7,616 lines) loaded into RelayLab 360 through a one-line iframe wrapper (`src/SimuladorNRPage.jsx`). It is functionally rich:

| Module (verified by code scan) | Line range | Responsibility |
|---|---|---|
| Solver core | 1492–2186 | `buildYbus`, `solveLinear`, `solvePowerFlow`, Zgen phantom buses, Q-limit enforcement, `_cleanupPhantoms` |
| Controls & diagnostics | 2192–5364 | Input tables, edit handlers, PV curve tracing, convergence diagnostics, GIF/video capture |
| Visualization | 3298–4297 | SVG `renderDiagram`, animation tick, label collision avoidance, voltage/angle heatmaps |
| Interaction | 5695–6717 | Tool palette, bus/branch CRUD, drag/drop on SVG |
| Persistence | 6722–7023 | `modelToJSON`, compact JSON, base64 URL hash, legacy parser |
| Demo | 7347–7602 | 40-bus demo + `DEMO_JSON` baked at load |

**Quantitative facts that drove the analysis:**
- 7 storage/serialization touchpoints (all JSON + URL hash; no `localStorage`, no `IndexedDB`)
- 223 direct DOM calls (`getElementById` / `querySelector` / `innerHTML`)
- **Zero** ES module boundaries; everything is in one `<script>` block sharing globals (`buses[]`, `branches[]`, `view`, `labelVisibility`)
- **Zero** `postMessage` listeners — host React app cannot currently observe or control the simulator
- One previous translation attempt (PT-BR via sed) failed because solver strings and UI strings were entangled (see Appendix A in CLAUDE.md)

**Why now:** Goals 3 (integration) and 5 (customization without forking) are blocked today. The host React app cannot read solver results, drive scenarios, or theme the UI. The PT-BR incident is the canonical evidence that string-level edits are unsafe; structural separation is the only durable fix.

---

## 2. RALPLAN-DR — Principles

1. **Numerics are sacrosanct.** The solver (`buildYbus`, `solvePowerFlow`, `_cleanupPhantoms`, Q-limit logic) must be bit-for-bit preserved. Any refactor that changes a converged voltage/angle by more than 1e-9 p.u. is rejected.
2. **Strangler-fig over rewrite.** The legacy `powerflow.html` keeps serving traffic at `/newton-rapson/` until each extracted module has shipped, been parity-tested, and the iframe has been pointed at the new entry point.
3. **Module boundaries follow data, not lines.** Split where state hand-off is narrow (solver in/out, diagram render in/out), not where line counts happen to balance. A 447-line solver that already takes `(buses, branches) -> result` is the easy boundary; a 2,962-line controls block isn't and must be sub-divided.
4. **One public contract per layer.** Solver exposes `solve(network) -> result`. Visualization exposes `render(network, result, viewport)`. Persistence exposes `toJSON / fromJSON`. No layer reaches across.
5. **Backward compatibility is a feature, not a phase.** The current iframe URL, URL-hash share links, and JSON file format must keep working for the entire migration. A user who bookmarked a 40-bus model in 2026 must still load it in 2027.

## 3. Decision Drivers (Top 3)

1. **Solver fidelity risk.** Newton-Raphson with Q-limit enforcement and Zgen phantom buses is hard to re-derive if broken. Drives the bias toward extracting the solver *first*, with the smallest possible surface change (no rewrite, just module-ize).
2. **Integration ROI.** Goals 3 and 5 (REST API, embedding, customization) require a programmatic boundary the host React app can call. Drives the need for at least a `postMessage` bridge in Phase 1, even before any code is extracted.
3. **Migration safety budget.** This is a production simulator embedded in a deployed Cloudflare app. A big-bang rewrite has unbounded risk; gradual extraction has bounded risk per phase. Drives the phased roadmap and the parity-test gate at every phase boundary.

## 4. Viable Architecture Options

### Option A — In-Place Modularization (ES modules, same folder)

Convert the single HTML into an `index.html` shell + 5–6 ES modules under `public/newton-rapson/modules/`. Keep the iframe entry URL. No bundler, no React, no TypeScript.

**Pros**
- Smallest possible diff to deployment surface (Cloudflare static hosting unchanged).
- Lowest risk to numerics — solver becomes `solver.js` with the same code, just wrapped in `export`.
- Module loading is native browser; no toolchain to maintain.
- Backward compatibility with URL hash is trivial (same parser, same shell).

**Cons**
- Does not solve integration with the React host — still iframe-only unless we add `postMessage`.
- Tree-shaking and bundle optimization are limited without a bundler.
- Testing remains awkward (no Vitest harness; would need a separate setup).
- Customization (Goal 5) still requires forking the HTML or editing modules in place.

**Risk:** LOW (numerics) / HIGH (does not meet Goals 3 + 5 without follow-up work)

### Option B — Extract to npm-style Library + Thin Host Adapter (recommended)

Create a new package `src/simulators/powerflow/` with:
- `core/solver.js` — pure numerics, no DOM, no globals; input `(network, options)`, output `result`
- `core/network.js` — `buses`/`branches` data model + validators + JSON I/O (`toJSON`, `fromJSON`, compact + legacy)
- `view/diagram.js` — SVG renderer, takes `(network, result, viewport, theme)`, returns SVG fragment
- `view/labels.js` — label layout / collision detection
- `view/heatmap.js` — voltage/angle color scales
- `ui/controls.js` — tables, forms, edit handlers (still vanilla JS, framework-agnostic)
- `ui/diagnostics.js` — PV curve, convergence diagnostics, capture (GIF/video)
- `bridge/postMessage.js` — host integration: emits `solver:result`, accepts `network:load`, `scenario:apply`
- `entry/standalone.html` — keeps the legacy single-page experience at `/newton-rapson/`
- `entry/embedded.js` — exports the same modules for React import (`import { Solver } from '@/simulators/powerflow'`)

The host React app gets a new `<PowerFlowEmbedded />` component that can either iframe `entry/standalone.html` (backward-compatible default) or mount `embedded.js` modules directly (new path for integration).

**Pros**
- Solves all 5 goals: modular, separated, integrable, maintainable, customizable via theme/props.
- Solver becomes unit-testable without a browser (Node + Vitest).
- React host can call `solver.solve(network)` directly without an iframe round-trip.
- Customization via theme tokens + module replacement (no forking).
- Aligns with the existing Vite build in the parent repo.

**Cons**
- Larger blast radius — touches build config, React app, and the static HTML.
- Requires a `postMessage` bridge during the transition window (legacy iframe + new embedded path coexist).
- Some browser-only APIs (GIF capture, video MIME) need feature-detection in Node tests.
- Persistence (URL hash + base64) must be tested against legacy share-links before cutover.

**Risk:** MEDIUM — bounded by phased migration and parity tests at every phase boundary.

### Option C — Full React Rewrite

Re-implement the entire simulator as React components (`<Diagram />`, `<Solver />`, `<ControlsPanel />`) using the existing React 18 + Vite stack. Solver becomes a TypeScript module.

**Pros**
- Maximum long-term consistency with the rest of RelayLab 360.
- Best DX for ongoing feature work after migration.
- Can adopt React DevTools, hot reload, etc.

**Cons**
- Highest numerical risk: re-typing the solver in TS invites subtle bugs in Q-limit, Zgen, and Jacobian assembly.
- Largest migration cost (estimated 60–100 hours vs. 20–35 for Option B).
- Violates Principle 2 (strangler-fig). Big-bang rewrite has unbounded risk.
- Reuses none of the proven SVG layout / heatmap code without porting.

**Risk:** HIGH (numerics, scope, schedule).

### Recommended Path

**Option B** is the recommended path. It is the only option that satisfies all 5 goals while preserving the solver and offering a bounded migration. Option A is a viable fallback if integration is deferred; Option C is rejected as violating Principle 2 and Driver 1.

**Alternatives invalidated:** None — both A and C remain technically viable. Option A is recommended *only* if Goal 3 (integration) is descoped. Option C is recommended *only* if a 60–100 hour rewrite budget is approved and a parity test suite is built first.

---

## 5. Guardrails

### Must Have
- Solver output (voltage magnitude, angle, P, Q, iteration count) identical to legacy within 1e-9 p.u. on the 40-bus demo and on a recorded set of stress cases (Q-limit hits, low-voltage, ill-conditioned).
- Legacy URL `/newton-rapson/powerflow.html` remains live and functional throughout migration.
- Legacy URL-hash share-links (base64 + JSON) load correctly in the new entry.
- JSON file format (full + compact) round-trips through both legacy and new code paths.
- All 7 educational scenarios still trip correctly in the host RelayLab app (regression — see Phase 8 / Phase 14 tests).

### Must NOT Have
- No TypeScript on the solver in Phase 1–3 (defer to a later phase after parity is locked).
- No solver behavior change disguised as a refactor.
- No bundler-required features in the standalone entry (must run from Cloudflare static hosting).
- No localStorage migration in this plan — share-links and JSON files only (matches current behavior).
- No new dependencies on the solver core (zero npm deps for `core/`).

---

## 6. Phased Roadmap (Option B)

### Phase 1 — Safety Net (prerequisite to any change)
**Goal:** Lock current behavior so future phases can be verified.

1. Build a parity-test harness: load the legacy `powerflow.html` headlessly (Vitest + jsdom or Playwright), run the 40-bus demo + 5 recorded stress cases, snapshot the converged `result` to fixtures.
2. Add 3 contract fixtures: (a) a Q-limit-hit case, (b) a Zgen phantom case, (c) a non-convergence case.
3. CI gate: any future PR that changes solver output fails the harness.

**Acceptance:** Harness runs green on legacy code. Fixtures committed to `tests/fixtures/powerflow/`.

### Phase 2 — Extract Solver Core (no behavioral change)
**Goal:** Move 1492–2186 into `src/simulators/powerflow/core/solver.js` and `core/network.js`.

1. Cut solver functions into ES modules with explicit imports/exports. Inputs become explicit arguments (`buses`, `branches`); no globals.
2. Add a compatibility shim in `powerflow.html` that imports the new module and re-binds the globals so the legacy file still works.
3. Run parity harness from Phase 1. Must pass with zero numeric drift.

**Acceptance:** `solver.js` has zero DOM references, zero globals. Parity harness passes. Legacy URL still works.

### Phase 3 — Extract Persistence + Visualization
**Goal:** Move JSON I/O (6722–7023) into `core/persistence.js`. Move SVG rendering (3298–4297) into `view/diagram.js`, `view/labels.js`, `view/heatmap.js`.

1. Persistence: `toJSON`, `fromJSON`, compact JSON, URL-hash codec become pure functions. Legacy parser preserved as `fromLegacyJSON`.
2. Visualization: `renderDiagram` takes `(network, result, viewport, theme)` and returns an SVG string (or DOM fragment). No globals.
3. Theme tokens extracted (colors, label fonts) for Goal 5.

**Acceptance:** Both modules are pure (no global writes). Legacy URL still works. Share-link from legacy loads in new entry and vice versa. Parity harness passes.

### Phase 4 — postMessage Bridge + React Embedded Entry
**Goal:** Unblock Goal 3 (integration).

1. `bridge/postMessage.js` defines a versioned protocol: `network:load`, `solver:run`, `solver:result`, `scenario:apply`, `viewport:change`.
2. Host React app gets `<PowerFlowEmbedded mode="iframe" | "inline" />`. `iframe` mode is the legacy path; `inline` mode imports `entry/embedded.js` directly.
3. Update `SimuladorNRPage.jsx` to use the new component (default to `iframe` mode for backward compat).

**Acceptance:** Host can drive a scenario and read solver results via either path. Legacy iframe still works for users with bookmarks.

### Phase 5 — Extract Controls + Diagnostics
**Goal:** Move 2192–5364 (controls, PV curve, capture) into `ui/controls.js` and `ui/diagnostics.js`. This is the largest module by line count and benefits most from boundary clarity.

1. Split by sub-feature: input tables, edit handlers, PV curve, convergence diagnostics, GIF/video capture.
2. Each sub-feature gets a function signature `(network, hostCallbacks) -> void`.
3. Capture features (GIF/video) gain feature-detection so they degrade cleanly in non-browser test environments.

**Acceptance:** Each sub-module independently importable. Parity harness still passes. Manual smoke test of PV curve + capture in browser.

### Phase 6 — Cutover + Cleanup
**Goal:** Legacy HTML becomes a thin shell that only loads the modules.

1. `powerflow.html` reduced to `<html><head>...</head><body><div id="app"></div><script type="module" src="entry/standalone.js"></script></body></html>` (target: < 200 lines).
2. Documentation: README in `src/simulators/powerflow/` describes the public API.
3. Delete dead code, dead globals, dead handlers identified during extraction.

**Acceptance:** `powerflow.html` < 200 lines. Public API documented. All 7 educational scenarios still pass. Parity harness green.

---

## 7. Migration Strategy

1. **Copy, don't move.** Phase 2's first commit is `cp powerflow.html powerflow.legacy.html`. The legacy file is touched only to add the compatibility shim. Rollback = revert the shim and point the iframe back at the legacy URL.
2. **Two URLs during transition.** `/newton-rapson/powerflow.html` (legacy) and `/newton-rapson/standalone.html` (new) coexist from Phase 2 onward. SimuladorNRPage points at the legacy URL until Phase 4 ships green.
3. **Parity gate every phase.** No phase merges without the Phase 1 harness passing.
4. **Feature flag for inline mode.** Phase 4's `inline` mode is gated by a query param (`?embed=inline`) for the first week of production. If issues surface, default users stay on `iframe` mode.
5. **Share-link compatibility test.** A regression test loads 5 historical share-links (manually collected) at every phase boundary.

## 8. Pre-Mortem (Deliberate mode)

**Scenario 1 — Solver drift discovered after Phase 5.** During controls extraction, an event handler was inadvertently mutating `buses` before the solver ran. The harness catches the regression but only on one stress fixture. Mitigation: the harness includes >= 6 fixtures from day one (Phase 1), covering Q-limit, Zgen, low-V, non-convergence, two flat cases. Each fixture is a separate CI job so the failing one is obvious.

**Scenario 2 — Share-link breaks for a power user.** A user bookmarked a 100-bus model in 2026. Post-migration, the legacy parser is gone or subtly different. Mitigation: `fromLegacyJSON` is preserved verbatim in Phase 3 with its own test fixtures (real share-links collected from the team's existing bookmarks). Cutover (Phase 6) does not remove the legacy parser path.

**Scenario 3 — postMessage protocol mismatch between embed and host.** Phase 4 ships, then Phase 5 changes the network shape. The embedded React component breaks silently because it was reading a renamed field. Mitigation: the bridge protocol is versioned (`{protocol: "powerflow/v1", type: "solver:result", ...}`). Host validates the version and logs a console warning on mismatch. Schema lives in `bridge/schema.js` and is imported by both sides.

## 9. Expanded Test Plan (Deliberate mode)

| Layer | What | How | When |
|---|---|---|---|
| Unit | Solver returns identical converged state on 6 fixtures (Q-limit, Zgen, low-V, non-conv, 2 flat) | Vitest + Node, no DOM | Every commit (Phase 1+) |
| Unit | `toJSON / fromJSON / fromLegacyJSON` round-trip on 10 saved models | Vitest | Every commit (Phase 3+) |
| Integration | postMessage protocol: host sends `scenario:apply`, embed responds with `solver:result` | Vitest + jsdom | Every commit (Phase 4+) |
| E2E | Load `/newton-rapson/powerflow.html` (legacy URL), run demo, verify converged voltages in DOM | Playwright | Every PR (Phase 1+) |
| E2E | Load 5 historical share-links, verify each renders without console errors | Playwright | Phase 3 onward |
| E2E | Inside RelayLab, navigate to Simulador NR tab, run a scenario, verify result | Playwright | Phase 4 onward |
| Observability | Console-error counter must remain 0 across all E2E flows | Playwright `page.on('console')` | Every PR |
| Performance | Solver wall-time on 40-bus demo within +/-10% of legacy baseline | Vitest perf timer | Phase 2 onward |
| Visual regression | SVG snapshot of 40-bus demo unchanged | Playwright screenshot | Phase 3 onward |

## 10. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Solver numeric drift | Low | Critical | Parity harness from Phase 1, blocks merge |
| Share-link breakage | Medium | High | `fromLegacyJSON` preserved verbatim; share-link fixtures in CI |
| Cloudflare static-hosting incompatibility with ES modules | Low | Medium | Use native `<script type="module">`, no bundler in standalone path |
| Performance regression in render loop | Medium | Medium | Phase 3 includes perf benchmark; rollback if > +25% |
| Host React app over-couples to internal modules | Medium | Medium | Public API documented in Phase 6 README; internal modules underscored |
| Migration phase stalls (only Phase 2 ships, then rot) | Medium | High | Each phase is independently valuable; even Phase 2 alone enables unit testing |

## 11. Acceptance Criteria (Plan-level)

1. Parity harness covers >=6 stress fixtures, runs in CI, blocks merge on numeric drift > 1e-9.
2. Solver module (`core/solver.js`) has zero `document.*`, zero `window.*`, zero global mutations.
3. Persistence handles both new and legacy JSON; share-link fixtures pass.
4. SVG renderer is a pure function `(network, result, viewport, theme) -> SVG`.
5. postMessage bridge has a versioned schema; host can drive a scenario end-to-end.
6. Final `powerflow.html` is < 200 lines (just a module loader shell).
7. All 7 educational scenarios in RelayLab still trip correctly (no regression in the parent app).
8. `npm run build` passes; bundle size for the host app does not grow by more than 5 kB gzip.
9. Public API documented in `src/simulators/powerflow/README.md`.
10. Cloudflare deployment of the new `/newton-rapson/` path succeeds and serves the legacy URL unchanged.

## 12. ADR — Architecture Decision Record

- **Decision:** Adopt Option B (extract to npm-style library + thin host adapter), staged across 6 phases gated by a parity-test harness.
- **Drivers:** (1) solver fidelity risk, (2) integration ROI (Goals 3, 5), (3) bounded migration-safety budget.
- **Alternatives considered:**
  - Option A (in-place ES modules): viable but does not solve integration; recommended only if Goal 3 is descoped.
  - Option C (full React rewrite): rejected; violates Principle 2 (strangler-fig) and Driver 1 (numerics risk).
- **Why chosen:** Option B is the only option satisfying all 5 stated goals while keeping solver code byte-stable in Phase 2. The phased roadmap means each phase is independently shippable and rollback-safe; even if migration halts after Phase 2, the project has gained unit-testable numerics. The strangler-fig pattern bounds risk per phase.
- **Consequences:**
  - Positive: solver becomes Node-testable; host React app gains a programmatic API; theme customization without forking; cleaner ground for future features (analytics, multi-language done right).
  - Negative: two URLs coexist during transition (operational complexity for ~6 phases); postMessage protocol becomes a new versioned contract to maintain; capture features (GIF/video) need feature-detection.
  - Neutral: existing iframe URL preserved indefinitely as the backward-compatibility surface.
- **Follow-ups (post-plan):**
  - TypeScript adoption for solver (deferred until parity is locked; candidate for a Phase 7).
  - Proper PT-BR/EN/ES i18n now that UI strings are separated from solver internals (resolves Appendix A).
  - Server-side solver endpoint (REST) — trivial once `core/solver.js` is Node-runnable.
  - Replace the standalone HTML page with a React route, retiring iframe entirely (long-term, post-Phase 6).

---

## 13. Open Questions (for human resolution)

These are surfaced separately to `.omc/plans/open-questions.md`.

1. **Capture features (GIF/video)** — are they actively used? If not, they can be deferred or dropped, reducing Phase 5 scope by ~600 lines.
2. **Share-link inventory** — can we collect 5–10 real share-links from the team's bookmarks to seed the legacy-compat fixtures? If not, we synthesize them, which is weaker evidence.
3. **TypeScript scope** — adopt for the new modules from Phase 2, or defer to Phase 7? (Plan currently defers — lower risk, faster Phase 2.)
4. **i18n** — should i18n infrastructure be built into Phase 5 (controls extraction), or treated as a separate later effort? Plan currently treats as follow-up.
5. **Performance budget** — is +/-10% solver wall-time the right gate, or stricter?
