import { useEffect, useRef, useState } from 'react';
import { CABLES } from './fieldV4Data.js';
import { pathCurve } from './bezierRouting.js';

export default function CablesSVG({
  levers,
  mode,
  focusedCircuit,
  onFocusedCircuitChange,
  stageRef,
}) {
  const svgRef = useRef(null);
  const [cables, setCables] = useState([]);

  // Helper: get connector element center relative to stage
  const getConnectorRect = (connectorId) => {
    if (!stageRef.current) return null;
    const elem = stageRef.current.querySelector(
      `[data-connector="${connectorId}"], [data-port="${connectorId}"]`
    );
    if (!elem) return null;
    const rect = elem.getBoundingClientRect();
    const stageRect = stageRef.current.getBoundingClientRect();
    return {
      x: rect.left - stageRect.left + rect.width / 2,
      y: rect.top - stageRect.top + rect.height / 2,
    };
  };

  // Main draw function: compute positions + build cable descriptors
  const drawCables = () => {
    if (!svgRef.current || !stageRef.current) return;

    const stageRect = stageRef.current.getBoundingClientRect();
    svgRef.current.setAttribute('viewBox', `0 0 ${stageRect.width} ${stageRect.height}`);

    const drawnCables = CABLES.map(cable => {
      const fromPos = getConnectorRect(cable.from);
      const toPos = getConnectorRect(cable.to);

      if (!fromPos || !toPos) return null;

      const pathD = pathCurve(fromPos, toPos);
      const phaseClass = `phase${cable.phase === 'BI' ? 'BI' : cable.phase}`;
      const kindClass = cable.kind; // 'main' | 'binary' | 'test'
      const isTestActive =
        cable.kind === 'test' &&
        levers?.some(l => l.id === cable.chave && l.state === 'open');

      return {
        id: `${cable.from}-${cable.to}`,
        pathD,
        circuit: cable.circuit,
        phase: phaseClass,
        kind: kindClass,
        isTestActive,
      };
    }).filter(Boolean);

    setCables(drawnCables);
  };

  // Bootstrap: geometry recalc on levers/mode change (NOT focusedCircuit)
  useEffect(() => {
    drawCables();

    if (typeof window !== 'undefined') {
      window.addEventListener('load', drawCables);
      const t1 = setTimeout(drawCables, 50);
      const t2 = setTimeout(drawCables, 300);

      const stageEl = stageRef.current;
      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(drawCables);
      });
      if (stageEl) resizeObserver.observe(stageEl);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        resizeObserver.disconnect();
        window.removeEventListener('load', drawCables);
      };
    }
  }, [levers, mode]); // NOT focusedCircuit

  return (
    <svg
      ref={svgRef}
      className={focusedCircuit ? 'focused' : ''}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 6,
        pointerEvents: 'auto',
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {cables.map(cable => (
        <path
          key={cable.id}
          d={cable.pathD}
          className={`cable cable-${cable.phase} cable-${cable.kind}${cable.isTestActive ? ' active' : ''}${focusedCircuit === cable.circuit ? ' focus' : ''}`}
          data-circuit={cable.circuit}
          onMouseEnter={() => onFocusedCircuitChange(cable.circuit)}
          onMouseLeave={() => onFocusedCircuitChange(null)}
        />
      ))}
    </svg>
  );
}
