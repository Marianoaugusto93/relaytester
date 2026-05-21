// ── Report export utilities ──────────────────────────────────────────────────
// exportPDF: uses jsPDF if available (optional dep), else falls back to HTML print
// exportCSV: downloads a CSV file
// exportJSON: downloads a JSON file

import { computeTimeForCurve, mapCurveName } from './CurveModel.js';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeFilename(name) {
  return (name || 'campaign').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40);
}

// ── TCC chart SVG builder (mirrors TestChart.jsx geometry) ──────────────────
const _W = 760, _H = 420;
const _PAD = { top: 28, right: 28, bottom: 48, left: 58 };
const _CW = _W - _PAD.left - _PAD.right;
const _CH = _H - _PAD.top - _PAD.bottom;
const _I_MIN = 1, _I_MAX = 20;
const _T_MIN = 0.01, _T_MAX = 100;
const _I_TICKS = [1, 1.5, 2, 3, 5, 7, 10, 15, 20];
const _T_TICKS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];

function _logX(val) {
  return _PAD.left + (Math.log10(val / _I_MIN) / Math.log10(_I_MAX / _I_MIN)) * _CW;
}
function _logY(val) {
  if (val <= 0 || !isFinite(val)) return _PAD.top;
  const y = _PAD.top + (1 - Math.log10(val / _T_MIN) / Math.log10(_T_MAX / _T_MIN)) * _CH;
  return Math.max(_PAD.top, Math.min(_PAD.top + _CH, y));
}

function _buildCurvePath(curve, td, npts = 120) {
  let d = '', first = true;
  for (let i = 0; i <= npts; i++) {
    const m = Math.pow(10, Math.log10(_I_MIN) + (i / npts) * Math.log10(_I_MAX / _I_MIN));
    if (m <= 1) continue;
    const t = computeTimeForCurve(curve, m, td);
    if (!isFinite(t) || t <= 0) { first = true; continue; }
    const x = _logX(m).toFixed(1), y = _logY(t).toFixed(1);
    d += first ? `M${x},${y}` : `L${x},${y}`;
    first = false;
  }
  return d;
}

function _buildBandPath(curve, td, tolPct, npts = 120) {
  const upper = [], lower = [];
  for (let i = 0; i <= npts; i++) {
    const m = Math.pow(10, Math.log10(_I_MIN) + (i / npts) * Math.log10(_I_MAX / _I_MIN));
    if (m <= 1) continue;
    const t = computeTimeForCurve(curve, m, td);
    if (!isFinite(t) || t <= 0) continue;
    upper.push([_logX(m), _logY(t * (1 + tolPct))]);
    lower.push([_logX(m), _logY(t * (1 - tolPct))]);
  }
  if (upper.length === 0) return '';
  let d = `M${upper[0][0].toFixed(1)},${upper[0][1].toFixed(1)}`;
  upper.slice(1).forEach(([x, y]) => { d += `L${x.toFixed(1)},${y.toFixed(1)}`; });
  lower.reverse().forEach(([x, y]) => { d += `L${x.toFixed(1)},${y.toFixed(1)}`; });
  return d + 'Z';
}

function _buildFittedPath(results) {
  const valid = results
    .filter(r => r.tMeasured && isFinite(r.tMeasured) && r.IxIpk > 1)
    .sort((a, b) => a.IxIpk - b.IxIpk);
  if (valid.length < 2) return '';
  return valid.map(({ IxIpk, tMeasured }, i) => {
    const x = _logX(IxIpk).toFixed(1), y = _logY(tMeasured).toFixed(1);
    return i === 0 ? `M${x},${y}` : `L${x},${y}`;
  }).join('');
}

/**
 * Build a standalone SVG string for the TCC chart (report mode).
 * No React / DOM dependencies — pure string construction.
 * @param {object|null} stage  — relay stage settings
 * @param {Array}       results — evaluated point results
 * @returns {string} SVG markup
 */
