/**
 * scenarioValidator.js — Pure validation engine for Phase 10 Visual Scenario Editor.
 *
 * No React imports. All functions are pure (no side effects).
 * Compatible with App.jsx patch handler (lines 250-262) stage key conventions.
 *
 * Exports:
 *   validateScenario(scenario)          → {ok, errors, warnings}
 *   normalizeScenario(partial)          → scenario
 *   validatePhasors({currents,voltages})→ {ok, errors}
 *   validateProtectionPatch(patch, fns) → {ok, errors}
 *   validateUnique(id, existingIds)     → {ok, warning?}
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Valid protection function codes accepted by the relay engine */
const VALID_FN_CODES = ["50", "51", "50N", "51N", "67", "67N", "27", "59", "47", "81U", "81O", "27/59", "81", "46", "32", "79"];

/** Curve names accepted by CURVE_MAP in protection.js (from ScenarioVisualEditor.jsx:21-31) */
const VALID_CURVES = [
  "IEC - Standard Inverse",
  "IEC - Very Inverse",
  "IEC - Extremely Inverse",
  "IEC - Long-Time Inverse",
  "US - Inverse",
  "US - Very Inverse",
  "US - Extremely Inverse",
  "IEEE - Moderately Inverse",
  "Tempo Definido",
  // Legacy aliases kept for backward compatibility
  "IEC Standard",
  "IEC Very Inverse",
  "IEC Extremely Inverse",
  "IEC Long Time",
  "US Inverse",
  "US Very Inverse",
  "US Extremely Inverse",
  "IEEE Moderately Inverse",
  "Definite Time",
];

/** Stage key variants expected by App.jsx patch handler */
const STAGE_KEYS = [
  "stages50",
  "stages51",
  "stages50N",
  "stages51N",
  "stages67",
  "stages67N",
  "stages27",
  "stages59",
  "stages47",
  "stages81u",
  "stages81o",
];

/** Required top-level keys for a complete scenario */
const REQUIRED_KEYS = ["id", "name", "phasors", "fns", "stages"];

/** Phase labels for currents and voltages */
const CURRENT_PHASES = ["Ia", "Ib", "Ic"];
const VOLTAGE_PHASES = ["Va", "Vb", "Vc"];

/** Secondary-side limits */
const MAX_CURRENT_A = 20;
const MAX_VOLTAGE_V = 150;
const MAX_ERRORS_RETURNED = 3;

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const E_NEG_MAG    = "E_NEG_MAG";
export const E_ANG_RANGE  = "E_ANG_RANGE";
export const E_MISSING_PHASE = "E_MISSING_PHASE";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Generate a timestamp-based unique id.
 * @returns {string}
 */
function makeId() {
  return "scen_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
}

/**
 * Check if a value is a finite number.
 * @param {*} v
 * @returns {boolean}
 */
function isFiniteNum(v) {
  return typeof v === "number" && isFinite(v);
}

/**
 * Trim an error array to the first MAX_ERRORS_RETURNED entries.
 * @param {string[]} errors
 * @returns {string[]}
 */
function trimErrors(errors) {
  return errors.slice(0, MAX_ERRORS_RETURNED);
}

// ---------------------------------------------------------------------------
// validatePhasors
// ---------------------------------------------------------------------------

/**
 * Validate a phasors object with currents and voltages sub-objects.
 *
 * Each phase must have {mag: number ≥ 0, ang: number in [-360, 360]}.
 * Current magnitudes must be ≤ 20 A (secondary).
 * Voltage magnitudes must be ≤ 150 V (secondary).
 *
 * @param {{currents: Object, voltages: Object}} phasors
 * @returns {{ok: boolean, errors: string[]}}
 */
