import { useState, useEffect, useCallback, useRef } from "react";
import WaveformDisplay from "./WaveformDisplay.jsx";
import BreakerCard from "./painel/BreakerCard.jsx";
import CommandDiagram from "./painel/CommandDiagram.jsx";
import UnifilarDiagram from "./painel/UnifilarDiagram.jsx";

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
  phasors      = null,
  tripHistory  = [],
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

  const audioCtxRef  = useRef(null);
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
    load('abrir',  '/sounds/abrir.mp3');
    load('fechar', '/sounds/fechar.mp3');
    load('mola',   '/sounds/mola.mp3');
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

  // ── KPI strip derived values ──────────────────────────────────────────────
  const estadoLabel = isClosed ? 'Fechado'
    : bkState === 'closing'  ? 'Fechando'
    : bkState === 'tripping' ? 'Disparando'
    : bkState === 'opening'  ? 'Abrindo'
    : 'Aberto';

  const estadoClass = isClosed
    ? 'kv-green'
    : (isOpen && tripLatch) ? 'kv-red'
    : 'kv-amber';

  const molaClass = springLoaded ? 'kv-amber' : 'kv-mono';
  const molaLabel = springLoaded ? 'Carregada' : `${Math.round(springPct)}%`;

  const lastTrip   = tripHistory.length > 0 ? tripHistory[tripHistory.length - 1] : null;
  const lastTripTs = (() => {
    if (!lastTrip || !lastTrip.timestamp) return '—';
    try {
      // Parse formato DD:MM:YYYY-HH:MM:SS.mmm
      const parts = lastTrip.timestamp.split('-');
      if (parts.length !== 2) return '—';
      const datePart = parts[0].split(':'); // [DD, MM, YYYY]
      const timePart = parts[1].split(':'); // [HH, MM, SS.mmm]
      if (datePart.length !== 3 || timePart.length !== 3) return '—';

      const day = parseInt(datePart[0], 10);
      const month = parseInt(datePart[1], 10) - 1;
      const year = parseInt(datePart[2], 10);
      const hour = parseInt(timePart[0], 10);
      const min = parseInt(timePart[1], 10);
      const secMs = timePart[2].split('.');
      const sec = parseInt(secMs[0], 10);
      const ms = parseInt((secMs[1] || '0').padEnd(3, '0'), 10);

      const ts = new Date(year, month, day, hour, min, sec, ms).getTime();
      if (isNaN(ts)) return '—';

      const now = Date.now();
      const diffMs = Math.abs(now - ts); // Usar valor absoluto em caso de clock skew
      if (diffMs < 5000) return 'agora';
      if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s`;
      if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m`;
      return `${Math.floor(diffMs / 3600000)}h`;
    } catch (e) {
      console.warn('Erro ao parsear timestamp:', lastTrip.timestamp, e);
      return '—';
    }
  })();
  const lastTripReason = lastTrip?.stages?.[0] ?? (lastTrip ? '—' : '—');
  const lastTripCmd    = lastTrip ? 'Relé · BO1' : '—';

  return (
    <div className="painel-pg">

      <div className="painel-main">

        {/* ── ESQUERDA: BreakerCard ── */}
        <div className="painel-bk">
          <div className="ph">
            <div className="bar bar-sky"/>
            <span className="ph-t">Disjuntor</span>
          </div>
          <BreakerCard
            bkState={bkState}
            springLoaded={springLoaded}
            tripLatch={tripLatch}
            springPct={springPct}
            opCount={opCount}
            onOpen={doOpen}
            onClose={doClose}
            onResetTrip={doResetTrip}
          />
        </div>

        {/* ── DIREITA: Diagramas com abas ── */}
        <div className="painel-right">
          {/* Header com título + tabs como segmented control à direita */}
          <div className="ph painel-tab-row">
            <div className="bar bar-lav"/>
            <span className="ph-t">DIAGRAMAS</span>
            <div className="cmd-tabs-right">
              <button
                className={`cmd-tab-btn${rightTab === 'cmd'  ? ' active' : ''}`}
                onClick={() => setRightTab('cmd')}
              >
                Comando
              </button>
              <button
                className={`cmd-tab-btn${rightTab === 'uni'  ? ' active' : ''}`}
                onClick={() => setRightTab('uni')}
              >
                Unifilar
              </button>
            </div>
          </div>

          <div className="painel-right-body">
            <div className="painel-tab-content"
                 style={rightTab === 'onda' ? { padding: 0, overflow: 'hidden' } : {}}>
              {rightTab === 'cmd' && (
                <CommandDiagram
                  bkState={bkState}
                  springLoaded={springLoaded}
                  tripLatch={tripLatch}
                />
              )}
              {rightTab === 'uni' && (
                <UnifilarDiagram
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

      {/* ── KPI Strip — 8 colunas ── */}
      <div className="kpi-strip">
        <div className="kpi-cell">
          <div className="kpi-lbl">Estado</div>
          <div className={`kpi-val ${estadoClass}`}>{estadoLabel}</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-lbl">Mola</div>
          <div className={`kpi-val ${molaClass}`}>{molaLabel}</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-lbl">Operações</div>
          <div className="kpi-val kv-mono">{opCount}</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-lbl">Último Trip</div>
          <div className="kpi-val kv-mono" style={{ fontSize: 11 }}>{lastTripTs}</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-lbl">Causa</div>
          <div className="kpi-val kv-red" style={{ fontSize: 13 }}>{lastTripReason}</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-lbl">Comando Por</div>
          <div className="kpi-val kv-mono" style={{ fontSize: 11 }}>{lastTripCmd}</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-lbl">79 Shots</div>
          <div className="kpi-val kv-cyan">0/3</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-lbl">Bay</div>
          <div className="kpi-val kv-mono" style={{ fontSize: 13 }}>BAY-01</div>
        </div>
      </div>

    </div>
  );
}
