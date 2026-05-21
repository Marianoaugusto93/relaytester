/**
 * AnalyticsEngine — tracks scenario usage, injection times, and trip errors.
 * Persists data in localStorage under key `relaytester_analytics`.
 *
 * Storage format:
 * {
 *   scenarios: {
 *     "3-Ph Fault": { count: 5, totalTime: 6.2, avgTime: 1.24, tripErrors: 0 },
 *   },
 *   lastUpdated: 1779190318000
 * }
 */

const STORAGE_KEY = "relaytester_analytics";
const MAX_NAME_LEN = 80;

/** Sanitize scenario name: strip HTML/script characters, truncate. */
function sanitizeName(name) {
  if (typeof name !== "string" || !name.trim()) return "Unknown";
  return name
    .replace(/[<>"'&]/g, "")
    .trim()
    .slice(0, MAX_NAME_LEN) || "Unknown";
}

/** Load raw data from localStorage, returning a safe default on parse error. */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { scenarios: {}, lastUpdated: Date.now() };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { scenarios: {}, lastUpdated: Date.now() };
    if (!parsed.scenarios || typeof parsed.scenarios !== "object") parsed.scenarios = {};
    return parsed;
  } catch {
    return { scenarios: {}, lastUpdated: Date.now() };
  }
}

/** Persist data object to localStorage. */
function saveData(data) {
  try {
    data.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export class AnalyticsEngine {
  constructor() {
    this._injectionStart = null;
    this._currentScenario = null;
  }

  /**
   * Record that a scenario was loaded by the user.
   * @param {string} scenarioName - Display name of the scenario
   */
  recordScenarioLoad(scenarioName) {
    const name = sanitizeName(scenarioName);
    this._currentScenario = name;
    const data = loadData();
    if (!data.scenarios[name]) {
      data.scenarios[name] = { count: 0, totalTime: 0, avgTime: 0, tripErrors: 0 };
    }
    data.scenarios[name].count += 1;
    saveData(data);
  }

  /**
   * Mark the start of an injection session.
   * Call this when the user presses [▶ Injetar].
   */
  recordInjectionStart() {
    this._injectionStart = performance.now();
  }

  /**
   * Mark the end of an injection session and record elapsed time.
   * @param {number|null} tripTime  - Trip time in seconds, or null if no trip
   * @param {string|null} functionName - ANSI function code that tripped (e.g. "50-1"), or null
   */
  recordInjectionEnd(tripTime, functionName) {
    if (this._injectionStart === null) return;
    const elapsedMs = performance.now() - this._injectionStart;
    const elapsedSec = elapsedMs / 1000;
    this._injectionStart = null;

    const name = this._currentScenario || "Unknown";
    const data = loadData();
    if (!data.scenarios[name]) {
      data.scenarios[name] = { count: 0, totalTime: 0, avgTime: 0, tripErrors: 0 };
    }
    const rec = data.scenarios[name];
    rec.totalTime = (rec.totalTime || 0) + elapsedSec;
    rec.avgTime = rec.count > 0 ? rec.totalTime / rec.count : elapsedSec;
    saveData(data);
  }

  /**
   * Record a trip that did not match the expected protection function.
   * @param {string} expectedFunc - Expected function code
   * @param {string} actualFunc   - Actual function code that tripped
   */
  recordTrip(expectedFunc, actualFunc) {
    const isError = expectedFunc && actualFunc && expectedFunc !== actualFunc;
    if (!isError) return;
    const name = this._currentScenario || "Unknown";
    const data = loadData();
    if (!data.scenarios[name]) {
      data.scenarios[name] = { count: 0, totalTime: 0, avgTime: 0, tripErrors: 0 };
    }
    data.scenarios[name].tripErrors = (data.scenarios[name].tripErrors || 0) + 1;
    saveData(data);
  }

  /**
   * Get statistics for a single scenario.
   * @param {string} scenarioName
   * @returns {{ count: number, totalTime: number, avgTime: number, tripErrors: number } | null}
   */
  getStats(scenarioName) {
    const name = sanitizeName(scenarioName);
    const data = loadData();
    return data.scenarios[name] || null;
  }

  /**
   * Get statistics for all tracked scenarios.
   * @returns {{ scenarios: Object, lastUpdated: number }}
   */
  getAllStats() {
    return loadData();
  }

  /**
   * Clear all analytics data from localStorage.
   */
  clearStats() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // silently ignore
    }
    this._currentScenario = null;
    this._injectionStart = null;
  }
}

/** Singleton instance shared across the app. */
export const analytics = new AnalyticsEngine();
