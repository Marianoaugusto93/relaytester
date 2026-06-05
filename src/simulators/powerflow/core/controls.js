/**
 * Power Flow Simulator Control Functions
 *
 * UI control handlers for transformer taps, generator setpoints, and load scaling.
 * These functions read/write the HTML input elements and update the network model.
 *
 * Phase 5: Controls extraction from legacy powerflow.html
 */

/**
 * Render transformer tap and phase-shift sliders + generator setpoint sliders.
 * Must be called after model changes to refresh the control panel.
 *
 * Dependencies: DOM elements (#ctrl-xfmrs, #ctrl-gens), buses[], branches[], BASE_MVA
 *
 * @param {Array} buses - Bus array with Vset, Pset properties
 * @param {Array} branches - Branch array with tap, phaseShift properties
 * @param {number} baseMva - Base MVA for per-unit conversion
 */
export function renderControls(buses, branches, baseMva) {
  const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Transformer tap sliders — one per transformer in the model
  const xc = document.getElementById('ctrl-xfmrs');
  if (xc) {
    let html = '';
    branches.forEach((br, i) => {
      if (br.kind !== 'xfmr') return;
      const tapVal = (br.tap != null && isFinite(br.tap)) ? br.tap : 1.0;
      html += `<div class="control-row">
        <label>${escapeHtml(br.name || ('Branch ' + i))} tap (B${br.from}→B${br.to})</label>
        <input type="range" data-ctrl="tap" data-bridx="${i}" min="0.85" max="1.15" step="0.0125" value="${tapVal}">
        <span class="val" data-ctrl-val="tap" data-bridx="${i}">${tapVal.toFixed(3)}</span>
      </div>`;
      const phiRad = (br.phaseShift != null && isFinite(br.phaseShift)) ? br.phaseShift : 0;
      const phiDeg = phiRad * 180 / Math.PI;
      if (Math.abs(phiDeg) > 1e-6 || br.isPST === true) {
        html += `<div class="control-row">
          <label>${escapeHtml(br.name)} phase shift (°)</label>
          <input type="range" data-ctrl="phase" data-bridx="${i}" min="-30" max="30" step="0.5" value="${phiDeg.toFixed(2)}">
          <span class="val" data-ctrl-val="phase" data-bridx="${i}">${phiDeg.toFixed(1)}°</span>
        </div>`;
      }
    });
    if (html === '') html = '<div style="font-size:11px; color:#86868b; padding:4px 0;">No transformers in model.</div>';
    xc.innerHTML = html;
  }

  // Generator setpoint sliders — V for slack/PV, P for PV/PQ-gen, Q for PQ-gen
  const gc = document.getElementById('ctrl-gens');
  if (gc) {
    let html = '';
    let genCount = 0;
    buses.forEach((b, i) => {
      if (b.hasGenerator !== true) return;
      genCount++;
      const genName = `G${genCount}`;
      const typeStr = b.type === 'slack' ? 'slack' : b.type === 'pv' ? 'PV' : 'PQ';
      const tag = `${genName} on B${b.id} (${typeStr})`;
      if (b.type === 'slack' || b.type === 'pv') {
        const v = (b.Vset != null && isFinite(b.Vset)) ? b.Vset
                : (b.V != null && isFinite(b.V)) ? b.V : 1.0;
        html += `<div class="control-row">
          <label>|V| at ${tag}</label>
          <input type="range" data-ctrl="vgen" data-busidx="${i}" min="0.90" max="1.15" step="0.005" value="${v}">
          <span class="val" data-ctrl-val="vgen" data-busidx="${i}">${v.toFixed(3)}</span>
        </div>`;
      }
      if (b.type === 'pv' || b.type === 'pq') {
        const Pset_pu = (b.Pset != null && isFinite(b.Pset)) ? b.Pset
                      : (b.Pg != null && isFinite(b.Pg)) ? b.Pg : 0;
        const pMw = Pset_pu * baseMva;
        let sMin = 0;
        let sMax = Math.max(200, Math.ceil(Math.abs(pMw) * 1.5 / 25) * 25);
        if (b.Pgmin != null && isFinite(b.Pgmin)) sMin = b.Pgmin;
        if (b.Pgmax != null && isFinite(b.Pgmax)) sMax = b.Pgmax;
        if (pMw < sMin) sMin = Math.floor(pMw);
        if (pMw > sMax) sMax = Math.ceil(pMw);
        html += `<div class="control-row">
          <label>P at ${tag} (MW)</label>
          <input type="range" data-ctrl="pgen" data-busidx="${i}" min="${sMin}" max="${sMax}" step="5" value="${pMw.toFixed(1)}">
          <span class="val" data-ctrl-val="pgen" data-busidx="${i}">${pMw.toFixed(0)}</span>
        </div>`;
      }
      if (b.type === 'pq') {
        const qMvr = (b.Qg || 0) * baseMva;
        let qsMin, qsMax;
        if (b.Qgmin != null && isFinite(b.Qgmin)) qsMin = b.Qgmin;
        else qsMin = -Math.max(100, Math.ceil(Math.abs(qMvr) * 1.5 / 10) * 10);
        if (b.Qgmax != null && isFinite(b.Qgmax)) qsMax = b.Qgmax;
        else qsMax = Math.max(100, Math.ceil(Math.abs(qMvr) * 1.5 / 10) * 10);
        if (qMvr < qsMin) qsMin = Math.floor(qMvr);
        if (qMvr > qsMax) qsMax = Math.ceil(qMvr);
        html += `<div class="control-row">
          <label>Q at ${tag} (MVAR)</label>
          <input type="range" data-ctrl="qgen" data-busidx="${i}" min="${qsMin}" max="${qsMax}" step="2" value="${qMvr.toFixed(1)}">
          <span class="val" data-ctrl-val="qgen" data-busidx="${i}">${qMvr.toFixed(0)}</span>
        </div>`;
      }
    });
    if (html === '') html = '<div style="font-size:11px; color:#86868b; padding:4px 0;">No generators in model.</div>';
    gc.innerHTML = html;
  }

  // Re-attach input event listeners (caller should wire these to updateLabels())
  document.querySelectorAll('input[type=range]').forEach(el => {
    if (el.dataset.bound === 'true') return;
    el.dataset.bound = 'true';
  });
}

