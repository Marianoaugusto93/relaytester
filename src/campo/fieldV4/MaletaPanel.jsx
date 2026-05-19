import PlugBanana from './PlugBanana.jsx';
import { MALETA_PORTS } from './fieldV4Data.js';

export default function MaletaPanel() {
  const analogPorts = MALETA_PORTS.filter(p => p.section === 'analog');
  const binaryPorts = MALETA_PORTS.filter(p => p.section === 'binary');

  const renderGroup = (ports, label) => (
    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
      <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--ink-2)', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {ports.map(port => (
          <PlugBanana key={port.id} id={port.id} color={port.color} />
        ))}
      </div>
    </div>
  );

  const groupAnalog = (ports) => {
    const currents = ports.filter(p => p.subsection === 'currents');
    const voltages = ports.filter(p => p.subsection === 'voltages');
    return [
      { label: 'Correntes', ports: currents },
      { label: 'Tensões', ports: voltages },
    ];
  };

  const groupBinary = (ports) => {
    const bo = ports.filter(p => p.subsection === 'BO');
    const bi = ports.filter(p => p.subsection === 'BI');
    return [
      { label: 'BO (Saídas)', ports: bo },
      { label: 'BI (Entradas)', ports: bi },
    ];
  };

  return (
    <div className="maleta-panel">
      {/* Left: Analog outputs */}
      <div className="maleta-section">
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--ink)', marginBottom: '8px', textAlign: 'center' }}>
          Saídas Analógicas
        </div>
        {groupAnalog(analogPorts).map(({ label, ports }) => renderGroup(ports, label))}
      </div>

      {/* Right: Binary I/O */}
      <div className="maleta-section">
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--ink)', marginBottom: '8px', textAlign: 'center' }}>
          Comando & Controle
        </div>
        {groupBinary(binaryPorts).map(({ label, ports }) => renderGroup(ports, label))}
      </div>
    </div>
  );
}
