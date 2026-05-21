import { computeTimeForCurve, mapCurveName } from './CurveModel.js';

// ── Log-log SVG chart for TCC curves ────────────────────────────────────────
// viewBox 760x420, supports plan (orange pts) and report (green pts + fitted curve)

const W = 760, H = 420;
const PAD = { top: 28, right: 28, bottom: 48, left: 58 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

// Decade grid: I from 1x to 20x, t from 0.01s to 100s
const I_MIN = 1, I_MAX = 20;
const T_MIN = 0.01, T_MAX = 100;

function logX(val) {
  return PAD.left + (Math.log10(val / I_MIN) / Math.log10(I_MAX / I_MIN)) * CW;
}
function logY(val) {
  if (val <= 0 || !isFinite(val)) return PAD.top; // clip to top
  const y = PAD.top + (1 - Math.log10(val / T_MIN) / Math.log10(T_MAX / T_MIN)) * CH;
  return Math.max(PAD.top, Math.min(PAD.top + CH, y));
}

function buildCurvePath(curve, td, npts = 120) {
  const mults = [];
  for (let i = 0; i <= npts; i++) {
    mults.push(Math.pow(10, Math.log10(I_MIN) + (i / npts) * Math.log10(I_MAX / I_MIN)));
  }
  let d = '';
  let first = true;
  for (const m of mults) {
    if (m <= 1) continue;
    const t = computeTimeForCurve(curve, m, td);
    if (!isFinite(t) || t <= 0) { first = true; continue; }
    const x = logX(m);
    const y = logY(t);
    if (first) { d += `M${x.toFixed(1)},${y.toFixed(1)}`; first = false; }
    else d += `L${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
}

function buildBandPath(curve, td, tolPct, npts = 120) {
  const mults = [];
  for (let i = 0; i <= npts; i++) {
    mults.push(Math.pow(10, Math.log10(I_MIN) + (i / npts) * Math.log10(I_MAX / I_MIN)));
  }
  const upper = [], lower = [];
  for (const m of mults) {
    if (m <= 1) continue;
    const t = computeTimeForCurve(curve, m, td);
    if (!isFinite(t) || t <= 0) continue;
    upper.push([logX(m), logY(t * (1 + tolPct))]);
    lower.push([logX(m), logY(t * (1 - tolPct))]);
  }
  if (upper.length === 0) return '';
  let d = `M${upper[0][0].toFixed(1)},${upper[0][1].toFixed(1)}`;
  upper.slice(1).forEach(([x, y]) => { d += `L${x.toFixed(1)},${y.toFixed(1)}`; });
  lower.reverse().forEach(([x, y]) => { d += `L${x.toFixed(1)},${y.toFixed(1)}`; });
  d += 'Z';
  return d;
}

// Grid decade values
const I_TICKS = [1, 1.5, 2, 3, 5, 7, 10, 15, 20];
const T_TICKS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];

export default function TestChart({ stage, fn, mode = 'plan', points = [], results = [] }) {
  const curve = stage ? mapCurveName(stage.curve) : 'IEC-Very-Inverse';
  const td = stage ? (stage.timeDial ?? stage.timeOp ?? 0.1) : 0.1;
  const tolPct = 0.05;

  const curvePath = buildCurvePath(curve, td);
  const bandPath = buildBandPath(curve, td, tolPct);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: '100%', maxHeight: 420, display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={W} height={H} rx="8" fill="var(--card2)" />

      {/* Tolerance band */}
      {bandPath && (
        <path d={bandPath} fill="rgba(249,115,22,.08)" stroke="none" />
      )}

      {/* Vertical grid lines (I decades) */}
      {I_TICKS.map(val => {
        const x = logX(val);
        return (
          <line key={val} x1={x} y1={PAD.top} x2={x} y2={PAD.top + CH}
            stroke="rgba(255,255,255,.05)" strokeWidth={1} />
        );
      })}

      {/* Horizontal grid lines (t decades) */}
      {T_TICKS.map(val => {
        const y = logY(val);
        return (
          <line key={val} x1={PAD.left} y1={y} x2={PAD.left + CW} y2={y}
            stroke="rgba(255,255,255,.05)" strokeWidth={1} />
        );
      })}

      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH}
        stroke="rgba(255,255,255,.15)" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top + CH} x2={PAD.left + CW} y2={PAD.top + CH}
        stroke="rgba(255,255,255,.15)" strokeWidth={1} />

      {/* X axis labels */}
      {I_TICKS.map(val => (
        <text key={val} x={logX(val)} y={PAD.top + CH + 16}
          textAnchor="middle" fontSize={9} fill="rgba(156,163,176,.6)" fontFamily="var(--fm)">
          {val}×
        </text>
      ))}

      {/* Y axis labels */}
      {T_TICKS.filter(v => [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 100].includes(v)).map(val => (
        <text key={val} x={PAD.left - 6} y={logY(val) + 3.5}
          textAnchor="end" fontSize={9} fill="rgba(156,163,176,.6)" fontFamily="var(--fm)">
          {val < 1 ? val : `${val}s`}
        </text>
      ))}

      {/* Axis labels */}
      <text x={PAD.left + CW / 2} y={H - 4} textAnchor="middle"
        fontSize={10} fill="rgba(156,163,176,.5)" fontFamily="var(--fm)">
        I / Ipk
      </text>
      <text x={10} y={PAD.top + CH / 2} textAnchor="middle"
        transform={`rotate(-90, 10, ${PAD.top + CH / 2})`}
        fontSize={10} fill="rgba(156,163,176,.5)" fontFamily="var(--fm)">
        t (s)
      </text>

      {/* Theoretical curve */}
      {curvePath && (
        <path d={curvePath} fill="none"
          stroke={mode === 'report' ? 'rgba(249,115,22,.4)' : 'var(--orange)'}
          strokeWidth={mode === 'report' ? 1.5 : 2}
          strokeDasharray={mode === 'report' ? '6,4' : undefined} />
      )}

      {/* Report: fitted curve through measured points */}
      {mode === 'report' && results.length > 2 && (() => {
        const validPts = results.filter(r => r.tMeasured && isFinite(r.tMeasured) && r.IxIpk > 1);
        if (validPts.length < 2) return null;
        let d = '';
        validPts.sort((a, b) => a.IxIpk - b.IxIpk).forEach(({ IxIpk, tMeasured }, i) => {
          const x = logX(IxIpk).toFixed(1);
          const y = logY(tMeasured).toFixed(1);
          d += i === 0 ? `M${x},${y}` : `L${x},${y}`;
        });
        return <path d={d} fill="none" stroke="var(--green)" strokeWidth={2} strokeLinecap="round" />;
      })()}

      {/* Plan mode: orange planned points */}
      {mode === 'plan' && points.filter(pt => pt.IxIpk > 1 && pt.tExpected > 0 && isFinite(pt.tExpected)).map((pt, i) => (
        <g key={pt.id || i}>
          <circle cx={logX(pt.IxIpk)} cy={logY(pt.tExpected)} r={5}
            fill="var(--orange)" fillOpacity={0.85} stroke="rgba(249,115,22,.4)" strokeWidth={1.5} />
          <text x={logX(pt.IxIpk) + 7} y={logY(pt.tExpected) + 4}
            fontSize={8} fill="var(--orange)" fontFamily="var(--fm)" opacity={0.8}>
            {pt.id}
          </text>
        </g>
      ))}

      {/* Report mode: green measured points with pass/fail indicator */}
      {mode === 'report' && results.filter(r => r.IxIpk > 1 && r.tMeasured && isFinite(r.tMeasured)).map((r, i) => (
        <g key={r.id || i}>
          <circle cx={logX(r.IxIpk)} cy={logY(r.tMeasured)} r={5}
            fill={r.pass ? 'var(--green)' : 'var(--red)'}
            fillOpacity={0.9} stroke={r.pass ? 'rgba(74,222,128,.4)' : 'rgba(248,113,113,.4)'} strokeWidth={1.5} />
        </g>
      ))}

      {/* Legend strip */}
      <g transform={`translate(${PAD.left + 8}, ${PAD.top + 8})`}>
        <rect x={0} y={0} width={190} height={72} rx={5}
          fill="rgba(14,17,22,.7)" stroke="rgba(255,255,255,.06)" strokeWidth={1} />
        {/* Theoretical curve */}
        <line x1={8} y1={13} x2={28} y2={13} stroke="var(--orange)" strokeWidth={2}
          strokeDasharray={mode === 'report' ? '4,3' : undefined} />
        <text x={32} y={17} fontSize={9} fill="rgba(156,163,176,.8)" fontFamily="var(--fm)">
          Curva teórica
        </text>
        {/* Tolerance band */}
        <rect x={8} y={25} width={20} height={8} fill="rgba(249,115,22,.15)"
          stroke="rgba(249,115,22,.3)" strokeWidth={1} />
        <text x={32} y={32} fontSize={9} fill="rgba(156,163,176,.8)" fontFamily="var(--fm)">
          Banda ±5%
        </text>
        {/* Plan points */}
        <circle cx={18} cy={47} r={4} fill={mode === 'report' ? 'var(--green)' : 'var(--orange)'} opacity={0.85} />
        <text x={32} y={51} fontSize={9} fill="rgba(156,163,176,.8)" fontFamily="var(--fm)">
          {mode === 'report' ? 'Medido' : 'Planejado'}
        </text>
        {/* Count */}
        <text x={32} y={67} fontSize={9} fill="rgba(156,163,176,.5)" fontFamily="var(--fm)">
          {mode === 'report'
            ? `${results.filter(r => r.pass).length}/${results.length} PASS`
            : `${points.filter(p => p.IxIpk > 1).length} pontos`}
        </text>
      </g>
    </svg>
  );
}
