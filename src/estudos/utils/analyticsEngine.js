/**
 * analyticsEngine.js — Usage analytics for scenarios.
 * Pure functions for tracking scenario usage, injection duration, errors, actions.
 */

/**
 * Initialize analytics data structure.
 * @returns {object} Empty analytics object
 */
export function createAnalyticsData() {
  return {
    scenarios: {},
    errors: {},
    actions: {},
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Record scenario usage (frequency + injection duration).
 * @param {object} analytics - Current analytics data
 * @param {string} scenarioId - Scenario ID (e.g., "3ph-symmetrical")
 * @param {number} durationSecs - Injection duration in seconds
 * @returns {object} Updated analytics
 */
export function recordScenarioUsage(analytics, scenarioId, durationSecs) {
  if (!scenarioId || typeof durationSecs !== "number" || durationSecs < 0) return analytics;

  const updated = { ...analytics };
  if (!updated.scenarios[scenarioId]) {
    updated.scenarios[scenarioId] = { uses: 0, durations: [] };
  }

  updated.scenarios[scenarioId].uses += 1;
  updated.scenarios[scenarioId].durations.push(durationSecs);

  // Keep only last 100 durations to limit storage
  if (updated.scenarios[scenarioId].durations.length > 100) {
    updated.scenarios[scenarioId].durations.shift();
  }

  updated.lastUpdated = new Date().toISOString();
  return updated;
}

/**
 * Record an error event.
 * @param {object} analytics - Current analytics data
 * @param {string} errorType - Error type (e.g., "validation_failed")
 * @returns {object} Updated analytics
 */
export function recordError(analytics, errorType) {
  if (!errorType) return analytics;

  const updated = { ...analytics };
  updated.errors[errorType] = (updated.errors[errorType] || 0) + 1;
  updated.lastUpdated = new Date().toISOString();
  return updated;
}

/**
 * Record a user action.
 * @param {object} analytics - Current analytics data
 * @param {string} actionType - Action type (e.g., "save", "export", "import")
 * @returns {object} Updated analytics
 */
export function recordAction(analytics, actionType) {
  if (!actionType) return analytics;

  const updated = { ...analytics };
  updated.actions[actionType] = (updated.actions[actionType] || 0) + 1;
  updated.lastUpdated = new Date().toISOString();
  return updated;
}

/**
 * Get top N scenarios by usage count.
 * @param {object} analytics - Analytics data
 * @param {number} n - Number of top scenarios to return
 * @returns {array} Top scenarios sorted by usage
 */
export function getTopScenarios(analytics, n = 5) {
  return Object.entries(analytics.scenarios || {})
    .map(([id, data]) => ({
      id,
      uses: data.uses,
      avgDuration: data.durations.length > 0
        ? (data.durations.reduce((a, b) => a + b, 0) / data.durations.length).toFixed(2)
        : 0,
      minDuration: data.durations.length > 0 ? Math.min(...data.durations).toFixed(2) : 0,
      maxDuration: data.durations.length > 0 ? Math.max(...data.durations).toFixed(2) : 0,
    }))
    .sort((a, b) => b.uses - a.uses)
    .slice(0, n);
}

/**
 * Get error summary.
 * @param {object} analytics - Analytics data
 * @returns {array} Errors sorted by frequency
 */
export function getErrorSummary(analytics) {
  return Object.entries(analytics.errors || {})
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get action summary.
 * @param {object} analytics - Analytics data
 * @returns {array} Actions with counts
 */
export function getActionSummary(analytics) {
  return Object.entries(analytics.actions || {})
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get total statistics.
 * @param {object} analytics - Analytics data
 * @returns {object} Summary stats
 */
export function getStats(analytics) {
  const totalScenarioUses = Object.values(analytics.scenarios || {})
    .reduce((sum, s) => sum + s.uses, 0);
  const totalErrors = Object.values(analytics.errors || {})
    .reduce((sum, e) => sum + e, 0);
  const totalActions = Object.values(analytics.actions || {})
    .reduce((sum, a) => sum + a, 0);

  return {
    totalScenarioUses,
    totalErrors,
    totalActions,
    scenariosTracked: Object.keys(analytics.scenarios || {}).length,
    lastUpdated: analytics.lastUpdated || null,
  };
}

/**
 * Clear all analytics data (privacy).
 * @returns {object} Fresh analytics object
 */
export function clearAnalytics() {
  return createAnalyticsData();
}
