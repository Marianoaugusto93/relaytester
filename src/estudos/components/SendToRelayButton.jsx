/**
 * SendToRelayButton.jsx — Send study result to Relé tab as preset
 *
 * Formats a fault calculation result into a ProtectionPresetPayload
 * and publishes via ArtifactBus for App.jsx listener to apply.
 */

import { useState } from "react";
import { useArtifactBus } from "../context/ArtifactBus.jsx";

export default function SendToRelayButton({ faultResult, faultType }) {
  const bus = useArtifactBus();
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!faultResult || !faultType) {
      console.warn("[SendToRelayButton] No fault result to send");
      return;
    }

    // Format payload for Relé tab
    const Isc_primary = faultResult.currents.Ia.mag; // Secondary side; primary = Ia × (TC ratio)
    const payload = {
      kind: "fault-preset",
      faultType,
      result: faultResult,
      protections: formatProtections(Isc_primary),
      timestamp: new Date().toISOString(),
    };

    bus.publish("artifact.sendToRele", payload);

    // Cadeia Estudos → (contrato `fault.currents` de Manobras) → injeção do Relé.
    // Reusa o mesmo tópico que o Simulador de Manobras usa, de modo que a falta
    // calculada pré-carrega a injeção do Relé e dispara o toast "Falta pronta".
    const c = faultResult.currents || {};
    const mags = [c.Ia?.mag, c.Ib?.mag, c.Ic?.mag].map(Number).filter((n) => isFinite(n));
    const If = mags.length ? Math.max(...mags) : 0;
    bus.publish("fault.currents", {
      kind: "estudo",
      ftype: mapFtype(faultType),
      If,
      kV: Number(faultResult.kV ?? faultResult.kVf ?? 0),
      at: "estudo",
      label: `Estudo: ${faultType}`,
    });

    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  return (
    <button
      style={{
        ...styles.btn,
        ...(sent ? styles.btnSent : {}),
      }}
      onClick={handleSend}
      disabled={!faultResult}
      title={faultResult ? "Enviar parâmetros para Relé" : "Calcule uma falta primeiro"}
    >
      {sent ? "✓ Enviado" : "→ Enviar para Relé"}
    </button>
  );
}

/**
 * Format Isc into protection presets.
 * Suggests pickup values for 50, 50N, 51, 51N based on fault current.
 *
 * @param {number} isc_secondary - Fault current (secondary side)
 * @returns {Object} Protection stage suggestions
 */
function formatProtections(isc_secondary) {
  // Example: 50 pickup = 1.25 × Isc (security margin)
  const pickup_50 = isc_secondary * 1.25;
  const pickup_50n = isc_secondary * 0.3; // Neutral: 30% of phase

  return {
    "50": {
      stages: [
        {
          id: "50-1",
          pickup: pickup_50,
          timeDial: 0, // Instantaneous
        },
      ],
    },
    "50N": {
      stages: [
        {
          id: "50N-1",
          pickup: pickup_50n,
          timeDial: 0,
        },
      ],
    },
    "51": {
      stages: [
        {
          id: "51-1",
          pickup: pickup_50 * 0.8,
          timeDial: 0.5,
          curve: "IEC",
        },
      ],
    },
  };
}

/**
 * Map a study fault-type code to the ftype string understood by App.jsx's
 * `fault.currents` listener (which keys on "1"/"2" substrings, else 3φ).
 * @param {string} ft - e.g. "ABC", "AG", "BC", "ABG"
 * @returns {"1ph"|"2ph"|"3ph"}
 */
function mapFtype(ft) {
  ft = String(ft || "").toUpperCase();
  if (/^[ABC]G$/.test(ft) || ft === "SLG" || ft === "LG") return "1ph";   // L-G
  if (/^[ABC]{2}G?$/.test(ft) || ft === "LL" || ft === "LLG") return "2ph"; // L-L / L-L-G
  return "3ph";
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
  btnSent: {
    background: "rgba(34,197,94,0.12)",
    borderColor: "#22c55e",
    color: "#22c55e",
  },
};
