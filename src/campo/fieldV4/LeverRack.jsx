import { useState, useCallback, useEffect } from 'react';
import Lever from './Lever.jsx';
import { LEVERS } from './fieldV4Data.js';
import { applyMode } from './fieldLogic.js';

export default function LeverRack({ mode, onLeverChange }) {
  const [levers, setLevers] = useState(LEVERS);

  // Sync levers when mode changes from parent
  useEffect(() => {
    if (mode) {
      setLevers(prev => applyMode(prev, mode));
    }
  }, [mode]);

  const handleToggleLever = useCallback((leverId, newState) => {
    setLevers(prev => {
      const updated = prev.map(l =>
        l.id === leverId ? { ...l, state: newState } : l
      );
      if (onLeverChange) onLeverChange(updated, null);
      return updated;
    });
  }, [onLeverChange]);

  return (
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
  );
}
