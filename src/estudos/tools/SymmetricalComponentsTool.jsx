/**
 * SymmetricalComponentsTool.jsx — Transform 3-phase to sequence components
 *
 * Input: 3-phase current magnitudes and angles (Ia, Ib, Ic)
 * Output: Sequence components (I0, I1, I2) with magnitudes and angles
 * Uses Fortescue method (Method of Symmetrical Components)
 */

import { useState } from "react";
import { phaseToSeq } from "../engine/fortescue.js";
import { polar, mag, ang } from "../engine/complex.js";

const DEG = Math.PI / 180;

export default function SymmetricalComponentsTool() {
  const [ia_mag, setIa_mag] = useState(1);
  const [ia_ang, setIa_ang] = useState(0);
  const [ib_mag, setIb_mag] = useState(1);
  const [ib_ang, setIb_ang] = useState(-120);
  const [ic_mag, setIc_mag] = useState(1);
  const [ic_ang, setIc_ang] = useState(120);

  const [result, setResult] = useState(null);

  const handleCalculate = () => {
    const Ia = polar(ia_mag, ia_ang * DEG);
    const Ib = polar(ib_mag, ib_ang * DEG);
    const Ic = polar(ic_mag, ic_ang * DEG);

    try {
      const { I0, I1, I2 } = phaseToSeq(Ia, Ib, Ic);
      const I0_ang = (ang(I0) / DEG + 360) % 360;
      const I1_ang = (ang(I1) / DEG + 360) % 360;
      const I2_ang = (ang(I2) / DEG + 360) % 360;

      setResult({
        I0: { mag: mag(I0), ang: I0_ang },
        I1: { mag: mag(I1), ang: I1_ang },
        I2: { mag: mag(I2), ang: I2_ang },
      });
    } catch (e) {
      console.error("[SymmetricalComponentsTool]", e);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.title}>Componentes Simétricos</div>

      {/* Input section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Entrada: Correntes Trifásicas</div>

        <PhasorInput
          label="Ia"
          mag={ia_mag}
          onMagChange={setIa_mag}
          ang={ia_ang}
          onAngChange={setIa_ang}
        />
        <PhasorInput
          label="Ib"
          mag={ib_mag}
          onMagChange={setIb_mag}
          ang={ib_ang}
          onAngChange={setIb_ang}
        />
        <PhasorInput
          label="Ic"
          mag={ic_mag}
          onMagChange={setIc_mag}
          ang={ic_ang}
          onAngChange={setIc_ang}
        />

        <button style={styles.calcBtn} onClick={handleCalculate}>
          Calcular
        </button>
      </div>

      {/* Results section */}
      {result && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Saída: Componentes de Sequência</div>

          <ResultRow
            label="I₀ (Zero)"
            mag={result.I0.mag}
            ang={result.I0.ang}
          />
          <ResultRow
            label="I₁ (Positiva)"
            mag={result.I1.mag}
            ang={result.I1.ang}
          />
          <ResultRow
            label="I₂ (Negativa)"
            mag={result.I2.mag}
            ang={result.I2.ang}
          />

          {/* Symmetry indicator */}
          <div style={styles.info}>
            <div style={styles.infoLabel}>
              Simetria: {(result.I1.mag / ((result.I0.mag + result.I1.mag + result.I2.mag) / 3 || 1)).toFixed(3)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhasorInput({ label, mag, onMagChange, ang, onAngChange }) {
  return (
    <div style={styles.phasorInput}>
      <div style={styles.label}>{label}</div>
      <input
        type="number"
        value={mag}
        onChange={(e) => onMagChange(parseFloat(e.target.value) || 0)}
        step="0.01"
        style={styles.input}
        placeholder="Mag"
      />
      <span style={styles.unit}>∠</span>
      <input
        type="number"
        value={ang}
        onChange={(e) => onAngChange(parseFloat(e.target.value) || 0)}
        step="0.1"
        style={styles.input}
        placeholder="Ang °"
      />
    </div>
  );
}

function ResultRow({ label, mag, ang }) {
  return (
    <div style={styles.result}>
      <div style={styles.resultLabel}>{label}</div>
      <div style={styles.resultValue}>
        {mag.toFixed(4)}A ∠ {ang.toFixed(2)}°
      </div>
    </div>
  );
}

const styles = {
  root: {
    padding: "20px",
    background: "var(--card)",
    borderRadius: 10,
    maxWidth: 500,
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
  phasorInput: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
    minWidth: 30,
  },
  unit: {
    fontSize: 12,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
  },
  input: {
    flex: 1,
    padding: "6px 8px",
    border: "1px solid var(--bdr)",
    borderRadius: 4,
    background: "var(--card2)",
    color: "var(--tx)",
    fontSize: 11,
    fontFamily: "var(--fm)",
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
    padding: "10px 0",
    borderBottom: "1px solid var(--bdr2)",
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
  },
  resultValue: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--cyan)",
    fontFamily: "var(--fm)",
  },
  info: {
    marginTop: 12,
    padding: "8px",
    borderRadius: 4,
    background: "rgba(14,165,233,0.08)",
    border: "1px solid rgba(14,165,233,0.2)",
  },
  infoLabel: {
    fontSize: 11,
    color: "var(--cyan)",
    fontFamily: "var(--fm)",
    fontWeight: 600,
  },
};