/**
 * Apply control slider values back to the model.
 * Reads HTML range inputs and updates buses/branches arrays.
 *
 * @param {Array} buses - Bus array to update
 * @param {Array} branches - Branch array to update
 * @param {Array} baseLoads - Base load array for load scaling
 * @param {number} baseMva - Base MVA for per-unit conversion
 */
export function applyControls(buses, branches, baseLoads, baseMva) {
  // Transformer taps:
  document.querySelectorAll('input[data-ctrl="tap"]').forEach(el => {
    const i = parseInt(el.dataset.bridx, 10);
    const v = parseFloat(el.value);
    if (branches[i] && isFinite(v)) branches[i].tap = v;
  });

  // Transformer phase shifts (degrees → radians):
  document.querySelectorAll('input[data-ctrl="phase"]').forEach(el => {
    const i = parseInt(el.dataset.bridx, 10);
    const deg = parseFloat(el.value);
    if (branches[i] && isFinite(deg)) branches[i].phaseShift = deg * Math.PI / 180;
  });

  // Generator V setpoints (slack & PV):
  document.querySelectorAll('input[data-ctrl="vgen"]').forEach(el => {
    const i = parseInt(el.dataset.busidx, 10);
    const v = parseFloat(el.value);
    if (buses[i] && isFinite(v)) {
      buses[i].Vset = v;
      buses[i].V = v;
    }
  });

  // Generator P dispatch (PV & PQ-gen):
  document.querySelectorAll('input[data-ctrl="pgen"]').forEach(el => {
    const i = parseInt(el.dataset.busidx, 10);
    const v = parseFloat(el.value);
    if (buses[i] && isFinite(v)) {
      buses[i].Pset = v / baseMva;
      buses[i].Pg = v / baseMva;
    }
  });

  // Generator Q dispatch (PQ-gen only):
  document.querySelectorAll('input[data-ctrl="qgen"]').forEach(el => {
    const i = parseInt(el.dataset.busidx, 10);
    const v = parseFloat(el.value);
    if (buses[i] && isFinite(v)) buses[i].Qg = v / baseMva;
  });

  // Load scale (global):
  const scaleEl = document.getElementById('loadscale');
  const scale = scaleEl ? parseFloat(scaleEl.value) : 1.0;
  for (let i = 0; i < buses.length; i++) {
    if (baseLoads[i]) {
      const loadOn = buses[i].loadInService !== false;
      const capOn  = buses[i].capInService !== false;
      const reactOn = buses[i].reactInService !== false;
      buses[i]._Pl_load = loadOn ? (baseLoads[i].Pl * scale) : 0;
      buses[i]._Ql_load = loadOn ? (baseLoads[i].Ql * scale) : 0;
      buses[i].Pl = buses[i]._Pl_load;
      const capModel = buses[i].capModel === 'susceptance' ? 'susceptance' : 'mvar';
      const reactModel = buses[i].reactModel === 'susceptance' ? 'susceptance' : 'mvar';
      let qCap = 0, qReact = 0;
      if (capOn && capModel === 'mvar') qCap = (buses[i].Qcap || 0) / baseMva;
      if (reactOn && reactModel === 'mvar') qReact = (buses[i].Qreact || 0) / baseMva;
      buses[i].Ql = buses[i]._Ql_load - qCap + qReact;
    }
  }
}

/**
 * Handle table cell edits for bus/branch parameters.
 * Updates model and syncs sliders.
 *
 * This function is called when user edits parameter tables and must:
 * - Update the model (buses[], branches[], baseLoads[])
 * - Sync matching sliders so applyControls doesn't overwrite edits
 * - Set topologyChanged flag for rebase operations
 * - Call runSolve() to re-solve
 *
 * Note: Full implementation requires access to DOM elements, global state,
 * and functions like rebaseAtBus, rebaseConnectedBranches, updateLabels, runSolve.
 * This is a placeholder showing the main editing logic.
 *
 * @param {Event} ev - Input change event
 * @param {Object} context - {buses, branches, baseLoads, baseMva, topologyChangedRef}
 */
