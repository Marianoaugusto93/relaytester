import { useState } from "react";

// Simplified BreakerSVG — corpo + alavanca + placa SIEMENS SION + serial
// Removidos: bloco de specs, 3 indicadores circulares (MOLA/TRIP/POS), botões O/I
function BreakerSVG({ bkState }) {
  const closed = bkState === 'closed';
  return (
    <svg viewBox="0 0 200 320" xmlns="http://www.w3.org/2000/svg"
         style={{ width: '100%', maxHeight: '100%', filter: 'drop-shadow(0 6px 20px rgba(0,0,0,.65))' }}>
      <defs>
        <linearGradient id="bkBody2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3d4d60"/>
          <stop offset="50%" stopColor="#58697d"/>
          <stop offset="100%" stopColor="#374454"/>
        </linearGradient>
        <linearGradient id="bkTop2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2c3a4a"/>
          <stop offset="100%" stopColor="#222f3e"/>
        </linearGradient>
        <linearGradient id="bkPlate2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e8edf3"/>
          <stop offset="100%" stopColor="#cdd5e0"/>
        </linearGradient>
      </defs>

      {/* Corpo principal */}
      <rect x="10" y="6" width="180" height="308" rx="10" fill="url(#bkBody2)" stroke="#1e2c3c" strokeWidth="2"/>
      <rect x="10" y="6" width="5" height="308" rx="5" fill="rgba(255,255,255,.07)"/>
      <rect x="185" y="6" width="5" height="308" rx="5" fill="rgba(0,0,0,.2)"/>

      {/* Topo — janela da alavanca */}
      <rect x="18" y="14" width="164" height="112" rx="6" fill="url(#bkTop2)" stroke="rgba(255,255,255,.04)" strokeWidth="1"/>
      {[[28,24],[172,24],[28,116],[172,116]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r="4" fill="#182230" stroke="rgba(255,255,255,.12)" strokeWidth="1"/>
      ))}

      {/* Janela com estado fechado/aberto */}
      <rect x="50" y="38" width="100" height="60" rx="5"
            fill={closed ? '#0c2018' : '#200d0d'}
            stroke={closed ? '#1a5a36' : '#5a1a1a'} strokeWidth="1.5"/>

      {/* Alavanca */}
      <g transform={`translate(100,55) rotate(${closed ? 0 : -20})`}>
        <rect x="-5" y="-22" width="10" height="26" rx="3" fill={closed ? '#2d7a50' : '#7a2d2d'}/>
        <rect x="-9" y="-26" width="18" height="10" rx="2" fill={closed ? '#22c55e' : '#f87171'} opacity="0.9"/>
      </g>

      {/* Status text */}
      <text x="100" y="88" textAnchor="middle" fill="rgba(255,255,255,.65)"
            fontSize="8.5" fontWeight="700" fontFamily="monospace" letterSpacing="1">
        {closed ? '— FECHADO —' : '— ABERTO  —'}
      </text>

      {/* Placa SIEMENS */}
      <rect x="18" y="134" width="164" height="42" rx="3" fill="url(#bkPlate2)"/>
      <rect x="18" y="134" width="164" height="42" rx="3" stroke="rgba(0,0,0,.12)" strokeWidth="1" fill="none"/>
      <text x="100" y="161" textAnchor="middle" fill="#1a1a2a"
            fontSize="17" fontWeight="900" fontFamily="Arial,sans-serif" letterSpacing="3.5">SIEMENS</text>

      {/* Placa SION */}
      <rect x="18" y="184" width="164" height="56" rx="3" fill="#28334a"/>
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x="20" y={188 + i * 7} width="160" height="4" fill="rgba(0,0,0,.2)" rx="1"/>
      ))}
      <text x="100" y="220" textAnchor="middle" fill="#8aa0bc"
            fontSize="21" fontWeight="800" fontFamily="Arial,sans-serif" letterSpacing="5">SION</text>

      {/* Serial */}
      <rect x="18" y="248" width="164" height="60" rx="3" fill="#141c28"/>
      <text x="100" y="282" textAnchor="middle" fill="#2d3a4a"
            fontSize="6" fontFamily="monospace">3VL5-630-2DC36 · BAY-01 · S/N 24183-01</text>
    </svg>
  );
}

