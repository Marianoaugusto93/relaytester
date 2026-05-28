/**
 * analyticsStorage.js — Persist analytics to localStorage.
 * Handles auto-saving, size limits, and privacy controls.
 */

const STORAGE_KEY = "relaylab360_analytics";
const MAX_SIZE = 50 * 1024; // 50 kB

/**
 * Load analytics from localStorage.
 * @returns {object} Loaded analytics or empty object if not found
 */
export function loadAnalytics() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { scenarios: {}, errors: {}, actions: {}, lastUpdated: null };
    const data = JSON.parse(stored);
    return data && typeof data === "object" ? data : { scenarios: {}, errors: {}, actions: {} };
  } catch {
    return { scenarios: {}, errors: {}, actions: {} };
  }
}

/**
 * Save analytics to localStorage.
 * Auto-prunes data if size exceeds limit.
 * @param {object} analytics - Analytics data to save
 * @returns {boolean} True if saved successfully
 */
export function saveAnalytics(analytics) {
  try {
    const json = JSON.stringify(analytics);
    const size = new Blob([json]).size;

    if (size > MAX_SIZE) {
      // Prune: remove oldest durations from each scenario
      const pruned = { ...analytics };
      Object.keys(pruned.scenarios || {}).forEach(scenarioId => {
        const s = pruned.scenarios[scenarioId];
        if (Array.isArray(s.durations) && s.durations.length > 10) {
          s.durations = s.durations.slice(-10); // Keep last 10
        }
      });
      return saveAnalytics(pruned); // Recursive: try again with less data
    }

    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch {
    // Storage full or quota exceeded - silent fail (don't block app)
    return false;
  }
}

/**
 * Clear analytics from localStorage (privacy).
 * @returns {boolean} True if cleared successfully
 */
export function clearStoredAnalytics() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Export analytics as JSON string (for user download).
 * @param {object} analytics - Analytics data
 * @returns {string} JSON string
 */
export function exportAnalyticsJson(analytics) {
  return JSON.stringify(analytics, null, 2);
}

/**
 * Get storage usage as percentage.
 * @returns {number} Percentage (0-100)
 */
export function getStorageUsage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return 0;
    const size = new Blob([data]).size;
    return Math.min(100, Math.round((size / MAX_SIZE) * 100));
  } catch {
    return 0;
  }
}