export function onCellEdit(ev, context) {
  const { buses, branches, baseLoads, baseMva } = context;
  const el = ev.target;
  const kind = el.dataset.kind;
  const v = parseFloat(el.value);
  if (!isFinite(v)) return;

  if (el.dataset.idx !== undefined) {
    const i = parseInt(el.dataset.idx, 10);
    if (kind === 'Pl') {
      const scale = parseFloat(document.getElementById('loadscale').value || '1');
      baseLoads[i].Pl = (v / baseMva) / (scale || 1);
    } else if (kind === 'Ql') {
      const scale = parseFloat(document.getElementById('loadscale').value || '1');
      baseLoads[i].Ql = (v / baseMva) / (scale || 1);
    } else if (kind === 'Qcap') {
      buses[i].Qcap = Math.max(0, v);
    } else if (kind === 'Qreact') {
      buses[i].Qreact = Math.max(0, v);
    } else if (kind === 'Bsh') {
      buses[i].Bsh = v / baseMva;
    } else if (kind === 'Pg') {
      buses[i].Pg = v / baseMva;
      const slider = document.querySelector(`input[data-ctrl="pgen"][data-busidx="${i}"]`);
      if (slider) {
        const maxAttr = parseFloat(slider.max);
        if (v > maxAttr) slider.max = String(Math.ceil(v * 1.5 / 25) * 25);
        if (v < parseFloat(slider.min)) slider.min = String(Math.floor(v * 1.5 / 25) * 25);
        slider.value = String(v);
      }
    } else if (kind === 'Qg') {
      buses[i].Qg = v / baseMva;
      const slider = document.querySelector(`input[data-ctrl="qgen"][data-busidx="${i}"]`);
      if (slider) {
        const maxAttr = parseFloat(slider.max);
        const minAttr = parseFloat(slider.min);
        if (v > maxAttr) slider.max = String(Math.ceil(Math.abs(v) * 1.5 / 10) * 10);
        if (v < minAttr) slider.min = String(-Math.ceil(Math.abs(v) * 1.5 / 10) * 10);
        slider.value = String(v);
      }
    } else if (kind === 'V') {
      buses[i].V = v;
      const slider = document.querySelector(`input[data-ctrl="vgen"][data-busidx="${i}"]`);
      if (slider) {
        if (v >= parseFloat(slider.min) && v <= parseFloat(slider.max)) {
          slider.value = String(v);
        }
      }
    } else if (kind === 'Qgmin') {
      const raw = el.value.trim();
      buses[i].Qgmin = (raw === '' || !isFinite(v)) ? null : v;
    } else if (kind === 'Qgmax') {
      const raw = el.value.trim();
      buses[i].Qgmax = (raw === '' || !isFinite(v)) ? null : v;
    } else if (kind === 'Pgmin') {
      const raw = el.value.trim();
      buses[i].Pgmin = (raw === '' || !isFinite(v)) ? null : v;
      const slider = document.querySelector(`input[data-ctrl="pgen"][data-busidx="${i}"]`);
      if (slider && buses[i].Pgmin != null) {
        slider.min = String(Math.min(parseFloat(slider.min), buses[i].Pgmin));
      }
    } else if (kind === 'Pgmax') {
      const raw = el.value.trim();
      buses[i].Pgmax = (raw === '' || !isFinite(v)) ? null : v;
      const slider = document.querySelector(`input[data-ctrl="pgen"][data-busidx="${i}"]`);
      if (slider && buses[i].Pgmax != null) {
        slider.max = String(Math.max(parseFloat(slider.max), buses[i].Pgmax));
      }
    } else if (kind === 'Zgen_r') {
      const raw = el.value.trim();
      buses[i].Zgen_r = (raw === '' || !isFinite(v)) ? 0 : Math.max(0, v);
    } else if (kind === 'Zgen_x') {
      const raw = el.value.trim();
      buses[i].Zgen_x = (raw === '' || !isFinite(v)) ? 0 : v;
    }
  } else if (el.dataset.bidx !== undefined) {
    const i = parseInt(el.dataset.bidx, 10);
    if (kind === 'phaseShiftDeg') {
      branches[i].phaseShift = (v * Math.PI / 180);
      const slider = document.querySelector(`input[data-ctrl="phase"][data-bridx="${i}"]`);
      if (slider) {
        const minV = parseFloat(slider.min), maxV = parseFloat(slider.max);
        if (v < minV) slider.min = String(v - 5);
        if (v > maxV) slider.max = String(v + 5);
        slider.value = String(v);
      }
    } else {
      branches[i][kind] = v;
      if (kind === 'tap') {
        const slider = document.querySelector(`input[data-ctrl="tap"][data-bridx="${i}"]`);
        if (slider) {
          const minV = parseFloat(slider.min), maxV = parseFloat(slider.max);
          if (v < minV) slider.min = String(Math.min(v, 0.85));
          if (v > maxV) slider.max = String(Math.max(v, 1.15));
          slider.value = String(v);
        }
      }
    }
  }
}
