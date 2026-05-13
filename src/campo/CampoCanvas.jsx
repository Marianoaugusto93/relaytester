import { TERMINALS, computeTerminalPosition, buildManhattanPath, validateConnection } from "./routing.js";

export default function CampoCanvas({
  cables, fieldState, selectedOrigin, suggestedDests,
  onSelectOrigin, onSelectDest, onCancelSelection,
  cableColorFor, electricalGraph,
}) {
  const lanes = [
    { phase: 'A', y: 60, color: '#FFE033', label: 'Fase A' },
    { phase: 'B', y: 90, color: '#E53935', label: 'Fase B' },
    { phase: 'C', y: 120, color: '#9E9E9E', label: 'Fase C' },
    { phase: 'gnd', y: 150, color: '#43A047', label: 'Terra' },
    { phase: 'cmd', y: 180, color: '#F97316', label: 'Comando' }
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
            const fromTerm = TERMINALS.find(t => t.id === cable.from);
            const phase = fromTerm?.group || 'cmd';
            const pathStr = buildManhattanPath(p1, p2, phase);
            const color = cableColorFor ? cableColorFor(cable.from, cable.to) : '#444444';
            return (
              <path
                key={i}
                d={pathStr}
                className="cable-normal"
                style={{ opacity: 0.7, stroke: color }}
              />
            );
          })}

          {/* Terminals */}
          {terminals.map(term => {
            const isOrigin = selectedOrigin === term.id;

            // When an origin is selected: validate this terminal as destination
            let connValid = false;
            let connBlocked = false;
            if (selectedOrigin && !isOrigin) {
              const { valid } = validateConnection(selectedOrigin, term.id, cables);
              connValid = valid;
              connBlocked = !valid;
            }

            // Highlight terminals in same electrical node as the selected origin
            const sameNode = selectedOrigin && electricalGraph
              ? electricalGraph.areConnected(term.id, selectedOrigin) && !isOrigin
              : false;

            // Color logic
            let stroke = '#666';
            let strokeWidth = 1;
            let opacity = 1;
            let glowFilter = 'none';
            let cursor = 'pointer';

            if (isOrigin) {
              stroke = '#4ade80'; strokeWidth = 2;
            } else if (selectedOrigin) {
              if (connValid) {
                stroke = '#f97316'; strokeWidth = 2;
                glowFilter = 'drop-shadow(0 0 6px rgba(249,115,22,.6))';
              } else if (sameNode) {
                // Already in same electrical node — show in yellow as warning
                stroke = '#facc15'; strokeWidth = 1.5;
                opacity = 0.6;
                cursor = 'not-allowed';
              } else {
                opacity = 0.3;
                cursor = 'not-allowed';
              }
            }

            return (
              <g
                key={term.id}
                onClick={() => {
                  if (isOrigin) return;
                  if (selectedOrigin) {
                    if (connValid) onSelectDest(term.id);
                  } else {
                    onSelectOrigin(term.id);
                  }
                }}
                style={{ cursor }}
              >
                <circle
                  cx={term.x}
                  cy={term.y}
                  r="6"
                  fill={term.fill || '#1e88e5'}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  style={{ opacity, filter: glowFilter }}
                />
                <text
                  x={term.x}
                  y={term.y + 12}
                  fontSize="9"
                  textAnchor="middle"
                  fill={opacity < 1 ? '#666' : '#aaa'}
                  style={{ opacity }}
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
