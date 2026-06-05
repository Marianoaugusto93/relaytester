/**
 * Newton-Raphson Power Flow Solver Core
 *
 * Implements the Newton-Raphson iterative solver for unbalanced power flow analysis.
 * Handles:
 * - Y-bus construction with transformer taps and phase shifters
 * - Phantom bus creation for generator impedance (Zgen) modeling
 * - Constant-power and constant-impedance load models
 * - Q-limit enforcement with bus type conversion
 * - Damped Newton step with voltage/angle bounds
 * - Branch power flow calculation with complex tap ratios
 */

// Mathematical constants
const BASE_MVA = 100.0;
const CONVERGENCE_TOL = 1e-6;
const MAX_ITERATIONS = 50;
const V_MIN = 0.5;
const V_MAX = 1.5;
const DTH_MAX_RAD = 30 * Math.PI / 180;
const SINGULAR_THRESHOLD = 1e-14;

/**
 * Compute effective tap ratio including magnitude and phase shift.
 * @param {Object} branch - Branch object with tap, phaseShift, kind properties
 * @returns {number} Effective tap magnitude
 */
function effectiveTap(branch) {
  const tap = (branch.tap != null && isFinite(branch.tap)) ? branch.tap : 1.0;
  return Math.abs(tap) > 1e-9 ? tap : 1.0;
}

/**
 * Build the Y-bus (admittance matrix) from network branches.
 *
 * Handles:
 * - Series admittance: Y = 1/Z
 * - Transformer taps: scaling on from-side diagonal
 * - Phase shifters: asymmetric Yft ≠ Ytf
 * - Line charging (shunt B): half split at each end
 * - Bus shunt admittances (Bsh, capacitors, reactors)
 * - Per-device shunt modeling (susceptance vs. mvar modes)
 *
 * @param {Array<Object>} buses - Bus array with Bsh, Qcap, Qreact, capModel, reactModel
 * @param {Array<Object>} branches - Branch array with r, x, b, tap, phaseShift, kind, inService
 * @returns {Array<Array<Object>>} Complex Y-bus matrix [{re, im}, ...]
 */
export function buildYbus(buses, branches) {
  const n = buses.length;
  const Y = Array.from(
    { length: n },
    () => Array.from({ length: n }, () => ({ re: 0, im: 0 }))
  );

  for (const br of branches) {
    if (br.inService === false) continue;
    const i = br.from - 1,
      j = br.to - 1;

    // Defensive coercion: treat non-finite b as 0
    const br_b = typeof br.b === "number" && isFinite(br.b) ? br.b : 0;
    const z_re = br.r,
      z_im = br.x;
    const z_mag2 = z_re * z_re + z_im * z_im;

    // Series admittance y = 1/z
    const y_re = z_re / z_mag2;
    const y_im = -z_im / z_mag2;
    const a = effectiveTap(br);

    // Phase-shift angle (radians)
    const phi =
      br.kind === "xfmr" && isFinite(br.phaseShift) ? br.phaseShift : 0;
    const cosp = Math.cos(phi),
      sinp = Math.sin(phi);

    // Complex tap τ = a · e^{jφ}
    // Yft = -y · e^{+jφ} / a
    const yft_re = -(y_re * cosp - y_im * sinp) / a;
    const yft_im = -(y_re * sinp + y_im * cosp) / a;

    // Ytf = -y · e^{-jφ} / a
    const ytf_re = -(y_re * cosp + y_im * sinp) / a;
    const ytf_im = -(-y_re * sinp + y_im * cosp) / a;

    // Yff = y / a²
    const yff_re = y_re / (a * a);
    const yff_im = y_im / (a * a);

    // Ytt = y
    const ytt_re = y_re;
    const ytt_im = y_im;

    // Line charging contribution
    const bshFrom_im = (br_b / 2) / (a * a);
    const bshTo_im = br_b / 2;

    Y[i][i].re += yff_re;
    Y[i][i].im += yff_im + bshFrom_im;
    Y[j][j].re += ytt_re;
    Y[j][j].im += ytt_im + bshTo_im;
    Y[i][j].re += yft_re;
    Y[i][j].im += yft_im;
    Y[j][i].re += ytf_re;
    Y[j][i].im += ytf_im;
  }

  // Add bus shunt admittances
  for (let i = 0; i < buses.length; i++) {
    if (buses[i].Bsh) {
      Y[i][i].im += buses[i].Bsh;
    }

    const capOn = buses[i].capInService !== false;
    const reactOn = buses[i].reactInService !== false;
    const capModel = buses[i].capModel === "susceptance" ? "susceptance" : "mvar";
    const reactModel = buses[i].reactModel === "susceptance" ? "susceptance" : "mvar";

    if (
      capOn &&
      capModel === "susceptance" &&
      buses[i].Qcap
    ) {
      Y[i][i].im += (buses[i].Qcap || 0) / BASE_MVA;
    }
    if (
      reactOn &&
      reactModel === "susceptance" &&
      buses[i].Qreact
    ) {
      Y[i][i].im -= (buses[i].Qreact || 0) / BASE_MVA;
    }
  }

  return Y;
}

