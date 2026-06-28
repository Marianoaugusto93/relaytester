import { useState, useEffect, useCallback } from 'react';
import TestChart from './TestChart.jsx';
import { generatePoints } from './PointGenerator.js';
import { getDefaults } from './testDefaults.js';
import { runPickupRamp, RAMP_SUPPORTED } from './pickupRamp.js';

const FUNC_LIST = [
  { id: '51',  label: '51',  sub: 'Sobrec. T' },
  { id: '50',  label: '50',  sub: 'Sobrec. I' },
  { id: '51N', label: '51N', sub: 'Neutro T' },
  { id: '50N', label: '50N', sub: 'Neutro I' },
  { id: '67',  label: '67',  sub: 'Dir. Fase' },
  { id: '67N', label: '67N', sub: 'Dir. Neu.' },
  { id: '27',  label: '27',  sub: 'Subtensão' },
  { id: '59',  label: '59',  sub: 'Sobretensão' },
  { id: '81U', label: '81U', sub: 'Subfreq.' },
  { id: '81O', label: '81O', sub: 'Sobfreq.' },
  { id: '46',  label: '46',  sub: 'Seq. Neg.' },
  { id: '50BF',label: '50BF',sub: 'Falha DJ' },
  { id: '49',  label: '49',  sub: 'Térmica' },
  { id: '25',  label: '25',  sub: 'Sincron.' },
  { id: '81R', label: '81R', sub: 'df/dt' },
  { id: '79',  label: '79',  sub: 'Religam.' },
  { id: '32R', label: '32R', sub: 'Pot. Rev.' },
  { id: '32F', label: '32F', sub: 'Pot. Fwd.' },
];

const POINT_COLS = ['#', 'Tipo', 'I/Ipk', 'I (A)', 't esp. (s)', 'Tolerância', 'Pré-falta', 'Status'];

function badge(status) {
  if (status === 'pass')    return { bg: 'rgba(74,222,128,.12)', color: 'var(--green)', label: 'PASS' };
  if (status === 'fail')    return { bg: 'rgba(248,113,113,.1)', color: 'var(--red)',   label: 'FAIL' };
  if (status === 'running') return { bg: 'rgba(251,191,36,.1)',  color: 'var(--amber)', label: '...' };
  return { bg: 'rgba(92,99,112,.15)', color: 'var(--tx3)', label: 'PEND.' };
}

function StatusBadge({ status }) {
  const b = badge(status);
  return (
    <span style={{ padding: '2px 7px', borderRadius: 10, background: b.bg, color: b.color,
      fontSize: 9, fontWeight: 700, fontFamily: 'var(--fm)', letterSpacing: '.5px' }}>
      {b.label}
    </span>
  );
}

