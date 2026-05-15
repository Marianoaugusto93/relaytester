import TestChart from './TestChart.jsx';
import { exportPDF, exportCSV, exportJSON } from './ReportExporter.js';

function KpiHero({ label, value, color = 'var(--tx)', sub }) {
  return (
    <div style={{ background: 'var(--card2)', borderRadius: 8, padding: '12px 16px',
      flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--tx3)', letterSpacing: 1.2,
        textTransform: 'uppercase', fontFamily: 'var(--fm)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'var(--fh)',
        letterSpacing: 0.5, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>{sub}</div>}
    </div>
  );
}

function PassBadge({ pass }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700,
      fontFamily: 'var(--fm)', letterSpacing: '.5px',
      background: pass ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.1)',
      color: pass ? 'var(--green)' : 'var(--red)',
    }}>
      {pass ? 'PASS' : 'FAIL'}
    </span>
  );
}

const COLS = ['#', 'Tipo', 'I/Ipk', 'I (A)', 't esp. (s)', 't med. (s)', 'Desvio', 'Status'];

export default function TestReport({ campaign, test, results = [], onBackToPlan }) {
  const passCount = results.filter(r => r.pass).length;
  const failCount = results.filter(r => r.pass === false).length;
  const totalCount = results.length;
  const passPct = totalCount > 0 ? ((passCount / totalCount) * 100).toFixed(0) : 0;

  // KPI computations
  const validDev = results.filter(r => r.dtPct != null);
  const avgDev = validDev.length > 0
    ? validDev.reduce((s, r) => s + (r.dtPct || 0), 0) / validDev.length
    : 0;

  const pickupResults = results.filter(r => r.kind?.startsWith('pickup') && r.IpickupMeasured != null);
  const measuredPickup = pickupResults.length > 0 ? pickupResults[0].IpickupMeasured : null;

  const totalDuration = results.reduce((s, r) => s + (r.tMeasured || r.tExpected || 0), 0);

  const stage = test?.stage;

  // Build results with IxIpk for chart
  const chartResults = results.map(r => ({ ...r }));

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0, overflow: 'hidden' }}>

      {/* CENTER: KPI + chart + table */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* KPI hero row */}
        <div style={{ display: 'flex', gap: 6, padding: '12px 14px',
          borderBottom: '1px solid var(--bdr)', flexShrink: 0 }}>
          <KpiHero
            label="Aprovacao"
            value={`${passCount}/${totalCount}`}
            color={failCount === 0 ? 'var(--green)' : failCount > passCount ? 'var(--red)' : 'var(--amber)'}
            sub={`${passPct}% aprovado`}
          />
          <KpiHero
            label="Desvio medio"
            value={`${avgDev >= 0 ? '+' : ''}${avgDev.toFixed(1)}%`}
            color="var(--cyan)"
            sub="tempo operacao"
          />
          <KpiHero
            label="Pickup medido"
            value={measuredPickup != null ? `${measuredPickup.toFixed(3)}A` : '—'}
            color="var(--amber)"
            sub={stage?.pickup != null ? `ref: ${stage.pickup}A` : 'n/a'}
          />
          <KpiHero
            label="Duracao"
            value={`${totalDuration.toFixed(1)}s`}
            color="var(--tx2)"
            sub={`${totalCount} pontos`}
          />
        </div>

        {/* Report chart */}
        <div style={{ padding: '10px 14px 4px', flexShrink: 0 }}>
          <TestChart
            stage={stage}
            fn={test?.fn}
            mode="report"
            points={results}
            results={chartResults}
          />
        </div>

        {/* Final results table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10,
            fontFamily: 'var(--fm)' }}>
            <thead>
              <tr>
                {COLS.map(col => (
                  <th key={col} style={{ textAlign: 'left', padding: '5px 6px',
                    fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase',
                    letterSpacing: '.5px', borderBottom: '1px solid var(--bdr)', fontSize: 8,
                    position: 'sticky', top: 0, background: 'var(--card)' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 20, textAlign: 'center',
                    color: 'var(--tx3)', fontSize: 11 }}>
                    Sem resultados — execute os testes primeiro
                  </td>
                </tr>
              ) : results.map((r, i) => {
                const devPct = r.dtPct != null ? r.dtPct.toFixed(1) : '—';
                const rowBg = r.pass
                  ? 'rgba(74,222,128,.03)' : r.pass === false
                  ? 'rgba(248,113,113,.04)' : 'transparent';
                return (
                  <tr key={r.id || i} style={{ background: rowBg,
                    borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                    <td style={{ padding: '4px 6px', color: 'var(--tx3)' }}>{i + 1}</td>
                    <td style={{ padding: '4px 6px', color: 'var(--amber)' }}>
                      {r.kind === 'curve' ? 'Curva' : r.kind === 'definite' ? 'DT'
                        : r.kind === 'pickup-up' ? 'Pkup↑' : r.kind === 'pickup-down' ? 'Pkup↓'
                        : r.kind || '—'}
                    </td>
                    <td style={{ padding: '4px 6px', color: 'var(--cyan)' }}>
                      {r.IxIpk != null ? r.IxIpk.toFixed(2) : '—'}
                    </td>
                    <td style={{ padding: '4px 6px', color: 'var(--tx)' }}>
                      {r.Iamps != null ? r.Iamps.toFixed(3) : '—'}
                    </td>
                    <td style={{ padding: '4px 6px', color: 'var(--tx2)' }}>
                      {r.tExpected != null && isFinite(r.tExpected)
                        ? r.tExpected.toFixed(3) : '—'}
                    </td>
                    <td style={{ padding: '4px 6px', color: 'var(--tx)' }}>
                      {r.tMeasured != null ? r.tMeasured.toFixed(3) : '—'}
                    </td>
                    <td style={{ padding: '4px 6px',
                      color: devPct !== '—' && Math.abs(parseFloat(devPct)) > 5
                        ? 'var(--red)' : 'var(--tx2)' }}>
                      {devPct !== '—' ? `${devPct}%` : '—'}
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <PassBadge pass={r.pass} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT: Summary + Export */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid var(--bdr)', overflowY: 'auto' }}>

        {/* Summary card */}
        <div style={{ padding: '12px', borderBottom: '1px solid var(--bdr)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tx3)', letterSpacing: 1,
            textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--fm)' }}>
            Sumario
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              ['Campanha', campaign?.name || '—'],
              ['Relé', campaign?.relay || '—'],
              ['Bay', campaign?.bay || '—'],
              ['Funcao', test?.fn || '—'],
              ['Estágio', stage?.id || '—'],
              ['Curva', stage?.curve || '—'],
              ['Pickup', stage?.pickup != null ? `${stage.pickup}A` : '—'],
              ['TD', stage?.timeDial != null ? stage.timeDial : '—'],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between',
                padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                <span style={{ fontSize: 9, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>{lbl}</span>
                <span style={{ fontSize: 9, color: 'var(--tx)', fontWeight: 600,
                  fontFamily: 'var(--fm)' }}>{String(val)}</span>
              </div>
            ))}
          </div>

          {/* Pass/Fail summary */}
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div style={{ background: 'rgba(74,222,128,.08)', borderRadius: 6, padding: '6px 8px',
              textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: 'var(--green)', fontFamily: 'var(--fm)',
                letterSpacing: 1 }}>PASS</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)',
                fontFamily: 'var(--fh)' }}>{passCount}</div>
            </div>
            <div style={{ background: failCount > 0 ? 'rgba(248,113,113,.08)' : 'rgba(92,99,112,.1)',
              borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: failCount > 0 ? 'var(--red)' : 'var(--tx3)',
                fontFamily: 'var(--fm)', letterSpacing: 1 }}>FAIL</div>
              <div style={{ fontSize: 22, fontWeight: 800,
                color: failCount > 0 ? 'var(--red)' : 'var(--tx3)',
                fontFamily: 'var(--fh)' }}>{failCount}</div>
            </div>
          </div>
        </div>

        {/* Export card */}
        <div style={{ padding: '12px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tx3)', letterSpacing: 1,
            textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--fm)' }}>
            Exportar
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              {
                label: 'Exportar PDF',
                color: 'var(--red)', bg: 'rgba(248,113,113,.08)',
                border: 'rgba(248,113,113,.3)',
                onClick: () => exportPDF(campaign, test, results),
              },
              {
                label: 'Exportar CSV',
                color: 'var(--green)', bg: 'rgba(74,222,128,.08)',
                border: 'rgba(74,222,128,.3)',
                onClick: () => exportCSV(campaign, test, results),
              },
              {
                label: 'Exportar JSON',
                color: 'var(--cyan)', bg: 'rgba(14,165,233,.08)',
                border: 'rgba(14,165,233,.3)',
                onClick: () => exportJSON(campaign, test, results),
              },
            ].map(({ label, color, bg, border, onClick }) => (
              <button key={label} onClick={onClick}
                style={{ padding: '9px', borderRadius: 7, background: bg,
                  border: `1px solid ${border}`, color,
                  fontFamily: 'var(--fh)', fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
                  textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s' }}>
                {label}
              </button>
            ))}

            {onBackToPlan && (
              <button onClick={onBackToPlan}
                style={{ padding: '9px', borderRadius: 7, background: 'var(--card2)',
                  border: '1px solid var(--bdr)', color: 'var(--tx2)',
                  fontFamily: 'var(--fh)', fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
                  textTransform: 'uppercase', cursor: 'pointer', marginTop: 4 }}>
                Novo Plano
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
