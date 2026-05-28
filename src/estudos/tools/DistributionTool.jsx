/**
 * DistributionTool.jsx — Feeder analysis, cable sizing, voltage drop
 *
 * Inputs: Current, cable length, voltage
 * Outputs: Voltage drop %, cable recommendation, losses, reliability
 */

import { useState } from "react";
import {
  calcVoltageDropAndLosses,
  recommendCableSize,
  calcFeederReliability,
  getCableList,
} from "../engine/distribution.js";
import { useArtifactBus } from "../context/ArtifactBus.jsx";
import DistributionExportButton from "../components/DistributionExportButton.jsx";

export default function DistributionTool() {
  const bus = useArtifactBus();

  const [current, setCurrent] = useState(50);
  const [length, setLength] = useState(5);
  const [voltage, setVoltage] = useState(400);
  const [cableType, setCableType] = useState("25_Cu");
  const [powerFactor, setPowerFactor] = useState(0.85);
  const [material, setMaterial] = useState("Copper");
  const [insulation, setInsulation] = useState("75C");
  const [dV_limit, setDV_limit] = useState(3);

  const [result, setResult] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [reliability, setReliability] = useState(null);

  const cables = getCableList();
  const cablesByMaterial = cables.filter((c) => c.material === material);

  const handleAnalyze = () => {
    try {
      // Voltage drop and losses
      const res = calcVoltageDropAndLosses(
        current,
        length,
        cableType,
        voltage,
        powerFactor
      );
      setResult(res);

      // Reliability
      const rel = calcFeederReliability(length, 0.15, 10, 4);
      setReliability(rel);

      // Publish result
      bus.publish("distribution.result", {
        current,
        length,
        voltage,
        cableType,
        result: res,
        reliability: rel,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[DistributionTool] Analysis failed:", e);
    }
  };

  const handleRecommend = () => {
    try {
      const rec = recommendCableSize(
        current,
        length,
        voltage,
        dV_limit,
        material,
        insulation
      );
      setRecommendation(rec);

      // Analyze the recommended cable
      if (rec.recommended) {
        const res = calcVoltageDropAndLosses(
          current,
          length,
          rec.recommended.id,
          voltage,
          powerFactor
        );
        setResult(res);
      }

      // Publish recommendation
      bus.publish("distribution.recommendation", {
        current,
        length,
        voltage,
        dV_limit,
        material,
        recommendation: rec,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[DistributionTool] Recommendation failed:", e);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.title}>Distribuição — Análise de Alimentadores</div>

      {/* Input section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Parâmetros da Linha</div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Corrente (A)</label>
            <input
              type="number"
              value={current}
              onChange={(e) => setCurrent(parseFloat(e.target.value) || 50)}
              step={5}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Comprimento (km)</label>
            <input
              type="number"
              value={length}
              onChange={(e) => setLength(parseFloat(e.target.value) || 5)}
              step={0.1}
              min={0.1}
              max={100}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Tensão (V)</label>
            <input
              type="number"
              value={voltage}
              onChange={(e) => setVoltage(parseFloat(e.target.value) || 400)}
              step={10}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Fator de Potência</label>
            <input
              type="number"
              value={powerFactor}
              onChange={(e) => setPowerFactor(parseFloat(e.target.value) || 0.85)}
              step={0.05}
              min={0.7}
              max={1.0}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Cabo (Seção + Material)</label>
          <select
            value={cableType}
            onChange={(e) => setCableType(e.target.value)}
            style={styles.select}
          >
            {cablesByMaterial.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.ampacity_75C}A)
              </option>
            ))}
          </select>
        </div>

        <button style={styles.analyzeBtn} onClick={handleAnalyze}>
          Analisar Queda de Tensão
        </button>
      </div>

      {/* Results section */}
      {result && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Resultados</div>

          <div style={styles.resultGrid}>
            <div style={styles.resultCard}>
              <div style={styles.resultLabel}>Queda de Tensão</div>
              <div style={styles.resultValue}>{result.dV_V} V</div>
              <div style={styles.resultSub}>{result.dV_pct.toFixed(2)}%</div>
            </div>

            <div style={styles.resultCard}>
              <div style={styles.resultLabel}>Perdas Resistivas</div>
              <div style={styles.resultValue}>{result.losses_kW} kW</div>
              <div style={styles.resultSub}>
                {((result.losses_kW / (current * voltage * 0.85)) * 100).toFixed(1)}% da potência
              </div>
            </div>

            <div style={styles.resultCard}>
              <div style={styles.resultLabel}>Impedância da Linha</div>
              <div style={styles.resultValue}>
                {result.R_km.toFixed(4)} Ω
              </div>
              <div style={styles.resultSub}>
                R = {result.R_km.toFixed(4)}, X = {result.X_km.toFixed(4)} Ω
              </div>
            </div>
          </div>

          {/* Voltage drop status */}
          <div
            style={{
              ...styles.statusBar,
              background:
                result.dV_pct <= 2
                  ? "rgba(34,197,94,0.12)"
                  : result.dV_pct <= 5
                  ? "rgba(249,115,22,0.12)"
                  : "rgba(239,68,68,0.12)",
            }}
          >
            {result.dV_pct <= 2 ? "✓ Excelente" : result.dV_pct <= 5 ? "⚠ Aceitável" : "✗ Crítico"}
            {" — "}
            {result.dV_pct <= 2
              ? "Queda dentro dos limites recomendados"
              : result.dV_pct <= 5
              ? "Queda próxima do limite (5%)"
              : "Queda acima do limite (> 5%)"}
          </div>
        </div>
      )}

      {/* Recommendation section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Recomendação de Cabo</div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Material</label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              style={styles.select}
            >
              <option value="Copper">Cobre (Cu)</option>
              <option value="Aluminum">Alumínio (Al)</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Isolação</label>
            <select
              value={insulation}
              onChange={(e) => setInsulation(e.target.value)}
              style={styles.select}
            >
              <option value="60C">60°C</option>
              <option value="75C">75°C</option>
              <option value="90C">90°C</option>
            </select>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Limite de Queda (%) — Típico: 3%</label>
          <input
            type="number"
            value={dV_limit}
            onChange={(e) => setDV_limit(parseFloat(e.target.value) || 3)}
            step={0.5}
            min={1}
            max={10}
            style={styles.input}
          />
        </div>

        <button style={styles.recommendBtn} onClick={handleRecommend}>
          Recomendar Cabo
        </button>
      </div>

      {recommendation && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Resultado da Recomendação</div>

          {recommendation.recommended ? (
            <>
              <div style={styles.recommendedCard}>
                <div style={styles.recommendedLabel}>Cabo Recomendado</div>
                <div style={styles.recommendedValue}>
                  {recommendation.recommended.name}
                </div>
                <div style={styles.recommendedSub}>
                  Ampacidade: {recommendation.recommended.ampacity} A
                </div>
                <div style={styles.recommendedSub}>
                  Queda: {recommendation.recommended.dV_pct.toFixed(2)}%
                </div>
                <div style={styles.recommendedSub}>
                  Perdas: {recommendation.recommended.losses_kW} kW
                </div>
              </div>

              {recommendation.alternative && (
                <div style={styles.alternativeCard}>
                  <div style={styles.altLabel}>Alternativa (Um tamanho maior)</div>
                  <div style={styles.altValue}>
                    {recommendation.alternative.name}
                  </div>
                  <div style={styles.altSub}>
                    Queda: {recommendation.alternative.dV_pct.toFixed(2)}% | Perdas: {recommendation.alternative.losses_kW} kW
                  </div>
                </div>
              )}

              <DistributionExportButton
                analysisData={result}
                recommendationData={recommendation}
              />
            </>
          ) : (
            <div style={styles.errorBox}>
              {recommendation.analysis}
            </div>
          )}
        </div>
      )}

      {/* Reliability section */}
      {reliability && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Confiabilidade</div>

          <div style={styles.reliabilityGrid}>
            <div style={styles.relCard}>
              <div style={styles.relLabel}>MTBF (Mean Time Between Failures)</div>
              <div style={styles.relValue}>{reliability.MTBF_years} anos</div>
            </div>

            <div style={styles.relCard}>
              <div style={styles.relLabel}>Indisponibilidade Anual</div>
              <div style={styles.relValue}>
                {reliability.unavailability_pct.toFixed(3)}%
              </div>
            </div>

            <div style={styles.relCard}>
              <div style={styles.relLabel}>Taxa de Falha</div>
              <div style={styles.relValue}>
                {reliability.lambda.toFixed(4)} falhas/ano
              </div>
            </div>
          </div>
        </div>
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
  recommendBtn: {
    width: "100%",
    padding: "8px",
    marginTop: 12,
    border: "1px solid #22c55e",
    borderRadius: 6,
    background: "rgba(34,197,94,0.08)",
    color: "#22c55e",
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
  resultCard: {
    padding: 12,
    background: "var(--card2)",
    borderRadius: 6,
    border: "1px solid var(--bdr)",
  },
  resultLabel: {
    fontSize: 9,
    color: "var(--tx3)",
    fontWeight: 600,
    marginBottom: 6,
    fontFamily: "var(--fm)",
  },
  resultValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "var(--cyan)",
    fontFamily: "var(--fm)",
  },
  resultSub: {
    fontSize: 9,
    color: "var(--tx3)",
    marginTop: 3,
    fontFamily: "var(--fm)",
  },
  statusBar: {
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    fontSize: 11,
    fontWeight: 600,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
  },
  recommendedCard: {
    padding: 12,
    background: "rgba(34,197,94,0.08)",
    borderLeft: "3px solid #22c55e",
    borderRadius: 4,
    marginTop: 10,
  },
  recommendedLabel: {
    fontSize: 10,
    color: "#22c55e",
    fontWeight: 600,
    fontFamily: "var(--fm)",
    marginBottom: 6,
  },
  recommendedValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "#22c55e",
    fontFamily: "var(--fm)",
    marginBottom: 4,
  },
  recommendedSub: {
    fontSize: 10,
    color: "var(--tx3)",
    marginTop: 3,
    fontFamily: "var(--fm)",
  },
  alternativeCard: {
    padding: 10,
    background: "var(--card2)",
    borderRadius: 4,
    marginTop: 8,
    borderLeft: "3px solid var(--tx3)",
  },
  altLabel: {
    fontSize: 9,
    color: "var(--tx3)",
    fontWeight: 600,
    marginBottom: 4,
    fontFamily: "var(--fm)",
  },
  altValue: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
    marginBottom: 4,
  },
  altSub: {
    fontSize: 9,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
  },
  errorBox: {
    padding: 10,
    background: "rgba(239,68,68,0.08)",
    borderLeft: "3px solid #ef4444",
    borderRadius: 4,
    fontSize: 11,
    color: "#ef4444",
    fontFamily: "var(--fm)",
  },
  reliabilityGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
    marginTop: 10,
  },
  relCard: {
    padding: 12,
    background: "var(--card2)",
    borderRadius: 6,
    border: "1px solid var(--bdr)",
  },
  relLabel: {
    fontSize: 9,
    color: "var(--tx3)",
    fontWeight: 600,
    marginBottom: 6,
    fontFamily: "var(--fm)",
  },
  relValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--tx)",
    fontFamily: "var(--fm)",
  },
};
