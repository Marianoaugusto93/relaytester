/**
 * FaultStudyTool.jsx — Analyze short-circuit faults
 *
 * Input: Fault type (AG/BG/CG/AB/BC/CA/ABG/BCG/CAG/ABC)
 *        Pre-fault voltage, impedances Z1/Z0, fault resistance
 * Output: Phase currents and voltages at fault point
 * Integrates with ArtifactBus to send results to other tools
 */

import { useState } from "react";
import {
  calc3PhaseFault,
  calcAGFault,
  calcBGFault,
  calcCGFault,
  calcABFault,
  calcBCFault,
  calcCAFault,
  calcABGFault,
  calcBCGFault,
  calcCAGFault,
} from "../engine/faults.js";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

const FAULT_TYPES = [
  { id: "ABC", name: "3-Fase (ABC)" },
  { id: "AG", name: "Fase A para Terra" },
  { id: "BG", name: "Fase B para Terra" },
  { id: "CG", name: "Fase C para Terra" },
  { id: "AB", name: "Fase A-B" },
  { id: "BC", name: "Fase B-C" },
  { id: "CA", name: "Fase C-A" },
  { id: "ABG", name: "Fases A-B para Terra" },
  { id: "BCG", name: "Fases B-C para Terra" },
  { id: "CAG", name: "Fases C-A para Terra" },
];

const FAULT_CALC = {
  ABC: calc3PhaseFault,
  AG: calcAGFault,
  BG: calcBGFault,
  CG: calcCGFault,
  AB: calcABFault,
  BC: calcBCFault,
  CA: calcCAFault,
  ABG: calcABGFault,
  BCG: calcBCGFault,
  CAG: calcCAGFault,
};

export default function FaultStudyTool() {
  const bus = useArtifactBus();

  const [faultType, setFaultType] = useState("ABC");
  const [vf, setVf] = useState(66.4);
  const [z1_r, setZ1_r] = useState(0.3);
  const [z1_x, setZ1_x] = useState(1.2);
  const [z0_r, setZ0_r] = useState(0.5);
  const [z0_x, setZ0_x] = useState(3.0);
  const [rf, setRf] = useState(0);

  const [result, setResult] = useState(null);

  const handleCalculate = () => {
    try {
      const z1 = { r: z1_r, x: z1_x };
      const z0 = { r: z0_r, x: z0_x };
      const calcFn = FAULT_CALC[faultType];
      const res = calcFn(vf, z1, z0, rf);
      setResult(res);

      // Publish to bus
      bus.publish("fault.result", {
        faultType,
        vf,
        z1,
        z0,
        rf,
        result: res,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[FaultStudyTool]", e);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.title}>Cálculo de Faltas</div>

      {/* Input section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Parâmetros</div>

        <div style={styles.field}>
          <label style={styles.label}>Tipo de Falta</label>
          <select
            value={faultType}
            onChange={(e) => setFaultType(e.target.value)}
            style={styles.select}
          >
            {FAULT_TYPES.map((ft) => (
              <option key={ft.id} value={ft.id}>
                {ft.name}
              </option>
            ))}
          </select>
        </div>

        <NumberField
          label="Tensão Pré-Falta (V, sec)"
          value={vf}
          onChange={setVf}
        />

        <div style={styles.subsection}>
          <div style={styles.subsectionTitle}>Z₁ (Impedância Positiva)</div>
          <NumberField
            label="R (Ω)"
            value={z1_r}
            onChange={setZ1_r}
            step={0.01}
          />
          <NumberField
            label="X (Ω)"
            value={z1_x}
            onChange={setZ1_x}
            step={0.01}
          />
        </div>

        <div style={styles.subsection}>
          <div style={styles.subsectionTitle}>Z₀ (Impedância Zero)</div>
          <NumberField
            label="R (Ω)"
            value={z0_r}
            onChange={setZ0_r}
            step={0.01}
          />
          <NumberField
            label="X (Ω)"
            value={z0_x}
            onChange={setZ0_x}
            step={0.01}
          />
        </div>

        <NumberField
          label="Resistência de Falta (Ω)"
          value={rf}
          onChange={setRf}
          step={0.01}
        />

        <button style={styles.calcBtn} onClick={handleCalculate}>
          Calcular Falta
        </button>
      </div>

      {/* Results section */}
      {result && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Resultados</div>

          <div style={styles.subsection}>
            <div style={styles.subsectionTitle}>Correntes</div>
            <ResultRow
              label="Ia"
              mag={result.currents.Ia.mag}
              ang={result.currents.Ia.angDeg}
            />
            <ResultRow
              label="Ib"
              mag={result.currents.Ib.mag}
              ang={result.currents.Ib.angDeg}
            />
            <ResultRow
              label="Ic"
              mag={result.currents.Ic.mag}
              ang={result.currents.Ic.angDeg}
            />
          </div>

          <div style={styles.subsection}>
            <div style={styles.subsectionTitle}>Tensões</div>
            <ResultRow
              label="Va"
              mag={result.voltages.Va.mag}
              ang={result.voltages.Va.angDeg}
            />
            <ResultRow
              label="Vb"
              mag={result.voltages.Vb.mag}
              ang={result.voltages.Vb.angDeg}
            />
            <ResultRow
              label="Vc"
              mag={result.voltages.Vc.mag}
              ang={result.voltages.Vc.angDeg}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange, step = 0.1 }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        style={styles.input}
      />
    </div>
  );
}

function ResultRow({ label, mag, ang }) {
  return (
    <div style={styles.result}>
      <div style={styles.resultLabel}>{label}</div>
      <div style={styles.resultValue}>
        {mag.toFixed(4)} ∠ {ang.toFixed(2)}°
      </div>
    </div>
  );
}

const styles = {
  root: {
    padding: "20px",
    background: "var(--card)",
    borderRadius: 10,
    maxWidth: 520,
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
    fontFamily: "var(--fh)",
    color: "var(--tx)",
    marginBottom: 20,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: "1px solid var(--bdr)",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--tx3)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  subsection: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid var(--bdr2)",
  },
  subsectionTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
    marginBottom: 8,
    fontStyle: "italic",
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
    borderRadius: 4,
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
    borderRadius: 4,
    background: "var(--card2)",
    color: "var(--tx)",
    fontSize: 11,
    fontFamily: "var(--fm)",
    boxSizing: "border-box",
  },
  calcBtn: {
    width: "100%",
    padding: "8px",
    marginTop: 12,
    border: "1px solid var(--cyan)",
    borderRadius: 6,
    background: "rgba(14,165,233,0.08)",
    color: "var(--cyan)",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    transition: "all .2s",
  },
  result: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    fontSize: 11,
    borderBottom: "1px solid var(--bdr2)",
  },
  resultLabel: {
    fontWeight: 600,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
  },
  resultValue: {
    fontWeight: 700,
    color: "var(--cyan)",
    fontFamily: "var(--fm)",
  },
};
