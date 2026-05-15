import { useState, useRef, useCallback, useEffect } from 'react';
import TestPlanner from './tests/TestPlanner.jsx';
import TestRunner from './tests/TestRunner.jsx';
import TestReport from './tests/TestReport.jsx';
import { runCampaign } from './tests/TestRunnerEngine.js';

// Default campaign meta
const DEFAULT_CAMPAIGN = {
  name: 'Comissionamento Bay-01',
  relay: 'REGRID PRO 1000',
  bay: 'BAY-01',
};

// localStorage persistence key
const LS_KEY = 'relayTester.campaigns';

function loadCampaigns() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCampaigns(list) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {}
}

const MODES = ['plan', 'run', 'report'];
const MODE_LABELS = { plan: 'Plano', run: 'Execucao', report: 'Relatorio' };

export default function TestsPage({
  prot, relayProt, sys,
  rtc, rtp,
  runSim, stopSim,
  setP, setPf, setEvts,
  setPfEnabled, setPfDuration,
  tripHistory,
}) {
  const [mode, setMode] = useState('plan');
  const [campaign] = useState(DEFAULT_CAMPAIGN);

  // Current test plan (fn + stage + planConfig + points)
  const [test, setTest] = useState(null);

  // Runner state
  const [runResults, setRunResults] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [elapsed, setElapsed] = useState(0);
  const [ss, setSs] = useState('idle');
  const [isPaused, setIsPaused] = useState(false);

  // Final report results
  const [reportResults, setReportResults] = useState([]);

  // Engine control refs
  const cancelledRef = useRef(false);
  const pausedRef = useRef(false);
  const tripSubscribersRef = useRef([]);
  const elapsedTimerRef = useRef(null);
  const lastDispatchedIdRef = useRef(null);

  // Subscribe to trip events from App simulation
  // (In production this would hook into App's trip event bus;
  //  here we expose a subscribe fn the engine calls)
  const subscribe = useCallback((handler) => {
    tripSubscribersRef.current.push(handler);
    return () => {
      tripSubscribersRef.current = tripSubscribersRef.current.filter(h => h !== handler);
    };
  }, []);

  // Wire tripHistory changes → dispatch to engine trip subscribers (idempotent)
  useEffect(() => {
    if (tripHistory && tripHistory.length > 0) {
      const t = tripHistory[0];
      // Reject snapshots, records missing tripTime, and duplicates
      if (t.tripTime == null || !Array.isArray(t.stages) || t.stages[0] === 'SNAPSHOT') {
        return;
      }
      // Build identity with timestamp fallback and array length as salt to prevent collisions
      const identity = `${t.timestamp ?? 'noTs'}-${t.tripTime}-${t.stages.join(',')}-${tripHistory.length}`;
      if (lastDispatchedIdRef.current === identity) {
        return; // Already dispatched this record
      }
      lastDispatchedIdRef.current = identity;
      console.log('[TestsPage] Trip detected, notifying subscribers:', { tripTime: t.tripTime, stages: t.stages });
      tripSubscribersRef.current.forEach(h => h({ tripTime: t.tripTime, stages: t.stages }));
    }
  }, [tripHistory]);

  const handleTestChange = useCallback((newTest) => {
    setTest(newTest);
    // Debounced save to localStorage
    const campaigns = loadCampaigns();
    const updated = [{ campaign, test: newTest, savedAt: Date.now() }, ...campaigns.slice(0, 49)];
    saveCampaigns(updated);
  }, [campaign]);

  const startElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    const start = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
    }, 50);
  }, []);

  const stopElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  const handleStartRun = useCallback(async () => {
    if (!test || !test.points?.length) return;

    cancelledRef.current = false;
    pausedRef.current = false;
    lastDispatchedIdRef.current = null;
    setRunResults([]);
    setCurrentIdx(-1);
    setElapsed(0);
    setIsPaused(false);
    setSs('running');
    setMode('run');

    const ctx = {
      cancelled: cancelledRef,
      paused: pausedRef,
      sys,
      subscribe,
      runSim,
      stopSim,
      setPhasors: (phasors) => setP(phasors),
      setPf: (phasors) => setPf(phasors),
      setPfEnabled: (v) => setPfEnabled?.(v),
      setPfDuration: (v) => setPfDuration?.(v),
      setEvts,
      onStart: (idx) => {
        setCurrentIdx(idx);
        setElapsed(0);
        startElapsedTimer();
      },
      onResult: (idx, point, result) => {
        stopElapsedTimer();
        setRunResults(prev => [...prev, result]);
      },
      onComplete: (results) => {
        stopElapsedTimer();
        setSs('idle');
        setCurrentIdx(-1);
        setReportResults(results);
        setMode('report');
      },
    };

    await runCampaign(test, ctx);
  }, [test, sys, subscribe, runSim, stopSim, setP, setPf, setPfEnabled, setPfDuration, setEvts, startElapsedTimer, stopElapsedTimer]);

  const handlePause = useCallback(() => {
    const next = !isPaused;
    pausedRef.current = next;
    setIsPaused(next);
    if (next) stopElapsedTimer();
    else startElapsedTimer();
  }, [isPaused, stopElapsedTimer, startElapsedTimer]);

  const handleStop = useCallback(() => {
    cancelledRef.current = true;
    stopSim();
    stopElapsedTimer();
    setSs('idle');
    setIsPaused(false);
    setCurrentIdx(-1);
    if (runResults.length > 0) {
      setReportResults(runResults);
      setMode('report');
    } else {
      setMode('plan');
    }
  }, [stopSim, stopElapsedTimer, runResults]);

  const handleRepeat = useCallback(() => {
    setMode('plan');
    setRunResults([]);
    setCurrentIdx(-1);
    setElapsed(0);
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Header: mode segmented control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 14px', background: 'var(--card)',
        borderBottom: '1px solid var(--bdr)', flexShrink: 0 }}>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx2)',
          fontFamily: 'var(--fh)', letterSpacing: 1, textTransform: 'uppercase' }}>
          Test Planner
        </div>

        {/* Segmented control */}
        <div style={{ display: 'flex', background: 'var(--card2)', borderRadius: 8,
          padding: 3, gap: 2 }}>
          {MODES.map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ padding: '5px 16px', borderRadius: 6, border: 'none',
                background: mode === m ? 'var(--orange)' : 'transparent',
                color: mode === m ? '#0e1015' : 'var(--tx3)',
                fontSize: 10, fontWeight: 800, fontFamily: 'var(--fh)',
                letterSpacing: 1.3, textTransform: 'uppercase', cursor: 'pointer',
                transition: 'all .15s' }}>
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Campaign info */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>
            {campaign.name}
          </span>
          {test && (
            <span style={{ padding: '2px 8px', borderRadius: 10, background: 'var(--orange-dim)',
              color: 'var(--orange)', fontSize: 9, fontWeight: 700, fontFamily: 'var(--fm)' }}>
              {test.fn} · {test.points?.length || 0} pts
            </span>
          )}
          {mode === 'run' && (
            <span style={{ padding: '2px 8px', borderRadius: 10,
              background: ss === 'running' ? 'rgba(74,222,128,.12)' : 'rgba(92,99,112,.15)',
              color: ss === 'running' ? 'var(--green)' : 'var(--tx3)',
              fontSize: 9, fontWeight: 700, fontFamily: 'var(--fm)' }}>
              {isPaused ? 'PAUSADO' : ss === 'running' ? 'RODANDO' : 'OCIOSO'}
            </span>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {mode === 'plan' && (
          <TestPlanner
            campaign={campaign}
            test={test}
            prot={relayProt}
            onTestChange={handleTestChange}
            onStartRun={handleStartRun}
          />
        )}

        {mode === 'run' && (
          <TestRunner
            test={test}
            results={runResults}
            currentIdx={currentIdx}
            elapsed={elapsed}
            ss={ss}
            isPaused={isPaused}
            boStatus={{}}
            ci={{}}
            vi={{}}
            onPause={handlePause}
            onStop={handleStop}
            onRepeat={handleRepeat}
          />
        )}

        {mode === 'report' && (
          <TestReport
            campaign={campaign}
            test={test}
            results={reportResults}
            onBackToPlan={() => setMode('plan')}
          />
        )}
      </div>
    </div>
  );
}
