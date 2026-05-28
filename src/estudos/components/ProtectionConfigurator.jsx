/**
 * ProtectionConfigurator.jsx — Form-based protection settings editor for Phase 10 VSE.
 *
 * Renders a vertical rail of 11 protection function toggle buttons.
 * When a function is selected, a form pane appears on the right with editable fields.
 * Uses validateProtectionPatch for inline error badges (errors stay local, do NOT block parent save).
 *
 * Props:
 *   fns        {string[]}  — enabled function codes
 *   patch      {object}    — protection patch object (per function key)
 *   onFnsChange(fns)       — called when user toggles a function on/off
 *   onPatchChange(patch)   — called when user edits a valid field
 */

import { useState, useMemo, useCallback, memo } from "react";
import { CURVE_OPTIONS } from "../constants/curves.js";
import { validateProtectionPatch } from "../engine/scenarioValidator.js";

// ---------------------------------------------------------------------------
// Function definitions
// ---------------------------------------------------------------------------

const ALL_FNS = [
  { id: "50",  label: "50",  name: "Sobrec. Inst. Fase" },
  { id: "51",  label: "51",  name: "Sobrec. Temp. Fase" },
  { id: "50N", label: "50N", name: "Sobrec. Inst. Neutro" },
  { id: "51N", label: "51N", name: "Sobrec. Temp. Neutro" },
  { id: "67",  label: "67",  name: "Direcional Fase" },
  { id: "67N", label: "67N", name: "Direcional Neutro" },
  { id: "27",  label: "27",  name: "Subtensão" },
  { id: "59",  label: "59",  name: "Sobretensão" },
  { id: "47",  label: "47",  name: "Seq. Neg. Tensão" },
  { id: "81U", label: "81U", name: "Subfrequência" },
  { id: "81O", label: "81O", name: "Sobrefrequência" },
];

// ---------------------------------------------------------------------------
// Default stage values per function
// ---------------------------------------------------------------------------

function defaultStage(fnId) {
  switch (fnId) {
    case "50":
    case "50N": return { pickup: 5.0 };
    case "51":
    case "51N": return { pickup: 2.0, timeDial: 0.5, curve: CURVE_OPTIONS[0] };
    case "67":  return { pickup: 1.5, mta: 45, vPol: 66.4 };
    case "67N": return { pickup: 0.5, mta: 45, vPol: 66.4 };
    case "27":  return { pickup: 95.0 };
    case "59":  return { pickup: 120.0 };
    case "47":  return { pickup: 0.1 };
    case "81U": return { pickup: 59.0, timeDial: 1.0 };
    case "81O": return { pickup: 61.0, timeDial: 1.0 };
    default:    return { pickup: 1.0 };
  }
}

// Build patch entry for a function from its stage values
function buildPatchEntry(fnId, stage) {
  switch (fnId) {
    case "50":  return { stages: [{ ...stage }] };
    case "50N": return { stages: [{ ...stage }] };
    case "51":  return { stages: [{ ...stage }] };
    case "51N": return { stages: [{ ...stage }] };
    case "67":  return { stages: [{ ...stage }] };
    case "67N": return { stages: [{ ...stage }] };
    case "27":  return { stages27: [{ ...stage }] };
    case "59":  return { stages59: [{ ...stage }] };
    case "47":  return { stages: [{ ...stage }] };
    case "81U": return { stages81u: [{ ...stage }] };
    case "81O": return { stages81o: [{ ...stage }] };
    default:    return { stages: [{ ...stage }] };
  }
}

