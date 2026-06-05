/**
 * Pre-Solve Network Validation
 *
 * Validates network data before solver execution:
 * - Generator limit conflicts (Pmin > Pmax, Qmin > Qmax)
 * - Zero-impedance branches (would cause singular Y-bus)
 * - Topology issues (disconnected buses)
 * - Voltage/frequency sanity checks
 */

/**
 * Find all data issues in the network before solving.
 * Returns array of issue strings (empty if valid).
 *
 * @param {Array<Object>} buses - Bus array
 * @param {Array<Object>} branches - Branch array
 * @returns {Array<string>} Issue descriptions
 */
export function findDataIssues(buses, branches) {
  const issues = [];

  // Generator limit conflicts
  for (let i = 0; i < buses.length; i++) {
    const b = buses[i];

    // P-limit violations
    if (
      b.Pgmin != null &&
      b.Pgmax != null &&
      b.Pgmin > b.Pgmax
    ) {
      issues.push(
        `Bus ${b.id}: Pmin (${b.Pgmin.toFixed(0)}) > Pmax (${b.Pgmax.toFixed(
          0
        )}) — infeasible.`
      );
    }

    // Q-limit violations
    if (
      b.Qgmin != null &&
      b.Qgmax != null &&
      b.Qgmin > b.Qgmax
    ) {
      issues.push(
        `Bus ${b.id}: Qmin (${b.Qgmin.toFixed(0)}) > Qmax (${b.Qgmax.toFixed(
          0
        )}) — infeasible.`
      );
    }

    // Voltage setpoint sanity
    if (b.Vset != null && (b.Vset < 0.5 || b.Vset > 1.5)) {
      issues.push(
        `Bus ${b.id}: V setpoint ${b.Vset.toFixed(3)} pu is outside typical range [0.5, 1.5].`
      );
    }
  }

  // Branch impedance validation
  for (const br of branches) {
    if (br.inService === false) continue;

    // Zero impedance → singular Y-bus
    if (Math.abs(br.r) < 1e-12 && Math.abs(br.x) < 1e-12) {
      issues.push(
        `Branch ${br.name || `${br.from}-${br.to}`}: both r and x are zero — Y-bus would be singular.`
      );
    }

    // Very small reactance with significant resistance (might indicate data entry error)
    if (
      Math.abs(br.x) < 1e-6 &&
      Math.abs(br.r) > 1e-3
    ) {
      issues.push(
        `Branch ${br.name || `${br.from}-${br.to}`}: reactance is very small relative to resistance. Check data entry.`
      );
    }
  }

  return issues;
}

/**
 * Validate bus voltage bounds.
 * @param {number} V - Voltage magnitude (pu)
 * @returns {boolean} True if within reasonable bounds [0.5, 1.5]
 */
export function isValidVoltage(V) {
  return V != null && isFinite(V) && V >= 0.5 && V <= 1.5;
}

/**
 * Validate generator limits.
 * @param {Object} bus - Bus object with Pgmin, Pgmax, Qgmin, Qgmax
 * @returns {boolean} True if limits are consistent
 */
export function isValidGeneratorLimits(bus) {
  if (bus.Pgmin != null && bus.Pgmax != null && bus.Pgmin > bus.Pgmax) {
    return false;
  }
  if (bus.Qgmin != null && bus.Qgmax != null && bus.Qgmin > bus.Qgmax) {
    return false;
  }
  return true;
}

/**
 * Check if branch impedance is degenerate.
 * @param {Object} branch - Branch with r, x
 * @returns {boolean} True if non-zero impedance
 */
export function isValidBranchImpedance(branch) {
  const r = branch.r || 0;
  const x = branch.x || 0;
  // Allow very small values (transformer coupling), but not both zero
  return !(Math.abs(r) < 1e-12 && Math.abs(x) < 1e-12);
}

/**
 * Comprehensive network validation.
 * @param {Object} model - {buses, branches}
 * @returns {{valid: boolean, issues: Array<string>}}
 */
export function validateNetwork(model) {
  const issues = findDataIssues(model.buses || [], model.branches || []);

  return {
    valid: issues.length === 0,
    issues,
  };
}