export function validatePhasors({ currents, voltages } = {}) {
  const errors = [];

  if (!currents || typeof currents !== "object") {
    errors.push(`${E_MISSING_PHASE}: currents object is missing`);
  }
  if (!voltages || typeof voltages !== "object") {
    errors.push(`${E_MISSING_PHASE}: voltages object is missing`);
  }
  if (errors.length) return { ok: false, errors };

  // Validate current phases
  for (const ph of CURRENT_PHASES) {
    const phasor = currents[ph];
    if (!phasor || typeof phasor !== "object") {
      errors.push(`${E_MISSING_PHASE}: currents.${ph} is missing`);
      continue;
    }
    if (!isFiniteNum(phasor.mag)) {
      errors.push(`${E_MISSING_PHASE}: currents.${ph}.mag must be a number`);
    } else if (phasor.mag < 0) {
      errors.push(`${E_NEG_MAG}: currents.${ph}.mag must be ≥ 0 (got ${phasor.mag})`);
    } else if (phasor.mag > MAX_CURRENT_A) {
      errors.push(`E_OVER_RANGE: currents.${ph}.mag exceeds secondary limit of ${MAX_CURRENT_A} A`);
    }
    if (!isFiniteNum(phasor.ang)) {
      errors.push(`${E_MISSING_PHASE}: currents.${ph}.ang must be a number`);
    } else if (phasor.ang < -360 || phasor.ang > 360) {
      errors.push(`${E_ANG_RANGE}: currents.${ph}.ang out of range [-360, 360] (got ${phasor.ang})`);
    }
  }

  // Validate voltage phases
  for (const ph of VOLTAGE_PHASES) {
    const phasor = voltages[ph];
    if (!phasor || typeof phasor !== "object") {
      errors.push(`${E_MISSING_PHASE}: voltages.${ph} is missing`);
      continue;
    }
    if (!isFiniteNum(phasor.mag)) {
      errors.push(`${E_MISSING_PHASE}: voltages.${ph}.mag must be a number`);
    } else if (phasor.mag < 0) {
      errors.push(`${E_NEG_MAG}: voltages.${ph}.mag must be ≥ 0 (got ${phasor.mag})`);
    } else if (phasor.mag > MAX_VOLTAGE_V) {
      errors.push(`E_OVER_RANGE: voltages.${ph}.mag exceeds secondary limit of ${MAX_VOLTAGE_V} V`);
    }
    if (!isFiniteNum(phasor.ang)) {
      errors.push(`${E_MISSING_PHASE}: voltages.${ph}.ang must be a number`);
    } else if (phasor.ang < -360 || phasor.ang > 360) {
      errors.push(`${E_ANG_RANGE}: voltages.${ph}.ang out of range [-360, 360] (got ${phasor.ang})`);
    }
  }

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// validateProtectionPatch
// ---------------------------------------------------------------------------

/**
 * Validate a protection patch object against the active function list.
 *
 * Every key in patch must appear in fns.
 * Pickup values must be > 0 and < 100 A.
 * timeDial values must be in [0.05, 10].
 * curve names must be in VALID_CURVES.
 *
 * @param {Object} patch - Map of fnId → settings object
 * @param {string[]} fns - Active protection function ids
 * @returns {{ok: boolean, errors: string[]}}
 */
export function validateProtectionPatch(patch, fns) {
  const errors = [];

  if (!patch || typeof patch !== "object") {
    errors.push("patch must be an object");
    return { ok: false, errors };
  }
  if (!Array.isArray(fns)) {
    errors.push("fns must be an array");
    return { ok: false, errors };
  }

  for (const fnId of Object.keys(patch)) {
    if (!fns.includes(fnId)) {
      errors.push(`patch key "${fnId}" not found in fns array`);
      continue;
    }
    const settings = patch[fnId];
    if (!settings || typeof settings !== "object") continue;

    // Check stages array if present
    const stagesArr = settings.stages ||
      settings.stages81u || settings.stages81o ||
      settings.stages27 || settings.stages59 ||
      settings.stages32r || settings.stages32f;

    const arraysToCheck = [];
    if (Array.isArray(settings.stages)) arraysToCheck.push(settings.stages);
    if (Array.isArray(settings.stages81u)) arraysToCheck.push(settings.stages81u);
    if (Array.isArray(settings.stages81o)) arraysToCheck.push(settings.stages81o);
    if (Array.isArray(settings.stages27)) arraysToCheck.push(settings.stages27);
    if (Array.isArray(settings.stages59)) arraysToCheck.push(settings.stages59);
    if (Array.isArray(settings.stages32r)) arraysToCheck.push(settings.stages32r);
    if (Array.isArray(settings.stages32f)) arraysToCheck.push(settings.stages32f);

    for (const arr of arraysToCheck) {
      for (let i = 0; i < arr.length; i++) {
        const st = arr[i];
        if (!st || typeof st !== "object") continue;

        if (st.pickup !== undefined) {
          if (!isFiniteNum(st.pickup) || st.pickup <= 0 || st.pickup > 100) {
            errors.push(`${fnId} stage[${i}].pickup must be > 0 and <= 100 (got ${st.pickup})`);
          }
        }
        if (st.timeDial !== undefined) {
          if (!isFiniteNum(st.timeDial) || st.timeDial < 0.05 || st.timeDial > 10) {
            errors.push(`${fnId} stage[${i}].timeDial must be in [0.05, 10] (got ${st.timeDial})`);
          }
        }
        if (st.curve !== undefined) {
          if (!VALID_CURVES.includes(st.curve)) {
            errors.push(`${fnId} stage[${i}].curve "${st.curve}" is not a recognised curve name`);
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// validateUnique
// ---------------------------------------------------------------------------

/**
 * Warn (but do not reject) when an id already exists in the collection.
 * Suggests an auto-suffixed id (-2, -3, …).
 *
 * @param {string} id - Candidate scenario id
 * @param {string[]} existingIds - Ids already in use
 * @returns {{ok: boolean, warning?: string, suggested?: string}}
 */
export function validateUnique(id, existingIds) {
  if (!Array.isArray(existingIds) || !existingIds.includes(id)) {
    return { ok: true };
  }

  // Find next available suffix
  let suffix = 2;
  let candidate = `${id}-${suffix}`;
  while (existingIds.includes(candidate)) {
    suffix += 1;
    candidate = `${id}-${suffix}`;
  }

  return {
    ok: true,
    warning: `id "${id}" already exists — consider using "${candidate}"`,
    suggested: candidate,
  };
}

// ---------------------------------------------------------------------------
// validateScenario
// ---------------------------------------------------------------------------

/**
 * Validate a complete scenario object.
 *
 * Required keys: id, name, phasors, fns, stages.
 * fns must be an array of valid protection function codes.
 * phasors must pass validatePhasors.
 * Returns at most MAX_ERRORS_RETURNED (3) errors to avoid clutter.
 *
 * @param {Object} scenario
 * @returns {{ok: boolean, errors: string[], warnings: string[]}}
 */
export function validateScenario(scenario) {
  const errors = [];
  const warnings = [];

  if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) {
    return { ok: false, errors: ["scenario must be a non-null object"], warnings };
  }

  // Required keys
  for (const key of REQUIRED_KEYS) {
    if (scenario[key] === undefined || scenario[key] === null || scenario[key] === "") {
      errors.push(`missing required field: "${key}"`);
    }
  }

  // fns validation
  if (Array.isArray(scenario.fns)) {
    for (const fn of scenario.fns) {
      if (typeof fn !== "string") {
        errors.push(`fns entries must be strings (got ${typeof fn})`);
        break;
      }
      if (!VALID_FN_CODES.includes(fn)) {
        warnings.push(`fns includes unrecognised code "${fn}" — verify against relay engine`);
      }
    }
  } else if (scenario.fns !== undefined && scenario.fns !== null) {
    errors.push(`fns must be an array of strings`);
  }

  // Phasor validation
  if (scenario.phasors && typeof scenario.phasors === "object") {
    const pResult = validatePhasors(scenario.phasors);
    if (!pResult.ok) {
      errors.push(...pResult.errors);
    }
  }

  return { ok: errors.length === 0, errors: trimErrors(errors), warnings };
}

// ---------------------------------------------------------------------------
// normalizeScenario
// ---------------------------------------------------------------------------

/**
 * Fill in missing keys with safe defaults so the scenario is compatible with
 * the App.jsx patch handler at lines 250-262.
 *
 * Ensures all 11 protection function stage arrays are present:
 *   stages50, stages51, stages50N, stages51N, stages67, stages67N,
 *   stages27, stages59, stages47, stages81u, stages81o
 *
 * @param {Object} partial - Partial scenario (may be empty)
 * @returns {Object} Normalized scenario
 */
export function normalizeScenario(partial) {
  const src = (partial && typeof partial === "object") ? partial : {};

  // Ensure id
  const id = (typeof src.id === "string" && src.id.trim()) ? src.id.trim() : makeId();

  // Ensure name
  const name = (typeof src.name === "string" && src.name.trim()) ? src.name.trim() : "Unnamed Scenario";

  // Ensure phasors with safe zero defaults
  const defaultPhasors = {
    currents: {
      Ia: { mag: 0, ang: 0 },
      Ib: { mag: 0, ang: -120 },
      Ic: { mag: 0, ang: 120 },
    },
    voltages: {
      Va: { mag: 66.4, ang: 0 },
      Vb: { mag: 66.4, ang: -120 },
      Vc: { mag: 66.4, ang: 120 },
    },
  };

  const phasors = src.phasors && typeof src.phasors === "object"
    ? {
        currents: {
          ...defaultPhasors.currents,
          ...(src.phasors.currents || {}),
        },
        voltages: {
          ...defaultPhasors.voltages,
          ...(src.phasors.voltages || {}),
        },
      }
    : defaultPhasors;

  // Ensure fns
  const fns = Array.isArray(src.fns) ? src.fns : [];

  // Ensure stages
  const stages = (src.stages && typeof src.stages === "object") ? src.stages : {};

  // Ensure out / inp
  const out = (src.out && typeof src.out === "object") ? src.out : {};
  const inp = (src.inp && typeof src.inp === "object") ? src.inp : {};

  // Ensure all 11 stage key variants for App.jsx:250-262 compatibility
  const stageDefaults = {};
  for (const key of STAGE_KEYS) {
    stageDefaults[key] = Array.isArray(src[key]) ? src[key] : [];
  }

  return {
    // Identity & metadata
    id,
    name,
    label: typeof src.label === "string" ? src.label : name.slice(0, 20),
    description: typeof src.description === "string" ? src.description : "",
    learningObj: typeof src.learningObj === "string" ? src.learningObj : "",

    // Injection data
    phasors,
    fns,
    stages,
    patch: (src.patch && typeof src.patch === "object") ? src.patch : {},
    out,
    inp,

    // Stage key variants required by App.jsx patch handler
    ...stageDefaults,
  };
}
