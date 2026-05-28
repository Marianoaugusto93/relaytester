/**
 * TccExportButton.jsx — Export TCC analysis results to Relé tab
 *
 * Formats TCC curve data as a coordination preset and publishes via ArtifactBus.
 * Allows relay settings to be configured based on TCC analysis.
 */

import { useState } from "react";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

export default function TccExportButton({ tccData, curve, timeDial }) {
  const bus = useArtifactBus();
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    if (!tccData) {
      console.warn("[TccExportButton] No TCC data to export");
      return;
    }

    const payload = {
      kind: "tcc-preset",
      curve,
      timeDial,
      data: tccData,
      timestamp: new Date().toISOString(),
    };

    bus.publish("artifact.tccExport", payload);

    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  return (
    <button
      style={{
        ...styles.btn,
        ...(exported ? styles.btnExported : {}),
      }}
      onClick={handleExport}
      disabled={!tccData}
      title={tccData ? "Exportar curva TCC para Relé" : "Calcule uma curva TCC primeiro"}
    >
      {exported ? "✓ Exportado" : "↗ Exportar para Relé"}
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
