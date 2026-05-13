import { validateCircuit } from "./routing.js";

export default function CampoCircuits({ cables, fieldState, electricalGraph }) {
  const circuitMap = validateCircuit(cables, electricalGraph);

  const circuits = [
    { id: 'Fase A',    label: 'Fase A' },
    { id: 'Fase B',    label: 'Fase B' },
    { id: 'Fase C',    label: 'Fase C' },
    { id: 'Tensão',    label: 'Tensão' },
    { id: 'Trip Coil', label: 'Trip Coil' },
  ];

  return (
    <div className="cam-card">
      <div className="cam-card-title">Circuitos</div>
      <div className="cam-circuits">
        {circuits.map(c => {
          const status = (circuitMap.get(c.id) || 'FAIL').toLowerCase();
          // status: 'ok' | 'warn' | 'fail'
          const icon = status === 'ok' ? '✓' : status === 'warn' ? '⚠' : '✗';
          return (
            <div key={c.id} className="cam-circuit-line">
              <div className={`cam-circuit-icon ${status}`}>{icon}</div>
              <div className="cam-circuit-label">{c.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
