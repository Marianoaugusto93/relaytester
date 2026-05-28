/**
 * DistributionExportButton.jsx — Export distribution analysis to Relé
 *
 * Shares feeder analysis results (voltage drop, cable info, losses)
 * as context for protection coordination.
 */

import { useState } from "react";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

export default function DistributionExportButton({ analysisData, recommendationData }) {
  const bus = useArtifactBus();
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    if (!analysisData && !recommendationData) {
      console.warn("[DistributionExportButton] No distribution data to export");
      return;
    }

    const payload = {
      kind: "distribution-context",
      analysis: analysisData,
      recommendation: recommendationData,
      timestamp: new Date().toISOString(),
    };

    bus.publish("artifact.distributionContext", payload);

    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const hasData = analysisData || recommendationData;

  return (
    <button
      style={{
        ...styles.btn,
        ...(exported ? styles.btnExported : {}),
      }}
      onClick={handleExport}
      disabled={!hasData}
      title={hasData ? "Compartilhar análise de distribuição" : "Calcule primeiro"}
    >
      {exported ? "✓ Compartilhado" : "⤴ Compartilhar Análise"}
    </button>
  );
}

const styles = {
  btn: {
    padding: "8px 12px",
    border: "1px solid var(--cyan)",
    borderRadius: 6,
    background: "rgba(14,165,233,0.08)",
    color: "var(--cyan)",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    transition: "all .2s",
  },
  btnExported: {
    background: "rgba(34,197,94,0.12)",
    borderColor: "#22c55e",
    color: "#22c55e",
  },
};
