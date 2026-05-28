/**
 * VisualScenarioBuilder.jsx — Top-level Visual Scenario Editor for Phase 10.
 *
 * Composes PhasorWheel, ProtectionConfigurator, ScenarioPreview, EditorToolbar,
 * RXPlane, and TCCPlot into a 3-column sandboxed editor.
 *
 * State machine: single useReducer with actions SET_PHASOR, SET_PATCH, SET_FNS, LOAD, RESET.
 * Fully sandboxed — no direct mutation of App.jsx phasor/protection state.
 *
 * Publishes to ArtifactBus topic "artifact.sendToRele" on Send to Relay (protections + phasors).
 */

import { useReducer, useCallback, useMemo, useState, useRef, memo, useEffect } from "react";
import PhasorWheel from "./PhasorWheel.jsx";
import ProtectionConfigurator from "./ProtectionConfigurator.jsx";
import RXPlane from "./RXPlane.jsx";
import TCCPlot from "../tools/TCCPlot.jsx";
import { validateScenario } from "../engine/scenarioValidator.js";
import { normalizeScenario } from "../engine/scenarioValidator.js";
import { saveCustomScenario, exportScenarioAsJson, importScenarioFromFile, getAllCustomScenarios } from "../../scenarios/customScenarios.js";
import { useArtifactBus } from "../context/ArtifactBus.jsx";
import { recordScenarioUsage, recordAction, recordError } from "../utils/analyticsEngine.js";
import { loadAnalytics, saveAnalytics } from "../utils/analyticsStorage.js";

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

function makeDefaultPhasors() {
  return {
    currents: {
      Ia: { mag: 5.0, ang: 0 },
      Ib: { mag: 5.0, ang: -120 },
      Ic: { mag: 5.0, ang: 120 },
    },
    voltages: {
      Va: { mag: 66.4, ang: 0 },
      Vb: { mag: 66.4, ang: -120 },
      Vc: { mag: 66.4, ang: 120 },
    },
  };
}

