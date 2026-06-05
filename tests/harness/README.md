# Newton-Raphson Power Flow Simulator — Parity Harness

## Overview

The parity harness ensures that the refactored Newton-Raphson solver maintains **bit-for-bit numerical fidelity** with the legacy implementation. Any refactoring that introduces solver drift > 1e-9 p.u. (per unit) causes the test suite to fail and blocks merge.

## Test Structure

### Harness File
- `powerflow-parity.test.js` — loads legacy solver, runs 6 test cases, snapshots results

### Fixtures
Test cases are stored as JSON fixtures in `fixtures/powerflow/`:

| Fixture | Purpose | Expected Behavior |
|---------|---------|-------------------|
| `fixture-40bus-demo.json` | 40-bus reference system | Baseline convergence |
| `fixture-q-limit.json` | Q-limit enforcement case | Reactive power clamping |
| `fixture-zgen-phantom.json` | Zgen phantom bus handling | Phantom bus cleanup |
| `fixture-no-convergence.json` | Non-converging case | Graceful failure with error |
| `fixture-ill-conditioned.json` | Ill-conditioned network | High iteration count |
| `fixture-concurrent-mutation.json` | Input mutation during solve | Frozen input validation |

## Running Tests

```bash
# Run all parity tests
npm test -- tests/harness/powerflow-parity.test.js

# Run with coverage
npm test -- tests/harness/powerflow-parity.test.js --coverage

# Watch mode (development)
npm test -- tests/harness/powerflow-parity.test.js --watch
```

## Parity Gate (CI)

The GitHub Actions workflow `.github/workflows/newton-raphson-tests.yml` runs on every PR:

```yaml
- name: Run parity harness tests
  run: npm test -- tests/harness/powerflow-parity.test.js
```

**Gate rule:** If any test fails (solver drift > 1e-9), the workflow fails and blocks merge.

## What "Bit-for-Bit Parity" Means

For each test case:
1. Load network from fixture
2. Run solver (legacy or refactored)
3. Snapshot converged voltages, angles, P, Q, iteration count
4. Compare snapshots: `Math.abs(legacy[i] - refactored[i]) <= 1e-9`

### Tolerance Rationale

- **1e-9 p.u.** is the IEEE 754 double-precision machine epsilon for typical power flow magnitudes (V ≈ 1.0 p.u.)
- Permits minor floating-point rounding from code restructuring
- Rejects algorithmic drift (e.g., changed convergence criterion, modified Jacobian assembly)

## Fixture Format

```json
{
  "name": "fixture-40bus-demo",
  "description": "40-bus reference system from legacy powerflow.html",
  "network": {
    "buses": [
      { "i": 1, "name": "Bus 1", "Vm": 1.05, "Va": 0, "type": 3 },
      ...
    ],
    "branches": [
      { "fbus": 1, "tbus": 2, "r": 0.001, "x": 0.01, ... },
      ...
    ]
  },
  "expectedResult": {
    "converged": true,
    "iterations": 4,
    "buses": [
      { "Vm": 1.0499, "Va": -0.0125, "P": 2.324, "Q": 0.891 },
      ...
    ]
  }
}
```

## Adding New Fixtures

When you refactor a solver component:

1. **Capture baseline** (from legacy code):
   ```bash
   npm run capture-fixture -- --name=fixture-new-case --network=path/to/network.json
   ```

2. **Commit fixture** to `tests/fixtures/powerflow/`

3. **Update harness** to load new fixture:
   ```js
   const fixtures = [
     'fixture-40bus-demo',
     'fixture-q-limit',
     'fixture-new-case',  // ← Add here
   ];
   ```

4. **Run parity** before merging:
   ```bash
   npm test -- tests/harness/powerflow-parity.test.js
   ```

## Known Limitations

- Fixtures are static snapshots; they don't exercise all solver edge cases
- Parity gate catches **algorithmic drift only**, not numerical instability
- For comprehensive testing, add integration tests in Phase 3-4

## Phase Timeline

- **Phase 1:** Parity harness created, fixtures committed, CI gate online
- **Phase 2:** Solver extracted; parity harness runs on new module (must pass)
- **Phase 3:** Persistence + visualization extracted; parity harness still runs
- **Phase 4+:** Parity harness remains as regression guard
- **Post-Phase 6:** Parity harness becomes permanent fixture in CI

## References

- IEEE 754 Floating-Point Standard
- Power Flow Analysis textbooks (Bergen & Vittal, Glover/Overbye/Sarma)
- `.omc/plans/newton-raphson-refactor-v2-TEAM.md` (refactoring strategy)
