import { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// SINGLE-LINE DIAGRAM (UNIFILAR) v2
// ═══════════════════════════════════════════════════════════════════════════
export default function UnifilarDiagram({ bkState, tripLatch, springLoaded, sys, relayReadings, injecting }) {
  const closed    = bkState === 'closed';
  const energized = closed && injecting;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!energized) return;
    const id = setInterval(() => setTick(t => (t + 1) % 200), 60);
    return () => clearInterval(id);
  }, [energized]);

  const priV   = sys?.tp?.priV  ?? 13800;
  const secV   = sys?.tp?.secV  ?? 115;
  const priA   = sys?.tc?.priA  ?? 600;
  const secA   = sys?.tc?.secA  ?? 5;
  const Ia_sec = relayReadings?.currents?.Ia?.mag ?? 0;
  const Va_sec = relayReadings?.voltages?.Va?.mag ?? 0;
  const Ia_pri = energized ? Ia_sec * (priA / secA) : 0;
  const Va_pri = energized ? Va_sec * (priV / secV) : 0;

  // S aparente trifásica (fase-neutro): S = 3 * Vφ * Iφ
  const S_MVA  = energized ? (3 * Va_pri * Ia_pri) / 1e6 : 0;

  const wire  = energized ? '#22c55e' : closed ? '#e2e8f0' : '#cbd5e1';
  const wireW = energized ? 2.5 : 1.5;
  const glow  = energized ? 'drop-shadow(0 0 4px rgba(34,197,94,.6))' : 'none';

  const NUM_P    = 8;
  const particles = Array.from({ length: NUM_P }, (_, i) => {
    const base = i / NUM_P;
    return (base + tick * 0.007) % 1.0;
  });

  const VW = 760, VH = 460;
  const CY = VH / 2 - 10;
  const X0 = 50, X1 = 710;

  // Bus segments (gaps at TC x=200, TP x=360, 52 x=520)
  const busSegments = [
    { x1: X0 + 40, x2: 170 },
    { x1: 230,     x2: 330 },
    { x1: 390,     x2: 490 },
    { x1: 550,     x2: X1 - 20 },
  ];

  // Relay box geometry: between TC (200) and 52 (520), near TP secondary drop
  const RX = 300, RY = CY + 95;
  const RW = 56,  RH = 36;

  // Trip line: relay bottom → 52 base
  const tripColor   = '#ef4444';
  const tripOpacity = tripLatch ? 1 : 0.25;

  const LBox = ({ x, y, title, val, unit, color }) => (
    <g>
      <rect x={x - 40} y={y - 24} width="80" height="48" rx="6"
            fill={energized ? 'rgba(34,197,94,.08)' : 'rgba(200,212,224,.12)'}
            stroke={energized ? 'rgba(34,197,94,.35)' : 'rgba(100,120,150,.3)'}
            strokeWidth="1.5"/>
      <text x={x} y={y - 10} textAnchor="middle" fill="#475569" fontSize="8"
            fontFamily="var(--fh)" fontWeight="700" letterSpacing="0.5">{title}</text>
      <text x={x} y={y + 10} textAnchor="middle" fill={color || '#1e293b'} fontSize="13"
            fontFamily="var(--fm)" fontWeight="800">{val}</text>
      {unit && <text x={x} y={y + 22} textAnchor="middle" fill="#64748b" fontSize="7.5"
                     fontFamily="monospace" fontWeight="600">{unit}</text>}
    </g>
  );

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} xmlns="http://www.w3.org/2000/svg"
         style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="gridUni" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="0.5"/>
        </pattern>
        {/* Dash animation for trip line */}
        <style>{`
          @keyframes dashFlow {
            to { stroke-dashoffset: -24; }
          }
          @keyframes pulse52 {
            0%,100% { opacity: 1; }
            50%      { opacity: 0.35; }
          }
          @media (prefers-reduced-motion: reduce) {
            .trip-dash-anim { animation: none !important; }
            .bk52-pulse     { animation: none !important; }
          }
        `}</style>
      </defs>

      {/* Background */}
      <rect width={VW} height={VH} fill="var(--card)"/>
      <rect width={VW} height={VH} fill="url(#gridUni)" opacity="0.5"/>

      {/* Title */}
      <text x={VW / 2} y="22" textAnchor="middle" fill="#c8d4e0" fontSize="10"
            fontFamily="var(--fh)" letterSpacing="2" fontWeight="800">
        DIAGRAMA UNIFILAR — BAY-01 — {(priV / 1000).toFixed(1)} kV / {secV} V
      </text>

      {/* ── SOURCE ── */}
      <g transform={`translate(${X0},${CY})`}>
        <circle cx="0" cy="0" r="26" fill="white" stroke={wire} strokeWidth={wireW} filter={glow}/>
        <text x="0" y="-8" textAnchor="middle" fill={energized ? '#22c55e' : '#475569'}
              fontSize="11" fontWeight="800" fontFamily="var(--fm)">~</text>
        <text x="0" y="8" textAnchor="middle" fill={energized ? '#22c55e' : '#475569'}
              fontSize="8" fontFamily="var(--fm)" fontWeight="700">3φ</text>
        <text x="0" y="42" textAnchor="middle" fill="#475569" fontSize="8"
              fontFamily="var(--fh)" fontWeight="700">FONTE</text>
        <text x="0" y="-40" textAnchor="middle" fill={energized ? '#f97316' : '#475569'}
              fontSize="10" fontFamily="var(--fm)" fontWeight="800">
          {energized ? `${(Va_pri / 1000).toFixed(1)} kV` : `${(priV / 1000).toFixed(1)} kV`}
        </text>
      </g>

      {/* ── BUS SEGMENTS ── */}
      {busSegments.map((seg, i) => (
        <line key={i} x1={seg.x1} y1={CY} x2={seg.x2} y2={CY}
              stroke={wire} strokeWidth={wireW} filter={glow} strokeLinecap="round"/>
      ))}

      {/* ── ENERGY PARTICLES ── */}
      {energized && (() => {
        const totalLen = busSegments.reduce((s, seg) => s + seg.x2 - seg.x1, 0);
        return particles.map((pos, i) => {
          let target = pos * totalLen;
          let x = 0;
          for (const seg of busSegments) {
            const len = seg.x2 - seg.x1;
            if (target <= len) { x = seg.x1 + target; break; }
            target -= len;
          }
          return x > 0 ? (
            <circle key={i} cx={x} cy={CY} r="3"
                    fill="#22c55e" opacity={0.6 + 0.4 * Math.sin(i * 1.3)}
                    filter="drop-shadow(0 0 3px rgba(34,197,94,.9))"/>
          ) : null;
        });
      })()}

      {/* ── TC (x=200) ── */}
      <g transform={`translate(200,${CY})`}>
        <circle cx="0" cy="-14" r="16" fill="white" stroke={wire} strokeWidth={wireW} filter={glow}/>
        <circle cx="0" cy="14" r="16" fill="white" stroke={wire} strokeWidth={wireW} filter={glow}/>
        <rect x="-18" y="-2" width="36" height="4" rx="2" fill={wire} opacity="0.8"/>
        <text x="0" y="48" textAnchor="middle" fill="#475569" fontSize="8"
              fontFamily="var(--fh)" fontWeight="700">TC</text>
        <text x="0" y="60" textAnchor="middle" fill="#64748b" fontSize="7"
              fontFamily="var(--fm)">{priA}/{secA} A</text>
        {/* Primary reading */}
        <LBox x="0" y={-75} title="Ia PRI"
              val={energized ? Ia_pri.toFixed(1) : '—'} unit="A"
              color={energized ? '#22c55e' : '#1e293b'}/>
        {/* Secondary reading — cyan */}
        <LBox x="82" y={-75} title="Ia SEC"
              val={energized ? Ia_sec.toFixed(2) : '—'} unit="A"
              color="#0ea5e9"/>
        {/* TC secondary line down to relay */}
        <line x1="0" y1="30" x2={RX - 200} y2={RY - CY}
              stroke="#475569" strokeWidth="1" strokeDasharray="3 2" opacity="0.6"/>
      </g>

      {/* ── TP (x=360) ── */}
      <g transform={`translate(360,${CY})`}>
        <circle cx="0" cy="-14" r="16" fill="white" stroke={wire} strokeWidth={wireW} filter={glow}/>
        <circle cx="0" cy="14" r="16" fill="white" stroke={wire} strokeWidth={wireW} filter={glow}/>
        <rect x="-18" y="-2" width="36" height="4" rx="2" fill={wire} opacity="0.8"/>
        <text x="0" y="48" textAnchor="middle" fill="#475569" fontSize="8"
              fontFamily="var(--fh)" fontWeight="700">TP</text>
        <text x="0" y="60" textAnchor="middle" fill="#64748b" fontSize="7"
              fontFamily="var(--fm)">{(priV / 1000).toFixed(1)}k/{secV} V</text>
        {/* Primary reading */}
        <LBox x="0" y={-75} title="Va PRI"
              val={energized ? (Va_pri / 1000).toFixed(2) : '—'} unit="kV"
              color={energized ? '#f97316' : '#1e293b'}/>
        {/* Secondary reading — orange */}
        <LBox x="82" y={-75} title="Va SEC"
              val={energized ? Va_sec.toFixed(1) : '—'} unit="V"
              color="#f97316"/>
        {/* TP secondary line down to relay */}
        <line x1="0" y1="30" x2={RX - 360} y2={RY - CY}
              stroke="#475569" strokeWidth="1" strokeDasharray="3 2" opacity="0.6"/>
      </g>

      {/* ── RELAY BOX (x=300, below bus) ── */}
      <g>
        {/* Box */}
        <rect x={RX - RW / 2} y={RY - RH / 2} width={RW} height={RH} rx="5"
              fill="white" stroke="#64748b" strokeWidth="1.5"/>
        <text x={RX} y={RY - 2} textAnchor="middle" fill="#1e293b"
              fontSize="16" fontFamily="var(--fm)" fontWeight="800">R</text>
        <text x={RX} y={RY + 13} textAnchor="middle" fill="#475569"
              fontSize="7" fontFamily="var(--fh)" fontWeight="700" letterSpacing="0.5">50/51</text>

        {/* Trip line: relay bottom → 52 base (x=520, CY) — dashed red */}
        <line
          x1={RX} y1={RY + RH / 2}
          x2={520} y2={CY + 28}
          stroke={tripColor}
          strokeWidth={tripLatch ? 2 : 1.5}
          strokeDasharray="8 4"
          opacity={tripOpacity}
          className={tripLatch ? 'trip-dash-anim' : ''}
          style={tripLatch ? { animation: 'dashFlow 0.4s linear infinite' } : {}}
        />
        {/* Trip label */}
        <text
          x={(RX + 520) / 2 - 12} y={(RY + RH / 2 + CY + 28) / 2 - 5}
          fill={tripColor} fontSize="8" fontFamily="var(--fh)" fontWeight="700"
          opacity={tripOpacity}
        >trip</text>
      </g>

      {/* ── 52 BREAKER (x=520) ── */}
      <g transform={`translate(520,${CY})`}>
        {/* Pulsing border when tripLatch */}
        <rect x="-22" y="-22" width="44" height="44" rx="5"
              fill="white"
              stroke={closed ? '#22c55e' : tripLatch ? '#ef4444' : '#dc2626'}
              strokeWidth={closed ? 2.5 : 1.5}
              filter={closed
                ? 'drop-shadow(0 0 8px rgba(34,197,94,.35))'
                : 'drop-shadow(0 0 6px rgba(239,68,68,.25))'}
              className={tripLatch ? 'bk52-pulse' : ''}
              style={tripLatch ? { animation: 'pulse52 0.7s ease-in-out infinite' } : {}}
        />
        {closed
          ? <line x1="-14" y1="0" x2="14" y2="0" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round"/>
          : <line x1="-6" y1="-14" x2="10" y2="0" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" transform="rotate(-30)"/>
        }
        <text x="0" y="38" textAnchor="middle"
              fill={closed ? '#22c55e' : '#ef4444'}
              fontSize="10" fontFamily="var(--fh)" fontWeight="800">
          {closed ? 'FECHADO' : tripLatch ? 'TRIP' : 'ABERTO'}
        </text>
        <text x="0" y="50" textAnchor="middle" fill="#475569" fontSize="8"
              fontFamily="var(--fm)" fontWeight="700">52</text>
      </g>

      {/* ── LOAD (x=X1) ── */}
      <g transform={`translate(${X1},${CY})`}>
        <rect x="-20" y="-20" width="40" height="40" rx="4"
              fill="white"
              stroke={energized ? '#0ea5e9' : '#cbd5e1'}
              strokeWidth={energized ? 2 : 1.5}
              filter={energized ? 'drop-shadow(0 0 8px rgba(14,165,233,.3))' : 'none'}/>
        <text x="0" y="6" textAnchor="middle" fill={energized ? '#0ea5e9' : '#475569'}
              fontSize="12" fontFamily="var(--fm)" fontWeight="800">Z</text>
        <text x="0" y="36" textAnchor="middle" fill="#475569" fontSize="8"
              fontFamily="var(--fh)" fontWeight="700">CARGA</text>
        {/* S aparente trifásica */}
        <LBox x="0" y={-75} title="POT. APARENTE"
              val={energized ? S_MVA.toFixed(2) : '—'} unit="MVA"
              color={energized ? '#0ea5e9' : '#1e293b'}/>
      </g>

      {/* ── FOOTER STATUS ── */}
      <g transform={`translate(12,${VH - 28})`}>
        <circle cx="6" cy="6" r="5" fill={energized ? '#22c55e' : '#cbd5e1'}/>
        <text x="18" y="11" fill={energized ? '#22c55e' : '#475569'}
              fontSize="8" fontFamily="var(--fm)" fontWeight="700">
          {energized ? 'ENERGIZADO — corrente fluindo' : 'DESENERGIZADO'}
        </text>
      </g>

      {/* ── MOLA PILL (footer right) ── */}
      <g transform={`translate(${VW - 130},${VH - 32})`}>
        <rect x="0" y="0" width="118" height="20" rx="10"
              fill={springLoaded ? 'rgba(34,197,94,.12)' : 'rgba(245,158,11,.12)'}
              stroke={springLoaded ? 'rgba(34,197,94,.4)' : 'rgba(245,158,11,.4)'}
              strokeWidth="1"/>
        <circle cx="10" cy="10" r="4"
                fill={springLoaded ? '#22c55e' : '#f59e0b'}/>
        <text x="20" y="14" fill={springLoaded ? '#22c55e' : '#f59e0b'}
              fontSize="8.5" fontFamily="var(--fh)" fontWeight="700" letterSpacing="0.5">
          {springLoaded ? 'MOLA OK' : 'MOLA CARREGANDO'}
        </text>
      </g>
    </svg>
  );
}
