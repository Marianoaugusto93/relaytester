import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ─── Design tokens (mirrored from PainelPage) ──────────────────────────────
const C = {
  off:    { f: '#141e2a', s: '#c8d4e0', g: 'none' },
  orange: { f: '#f97316', s: '#c2410c', g: 'rgba(249,115,22,.5)' },
  yellow: { f: '#fbbf24', s: '#d97706', g: 'rgba(251,191,36,.5)' },
  green:  { f: '#22c55e', s: '#15803d', g: 'rgba(34,197,94,.5)' },
  red:    { f: '#ef4444', s: '#b91c1c', g: 'rgba(239,68,68,.55)' },
};
const col = (on, name) => on ? C[name] : C.off;

// ─── Legenda — Elementos principais ──────────────────────────────────────────
const LEGEND_ITEMS = [
  { key: 'BCS', desc: 'Comando supervisório', cat: 'entrada' },
  { key: 'LM',  desc: 'Mola carregada', cat: 'feedback' },
  { key: 'GL',  desc: 'Bobina de disparo', cat: 'saida' },
  { key: 'AP',  desc: 'Anti-recuo trip', cat: 'protecao' },
  { key: 'BD1', desc: 'Contato 52a (fechado)', cat: 'feedback' },
  { key: 'GT2', desc: 'Contato 52b (aberto)', cat: 'feedback' },
  { key: 'K',   desc: 'Relé auxiliar', cat: 'comando' },
  { key: 'BM',  desc: 'Motor da mola', cat: 'saida' },
];

// ─── Tooltips ───────────────────────────────────────────────────────────────
const TIPS = {
  BCS: { title: 'BCS — Botão de Comando Supervisório',  body: 'Sinal de autorização vindo do sistema supervisório (SCADA). Quando presente, habilita os circuitos de comando do disjuntor.' },
  LM:  { title: 'LM — Limite de Mola (Spring Limit)',   body: 'Indica que a mola de fechamento está totalmente carregada. O disjuntor só pode fechar quando este contato estiver ativo.' },
  BL:  { title: 'BL — Bobina de Bloqueio',              body: 'Anti-rebote: impede novo fechamento imediato após abertura por proteção.' },
  BAD: { title: 'BAD — Bobina Auxiliar de Disparo',     body: 'Contato auxiliar que atua em condições específicas de disparo do relé de proteção.' },
  BA1: { title: 'BA1 — Bobina Auxiliar 1',              body: 'Relé auxiliar de comando no circuito de fechamento.' },
  BB:  { title: 'BB — Bobina de Bloqueio',              body: 'Inibe o comando de fechamento quando as condições de segurança não estão satisfeitas.' },
  GL:  { title: 'GL — Bobina de Disparo (Trip Coil)',   body: 'Bobina principal de abertura. Quando energizada aciona o mecanismo de disparo.' },
  AP:  { title: 'AP — Travamento de Trip',              body: 'Indica que o relé de proteção disparou e o disjuntor está travado em aberto.' },
  BD1: { title: 'BD1 — Contato Auxiliar 52a',           body: 'Espelho da posição do disjuntor: fechado quando o disjuntor está fechado.' },
  GT2: { title: 'GT2 — Contato Auxiliar 52b',           body: 'Espelho invertido: fechado quando o disjuntor está aberto.' },
  K:   { title: 'K — Relé Auxiliar de Comando',         body: 'Relé intermediário que isola os circuitos de comando do disjuntor.' },
  N:   { title: 'N — Relé Anti-rebote (Anti-pump)',      body: 'Evita múltiplos fechamentos consecutivos.' },
  BF:  { title: 'BF — Relé de Falha de Disjuntor',      body: 'Supervisiona a abertura: se o disjuntor não abrir no tempo previsto, aciona retaguarda.' },
  AB:  { title: 'AB — Bobina de Abertura',               body: 'Bobina secundária de abertura (shunt trip).' },
  BA:  { title: 'BA — Bobina de Fechamento',             body: 'Bobina de comando de fechamento (close coil).' },
  BM:  { title: 'BM — Motor da Mola',                   body: 'Motor elétrico que recarrega a mola de fechamento após cada operação.' },
};

