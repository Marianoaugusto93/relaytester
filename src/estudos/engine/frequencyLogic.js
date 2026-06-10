/**
 * frequencyLogic.js — Under/over-frequency (81U/81O) + df/dt logic
 *
 * Implements pickup detection for 81U (underfrequency) and 81O (overfrequency)
 * with a configurable dead-band to avoid chattering around pickup. Returns the
 * frequency status, the stage that picks up first, and the timer until trip.
 *
 * Conventions:
 *  - All frequencies in Hz; df/dt in Hz/s.
 *  - delayUn / delayOv are settable trip delays (seconds).
 *  - Dead-band is symmetrical around the pickup threshold.
 *
 * No external dependencies.
 */

const RAPID_DFDT = 2.0;          // Hz/s — flag a "rapid change" disturbance
const DEFAULT_DEAD_BAND = 0.2;   // Hz hysteresis around pickup

/**
 * Evaluate a single instantaneous frequency sample against the 81U/81O
 * pickup thresholds.
 *
 * @param {number} f               Current frequency (Hz)
 * @param {number} f0              Nominal frequency (50 or 60 Hz)
 * @param {number} dfdt            Rate-of-change of frequency (Hz/s)
 * @param {number} pickup81u       81U pickup threshold (Hz), e.g. 58.5
 * @param {number} pickup81o       81O pickup threshold (Hz), e.g. 61.5
 * @param {number} [deadBand=0.2]  Dead-band (Hz) around pickup
 * @param {number} [delayUn=10]    81U intentional delay (s)
 * @param {number} [delayOv=5]     81O intentional delay (s)
 * @returns {{
 *   status: "Normal" | "Underfrequency" | "Overfrequency" | "Rapid change",
 *   pickup: boolean,
 *   stage: "81U" | "81O" | "df/dt" | null,
 *   delay: number,
 *   timeToTrip: number,
 *   margin: number
 * }}
 */
export function evaluateFrequency(
  f,
  f0,
  dfdt,
  pickup81u,
  pickup81o,
  deadBand = DEFAULT_DEAD_BAND,
  delayUn = 10,
  delayOv = 5,
) {
  if (!isFinite(f) || !isFinite(f0)) {
    return {
      status: "Normal",
      pickup: false,
      stage: null,
      delay: 0,
      timeToTrip: Infinity,
      margin: 0,
    };
  }

  const absDfdt = Math.abs(dfdt || 0);
  // Underfrequency: pickup if f < pickup81u (dead-band drops it a bit lower for hysteresis)
  const pickUn = f < pickup81u - deadBand / 2;
  const pickOv = f > pickup81o + deadBand / 2;
  const pickDfdt = absDfdt > RAPID_DFDT;

  let status = "Normal";
  let stage = null;
  let delay = 0;
  let margin = 0;

  if (pickUn) {
    status = "Underfrequency";
    stage = "81U";
    delay = delayUn;
    margin = pickup81u - f;
  } else if (pickOv) {
    status = "Overfrequency";
    stage = "81O";
    delay = delayOv;
    margin = f - pickup81o;
  } else if (pickDfdt) {
    status = "Rapid change";
    stage = "df/dt";
    delay = Math.max(0.1, 1 / absDfdt);
    margin = absDfdt - RAPID_DFDT;
  }

  const pickup = status !== "Normal";

  // timeToTrip: while pickup is held, this is the configured delay; otherwise Infinity.
  // The dynamic timer (consumer) decrements while pickup persists.
  const timeToTrip = pickup ? delay : Infinity;

  return { status, pickup, stage, delay, timeToTrip, margin };
}

/**
 * Run a list of (t, f) samples through the evaluator and produce a timeline
 * with the events of interest (pickup, trip, reset).
 *
 * @param {Array<{t: number, f: number}>} trajectory  Time-series of frequency
 * @param {number} f0
 * @param {number} pickup81u
 * @param {number} pickup81o
 * @param {Object} [opts]
 * @param {number} [opts.deadBand]
 * @param {number} [opts.delayUn]
 * @param {number} [opts.delayOv]
 * @returns {{
 *   samples: Array<{t: number, f: number, dfdt: number, status: string, stage: string|null}>,
 *   events: Array<{t: number, type: string, message: string}>,
 *   maxDfdt: number,
 *   tripped: boolean,
 *   tripTime: number | null
 * }}
 */
export function simulateFrequencyTrajectory(
  trajectory,
  f0,
  pickup81u,
  pickup81o,
  opts = {},
) {
  const { deadBand = DEFAULT_DEAD_BAND, delayUn = 10, delayOv = 5 } = opts;

  if (!Array.isArray(trajectory) || trajectory.length === 0) {
    return { samples: [], events: [], maxDfdt: 0, tripped: false, tripTime: null };
  }

  const samples = [];
  const events = [];
  let pickupHoldStart = null;
  let activeStage = null;
  let activeDelay = 0;
  let tripped = false;
  let tripTime = null;
  let maxDfdt = 0;

  for (let i = 0; i < trajectory.length; i++) {
    const { t, f } = trajectory[i];
    const prev = i > 0 ? trajectory[i - 1] : null;
    let dfdt = 0;
    if (prev) {
      const dt = t - prev.t;
      if (dt > 1e-9) dfdt = (f - prev.f) / dt;
    }
    if (Math.abs(dfdt) > Math.abs(maxDfdt)) maxDfdt = dfdt;

    const ev = evaluateFrequency(f, f0, dfdt, pickup81u, pickup81o, deadBand, delayUn, delayOv);
    samples.push({ t, f, dfdt, status: ev.status, stage: ev.stage });

    if (ev.pickup) {
      if (pickupHoldStart === null || activeStage !== ev.stage) {
        pickupHoldStart = t;
        activeStage = ev.stage;
        activeDelay = ev.delay;
        events.push({
          t,
          type: "pickup",
          message: `${ev.stage} pickup (f=${f.toFixed(2)} Hz)`,
        });
      } else if (!tripped && t - pickupHoldStart >= activeDelay) {
        tripped = true;
        tripTime = t;
        events.push({
          t,
          type: "trip",
          message: `TRIP ${activeStage} after ${activeDelay.toFixed(2)} s`,
        });
      }
    } else if (pickupHoldStart !== null && !tripped) {
      events.push({
        t,
        type: "reset",
        message: `${activeStage} reset (f recuperou)`,
      });
      pickupHoldStart = null;
      activeStage = null;
      activeDelay = 0;
    }
  }

  return { samples, events, maxDfdt, tripped, tripTime };
}

/**
 * Build a synthetic frequency trajectory from a simple analytical model.
 * f(t) = f0 + dF * sin(2π t / period); duration steps in `samples`.
 *
 * @param {number} f0
 * @param {number} dF       Excursion amplitude (Hz)
 * @param {number} period   Period of oscillation (s)
 * @param {number} duration Total simulated duration (s)
 * @param {number} samples  Number of sample points
 * @returns {Array<{t: number, f: number}>}
 */
export function buildSyntheticTrajectory(f0, dF, period, duration, samples) {
  const n = Math.max(2, Math.floor(samples));
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * duration;
    const f = f0 + dF * Math.sin((2 * Math.PI * t) / Math.max(1e-3, period));
    out[i] = { t, f };
  }
  return out;
}