/**
 * Gaussian elimination with partial pivoting to solve Ax = b.
 * @param {Array<Array<number>>} A - Coefficient matrix
 * @param {Array<number>} b - RHS vector
 * @returns {Array<number> | null} Solution vector x, or null if singular
 */
export function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  // Forward elimination with partial pivoting
  for (let k = 0; k < n; k++) {
    let maxVal = Math.abs(M[k][k]);
    let maxRow = k;
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(M[i][k]) > maxVal) {
        maxVal = Math.abs(M[i][k]);
        maxRow = i;
      }
    }
    if (maxVal < SINGULAR_THRESHOLD) return null;

    [M[k], M[maxRow]] = [M[maxRow], M[k]];

    for (let i = k + 1; i < n; i++) {
      const f = M[i][k] / M[k][k];
      for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j];
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }

  return x;
}

/**
 * Helper: Remove phantom buses and branches after solver completes.
 */
function _cleanupPhantoms(phantomMeta, origBusCount, origBranchCount, buses, branches) {
  branches.length = origBranchCount;
  buses.length = origBusCount;
}

/**
 * Main Newton-Raphson power flow solver.
 *
 * Algorithm:
 * 1. Create phantom buses for generators with Zgen (series impedance)
 * 2. Build Y-bus from network topology
 * 3. Iterate Newton-Raphson:
 *    - Compute P, Q mismatches
 *    - Build Jacobian matrix
 *    - Solve for state updates
 *    - Apply damped step to ensure feasibility
 * 4. Calculate branch flows and losses
 * 5. Extract results and remove phantom buses
 *
 * @param {Array<Object>} buses - Bus array (modified in-place with V, theta, Pg, Qg)
 * @param {Array<Object>} branches - Branch array (modified in-place with flows)
 * @returns {Object} {converged, iter, maxMis, singular}
 */
