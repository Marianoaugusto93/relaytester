/**
 * Power Flow Solver Diagnostics
 *
 * Convergence diagnostics, P-V curve tracing, and recovery strategies.
 *
 * Phase 5: Diagnostics extraction from legacy powerflow.html
 */

/**
 * Trace the P-V curve (voltage stability nose) by scaling load incrementally.
 *
 * This function performs a load-scaling sweep, starting from a low base point
 * and incrementally increasing the load scale until either:
 * 1. Maximum iterations reached (80 samples)
 * 2. Load scale exceeds maxScale
 * 3. No convergence found (nose reached)
 *
 * The function adapts step size based on voltage drops and convergence behavior:
 * - If voltage drop > 0.05 pu detected, halve step to capture curvature
 * - If 3+ consecutive converged steps, grow step up to 0.10
 * - If step fails, halve step and retry from last converged point
 *
 * Returns {samples, loadBusIdxs} where each sample contains {scale, voltages, thetas}
 *
 * Note: This function mutates buses[] during execution. Caller should save/restore
 * bus state before/after calling.
 *
 * @param {Array} buses - Bus array (mutated during trace)
 * @param {Array} baseLoads - Base load values for scaling
 * @param {Object} context - {maxScale, tryInnerSolve, applyControls, applyFlatStart, applyDcSeed, updateLabels}
 * @returns {Object} {samples: Array, loadBusIdxs: Array}
 */
export function tracePvCurve(buses, baseLoads, context) {
  const {
    maxScale = 5.0,
    tryInnerSolve,
    applyControls,
    applyFlatStart,
    applyDcSeed,
    updateLabels,
  } = context;

  const lsEl = document.getElementById('loadscale');
  if (!lsEl) return { samples: [], loadBusIdxs: [] };

  // Identify load buses (PQ with non-zero baseLoad) and PV/slack for context
  const loadBusIdxs = [];
  for (let i = 0; i < buses.length; i++) {
    if (buses[i].type === 'pq' &&
        ((baseLoads[i] && (baseLoads[i].Pl > 0 || baseLoads[i].Ql > 0)) ||
         (buses[i].Pl > 0 || buses[i].Ql > 0))) {
      loadBusIdxs.push(i);
    }
  }
  for (let i = 0; i < buses.length; i++) {
    if ((buses[i].type === 'slack' || buses[i].type === 'pv') && !loadBusIdxs.includes(i)) {
      loadBusIdxs.push(i);
    }
  }

  let scale = 0.10;
  let step = 0.10;
  const minStep = 0.005;
  const samples = [];
  let consecutive = 0;
  const MAX_SAMPLES = 80;

  // Initialize with flat start at low load
  lsEl.value = String(scale);
  updateLabels();
  applyFlatStart(1.0);
  applyDcSeed();
  applyControls();
  let result = tryInnerSolve();
  if (!result || !result.converged) return { samples: [], loadBusIdxs };

  samples.push({
    scale,
    voltages: buses.map(b => b.V),
    thetas: buses.map(b => b.theta || 0)
  });

  // Load scaling loop
  while (samples.length < MAX_SAMPLES && scale < maxScale) {
    const nextScale = scale + step;
    lsEl.value = String(nextScale);
    updateLabels();
    applyControls();
    result = tryInnerSolve();

    if (result && result.converged) {
      const last = samples[samples.length - 1];
      let maxDrop = 0;
      for (const i of loadBusIdxs) {
        if (buses[i].type === 'pq') {
          const drop = last.voltages[i] - buses[i].V;
          if (drop > maxDrop) maxDrop = drop;
        }
      }
      scale = nextScale;
      samples.push({
        scale,
        voltages: buses.map(b => b.V),
        thetas: buses.map(b => b.theta || 0)
      });
      consecutive++;
      if (maxDrop > 0.05) {
        step = Math.max(minStep, step / 2);
        consecutive = 0;
      } else if (consecutive >= 3 && step < 0.10) {
        step = Math.min(0.10, step * 1.4);
      }
    } else {
      consecutive = 0;
      if (step <= minStep) break;
      step = step / 2;
      const last = samples[samples.length - 1];
      for (let i = 0; i < buses.length; i++) {
        buses[i].V = last.voltages[i];
        if (last.thetas) buses[i].theta = last.thetas[i];
      }
    }
  }

  return { samples, loadBusIdxs };
}

/**
 * Render the P-V curve as an inline SVG chart.
 *
 * @param {Object} curve - {samples, loadBusIdxs}
 * @returns {string} SVG HTML string
 */