// ─── SVG do diagrama de comando ─────────────────────────────────────────────
function CommandDiagramSVG({ bkState, springLoaded, tripLatch }) {
  const closed   = bkState === 'closed';
  const motorRun = !springLoaded;
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  const handleTipEnter = (key, e) => setTooltip({ key, x: e.clientX, y: e.clientY });
  const handleTipMove  = (e) => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null);
  const handleTipLeave = () => setTooltip(null);

  useEffect(() => {
    const hide = () => setTooltip(null);
    document.addEventListener('mouseleave', hide);
    document.addEventListener('visibilitychange', hide);
    return () => {
      document.removeEventListener('mouseleave', hide);
      document.removeEventListener('visibilitychange', hide);
      setTooltip(null);
    };
  }, []);

  const VW = 1200, VH = 600;
  const Y1 = 120, Y2 = 480;
  const X0 = 80,  X1 = 1120;
  const NRUNGS = 10;
  const STEP   = (X1 - X0) / (NRUNGS - 1);
  const XS = Array.from({ length: NRUNGS }, (_, i) => Math.round(X0 + i * STEP));

  const IND_Y  = Y1 - 40;
  const COIL_Y = Y2 + 52;
  const CY1 = 213, CY2 = 333;
  const MID  = (CY1 + CY2) / 2;

  const BUS  = '#e2e8f0';
  const WIRE = '#cbd5e1';
  const NODE = '#94a3b8';
  const OFF_C = '#475569';

  const eBCS = col(true,         'orange');
  const eLM  = col(springLoaded, 'yellow');
  const eBL  = col(false,        'orange');
  const eBAD = col(false,        'orange');
  const eBA1 = col(false,        'orange');
  const eBB  = col(false,        'orange');
  const eGL  = col(tripLatch,    'red');
  const eAP  = col(tripLatch,    'orange');
  const eBD1 = col(closed,       'orange');
  const eGT2 = col(!closed,      'orange');
  const eK   = col(true,         'orange');
  const eN   = col(false,        'orange');
  const eBF  = col(false,        'orange');
  const eAB  = col(false,        'orange');
  const eBA  = col(false,        'orange');
  const eBM  = col(motorRun,     'orange');

  const Contact = ({ x, y, active, nc }) => {
    const s  = active ? (nc ? C.red.f : C.orange.f) : OFF_C;
    const BH = 10, BG = 6, BW = active ? 2.5 : 2;
    const glow = active ? (nc ? 'drop-shadow(0 0 5px rgba(239,68,68,.8))' : 'drop-shadow(0 0 6px rgba(249,115,22,.9))') : 'none';
    return (
      <g filter={glow}>
        <line x1={x-BG} y1={y-BH} x2={x-BG} y2={y+BH} stroke={s} strokeWidth={BW} strokeLinecap="round"/>
        <line x1={x+BG} y1={y-BH} x2={x+BG} y2={y+BH} stroke={s} strokeWidth={BW} strokeLinecap="round"/>
        {active && (
          <line x1={x-BG-2} y1={y+BH} x2={x+BG+2} y2={y-BH} stroke={s} strokeWidth="1.5" opacity="0.8" strokeLinecap="round"/>
        )}
      </g>
    );
  };

  const Rung = ({ x, contacts = [] }) => {
    const sorted = [...contacts].sort((a, b) => a.y - b.y);
    const GAP = 13;
    const pts = [Y1, ...sorted.flatMap(c => [c.y - GAP, c.y + GAP]), Y2];
    const segs = [];
    for (let i = 0; i < pts.length - 1; i += 2) segs.push([pts[i], pts[i+1]]);
    return (
      <g>
        {segs.map(([a, b], i) => (
          <line key={i} x1={x} y1={a} x2={x} y2={b} stroke={WIRE} strokeWidth="1.8" strokeLinecap="round" opacity="0.9"/>
        ))}
        {sorted.map((c, i) => (
          <Contact key={i} x={x} y={c.y} active={c.active} nc={c.nc}/>
        ))}
      </g>
    );
  };

  const Coil = ({ x, c2, label }) => {
    const on = c2.f !== C.off.f;
    const r = 15;
    return (
      <g>
        <line x1={x} y1={Y2} x2={x} y2={COIL_Y - r} stroke={WIRE} strokeWidth="1.8" opacity="0.9"/>
        {on && c2.g !== 'none' && (
          <circle cx={x} cy={COIL_Y} r={r+6} fill="none" stroke={c2.g} strokeWidth="1.2" opacity="0.5"/>
        )}
        <circle cx={x} cy={COIL_Y} r={r}
                fill={c2.f} stroke={c2.s} strokeWidth={on ? 2 : 1.5}
                filter={on && c2.g !== 'none' ? `drop-shadow(0 0 8px ${c2.g})` : 'none'}/>
        <text x={x} y={COIL_Y + 5} textAnchor="middle"
              fill={on ? 'white' : '#4a5a6a'} fontSize="9" fontWeight="900" fontFamily="var(--fh)" letterSpacing="0.5">{label}</text>
        <text x={x} y={COIL_Y + r + 14} textAnchor="middle"
              fill={on ? '#cbd5e1' : '#64748b'} fontSize="7.5" fontFamily="var(--fm)" fontWeight="700">{label}</text>
      </g>
    );
  };

  const CoilSqLeft = ({ x, y, c2, label }) => {
    const on = c2.f !== C.off.f;
    const s = 13;
    return (
      <g>
        <line x1={x + s} y1={y} x2={X0} y2={y} stroke={WIRE} strokeWidth="1.8" opacity="0.9"/>
        {on && c2.g !== 'none' && (
          <rect x={x-s-4} y={y-s-4} width={(s+4)*2} height={(s+4)*2} rx="3" fill="none" stroke={c2.g} strokeWidth="1.2" opacity="0.5"/>
        )}
        <rect x={x-s} y={y-s} width={s*2} height={s*2} rx="4"
              fill={c2.f} stroke={c2.s} strokeWidth={on ? 2 : 1.5}
              filter={on && c2.g !== 'none' ? `drop-shadow(0 0 8px ${c2.g})` : 'none'}/>
        <text x={x} y={y + 5} textAnchor="middle"
              fill={on ? 'white' : '#4a5a6a'} fontSize="10" fontWeight="900" fontFamily="var(--fh)" letterSpacing="0.5">{label}</text>
        <text x={x} y={y - s - 7} textAnchor="middle"
              fill={on ? '#cbd5e1' : '#64748b'} fontSize="8" fontFamily="var(--fm)" fontWeight="700">{label}</text>
      </g>
    );
  };

  const IndC = ({ x, label, c2, r = 12 }) => {
    const on = c2.f !== C.off.f;
    return (
      <g>
        <line x1={x} y1={Y1} x2={x} y2={IND_Y + r} stroke={WIRE} strokeWidth="1.5" opacity="0.9"/>
        {on && c2.g !== 'none' && (
          <circle cx={x} cy={IND_Y} r={r+6} fill="none" stroke={c2.g} strokeWidth="1.5" opacity="0.5"/>
        )}
        <circle cx={x} cy={IND_Y} r={r}
                fill={c2.f} stroke={c2.s} strokeWidth={on ? 2 : 1.5}
                filter={on && c2.g !== 'none' ? `drop-shadow(0 0 8px ${c2.g})` : 'none'}/>
        <text x={x} y={IND_Y - r - 6} textAnchor="middle"
              fill={on ? 'white' : '#64748b'} fontSize="8" fontFamily="var(--fm)" fontWeight="700" letterSpacing="0.5">{label}</text>
      </g>
    );
  };

  const IndS = ({ x, label, c2, s = 10 }) => {
    const on = c2.f !== C.off.f;
    return (
      <g>
        <line x1={x} y1={Y1} x2={x} y2={IND_Y + s} stroke={WIRE} strokeWidth="1.5" opacity="0.9"/>
        {on && c2.g !== 'none' && (
          <rect x={x-s-4} y={IND_Y-s-4} width={(s+4)*2} height={(s+4)*2} rx="3" fill="none" stroke={c2.g} strokeWidth="1.2" opacity="0.5"/>
        )}
        <rect x={x-s} y={IND_Y-s} width={s*2} height={s*2} rx="3"
              fill={c2.f} stroke={c2.s} strokeWidth={on ? 2 : 1.5}
              filter={on && c2.g !== 'none' ? `drop-shadow(0 0 8px ${c2.g})` : 'none'}/>
        <text x={x} y={IND_Y - s - 6} textAnchor="middle"
              fill={on ? 'white' : '#64748b'} fontSize="8" fontFamily="var(--fm)" fontWeight="700" letterSpacing="0.5">{label}</text>
      </g>
    );
  };

  const IndAP = ({ x, label, c2 }) => {
    const on = tripLatch;
    const r = 12;
    return (
      <g>
        <line x1={x} y1={Y1} x2={x} y2={IND_Y + r} stroke={WIRE} strokeWidth="1.5" opacity="0.9"/>
        {on && (
          <circle cx={x} cy={IND_Y} r={r+6} fill="none" stroke={c2.g} strokeWidth="1.5" opacity="0.5"/>
        )}
        <circle cx={x} cy={IND_Y} r={r}
                fill={on ? c2.f : C.off.f} stroke={on ? c2.s : C.off.s} strokeWidth={on ? 2 : 1.5}
                filter={on && c2.g !== 'none' ? `drop-shadow(0 0 8px ${c2.g})` : 'none'}/>
        {on ? (
          <>
            <line x1={x-7} y1={IND_Y-7} x2={x+7} y2={IND_Y+7} stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1={x+7} y1={IND_Y-7} x2={x-7} y2={IND_Y+7} stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </>
        ) : (
          <>
            <line x1={x-6} y1={IND_Y-6} x2={x+6} y2={IND_Y+6} stroke={OFF_C} strokeWidth="1.5" strokeLinecap="round"/>
            <line x1={x+6} y1={IND_Y-6} x2={x-6} y2={IND_Y+6} stroke={OFF_C} strokeWidth="1.5" strokeLinecap="round"/>
          </>
        )}
        <text x={x} y={IND_Y - r - 6} textAnchor="middle"
              fill={on ? 'white' : '#64748b'} fontSize="8" fontFamily="var(--fm)" fontWeight="700" letterSpacing="0.5">{label}</text>
      </g>
    );
  };

  const coilDefs = [
    { idx: 2, label: 'N',  c2: eN  },
    { idx: 3, label: 'BF', c2: eBF },
    { idx: 4, label: 'AB', c2: eAB },
    { idx: 5, label: 'BA', c2: eBA },
    { idx: 7, label: 'BM', c2: eBM },
  ];

  // Conteúdo do retângulo RELÉ (vãos 3-7)
  const releX = XS[3] + (XS[7] - XS[3]) / 2;
  const releYcenter = (Y1 + Y2) / 2;

  return (
    <>
      <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} xmlns="http://www.w3.org/2000/svg"
           style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet"
           onMouseLeave={handleTipLeave}>
        <defs>
          <pattern id="cmdGrid2" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="0.5"/>
          </pattern>
        </defs>

        <rect width={VW} height={VH} fill="var(--card)"/>
        <rect width={VW} height={VH} fill="url(#cmdGrid2)" opacity="0.6"/>

        {/* Barramentos */}
        <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke={BUS} strokeWidth="2.8" opacity="0.95"/>
        <line x1={X0} y1={Y2} x2={X1} y2={Y2} stroke={BUS} strokeWidth="2.8" opacity="0.95"/>
        <line x1={X0} y1={Y1} x2={X0} y2={Y2} stroke={BUS} strokeWidth="2.8" opacity="0.95"/>
        <line x1={X1} y1={Y1} x2={X1} y2={Y2} stroke={BUS} strokeWidth="2.8" opacity="0.95"/>

        {/* Numeração dos nós */}
        {XS.map((x, i) => (
          <text key={`t${i}`} x={x} y={Y1 - 6} textAnchor="middle" fill="#64748b" fontSize="8.5" fontFamily="var(--fm)" fontWeight="600">{2*i+1}</text>
        ))}
        {XS.map((x, i) => (
          <text key={`b${i}`} x={x} y={Y2 + 14} textAnchor="middle" fill="#64748b" fontSize="8.5" fontFamily="var(--fm)" fontWeight="600">{2*i+2}</text>
        ))}

        {/* Pontos de nó */}
        {XS.map((x, i) => (
          <g key={`n${i}`}>
            <circle cx={x} cy={Y1} r="4" fill={NODE} opacity="0.8"/>
            <circle cx={x} cy={Y2} r="4" fill={NODE} opacity="0.8"/>
          </g>
        ))}

        {/* Caixa tracejada do relé */}
        <rect x={XS[3]-22} y={Y1+8} width={XS[7]-XS[3]+44} height={Y2-Y1-16}
              rx="6" fill="rgba(249,115,22,.03)"
              stroke="rgba(249,115,22,.15)" strokeWidth="1.2" strokeDasharray="6,4"/>
        <text x={XS[3]-14} y={Y1+22} fill="#f97316" fontSize="8" fontFamily="var(--fh)" letterSpacing="1" fontWeight="700">RELÉ</text>

        {/* Conteúdo do retângulo RELÉ — BO1/BI1/BOB.TC */}
        <text x={releX} y={releYcenter - 22} textAnchor="middle"
              fill={tripLatch ? '#ef4444' : '#475569'} fontSize="9.5" fontFamily="var(--fm)" fontWeight="700" letterSpacing="0.5">
          BO1 · TRIP
        </text>
        <text x={releX} y={releYcenter} textAnchor="middle"
              fill={closed ? '#22c55e' : '#475569'} fontSize="9.5" fontFamily="var(--fm)" fontWeight="700" letterSpacing="0.5">
          BI1 · 52b
        </text>
        <text x={releX} y={releYcenter + 22} textAnchor="middle"
              fill="#475569" fontSize="9.5" fontFamily="var(--fm)" fontWeight="600" letterSpacing="0.5">
          BOB. TC
        </text>

        {/* Rails horizontais */}
        <line x1={XS[0]} y1={CY1} x2={XS[5]} y2={CY1} stroke={WIRE} strokeWidth="1.5" opacity="0.75"/>
        <line x1={XS[3]} y1={CY2} x2={XS[8]} y2={CY2} stroke={WIRE} strokeWidth="1.5" opacity="0.75"/>
        <line x1={XS[6]} y1={MID} x2={XS[9]} y2={MID} stroke={WIRE} strokeWidth="1.5" opacity="0.75"/>

        {/* Indicadores */}
        <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('BCS',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndS x={XS[0]} label="BCS" c2={eBCS} s={9}/></g>
        <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('LM',e)}  onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndC x={XS[1]} label="LM"  c2={eLM}  r={12}/></g>
        <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('BL',e)}  onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndS x={XS[2]} label="BL"  c2={eBL}  s={8}/></g>
        <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('BAD',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndS x={XS[3]} label="BAD" c2={eBAD} s={8}/></g>
        <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('BA1',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndS x={XS[4]} label="BA1" c2={eBA1} s={8}/></g>
        <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('BB',e)}  onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndS x={XS[5]} label="BB"  c2={eBB}  s={8}/></g>
        <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('GL',e)}  onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndC x={XS[6]} label="GL"  c2={eGL}  r={12}/></g>
        <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('AP',e)}  onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndAP x={XS[7]} label="AP" c2={eAP}/></g>
        <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('BD1',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndS x={XS[8]} label="BD1" c2={eBD1} s={8}/></g>
        <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('GT2',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndS x={XS[9]} label="GT2" c2={eGT2} s={8}/></g>

        {/* Vãos */}
        <Rung x={XS[0]} contacts={[{y:CY1, active:true}]}/>
        <Rung x={XS[1]} contacts={[{y:CY1, active:springLoaded}]}/>
        <Rung x={XS[2]} contacts={[{y:CY1, active:false}]}/>
        <Rung x={XS[3]} contacts={[{y:CY1, active:false},{y:CY2, active:false}]}/>
        <Rung x={XS[4]} contacts={[{y:CY1, active:false},{y:CY2, active:false}]}/>
        <Rung x={XS[5]} contacts={[{y:CY1, active:false},{y:CY2, active:closed}]}/>
        <Rung x={XS[6]} contacts={[{y:MID, active:tripLatch}]}/>
        <Rung x={XS[7]} contacts={[{y:CY2, active:tripLatch}]}/>
        <Rung x={XS[8]} contacts={[{y:CY2, active:closed}]}/>
        <Rung x={XS[9]} contacts={[{y:MID, active:!closed}]}/>

        {/* Ligação horizontal extra BB→5 */}
        <line x1={XS[4]} y1={CY2} x2={XS[5]} y2={CY2} stroke={WIRE} strokeWidth="1.2" opacity="0.6" strokeDasharray="4,3"/>

        {/* Relé K */}
        <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('K',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}>
          <CoilSqLeft x={X0 - 40} y={(Y1+Y2)/2} c2={eK} label="K"/>
        </g>

        {/* Bobinas */}
        {coilDefs.map(({ idx, label, c2 }) => (
          <g key={label} style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter(label,e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}>
            <Coil x={XS[idx]} c2={c2} label={label}/>
          </g>
        ))}

        {/* Stubs sem bobina */}
        {[0,1,6,8,9].map(idx => (
          <line key={`stub${idx}`} x1={XS[idx]} y1={Y2} x2={XS[idx]} y2={Y2+8}
                stroke={WIRE} strokeWidth="1.2" strokeLinecap="round"/>
        ))}
      </svg>

      {/* Tooltip portal */}
      {tooltip && TIPS[tooltip.key] && createPortal((() => {
        const t = TIPS[tooltip.key];
        const pw = 260, ph = 110;
        const lx = tooltip.x + 16 + pw > window.innerWidth ? tooltip.x - pw - 12 : tooltip.x + 16;
        const ly = tooltip.y + ph > window.innerHeight - 20 ? tooltip.y - ph : tooltip.y;
        return (
          <div style={{
            position: 'fixed', left: lx, top: ly, zIndex: 9999,
            pointerEvents: 'none', maxWidth: pw,
            background: '#08111a', border: '1px solid rgba(200,212,224,.2)',
            borderRadius: 10, padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,.75)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#c8d4e0', fontFamily: 'monospace', letterSpacing: .3, marginBottom: 6, lineHeight: 1.4 }}>
              {t.title}
            </div>
            <div style={{ fontSize: 10, color: '#6a7a8a', lineHeight: 1.55 }}>
              {t.body}
            </div>
          </div>
        );
      })(), document.body)}
    </>
  );
}

// ─── CommandDiagram — SVG apenas ──────────────────────────────────────────────
export default function CommandDiagram({ bkState, springLoaded, tripLatch, showLegend = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* SVG principal */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', minHeight: 0 }}>
        <CommandDiagramSVG bkState={bkState} springLoaded={springLoaded} tripLatch={tripLatch}/>
      </div>
    </div>
  );
}
