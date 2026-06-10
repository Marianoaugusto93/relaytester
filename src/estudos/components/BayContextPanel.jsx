/**
 * BayContextPanel.jsx — Sticky sidebar for Bay context editing
 *
 * Displays and allows editing of shared electrical parameters:
 * - Nominal voltage (Vn)
 * - TC ratio (primary/secondary)
 * - TP ratio (primary/secondary)
 * - System frequency
 * - System grounding method
 *
 * Position: sticky right sidebar, 300px width
 * Syncs with BayContext and localStorage automatically
 */

import { useState, useEffect } from "react";
import { useBay } from "../context/BayContext.jsx";
import { useArtifactBus } from "../context/ArtifactBus.jsx";
import ArtifactList from "./ArtifactList.jsx";
import NotesPanel from "./NotesPanel.jsx";

const GROUNDING_OPTIONS = [
  { value: "solidly", label: "Solidamente Aterrado" },
  { value: "high-z", label: "Alto-Z" },
  { value: "low-z", label: "Baixo-Z" },
  { value: "ungrounded", label: "Isolado" },
];

const CONNECTION_OPTIONS = [
  { value: "Y", label: "Estrela (Y)" },
  { value: "Δ", label: "Delta (Δ)" },
];

/**
 * Right-drawer tabs (Workbench-lite v2 / Track 3).
 *  - "bay"       Bay context editor
 *  - "artefatos" Artifact history strip (wildcard "*.result" subscriber)
 *  - "notas"     Per-tool scratchpad persisted to localStorage
 */
const DRAWER_TABS = [
  { id: "bay", label: "Bay" },
  { id: "artefatos", label: "Artefatos" },
  { id: "notas", label: "Notas" },
];