export default function TestPlanner({ campaign, test, onTestChange, onStartRun, prot, sys }) {
  const [selFn, setSelFn] = useState('51');
  const [planConfig, setPlanConfig] = useState(() => getDefaults('51'));
  const [rampStep, setRampStep] = useState('');
  const [rampResult, setRampResult] = useState(null);

  // Re-derive defaults when function changes
  useEffect(() => {
    setPlanConfig(getDefaults(selFn));
    setRampResult(null);
  }, [selFn]);

  // Derive stage from prot for selected function
  const fnKey = selFn === '27' || selFn === '59' ? '27/59'
    : selFn === '81U' || selFn === '81O' ? '81'
    : selFn === '32R' || selFn === '32F' ? '32'
    : selFn;

  const fnObj = prot?.[fnKey];
  const stage = (() => {
    if (!fnObj) return null;
    if (selFn === '27') return fnObj.stages27?.[0];
    if (selFn === '59') return fnObj.stages59?.[0];
    if (selFn === '81U') return fnObj.stages81u?.[0];
    if (selFn === '81O') return fnObj.stages81o?.[0];
    if (selFn === '32R') return fnObj.stages32r?.[0];
    if (selFn === '32F') return fnObj.stages32f?.[0];
    if (selFn === '50BF') return fnObj.stages50bf?.[0];
    if (selFn === '49') return fnObj.stages49?.[0];
    if (selFn === '25') return fnObj.stages25?.[0];
    if (selFn === '81R') return fnObj.stages81r?.[0];
    return fnObj.stages?.[0];
  })();

  // Reset planConfig when relay stage parameters change so generated points
  // always reflect the current pickup / curve / timeDial from the relay tab
  useEffect(() => {
    if (!stage) return;
    setPlanConfig(getDefaults(selFn));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage?.pickup, stage?.curve, stage?.timeDial, stage?.timeOp, stage?.id]);

  // Generated points for this function
  const points = stage
    ? generatePoints(selFn, stage, {
        minMult: planConfig.defaultMinMult || 1.5,
        maxMult: planConfig.defaultMaxMult || 15,
        nPoints: planConfig.defaultNPoints || 7,
        spacing: planConfig.defaultSpacing || 'log',
        includePickup: planConfig.includePickup ?? true,
        pickupRange: [planConfig.pickupRangeMin || 0.95, planConfig.pickupRangeMax || 1.10],
        prefaultMult: planConfig.prefaultMult || 1.0,
        prefaultDur: planConfig.prefaultDur || 0.2,
      })
    : [];

  const handleConfig = (key, val) => setPlanConfig(prev => ({ ...prev, [key]: val }));

  const handleSavePlan = useCallback(() => {
    if (onTestChange) {
      onTestChange({
        fn: selFn,
        stage: stage ? { ...stage } : null,
        planConfig: { ...planConfig },
        points: points.map(pt => ({ ...pt, status: 'pending' })),
        createdAt: Date.now(),
      });
    }
  }, [selFn, stage, planConfig, points, onTestChange]);

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0, overflow: 'hidden' }}>

      {/* LEFT: 280px — Campaign card + function list */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--bdr)', overflow: 'hidden' }}>

        {/* Campaign card */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bdr)', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', letterSpacing: 1,
            textTransform: 'uppercase', marginBottom: 6, fontFamily: 'var(--fm)' }}>
            Campanha
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)', fontFamily: 'var(--fh)',
            letterSpacing: 0.5 }}>
            {campaign?.name || 'Comissionamento Bay-01'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>
            {campaign?.relay || 'REGRID PRO 1000'} · {campaign?.bay || 'BAY-01'}
          </div>
        </div>

        {/* Function list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', letterSpacing: 1,
            textTransform: 'uppercase', padding: '6px 10px 8px', fontFamily: 'var(--fm)' }}>
            Funções
          </div>
          {FUNC_LIST.map(fn => {
            const enabled = (() => {
              const key = fn.id === '27' || fn.id === '59' ? '27/59'
                : fn.id === '81U' || fn.id === '81O' ? '81'
                : fn.id === '32R' || fn.id === '32F' ? '32'
                : fn.id;
              return prot?.[key]?.enabled;
            })();
            const active = selFn === fn.id;
            return (
              <button key={fn.id} onClick={() => setSelFn(fn.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', background: active ? 'var(--orange-dim)' : 'transparent',
                  border: 'none', borderRadius: 5, cursor: 'pointer', textAlign: 'left',
                  transition: 'background .15s' }}>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--fm)',
                  color: active ? 'var(--orange)' : 'var(--tx2)', minWidth: 32 }}>
                  {fn.label}
                </span>
                <span style={{ fontSize: 11, color: active ? 'var(--orange)' : 'var(--tx3)',
                  flex: 1, opacity: active ? 0.8 : 1 }}>
                  {fn.sub}
                </span>
                {enabled && (
                  <span style={{ width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--green)', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CENTER: chart + points table */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Chart area */}
        <div style={{ flex: '0 0 auto', padding: '10px 12px 4px' }}>
          <TestChart stage={stage} fn={selFn} mode="plan" points={points} />
        </div>

        {/* Points table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10,
            fontFamily: 'var(--fm)' }}>
            <thead>
              <tr>
                {POINT_COLS.map(col => (
                  <th key={col} style={{ textAlign: 'left', padding: '5px 6px',
                    fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase',
                    letterSpacing: '.5px', borderBottom: '1px solid var(--bdr)', fontSize: 8 }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '20px', textAlign: 'center',
                    color: 'var(--tx3)', fontSize: 11 }}>
                    Selecione uma função e configure os parâmetros
                  </td>
                </tr>
              ) : points.map((pt, i) => {
                const tVal = pt.tExpected != null && isFinite(pt.tExpected)
                  ? pt.tExpected.toFixed(3) : '—';
                const tolPct = (getDefaults(selFn).tolPctTime * 100 || 5).toFixed(0);
                return (
                  <tr key={pt.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                    <td style={{ padding: '4px 6px', color: 'var(--tx3)' }}>{i + 1}</td>
                    <td style={{ padding: '4px 6px', color: 'var(--amber)' }}>
                      {pt.kind === 'curve' ? 'Curva'
                        : pt.kind === 'definite' ? 'DT'
                        : pt.kind === 'pickup-up' ? 'Pkup↑'
                        : pt.kind === 'pickup-down' ? 'Pkup↓'
                        : pt.kind}
                    </td>
                    <td style={{ padding: '5px 8px', color: 'var(--cyan)', fontSize: 11 }}>
                      {pt.IxIpk != null ? pt.IxIpk.toFixed(2) : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', color: 'var(--tx)', fontSize: 11 }}>
                      {pt.Iamps != null ? pt.Iamps.toFixed(3) : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', color: 'var(--tx)', fontSize: 11 }}>{tVal}</td>
                    <td style={{ padding: '5px 8px', color: 'var(--tx2)', fontSize: 11 }}>±{tolPct}%</td>
                    <td style={{ padding: '5px 8px', color: 'var(--tx3)', fontSize: 11 }}>
                      {pt.prefaultDur != null ? `${pt.prefaultDur.toFixed(2)}s` : '—'}
                    </td>
                    <td style={{ padding: '5px 8px' }}>
                      <StatusBadge status={pt.status || 'pending'} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT: 360px — function params + point generator + actions */}
      <div style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid var(--bdr)', overflowY: 'auto' }}>

        {/* Function parameters (read-only) */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bdr)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx3)', letterSpacing: 1,
            textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--fm)' }}>
            Parâmetros ({selFn})
          </div>
          {stage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                ['ID', stage.id],
                ['Pickup', `${stage.pickup ?? '—'} A`],
                ['TD', stage.timeDial ?? '—'],
                ['Curva', stage.curve || '—'],
                ['Op. Time', stage.timeOp != null ? `${stage.timeOp}s` : '—'],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '4px 0', fontSize: 14 }}>
                  <span style={{ color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>{lbl}</span>
                  <span style={{ color: 'var(--cyan)', fontWeight: 700, fontFamily: 'var(--fm)' }}>{val}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--tx3)', fontStyle: 'italic' }}>
              Função não habilitada no relé
            </div>
          )}
        </div>

        {/* Point generator controls */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bdr)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx3)', letterSpacing: 1,
            textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--fm)' }}>
            Gerador de Pontos
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { key: 'defaultMinMult', label: 'Mín (×Ipk)', type: 'number', step: 0.5 },
              { key: 'defaultMaxMult', label: 'Máx (×Ipk)', type: 'number', step: 1 },
              { key: 'defaultNPoints', label: 'N pontos', type: 'number', step: 1 },
              { key: 'shots', label: 'Shots', type: 'number', step: 1 },
            ].map(({ key, label, type, step }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)',
                  textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--fm)' }}>
                  {label}
                </label>
                <input type={type} step={step} value={planConfig[key] || ''}
                  onChange={e => handleConfig(key, parseFloat(e.target.value) || 0)}
                  style={{ background: 'var(--card3)', border: '1px solid var(--bdr)',
                    color: 'var(--cyan)', padding: '8px 10px', borderRadius: 6,
                    fontSize: 14, fontFamily: 'var(--fm)', width: '100%' }} />
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)',
                textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--fm)' }}>
                Espaçamento
              </label>
              <select value={planConfig.defaultSpacing || 'log'}
                onChange={e => handleConfig('defaultSpacing', e.target.value)}
                style={{ background: 'var(--card3)', border: '1px solid var(--bdr)',
                  color: 'var(--tx)', padding: '8px 10px', borderRadius: 6, fontSize: 14,
                  fontFamily: 'var(--fi)', width: '100%' }}>
                <option value="log">Logarítmico</option>
                <option value="linear">Linear</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
              fontSize: 12, color: 'var(--tx2)' }}>
              <input type="checkbox" checked={!!planConfig.includePickup}
                onChange={e => handleConfig('includePickup', e.target.checked)}
                style={{ accentColor: 'var(--orange)' }} />
              Incluir sondas de pickup
            </label>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)', letterSpacing: '.5px',
              textTransform: 'uppercase', marginBottom: 4, fontFamily: 'var(--fm)' }}>
              Tolerância
            </div>
            <div style={{ fontSize: 13, color: 'var(--cyan)', fontFamily: 'var(--fm)', fontWeight: 600 }}>
              ±{((planConfig.tolPctTime || 0.05) * 100).toFixed(0)}% tempo
            </div>
            <div style={{ fontSize: 13, color: 'var(--amber)', fontFamily: 'var(--fm)', fontWeight: 600 }}>
              ±{((planConfig.tolAbsTime || 0.025) * 1000).toFixed(0)}ms abs
            </div>
          </div>
        </div>

        {/* Pickup ramp (Leva 3) */}
        {RAMP_SUPPORTED.includes(selFn) && (
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bdr)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx3)', letterSpacing: 1,
              textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--fm)' }}>
              Rampa de Pickup
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)',
                  textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--fm)' }}>
                  Degrau (A)
                </label>
                <input type="number" step={0.05} placeholder="auto (1%)" value={rampStep}
                  onChange={e => setRampStep(e.target.value)}
                  style={{ background: 'var(--card3)', border: '1px solid var(--bdr)',
                    color: 'var(--cyan)', padding: '8px 10px', borderRadius: 6,
                    fontSize: 14, fontFamily: 'var(--fm)', width: '100%' }} />
              </div>
              <button onClick={() => {
                if (!stage) return;
                const step = parseFloat(rampStep);
                setRampResult(runPickupRamp(selFn, stage, { relayProt: prot, sys, step: step > 0 ? step : undefined }));
              }} disabled={!stage}
                style={{ padding: '9px 14px', borderRadius: 7, background: 'var(--orange-dim)',
                  border: '1px solid rgba(249,115,22,.4)', color: 'var(--orange)',
                  fontFamily: 'var(--fh)', fontSize: 11, fontWeight: 800, letterSpacing: 1.2,
                  textTransform: 'uppercase', cursor: stage ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
                Executar
              </button>
            </div>
            {rampResult && (
              rampResult.ok ? (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    ['Pickup ajustado', `${rampResult.pickupSet} A`],
                    ['Pickup medido', `${rampResult.pickupMeasured} A`],
                    ['Erro', `${rampResult.errorPct > 0 ? '+' : ''}${rampResult.errorPct}%`],
                    ['Degrau · nº', `${rampResult.stepA} A · ${rampResult.nSteps}`],
                  ].map(([lbl, val]) => (
                    <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between',
                      padding: '3px 0', fontSize: 13 }}>
                      <span style={{ color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>{lbl}</span>
                      <span style={{ color: 'var(--cyan)', fontWeight: 700, fontFamily: 'var(--fm)' }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 4, padding: '4px 8px', borderRadius: 6,
                    background: Math.abs(rampResult.errorPct) <= 5 ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.1)',
                    color: Math.abs(rampResult.errorPct) <= 5 ? 'var(--green)' : 'var(--red)',
                    fontSize: 10, fontWeight: 800, fontFamily: 'var(--fm)', letterSpacing: '.5px',
                    textAlign: 'center' }}>
                    {Math.abs(rampResult.errorPct) <= 5 ? 'DENTRO DE ±5%' : 'FORA DE ±5%'}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--red)', fontFamily: 'var(--fm)' }}>
                  {rampResult.reason || 'Falha na rampa'}
                </div>
              )
            )}
          </div>
        )}

        {/* Progress card */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bdr)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx3)', letterSpacing: 1,
            textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--fm)' }}>
            Progresso
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 8 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: 'var(--tx)',
              fontFamily: 'var(--fh)' }}>
              0 / {points.length}
            </span>
            <span style={{ fontSize: 15, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>pontos</span>
          </div>
          <div style={{ height: 4, background: 'var(--card3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '0%', background: 'var(--orange)',
              borderRadius: 2, transition: 'width .3s' }} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tx3)', letterSpacing: 1,
            textTransform: 'uppercase', marginBottom: 2, fontFamily: 'var(--fm)' }}>
            Ações
          </div>
          <button onClick={handleSavePlan}
            style={{ padding: '9px', borderRadius: 7, background: 'var(--orange-dim)',
              border: '1px solid rgba(249,115,22,.4)', color: 'var(--orange)',
              fontFamily: 'var(--fh)', fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
              textTransform: 'uppercase', cursor: 'pointer' }}>
            Salvar Plano
          </button>
          <button onClick={() => onStartRun && onStartRun()}
            disabled={points.length === 0 || !stage}
            style={{ padding: '9px', borderRadius: 7,
              background: points.length === 0 ? 'rgba(74,222,128,.04)' : 'rgba(74,222,128,.10)',
              border: `1px solid ${points.length === 0 ? 'rgba(74,222,128,.1)' : 'rgba(74,222,128,.4)'}`,
              color: points.length === 0 ? 'rgba(74,222,128,.3)' : 'var(--green)',
              fontFamily: 'var(--fh)', fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
              textTransform: 'uppercase', cursor: points.length === 0 ? 'not-allowed' : 'pointer' }}>
            Iniciar Execucao
          </button>
        </div>
      </div>
    </div>
  );
}
