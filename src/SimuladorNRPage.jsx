import { useState } from 'react';

export default function SimuladorNRPage() {
  const [solverVersion, setSolverVersion] = useState('old');

  const iframeUrl = solverVersion === 'old'
    ? '/newton-rapson/powerflow.html'
    : '/newton-rapson/powerflow-refactored.html';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      overflow: 'hidden'
    }}>
      {/* Solver Version Toggle */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '12px 16px',
        background: 'var(--card)',
        borderBottom: '1px solid var(--bd)',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '12px', color: 'var(--tx-secondary)', marginRight: '8px' }}>
          Newton-Raphson Solver:
        </span>
        <button
          onClick={() => setSolverVersion('old')}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: solverVersion === 'old' ? '2px solid #dc2626' : '1px solid var(--bd)',
            background: solverVersion === 'old' ? 'rgba(220, 38, 38, 0.1)' : 'var(--bg)',
            color: solverVersion === 'old' ? '#dc2626' : 'var(--tx)',
            cursor: 'pointer',
            fontWeight: solverVersion === 'old' ? 'bold' : 'normal',
            fontSize: '13px'
          }}
        >
          🔴 NR OLD (Legacy)
        </button>
        <button
          onClick={() => setSolverVersion('new')}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: solverVersion === 'new' ? '2px solid #16a34a' : '1px solid var(--bd)',
            background: solverVersion === 'new' ? 'rgba(22, 163, 74, 0.1)' : 'var(--bg)',
            color: solverVersion === 'new' ? '#16a34a' : 'var(--tx)',
            cursor: 'pointer',
            fontWeight: solverVersion === 'new' ? 'bold' : 'normal',
            fontSize: '13px'
          }}
        >
          🟢 NR NEW (Refactored)
        </button>
        <span style={{
          fontSize: '11px',
          color: 'var(--tx-secondary)',
          marginLeft: 'auto',
          fontStyle: 'italic'
        }}>
          {solverVersion === 'old'
            ? 'Using legacy monolithic solver (baseline)'
            : 'Using refactored modular solver (Phase 4+)'}
        </span>
      </div>

      {/* Iframe */}
      <iframe
        key={solverVersion}
        src={iframeUrl}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'var(--bg)'
        }}
        title="Newton-Raphson Power Flow Simulator"
      />
    </div>
  );
}
