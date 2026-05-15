import { useState, useEffect, useRef } from 'react';

const POINT_COLS = ['#', 'Tipo', 'I/Ipk', 'I (A)', 't esp. (s)', 't med. (s)', 'Desvio', 'Status'];

function StatusBadge({ status }) {
  const map = {
    pass:    { bg: 'rgba(74,222,128,.12)',  color: 'var(--green)', label: 'PASS' },
    fail:    { bg: 'rgba(248,113,113,.1)',  color: 'var(--red)',   label: 'FAIL' },
    running: { bg: 'rgba(251,191,36,.1)',   color: 'var(--amber)', label: '...' },
    pending: { bg: 'rgba(92,99,112,.15)',   color: 'var(--tx3)',   label: 'PEND.' },
  };
  const b = map[status] || map.pending;
  return (
    <span style={{ padding: '2px 7px', borderRadius: 10, background: b.bg, color: b.color,
      fontSize: 9, fontWeight: 700, fontFamily: 'var(--fm)', letterSpacing: '.5px' }}>
      {b.label}
    </span>
  );
}

function MiniTile({ label, value, color = 'var(--tx)', sub }) {
  return (
    <div style={{ background: 'var(--card3)', borderRadius: 7, padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx3)', letterSpacing: 1,
        textTransform: 'uppercase', fontFamily: 'var(--fm)' }}>{label}</div>
      <div style={{ fontSize: 40, fontWeight: 800, color, fontFamily: 'var(--fm)',
        letterSpacing: 0.5 }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>{sub}</div>}
    </div>
  );
}

