import { useState, useEffect, useRef, useCallback } from "react";
import { analytics } from "./analytics.js";
import { useTranslation } from "./i18n/useTranslation.js";

/**
 * AnalyticsDashboard — modal that displays scenario usage statistics.
 * Props:
 *   open    {boolean}  - controls visibility
 *   onClose {Function} - called when user closes the modal
 */
export default function AnalyticsDashboard({ open, onClose }) {
  const { t } = useTranslation();
  const [data, setData] = useState({ scenarios: {}, lastUpdated: null });
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const prevFocusRef = useRef(null);

  // Reload stats whenever the modal opens
  useEffect(() => {
    if (open) setData(analytics.getAllStats());
  }, [open]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus management + trap
  useEffect(() => {
    if (!open) {
      if (prevFocusRef.current) prevFocusRef.current.focus();
      return;
    }
    prevFocusRef.current = document.activeElement;
    const frame = requestAnimationFrame(() => {
      if (closeButtonRef.current) closeButtonRef.current.focus();
    });
    const trapFocus = (e) => {
      if (!modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.key === "Tab") {
        if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
        else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
      }
    };
    window.addEventListener("keydown", trapFocus);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("keydown", trapFocus); };
  }, [open]);

  const handleClear = useCallback(() => {
    if (window.confirm(t("analytics.clearConfirm"))) {
      analytics.clearStats();
      setData({ scenarios: {}, lastUpdated: Date.now() });
    }
  }, [t]);

  const handleExportCSV = useCallback(() => {
    const rows = [[t("analytics.headers.scenario"), t("analytics.headers.uses"), t("analytics.headers.avgTime"), "Erros de Trip"]];
    Object.entries(data.scenarios).forEach(([name, rec]) => {
      rows.push([
        `"${name.replace(/"/g, '""')}"`,
        rec.count,
        (rec.avgTime ?? 0).toFixed(2),
        rec.tripErrors ?? 0,
      ]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relaylab_analytics.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data, t]);

  if (!open) return null;

  const entries = Object.entries(data.scenarios);
  const totalUses = entries.reduce((s, [, r]) => s + (r.count || 0), 0);
  const totalAvg = totalUses > 0
    ? entries.reduce((s, [, r]) => s + (r.totalTime || 0), 0) / totalUses
    : 0;
  const lastUpdatedStr = data.lastUpdated
    ? new Date(data.lastUpdated).toLocaleString("pt-BR")
    : "—";

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
        zIndex: 3500, display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(3px)",
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-title"
        style={{
          background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 16,
          width: 560, maxWidth: "96vw", maxHeight: "85vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,.6)", overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px", borderBottom: "1px solid var(--bdr)", flexShrink: 0,
        }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--tx)", fontFamily: "var(--fh)", letterSpacing: 1, textTransform: "uppercase", flex: 1 }} id="analytics-title">
            {t("analytics.title")}
          </span>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label={t("analytics.closeBtn")}
            style={{
              background: "transparent", border: "1px solid var(--bdr)", color: "var(--tx3)",
              width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--red-dim)"; e.currentTarget.style.color = "var(--red)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--tx3)"; }}
          >
            &#x2715;
          </button>
        </div>

        {/* Summary bar */}
        <div style={{
          display: "flex", gap: 20, padding: "10px 18px",
          borderBottom: "1px solid var(--bdr)", flexShrink: 0,
          background: "var(--card2)",
        }}>
          <SummaryItem label={t("analytics.totalUses")} value={totalUses} />
          <SummaryItem label={t("analytics.avgTime")} value={`${totalAvg.toFixed(2)} s`} />
          <SummaryItem label={t("analytics.scenariosTracked")} value={entries.length} />
          <div style={{ marginLeft: "auto", fontSize: 9, color: "var(--tx3)", fontFamily: "var(--fm)", alignSelf: "flex-end" }}>
            {t("analytics.lastUpdated")}: {lastUpdatedStr}
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {entries.length === 0 ? (
            <div style={{
              padding: "40px 20px", textAlign: "center",
              color: "var(--tx3)", fontSize: 13, fontFamily: "var(--fm)",
            }}>
              {t("analytics.noData")}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "var(--fm)" }}>
              <thead>
                <tr style={{ background: "var(--card3)", position: "sticky", top: 0 }}>
                  {[
                    { key: "scenario", label: t("analytics.headers.scenario") },
                    { key: "uses", label: t("analytics.headers.uses") },
                    { key: "avgTime", label: t("analytics.headers.avgTime") },
                    { key: "errors", label: t("analytics.headers.errors") },
                  ].map(({key, label}) => (
                    <th key={key} style={{
                      padding: "8px 14px", textAlign: "left",
                      color: "var(--tx3)", fontWeight: 700, fontSize: 9,
                      textTransform: "uppercase", letterSpacing: ".8px",
                      borderBottom: "1px solid var(--bdr)",
                    }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(([name, rec]) => (
                  <tr
                    key={name}
                    style={{ borderBottom: "1px solid var(--bdr)", transition: "background .1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--card2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "9px 14px", color: "var(--tx)", fontWeight: 600 }}>{name}</td>
                    <td style={{ padding: "9px 14px", color: "var(--cyan)" }}>{rec.count ?? 0}</td>
                    <td style={{ padding: "9px 14px", color: "var(--warm)" }}>
                      {(rec.avgTime ?? 0).toFixed(2)} s
                    </td>
                    <td style={{ padding: "9px 14px", color: (rec.tripErrors ?? 0) > 0 ? "var(--red)" : "var(--tx3)" }}>
                      {rec.tripErrors ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          display: "flex", gap: 8, justifyContent: "flex-end",
          padding: "12px 18px", borderTop: "1px solid var(--bdr)", flexShrink: 0,
        }}>
          <FooterBtn onClick={handleExportCSV} disabled={entries.length === 0}>
            {t("analytics.exportBtn")}
          </FooterBtn>
          <FooterBtn onClick={handleClear} danger disabled={entries.length === 0}>
            {t("analytics.clearBtn")}
          </FooterBtn>
          <FooterBtn onClick={onClose} primary>
            {t("analytics.closeBtn2")}
          </FooterBtn>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 9, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", fontFamily: "var(--fm)", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 16, color: "var(--tx)", fontWeight: 800, fontFamily: "var(--fm)" }}>{value}</span>
    </div>
  );
}

function FooterBtn({ onClick, children, primary, danger, disabled }) {
  const base = {
    padding: "8px 16px", borderRadius: 8, border: "1px solid var(--bdr)",
    background: "var(--card2)", color: "var(--tx2)", fontSize: 11,
    fontFamily: "var(--fi)", cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600, transition: "all .15s", opacity: disabled ? 0.4 : 1,
  };
  if (primary) { base.background = "var(--orange-dim)"; base.borderColor = "rgba(249,115,22,.3)"; base.color = "var(--orange)"; }
  if (danger) { base.background = "var(--red-dim)"; base.borderColor = "rgba(248,113,113,.2)"; base.color = "var(--red)"; }
  return <button style={base} onClick={disabled ? undefined : onClick}>{children}</button>;
}
