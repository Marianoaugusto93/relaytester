import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const C = {
  off:    { f:'#141e2a', s:'#c8d4e0', g:'none' },
  orange: { f:'#f97316', s:'#c2410c', g:'rgba(249,115,22,.5)' },
  yellow: { f:'#fbbf24', s:'#d97706', g:'rgba(251,191,36,.5)' },
  green:  { f:'#22c55e', s:'#15803d', g:'rgba(34,197,94,.5)'  },
  red:    { f:'#ef4444', s:'#b91c1c', g:'rgba(239,68,68,.55)' },
};
const col = (on, name) => on ? C[name] : C.off;

const S = `
.painel-pg{display:flex;flex-direction:column;height:100%;gap:8px}
.painel-main{display:flex;gap:8px;flex:1;min-height:0}
.painel-bk{background:var(--card);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column;width:256px;flex-shrink:0}
.painel-right{background:var(--card);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column;flex:1;min-width:0}
.painel-right-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.painel-bk-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:10px 14px 12px;gap:6px;min-height:0;overflow:hidden}
.painel-bk-svg{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}
.painel-tab-row{display:flex;gap:0;padding:3px 8px;border-bottom:1px solid var(--bdr);flex-shrink:0;background:rgba(0,0,0,.1)}
.pt{padding:7px 16px;border:none;background:transparent;color:var(--tx3);font-size:11px;font-weight:700;font-family:var(--fh);cursor:pointer;border-radius:6px;white-space:nowrap;letter-spacing:1px;text-transform:uppercase;transition:all .2s}.pt:hover{color:var(--tx2)}.pt.on{color:var(--mint);background:var(--mint-dim)}
.painel-tab-content{flex:1;min-height:0;padding:8px 12px;display:flex;align-items:stretch}
.bk-close-btn,.bk-open-btn,.bk-reset-btn{width:100%;padding:10px;border-radius:var(--rs);font-size:12px;font-weight:800;font-family:var(--fh);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;transition:all .2s}
.bk-close-btn{border:1px solid rgba(34,197,94,.35);background:rgba(34,197,94,.1);color:#22c55e}
.bk-close-btn:hover:not(:disabled){background:rgba(34,197,94,.2);border-color:rgba(34,197,94,.55)}
.bk-open-btn{border:1px solid rgba(239,68,68,.35);background:rgba(239,68,68,.1);color:#f87171}
.bk-open-btn:hover:not(:disabled){background:rgba(239,68,68,.2);border-color:rgba(239,68,68,.55)}
.bk-reset-btn{border:1px solid rgba(251,191,36,.3);background:rgba(251,191,36,.08);color:#fbbf24}
.bk-reset-btn:hover{background:rgba(251,191,36,.15);border-color:rgba(251,191,36,.5)}
.bk-close-btn:disabled,.bk-open-btn:disabled{opacity:.25;cursor:not-allowed}
.bk-busy{text-align:center;color:var(--tx3);font-size:11px;padding:8px 0;font-family:var(--fm)}
.painel-status{background:var(--card);border-radius:var(--r);display:flex;align-items:stretch;flex-shrink:0;overflow:hidden}
.ps-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 14px;gap:3px;border-right:1px solid var(--bdr)}
.ps-item:last-child{border-right:none}.ps-item.ps-wide{flex:2}
.ps-lbl{font-size:8px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:1.2px;font-family:var(--fh)}
.ps-val{font-size:15px;font-weight:800;font-family:var(--fh);letter-spacing:.5px}
.ps-green{color:var(--green)}.ps-amber{color:var(--amber)}.ps-red{color:var(--red)}.ps-mono{color:var(--tx);font-family:var(--fm);font-size:22px}
.ps-mola-bar{width:100%;max-width:200px;height:4px;background:var(--card3);border-radius:2px;overflow:hidden;margin:2px 0}
.ps-mola-fill{height:100%;border-radius:2px;transition:width .12s linear}
.ps-mola-loaded{background:#fbbf24}.ps-mola-chg{background:var(--tx3)}
`;

