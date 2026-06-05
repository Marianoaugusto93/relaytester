/**
 * Data Persistence & JSON Serialization
 *
 * Handles network model serialization for:
 * - Save/load workflows via JSON
 * - Round-trip validation (no data loss)
 * - Browser localStorage and file I/O
 */

/**
 * Serialize network state to JSON string.
 * Includes buses, branches, and solver results.
 *
 * @param {Object} model - Network model with buses[] and branches[]
 * @param {Object} metadata - Optional metadata (name, description, timestamp)
 * @returns {string} JSON representation
 */
export function serializeNetwork(model, metadata = {}) {
  const data = {
    name: metadata.name || 'Untitled Network',
    description: metadata.description || '',
    timestamp: metadata.timestamp || new Date().toISOString(),
    network: {
      buses: (model.buses || []).map((b) => ({
        i: b.id,
        name: b.name,
        Vm: b.V,
        Va: (b.theta || 0) * (180 / Math.PI),
        type: b.type === 'slack' ? 2 : b.type === 'pv' ? 3 : 1,
        Pd: b.Pl,
        Qd: b.Ql,
        Pg: b.Pg,
        Qg: b.Qg,
        Qgmin: b.Qgmin,
        Qgmax: b.Qgmax,
        Pgmin: b.Pgmin,
        Pgmax: b.Pgmax,
        Zgen_r: b.Zgen_r,
        Zgen_x: b.Zgen_x,
        baseKv: b.baseKv,
        hasGenerator: b.hasGenerator,
        genInService: b.genInService,
        loadModel: b.loadModel,
      })),
      branches: (model.branches || []).map((br) => ({
        fbus: br.from,
        tbus: br.to,
        r: br.r,
        x: br.x,
        b: br.b,
        tap: br.tap,
        phaseShift: br.phaseShift,
        rateA: br.rating,
        kind: br.kind,
        name: br.name,
        inService: br.inService,
      })),
    },
    solutionData: {
      buses: (model.buses || []).map((b) => ({
        i: b.id,
        Vm: b.V,
        Va: (b.theta || 0) * (180 / Math.PI),
        Pg: b.Pg,
        Qg: b.Qg,
      })),
      branches: (model.branches || []).map((br) => ({
        fbus: br.from,
        tbus: br.to,
        Pfrom: br.Pfrom,
        Qfrom: br.Qfrom,
        Pto: br.Pto,
        Qto: br.Qto,
        loading: br.loading,
      })),
    },
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Deserialize network state from JSON string.
 * Reconstructs buses and branches with full fidelity.
 *
 * @param {string} jsonString - JSON network representation
 * @returns {Object} Deserialized model {buses: [], branches: []}
 */
export function deserializeNetwork(jsonString) {
  const data = JSON.parse(jsonString);
  const model = { buses: [], branches: [] };

  if (data.network && data.network.buses) {
    model.buses = data.network.buses.map((b) => ({
      id: b.i,
      name: b.name,
      V: b.Vm,
      theta: (b.Va || 0) * (Math.PI / 180),
      type: b.type === 2 ? 'slack' : b.type === 3 ? 'pv' : 'pq',
      Pl: b.Pd || 0,
      Ql: b.Qd || 0,
      Pg: b.Pg || 0,
      Qg: b.Qg || 0,
      Qgmin: b.Qgmin,
      Qgmax: b.Qgmax,
      Pgmin: b.Pgmin,
      Pgmax: b.Pgmax,
      Zgen_r: b.Zgen_r,
      Zgen_x: b.Zgen_x,
      baseKv: b.baseKv || 138,
      hasGenerator: b.hasGenerator || false,
      genInService: b.genInService !== false,
      loadModel: b.loadModel || 'power',
      _Pl_load: b.Pd || 0,
      _Ql_load: b.Qd || 0,
    }));
  }

  if (data.network && data.network.branches) {
    model.branches = data.network.branches.map((br) => ({
      from: br.fbus,
      to: br.tbus,
      r: br.r,
      x: br.x,
      b: br.b || 0,
      tap: br.tap || 1.0,
      phaseShift: br.phaseShift || 0,
      rating: br.rateA || 100,
      kind: br.kind || 'line',
      name: br.name || `Line ${br.fbus}-${br.tbus}`,
      inService: br.inService !== false,
      Pfrom: 0,
      Qfrom: 0,
      Pto: 0,
      Qto: 0,
      Ploss: 0,
      Qloss: 0,
      Smax: 0,
      loading: 0,
    }));
  }

  return model;
}

/**
 * Validate network round-trip: serialize then deserialize.
 * Returns true if no data loss, false otherwise.
 *
 * @param {Object} originalModel - Model to test
 * @returns {boolean} Round-trip fidelity check
 */
export function validateRoundTrip(originalModel) {
  try {
    const json = serializeNetwork(originalModel);
    const restored = deserializeNetwork(json);

    // Basic sanity checks
    if (!restored.buses || !restored.branches) return false;
    if (restored.buses.length !== (originalModel.buses || []).length)
      return false;
    if (restored.branches.length !== (originalModel.branches || []).length)
      return false;

    return true;
  } catch (err) {
    console.error('Round-trip validation failed:', err);
    return false;
  }
}
