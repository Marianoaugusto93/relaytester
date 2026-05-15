import { validateCircuit } from "./routing.js";

export default function CampoCircuits({ cables, fieldState, electricalGraph, boStatus, biStatus }) {
  const circuitMap = validateCircuit(cables, electricalGraph);

  const circuits = [
    { id: 'Fase A',    label: 'Fase A' },
    { id: 'Fase B',    label: 'Fase B' },
    { id: 'Fase C',    label: 'Fase C' },
    { id: 'Tensão',    label: 'Tensão' },
    { id: 'Trip Coil', label: 'Trip Coil' },
  ];

  // BO Status: show which BO outputs are active
  const activeBOs = boStatus ? Object.entries(boStatus)
    .filter(([_, active]) => active)
    .map(([key]) => key.toUpperCase())
    .join(', ') : 'nenhum';

  // BI Status: show which BI inputs are active
  const activeBIs = biStatus ? Object.entries(biStatus)
    .filter(([_, active]) => active)
    .map(([key]) => key.toUpperCase())
    .join(', ') : 'nenhum';

  return (
    <div className="cam-card">
      <div className="cam-card-title">Circuitos</div>
      <div className="cam-circuits">
        {circuits.map(c => {
          const status = (circuitMap.get(c.id) || 'FAIL').toLowerCase();
          const icon = status === 'ok' ? '✓' : status === 'warn' ? '⚠' : '✗';
          return (
            <div key={c.id} className="cam-circuit-line">
              <div className={`cam-circuit-icon ${status}`}>{icon}</div>
              <div className="cam-circuit-label">{c.label}</div>
            </div>
          );
        })}
      </div>
      {boStatus && (
        <div className="cam-card-section" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #333' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#aaa', marginBottom: '4px' }}>Saídas BO Ativas:</div>
          <div style={{ fontSize: '12px', color: activeBOs === 'nenhum' ? '#666' : '#7C3AED' }}>
            {activeBOs}
          </div>
        </div>
      )}
      {biStatus && (
        <div className="cam-card-section" style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#aaa', marginBottom: '4px' }}>Entradas BI Ativas:</div>
          <div style={{ fontSize: '12px', color: activeBIs === 'nenhum' ? '#666' : '#06B6D4' }}>
            {activeBIs}
          </div>
        </div>
      )}
    </div>
  );
}
