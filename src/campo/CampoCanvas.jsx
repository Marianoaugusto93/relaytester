import { computeTerminalPosition, buildManhattanPath, laneY } from "./routing.js";

export default function CampoCanvas({
  cables, fieldState, selectedOrigin, suggestedDests,
  onSelectOrigin, onSelectDest, onCancelSelection
}) {
  const lanes = [
    { phase: 'A', y: 60, color: '#FFE033', label: 'Fase A' },
    { phase: 'B', y: 90, color: '#E53935', label: 'Fase B' },
    { phase: 'C', y: 120, color: '#9E9E9E', label: 'Fase C' },
    { phase: 'gnd', y: 150, color: '#43A047', label: 'Terra' },
    { phase: 'cmd', y: 180, color: '#F97316', label: 'Comando' }
  ];

  const terminals = [
    { id: 'i1_pos', x: 50, y: 30, label: 'I1+', group: 'A' },
    { id: 'i1_neg', x: 70, y: 30, label: 'I1-', group: 'A' },
    { id: 'i2_pos', x: 100, y: 30, label: 'I2+', group: 'B' },
    { id: 'i2_neg', x: 120, y: 30, label: 'I2-', group: 'B' },
    { id: 'i3_pos', x: 150, y: 30, label: 'I3+', group: 'C' },
    { id: 'i3_neg', x: 170, y: 30, label: 'I3-', group: 'C' },
    { id: 'ia1_top', x: 50, y: 450, label: 'IA-S1', group: 'A' },
    { id: 'ia1_bot', x: 70, y: 470, label: 'IA-S2', group: 'A' },
    { id: 'ib1_top', x: 100, y: 450, label: 'IB-S1', group: 'B' },
    { id: 'ib1_bot', x: 120, y: 470, label: 'IB-S2', group: 'B' },
    { id: 'ic1_top', x: 150, y: 450, label: 'IC-S1', group: 'C' },
    { id: 'ic1_bot', x: 170, y: 470, label: 'IC-S2', group: 'C' },
  ];

  return (
    <div className="campo-canvas-new">
      <div className="cam-svg-container">
        <svg viewBox="0 0 800 600" className="cam-svg-wrapper">
          {/* Background */}
          <defs>
            <linearGradient id="bg-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#0e1015', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#181b22', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          <rect width="800" height="600" fill="url(#bg-grad)" />

          {/* Phase lanes */}
          {lanes.map(lane => (
            <g key={lane.phase}>
              <rect x="30" y={lane.y - 10} width="740" height="20" fill={lane.color} opacity="0.15" />
              <text x="15" y={lane.y + 4} fontSize="10" fill="#999" textAnchor="end">
                {lane.label}
              </text>
            </g>
          ))}

          {/* Cables */}
          {cables.map((cable, i) => {
            const p1 = computeTerminalPosition(cable.from);
            const p2 = computeTerminalPosition(cable.to);
            const phase = cable.from?.includes('i1') ? 'A' : cable.from?.includes('i2') ? 'B' : 'C';
            const pathStr = buildManhattanPath(p1, p2, phase);
            return (
              <path
                key={i}
                d={pathStr}
                className="cable-normal"
                style={{ opacity: 0.7 }}
              />
            );
          })}

          {/* Terminals */}
          {terminals.map(term => {
            const isOrigin = selectedOrigin === term.id;
            const isValid = selectedOrigin && suggestedDests.has(term.id);
            const isInvalid = selectedOrigin && !suggestedDests.has(term.id) && selectedOrigin !== term.id;

            return (
              <g
                key={term.id}
                onClick={() => {
                  if (isValid) {
                    onSelectDest(term.id);
                  } else if (!selectedOrigin) {
                    onSelectOrigin(term.id);
                  }
                }}
                style={{ cursor: isInvalid ? 'not-allowed' : 'pointer' }}
              >
                <circle
                  cx={term.x}
                  cy={term.y}
                  r="6"
                  fill="#1e88e5"
                  stroke={isOrigin ? '#4ade80' : isValid ? '#f97316' : '#666'}
                  strokeWidth={isOrigin || isValid ? 2 : 1}
                  style={{
                    opacity: isInvalid ? 0.3 : 1,
                    filter: isValid ? 'drop-shadow(0 0 6px rgba(249,115,22,.6))' : 'none'
                  }}
                />
                <text
                  x={term.x}
                  y={term.y + 12}
                  fontSize="9"
                  textAnchor="middle"
                  fill={isInvalid ? '#666' : '#aaa'}
                  style={{ opacity: isInvalid ? 0.3 : 1 }}
                >
                  {term.label}
                </text>
              </g>
            );
          })}

          {/* Banner */}
          {selectedOrigin && (
            <g>
              <rect x="20" y="560" width="760" height="30" rx="4" fill="#1e2129" opacity="0.95" stroke="#f97316" strokeWidth="1" />
              <text x="400" y="582" fontSize="12" textAnchor="middle" fill="#f0f0f5">
                Origem: {selectedOrigin} · Clique no destino sugerido. ESC cancela.
              </text>
            </g>
          )}

          {/* Cable count */}
          <text x="400" y="25" fontSize="14" textAnchor="middle" fill="#999">
            {cables.length} cabos conectados
          </text>
        </svg>
      </div>
    </div>
  );
}
