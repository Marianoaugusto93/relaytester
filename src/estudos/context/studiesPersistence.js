/**
 * studiesPersistence.js — localStorage helpers for Estudos tab state
 *
 * Persists:
 * - BayContext state (Vn, TC, TP, freq)
 * - Recent study scenarios
 * - Study artifacts (fault results, TCC data, etc.)
 */

const VERSION = "v1";
const KEY_BAY = `estudos.bay.${VERSION}`;
const KEY_RECENT = `estudos.recent.${VERSION}`;
const KEY_ARTIFACTS = `estudos.artifacts.${VERSION}`;

/**
 * Load Bay state from localStorage.
 * Returns default if not found or corrupted.
 *
 * @returns {Object} { vn, sBase, tc, tp, freq, systemConnection, grounding }
 */
export function getBay() {
  try {
    const json = localStorage.getItem(KEY_BAY);
    if (!json) return getDefaultBay();
    return JSON.parse(json);
  } catch {
    return getDefaultBay();
  }
}

/**
 * Save Bay state to localStorage.
 *
 * @param {Object} bay - Bay state object
 */
export function setBay(bay) {
  try {
    localStorage.setItem(KEY_BAY, JSON.stringify(bay));
  } catch (e) {
    console.warn("[studiesPersistence] setBay failed:", e.message);
  }
}

/**
 * Load recent scenario list from localStorage.
 * Returns array of { id, name, timestamp, category }
 *
 * @returns {Array}
 */
export function getRecent() {
  try {
    const json = localStorage.getItem(KEY_RECENT);
    if (!json) return [];
    const arr = JSON.parse(json);
    // Keep only last 20 entries, newest first
    return arr.slice(0, 20);
  } catch {
    return [];
  }
}

/**
 * Save a scenario to recent list.
 * Deduplicates by id, moves to top, keeps max 20.
 *
 * @param {Object} item - { id, name, timestamp, category }
 */
export function saveRecent(item) {
  try {
    const recent = getRecent();
    // Remove if already exists
    const filtered = recent.filter(r => r.id !== item.id);
    // Add to top, keep max 20
    const updated = [item, ...filtered].slice(0, 20);
    localStorage.setItem(KEY_RECENT, JSON.stringify(updated));
  } catch (e) {
    console.warn("[studiesPersistence] saveRecent failed:", e.message);
  }
}

/**
 * Load artifact by id (e.g., fault result, TCC data).
 *
 * @param {string} id - Artifact id
 * @returns {Object | null}
 */
export function getArtifact(id) {
  try {
    const json = localStorage.getItem(KEY_ARTIFACTS);
    if (!json) return null;
    const artifacts = JSON.parse(json);
    return artifacts[id] || null;
  } catch {
    return null;
  }
}

/**
 * Save artifact by id.
 * Merges with existing artifacts.
 *
 * @param {string} id - Artifact id
 * @param {Object} data - Artifact data
 */
export function setArtifact(id, data) {
  try {
    let artifacts = {};
    const json = localStorage.getItem(KEY_ARTIFACTS);
    if (json) {
      try {
        artifacts = JSON.parse(json);
      } catch {
        artifacts = {};
      }
    }
    artifacts[id] = {
      ...data,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(KEY_ARTIFACTS, JSON.stringify(artifacts));
  } catch (e) {
    console.warn("[studiesPersistence] setArtifact failed:", e.message);
  }
}

/**
 * Delete artifact by id.
 *
 * @param {string} id
 */
export function delArtifact(id) {
  try {
    const json = localStorage.getItem(KEY_ARTIFACTS);
    if (!json) return;
    const artifacts = JSON.parse(json);
    delete artifacts[id];
    localStorage.setItem(KEY_ARTIFACTS, JSON.stringify(artifacts));
  } catch (e) {
    console.warn("[studiesPersistence] delArtifact failed:", e.message);
  }
}

/**
 * Export all Bay state as JSON string for download/sharing.
 *
 * @returns {string} JSON stringified Bay object
 */
export function exportBay(bay) {
  return JSON.stringify(bay, null, 2);
}

/**
 * Import Bay state from JSON string.
 * Validates structure before returning.
 *
 * @param {string} jsonStr
 * @returns {Object | null} Bay state or null if invalid
 */
export function importBay(jsonStr) {
  try {
    const bay = JSON.parse(jsonStr);
    // Minimal validation
    if (typeof bay !== "object" || bay === null) return null;
    if (typeof bay.vn !== "number") return null;
    if (!bay.tc || typeof bay.tc.priA !== "number") return null;
    return bay;
  } catch {
    return null;
  }
}

// ─── Default state ────────────────────────────────────────────────────────────

function getDefaultBay() {
  return {
    vn: 66.4, // Secondary voltage (kV)
    sBase: 100, // Base power (MVA)
    tc: {
      priA: 600, // Primary current (A)
      secA: 5, // Secondary current (A)
    },
    tp: {
      priV: 66400, // Primary voltage (V)
      secV: 110, // Secondary voltage (V)
    },
    freq: 60, // Frequency (Hz)
    systemConnection: "Y", // Y or Δ
    grounding: "solidly", // solidly, high-z, low-z, ungrounded
  };
}

/**
 * Check if localStorage quota is exceeded.
 * Used to prevent silent failures.
 *
 * @returns {boolean} true if quota exceeded
 */
export function isStorageQuotaExceeded() {
  try {
    const test = "quota-test-" + Date.now();
    localStorage.setItem(test, "1");
    localStorage.removeItem(test);
    return false;
  } catch (e) {
    if (e.name === "QuotaExceededError") return true;
    return false;
  }
}
