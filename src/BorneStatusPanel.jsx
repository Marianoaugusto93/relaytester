import { useMemo } from "react";
import { useTranslation } from "./i18n/useTranslation.js";
import { useBorneDescriptions, useBorneGroups } from "./BorneDescriptions.js";

export default function BorneStatusPanel({
  trippedStageIds = [],
  bkState = {},
  relayProt = {},
  electricalGraph
}) {
  const { t } = useTranslation();
  const BORNE_DESCRIPTIONS = useBorneDescriptions();
  const BORNE_GROUPS = useBorneGroups();
  const activeBornes = useMemo(() => {
    const active = {};

    // Saídas Binárias (BO3-BO6)
    // BO3 ativa se algum stage de sobrecorrente fase A dispara (50, 51)
    active[1] = active[2] = trippedStageIds.some(s => s.startsWith("50") || s.startsWith("51")) && !s.startsWith("50N") && !s.startsWith("51N");
    active[3] = active[4] = trippedStageIds.some(s => s.startsWith("50N") || s.startsWith("51N"));
    active[5] = active[6] = trippedStageIds.some(s => s.startsWith("47"));
    active[7] = active[8] = trippedStageIds.some(s => s.startsWith("81U"));

    // Feedback do Disjuntor
    // 52a ativa quando CB está FECHADO
    active[9] = active[10] = bkState?.state === "closed";
    // 52b ativa quando CB está ABERTO (trip)
    active[11] = active[12] = bkState?.state === "open" || trippedStageIds.length > 0;

    // Bobinas
    // TC ativa quando há trip
    active[13] = active[14] = trippedStageIds.length > 0;
    // FC ativa quando há comando de fechamento (mock: quando houver 52b)
    active[15] = active[16] = bkState?.state === "closed" && !trippedStageIds.length;

    return active;
  }, [trippedStageIds, bkState]);

  const getBorneStatus = (n) => {
    const desc = BORNE_DESCRIPTIONS[n];
    const isActive = activeBornes[n];
    const group = desc?.group || "unknown";

    let reason = "";
    if (isActive) {
      if (n >= 1 && n <= 2) reason = t("status_reasons.oc_phase_active");
      if (n >= 3 && n <= 4) reason = t("status_reasons.oc_neutral_active");
      if (n >= 5 && n <= 6) reason = t("status_reasons.negseq_active");
      if (n >= 7 && n <= 8) reason = t("status_reasons.underfreq_active");
      if (n >= 9 && n <= 10) reason = t("status_reasons.cb_closed_active");
      if (n >= 11 && n <= 12) reason = t("status_reasons.cb_open_active");
      if (n >= 13 && n <= 14) reason = t("status_reasons.trip_coil_active");
      if (n >= 15 && n <= 16) reason = t("status_reasons.close_coil_active");
    } else {
      if (n >= 1 && n <= 2) reason = t("status_reasons.no_oc_phase");
      if (n >= 3 && n <= 4) reason = t("status_reasons.no_oc_neutral");
      if (n >= 5 && n <= 6) reason = t("status_reasons.no_negseq");
      if (n >= 7 && n <= 8) reason = t("status_reasons.normal_freq");
      if (n >= 9 && n <= 10) reason = t("status_reasons.cb_not_closed");
      if (n >= 11 && n <= 12) reason = t("status_reasons.cb_not_open");
      if (n >= 13 && n <= 14) reason = t("status_reasons.no_trip_cmd");
      if (n >= 15 && n <= 16) reason = t("status_reasons.no_close_cmd");
    }

    return { desc, isActive, reason, group };
  };

  const groupedBornes = {
    saída: [1, 2, 3, 4, 5, 6, 7, 8],
    feedback: [9, 10, 11, 12],
    comando: [13, 14, 15, 16]
  };

  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--bdr)",
      borderRadius: 8,
      padding: "12px 16px",
      marginTop: 12,
      fontSize: 11,
      fontFamily: "var(--fm)",
      maxHeight: "400px",
      overflowY: "auto"
    }}>
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12, color: "var(--tx)", textTransform: "uppercase", letterSpacing: 1 }}>
        💡 Estado Atual dos Bornes
      </div>

      {Object.entries(groupedBornes).map(([groupKey, borneNums]) => {
        const groupInfo = BORNE_GROUPS[groupKey];
        return (
          <div key={groupKey} style={{ marginBottom: 16 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: `1px solid ${groupInfo.color}40`,
              fontSize: 10,
              fontWeight: 700,
              color: groupInfo.color,
              textTransform: "uppercase"
            }}>
              <span>{groupInfo.icon}</span>
              <span>{groupInfo.title}</span>
            </div>

            {borneNums.map((n) => {
              const { desc, isActive, reason, group } = getBorneStatus(n);
              return (
                <div
                  key={n}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    marginBottom: 8,
                    padding: "6px 8px",
                    background: isActive ? "rgba(34, 197, 94, 0.1)" : "transparent",
                    borderLeft: `2px solid ${isActive ? "#22c55e" : "#888"}`,
                    borderRadius: 4
                  }}
                >
                  <div style={{ minWidth: 60, fontWeight: 700, color: isActive ? "#22c55e" : "var(--tx3)" }}>
                    {isActive ? "✅" : "❌"} TB{n}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--tx)" }}>{desc?.label}</div>
                    <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 2 }}>
                      {reason}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: "1px solid var(--bdr)",
        fontSize: 9,
        color: "var(--tx3)",
        fontStyle: "italic"
      }}>
        📝 <strong>Dica:</strong> Ative diferentes proteções (50N, 47, 81U) e injetar diferentes tipos de falta para ver BO4, BO5, BO6 acenderem.
      </div>
    </div>
  );
}
