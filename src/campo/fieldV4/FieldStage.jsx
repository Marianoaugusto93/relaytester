import { useRef, useState } from 'react';
import BorneStrip from './BorneStrip.jsx';
import LeverRack from './LeverRack.jsx';
import MaletaPanel from './MaletaPanel.jsx';
import CablesSVG from './CablesSVG.jsx';

export default function FieldStage() {
  const stageRef = useRef(null);
  const [levers, setLevers] = useState(null);
  const [mode, setMode] = useState(null);
  const [focusedCircuit, setFocusedCircuit] = useState(null);

  const handleLeverChange = (updatedLevers, updatedMode) => {
    setLevers(updatedLevers);
    setMode(updatedMode);
  };

  return (
    <div
      className="field-stage"
      ref={stageRef}
      onMouseLeave={() => setFocusedCircuit(null)}
    >
      {/* SVG Cable layer (overlay) */}
      <CablesSVG
        levers={levers}
        mode={mode}
        focusedCircuit={focusedCircuit}
        onFocusedCircuitChange={setFocusedCircuit}
        stageRef={stageRef}
      />

      {/* Equipment rows (relative positioning for cable anchoring) */}
      <BorneStrip />
      <LeverRack onLeverChange={handleLeverChange} />
      <MaletaPanel />
    </div>
  );
}
