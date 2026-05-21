import { TERMINALS, computeTerminalPosition, buildManhattanPath, validateConnection } from "./routing.js";

export default function CampoCanvas({
  cables, fieldState, selectedOrigin, suggestedDests,
  onSelectOrigin, onSelectDest, onCancelSelection,
  cableColorFor, electricalGraph,
  switchSt, onSwitchToggle,
}) {
  // Each phase row has a Y position (matches TERMINALS layout in routing.js).
  // For currents, each phase has 2 sub-rows (id1 + id2) controlled by a single toggle.
  const switchRows = [
    { id: 'ia', label: 'Fase A', poleId: 'ia1', color: '#FFE033', yTop: 80,  yBot: 130, kind: 'current', phaseColor: '#1565C0' },
    { id: 'ib', label: 'Fase B', poleId: 'ib1', color: '#E53935', yTop: 180, yBot: 230, kind: 'current', phaseColor: '#B71C1C' },
    { id: 'ic', label: 'Fase C', poleId: 'ic1', color: '#9E9E9E', yTop: 280, yBot: 330, kind: 'current', phaseColor: '#616161' },
    { id: 'va', label: 'Va',     poleId: 'va',  color: '#1e88e5', yTop: 400, yBot: 400, kind: 'voltage', phaseColor: '#1565C0' },
    { id: 'vb', label: 'Vb',     poleId: 'vb',  color: '#e53935', yTop: 440, yBot: 440, kind: 'voltage', phaseColor: '#B71C1C' },
    { id: 'vc', label: 'Vc',     poleId: 'vc',  color: '#9e9e9e', yTop: 480, yBot: 480, kind: 'voltage', phaseColor: '#616161' },
  ];

  // Slider X position in CHAVE zone (center between top and bot terminals)
  const SLIDER_X = 420;
  const SLIDER_W = 110;
  const SLIDER_H_CURRENT = 70;  // bigger box for currents (covers 2 sub-rows)
  const SLIDER_H_VOLTAGE = 28;  // smaller box for voltage rows

  return (
    <div className="campo-canvas-new">
      <div className="cam-svg-container">
        <svg viewBox="0 0 1000 680" className="cam-svg-wrapper" preserveAspectRatio="xMidYMid meet">
          {/* Background */}
          <defs>
            <linearGradient id="bg-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#0e1015', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#181b22', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          <rect width="1000" height="680" fill="url(#bg-grad)" />

          {/* Zone backgrounds — subtle tint for each zone */}
          <rect x="20"  y="40" width="160" height="620" fill="#06B6D4" opacity="0.04" rx="8" />
          <rect x="200" y="40" width="500" height="620" fill="#FFE033" opacity="0.03" rx="8" />
          <rect x="700" y="40" width="280" height="620" fill="#F97316" opacity="0.04" rx="8" />

          {/* Zone separators (vertical) */}
          <line x1="195" y1="40" x2="195" y2="660" stroke="#2a2e36" strokeWidth="1" strokeDasharray="6,4" />
          <line x1="700" y1="40" x2="700" y2="660" stroke="#2a2e36" strokeWidth="1" strokeDasharray="6,4" />

          {/* Vertical separator between BO/BI (left) and Corrente/Tensão (right) */}
          <line x1="120" y1="40" x2="120" y2="540" stroke="#444" strokeWidth="1" opacity="0.5" />

          {/* Separator between BO and BI in left column */}
          <line x1="25" y1="250" x2="115" y2="250" stroke="#7C3AED" strokeWidth="1" opacity="0.4" />

          {/* Separator between Corrente and Tensão in right column */}
          <line x1="125" y1="360" x2="190" y2="360" stroke="#1e88e5" strokeWidth="1" opacity="0.4" />

          {/* Zone headers */}
          <text x="100" y="28" fontSize="14" fontWeight="700" textAnchor="middle" fill="#06B6D4" style={{ letterSpacing: '1.5px' }}>
            MALETA DE TESTE
          </text>
          <text x="450" y="28" fontSize="14" fontWeight="700" textAnchor="middle" fill="#FFE033" style={{ letterSpacing: '1.5px' }}>
            CHAVE DE AFERIÇÃO
          </text>
          <text x="830" y="28" fontSize="14" fontWeight="700" textAnchor="middle" fill="#F97316" style={{ letterSpacing: '1.5px' }}>
            RELÉ DE PROTEÇÃO
          </text>

          {/* Maleta section labels - Two columns layout */}
          {/* Left column labels */}
          <text x="80" y="65" fontSize="9" fontWeight="600" textAnchor="middle" fill="#9F7AEA">SAÍDA</text>
          <text x="80" y="260" fontSize="9" fontWeight="600" textAnchor="middle" fill="#67E8F9">ENTRADA</text>
          {/* Right column labels */}
          <text x="160" y="65" fontSize="9" fontWeight="600" textAnchor="middle" fill="#1e88e5">CORRENTE</text>
          <text x="160" y="385" fontSize="9" fontWeight="600" textAnchor="middle" fill="#1e88e5">TENSÃO</text>

          {/* Phase row backgrounds in CHAVE zone — subtle stripes for visual grouping */}
          {switchRows.filter(r => r.kind === 'current').map(row => (
            <rect
              key={`bg-${row.id}`}
              x="200"
              y={row.yTop - 22}
              width="500"
              height={row.yBot - row.yTop + 44}
              fill={row.color}
              opacity="0.05"
              rx="4"
            />
          ))}

          {/* Switch sliders/levers (CHAVE) — big, intuitive */}
          {switchRows.map(row => {
            const isUp = switchSt && switchSt[row.poleId] === 'up';
            const sliderH = row.kind === 'current' ? SLIDER_H_CURRENT : SLIDER_H_VOLTAGE;
            const sliderY = row.kind === 'current'
              ? row.yTop - 4
              : row.yTop - sliderH / 2;
            const fillColor = isUp
              ? `${row.phaseColor}cc`  // strong colored when UP/closed
              : '#7f1d1d';             // dark red when DOWN/open
            const borderColor = isUp ? '#4ade80' : '#f87171';
            const statusText = isUp ? '↑ FECHADA' : '↓ ABERTA';
            const labelY = row.kind === 'current' ? sliderY + sliderH / 2 - 6 : sliderY + sliderH / 2 - 3;
            const statusY = row.kind === 'current' ? sliderY + sliderH / 2 + 12 : sliderY + sliderH / 2 + 10;

            return (
              <g
                key={row.id}
                onClick={() => onSwitchToggle && onSwitchToggle(row.poleId)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={SLIDER_X - SLIDER_W / 2}
                  y={sliderY}
                  width={SLIDER_W}
                  height={sliderH}
                  rx="6"
                  fill={fillColor}
                  stroke={borderColor}
                  strokeWidth="2"
                  style={{ transition: 'all 200ms ease' }}
                />
                <text
                  x={SLIDER_X}
                  y={labelY}
                  fontSize={row.kind === 'current' ? '13' : '11'}
                  fontWeight="700"
                  textAnchor="middle"
                  fill="#fff"
                  style={{ pointerEvents: 'none' }}
                >
                  {row.label}
                </text>
                <text
                  x={SLIDER_X}
                  y={statusY}
                  fontSize={row.kind === 'current' ? '11' : '9'}
                  fontWeight="600"
                  textAnchor="middle"
                  fill={isUp ? '#4ade80' : '#fca5a5'}
                  style={{ pointerEvents: 'none' }}
                >
                  {statusText}
                </text>
              </g>
            );
          })}

          {/* Internal continuity lines: when slider UP, show connection from top→bot through slider */}
          {switchRows.map(row => {
            const isUp = switchSt && switchSt[row.poleId] === 'up';
            if (!isUp) return null;
            if (row.kind === 'current') {
              // Two parallel lines: top1→bot1 and top2→bot2 (Fase + T)
              return (
                <g key={`cont-${row.id}`} style={{ pointerEvents: 'none' }}>
                  <line x1="240" y1={row.yTop} x2="750" y2={row.yTop}
                        stroke={row.color} strokeWidth="1.5" strokeDasharray="2,3" opacity="0.6" />
                  <line x1="240" y1={row.yBot} x2="750" y2={row.yBot}
                        stroke={row.color} strokeWidth="1.5" strokeDasharray="2,3" opacity="0.6" />
                </g>
              );
            }
            return (
              <line key={`cont-${row.id}`}
                    x1="240" y1={row.yTop} x2="750" y2={row.yTop}
                    stroke={row.color} strokeWidth="1.5" strokeDasharray="2,3" opacity="0.6"
                    style={{ pointerEvents: 'none' }} />
            );
          })}

          {/* Permanent hardware wiring: chave-bot terminals → relé sensors.
              Rendered as solid lines to visualize the relay-side bus. */}
          {switchRows.filter(r => r.kind === 'current').map(row => (
            <g key={`relay-bus-${row.id}`} style={{ pointerEvents: 'none' }}>
              <line x1="770" y1={row.yTop} x2="820" y2={row.yTop}
                    stroke="#F97316" strokeWidth="1.5" opacity="0.4" />
              <line x1="770" y1={row.yBot} x2="820" y2={row.yBot}
                    stroke="#F97316" strokeWidth="1.5" opacity="0.4" />
            </g>
          ))}

          {/* Relay box outline */}
          <rect x="720" y="55" width="240" height="450" rx="8"
                fill="#1a1d24" stroke="#F97316" strokeWidth="1.5" opacity="0.85" />
          <text x="840" y="74" fontSize="10" fontWeight="600" textAnchor="middle" fill="#F97316"
                style={{ letterSpacing: '1px' }}>
            ENTRADAS ANALÓGICAS
          </text>

          {/* User-drawn cables - spaghetti routing with Bezier curves */}
          {cables.map((cable, i) => {
            const p1 = computeTerminalPosition(cable.from);
            const p2 = computeTerminalPosition(cable.to);
            const fromTerm = TERMINALS.find(t => t.id === cable.from);
            const phase = fromTerm?.group || 'cmd';
            const pathStr = buildManhattanPath(p1, p2, phase, i);
            const color = cableColorFor ? cableColorFor(cable.from, cable.to) : '#444444';
            return (
              <path
                key={i}
                d={pathStr}
                className="cable-normal"
                style={{ opacity: 0.85, stroke: color, strokeWidth: 2.5, fill: 'none', strokeLinecap: 'round' }}
              />
            );
          })}

          {/* Terminals */}
          {TERMINALS.map(term => {
            const isOrigin = selectedOrigin === term.id;

            let connValid = false;
            let connBlocked = false;
            if (selectedOrigin && !isOrigin) {
              const { valid } = validateConnection(selectedOrigin, term.id, cables);
              connValid = valid;
              connBlocked = !valid;
            }

            const sameNode = selectedOrigin && electricalGraph
              ? electricalGraph.areConnected(term.id, selectedOrigin) && !isOrigin
              : false;

            let stroke = '#fff';
            let strokeWidth = 1.2;
            let opacity = 1;
            let glowFilter = 'none';
            let cursor = 'pointer';

            if (isOrigin) {
              stroke = '#4ade80'; strokeWidth = 2.5;
              glowFilter = 'drop-shadow(0 0 6px rgba(74,222,128,.7))';
            } else if (selectedOrigin) {
              if (connValid) {
                stroke = '#f97316'; strokeWidth = 2.5;
                glowFilter = 'drop-shadow(0 0 6px rgba(249,115,22,.6))';
              } else if (sameNode) {
                stroke = '#facc15'; strokeWidth = 1.5;
                opacity = 0.6;
                cursor = 'not-allowed';
              } else {
                opacity = 0.3;
                cursor = 'not-allowed';
              }
            }

            // Terminal sizing and label positioning by zone
            const isRelayTerm = term.x >= 700;
            const isMaletaTerm = term.x < 200;
            const r = isRelayTerm ? 6 : 5;

            // Label positioning by zone and column
            let labelX, labelY, labelAnchor;
            if (isRelayTerm) {
              // Relay: labels to the RIGHT
              labelX = term.x + 12;
              labelY = term.y + 4;
              labelAnchor = 'start';
            } else if (isMaletaTerm) {
              // Maleta: TWO COLUMNS
              // Left column (x=80): BO/BI — labels to the LEFT
              // Right column (x=160): Corrente/Tensão — labels to the LEFT
              labelX = term.x - 18;
              labelY = term.y + 3;
              labelAnchor = 'end';
            } else {
              // Chave: labels BELOW circles (centered)
              labelX = term.x;
              labelY = term.y + 14;
              labelAnchor = 'middle';
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
                  r={r}
                  fill={term.fill || '#1e88e5'}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  style={{ opacity, filter: glowFilter }}
                />
                <text
                  x={labelX}
                  y={labelY}
                  fontSize={isRelayTerm ? '10' : '8'}
                  fontWeight={isRelayTerm ? '600' : '400'}
                  textAnchor={labelAnchor}
                  fill={opacity < 1 ? '#666' : (isRelayTerm ? '#ddd' : '#aaa')}
                  style={{ opacity, pointerEvents: 'none' }}
                >
                  {term.label}
                </text>
              </g>
            );
          })}

          {/* Banner */}
          {selectedOrigin && (
            <g>
              <rect x="20" y="580" width="960" height="32" rx="4"
                    fill="#1e2129" opacity="0.95" stroke="#f97316" strokeWidth="1" />
              <text x="500" y="602" fontSize="12" textAnchor="middle" fill="#f0f0f5">
                Origem: {selectedOrigin} · Clique no destino válido (laranja). ESC cancela.
              </text>
            </g>
          )}

          {/* Cable count */}
          <text x="500" y="52" fontSize="11" textAnchor="middle" fill="#999">
            {cables.length} cabos conectados · clique numa fase para abrir/fechar a chave
          </text>
        </svg>
      </div>
    </div>
  );
}