export function solvePowerFlow(buses, branches) {
  // ---- Generator impedance handling (phantom internal buses) ----
  const _phantomMeta = [];
  const _origBusCount = buses.length;
  const _origBranchCount = branches.length;

  for (let i = 0; i < _origBusCount; i++) {
    const b = buses[i];
    const zr =
      b.Zgen_r != null && isFinite(b.Zgen_r) ? b.Zgen_r : 0;
    const zx =
      b.Zgen_x != null && isFinite(b.Zgen_x) ? b.Zgen_x : 0;

    const origType = b._origType != null ? b._origType : b.type;
    if (
      b.hasGenerator &&
      b.genInService !== false &&
      origType !== "pq" &&
      (Math.abs(zr) > 1e-9 || Math.abs(zx) > 1e-9)
    ) {
      const isClamped = b.type === "pq" && b._qLimitHit;
      const phantomIdx = buses.length;
      const phantomId = phantomIdx + 1;
      const phantomV =
        b.Vset != null && isFinite(b.Vset) ? b.Vset : b.V;
      const phantomPg =
        b.Pset != null && isFinite(b.Pset) ? b.Pset : b.Pg;

      buses.push({
        id: phantomId,
        type: isClamped ? "pq" : origType,
        V: phantomV,
        theta: b.theta || 0,
        Pg: phantomPg,
        Qg: b.Qg,
        Pl: 0,
        Ql: 0,
        _Pl_load: 0,
        _Ql_load: 0,
        baseKv: b.baseKv,
        hasGenerator: true,
        loadInService: false,
        capInService: false,
        reactInService: false,
        Qcap: 0,
        Qreact: 0,
        loadModel: "power",
        capModel: "mvar",
        reactModel: "mvar",
        Qgmin: b.Qgmin,
        Qgmax: b.Qgmax,
        Pgmin: b.Pgmin,
        Pgmax: b.Pgmax,
        x: b.x,
        y: b.y,
        _isPhantom: true,
        _phantomFor: i,
      });

      branches.push({
        from: i + 1,
        to: phantomIdx + 1,
        r: zr,
        x: zx,
        b: 0,
        tap: 1.0,
        rating: 999,
        kind: "line",
        name: "_zgen_" + i,
        inService: true,
        _isPhantom: true,
      });

      _phantomMeta.push({
        origIdx: i,
        phantomIdx: phantomIdx,
        savedType: b.type,
        savedV: b.V,
        savedPg: b.Pg,
        savedQg: b.Qg,
        savedQgmin: b.Qgmin,
        savedQgmax: b.Qgmax,
        savedPgmin: b.Pgmin,
        savedPgmax: b.Pgmax,
      });

      b.type = "pq";
      b.Pg = 0;
      b.Qg = 0;
      b.Qgmin = null;
      b.Qgmax = null;
      b.Pgmin = null;
      b.Pgmax = null;
    }
  }

  const n = buses.length;
  const Y = buildYbus(buses, branches);
  const G = Y.map((row) => row.map((c) => c.re));
  const B = Y.map((row) => row.map((c) => c.im));

  const V = buses.map((b) => b.V);
  const theta = buses.map((b) => b.theta || 0);

  const pvBuses = [];
  const pqBuses = [];
  for (let i = 0; i < n; i++) {
    if (buses[i].type === "pv") pvBuses.push(i);
    else if (buses[i].type === "pq") pqBuses.push(i);
  }
  const nonSlack = [...pvBuses, ...pqBuses];

  // Load modeling
  const isImpedanceLoad = buses.map((b) => b.loadModel === "impedance");
  const Pl_rated = buses.map(
    (b) => (b._Pl_load != null ? b._Pl_load : b.Pl || 0)
  );
  const Ql_rated = buses.map(
    (b) => (b._Ql_load != null ? b._Ql_load : b.Ql || 0)
  );
  const Ql_shuntPart = buses.map((b) => {
    const total = b.Ql != null ? b.Ql : 0;
    const loadPart = b._Ql_load != null ? b._Ql_load : b.Ql || 0;
    return total - loadPart;
  });

  let iter = 0;
  let maxMis = Infinity;

  // ---- Newton-Raphson iteration loop ----
  while (iter < MAX_ITERATIONS && maxMis > CONVERGENCE_TOL) {
    // Compute power specifications
    const Pspec = new Array(n);
    const Qspec = new Array(n);
    for (let i = 0; i < n; i++) {
      const Pl_act = isImpedanceLoad[i]
        ? Pl_rated[i] * V[i] * V[i]
        : Pl_rated[i];
      const Ql_load_act = isImpedanceLoad[i]
        ? Ql_rated[i] * V[i] * V[i]
        : Ql_rated[i];
      const genOn_i = buses[i].genInService !== false;
      Pspec[i] = (genOn_i ? buses[i].Pg : 0) - Pl_act;
      Qspec[i] =
        (genOn_i ? buses[i].Qg : 0) -
        (Ql_load_act + Ql_shuntPart[i]);
    }

    // Compute actual P, Q injections
    const P = new Array(n).fill(0);
    const Q = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < n; k++) {
        const dth = theta[i] - theta[k];
        P[i] += V[i] * V[k] * (G[i][k] * Math.cos(dth) + B[i][k] * Math.sin(dth));
        Q[i] += V[i] * V[k] * (G[i][k] * Math.sin(dth) - B[i][k] * Math.cos(dth));
      }
    }

    // Compute mismatches
    const dP = nonSlack.map((i) => Pspec[i] - P[i]);
    const dQ = pqBuses.map((i) => Qspec[i] - Q[i]);
    const mismatch = [...dP, ...dQ];
    maxMis = Math.max(...mismatch.map(Math.abs));
    if (maxMis <= CONVERGENCE_TOL) break;

    // Build Jacobian matrix
    const sz = nonSlack.length + pqBuses.length;
    const J = Array.from({ length: sz }, () => new Array(sz).fill(0));

    for (let r = 0; r < nonSlack.length; r++) {
      const i = nonSlack[r];
      for (let c = 0; c < nonSlack.length; c++) {
        const k = nonSlack[c];
        if (i === k) {
          J[r][c] = -Q[i] - B[i][i] * V[i] * V[i];
        } else {
          const dth = theta[i] - theta[k];
          J[r][c] =
            V[i] * V[k] * (G[i][k] * Math.sin(dth) - B[i][k] * Math.cos(dth));
        }
      }
      for (let c = 0; c < pqBuses.length; c++) {
        const k = pqBuses[c];
        const colIdx = nonSlack.length + c;
        if (i === k) {
          J[r][colIdx] = P[i] / V[i] + G[i][i] * V[i];
          if (isImpedanceLoad[i]) {
            J[r][colIdx] += 2 * V[i] * Pl_rated[i];
          }
        } else {
          const dth = theta[i] - theta[k];
          J[r][colIdx] =
            V[i] * (G[i][k] * Math.cos(dth) + B[i][k] * Math.sin(dth));
        }
      }
    }

    for (let r = 0; r < pqBuses.length; r++) {
      const i = pqBuses[r];
      const rowIdx = nonSlack.length + r;
      for (let c = 0; c < nonSlack.length; c++) {
        const k = nonSlack[c];
        if (i === k) {
          J[rowIdx][c] = P[i] - G[i][i] * V[i] * V[i];
        } else {
          const dth = theta[i] - theta[k];
          J[rowIdx][c] = -V[i] * V[k] * (G[i][k] * Math.cos(dth) + B[i][k] * Math.sin(dth));
        }
      }
      for (let c = 0; c < pqBuses.length; c++) {
        const k = pqBuses[c];
        const colIdx = nonSlack.length + c;
        if (i === k) {
          J[rowIdx][colIdx] = Q[i] / V[i] - B[i][i] * V[i];
          if (isImpedanceLoad[i]) {
            J[rowIdx][colIdx] += 2 * V[i] * Ql_rated[i];
          }
        } else {
          const dth = theta[i] - theta[k];
          J[rowIdx][colIdx] =
            V[i] * (G[i][k] * Math.sin(dth) - B[i][k] * Math.cos(dth));
        }
      }
    }

    // Solve linear system
    const dx = solveLinear(J, mismatch);
    if (dx === null) {
      for (const br of branches) {
        br.Pfrom = 0;
        br.Qfrom = 0;
        br.Pto = 0;
        br.Qto = 0;
        br.Ploss = 0;
        br.Qloss = 0;
        br.Smax = 0;
        br.loading = 0;
      }
      _cleanupPhantoms(_phantomMeta, _origBusCount, _origBranchCount, buses, branches);
      return { converged: false, iter, maxMis, singular: true };
    }

    // Damped Newton step
    let alpha = 1.0;
    for (let r = 0; r < nonSlack.length; r++) {
      const step = Math.abs(dx[r]);
      if (step > DTH_MAX_RAD) {
        alpha = Math.min(alpha, DTH_MAX_RAD / step);
      }
    }
    for (let r = 0; r < pqBuses.length; r++) {
      const i = pqBuses[r];
      const dV = dx[nonSlack.length + r];
      const newV = V[i] + alpha * dV;
      if (newV < V_MIN) {
        const alphaNeeded = (V_MIN - V[i]) / dV;
        if (alphaNeeded > 0 && alphaNeeded < alpha) alpha = alphaNeeded * 0.99;
      } else if (newV > V_MAX) {
        const alphaNeeded = (V_MAX - V[i]) / dV;
        if (alphaNeeded > 0 && alphaNeeded < alpha) alpha = alphaNeeded * 0.99;
      }
    }

    // Apply step
    for (let r = 0; r < nonSlack.length; r++) {
      theta[nonSlack[r]] += alpha * dx[r];
    }
    for (let r = 0; r < pqBuses.length; r++) {
      V[pqBuses[r]] += alpha * dx[nonSlack.length + r];
    }

    iter++;
  }

  // ---- Post-solve state updates ----
  for (let i = 0; i < n; i++) {
    buses[i].V = V[i];
    buses[i].theta = theta[i];
    if (isImpedanceLoad[i]) {
      buses[i].Pl = Pl_rated[i] * V[i] * V[i];
      buses[i].Ql = Ql_rated[i] * V[i] * V[i] + Ql_shuntPart[i];
    }
  }

  // Update generator reactive power on PV/slack buses
  for (let i = 0; i < n; i++) {
    let P = 0,
      Q = 0;
    for (let k = 0; k < n; k++) {
      const dth = theta[i] - theta[k];
      P += V[i] * V[k] * (G[i][k] * Math.cos(dth) + B[i][k] * Math.sin(dth));
      Q += V[i] * V[k] * (G[i][k] * Math.sin(dth) - B[i][k] * Math.cos(dth));
    }
    if (buses[i].genInService === false) continue;
    if (buses[i].type === "slack") {
      buses[i].Pg = P + buses[i].Pl;
      buses[i].Qg = Q + buses[i].Ql;
    } else if (buses[i].type === "pv") {
      buses[i].Qg = Q + buses[i].Ql;
    }
  }

  // ---- Calculate branch flows ----
  for (const br of branches) {
    if (br.inService === false) {
      br.Pfrom = 0;
      br.Qfrom = 0;
      br.Pto = 0;
      br.Qto = 0;
      br.Ploss = 0;
      br.Qloss = 0;
      br.Smax = 0;
      br.loading = 0;
      continue;
    }

    const i = br.from - 1,
      j = br.to - 1;
    const br_b = typeof br.b === "number" && isFinite(br.b) ? br.b : 0;
    const z_re = br.r,
      z_im = br.x;
    const z_mag2 = z_re * z_re + z_im * z_im;
    const y_re = z_re / z_mag2;
    const y_im = -z_im / z_mag2;
    const a = effectiveTap(br);
    const phi =
      br.kind === "xfmr" && isFinite(br.phaseShift) ? br.phaseShift : 0;
    const cosp = Math.cos(phi),
      sinp = Math.sin(phi);

    const Vi_re = V[i] * Math.cos(theta[i]);
    const Vi_im = V[i] * Math.sin(theta[i]);
    const Vj_re = V[j] * Math.cos(theta[j]);
    const Vj_im = V[j] * Math.sin(theta[j]);

    const Vt_re = (Vi_re * cosp + Vi_im * sinp) / a;
    const Vt_im = (Vi_im * cosp - Vi_re * sinp) / a;
    const dV_re = Vt_re - Vj_re;
    const dV_im = Vt_im - Vj_im;

    const Iser_re = y_re * dV_re - y_im * dV_im;
    const Iser_im = y_re * dV_im + y_im * dV_re;

    const Ish_i_re = ((-br_b) / 2) * Vt_im;
    const Ish_i_im = (br_b / 2) * Vt_re;

    const It_re = Iser_re + Ish_i_re;
    const It_im = Iser_im + Ish_i_im;

    const Ifrom_re = (It_re * cosp - It_im * sinp) / a;
    const Ifrom_im = (It_im * cosp + It_re * sinp) / a;

    const Sfrom_re = Vi_re * Ifrom_re + Vi_im * Ifrom_im;
    const Sfrom_im = Vi_im * Ifrom_re - Vi_re * Ifrom_im;

    const Ish_j_re = ((-br_b) / 2) * Vj_im;
    const Ish_j_im = (br_b / 2) * Vj_re;

    const Ito_re = -Iser_re + Ish_j_re;
    const Ito_im = -Iser_im + Ish_j_im;

    const Sto_re = Vj_re * Ito_re + Vj_im * Ito_im;
    const Sto_im = Vj_im * Ito_re - Vj_re * Ito_im;

    br.Pfrom = Sfrom_re;
    br.Qfrom = Sfrom_im;
    br.Pto = Sto_re;
    br.Qto = Sto_im;
    br.Ploss = Sfrom_re + Sto_re;
    br.Qloss = Sfrom_im + Sto_im;

    const Sfrom_mag = Math.sqrt(Sfrom_re * Sfrom_re + Sfrom_im * Sfrom_im) * BASE_MVA;
    const Sto_mag = Math.sqrt(Sto_re * Sto_re + Sto_im * Sto_im) * BASE_MVA;
    br.Smax = Math.max(Sfrom_mag, Sto_mag);

    const rating = br.rating || 100;
    br.loading = (br.Smax / rating) * 100;
  }

  // ---- Phantom bus post-processing ----
  for (const meta of _phantomMeta) {
    const brIdx = branches.findIndex(
      (br) => br._isPhantom && br.name === "_zgen_" + meta.origIdx
    );
    if (brIdx >= 0) {
      const pbr = branches[brIdx];
      buses[meta.origIdx].Pg = -pbr.Pfrom;
      buses[meta.origIdx].Qg = -pbr.Qfrom;
      buses[meta.origIdx]._internalPg = -pbr.Pto;
      buses[meta.origIdx]._internalQg = -pbr.Qto;
    } else {
      buses[meta.origIdx].Pg = meta.savedPg;
      buses[meta.origIdx].Qg = meta.savedQg;
      buses[meta.origIdx]._internalPg = null;
      buses[meta.origIdx]._internalQg = null;
    }

    buses[meta.origIdx].type = meta.savedType;
    buses[meta.origIdx].Qgmin = meta.savedQgmin;
    buses[meta.origIdx].Qgmax = meta.savedQgmax;
    buses[meta.origIdx].Pgmin = meta.savedPgmin;
    buses[meta.origIdx].Pgmax = meta.savedPgmax;
  }

  // Strip phantom buses and branches
  branches.length = _origBranchCount;
  buses.length = _origBusCount;

  return { converged: maxMis <= CONVERGENCE_TOL, iter, maxMis };
}
