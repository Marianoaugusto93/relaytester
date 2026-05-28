/**
 * DifferentialInrushTool.jsx — Transformer differential (87) + inrush blocking
 */

import { useState } from "react";
import {
  evaluateDifferential,
  generateStandardTransformerChar,
} from "../engine/differential.js";
import {
  evaluateInrush,
  shouldBlockDifferential,
} from "../engine/inrush.js";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

export default function DifferentialInrushTool() {
  const bus = useArtifactBus();

  // Differential inputs
  const [iPriMag, setIPriMag] = useState(50);
  const [iPriAng, setIPriAng] = useState(0);
  const [iSecMag, setISecMag] = useState(48);
  const [iSecAng, setISecAng] = useState(5);

  // Inrush inputs
  const [I_2nd, setI2nd] = useState(8);
  const [dc_offset, setDcOffset] = useState(5);

  const [result, setResult] = useState(null);

  const handleAnalyze = () => {
    try {
      const char = generateStandardTransformerChar(20, 100);

      const I_primary = { mag: iPriMag, ang: iPriAng };
      const I_secondary = { mag: iSecMag, ang: iSecAng };

      const diff_result = evaluateDifferential(
        I_primary,
        I_secondary,
        char,
        I_2nd
      );

      const inrush_result = evaluateInrush(iPriMag, I_2nd, dc_offset, {
        h2_threshold_pct: 15,
      });

      const should_block = shouldBlockDifferential(
        inrush_result.is_inrush,
        inrush_result.confidence
      );

      const final_trip = diff_result.tripped && !should_block;

      setResult({
        differential: diff_result,
        inrush: inrush_result,
        final_trip,
        blocked_by_inrush: should_block,
      });

      bus.publish("differential.result", {
        differential: diff_result,
        inrush: inrush_result,
        trip: final_trip,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[DifferentialInrushTool]", e);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.title}>Diferencial (87) + Inrush</div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Correntes Primária / Secundária</div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>I Primária (A)</label>
            <input
              type="number"
              value={iPriMag}
              onChange={(e) => setIPriMag(parseFloat(e.target.value) || 50)}
              step={5}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Ângulo (°)</label>
            <input
              type="number"
              value={iPriAng}
              onChange={(e) => setIPriAng(parseFloat(e.target.value) || 0)}
              step={5}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>I Secundária (A)</label>
            <input
              type="number"
              value={iSecMag}
              onChange={(e) => setISecMag(parseFloat(e.target.value) || 48)}
              step={5}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Ângulo (°)</label>
            <input
              type="number"
              value={iSecAng}
              onChange={(e) => setISecAng(parseFloat(e.target.value) || 5)}
              step={5}
              style={styles.input}
            />
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Harmônicos (Inrush Check)</div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>2º Harmônico (A)</label>
            <input
              type="number"
              value={I_2nd}
              onChange={(e) => setI2nd(parseFloat(e.target.value) || 8)}
              step={1}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Offset DC (A)</label>
            <input
              type="number"
              value={dc_offset}
              onChange={(e) => setDcOffset(parseFloat(e.target.value) || 5)}
              step={1}
              style={styles.input}
            />
          </div>
        </div>

        <button style={styles.analyzeBtn} onClick={handleAnalyze}>
          Avaliar Diferencial + Inrush
        </button>
      </div>

      {result && (
        <>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Diferencial</div>

            <div style={styles.resultGrid}>
              <div style={styles.card}>
                <div style={styles.label}>I Diferencial</div>
                <div style={styles.value}>
                  {result.differential.I_diff} A
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.label}>Limiar</div>
                <div style={styles.value}>
                  {result.differential.Op_threshold} A
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.label}>Margem</div>
                <div style={styles.value}>
                  {result.differential.margin_pct}%
                </div>
              </div>
            </div>

            <div
              style={{
                ...styles.status,
                background: result.differential.tripped
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(34,197,94,0.12)",
              }}
            >
              {result.differential.tripped ? "⚠ Trip" : "✓ Hold"}
              {result.differential.blocked_by_harmonic && " (Harmônico)"}
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Inrush Detection</div>

            <div style={styles.resultGrid}>
              <div style={styles.card}>
                <div style={styles.label}>2º/1º Harmônico</div>
                <div style={styles.value}>
                  {result.inrush.I_2_pct}%
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.label}>DC Offset</div>
                <div style={styles.value}>
                  {result.inrush.dc_offset_pct}%
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.label}>Confiança</div>
                <div style={styles.value}>
                  {(result.inrush.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            <div
              style={{
                ...styles.status,
                background: result.inrush.is_inrush
                  ? "rgba(249,115,22,0.12)"
                  : "rgba(34,197,94,0.12)",
              }}
            >
              {result.inrush.is_inrush ? "⚡ Inrush Detected" : "✓ Normal"} · Votos: {result.inrush.votes}/3
            </div>
          </div>

          <div style={styles.section}>
            <div
              style={{
                ...styles.tripDecision,
                background: result.final_trip
                  ? "rgba(239,68,68,0.15)"
                  : "rgba(34,197,94,0.15)",
              }}
            >
              <div style={styles.tripLabel}>
                {result.final_trip ? "⚠️ TRIP DIFERENCIAL" : "✓ Bloqueado"}
              </div>
              {result.blocked_by_inrush && (
                <div style={styles.tripSub}>
                  Bloqueado por Inrush
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  root: {
    padding: "20px",
    background: "var(--card)",
    borderRadius: 10,
    maxWidth: 640,
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
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
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
  analyzeBtn: {
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
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 10,
    marginTop: 10,
  },
  card: {
    padding: 12,
    background: "var(--card2)",
    borderRadius: 6,
    border: "1px solid var(--bdr)",
  },
  value: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--cyan)",
    fontFamily: "var(--fm)",
  },
  status: {
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    fontSize: 11,
    fontWeight: 600,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
  },
  tripDecision: {
    padding: 16,
    borderRadius: 6,
    textAlign: "center",
    marginTop: 0,
  },
  tripLabel: {
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "var(--fh)",
  },
  tripSub: {
    fontSize: 10,
    marginTop: 4,
    color: "var(--tx3)",
  },
};