export default function BayContextPanel({ embedded = false, activeToolId = null, activeToolName = null, onArtifactOpen = null }) {
  const { bay, setBay } = useBay();
  const bus = useArtifactBus();
  const [edited, setEdited] = useState(false);
  const [activeTab, setActiveTab] = useState("bay");
  const [artifacts, setArtifacts] = useState([]);

  // Subscribe to wildcard bus topic; collect *.result publications (max 10)
  useEffect(() => {
    const unsubscribe = bus.subscribe("*", (topic, data) => {
      if (typeof topic !== "string" || !topic.endsWith(".result")) return;
      const toolId = topic.split(".")[0];
      setArtifacts((prev) =>
        [
          { topic, data, timestamp: Date.now(), toolId },
          ...prev,
        ].slice(0, 10)
      );
    });
    return unsubscribe;
  }, [bus]);

  const handleDiscard = (key) => {
    setArtifacts((prev) => prev.filter((a) => a.timestamp + a.topic !== key));
  };

  const handleOpenArtifact = (artifact) => {
    onArtifactOpen?.(artifact);
  };

  const handleChange = (field, value) => {
    const numValue = isNaN(value) ? value : parseFloat(value);
    let updatedBay = bay;

    if (field === "vn") {
      updatedBay = { ...bay, vn: numValue };
    } else if (field === "freq") {
      updatedBay = { ...bay, freq: numValue };
    } else if (field === "sBase") {
      updatedBay = { ...bay, sBase: numValue };
    } else if (field === "grounding") {
      updatedBay = { ...bay, grounding: numValue };
    } else if (field === "connection") {
      updatedBay = { ...bay, systemConnection: numValue };
    } else if (field.startsWith("tc.")) {
      const subfield = field.split(".")[1];
      updatedBay = {
        ...bay,
        tc: { ...bay.tc, [subfield]: numValue },
      };
    } else if (field.startsWith("tp.")) {
      const subfield = field.split(".")[1];
      updatedBay = {
        ...bay,
        tp: { ...bay.tp, [subfield]: numValue },
      };
    }

    setBay(updatedBay);
    setEdited(true);
  };

  const handleReset = () => {
    // Reset to defaults from context
    setEdited(false);
  };

  const rootStyle = embedded ? styles.rootEmbedded : styles.root;

  return (
    <div style={rootStyle}>
      {/* Tab bar */}
      <div style={styles.tabBar} role="tablist" aria-label="Painéis laterais">
        {DRAWER_TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setActiveTab(t.id)}
              style={{
                ...styles.tabBtn,
                ...(active ? styles.tabBtnActive : {}),
              }}
            >
              {t.label}
              {t.id === "bay" && edited && <span style={styles.tabDot} aria-hidden="true">●</span>}
            </button>
          );
        })}
      </div>

      {activeTab === "artefatos" && (
        <ArtifactList
          artifacts={artifacts}
          onOpen={handleOpenArtifact}
          onDiscard={handleDiscard}
        />
      )}

      {activeTab === "notas" && (
        <NotesPanel
          activeToolId={activeToolId}
          activeToolName={activeToolName}
        />
      )}

      {activeTab === "bay" && (
      <>
      {/* Content */}
      <div style={styles.content}>
        {/* System Section */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Sistema</div>

          <InputField
            label="Tensão Nominal (kV)"
            value={bay.vn}
            onChange={(v) => handleChange("vn", v)}
            placeholder="66.4"
          />

          <InputField
            label="Base Potência (MVA)"
            value={bay.sBase}
            onChange={(v) => handleChange("sBase", v)}
            placeholder="100"
          />

          <InputField
            label="Frequência (Hz)"
            value={bay.freq}
            onChange={(v) => handleChange("freq", v)}
            placeholder="60"
          />

          <SelectField
            label="Aterramento"
            value={bay.grounding}
            options={GROUNDING_OPTIONS}
            onChange={(v) => handleChange("grounding", v)}
          />

          <SelectField
            label="Conexão"
            value={bay.systemConnection}
            options={CONNECTION_OPTIONS}
            onChange={(v) => handleChange("connection", v)}
          />
        </div>

        {/* TC Section */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>TC (Primário/Secundário)</div>

          <InputField
            label="Primário (A)"
            value={bay.tc.priA}
            onChange={(v) => handleChange("tc.priA", v)}
            placeholder="600"
          />

          <InputField
            label="Secundário (A)"
            value={bay.tc.secA}
            onChange={(v) => handleChange("tc.secA", v)}
            placeholder="5"
          />

          {bay.tc.secA !== 0 && (
            <div style={styles.ratio}>
              Relação: {(bay.tc.priA / bay.tc.secA).toFixed(1)}:1
            </div>
          )}
        </div>

        {/* TP Section */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>TP (Primário/Secundário)</div>

          <InputField
            label="Primário (V)"
            value={bay.tp.priV}
            onChange={(v) => handleChange("tp.priV", v)}
            placeholder="66400"
          />

          <InputField
            label="Secundário (V)"
            value={bay.tp.secV}
            onChange={(v) => handleChange("tp.secV", v)}
            placeholder="110"
          />

          {bay.tp.secV !== 0 && (
            <div style={styles.ratio}>
              Relação: {(bay.tp.priV / bay.tp.secV).toFixed(1)}:1
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        {edited && (
          <button style={styles.resetBtn} onClick={handleReset}>
            Recarregar
          </button>
        )}
      </div>
      </>
      )}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={styles.input}
      />
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.select}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const styles = {
  root: {
    position: "sticky",
    right: 0,
    top: 0,
    width: 300,
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "var(--card)",
    borderLeft: "1px solid var(--bdr)",
    overflow: "hidden",
    zIndex: 10,
  },
  rootEmbedded: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "transparent",
    overflow: "hidden",
  },
  tabBar: {
    display: "flex",
    gap: 2,
    padding: "6px 8px",
    borderBottom: "1px solid var(--bdr)",
    background: "var(--card2)",
    flexShrink: 0,
  },
  tabBtn: {
    flex: 1,
    padding: "6px 8px",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    background: "var(--card)",
    color: "var(--tx3)",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    textTransform: "uppercase",
    letterSpacing: 1,
    cursor: "pointer",
    transition: "all .12s",
    position: "relative",
  },
  tabBtnActive: {
    background: "var(--cyan-dim)",
    color: "var(--cyan)",
    borderColor: "rgba(14,165,233,0.4)",
  },
  tabDot: {
    marginLeft: 4,
    color: "var(--cyan)",
    fontSize: 8,
  },
  placeholder: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    textAlign: "center",
    gap: 8,
  },
  placeholderTitle: {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--tx2)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  placeholderHint: {
    fontSize: 11,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
    lineHeight: 1.5,
    maxWidth: 220,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid var(--bdr)",
    flexShrink: 0,
  },
  title: {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--tx3)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  edited: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--cyan)",
    animation: "pulse 2s infinite",
  },
  content: {
    flex: 1,
    overflow: "auto",
    padding: "12px",
  },
  section: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1px solid var(--bdr2)",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--tx3)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  field: {
    marginBottom: 10,
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--tx3)",
    marginBottom: 4,
    fontFamily: "var(--fm)",
  },
  input: {
    width: "100%",
    padding: "6px 8px",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    background: "var(--card2)",
    color: "var(--tx)",
    fontSize: 11,
    fontFamily: "var(--fm)",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "6px 8px",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    background: "var(--card2)",
    color: "var(--tx)",
    fontSize: 11,
    fontFamily: "var(--fm)",
    boxSizing: "border-box",
  },
  ratio: {
    fontSize: 10,
    color: "var(--cyan)",
    marginTop: 4,
    fontFamily: "var(--fm)",
  },
  footer: {
    padding: "8px 12px",
    borderTop: "1px solid var(--bdr)",
    flexShrink: 0,
  },
  resetBtn: {
    width: "100%",
    padding: "6px",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    background: "var(--card2)",
    color: "var(--tx3)",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    transition: "all .15s",
  },
};
