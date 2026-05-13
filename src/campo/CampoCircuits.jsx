export default function CampoCircuits({ cables, fieldState }) {
  const circuits = [
    { id: 'phaseA', label: 'Fase A' },
    { id: 'phaseB', label: 'Fase B' },
    { id: 'phaseC', label: 'Fase C' },
    { id: 'voltage', label: 'Tensão' },
    { id: 'tripCoil', label: 'Trip Coil' }
  ];

  const validateCircuit = (circuit) => {
    if (circuit.id === 'phaseA' || circuit.id === 'phaseB') return 'ok';
    if (circuit.id === 'phaseC') return cables.length > 0 ? 'ok' : 'warn';
    return cables.length > 3 ? 'ok' : 'warn';
  };

  return (
    <div className="cam-card">
      <div className="cam-card-title">✓ Circuitos</div>
      <div className="cam-circuits">
        {circuits.map(c => {
          const status = validateCircuit(c);
          return (
            <div key={c.id} className="cam-circuit-line">
              <div className={`cam-circuit-icon ${status}`}>
                {status === 'ok' ? '✓' : '⚠'}
              </div>
              <div className="cam-circuit-label">{c.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