export function renderPvCurveSvg(curve) {
  if (!curve || !curve.samples || curve.samples.length < 2) return '';

  const samples = curve.samples;
  const loadBusIdxs = curve.loadBusIdxs;
  const W = 380, H = 240, padL = 50, padR = 70, padT = 14, padB = 28;

  // Scale data
  const minLambda = 0;
  const maxLambda = Math.max(...samples.map(s => s.scale));
  const minV = Math.min(...samples.flatMap(s => s.voltages));
  const maxV = 1.05;

  const xScale = (W - padL - padR) / (maxLambda || 1);
  const yScale = (H - padT - padB) / (maxV - minV || 1);

  let svg = `<svg width="${W}" height="${H}" style="border:1px solid #e5e5ea;border-radius:6px;background:#fafafa;">`;

  // Grid and axes
  svg += `<line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#ccc" stroke-width="1"/>`;
  svg += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#ccc" stroke-width="1"/>`;

  // Axis labels
  svg += `<text x="${padL - 30}" y="${H - padB + 14}" font-size="11" text-anchor="middle">0</text>`;
  svg += `<text x="${W - padR + 10}" y="${H - padB + 14}" font-size="11" text-anchor="start">${maxLambda.toFixed(1)}</text>`;
  svg += `<text x="${padL - 30}" y="${padT + 4}" font-size="11" text-anchor="middle">${maxV.toFixed(2)}</text>`;

  // Plot curves for each load bus
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
  loadBusIdxs.forEach((busIdx, colorIdx) => {
    const color = colors[colorIdx % colors.length];
    let pathD = '';
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const x = padL + sample.scale * xScale;
      const y = H - padB - (sample.voltages[busIdx] - minV) * yScale;
      pathD += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
    }
    svg += `<path d="${pathD}" stroke="${color}" stroke-width="2" fill="none" opacity="0.8"/>`;
  });

  svg += `<text x="${(W + padL - padR) / 2}" y="${H - 4}" font-size="11" text-anchor="middle" fill="#666">Load Scale λ</text>`;
  svg += `<text x="8" y="${(H + padT - padB) / 2}" font-size="11" text-anchor="middle" fill="#666" transform="rotate(-90 8 ${(H + padT - padB) / 2})">Voltage (pu)</text>`;

  svg += '</svg>';
  return svg;
}

/**
 * Run convergence diagnostics after a failed solve.
 *
 * This function performs:
 * 1. Structural checks (reachability from slack, data issues)
 * 2. If recoverable: alternative solve strategies (flat start, different load levels)
 * 3. P-V curve tracing if voltage collapse is suspected
 * 4. Displays diagnosis in #convergence-diagnostic element
 *
 * Note: This function requires access to many global functions and state variables
 * from the HTML context. It's meant to be called from within powerflow.html after
 * a failed solve attempt.
 *
 * @param {Object} failedResult - Result from failed solve (iter, converged, singular, chattering, maxMis)
 * @param {Object} context - {
 *   buses, branches, baseLoads, baseMva,
 *   findDataIssues, reachableFromSlack, diagnosticSolve,
 *   tracePvCurve, renderPvCurveSvg, topologyChanged
 * }
 */
