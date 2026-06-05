/**
 * Label Positioning & Collision Detection
 *
 * Utilities for bus/branch label placement on SVG diagram:
 * - Bounding box collision detection
 * - Candidate position selection
 * - Label offset persistence
 */

/**
 * Compute bounding box for text element.
 * Estimates size based on font metrics.
 *
 * @param {number} centerX - Text center X coordinate
 * @param {number} centerY - Text center Y coordinate
 * @param {string} text - Text content
 * @param {number} fontSize - Font size in pixels
 * @returns {Object} {x1, y1, x2, y2} bounding box
 */
export function bboxForText(centerX, centerY, text, fontSize) {
  // Estimate: 0.6 em per character width, 0.8 em height
  const charW = (fontSize * 0.6) / 2;
  const h = fontSize * 0.8;
  const w = charW * text.length;

  return {
    x1: centerX - w,
    y1: centerY - h / 2,
    x2: centerX + w,
    y2: centerY + h / 2,
  };
}

/**
 * Check if two bounding boxes overlap.
 *
 * @param {Object} a - Box {x1, y1, x2, y2}
 * @param {Object} b - Box {x1, y1, x2, y2}
 * @returns {boolean} True if boxes overlap
 */
export function bboxOverlap(a, b) {
  return !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);
}

/**
 * Count number of collisions for a bounding box.
 *
 * @param {Object} bb - Bounding box to test
 * @param {Array<Object>} occupied - Array of occupied boxes
 * @returns {number} Collision count
 */
export function bboxCollisionCount(bb, occupied) {
  let n = 0;
  for (const o of occupied) if (bboxOverlap(bb, o)) n++;
  return n;
}

/**
 * Select best label position from candidates.
 * Minimizes collisions; ties broken by distance from target.
 *
 * @param {string} text - Label text
 * @param {number} fontSize - Font size (px)
 * @param {Array<[number, number]>} candidates - Candidate positions [[x, y], ...]
 * @param {Array<Object>} occupied - Already-placed labels
 * @returns {[number, number]} Best [x, y] position
 */
export function pickBestPosition(text, fontSize, candidates, occupied) {
  if (!candidates || candidates.length === 0) {
    return [0, 0];
  }

  let best = candidates[0];
  let bestCollisions = Infinity;

  for (const [cx, cy] of candidates) {
    const bb = bboxForText(cx, cy, text, fontSize);
    const collisions = bboxCollisionCount(bb, occupied);
    if (collisions < bestCollisions) {
      bestCollisions = collisions;
      best = [cx, cy];
    }
  }

  return best;
}

/**
 * Get label offset override for a label key.
 * Defaults to {dx: 0, dy: 0} if no override.
 *
 * @param {string} key - Label identifier (e.g., "bus-1", "branch-2-3")
 * @param {Object} overrides - Map of key → {dx, dy}
 * @returns {Object} {dx, dy} offset
 */
export function getLabelOffset(key, overrides = {}) {
  return overrides[key] || { dx: 0, dy: 0 };
}

/**
 * Set label offset override.
 *
 * @param {string} key - Label identifier
 * @param {number} dx - X offset (pixels)
 * @param {number} dy - Y offset (pixels)
 * @param {Object} overrides - Map to update
 */
export function setLabelOffset(key, dx, dy, overrides = {}) {
  overrides[key] = { dx, dy };
  return overrides;
}

/**
 * Clear all label offset overrides.
 *
 * @returns {Object} Empty override map
 */
export function clearAllLabelOffsets() {
  return {};
}