// Extract current stage values from patch for a function
function extractStage(fnId, patch) {
  const entry = patch?.[fnId];
  if (!entry) return defaultStage(fnId);
  const arr =
    entry.stages81u || entry.stages81o ||
    entry.stages27 || entry.stages59 ||
    entry.stages || [];
  return (arr[0] && typeof arr[0] === "object") ? { ...arr[0] } : defaultStage(fnId);
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validate a single field value for a function.
 * Returns error string or null.
 */
function validateField(fnId, field, value) {
  const v = parseFloat(value);
  if (isNaN(v)) return "Valor inválido";

  if (field === "pickup") {
    if (fnId === "47") {
      if (v <= 0 || v > 1) return "Pickup deve ser entre 0 e 1 pu";
    } else if (fnId === "27" || fnId === "59") {
      if (v <= 0 || v >= 150) return "Pickup deve ser entre 0 e 150 V";
    } else if (fnId === "81U" || fnId === "81O") {
      if (v < 45 || v > 65) return "Pickup deve ser entre 45 e 65 Hz";
    } else {
      if (v <= 0) return "Pickup deve ser > 0";
      if (v >= 100) return "Pickup deve ser < 100 A";
    }
  }
  if (field === "timeDial") {
    if (v < 0.05 || v > 10) return "timeDial deve ser entre 0.05 e 10";
  }
  if (field === "mta") {
    if (v < 0 || v > 180) return "MTA deve ser entre 0 e 180°";
  }
  if (field === "vPol") {
    if (v < 0 || v > 150) return "V_pol deve ser entre 0 e 150 V";
  }
  return null;
}

// ---------------------------------------------------------------------------
// FnButton — memoized toggle button
// ---------------------------------------------------------------------------

const FnButton = memo(function FnButton({ fn, enabled, selected, onToggle, onSelect }) {
  return (
    <div style={styles.fnRow}>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`${enabled ? "Desativar" : "Ativar"} função ${fn.label}`}
        style={{
          ...styles.toggleBtn,
          ...(enabled ? styles.toggleBtnOn : styles.toggleBtnOff),
        }}
        onClick={() => onToggle(fn.id)}
        title={enabled ? "Clique para desativar" : "Clique para ativar"}
      >
        <span style={styles.toggleDot} />
      </button>
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Configurar ${fn.label} — ${fn.name}`}
        style={{
          ...styles.fnBtn,
          ...(selected ? styles.fnBtnSelected : {}),
          ...(enabled ? {} : styles.fnBtnDisabled),
        }}
        onClick={() => onSelect(fn.id)}
        title={fn.name}
      >
        <span style={styles.fnCode}>{fn.label}</span>
        <span style={styles.fnName}>{fn.name}</span>
      </button>
    </div>
  );
});

// ---------------------------------------------------------------------------
// FormField — labeled input with error badge
// ---------------------------------------------------------------------------

function FormField({ label, id, children, error }) {
  return (
    <div style={styles.formField}>
      <label htmlFor={id} style={styles.formLabel}>{label}</label>
      {children}
      {error && (
        <div role="alert" style={styles.errorBadge} title={error}>
          {error}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FormPane — fields for the selected function
// ---------------------------------------------------------------------------

function FormPane({ fnId, stage, disabled, onFieldChange, fieldErrors }) {
  const isDisabled = disabled;

  const numInput = (field, label, min, max, step, unit) => (
    <FormField label={`${label}${unit ? ` (${unit})` : ""}`} id={`pcfg-${fnId}-${field}`} error={fieldErrors[field]}>
      <input
        id={`pcfg-${fnId}-${field}`}
        type="number"
        min={min}
        max={max}
        step={step}
        value={stage[field] ?? ""}
        disabled={isDisabled}
        aria-describedby={fieldErrors[field] ? `err-${fnId}-${field}` : undefined}
        style={{
          ...styles.numInput,
          ...(fieldErrors[field] ? styles.numInputError : {}),
          ...(isDisabled ? styles.inputDisabled : {}),
        }}
        onChange={(e) => onFieldChange(field, e.target.value)}
      />
    </FormField>
  );

  const curveSelect = () => (
    <FormField label="Curva" id={`pcfg-${fnId}-curve`} error={fieldErrors.curve}>
      <select
        id={`pcfg-${fnId}-curve`}
        value={stage.curve ?? CURVE_OPTIONS[0]}
        disabled={isDisabled}
        style={{
          ...styles.selectInput,
          ...(isDisabled ? styles.inputDisabled : {}),
        }}
        onChange={(e) => onFieldChange("curve", e.target.value)}
      >
        {CURVE_OPTIONS.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </FormField>
  );

  switch (fnId) {
    case "50":
    case "50N":
      return (
        <div style={styles.formGroup}>
          {numInput("pickup", "Pickup", 0.1, 100, 0.1, "A")}
        </div>
      );

    case "51":
    case "51N":
      return (
        <div style={styles.formGroup}>
          {numInput("pickup", "Pickup", 0.1, 100, 0.1, "A")}
          {numInput("timeDial", "Time Dial", 0.05, 10, 0.05, "")}
          {curveSelect()}
        </div>
      );

    case "67":
    case "67N":
      return (
        <div style={styles.formGroup}>
          {numInput("pickup", "Pickup", 0.1, 100, 0.1, "A")}
          {numInput("mta", "MTA", 0, 180, 1, "°")}
          {numInput("vPol", "V_pol", 0, 150, 0.1, "V")}
        </div>
      );

    case "27":
    case "59":
      return (
        <div style={styles.formGroup}>
          {numInput("pickup", "Pickup", 0, 150, 0.1, "V")}
        </div>
      );

    case "47":
      return (
        <div style={styles.formGroup}>
          {numInput("pickup", "Pickup", 0, 1, 0.01, "pu")}
        </div>
      );

    case "81U":
      return (
        <div style={styles.formGroup}>
          {numInput("pickup", "Pickup", 45, 65, 0.01, "Hz")}
          {numInput("timeDial", "Time Dial", 0.05, 10, 0.05, "s")}
        </div>
      );

    case "81O":
      return (
        <div style={styles.formGroup}>
          {numInput("pickup", "Pickup", 45, 65, 0.01, "Hz")}
          {numInput("timeDial", "Time Dial", 0.05, 10, 0.05, "s")}
        </div>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// ProtectionConfigurator — main export
// ---------------------------------------------------------------------------

export default function ProtectionConfigurator({ fns, patch, onFnsChange, onPatchChange }) {
  const [selectedFn, setSelectedFn] = useState(null);
  // Local field error state — does NOT propagate to parent
  const [fieldErrors, setFieldErrors] = useState({});

  // Memoized check: is a function currently enabled?
  const fnEnabled = useMemo(() => {
    const set = new Set(Array.isArray(fns) ? fns : []);
    return (id) => set.has(id);
  }, [fns]);

  // Toggle a function on/off
  const handleToggle = useCallback((id) => {
    const current = Array.isArray(fns) ? fns : [];
    const isOn = current.includes(id);
    let nextFns;
    let nextPatch = { ...(patch || {}) };

    if (isOn) {
      nextFns = current.filter((f) => f !== id);
      delete nextPatch[id];
    } else {
      nextFns = [...current, id];
      // Add default patch entry if not already present
      if (!nextPatch[id]) {
        nextPatch[id] = buildPatchEntry(id, defaultStage(id));
      }
    }

    onFnsChange?.(nextFns);
    onPatchChange?.(nextPatch);

    // Clear field errors when toggling off
    if (isOn && selectedFn === id) {
      setSelectedFn(null);
      setFieldErrors({});
    }
  }, [fns, patch, selectedFn, onFnsChange, onPatchChange]);

  // Select a function for editing
  const handleSelect = useCallback((id) => {
    setSelectedFn((prev) => prev === id ? null : id);
    setFieldErrors({});
  }, []);

  // Handle field change — validate locally, emit only if valid
  const handleFieldChange = useCallback((field, rawValue) => {
    if (!selectedFn) return;

    const error = validateField(selectedFn, field, rawValue);
    setFieldErrors((prev) => ({ ...prev, [field]: error || undefined }));

    if (error) return; // Do not emit invalid value

    const v = field === "curve" ? rawValue : parseFloat(rawValue);
    const currentStage = extractStage(selectedFn, patch);
    const nextStage = { ...currentStage, [field]: v };
    const nextPatch = {
      ...(patch || {}),
      [selectedFn]: buildPatchEntry(selectedFn, nextStage),
    };
    onPatchChange?.(nextPatch);
  }, [selectedFn, patch, onPatchChange]);

  const selectedStage = selectedFn ? extractStage(selectedFn, patch) : null;
  const selectedEnabled = selectedFn ? fnEnabled(selectedFn) : false;

  return (
    <div style={styles.root} role="region" aria-label="Configurador de Proteções">
      {/* Function rail */}
      <div
        style={styles.rail}
        role="group"
        aria-label="Funções de proteção"
      >
        <div style={styles.railHeader}>Funções</div>
        {ALL_FNS.map((fn) => (
          <FnButton
            key={fn.id}
            fn={fn}
            enabled={fnEnabled(fn.id)}
            selected={selectedFn === fn.id}
            onToggle={handleToggle}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Form pane */}
      <div style={styles.pane} aria-live="polite">
        {selectedFn ? (
          <>
            <div style={styles.paneHeader}>
              <div style={styles.paneTitle}>
                {ALL_FNS.find((f) => f.id === selectedFn)?.label}
                <span style={styles.paneName}>
                  {" "}— {ALL_FNS.find((f) => f.id === selectedFn)?.name}
                </span>
              </div>
              {!selectedEnabled && (
                <div style={styles.disabledBadge} role="status">
                  Desativada
                </div>
              )}
            </div>
            <div style={styles.paneContent}>
              <FormPane
                fnId={selectedFn}
                stage={selectedStage}
                disabled={!selectedEnabled}
                onFieldChange={handleFieldChange}
                fieldErrors={fieldErrors}
              />
            </div>
          </>
        ) : (
          <div style={styles.paneEmpty}>
            Selecione uma função para configurar seus parâmetros.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  root: {
    display: "flex",
    flexDirection: "row",
    height: "100%",
    background: "var(--card)",
    borderRadius: "var(--r)",
    overflow: "hidden",
  },
  rail: {
    width: 160,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid var(--bdr)",
    overflowY: "auto",
    overflowX: "hidden",
  },
  railHeader: {
    padding: "10px 12px 6px",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--tx3)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    borderBottom: "1px solid var(--bdr)",
    flexShrink: 0,
  },
  fnRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 8px",
    borderBottom: "1px solid rgba(255,255,255,.03)",
  },
  toggleBtn: {
    width: 26,
    height: 14,
    borderRadius: 7,
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: "0 2px",
    flexShrink: 0,
    transition: "background .15s",
  },
  toggleBtnOn: {
    background: "var(--orange)",
    justifyContent: "flex-end",
  },
  toggleBtnOff: {
    background: "var(--card4, #2C2F38)",
    justifyContent: "flex-start",
  },
  toggleDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#fff",
    flexShrink: 0,
  },
  fnBtn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "4px 6px",
    borderRadius: 6,
    transition: "background .15s",
    textAlign: "left",
    minWidth: 0,
  },
  fnBtnSelected: {
    background: "var(--orange-dim, rgba(249,115,22,.12))",
    outline: "1px solid rgba(249,115,22,.3)",
  },
  fnBtnDisabled: {
    opacity: 0.45,
  },
  fnCode: {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--tx)",
    letterSpacing: 0.5,
    lineHeight: 1.2,
  },
  fnName: {
    fontSize: 9,
    fontWeight: 500,
    fontFamily: "var(--fi)",
    color: "var(--tx3)",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 88,
  },
  pane: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  paneHeader: {
    padding: "10px 14px",
    borderBottom: "1px solid var(--bdr)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  paneTitle: {
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--tx)",
    letterSpacing: 0.5,
  },
  paneName: {
    fontWeight: 400,
    fontSize: 12,
    color: "var(--tx2)",
  },
  disabledBadge: {
    fontSize: 9,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--tx3)",
    background: "var(--card2)",
    border: "1px solid var(--bdr)",
    borderRadius: 4,
    padding: "2px 6px",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  paneContent: {
    flex: 1,
    overflow: "auto",
    padding: "12px 14px",
  },
  paneEmpty: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    color: "var(--tx3)",
    fontFamily: "var(--fi)",
    padding: 20,
    textAlign: "center",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: 600,
    fontFamily: "var(--fi)",
    color: "var(--tx3)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  numInput: {
    width: "100%",
    padding: "7px 10px",
    background: "var(--card2)",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    color: "var(--cyan)",
    fontSize: 13,
    fontFamily: "var(--fm)",
    fontWeight: 600,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color .15s",
  },
  numInputError: {
    borderColor: "var(--red, #f87171)",
    boxShadow: "0 0 0 2px rgba(248,113,113,.18)",
  },
  selectInput: {
    width: "100%",
    padding: "7px 10px",
    background: "var(--card2)",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    color: "var(--tx)",
    fontSize: 11,
    fontFamily: "var(--fi)",
    fontWeight: 500,
    outline: "none",
    boxSizing: "border-box",
    cursor: "pointer",
  },
  inputDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  errorBadge: {
    fontSize: 10,
    color: "var(--red, #f87171)",
    fontFamily: "var(--fi)",
    fontWeight: 500,
    padding: "3px 6px",
    background: "rgba(248,113,113,.1)",
    borderRadius: 4,
    border: "1px solid rgba(248,113,113,.2)",
    lineHeight: 1.3,
  },
};