// ─── Pílula de estado ───────────────────────────────────────────────────────
function Pill({ label, value, color }) {
  // color: 'amber' | 'red' | 'green' | 'gray'
  const map = {
    amber: { dot: '#fbbf24', bg: 'rgba(251,191,36,.08)', text: '#fbbf24' },
    red:   { dot: '#ef4444', bg: 'rgba(239,68,68,.08)',  text: '#f87171' },
    green: { dot: '#22c55e', bg: 'rgba(34,197,94,.08)',  text: '#4ade80' },
    gray:  { dot: '#4a5568', bg: 'rgba(100,116,139,.06)', text: '#64748b' },
    cyan:  { dot: '#0ea5e9', bg: 'rgba(14,165,233,.08)', text: '#7dd3fc' },
  };
  const c = map[color] || map.gray;
  return (
    <div className="bk-pill" style={{ background: c.bg }}>
      <span className="bk-pill-dot" style={{ background: c.dot }}/>
      <span className="bk-pill-label">{label}</span>
      <span className="bk-pill-val" style={{ color: c.text }}>{value}</span>
    </div>
  );
}

// ─── BreakerCard ─────────────────────────────────────────────────────────────
export default function BreakerCard({
  bkState,
  springLoaded,
  tripLatch,
  springPct,
  opCount,
  onOpen,
  onClose,
  onResetTrip,
}) {
  const [showSpec, setShowSpec] = useState(false);

  const closed  = bkState === 'closed';
  const isOpen  = bkState === 'open';
  const isBusy  = bkState === 'closing' || bkState === 'opening' || bkState === 'tripping';

  // Pílula MOLA
  const molaColor = springLoaded ? 'amber' : 'gray';
  const molaVal   = springLoaded ? `Carregada (${Math.round(springPct)}%)` : `Carregando (${Math.round(springPct)}%)`;

  // Pílula TRIP
  const tripColor = tripLatch ? 'red' : 'gray';
  const tripVal   = tripLatch ? 'Acionado' : 'Não acionado';

  // Pílula POSIÇÃO
  const posColor = closed ? 'green' : (tripLatch ? 'red' : 'amber');
  const posVal   = closed ? 'Fechado' : 'Aberto';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Zona topo — SVG físico */}
      <div className="bk-zone-top">
        <BreakerSVG bkState={bkState}/>
      </div>

      {/* Zona meio — 3 pílulas */}
      <div className="bk-zone-mid">
        <Pill label="MOLA"    value={molaVal}  color={molaColor}/>
        <Pill label="TRIP"    value={tripVal}   color={tripColor}/>
        <Pill label="POSIÇÃO" value={posVal}    color={posColor}/>
      </div>

      {/* Zona rodapé — botões */}
      <div className="bk-zone-foot">
        {/* Botões principais — sempre visíveis */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="bk-open-btn"
            style={{ flex: 1 }}
            disabled={!closed || isBusy}
            onClick={onOpen}
            title={!closed ? 'Disjuntor já está aberto' : 'Abrir disjuntor'}
          >
            O · ABRIR
          </button>
          <button
            className="bk-close-btn"
            style={{ flex: 1 }}
            disabled={!isOpen || !springLoaded || isBusy}
            onClick={onClose}
            title={!isOpen ? 'Disjuntor não está aberto' : !springLoaded ? 'Aguardando mola carregar' : 'Fechar disjuntor'}
          >
            I · FECHAR
          </button>
        </div>

        {/* Reset Trip — apenas quando aplicável */}
        {tripLatch && isOpen && !isBusy && (
          <button className="bk-reset-btn" style={{ width: '100%' }} onClick={onResetTrip}>
            ↺ Reset Trip
          </button>
        )}

        {/* Busy indicator */}
        {isBusy && (
          <div className="bk-busy">
            {bkState === 'closing' ? 'Fechando...' : bkState === 'tripping' ? 'Disparando...' : 'Abrindo...'}
          </div>
        )}

        {/* Popover especificações */}
        <div style={{ position: 'relative' }}>
          <button
            className="bk-spec-btn"
            onClick={() => setShowSpec(v => !v)}
          >
            ⓘ Especificações
          </button>
          {showSpec && (
            <div className="bk-spec-popover">
              <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 10, color: 'var(--tx2)' }}>
                Dados Técnicos
              </div>
              <div>In = 400 A &nbsp;·&nbsp; Vn = 690 V</div>
              <div>Icu = 35 kA &nbsp;·&nbsp; IEC 60947-2</div>
              <div style={{ marginTop: 4, color: 'var(--tx3)' }}>3VL5-630-2DC36</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
