import { useState, useCallback } from 'react';
import Lever from './Lever.jsx';
import { LEVERS } from './fieldV4Data.js';
import { applyMode } from './fieldLogic.js';

export default function LeverRack({ onLeverChange }) {
  const [levers, setLevers] = useState(LEVERS);
  const [mode, setMode] = useState('op'); // 'op' | 'test' | 'mix'

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setLevers(prev => {
      const updated = applyMode(prev, newMode);
      if (onLeverChange) onLeverChange(updated, newMode);
      return updated;
    });
  }, [onLeverChange]);

  const handleToggleLever = useCallback((leverId, newState) => {
    setLevers(prev => {
      const updated = prev.map(l =>
        l.id === leverId ? { ...l, state: newState } : l
      );
      setMode(null); // Clear mode when user manually toggles
      if (onLeverChange) onLeverChange(updated, null);
      return updated;
    });
  }, [onLeverChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
      {/* Mode toggle (segmented control) */}
      <div style={{
        display: 'flex',
        gap: '4px',
        backgroundColor: 'var(--panel-2)',
        padding: '4px',
        borderRadius: '6px',
        border: '1px solid var(--line-2)',
      }}>
        {['op', 'test', 'mix'].map(m => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: '600',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: mode === m ? 'var(--accent)' : 'transparent',
              color: mode === m ? '#000' : 'var(--ink-2)',
              transition: 'all 0.2s',
            }}
          >
            {m === 'op' ? 'Operação' : m === 'test' ? 'Teste' : 'Mista'}
          </button>
        ))}
      </div>

      {/* Lever rack */}
      <div className="lever-rack">
        {levers.map(lever => (
          <Lever
            key={lever.id}
            {...lever}
            state={lever.state}
            onToggle={handleToggleLever}
          />
        ))}
      </div>
    </div>
  );
}
