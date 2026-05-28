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

export default function BayContextPanel() {
  const { bay, setBay } = useBay();
  const [edited, setEdited] = useState(false);

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

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>Bay · Parâmetros</div>
        {edited && <div style={styles.edited}>●</div>}
      </div>

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