function buildChartSVG(stage, results) {
  if (!stage || stage.curve == null) return '';

  const curve = mapCurveName(stage.curve);
  const td = stage.timeDial ?? stage.timeOp;
  if (td == null) return '';

  const curvePath = _buildCurvePath(curve, td);
  const bandPath = _buildBandPath(curve, td, 0.05);
  const fittedPath = _buildFittedPath(results);
  const passCount = results.filter(r => r.pass).length;

  const gridLinesI = _I_TICKS.map(v =>
    `<line x1="${_logX(v).toFixed(1)}" y1="${_PAD.top}" x2="${_logX(v).toFixed(1)}" y2="${_PAD.top + _CH}" stroke="rgba(0,0,0,.06)" stroke-width="1"/>`
  ).join('');

  const gridLinesT = _T_TICKS.map(v =>
    `<line x1="${_PAD.left}" y1="${_logY(v).toFixed(1)}" x2="${_PAD.left + _CW}" y2="${_logY(v).toFixed(1)}" stroke="rgba(0,0,0,.06)" stroke-width="1"/>`
  ).join('');

  const xLabels = _I_TICKS.map(v =>
    `<text x="${_logX(v).toFixed(1)}" y="${_PAD.top + _CH + 16}" text-anchor="middle" font-size="9" fill="#6b7280" font-family="monospace">${v}×</text>`
  ).join('');

  const yLabels = _T_TICKS.filter(v => [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 100].includes(v)).map(v =>
    `<text x="${_PAD.left - 6}" y="${(_logY(v) + 3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#6b7280" font-family="monospace">${v < 1 ? v : `${v}s`}</text>`
  ).join('');

  const measuredPts = results
    .filter(r => r.IxIpk > 1 && r.tMeasured && isFinite(r.tMeasured))
    .map(r => {
      const cx = _logX(r.IxIpk).toFixed(1), cy = _logY(r.tMeasured).toFixed(1);
      const fill = r.pass ? '#22c55e' : '#f87171';
      const stroke = r.pass ? 'rgba(34,197,94,.4)' : 'rgba(248,113,113,.4)';
      return `<circle cx="${cx}" cy="${cy}" r="5" fill="${fill}" fill-opacity="0.9" stroke="${stroke}" stroke-width="1.5"/>`;
    }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${_W} ${_H}" width="${_W}" height="${_H}">
  <rect width="${_W}" height="${_H}" rx="8" fill="#f9fafb"/>
  ${bandPath ? `<path d="${bandPath}" fill="rgba(249,115,22,.08)" stroke="none"/>` : ''}
  ${gridLinesI}
  ${gridLinesT}
  <line x1="${_PAD.left}" y1="${_PAD.top}" x2="${_PAD.left}" y2="${_PAD.top + _CH}" stroke="rgba(0,0,0,.15)" stroke-width="1"/>
  <line x1="${_PAD.left}" y1="${_PAD.top + _CH}" x2="${_PAD.left + _CW}" y2="${_PAD.top + _CH}" stroke="rgba(0,0,0,.15)" stroke-width="1"/>
  ${xLabels}
  ${yLabels}
  <text x="${_PAD.left + _CW / 2}" y="${_H - 4}" text-anchor="middle" font-size="10" fill="#9ca3af" font-family="monospace">I / Ipk</text>
  <text x="10" y="${_PAD.top + _CH / 2}" text-anchor="middle" transform="rotate(-90,10,${_PAD.top + _CH / 2})" font-size="10" fill="#9ca3af" font-family="monospace">t (s)</text>
  ${curvePath ? `<path d="${curvePath}" fill="none" stroke="rgba(249,115,22,.5)" stroke-width="1.5" stroke-dasharray="6,4"/>` : ''}
  ${fittedPath ? `<path d="${fittedPath}" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/>` : ''}
  ${measuredPts}
  <g transform="translate(${_PAD.left + 8},${_PAD.top + 8})">
    <rect x="0" y="0" width="190" height="72" rx="5" fill="rgba(255,255,255,.85)" stroke="rgba(0,0,0,.08)" stroke-width="1"/>
    <line x1="8" y1="13" x2="28" y2="13" stroke="rgba(249,115,22,.6)" stroke-width="2" stroke-dasharray="4,3"/>
    <text x="32" y="17" font-size="9" fill="#6b7280" font-family="monospace">Curva teórica</text>
    <rect x="8" y="25" width="20" height="8" fill="rgba(249,115,22,.15)" stroke="rgba(249,115,22,.3)" stroke-width="1"/>
    <text x="32" y="32" font-size="9" fill="#6b7280" font-family="monospace">Banda ±5%</text>
    <circle cx="18" cy="47" r="4" fill="#22c55e" opacity="0.85"/>
    <text x="32" y="51" font-size="9" fill="#6b7280" font-family="monospace">Medido</text>
    <text x="32" y="67" font-size="9" fill="#9ca3af" font-family="monospace">${passCount}/${results.length} PASS</text>
  </g>
</svg>`;
}

/**
 * Convert an SVG string to a PNG data URL via an off-screen canvas.
 * Returns a Promise<string> resolving to the data URL, or null on failure.
 * @param {string} svgStr — full SVG markup string
 * @param {number} w — canvas width in px
 * @param {number} h — canvas height in px
 * @returns {Promise<string|null>}
 */
function svgToPngDataUrl(svgStr, w, h) {
  return new Promise(resolve => {
    try {
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    } catch (_) {
      resolve(null);
    }
  });
}

/**
 * Export campaign results as PDF.
 * Uses jsPDF if available; otherwise opens a printable HTML window.
 * Page 1: header + TCC chart (180×100 mm) + compact KPIs.
 * Page 2+: full results table.
 * @param {object} campaign  — { name, relay, bay }
 * @param {object} test      — { fn, stage, points }
 * @param {Array}  results   — array of evaluated point results
 */
export async function exportPDF(campaign, test, results) {
  const cName = campaign?.name || 'Campaign';
  const fn = test?.fn || '51';
  const passCount = results.filter(r => r.pass).length;
  const pct = results.length > 0 ? ((passCount / results.length) * 100).toFixed(0) : 0;
  const stage = test?.stage || null;

  // Try jsPDF (optional CDN dep)
  const jsPDF = typeof window !== 'undefined' ? window.jspdf?.jsPDF : undefined;
  if (jsPDF) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210, pageH = 297;
    const margin = 14;

    // ── Page 1: Header ───────────────────────────────────────────────────────
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Relay Test Report — ${cName}`, margin, 16);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(`Função: ${fn}  |  Relé: ${campaign?.relay || '—'}  |  Bay: ${campaign?.bay || '—'}`, margin, 22);
    doc.text(`Gerado: ${new Date().toLocaleString()}`, margin, 27);

    // ── Page 1: TCC Chart image ──────────────────────────────────────────────
    const chartSvg = buildChartSVG(stage, results);
    const chartW = 760, chartH = 420;
    const pngDataUrl = await svgToPngDataUrl(chartSvg, chartW, chartH);
    const imgY = 32;
    const imgW = pageW - margin * 2;   // ~182 mm
    const imgH = Math.round(imgW * (chartH / chartW));  // keep aspect ratio (~101 mm)

    if (pngDataUrl) {
      doc.addImage(pngDataUrl, 'PNG', margin, imgY, imgW, imgH);
    }

    // ── Page 1: Compact KPIs below chart ────────────────────────────────────
    let ky = imgY + imgH + 8;
    const validDev = results.filter(r => r.dtPct != null);
    const avgDev = validDev.length > 0
      ? validDev.reduce((s, r) => s + (r.dtPct || 0), 0) / validDev.length : 0;
    const pickupRes = results.filter(r => r.kind?.startsWith('pickup') && r.IpickupMeasured != null);
    const measPkup = pickupRes.length > 0 ? pickupRes[0].IpickupMeasured : null;

    const kpis = [
      ['Aprovação', `${passCount}/${results.length} (${pct}%)`],
      ['Desvio médio', `${avgDev >= 0 ? '+' : ''}${avgDev.toFixed(1)}%`],
      ['Pickup medido', measPkup != null ? `${measPkup.toFixed(3)} A` : '—'],
      ['Curva', stage?.curve || '—'],
      ['Pickup ref.', stage?.pickup != null ? `${stage.pickup} A` : '—'],
      ['Time Dial', stage?.timeDial != null ? String(stage.timeDial) : '—'],
    ];
    const kpiColW = (pageW - margin * 2) / 3;
    doc.setFontSize(8);
    kpis.forEach(([lbl, val], idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const kx = margin + col * kpiColW;
      const ky2 = ky + row * 10;
      doc.setTextColor(120, 120, 120);
      doc.text(lbl, kx, ky2);
      doc.setTextColor(30, 30, 30);
      doc.setFont(undefined, 'bold');
      doc.text(val, kx, ky2 + 4.5);
      doc.setFont(undefined, 'normal');
    });

    // ── Page 2+: Results table ───────────────────────────────────────────────
    doc.addPage();
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Resultados — ${cName} / ${fn}`, margin, 14);
    doc.setFont(undefined, 'normal');

    const headers = ['#', 'Tipo', 'I/Ipk', 'I(A)', 't esp(s)', 't med(s)', 'Dev%', 'Status'];
    const colW = [8, 18, 16, 18, 20, 20, 16, 16];
    const rows = results.map((r, i) => [
      i + 1,
      r.kind === 'curve' ? 'Curva' : r.kind === 'definite' ? 'DT'
        : r.kind === 'pickup-up' ? 'Pkup↑' : r.kind === 'pickup-down' ? 'Pkup↓'
        : r.kind || '—',
      r.IxIpk != null ? r.IxIpk.toFixed(2) : '—',
      r.Iamps != null ? r.Iamps.toFixed(3) : '—',
      r.tExpected != null && isFinite(r.tExpected) ? r.tExpected.toFixed(3) : '—',
      r.tMeasured != null ? r.tMeasured.toFixed(3) : '—',
      r.dtPct != null ? `${r.dtPct.toFixed(1)}%` : '—',
      r.pass ? 'PASS' : 'FAIL',
    ]);

    let ty = 22;
    let tx = margin;
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(100, 100, 100);
    headers.forEach((h, i) => { doc.text(h, tx, ty); tx += colW[i]; });
    doc.setFont(undefined, 'normal');
    ty += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, ty, pageW - margin, ty);
    ty += 4;

    rows.forEach((row, ri) => {
      tx = margin;
      const pass = results[ri].pass;
      if (pass === true) doc.setTextColor(34, 197, 94);
      else if (pass === false) doc.setTextColor(248, 113, 113);
      else doc.setTextColor(30, 30, 30);
      doc.setFontSize(7.5);
      row.forEach((cell, i) => {
        if (i < row.length - 1) doc.setTextColor(30, 30, 30);
        else {
          if (pass === true) doc.setTextColor(34, 197, 94);
          else if (pass === false) doc.setTextColor(248, 113, 113);
        }
        doc.text(String(cell), tx, ty);
        tx += colW[i];
      });
      ty += 5;
      if (ty > pageH - 16) { doc.addPage(); ty = 16; }
    });

    doc.save(`${safeFilename(cName)}_report.pdf`);
    return;
  }

  // ── Fallback: printable HTML popup (includes inline SVG chart) ────────────
  const chartSvgFallback = buildChartSVG(stage, results);

  const tableRows = results.map((r, i) => `
    <tr style="background:${r.pass ? 'rgba(74,222,128,.08)' : 'rgba(248,113,113,.08)'}">
      <td>${i + 1}</td>
      <td>${r.kind === 'curve' ? 'Curva' : r.kind === 'definite' ? 'DT'
          : r.kind === 'pickup-up' ? 'Pkup↑' : r.kind === 'pickup-down' ? 'Pkup↓'
          : r.kind || '—'}</td>
      <td>${r.IxIpk != null ? r.IxIpk.toFixed(2) : '—'}</td>
      <td>${r.Iamps != null ? r.Iamps.toFixed(3) : '—'}</td>
      <td>${r.tExpected != null && isFinite(r.tExpected) ? r.tExpected.toFixed(3) : '—'}</td>
      <td>${r.tMeasured != null ? r.tMeasured.toFixed(3) : '—'}</td>
      <td>${r.dtPct != null ? r.dtPct.toFixed(1) + '%' : '—'}</td>
      <td style="font-weight:700;color:${r.pass ? '#22c55e' : '#f87171'}">${r.pass ? 'PASS' : 'FAIL'}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Relay Test Report — ${cName}</title>
    <style>
      body{font-family:monospace;padding:20px;background:#fff;color:#111}
      h1{font-size:16px;margin-bottom:4px}
      p{font-size:12px;color:#555;margin-bottom:8px}
      .chart-wrap{width:100%;max-width:720px;margin:12px 0 16px}
      .kpis{display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap}
      .kpi{background:#f3f4f6;border-radius:6px;padding:8px 14px;min-width:120px}
      .kpi-label{font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:1px}
      .kpi-value{font-size:18px;font-weight:800;margin-top:2px}
      table{border-collapse:collapse;width:100%;font-size:11px;page-break-before:always}
      th{text-align:left;padding:5px 8px;background:#eee;border-bottom:2px solid #ccc}
      td{padding:4px 8px;border-bottom:1px solid #e5e7eb}
      @media print{.chart-wrap{max-width:100%}}
    </style>
  </head><body>
    <h1>Relay Test Report — ${cName}</h1>
    <p>Função: ${fn} | Relé: ${campaign?.relay || '—'} | Bay: ${campaign?.bay || '—'} | ${new Date().toLocaleString()}</p>
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Aprovação</div>
        <div class="kpi-value" style="color:${parseInt(pct) === 100 ? '#22c55e' : '#f87171'}">${passCount}/${results.length} (${pct}%)</div></div>
      <div class="kpi"><div class="kpi-label">Função</div><div class="kpi-value">${fn}</div></div>
      <div class="kpi"><div class="kpi-label">Curva</div><div class="kpi-value">${stage?.curve || '—'}</div></div>
      <div class="kpi"><div class="kpi-label">Pickup</div><div class="kpi-value">${stage?.pickup != null ? stage.pickup + ' A' : '—'}</div></div>
    </div>
    <div class="chart-wrap">${chartSvgFallback}</div>
    <table>
      <thead><tr><th>#</th><th>Tipo</th><th>I/Ipk</th><th>I(A)</th><th>t esp(s)</th><th>t med(s)</th><th>Dev%</th><th>Status</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }
}

/**
 * Export campaign results as CSV.
 * @param {object} campaign
 * @param {object} test
 * @param {Array}  results
 */
export function exportCSV(campaign, test, results) {
  const cName = campaign?.name || 'Campaign';
  const fn = test?.fn || '51';
  const header = ['#', 'fn', 'kind', 'IxIpk', 'Iamps', 'tExpected', 'tMeasured', 'dtAbs', 'dtPct', 'pass', 'failReason'];
  const rows = results.map((r, i) => [
    i + 1,
    fn,
    r.kind || '',
    r.IxIpk != null ? r.IxIpk.toFixed(4) : '',
    r.Iamps != null ? r.Iamps.toFixed(4) : '',
    r.tExpected != null && isFinite(r.tExpected) ? r.tExpected.toFixed(4) : '',
    r.tMeasured != null ? r.tMeasured.toFixed(4) : '',
    r.dtAbs != null ? r.dtAbs.toFixed(4) : '',
    r.dtPct != null ? r.dtPct.toFixed(2) : '',
    r.pass ? 'PASS' : 'FAIL',
    r.failReason || '',
  ]);

  const lines = [
    `# Relay Test Report — ${cName}`,
    `# Relay: ${campaign?.relay || ''} | Bay: ${campaign?.bay || ''} | ${new Date().toISOString()}`,
    '',
    header.join(','),
    ...rows.map(row => row.map(v => JSON.stringify(String(v))).join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${safeFilename(cName)}_${fn}_report.csv`);
}

/**
 * Export campaign results as JSON.
 * @param {object} campaign
 * @param {object} test
 * @param {Array}  results
 */
export function exportJSON(campaign, test, results) {
  const cName = campaign?.name || 'Campaign';
  const payload = {
    meta: {
      campaign: cName,
      relay: campaign?.relay || '',
      bay: campaign?.bay || '',
      fn: test?.fn || '',
      exportedAt: new Date().toISOString(),
      passCount: results.filter(r => r.pass).length,
      totalCount: results.length,
    },
    test,
    results,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${safeFilename(cName)}_${test?.fn || 'test'}_report.json`);
}

export const ReportExporter = { exportPDF, exportCSV, exportJSON };