function makeDefaultScenario() {
  return normalizeScenario({
    name: "Novo Cenário",
    description: "",
    phasors: makeDefaultPhasors(),
    fns: [],
    patch: {},
  });
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function reducer(state, action) {
  switch (action.type) {
    case "SET_PHASOR":
      return { ...state, phasors: action.payload, dirty: true };
    case "SET_PATCH":
      return { ...state, patch: action.payload, dirty: true };
    case "SET_FNS":
      return { ...state, fns: action.payload, dirty: true };
    case "SET_NAME":
      return { ...state, name: action.payload, dirty: true };
    case "SET_DESC":
      return { ...state, description: action.payload, dirty: true };
    case "LOAD":
      return { ...normalizeScenario(action.payload), dirty: false };
    case "RESET":
      return { ...makeDefaultScenario(), dirty: false };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Toast notification
// ---------------------------------------------------------------------------

function Toast({ message, type }) {
  if (!message) return null;
  const bg = type === "error" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.12)";
  const border = type === "error" ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.3)";
  const color = type === "error" ? "#ef4444" : "#4ade80";
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        background: bg,
        border: `1px solid ${border}`,
        color,
        borderRadius: 8,
        padding: "10px 18px",
        fontSize: 13,
        fontFamily: "var(--fm)",
        fontWeight: 600,
        zIndex: 9999,
        pointerEvents: "none",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScenarioPreview — mini right panel
// ---------------------------------------------------------------------------

const ScenarioPreview = memo(function ScenarioPreview({ scenario, validation }) {
  const { phasors, fns, name } = scenario;
  const { currents, voltages } = phasors || {};

  const rows = [
    { label: "Ia", val: currents?.Ia, unit: "A" },
    { label: "Ib", val: currents?.Ib, unit: "A" },
    { label: "Ic", val: currents?.Ic, unit: "A" },
    { label: "Va", val: voltages?.Va, unit: "V" },
    { label: "Vb", val: voltages?.Vb, unit: "V" },
    { label: "Vc", val: voltages?.Vc, unit: "V" },
  ];

  return (
    <div style={S.preview}>
      <div style={S.previewTitle}>Pré-visualização</div>

      {/* Scenario name */}
      <div style={S.previewName}>{name || "—"}</div>

      {/* Phasor values table */}
      <div style={S.previewTable}>
        {rows.map(({ label, val, unit }) => (
          <div key={label} style={S.previewRow}>
            <span style={S.previewRowLabel}>{label}</span>
            <span style={S.previewRowVal}>
              {val ? `${val.mag.toFixed(2)} ${unit} ∠${val.ang.toFixed(1)}°` : "—"}
            </span>
          </div>
        ))}
      </div>

      {/* Active functions */}
      <div style={S.previewSection}>
        <div style={S.previewSectionTitle}>Funções Ativas</div>
        {fns && fns.length > 0 ? (
          <div style={S.fnPills}>
            {fns.map(fn => (
              <span key={fn} style={S.fnPill}>{fn}</span>
            ))}
          </div>
        ) : (
          <div style={S.previewEmpty}>Nenhuma função ativa</div>
        )}
      </div>

      {/* Validation status */}
      {!validation.ok && (
        <div style={S.validationErrors}>
          {validation.errors.slice(0, 2).map((e, i) => (
            <div key={i} style={S.validationError}>{e}</div>
          ))}
        </div>
      )}
      {validation.ok && (
        <div style={S.validationOk}>Cenário válido</div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// EditorToolbar — save/export/import/reset/sendToRelay buttons
// ---------------------------------------------------------------------------

const EditorToolbar = memo(function EditorToolbar({
  onSave, onExport, onImport, onReset, onSendToRelay,
  canSave, dirty,
}) {
  const fileRef = useRef(null);

  return (
    <div style={S.toolbar}>
      <button
        style={{ ...S.tbBtn, ...S.tbBtnPrimary, ...(canSave ? {} : S.tbBtnDisabled) }}
        onClick={onSave}
        disabled={!canSave}
        title={canSave ? "Salvar cenário" : "Corrija os erros antes de salvar"}
        aria-disabled={!canSave}
      >
        Salvar{dirty ? " *" : ""}
      </button>

      <button
        style={S.tbBtn}
        onClick={onExport}
        title="Exportar como JSON"
      >
        Exportar
      </button>

      <button
        style={S.tbBtn}
        onClick={() => fileRef.current?.click()}
        title="Importar de JSON"
      >
        Importar
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={onImport}
        />
      </button>

      <button
        style={{ ...S.tbBtn, ...S.tbBtnRelay }}
        onClick={onSendToRelay}
        title="Enviar cenário ao Relé (ArtifactBus)"
      >
        Enviar ao Relé
      </button>

      <button
        style={{ ...S.tbBtn, ...S.tbBtnDanger }}
        onClick={onReset}
        title="Resetar todos os campos"
      >
        Resetar
      </button>
    </div>
  );
});

// ---------------------------------------------------------------------------
// GraphContainer — tabbed RXPlane / TCCPlot
// ---------------------------------------------------------------------------

function buildCurveDefs(fns, patch) {
  if (!fns || !patch) return [];
  const defs = [];
  const timeFns = ["51", "51N", "67", "67N"];
  for (const fn of fns) {
    if (!timeFns.includes(fn)) continue;
    const entry = patch[fn];
    if (!entry) continue;
    const arr = entry.stages || [];
    if (!arr[0]) continue;
    const st = arr[0];
    defs.push({
      id: `${fn}-1`,
      fn,
      label: `${fn}-1`,
      pickup: st.pickup || 1.0,
      timeDial: st.timeDial || 0.5,
      curveType: st.curve || "IEC - Standard Inverse",
    });
  }
  return defs;
}

function buildOperatingPoint(phasors) {
  if (!phasors?.currents?.Ia || !phasors?.voltages?.Va) return null;
  const Ia = phasors.currents.Ia.mag;
  const Va = phasors.voltages.Va.mag;
  if (Ia <= 0 || Va <= 0) return null;
  // Simplified Z = V/I as a representative point
  const Z = Va / Ia;
  return { r: Z * 0.8, x: Z * 0.6 };
}

function GraphContainer({ fns, patch, phasors }) {
  const [activeTab, setActiveTab] = useState("rx");

  const curveDefs = useMemo(() => buildCurveDefs(fns, patch), [fns, patch]);
  const operatingPoint = useMemo(() => buildOperatingPoint(phasors), [phasors]);

  const tabs = [
    { id: "rx", label: "Plano R-X" },
    { id: "tcc", label: "Sobreposição TCC" },
  ];

  return (
    <div style={S.graphContainer}>
      <div style={S.graphTabs}>
        {tabs.map(t => (
          <button
            key={t.id}
            style={{ ...S.graphTab, ...(activeTab === t.id ? S.graphTabActive : {}) }}
            onClick={() => setActiveTab(t.id)}
            aria-pressed={activeTab === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={S.graphContent}>
        {activeTab === "rx" && (
          <div style={S.graphScroll}>
            <RXPlane
              zones={{}}
              operatingPoint={operatingPoint}
              scale={1.0}
            />
          </div>
        )}
        {activeTab === "tcc" && (
          <div style={S.graphScroll}>
            <TCCPlot
              curveDefs={curveDefs}
              showCoordination={curveDefs.length >= 2}
              userTrips={[]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LoadScenarioPanel — load from saved custom scenarios
// ---------------------------------------------------------------------------

function LoadScenarioPanel({ onLoad }) {
  const [open, setOpen] = useState(false);
  const saved = useMemo(() => getAllCustomScenarios(), [open]);

  if (!open) {
    return (
      <button style={S.loadBtn} onClick={() => setOpen(true)}>
        Carregar Salvo
      </button>
    );
  }

  return (
    <div style={S.loadPanel}>
      <div style={S.loadPanelHeader}>
        <span style={S.loadPanelTitle}>Cenários Salvos</span>
        <button style={S.loadPanelClose} onClick={() => setOpen(false)}>×</button>
      </div>
      {saved.length === 0 && (
        <div style={S.loadPanelEmpty}>Nenhum cenário salvo.</div>
      )}
      {saved.map(s => (
        <button
          key={s.id}
          style={S.loadItem}
          onClick={() => { onLoad(s); setOpen(false); }}
        >
          <span style={S.loadItemName}>{s.name}</span>
          <span style={S.loadItemDesc}>{s.description || "—"}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// VisualScenarioBuilder — main export
// ---------------------------------------------------------------------------

export default function VisualScenarioBuilder() {
  const [state, dispatch] = useReducer(reducer, undefined, makeDefaultScenario);
  const [toast, setToast] = useState(null); // { message, type }
  const toastTimer = useRef(null);
  const [analytics, setAnalytics] = useState(() => loadAnalytics());
  const bus = useArtifactBus();

  useEffect(() => {
    saveAnalytics(analytics);
  }, [analytics]);

  const showToast = useCallback((message, type = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Validation runs on every state change
  const validation = useMemo(() => {
    return validateScenario({
      id: state.id,
      name: state.name,
      phasors: state.phasors,
      fns: state.fns,
      stages: state.stages || {},
    });
  }, [state.id, state.name, state.phasors, state.fns, state.stages]);

  // Callbacks
  const handlePhasorChange = useCallback((nextPhasors) => {
    dispatch({ type: "SET_PHASOR", payload: nextPhasors });
  }, []);

  const handleFnsChange = useCallback((nextFns) => {
    dispatch({ type: "SET_FNS", payload: nextFns });
  }, []);

  const handlePatchChange = useCallback((nextPatch) => {
    dispatch({ type: "SET_PATCH", payload: nextPatch });
  }, []);

  const handleNameChange = useCallback((e) => {
    dispatch({ type: "SET_NAME", payload: e.target.value });
  }, []);

  const handleDescChange = useCallback((e) => {
    dispatch({ type: "SET_DESC", payload: e.target.value });
  }, []);

  const handleSave = useCallback(() => {
    if (!validation.ok) {
      setAnalytics(a => recordError(a, "validation_failed"));
      return;
    }
    const normalized = normalizeScenario(state);
    const ok = saveCustomScenario(normalized);
    if (ok) {
      showToast("Cenário salvo");
      setAnalytics(a => recordAction(a, "save"));
      dispatch({ type: "LOAD", payload: normalized });
    } else {
      showToast("Falha ao salvar (armazenamento cheio?)", "error");
      setAnalytics(a => recordError(a, "save_failed"));
    }
  }, [state, validation.ok, showToast]);

  const handleExport = useCallback(() => {
    exportScenarioAsJson(normalizeScenario(state));
    showToast("Exportado");
    setAnalytics(a => recordAction(a, "export"));
  }, [state, showToast]);

  const handleImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const obj = await importScenarioFromFile(file);
      const scenario = Array.isArray(obj) ? obj[0] : obj;
      if (!scenario || typeof scenario !== "object") {
        showToast("Arquivo de cenário inválido", "error");
        setAnalytics(a => recordError(a, "import_invalid"));
        return;
      }
      dispatch({ type: "LOAD", payload: scenario });
      showToast("Importado com sucesso");
      setAnalytics(a => recordAction(a, "import"));
    } catch {
      showToast("Erro ao ler o arquivo", "error");
      setAnalytics(a => recordError(a, "import_error"));
    }
  }, [showToast]);

  const handleLoad = useCallback((scenario) => {
    dispatch({ type: "LOAD", payload: scenario });
    showToast("Cenário carregado");
  }, [showToast]);

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" });
    showToast("Editor resetado");
    setAnalytics(a => recordAction(a, "reset"));
  }, [showToast]);

  const handleSendToRelay = useCallback(() => {
    const normalized = normalizeScenario(state);
    bus.publish("artifact.sendToRele", {
      protections: normalized.patch,
      phasors: normalized.phasors,
    });
    showToast("Cenário enviado ao Relé");
    setAnalytics(a => {
      let updated = recordAction(a, "send_to_relay");
      if (normalized.id) {
        updated = recordScenarioUsage(updated, normalized.id, 0);
      }
      return updated;
    });
  }, [state, bus, showToast]);

  return (
    <div style={S.root}>
      {/* Header row */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.bar} />
          <div>
            <div style={S.title}>Editor Visual de Cenários</div>
            <div style={S.subtitle}>Crie e valide cenários de falta com diagrama fasorial interativo</div>
          </div>
        </div>
        <LoadScenarioPanel onLoad={handleLoad} />
      </div>

      {/* Name / description row */}
      <div style={S.metaRow}>
        <div style={S.metaField}>
          <label style={S.metaLabel} htmlFor="vse-name">Nome do Cenário *</label>
          <input
            id="vse-name"
            type="text"
            value={state.name || ""}
            onChange={handleNameChange}
            style={S.metaInput}
            placeholder="ex.: Falta Trifásica 5 A"
            maxLength={80}
          />
        </div>
        <div style={{ ...S.metaField, flex: 2 }}>
          <label style={S.metaLabel} htmlFor="vse-desc">Descrição</label>
          <input
            id="vse-desc"
            type="text"
            value={state.description || ""}
            onChange={handleDescChange}
            style={S.metaInput}
            placeholder="Objetivo de aprendizagem ou notas..."
            maxLength={200}
          />
        </div>
      </div>

      {/* 3-column main area */}
      <div style={S.cols}>
        {/* Left: PhasorWheel (380px) */}
        <div style={S.colLeft}>
          <div style={S.colHeader}>Fasores</div>
          <div style={S.wheelWrap}>
            <PhasorWheel
              currents={state.phasors.currents}
              voltages={state.phasors.voltages}
              onChange={handlePhasorChange}
              maxI={10}
              maxV={80}
            />
          </div>
        </div>

        {/* Middle: ProtectionConfigurator (flex 1) */}
        <div style={S.colMid}>
          <div style={S.colHeader}>Funções de Proteção</div>
          <div style={S.protWrap}>
            <ProtectionConfigurator
              fns={state.fns}
              patch={state.patch}
              onFnsChange={handleFnsChange}
              onPatchChange={handlePatchChange}
            />
          </div>
        </div>

        {/* Right: Preview + Toolbar (320px) */}
        <div style={S.colRight}>
          <div style={S.colHeader}>Pré-visualização</div>
          <ScenarioPreview scenario={state} validation={validation} />
          <EditorToolbar
            canSave={validation.ok}
            dirty={state.dirty}
            onSave={handleSave}
            onExport={handleExport}
            onImport={handleImport}
            onReset={handleReset}
            onSendToRelay={handleSendToRelay}
          />
        </div>
      </div>

      {/* Graph section: tabbed RXPlane / TCCPlot */}
      <GraphContainer
        fns={state.fns}
        patch={state.patch}
        phasors={state.phasors}
      />

      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const S = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: "0 0 24px 0",
    minHeight: 0,
    fontFamily: "var(--fm)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  bar: {
    width: 4,
    height: 22,
    borderRadius: 2,
    background: "var(--orange)",
    flexShrink: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: 800,
    color: "var(--tx)",
    fontFamily: "var(--fh)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 10,
    color: "var(--tx3)",
    fontWeight: 500,
    marginTop: 1,
  },
  metaRow: {
    display: "flex",
    gap: 12,
    flexShrink: 0,
  },
  metaField: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--tx3)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "var(--fi)",
  },
  metaInput: {
    padding: "7px 10px",
    background: "var(--card2)",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    color: "var(--tx)",
    fontSize: 12,
    fontFamily: "var(--fm)",
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
  },
  cols: {
    display: "grid",
    gridTemplateColumns: "380px 1fr 320px",
    gap: 16,
    alignItems: "stretch",
    minHeight: 480,
  },
  colLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    background: "var(--card)",
    borderRadius: "var(--r)",
    border: "1px solid var(--bdr)",
    overflow: "hidden",
  },
  colMid: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    background: "var(--card)",
    borderRadius: "var(--r)",
    border: "1px solid var(--bdr)",
    overflow: "hidden",
  },
  colRight: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    background: "var(--card)",
    borderRadius: "var(--r)",
    border: "1px solid var(--bdr)",
    overflow: "hidden",
  },
  colHeader: {
    padding: "10px 14px 6px",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--tx3)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    borderBottom: "1px solid var(--bdr)",
    flexShrink: 0,
  },
  wheelWrap: {
    padding: "12px 16px 16px",
    display: "flex",
    justifyContent: "center",
    overflow: "auto",
  },
  protWrap: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  // Preview styles
  preview: {
    flex: 1,
    padding: "10px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    overflow: "auto",
  },
  previewTitle: {
    display: "none", // hidden: header row already shows the label
  },
  previewName: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--tx)",
    fontFamily: "var(--fh)",
  },
  previewTable: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    background: "var(--card2)",
    borderRadius: 6,
    padding: "6px 10px",
  },
  previewRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewRowLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
    width: 22,
  },
  previewRowVal: {
    fontSize: 10,
    color: "var(--tx2)",
    fontFamily: "var(--fm)",
  },
  previewSection: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  previewSectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "var(--tx3)",
    fontFamily: "var(--fh)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  fnPills: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
  },
  fnPill: {
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--orange)",
    background: "rgba(249,115,22,.12)",
    border: "1px solid rgba(249,115,22,.25)",
    borderRadius: 4,
    padding: "2px 6px",
    letterSpacing: 0.5,
  },
  previewEmpty: {
    fontSize: 10,
    color: "var(--tx3)",
    fontFamily: "var(--fi)",
  },
  validationErrors: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: "6px 8px",
    background: "rgba(239,68,68,0.07)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 6,
  },
  validationError: {
    fontSize: 10,
    color: "var(--red, #f87171)",
    fontFamily: "var(--fm)",
    lineHeight: 1.4,
  },
  validationOk: {
    fontSize: 10,
    color: "#4ade80",
    fontFamily: "var(--fm)",
    fontWeight: 600,
    padding: "4px 8px",
    background: "rgba(34,197,94,0.08)",
    border: "1px solid rgba(34,197,94,0.2)",
    borderRadius: 6,
  },

  // Toolbar styles
  toolbar: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "10px 14px 14px",
    borderTop: "1px solid var(--bdr)",
    flexShrink: 0,
  },
  tbBtn: {
    padding: "7px 10px",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    background: "var(--card2)",
    color: "var(--tx2)",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    textAlign: "center",
    transition: "all .15s",
    letterSpacing: 0.4,
  },
  tbBtnPrimary: {
    background: "rgba(249,115,22,.15)",
    border: "1px solid rgba(249,115,22,.3)",
    color: "var(--orange)",
  },
  tbBtnRelay: {
    background: "rgba(14,165,233,.12)",
    border: "1px solid rgba(14,165,233,.25)",
    color: "var(--cyan)",
  },
  tbBtnDanger: {
    color: "var(--tx3)",
  },
  tbBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },

  // Graph container
  graphContainer: {
    background: "var(--card)",
    border: "1px solid var(--bdr)",
    borderRadius: "var(--r)",
    overflow: "hidden",
    flexShrink: 0,
  },
  graphTabs: {
    display: "flex",
    gap: 0,
    borderBottom: "1px solid var(--bdr)",
    padding: "0 12px",
  },
  graphTab: {
    padding: "9px 16px",
    border: "none",
    background: "transparent",
    color: "var(--tx3)",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    borderBottom: "2px solid transparent",
    transition: "all .15s",
  },
  graphTabActive: {
    color: "var(--cyan)",
    borderBottom: "2px solid var(--cyan)",
  },
  graphContent: {
    padding: 16,
    overflow: "auto",
  },
  graphScroll: {
    overflow: "auto",
  },

  // Load panel
  loadBtn: {
    padding: "7px 14px",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    background: "var(--card2)",
    color: "var(--tx3)",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  loadPanel: {
    position: "relative",
    background: "var(--card2)",
    border: "1px solid var(--bdr)",
    borderRadius: 8,
    padding: "8px 0",
    minWidth: 220,
    maxWidth: 280,
    maxHeight: 300,
    overflow: "auto",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  },
  loadPanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 12px 8px",
    borderBottom: "1px solid var(--bdr)",
    marginBottom: 4,
  },
  loadPanelTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--tx3)",
    fontFamily: "var(--fh)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  loadPanelClose: {
    background: "transparent",
    border: "none",
    color: "var(--tx3)",
    fontSize: 16,
    cursor: "pointer",
    lineHeight: 1,
    padding: "0 4px",
  },
  loadPanelEmpty: {
    fontSize: 11,
    color: "var(--tx3)",
    padding: "8px 12px",
    fontFamily: "var(--fi)",
  },
  loadItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 1,
    width: "100%",
    padding: "7px 12px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
    transition: "background .1s",
  },
  loadItemName: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
  },
  loadItemDesc: {
    fontSize: 10,
    color: "var(--tx3)",
    fontFamily: "var(--fi)",
  },
};
