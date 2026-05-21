/**
 * Custom scenario persistence layer.
 * Stores, retrieves, and manages user-defined test scenarios in localStorage.
 * Storage key: "customScenarios" (JSON array, max 10 items)
 */

const STORAGE_KEY = "customScenarios";
const MAX_SCENARIOS = 10;

/**
 * Load all custom scenarios from localStorage.
 * @returns {Array} Array of scenario objects (may be empty)
 */
export function getAllCustomScenarios() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save a custom scenario to localStorage.
 * Replaces existing scenario with same id; otherwise prepends.
 * Enforces MAX_SCENARIOS limit by removing oldest entries.
 * @param {Object} scenario - Scenario object (must have .id)
 * @returns {boolean} true on success
 */
export function saveCustomScenario(scenario) {
  try {
    const all = getAllCustomScenarios();
    const idx = all.findIndex(s => s.id === scenario.id);
    if (idx >= 0) {
      all[idx] = scenario;
    } else {
      all.unshift(scenario);
      if (all.length > MAX_SCENARIOS) all.splice(MAX_SCENARIOS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

/**
 * Load a single custom scenario by id.
 * @param {string} id - Scenario id
 * @returns {Object|null} Scenario object or null if not found
 */
export function loadCustomScenario(id) {
  return getAllCustomScenarios().find(s => s.id === id) ?? null;
}

/**
 * Delete a custom scenario by id.
 * @param {string} id - Scenario id
 * @returns {boolean} true if deleted, false if not found
 */
export function deleteCustomScenario(id) {
  try {
    const all = getAllCustomScenarios();
    const next = all.filter(s => s.id !== id);
    if (next.length === all.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/**
 * Export scenario as a JSON file download.
 * @param {Object} scenario - Scenario object
 */
export function exportScenarioAsJson(scenario) {
  const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${scenario.id || "scenario"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import a scenario from a JSON file via file input.
 * @param {File} file - File object from input[type=file]
 * @returns {Promise<Object>} Parsed scenario object
 */
export function importScenarioFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const obj = JSON.parse(e.target.result);
        if (!obj || typeof obj !== "object") throw new Error("Invalid JSON");
        resolve(obj);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsText(file);
  });
}
