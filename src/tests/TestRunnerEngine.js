import { buildFaultPhasors, buildPrefaultPhasors } from './testUtils.js';
import { evaluate } from './PassFailEvaluator.js';

const INTER_POINT_DELAY_MS = 3000;
const POINT_TIMEOUT_MS = 60000;

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
      setEvts(ev => [{
        time: new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        icon: '▶',
        text: `Teste ${test.fn} ponto ${i+1}/${test.points.length}`,
        dt: ''
      }, ...(ev || []).slice(0, 49)]);
    }

    // Build phasors for this point
    const faultPhasors = buildFaultPhasors(point, sys || {}, test.fn || '51');
    const prefaultPhasors = buildPrefaultPhasors(point, sys || {});

    console.log(`[Test ${i+1}] Point:`, point.id, 'fn:', test.fn, 'IxIpk:', point.IxIpk, 'tExpected:', point.tExpected, 'Iamps:', point.Iamps);
    console.log(`  Phasors:`, faultPhasors.currents.Ia, faultPhasors.voltages.Va);

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
    let tripResult = null;
    const tripPromise = new Promise(resolve => {
      let unsub;
      const handler = (evt) => {
        // Defense-in-depth: reject invalid shapes, snapshots, and undefined times
        if (evt && evt.tripTime != null && Array.isArray(evt.stages) &&
            evt.stages.length > 0 && evt.stages[0] !== 'SNAPSHOT') {
          unsub?.();
          resolve(evt);
        }
      };
      unsub = subscribe?.(handler) || (() => {});
      // Also set timeout
      setTimeout(() => { unsub?.(); resolve(null); }, POINT_TIMEOUT_MS);
    });

    // Reset elapsed timer right before injection starts
    onBeforeInjection?.();

    // Pass fault phasors directly to runSim (avoid async setState timing issue).
    // Para 81R (df/dt), o relé não responde a fasores: injeta-se o dfdt do ponto
    // como override de proteção (mesma estratégia dos fasores por argumento).
    const protOverride = (test.fn === '81R' && relayProt && relayProt['81R'])
      ? { ...relayProt, '81R': { ...relayProt['81R'], inj81r: { dfdt: point.dfdt ?? 0 } } }
      : undefined;
    runSim(faultPhasors, protOverride);
    tripResult = await tripPromise;
    stopSim();

    console.log(`[Test ${i+1}] TripResult:`, tripResult);

    // Evaluate result
    const measured = tripResult
      ? { tMeasured: tripResult.tripTime, tripDetected: true }
      : { tMeasured: null, tripDetected: false };

    const evalResult = evaluate(test.fn || '51', point, measured);
    const result = {
      ...point,
      ...evalResult,
      tMeasured: measured.tMeasured,
      pointIndex: i,
      completedAt: Date.now(),
    };

    if (setEvts) {
      setEvts(ev => [{
        time: new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        icon: evalResult.pass ? '✓' : '✗',
        text: `Ponto ${i+1} ${evalResult.pass ? 'PASSOU' : 'FALHOU'}: ${evalResult.failReason || ''}`,
        dt: ''
      }, ...(ev || []).slice(0, 49)]);
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