export default function TestRunner({
  test, results = [], currentIdx = -1,
  elapsed = 0, ss = 'idle',
  boStatus, ci, vi,
  onPause, onStop, onRepeat,
  isPaused = false,
}) {
  const points = test?.points || [];
  const tExpected = currentIdx >= 0 && points[currentIdx]?.tExpected;
  const progressPct = tExpected && tExpected > 0 && elapsed > 0
    ? Math.min(100, (elapsed / tExpected) * 100)
    : 0;

  const isRunning = ss === 'running';
  const passCount = results.filter(r => r.pass).length;
  const failCount = results.filter(r => r.pass === false).length;
  const totalDone = results.filter(r => r.pass !== undefined).length;

  // Build display rows: completed = result, in-progress = current, rest = pending
  const rows = points.map((pt, i) => {
    if (i < results.length) return { ...pt, ...results[i], rowStatus: results[i].pass ? 'pass' : 'fail' };
    if (i === currentIdx) return { ...pt, rowStatus: 'running' };
    return { ...pt, rowStatus: 'pending' };
  });

  // Estimate time remaining
  const avgTime = totalDone > 0
    ? results.reduce((s, r) => s + (r.tMeasured || r.tExpected || 0), 0) / totalDone
    : (points[0]?.tExpected || 2);
  const remaining = (points.length - totalDone) * avgTime;

  // Ia display
  const IaVal = ci?.Ia?.mag != null ? ci.Ia.mag.toFixed(2) : '0.00';
  const VaVal = vi?.Va?.mag != null ? vi.Va.mag.toFixed(1) : '0.0';
  const boVal = boStatus?.bo1 ? 'ON' : 'OFF';
  const boColor = boStatus?.bo1 ? 'var(--green)' : 'var(--tx3)';

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0, overflow: 'hidden' }}>

      {/* CENTER: live status + table */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Live injection overlay */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bdr)',
          background: isRunning ? 'rgba(74,222,128,.04)' : 'rgba(0,0,0,.04)', flexShrink: 0 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: isRunning ? 'var(--green)' : (isPaused ? 'var(--amber)' : 'var(--tx3)'),
              boxShadow: isRunning ? '0 0 8px var(--green)' : 'none',
              animation: isRunning ? 'cb-pulse 1s ease-in-out infinite' : 'none' }} />
            <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--fm)',
              letterSpacing: 1.5, textTransform: 'uppercase',
              color: isRunning ? 'var(--green)' : (isPaused ? 'var(--amber)' : 'var(--tx3)') }}>
              {isRunning ? 'Injetando' : (isPaused ? 'Pausado' : 'Aguardando')}
            </span>
            {currentIdx >= 0 && (
              <span style={{ fontSize: 10, color: 'var(--tx3)', fontFamily: 'var(--fm)',
                marginLeft: 'auto' }}>
                Ponto {currentIdx + 1} / {points.length}
              </span>
            )}
          </div>

          {/* Elapsed time — large display */}
          <div style={{ fontSize: 72, fontWeight: 800, fontFamily: 'var(--fm)',
            color: isRunning ? 'var(--tx)' : 'var(--tx3)', letterSpacing: 2,
            lineHeight: 1, marginBottom: 8 }}>
            {elapsed.toFixed(3)}s
          </div>

          {/* Progress bar to tExpected */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 8, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>
                T+{elapsed.toFixed(3)}s
              </span>
              <span style={{ fontSize: 8, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>
                {tExpected ? `t esp. ${tExpected.toFixed(3)}s` : '—'}
              </span>
            </div>
            <div style={{ height: 5, background: 'var(--card3)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`,
                background: progressPct >= 90 ? 'var(--amber)' : 'var(--orange)',
                borderRadius: 3, transition: 'width .1s linear' }} />
            </div>
          </div>

          {/* Mini tiles */}
          <div style={{ display: 'flex', gap: 6 }}>
            <MiniTile label="Iₐ" value={`${IaVal}A`} color="var(--cyan)" sub="corrente" />
            <MiniTile label="Vₐ" value={`${VaVal}V`} color="var(--amber)" sub="tensão" />
            <MiniTile label="BO1" value={boVal} color={boColor} sub="saída" />
          </div>
        </div>

        {/* Partial results table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12,
            fontFamily: 'var(--fm)' }}>
            <thead>
              <tr>
                {POINT_COLS.map(col => (
                  <th key={col} style={{ textAlign: 'left', padding: '6px 8px',
                    fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase',
                    letterSpacing: '.5px', borderBottom: '1px solid var(--bdr)', fontSize: 10,
                    position: 'sticky', top: 0, background: 'var(--card)' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '20px', textAlign: 'center',
                    color: 'var(--tx3)', fontSize: 13 }}>
                    Nenhum ponto planejado
                  </td>
                </tr>
              ) : rows.map((row, i) => {
                const rowColor = row.rowStatus === 'pass' ? 'rgba(74,222,128,.04)'
                  : row.rowStatus === 'fail' ? 'rgba(248,113,113,.04)'
                  : row.rowStatus === 'running' ? 'rgba(251,191,36,.04)'
                  : 'transparent';
                const devPct = row.tMeasured && row.tExpected
                  ? ((row.tMeasured - row.tExpected) / row.tExpected * 100).toFixed(1)
                  : '—';
                return (
                  <tr key={row.id || i} style={{ background: rowColor,
                    borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                    <td style={{ padding: '6px 8px', color: 'var(--tx3)', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--amber)', fontSize: 11 }}>
                      {row.kind === 'curve' ? 'Curva' : row.kind === 'definite' ? 'DT'
                        : row.kind === 'pickup-up' ? 'Pkup↑' : row.kind === 'pickup-down' ? 'Pkup↓'
                        : row.kind || '—'}
                    </td>
                    <td style={{ padding: '6px 8px', color: 'var(--cyan)', fontSize: 11 }}>
                      {row.IxIpk != null ? row.IxIpk.toFixed(2) : '—'}
                    </td>
                    <td style={{ padding: '6px 8px', color: 'var(--tx)', fontSize: 11 }}>
                      {row.Iamps != null ? row.Iamps.toFixed(3) : '—'}
                    </td>
                    <td style={{ padding: '6px 8px', color: 'var(--tx2)', fontSize: 11 }}>
                      {row.tExpected != null && isFinite(row.tExpected)
                        ? row.tExpected.toFixed(3) : '—'}
                    </td>
                    <td style={{ padding: '6px 8px', fontSize: 11,
                      color: row.rowStatus === 'running' ? 'var(--amber)' : 'var(--tx)' }}>
                      {row.tMeasured != null ? row.tMeasured.toFixed(3) : '—'}
                    </td>
                    <td style={{ padding: '6px 8px', fontSize: 11,
                      color: devPct !== '—' && Math.abs(parseFloat(devPct)) > 5
                        ? 'var(--red)' : 'var(--tx2)' }}>
                      {devPct !== '—' ? `${devPct}%` : '—'}
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <StatusBadge status={row.rowStatus} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT: progress card + actions */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid var(--bdr)', overflowY: 'auto' }}>

        {/* Progress card */}
        <div style={{ padding: '12px', borderBottom: '1px solid var(--bdr)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', letterSpacing: 1,
            textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--fm)' }}>
            Progresso
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--tx)',
            fontFamily: 'var(--fh)', marginBottom: 4 }}>
            {totalDone} <span style={{ fontSize: 20, color: 'var(--tx3)' }}>/ {points.length}</span>
          </div>
          <div style={{ height: 6, background: 'var(--card3)', borderRadius: 3,
            overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%',
              width: points.length > 0 ? `${(totalDone / points.length) * 100}%` : '0%',
              background: 'var(--orange)', borderRadius: 3, transition: 'width .3s' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div style={{ background: 'rgba(74,222,128,.08)', borderRadius: 6, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'var(--fm)',
                textTransform: 'uppercase', letterSpacing: 1 }}>PASS</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)',
                fontFamily: 'var(--fh)' }}>{passCount}</div>
            </div>
            <div style={{ background: 'rgba(248,113,113,.06)', borderRadius: 6, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: 'var(--red)', fontFamily: 'var(--fm)',
                textTransform: 'uppercase', letterSpacing: 1 }}>FAIL</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--red)',
                fontFamily: 'var(--fh)' }}>{failCount}</div>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>
            Tempo restante est.: ~{remaining.toFixed(1)}s
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', letterSpacing: 1,
            textTransform: 'uppercase', marginBottom: 2, fontFamily: 'var(--fm)' }}>
            Controles
          </div>
          <button onClick={onPause}
            style={{ padding: '11px', borderRadius: 7,
              background: isPaused ? 'rgba(74,222,128,.10)' : 'rgba(251,191,36,.08)',
              border: `1px solid ${isPaused ? 'rgba(74,222,128,.4)' : 'rgba(251,191,36,.3)'}`,
              color: isPaused ? 'var(--green)' : 'var(--amber)',
              fontFamily: 'var(--fh)', fontSize: 13, fontWeight: 800, letterSpacing: 1.5,
              textTransform: 'uppercase', cursor: 'pointer' }}>
            {isPaused ? 'Retomar' : 'Pausar'}
          </button>
          <button onClick={onStop}
            style={{ padding: '11px', borderRadius: 7,
              background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.3)',
              color: 'var(--red)', fontFamily: 'var(--fh)', fontSize: 13, fontWeight: 800,
              letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}>
            Parar
          </button>
          <button onClick={onRepeat}
            style={{ padding: '11px', borderRadius: 7, background: 'var(--card2)',
              border: '1px solid var(--bdr)', color: 'var(--tx2)', fontFamily: 'var(--fh)',
              fontSize: 13, fontWeight: 800, letterSpacing: 1.5,
              textTransform: 'uppercase', cursor: 'pointer' }}>
            Repetir
          </button>
        </div>
      </div>
    </div>
  );
}
