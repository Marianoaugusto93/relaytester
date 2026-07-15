import { buildFaultPhasors, buildPrefaultPhasors } from './testUtils.js';
import { evaluate } from './PassFailEvaluator.js';
import { soeEvent, soePush, SOE_TYPES } from '../soe.js';

const INTER_POINT_DELAY_MS = 3000;
const POINT_TIMEOUT_MS = 60000;
const SHOT_DELAY_MS = 800; // folga entre repetições (shots) do mesmo ponto

/**
 * Agrega os tempos medidos de N shots de um mesmo ponto.
 * @param {Array<number|null>} shotTimes - tempos por shot (null = sem trip)
 * @returns {{tAvg:number|null,tMin:number|null,tMax:number|null,tScatterPct:number|null,nValid:number,nTotal:number}}
 */
export function aggregateShots(shotTimes) {
  const valid = (shotTimes || []).filter(t => t != null && Number.isFinite(t));
  const nTotal = (shotTimes || []).length;
  if (!valid.length) return { tAvg: null, tMin: null, tMax: null, tScatterPct: null, nValid: 0, nTotal };
  const tAvg = valid.reduce((a, b) => a + b, 0) / valid.length;
  const tMin = Math.min(...valid);
  const tMax = Math.max(...valid);
  const tScatterPct = tAvg > 0 ? ((tMax - tMin) / tAvg) * 100 : 0;
  return { tAvg, tMin, tMax, tScatterPct, nValid: valid.length, nTotal };
}

/**
 * Run a test campaign sequentially through all test.points.
 *
 * ctx shape:
 *   cancelled: { current: boolean }
 *   paused:    { current: boolean }
 *   onStart:   (pointIndex, point) => void
 *   onResult:  (pointIndex, point, result) => void
 *   onComplete:(results) => void
 *   runSim:    () => void
 *   stopSim:   () => void
 *   setPhasors:(phasors) => void  — sets App.jsx p state
 *   setPfEnabled:(bool) => void
 *   setPfDuration:(secs) => void
 *   subscribe:  (handler) => unsubscribe  — receives {tripTime, stages}|null on trip/stop
 *   sys:       system object (for buildFaultPhasors)
 */
export async function runCampaign(test, ctx) {
  const {
    cancelled, paused,
    onStart, onBeforeInjection, onResult, onComplete,
    runSim, stopSim,
    setPhasors, setPf, setPfEnabled, setPfDuration,
    subscribe, setEvts, sys, relayProt,
  } = ctx;

  const results = [];

  for (let i = 0; i < test.points.length; i++) {
    // Check cancel
    if (cancelled.current) break;

    // Wait while paused
    while (paused.current && !cancelled.current) {
      await sleep(200);
    }
    if (cancelled.current) break;

    const point = test.points[i];
    onStart?.(i, point);

    if (setEvts) {
      setEvts(ev => soePush(ev || [], soeEvent({ type: SOE_TYPES.INJ_START, icon: '▶', text: `Teste ${test.fn} ponto ${i+1}/${test.points.length}`, dt: '' })));
    }

    // Build phasors for this point
    const faultPhasors = buildFaultPhasors(point, sys || {}, test.fn || '51');
    const prefaultPhasors = buildPrefaultPhasors(point, sys || {});

    console.log(`[Test ${i+1}] Point:`, point.id, 'fn:', test.fn, 'IxIpk:', point.IxIpk, 'tExpected:', point.tExpected, 'Iamps:', point.Iamps);
    console.log(`  Phasors:`, faultPhasors.currents.Ia, faultPhasors.voltages.Va);

    // Para 81R (df/dt), o relé não responde a fasores: injeta-se o dfdt do ponto
    // como override de proteção (mesma estratégia dos fasores por argumento).
    const protOverride = (test.fn === '81R' && relayProt && relayProt['81R'])
      ? { ...relayProt, '81R': { ...relayProt['81R'], inj81r: { dfdt: point.dfdt ?? 0 } } }
      : undefined;

    // ── Shots: repete a injeção N vezes e agrega (Leva 3) ────────────────────
    const shotsN = Math.max(1, Math.round(test.planConfig?.shots || 1));
    const shotTimes = [];

    for (let s = 0; s < shotsN; s++) {
      if (cancelled.current) break;
      while (paused.current && !cancelled.current) await sleep(200);
      if (cancelled.current) break;

      if (setEvts && shotsN > 1) {
        setEvts(ev => soePush(ev || [], soeEvent({ type: SOE_TYPES.INJ_START, icon: '●', text: `  shot ${s + 1}/${shotsN}`, dt: '' })));
      }

      // Apply pre-fault settings
      const hasPrefault = point.prefaultDur > 0;
      if (hasPrefault) {
        setPf(prefaultPhasors);
        setPfEnabled(true);
        setPfDuration(point.prefaultDur || 0.2);
        await sleep(point.prefaultDur * 1000 + 100);
      } else {
        setPfEnabled(false);
        setPfDuration(0.2);
      }

      // Update global phasors state so medidores (meters) display correct values
      setPhasors(faultPhasors);

      // Run simulation and wait for trip or timeout
      const tripPromise = new Promise(resolve => {
        let unsub;
        const handler = (evt) => {
          if (evt && evt.tripTime != null && Array.isArray(evt.stages) &&
              evt.stages.length > 0 && evt.stages[0] !== 'SNAPSHOT') {
            unsub?.();
            resolve(evt);
          }
        };
        unsub = subscribe?.(handler) || (() => {});
        setTimeout(() => { unsub?.(); resolve(null); }, POINT_TIMEOUT_MS);
      });

      // Reset elapsed timer right before injection starts
      onBeforeInjection?.();
      runSim(faultPhasors, protOverride);
      const tripResult = await tripPromise;
      stopSim();

      shotTimes.push(tripResult ? tripResult.tripTime : null);
      console.log(`[Test ${i+1}] shot ${s+1}/${shotsN} →`, tripResult ? tripResult.tripTime : 'no-trip');

      if (s < shotsN - 1 && !cancelled.current) await sleep(SHOT_DELAY_MS);
    }

    // Agrega os shots e avalia (pass/fail sobre a média)
    const agg = aggregateShots(shotTimes);
    const measured = { tMeasured: agg.tAvg, tripDetected: agg.nValid > 0, shots: shotTimes };

    const evalResult = evaluate(test.fn || '51', point, measured);
    const result = {
      ...point,
      ...evalResult,
      tMeasured: agg.tAvg,
      tMin: agg.tMin,
      tMax: agg.tMax,
      tScatterPct: agg.tScatterPct,
      shots: shotTimes,
      shotsN,
      pointIndex: i,
      completedAt: Date.now(),
    };

    if (setEvts) {
      setEvts(ev => soePush(ev || [], soeEvent({ type: evalResult.pass ? SOE_TYPES.INFO : SOE_TYPES.WARN, icon: evalResult.pass ? '✓' : '✗', text: `Ponto ${i+1} ${evalResult.pass ? 'PASSOU' : 'FALHOU'}: ${evalResult.failReason || ''}`, dt: '' })));
    }

    results.push(result);
    onResult?.(i, point, result);

    // Inter-point delay (skip after last point)
    if (i < test.points.length - 1 && !cancelled.current) {
      await waitInterruptible(INTER_POINT_DELAY_MS, cancelled, paused);
    }
  }

  onComplete?.(results);
  return results;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitInterruptible(ms, cancelled, paused) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (cancelled.current) return;
    while (paused.current && !cancelled.current) await sleep(100);
    await sleep(100);
  }
}

export const TestRunnerEngine = { runCampaign };