export function runConvergenceDiagnostics(failedResult, context) {
  const {
    buses,
    findDataIssues,
    reachableFromSlack,
    diagnosticSolve,
    tracePvCurve,
    renderPvCurveSvg,
  } = context;

  const status = document.getElementById('status');
  const panel = document.getElementById('convergence-diagnostic');
  if (!panel) {
    if (status) {
      status.className = 'status bad';
      status.textContent = failedResult.singular
        ? `System is singular — likely an islanded bus.`
        : `Did not converge after ${failedResult.iter} iterations.`;
    }
    return;
  }

  const dataIssues = findDataIssues();
  const reachable = reachableFromSlack();
  const slackCount = buses.filter(b => b.type === 'slack').length;
  const islanded = [];
  for (let i = 0; i < buses.length; i++) {
    if (!reachable.has(i)) islanded.push(buses[i]);
  }

  let html = '';
  status.className = 'status bad';
  if (failedResult.singular) {
    status.textContent = `Solver failed — singular Jacobian. See diagnostic panel below.`;
  } else if (failedResult.chattering) {
    status.textContent = `Solver failed — Q-limit chattering. See diagnostic panel.`;
  } else {
    status.textContent = `Solver failed after ${failedResult.iter} iterations (max mismatch ${failedResult.maxMis.toExponential(2)} pu). See diagnostic panel.`;
  }

  html += '<h3 style="margin: 8px 0; color: #b00020;">Convergence diagnostic</h3>';

  // Islanded buses
  if (islanded.length > 0) {
    html += '<div class="diag-block">';
    html += '<strong>⚠ Islanded buses detected.</strong> The following buses have no in-service path to the slack bus:<br>';
    html += '<ul style="margin: 4px 0 4px 20px;">';
    for (const b of islanded) {
      html += `<li>B${b.id}${b.label ? ' (' + b.label.split('\n')[0] + ')' : ''}</li>`;
    }
    html += '</ul>';
    html += '</div>';
  }

  // Data issues
  if (dataIssues.length > 0) {
    html += '<div class="diag-block">';
    html += '<strong>⚠ Data inconsistency.</strong>';
    html += '<ul style="margin: 4px 0 4px 20px;">';
    for (const issue of dataIssues) html += `<li>${issue}</li>`;
    html += '</ul>';
    html += '</div>';
  }

  // Q-limit chattering
  if (failedResult.chattering) {
    html += '<div class="diag-block">';
    html += '<strong>⚠ Q-limit chattering.</strong> The Q-limit outer loop oscillated. Try widening Qmin/Qmax bounds.';
    html += '</div>';
  }

  const hardFailure = islanded.length > 0 || dataIssues.length > 0;

  if (!hardFailure && diagnosticSolve) {
    html += '<div class="diag-block">';
    html += '<strong>Trying alternative starting points…</strong>';
    panel.innerHTML = html + '</div>';

    const diag = diagnosticSolve();
    html = html.replace('<strong>Trying alternative starting points…</strong>', '');
    html += '<table class="diag-trace"><thead><tr><th>Strategy</th><th>Result</th><th>Iter</th><th>Max mismatch</th></tr></thead><tbody>';
    for (const t of diag.trace) {
      const ok = t.converged ? '✓ converged' : '✗ failed';
      const okClass = t.converged ? 'diag-ok' : 'diag-bad';
      let extra = '';
      if (t.noseScale != null) {
        extra = ` (nose at ~${(t.noseScale * 100).toFixed(0)}% of original)`;
      }
      html += `<tr><td>${t.strategy}${extra}</td><td class="${okClass}">${ok}</td><td>${t.iter || '—'}</td><td>${t.mismatch ? t.mismatch.toExponential(2) : '—'}</td></tr>`;
    }
    html += '</tbody></table>';
    html += '</div>';

    if (diag.recovered) {
      html += '<div class="diag-block diag-good">';
      html += '<strong>✓ Recovered with an alternative initial guess.</strong>';
      html += '</div>';
      if (diag.result && Array.isArray(diag.result.qLimitHits)) {
        buses.forEach(b => { b._qLimitHit = null; b._Vactual = null; });
        for (const h of diag.result.qLimitHits) {
          const b = buses[h.busIdx];
          if (!b) continue;
          b._qLimitHit = h.which;
          b._Vactual = b.V;
        }
      }
    } else if (diag.diagnosis === 'voltageCollapse' && diag.noseScale < diag.originalScale * 0.98) {
      const pct = (diag.noseScale / diag.originalScale * 100).toFixed(0);
      html += '<div class="diag-block">';
      html += `<strong>Likely cause: voltage collapse.</strong> The system operates at about ${pct}% of requested load.`;
      html += '<div style="margin-top:8px;"><button id="trace-pv-btn" class="primary" style="font-size:12px;padding:5px 10px;">Trace P-V curve</button></div>';
      html += '<div id="pv-chart" style="margin-top:8px;"></div>';
      html += '</div>';
    }
  }

  panel.innerHTML = html;

  // Wire up P-V trace button
  const traceBtn = document.getElementById('trace-pv-btn');
  if (traceBtn && tracePvCurve) {
    traceBtn.addEventListener('click', () => {
      traceBtn.disabled = true;
      const chartEl = document.getElementById('pv-chart');
      if (!chartEl) return;
      const lsEl = document.getElementById('loadscale');
      const userScale = lsEl ? parseFloat(lsEl.value) : 1.0;
      const savedV = buses.map(b => b.V);
      const savedTheta = buses.map(b => b.theta || 0);
      setTimeout(() => {
        try {
          const curve = tracePvCurve(buses, context.baseLoads, context);
          if (curve && curve.samples && curve.samples.length >= 2) {
            chartEl.innerHTML = renderPvCurveSvg(curve);
          }
        } finally {
          if (lsEl) lsEl.value = String(userScale);
          for (let i = 0; i < buses.length; i++) {
            buses[i].V = savedV[i];
            buses[i].theta = savedTheta[i];
          }
          traceBtn.disabled = false;
        }
      }, 50);
    });
  }
}