// ═══════════════════════════════════════════════════════════════════════════
// BREAKER SVG
// ═══════════════════════════════════════════════════════════════════════════
function BreakerSVG({ bkState, springLoaded, tripLatch }) {
  const closed = bkState === 'closed';
  return (
    <svg viewBox="0 0 200 440" xmlns="http://www.w3.org/2000/svg"
         style={{width:'100%',maxHeight:'100%',filter:'drop-shadow(0 6px 20px rgba(0,0,0,.65))'}}>
      <defs>
        <linearGradient id="bkBody" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3d4d60"/><stop offset="50%" stopColor="#58697d"/><stop offset="100%" stopColor="#374454"/>
        </linearGradient>
        <linearGradient id="bkTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2c3a4a"/><stop offset="100%" stopColor="#222f3e"/>
        </linearGradient>
        <linearGradient id="bkPlate" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e8edf3"/><stop offset="100%" stopColor="#cdd5e0"/>
        </linearGradient>
      </defs>
      <rect x="10" y="6" width="180" height="428" rx="10" fill="url(#bkBody)" stroke="#1e2c3c" strokeWidth="2"/>
      <rect x="10" y="6" width="5" height="428" rx="5" fill="rgba(255,255,255,.07)"/>
      <rect x="185" y="6" width="5" height="428" rx="5" fill="rgba(0,0,0,.2)"/>
      <rect x="18" y="14" width="164" height="112" rx="6" fill="url(#bkTop)" stroke="rgba(255,255,255,.04)" strokeWidth="1"/>
      {[[28,24],[172,24],[28,116],[172,116]].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="4" fill="#182230" stroke="rgba(255,255,255,.12)" strokeWidth="1"/>
      ))}
      <rect x="50" y="38" width="100" height="60" rx="5"
            fill={closed?'#0c2018':'#200d0d'} stroke={closed?'#1a5a36':'#5a1a1a'} strokeWidth="1.5"/>
      <g transform={`translate(100,55) rotate(${closed?0:-20})`}>
        <rect x="-5" y="-22" width="10" height="26" rx="3" fill={closed?'#2d7a50':'#7a2d2d'}/>
        <rect x="-9" y="-26" width="18" height="10" rx="2" fill={closed?'#22c55e':'#f87171'} opacity="0.9"/>
      </g>
      <text x="100" y="88" textAnchor="middle" fill="rgba(255,255,255,.65)" fontSize="8.5" fontWeight="700" fontFamily="monospace" letterSpacing="1">
        {closed?'— FECHADO —':'— ABERTO  —'}
      </text>
      <rect x="18" y="134" width="164" height="42" rx="3" fill="url(#bkPlate)"/>
      <rect x="18" y="134" width="164" height="42" rx="3" stroke="rgba(0,0,0,.12)" strokeWidth="1" fill="none"/>
      <text x="100" y="161" textAnchor="middle" fill="#1a1a2a" fontSize="17" fontWeight="900" fontFamily="Arial,sans-serif" letterSpacing="3.5">SIEMENS</text>
      <rect x="18" y="184" width="164" height="56" rx="3" fill="#28334a"/>
      {Array.from({length:6},(_,i)=>(
        <rect key={i} x="20" y={188+i*7} width="160" height="4" fill="rgba(0,0,0,.2)" rx="1"/>
      ))}
      <text x="100" y="220" textAnchor="middle" fill="#8aa0bc" fontSize="21" fontWeight="800" fontFamily="Arial,sans-serif" letterSpacing="5">SION</text>
      <rect x="18" y="248" width="164" height="56" rx="3" fill="#182030"/>
      <circle cx="55" cy="276" r="17" fill={springLoaded?'rgba(251,191,36,.12)':'rgba(0,0,0,.3)'} stroke={springLoaded?'#d97706':'#2d3a4a'} strokeWidth="1.5"/>
      <circle cx="55" cy="276" r="10" fill={springLoaded?'#fbbf24':'#1e2c3e'}/>
      <text x="55" y="280" textAnchor="middle" fill={springLoaded?'#1a1a1a':'#2d3a4a'} fontSize="10" fontWeight="900">⊕</text>
      <text x="55" y="297" textAnchor="middle" fill={springLoaded?'#fbbf24':'#374151'} fontSize="6.5" fontFamily="monospace" fontWeight="700">MOLA</text>
      <circle cx="100" cy="276" r="14" fill={tripLatch?'rgba(239,68,68,.18)':'rgba(0,0,0,.28)'} stroke={tripLatch?'#ef4444':'#2d3a4a'} strokeWidth="1.5"/>
      {tripLatch
        ?<><line x1="93" y1="269" x2="107" y2="283" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
           <line x1="107" y1="269" x2="93" y2="283" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/></>
        :<circle cx="100" cy="276" r="5" fill="#1e2c3e"/>}
      <text x="100" y="297" textAnchor="middle" fill={tripLatch?'#ef4444':'#374151'} fontSize="6.5" fontFamily="monospace" fontWeight="700">TRIP</text>
      <circle cx="145" cy="276" r="14" fill={closed?'rgba(34,197,94,.12)':'rgba(248,113,113,.12)'} stroke={closed?'#16a34a':'#dc2626'} strokeWidth="1.5"/>
      <text x="145" y="281" textAnchor="middle" fill={closed?'#22c55e':'#f87171'} fontSize="13" fontWeight="900">{closed?'I':'O'}</text>
      <text x="145" y="297" textAnchor="middle" fill={closed?'#22c55e':'#f87171'} fontSize="6.5" fontFamily="monospace" fontWeight="700">POS</text>
      <rect x="18" y="312" width="164" height="72" rx="3" fill="#20293a"/>
      {[['In = 400 A',330],['Un = 690 V AC / 250 V DC',345],['Icu = 35 kA  Ics = 35 kA',360],['50/60 Hz   IEC 60947-2',375]].map(([t,y])=>(
        <text key={y} x="28" y={y} fill="#5a6e84" fontSize="8.5" fontFamily="monospace">{t}</text>
      ))}
      <rect x="20" y="392" width="72" height="22" rx="4" fill={!closed?'#7f1d1d':'#182030'} stroke={!closed?'#ef4444':'#2d3a4a'} strokeWidth="1.5"/>
      <text x="56" y="407" textAnchor="middle" fill={!closed?'#fca5a5':'#3a4a5a'} fontSize="12" fontWeight="900">O</text>
      <rect x="108" y="392" width="72" height="22" rx="4" fill={closed?'#14532d':'#182030'} stroke={closed?'#22c55e':'#2d3a4a'} strokeWidth="1.5"/>
      <text x="144" y="407" textAnchor="middle" fill={closed?'#86efac':'#3a4a5a'} fontSize="12" fontWeight="900">I</text>
      <rect x="18" y="420" width="164" height="12" rx="2" fill="#141c28"/>
      <text x="100" y="429" textAnchor="middle" fill="#2d3a4a" fontSize="6" fontFamily="monospace">3VL5-630-2DC36 · BAY-01 · S/N 24183-01</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOLTIP DESCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════
const TIPS = {
  BCS: { title:'BCS — Botão de Comando Supervisório',  body:'Sinal de autorização vindo do sistema supervisório (SCADA). Quando presente, habilita os circuitos de comando do disjuntor.' },
  LM:  { title:'LM — Limite de Mola (Spring Limit)',   body:'Indica que a mola de fechamento está totalmente carregada. O disjuntor só pode fechar quando este contato estiver ativo.' },
  BL:  { title:'BL — Bobina de Bloqueio',              body:'Anti-rebote: impede novo fechamento imediato após abertura por proteção. Garante que o disjuntor não feche automaticamente de forma repetida.' },
  BAD: { title:'BAD — Bobina Auxiliar de Disparo',     body:'Contato auxiliar que atua em condições específicas de disparo do relé de proteção, integrando o circuito de abertura.' },
  BA1: { title:'BA1 — Bobina Auxiliar 1',              body:'Relé auxiliar de comando no circuito de fechamento. Amplifica e isola o sinal de fechar proveniente do supervisório.' },
  BB:  { title:'BB — Bobina de Bloqueio',              body:'Inibe o comando de fechamento quando as condições de segurança ou interlocks não estão satisfeitos.' },
  GL:  { title:'GL — Bobina de Disparo (Trip Coil)',   body:'Bobina principal de abertura. Quando energizada aciona o mecanismo de disparo do disjuntor, causando sua abertura imediata.' },
  AP:  { title:'AP — Travamento de Trip',              body:'Indica que o relé de proteção disparou e o disjuntor está travado em aberto. Requer reset manual antes de novo fechamento.' },
  BD1: { title:'BD1 — Contato Auxiliar 52a',           body:'Espelho da posição do disjuntor: fechado quando o disjuntor está fechado. Usado para sinalização e intertravamentos.' },
  GT2: { title:'GT2 — Contato Auxiliar 52b',           body:'Espelho invertido: fechado quando o disjuntor está aberto. Supervisiona a posição aberta e habilita circuitos de fechamento.' },
  K:   { title:'K — Relé Auxiliar de Comando',         body:'Relé intermediário que isola os circuitos de comando do disjuntor, garantindo proteção, amplificação de sinal e desgalvanização.' },
  N:   { title:'N — Relé Anti-rebote (Anti-pump)',      body:'Evita múltiplos fechamentos consecutivos: bloqueia o circuito de fechamento enquanto o comando fechar permanece ativo.' },
  BF:  { title:'BF — Relé de Falha de Disjuntor',      body:'Supervisiona a abertura: se o disjuntor não abrir no tempo previsto após um trip, aciona o disjuntor de retaguarda. Função ANSI 50BF.' },
  AB:  { title:'AB — Bobina de Abertura',               body:'Bobina secundária de abertura (shunt trip). Energizada por comando remoto ou proteção para abrir o disjuntor.' },
  BA:  { title:'BA — Bobina de Fechamento',             body:'Bobina de comando de fechamento (close coil). Energizada quando a mola está carregada e todas as permissões estão satisfeitas.' },
  BM:  { title:'BM — Motor da Mola',                   body:'Motor elétrico que recarrega a mola de fechamento após cada operação de fechamento, até que o contato LM indique mola carregada.' },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND DIAGRAM — Diagrama de Comando conforme screenshot
// Labels: BCS, LM, BL, BAD, BA1, BB, GL, AP, BD1, GT2
// Bobinas: N, BF, AB, BA, BM
// K: relé auxiliar na lateral esquerda
// ═══════════════════════════════════════════════════════════════════════════
function CommandDiagram({ bkState, springLoaded, tripLatch }) {
  const closed  = bkState === 'closed';
  const motorRun = !springLoaded;
  const [tooltip, setTooltip] = useState(null); // {key, x, y}
  const svgRef = useRef(null);

  const handleTipEnter = (key, e) => {
    setTooltip({ key, x: e.clientX, y: e.clientY });
  };
  const handleTipMove = (e) => setTooltip(t => t ? {...t, x: e.clientX, y: e.clientY} : null);
  const handleTipLeave = () => setTooltip(null);

  // Esconde tooltip ao sair do SVG ou trocar de aba (unmount)
  useEffect(() => {
    const hide = () => setTooltip(null);
    document.addEventListener('mouseleave', hide);
    document.addEventListener('visibilitychange', hide);
    return () => {
      document.removeEventListener('mouseleave', hide);
      document.removeEventListener('visibilitychange', hide);
      setTooltip(null); // limpa ao desmontar
    };
  }, []);

  // ── Layout ──────────────────────────────────────────────────────────────
  const VW = 980, VH = 460;
  const Y1  = 100;   // barramento superior
  const Y2  = 370;   // barramento inferior
  const X0  = 80;    // barramento esquerdo
  const X1  = 940;   // barramento direito
  const NRUNGS = 10;
  const STEP   = (X1 - X0) / (NRUNGS - 1);
  // posições x dos 10 vãos (nós 1-19 odd no topo, 2-20 even na base)
  const XS = Array.from({length: NRUNGS}, (_, i) => Math.round(X0 + i * STEP));

  const IND_Y  = Y1 - 40;   // centro dos indicadores acima do barramento
  const COIL_Y = Y2 + 52;   // centro das bobinas abaixo do barramento

  // Alturas dos contatos nos vãos
  const CY1 = 170;   // fila superior de contatos
  const CY2 = 260;   // fila inferior de contatos
  const MID  = (CY1 + CY2) / 2;

  // ── Paleta ──────────────────────────────────────────────────────────────
  const BUS  = '#c8d4e0';
  const WIRE = '#b0bec8';
  const NODE = '#8a9aaa';
  const OFF_C = '#4a5a6a';

  // ── Estados dos elementos ────────────────────────────────────────────────
  const eBCS = col(true,         'orange');   // BCS — alimentação sempre presente
  const eLM  = col(springLoaded, 'yellow');   // LM  — mola carregada
  const eBL  = col(false,        'orange');   // BL  — antirebote (off)
  const eBAD = col(false,        'orange');   // BAD — off
  const eBA1 = col(false,        'orange');   // BA1 — off
  const eBB  = col(false,        'orange');   // BB  — off
  const eGL  = col(tripLatch,    'red');      // GL  — trip latch
  const eAP  = col(tripLatch,    'orange');   // AP  — contato trip (X quando ativo)
  const eBD1 = col(closed,       'orange');   // BD1 — 52a (fechado)
  const eGT2 = col(!closed,      'orange');   // GT2 — 52b (aberto)
  const eK   = col(true,         'orange');   // K   — relé aux sempre energizado
  const eN   = col(false,        'orange');   // N   — off
  const eBF  = col(false,        'orange');   // BF  — off
  const eAB  = col(false,        'orange');   // AB  — off
  const eBA  = col(false,        'orange');   // BA  — off
  const eBM  = col(motorRun,     'orange');   // BM  — motor da mola

  // ── Primitivas ───────────────────────────────────────────────────────────

  // Contato NO: duas barras verticais paralelas, diagonal se ativo
  const Contact = ({x, y, active, nc}) => {
    const s  = active ? (nc ? C.red.f : C.orange.f) : OFF_C;
    const BH = 10, BG = 6, BW = 2;
    return (
      <g>
        <line x1={x-BG} y1={y-BH} x2={x-BG} y2={y+BH} stroke={s} strokeWidth={BW} strokeLinecap="round"/>
        <line x1={x+BG} y1={y-BH} x2={x+BG} y2={y+BH} stroke={s} strokeWidth={BW} strokeLinecap="round"/>
        {/* diagonal indicando estado ativo */}
        {active && (
          <line x1={x-BG-2} y1={y+BH} x2={x+BG+2} y2={y-BH}
                stroke={s} strokeWidth="1.3" opacity="0.65" strokeLinecap="round"/>
        )}
      </g>
    );
  };

  // Vão vertical com quebras para cada contato
  const Rung = ({x, contacts=[]}) => {
    const sorted = [...contacts].sort((a,b) => a.y - b.y);
    const GAP = 13;
    const pts = [Y1, ...sorted.flatMap(c => [c.y - GAP, c.y + GAP]), Y2];
    const segs = [];
    for (let i = 0; i < pts.length - 1; i += 2) segs.push([pts[i], pts[i+1]]);
    return (
      <g>
        {segs.map(([a, b], i) => (
          <line key={i} x1={x} y1={a} x2={x} y2={b}
                stroke={WIRE} strokeWidth="1.5" strokeLinecap="round"/>
        ))}
        {sorted.map((c, i) => (
          <Contact key={i} x={x} y={c.y} active={c.active} nc={c.nc}/>
        ))}
      </g>
    );
  };

  // Bobina circular (abaixo do barramento inferior)
  const Coil = ({x, c2, label}) => {
    const on = c2.f !== C.off.f;
    const r = 14;
    return (
      <g>
        <line x1={x} y1={Y2} x2={x} y2={COIL_Y - r} stroke={WIRE} strokeWidth="1.5"/>
        {on && c2.g !== 'none' && (
          <circle cx={x} cy={COIL_Y} r={r+5} fill="none" stroke={c2.g} strokeWidth="1" opacity="0.35"/>
        )}
        <circle cx={x} cy={COIL_Y} r={r}
                fill={c2.f} stroke={c2.s} strokeWidth="1.5"
                filter={on && c2.g !== 'none' ? `drop-shadow(0 0 6px ${c2.g})` : 'none'}/>
        <text x={x} y={COIL_Y + 4.5} textAnchor="middle"
              fill={on ? 'white' : '#2a3848'}
              fontSize="8.5" fontWeight="800" fontFamily="monospace">{label}</text>
        <text x={x} y={COIL_Y + r + 13} textAnchor="middle"
              fill={on ? '#9ca3af' : '#1e2a38'}
              fontSize="7" fontFamily="monospace">{label}</text>
      </g>
    );
  };

  // Bobina quadrada — relé K na lateral esquerda
  const CoilSqLeft = ({x, y, c2, label}) => {
    const on = c2.f !== C.off.f;
    const s = 12;
    return (
      <g>
        {/* fio horizontal ligando ao barramento esquerdo */}
        <line x1={x + s} y1={y} x2={X0} y2={y} stroke={WIRE} strokeWidth="1.5"/>
        {on && c2.g !== 'none' && (
          <rect x={x-s-3} y={y-s-3} width={(s+3)*2} height={(s+3)*2} rx="2"
                fill="none" stroke={c2.g} strokeWidth="1" opacity="0.35"/>
        )}
        <rect x={x-s} y={y-s} width={s*2} height={s*2} rx="3"
              fill={c2.f} stroke={c2.s} strokeWidth="1.5"
              filter={on && c2.g !== 'none' ? `drop-shadow(0 0 6px ${c2.g})` : 'none'}/>
        <text x={x} y={y + 4.5} textAnchor="middle"
              fill={on ? 'white' : '#2a3848'}
              fontSize="9" fontWeight="800" fontFamily="monospace">{label}</text>
        <text x={x} y={y - s - 6} textAnchor="middle"
              fill={on ? '#9ca3af' : '#1e2a38'}
              fontSize="7.5" fontFamily="monospace">{label}</text>
      </g>
    );
  };

  // Indicador acima do barramento — círculo
  const IndC = ({x, label, c2, r=11}) => {
    const on = c2.f !== C.off.f;
    return (
      <g>
        <line x1={x} y1={Y1} x2={x} y2={IND_Y + r} stroke={WIRE} strokeWidth="1.2"/>
        {on && c2.g !== 'none' && (
          <circle cx={x} cy={IND_Y} r={r+5} fill="none" stroke={c2.g} strokeWidth="1.5" opacity="0.4"/>
        )}
        <circle cx={x} cy={IND_Y} r={r}
                fill={c2.f} stroke={c2.s} strokeWidth="1.5"
                filter={on && c2.g !== 'none' ? `drop-shadow(0 0 7px ${c2.g})` : 'none'}/>
        <text x={x} y={IND_Y - r - 5} textAnchor="middle"
              fill={on ? '#c0cad4' : '#2e3d4e'} fontSize="8" fontFamily="monospace" fontWeight="600">{label}</text>
      </g>
    );
  };

  // Indicador acima do barramento — quadrado
  const IndS = ({x, label, c2, s=9}) => {
    const on = c2.f !== C.off.f;
    return (
      <g>
        <line x1={x} y1={Y1} x2={x} y2={IND_Y + s} stroke={WIRE} strokeWidth="1.2"/>
        {on && c2.g !== 'none' && (
          <rect x={x-s-4} y={IND_Y-s-4} width={(s+4)*2} height={(s+4)*2} rx="2"
                fill="none" stroke={c2.g} strokeWidth="1" opacity="0.35"/>
        )}
        <rect x={x-s} y={IND_Y-s} width={s*2} height={s*2} rx="2"
              fill={c2.f} stroke={c2.s} strokeWidth="1.5"
              filter={on && c2.g !== 'none' ? `drop-shadow(0 0 6px ${c2.g})` : 'none'}/>
        <text x={x} y={IND_Y - s - 5} textAnchor="middle"
              fill={on ? '#c0cad4' : '#2e3d4e'} fontSize="8" fontFamily="monospace" fontWeight="600">{label}</text>
      </g>
    );
  };

  // Indicador AP — X quando ativo (contato de trip)
  const IndAP = ({x, label, c2}) => {
    const on = tripLatch;
    const r = 11;
    return (
      <g>
        <line x1={x} y1={Y1} x2={x} y2={IND_Y + r} stroke={WIRE} strokeWidth="1.2"/>
        {on && (
          <circle cx={x} cy={IND_Y} r={r+5} fill="none" stroke={c2.g} strokeWidth="1.5" opacity="0.4"/>
        )}
        <circle cx={x} cy={IND_Y} r={r}
                fill={on ? c2.f : C.off.f} stroke={on ? c2.s : C.off.s} strokeWidth="1.5"
                filter={on && c2.g !== 'none' ? `drop-shadow(0 0 7px ${c2.g})` : 'none'}/>
        {on ? (
          <>
            <line x1={x-6} y1={IND_Y-6} x2={x+6} y2={IND_Y+6} stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1={x+6} y1={IND_Y-6} x2={x-6} y2={IND_Y+6} stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
          </>
        ) : (
          // símbolo de X desligado
          <>
            <line x1={x-5} y1={IND_Y-5} x2={x+5} y2={IND_Y+5} stroke={OFF_C} strokeWidth="1.5" strokeLinecap="round"/>
            <line x1={x+5} y1={IND_Y-5} x2={x-5} y2={IND_Y+5} stroke={OFF_C} strokeWidth="1.5" strokeLinecap="round"/>
          </>
        )}
        <text x={x} y={IND_Y - r - 5} textAnchor="middle"
              fill={on ? '#c0cad4' : '#2e3d4e'} fontSize="8" fontFamily="monospace" fontWeight="600">{label}</text>
      </g>
    );
  };

  // ── Posições das bobinas — apenas 5 vãos específicos ────────────────────
  // N=vão2, BF=vão3, AB=vão4, BA=vão5, BM=vão7
  const coilDefs = [
    { idx: 2, label: 'N',  c2: eN  },
    { idx: 3, label: 'BF', c2: eBF },
    { idx: 4, label: 'AB', c2: eAB },
    { idx: 5, label: 'BA', c2: eBA },
    { idx: 7, label: 'BM', c2: eBM },
  ];

  return (
    <>
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} xmlns="http://www.w3.org/2000/svg"
         style={{width:'100%',height:'100%'}} preserveAspectRatio="xMidYMid meet"
         onMouseLeave={handleTipLeave}>

      {/* ── Barramentos ── */}
      {/* Superior */}
      <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke={BUS} strokeWidth="2.5"/>
      {/* Inferior */}
      <line x1={X0} y1={Y2} x2={X1} y2={Y2} stroke={BUS} strokeWidth="2.5"/>
      {/* Esquerdo */}
      <line x1={X0} y1={Y1} x2={X0} y2={Y2} stroke={BUS} strokeWidth="2.5"/>
      {/* Direito */}
      <line x1={X1} y1={Y1} x2={X1} y2={Y2} stroke={BUS} strokeWidth="2.5"/>

      {/* ── Numeração dos nós ── */}
      {/* Topo: ímpares 1..19 */}
      {XS.map((x, i) => (
        <text key={`t${i}`} x={x} y={Y1 - 4} textAnchor="middle"
              fill="#28394a" fontSize="8" fontFamily="monospace">{2*i+1}</text>
      ))}
      {/* Base: pares 2..20 */}
      {XS.map((x, i) => (
        <text key={`b${i}`} x={x} y={Y2 + 13} textAnchor="middle"
              fill="#28394a" fontSize="8" fontFamily="monospace">{2*i+2}</text>
      ))}

      {/* ── Pontos de nó nos barramentos ── */}
      {XS.map((x, i) => (
        <g key={`n${i}`}>
          <circle cx={x} cy={Y1} r="3.5" fill={NODE}/>
          <circle cx={x} cy={Y2} r="3.5" fill={NODE}/>
        </g>
      ))}

      {/* ── Caixa tracejada do relé (vãos 3-7) ── */}
      <rect x={XS[3]-22} y={Y1+8} width={XS[7]-XS[3]+44} height={Y2-Y1-16}
            rx="4" fill="rgba(249,115,22,.02)"
            stroke="#253040" strokeWidth="1" strokeDasharray="5,3"/>
      <text x={XS[3]-14} y={Y1+22} fill="#253040"
            fontSize="7.5" fontFamily="monospace" letterSpacing="0.5">RELÉ</text>

      {/* ── Rail horizontal superior (CY1) ligando vãos 0-5 ── */}
      <line x1={XS[0]} y1={CY1} x2={XS[5]} y2={CY1}
            stroke={WIRE} strokeWidth="1.2" opacity="0.55"/>

      {/* ── Rail horizontal inferior (CY2) ligando vãos 3-8 ── */}
      <line x1={XS[3]} y1={CY2} x2={XS[8]} y2={CY2}
            stroke={WIRE} strokeWidth="1.2" opacity="0.55"/>

      {/* ── Rail horizontal médio (MID) ligando vãos 6-9 ── */}
      <line x1={XS[6]} y1={MID} x2={XS[9]} y2={MID}
            stroke={WIRE} strokeWidth="1.2" opacity="0.55"/>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/*  INDICADORES acima do barramento superior                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 0: BCS — retangular, laranja (alimentação OK) */}
      <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('BCS',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndS x={XS[0]} label="BCS" c2={eBCS} s={9}/></g>
      {/* 1: LM — circular amarelo (mola carregada) */}
      <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('LM',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndC x={XS[1]} label="LM"  c2={eLM}  r={12}/></g>
      {/* 2: BL — quadrado */}
      <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('BL',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndS x={XS[2]} label="BL"  c2={eBL}  s={8}/></g>
      {/* 3: BAD — quadrado */}
      <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('BAD',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndS x={XS[3]} label="BAD" c2={eBAD} s={8}/></g>
      {/* 4: BA1 — quadrado */}
      <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('BA1',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndS x={XS[4]} label="BA1" c2={eBA1} s={8}/></g>
      {/* 5: BB — quadrado */}
      <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('BB',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndS x={XS[5]} label="BB"  c2={eBB}  s={8}/></g>
      {/* 6: GL — circular vermelho (trip) */}
      <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('GL',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndC x={XS[6]} label="GL"  c2={eGL}  r={12}/></g>
      {/* 7: AP — X indicator (trip latch) */}
      <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('AP',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndAP x={XS[7]} label="AP" c2={eAP}/></g>
      {/* 8: BD1 — quadrado (52a) */}
      <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('BD1',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndS x={XS[8]} label="BD1" c2={eBD1} s={8}/></g>
      {/* 9: GT2 — quadrado (52b) */}
      <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('GT2',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}><IndS x={XS[9]} label="GT2" c2={eGT2} s={8}/></g>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/*  VÃOS (Rungs) com contatos                                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 0 — vão BCS: contato superior */}
      <Rung x={XS[0]} contacts={[{y:CY1, active:true}]}/>
      {/* 1 — vão LM: contato mola */}
      <Rung x={XS[1]} contacts={[{y:CY1, active:springLoaded}]}/>
      {/* 2 — vão BL: contato */}
      <Rung x={XS[2]} contacts={[{y:CY1, active:false}]}/>
      {/* 3 — vão BAD: dois contatos */}
      <Rung x={XS[3]} contacts={[{y:CY1, active:false},{y:CY2, active:false}]}/>
      {/* 4 — vão BA1: dois contatos */}
      <Rung x={XS[4]} contacts={[{y:CY1, active:false},{y:CY2, active:false}]}/>
      {/* 5 — vão BB: dois contatos */}
      <Rung x={XS[5]} contacts={[{y:CY1, active:false},{y:CY2, active:closed}]}/>
      {/* 6 — vão GL: contato trip */}
      <Rung x={XS[6]} contacts={[{y:MID, active:tripLatch}]}/>
      {/* 7 — vão AP: contato trip latch */}
      <Rung x={XS[7]} contacts={[{y:CY2, active:tripLatch}]}/>
      {/* 8 — vão BD1: contato 52a */}
      <Rung x={XS[8]} contacts={[{y:CY2, active:closed}]}/>
      {/* 9 — vão GT2: contato 52b */}
      <Rung x={XS[9]} contacts={[{y:MID, active:!closed}]}/>

      {/* ── Ligação horizontal extra em BB→5 (selo de fechamento) ── */}
      <line x1={XS[4]} y1={CY2} x2={XS[5]} y2={CY2}
            stroke={WIRE} strokeWidth="1.2" opacity="0.45" strokeDasharray="3,2"/>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/*  K — relé auxiliar na lateral esquerda do barramento              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <g style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter('K',e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}>
        <CoilSqLeft x={X0 - 40} y={(Y1+Y2)/2} c2={eK} label="K"/>
      </g>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/*  BOBINAS abaixo do barramento inferior (apenas 5 vãos)            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {coilDefs.map(({idx, label, c2}) => (
        <g key={label} style={{cursor:'pointer'}} onMouseEnter={e=>handleTipEnter(label,e)} onMouseMove={handleTipMove} onMouseLeave={handleTipLeave}>
          <Coil x={XS[idx]} c2={c2} label={label}/>
        </g>
      ))}

      {/* ── Vãos sem bobina: fio simples até Y2 (restantes) ── */}
      {[0,1,6,8,9].map(idx => (
        <line key={`stub${idx}`}
              x1={XS[idx]} y1={Y2} x2={XS[idx]} y2={Y2+8}
              stroke={WIRE} strokeWidth="1.2" strokeLinecap="round"/>
      ))}

      {/* ── Rodapé ── */}
      <text x={VW/2} y={VH - 6} textAnchor="middle"
            fill="#1e2d3a" fontSize="7.5" fontFamily="monospace" letterSpacing="1">
        DIAGRAMA DE COMANDO — DISJUNTOR BAY-01 — IEC 60617
      </text>
    </svg>

    {/* ── Tooltip overlay via portal (evita clip por overflow:hidden) ── */}
    {tooltip && TIPS[tooltip.key] && createPortal((() => {
      const t = TIPS[tooltip.key];
      const pw = 260, ph = 110;
      const lx = tooltip.x + 16 + pw > window.innerWidth ? tooltip.x - pw - 12 : tooltip.x + 16;
      const ly = tooltip.y + ph > window.innerHeight - 20 ? tooltip.y - ph : tooltip.y;
      return (
        <div style={{
          position:'fixed', left:lx, top:ly, zIndex:9999,
          pointerEvents:'none', maxWidth:pw,
          background:'#08111a', border:'1px solid rgba(200,212,224,.2)',
          borderRadius:10, padding:'12px 16px',
          boxShadow:'0 8px 32px rgba(0,0,0,.75)',
        }}>
          <div style={{fontSize:10,fontWeight:800,color:'#c8d4e0',fontFamily:'monospace',letterSpacing:.3,marginBottom:6,lineHeight:1.4}}>
            {t.title}
          </div>
          <div style={{fontSize:10,color:'#6a7a8a',lineHeight:1.55}}>
            {t.body}
          </div>
        </div>
      );
    })(), document.body)}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLE-LINE DIAGRAM (UNIFILAR)
// ═══════════════════════════════════════════════════════════════════════════
function Unifilar({ bkState, tripLatch, springLoaded, sys, relayReadings, injecting }) {
  const closed   = bkState === 'closed';
  const energized = closed && injecting;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!energized) return;
    const id = setInterval(() => setTick(t => (t + 1) % 200), 60);
    return () => clearInterval(id);
  }, [energized]);

  const priV  = sys?.tp?.priV  ?? 13800;
  const secV  = sys?.tp?.secV  ?? 115;
  const priA  = sys?.tc?.priA  ?? 600;
  const secA  = sys?.tc?.secA  ?? 5;
  const Ia    = relayReadings?.currents?.Ia?.mag ?? 0;
  const Va    = relayReadings?.voltages?.Va?.mag ?? 0;
  const Ia_pri = energized ? Ia * (priA / secA) : 0;
  const Va_pri = energized ? Va * (priV / secV) : 0;

  const wire = energized ? '#22c55e' : closed ? '#3d5060' : '#253040';
  const wireW = energized ? 2.5 : 1.5;
  const glow  = energized ? 'drop-shadow(0 0 4px rgba(34,197,94,.6))' : 'none';

  const NUM_P = 8;
  const particles = Array.from({ length: NUM_P }, (_, i) => {
    const base = (i / NUM_P);
    return (base + tick * 0.007) % 1.0;
  });

  const VW = 760, VH = 440;
  const CY = VH / 2;
  const X0 = 50, X1 = 710;
  const busSegments = [
    { x1: X0+40, x2: 170 },
    { x1: 230,   x2: 330 },
    { x1: 390,   x2: 490 },
    { x1: 550,   x2: X1-20 },
  ];

  const LBox = ({ x, y, title, val, unit, color }) => (
    <g>
      <rect x={x-36} y={y-22} width="72" height="44" rx="5"
            fill="#1a2232" stroke={energized?'rgba(34,197,94,.25)':'rgba(255,255,255,.06)'} strokeWidth="1"/>
      <text x={x} y={y-8} textAnchor="middle" fill="#5a7080" fontSize="7.5" fontFamily="monospace" fontWeight="600" letterSpacing="0.5">{title}</text>
      <text x={x} y={y+8} textAnchor="middle" fill={color||'#9ab0c8'} fontSize="12" fontFamily="monospace" fontWeight="700">{val}</text>
      {unit && <text x={x} y={y+20} textAnchor="middle" fill="#3d5060" fontSize="7" fontFamily="monospace">{unit}</text>}
    </g>
  );

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} xmlns="http://www.w3.org/2000/svg"
         style={{width:'100%',height:'100%'}} preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,.025)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width={VW} height={VH} fill="url(#grid)" opacity="0.7"/>
      <text x={VW/2} y="20" textAnchor="middle" fill="#253040" fontSize="9" fontFamily="monospace" letterSpacing="2" fontWeight="700">
        DIAGRAMA UNIFILAR — BAY-01 — {priV/1000} kV / {secV} V
      </text>
      <g transform={`translate(${X0},${CY})`}>
        <circle cx="0" cy="0" r="26" fill="#182030" stroke={wire} strokeWidth={wireW} filter={glow}/>
        <text x="0" y="-8" textAnchor="middle" fill={energized?'#22c55e':'#3d5060'} fontSize="10" fontWeight="700" fontFamily="monospace">~</text>
        <text x="0" y="8" textAnchor="middle" fill={energized?'#22c55e':'#3d5060'} fontSize="7" fontFamily="monospace">3φ</text>
        <text x="0" y="42" textAnchor="middle" fill="#3d5060" fontSize="7.5" fontFamily="monospace">FONTE</text>
        <text x="0" y="-36" textAnchor="middle" fill={energized?'var(--amber)':'#3d5060'} fontSize="9" fontFamily="monospace" fontWeight="700">
          {energized ? `${(Va_pri/1000).toFixed(1)} kV` : `${(priV/1000).toFixed(1)} kV`}
        </text>
      </g>
      {busSegments.map((seg, i) => (
        <line key={i} x1={seg.x1} y1={CY} x2={seg.x2} y2={CY}
              stroke={wire} strokeWidth={wireW} filter={glow} strokeLinecap="round"/>
      ))}
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
      <g transform={`translate(200,${CY})`}>
        <circle cx="0" cy="-14" r="16" fill="#182030" stroke={wire} strokeWidth={wireW} filter={glow}/>
        <circle cx="0" cy="14" r="16" fill="#182030" stroke={wire} strokeWidth={wireW} filter={glow}/>
        <rect x="-18" y="-2" width="36" height="4" rx="2" fill={wire} opacity="0.7"/>
        <text x="0" y="48" textAnchor="middle" fill="#3d5060" fontSize="7.5" fontFamily="monospace">TC</text>
        <text x="0" y="60" textAnchor="middle" fill="#2d3d50" fontSize="6.5" fontFamily="monospace">{priA}/{secA} A</text>
        <LBox x="0" y={-70} title="Ia PRIMARY" val={energized ? `${Ia_pri.toFixed(1)}` : '—'} unit="A" color={energized?'#22c55e':'#2d3d50'}/>
      </g>
      <g transform={`translate(360,${CY})`}>
        <circle cx="0" cy="-14" r="16" fill="#182030" stroke={wire} strokeWidth={wireW} filter={glow}/>
        <circle cx="0" cy="14" r="16" fill="#182030" stroke={wire} strokeWidth={wireW} filter={glow}/>
        <rect x="-18" y="-2" width="36" height="4" rx="2" fill={wire} opacity="0.7"/>
        <text x="0" y="48" textAnchor="middle" fill="#3d5060" fontSize="7.5" fontFamily="monospace">TP</text>
        <text x="0" y="60" textAnchor="middle" fill="#2d3d50" fontSize="6.5" fontFamily="monospace">{(priV/1000).toFixed(1)}k/{secV} V</text>
        <LBox x="0" y={-70} title="Va PRIMARY" val={energized ? `${(Va_pri/1000).toFixed(2)}` : '—'} unit="kV" color={energized?'var(--amber)':'#2d3d50'}/>
      </g>
      <g transform={`translate(520,${CY})`}>
        <rect x="-22" y="-22" width="44" height="44" rx="5"
              fill={closed?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)'}
              stroke={closed?'#22c55e':tripLatch?'#ef4444':'#dc2626'}
              strokeWidth={closed?2:1.5}
              filter={closed?'drop-shadow(0 0 6px rgba(34,197,94,.4))':'drop-shadow(0 0 4px rgba(239,68,68,.3))'}/>
        {closed
          ? <line x1="-14" y1="0" x2="14" y2="0" stroke="#22c55e" strokeWidth="3" strokeLinecap="round"/>
          : <line x1="-6" y1="-14" x2="10" y2="0" stroke="#f87171" strokeWidth="3" strokeLinecap="round" transform="rotate(-30)"/>
        }
        <text x="0" y="38" textAnchor="middle"
              fill={closed?'#22c55e':tripLatch?'#ef4444':'#f87171'}
              fontSize="9" fontFamily="monospace" fontWeight="700">
          {closed?'FECHADO':tripLatch?'TRIP':'ABERTO'}
        </text>
        <text x="0" y="50" textAnchor="middle" fill="#2d3d50" fontSize="7" fontFamily="monospace">52</text>
      </g>
      <g transform={`translate(${X1},${CY})`}>
        <rect x="-20" y="-20" width="40" height="40" rx="4"
              fill={energized?'rgba(125,211,252,.08)':'#182030'}
              stroke={energized?'#7dd3fc':'#253040'} strokeWidth="1.5"
              filter={energized?'drop-shadow(0 0 5px rgba(125,211,252,.4))':'none'}/>
        <text x="0" y="5" textAnchor="middle" fill={energized?'#7dd3fc':'#3d5060'} fontSize="11" fontFamily="monospace">Z</text>
        <text x="0" y="36" textAnchor="middle" fill="#3d5060" fontSize="7.5" fontFamily="monospace">CARGA</text>
        <LBox x="0" y={-70} title="P ATIVA" val={energized ? `${(Va_pri*Ia_pri*Math.sqrt(3)/1e6).toFixed(2)}` : '—'} unit="MVA" color={energized?'#7dd3fc':'#2d3d50'}/>
      </g>
      <g transform={`translate(12,${VH-28})`}>
        <circle cx="6" cy="6" r="4" fill={energized?'#22c55e':'#2d3d50'}/>
        <text x="16" y="10" fill={energized?'#22c55e':'#3d5060'} fontSize="7.5" fontFamily="monospace">
          {energized?'ENERGIZADO — corrente fluindo':'DESENERGIZADO'}
        </text>
      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const SPRING_TICK_MS = 100;
const SPRING_INC_PCT = 1.37;

export default function PainelPage({
  onBreakerChange,
  relayTrip    = false,
  resetSignal  = 0,
  closeSignal  = 0,
  openSignal   = 0,
  sys          = null,
  relayReadings = null,
  injecting    = false,
}) {
  const [bkState,      setBkState]      = useState('open');
  const [springLoaded, setSpringLoaded] = useState(true);
  const [springPct,    setSpringPct]    = useState(100);
  const [opCount,      setOpCount]      = useState(0);
  const [tripLatch,    setTripLatch]    = useState(false);
  const [rightTab,     setRightTab]     = useState('cmd');

  const timerRef = useRef(null);
  const bkRef    = useRef(bkState);
  bkRef.current  = bkState;

  const audioCtxRef = useRef(null);
  const soundBufsRef = useRef({});

  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;
    const load = async (name, url) => {
      try {
        const r = await fetch(url);
        const ab = await r.arrayBuffer();
        soundBufsRef.current[name] = await ctx.decodeAudioData(ab);
      } catch(e) {}
    };
    load('abrir', '/sounds/abrir.mp3');
    load('fechar', '/sounds/fechar.mp3');
    load('mola', '/sounds/mola.mp3');
    return () => { ctx.close(); };
  }, []);

  const playSound = useCallback((name) => {
    const ctx = audioCtxRef.current;
    const buf = soundBufsRef.current[name];
    if (!ctx || !buf) return;
    if (ctx.state === 'suspended') ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  }, []);

  useEffect(() => {
    if (springLoaded) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setSpringPct(prev => {
        const next = Math.min(prev + SPRING_INC_PCT, 100);
        if (next >= 100) { clearInterval(timerRef.current); setSpringLoaded(true); }
        return next;
      });
    }, SPRING_TICK_MS);
    return () => clearInterval(timerRef.current);
  }, [springLoaded]);

  useEffect(() => {
    if (relayTrip && bkRef.current === 'closed') doTrip();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relayTrip]);

  useEffect(() => {
    if (resetSignal > 0) doResetTrip();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  useEffect(() => {
    if (closeSignal > 0) doClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeSignal]);

  useEffect(() => {
    if (openSignal > 0) doOpen();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal]);

  useEffect(() => {
    onBreakerChange?.(bkState, springLoaded, tripLatch);
  }, [bkState, springLoaded, tripLatch, onBreakerChange]);

  const startSpring = useCallback(() => {
    setSpringLoaded(false);
    setSpringPct(0);
    playSound('mola');
  }, [playSound]);

  const doClose = useCallback(() => {
    if (bkRef.current !== 'open' || !springLoaded) return;
    playSound('fechar');
    setBkState('closing');
    setTimeout(() => { setBkState('closed'); setOpCount(n => n+1); startSpring(); }, 300);
  }, [springLoaded, startSpring, playSound]);

  const doOpen = useCallback(() => {
    if (bkRef.current !== 'closed') return;
    playSound('abrir');
    setBkState('opening'); setTripLatch(false);
    setTimeout(() => { setBkState('open'); setOpCount(n => n+1); }, 220);
  }, [playSound]);

  const doTrip = useCallback(() => {
    if (bkRef.current !== 'closed') return;
    playSound('abrir');
    setTripLatch(true); setBkState('tripping');
    setTimeout(() => { setBkState('open'); setOpCount(n => n+1); }, 140);
  }, [playSound]);  

  const doResetTrip = useCallback(() => {
    if (bkRef.current === 'open') setTripLatch(false);
  }, []);

  const isClosed = bkState === 'closed';
  const isOpen   = bkState === 'open';
  const isBusy   = bkState === 'closing' || bkState === 'opening' || bkState === 'tripping';

  const estadoLabel = isClosed ? 'Fechado'
    : bkState==='closing'  ? 'Fechando...'
    : bkState==='tripping' ? 'Disparando...'
    : bkState==='opening'  ? 'Abrindo...'
    : 'Aberto';

  const estadoClass = isClosed ? 'ps-green'
    : (isOpen && tripLatch) ? 'ps-red'
    : 'ps-amber';

  return (
    <>
      <style>{S}</style>
      <div className="painel-pg">

        <div className="painel-main">

          {/* ── ESQUERDA: Disjuntor ── */}
          <div className="painel-bk">
            <div className="ph">
              <div className="bar bar-sky"/>
              <span className="ph-t">Disjuntor</span>
            </div>
            <div className="painel-bk-body">
              <div className="painel-bk-svg">
                <BreakerSVG bkState={bkState} springLoaded={springLoaded} tripLatch={tripLatch}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:5,width:'100%'}}>
                {isOpen && !isBusy && (
                  <button className="bk-close-btn" disabled={!springLoaded}
                          title={!springLoaded?'Aguardando mola carregar...':'Fechar disjuntor'}
                          onClick={doClose}>
                    I&nbsp;&nbsp;Fechar
                  </button>
                )}
                {isClosed && !isBusy && (
                  <button className="bk-open-btn" onClick={doOpen}>0&nbsp;&nbsp;Abrir</button>
                )}
                {isOpen && tripLatch && !isBusy && (
                  <button className="bk-reset-btn" onClick={doResetTrip}>↺&nbsp;&nbsp;Reset Trip</button>
                )}
                {isBusy && (
                  <div className="bk-busy">
                    {bkState==='closing'?'Fechando...':bkState==='tripping'?'Disparando...':'Abrindo...'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── DIREITA: Diagramas com abas ── */}
          <div className="painel-right">
            <div className="ph">
              <div className="bar bar-lav"/>
              <span className="ph-t">Diagramas</span>
            </div>

            <div className="painel-right-body">
              <div className="painel-tab-row">
                <button className={`pt ${rightTab==='cmd'?'on':''}`} onClick={()=>setRightTab('cmd')}>
                  Comando
                </button>
                <button className={`pt ${rightTab==='uni'?'on':''}`} onClick={()=>setRightTab('uni')}>
                  Unifilar
                </button>
              </div>

              <div className="painel-tab-content">
                {rightTab==='cmd' && (
                  <CommandDiagram
                    bkState={bkState}
                    springLoaded={springLoaded}
                    tripLatch={tripLatch}
                  />
                )}
                {rightTab==='uni' && (
                  <Unifilar
                    bkState={bkState}
                    tripLatch={tripLatch}
                    springLoaded={springLoaded}
                    sys={sys}
                    relayReadings={relayReadings}
                    injecting={injecting}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Barra de status ── */}
        <div className="painel-status">
          <div className="ps-item">
            <div className="ps-lbl">Estado</div>
            <div className={`ps-val ${estadoClass}`}>{estadoLabel}</div>
          </div>
          <div className="ps-item ps-wide">
            <div className="ps-lbl">Mola</div>
            <div className="ps-mola-bar">
              <div className={`ps-mola-fill ${springLoaded?'ps-mola-loaded':'ps-mola-chg'}`}
                   style={{width:`${springPct}%`}}/>
            </div>
            <div className={`ps-val ${springLoaded?'ps-amber':'ps-mono'}`}
                 style={{fontSize:springLoaded?15:12}}>
              {springLoaded?'Carregada':'Carregando...'}
            </div>
          </div>
          <div className="ps-item">
            <div className="ps-lbl">Operações</div>
            <div className="ps-val ps-mono">{opCount}</div>
          </div>
        </div>

      </div>
    </>
  );
}
