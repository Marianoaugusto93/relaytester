import { useState, useRef, useCallback } from "react";
import { useTranslation } from "../i18n/useTranslation.js";
import { saveCustomScenario, exportScenarioAsJson, importScenarioFromFile } from "../scenarios/customScenarios.js";
import { useArtifactBus } from "../estudos/context/ArtifactBus.jsx";

// Toast state hook — simple local implementation, no external lib
function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const show = useCallback((text, type = "success", durationMs = 2000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ text, type });
    timerRef.current = setTimeout(() => setToast(null), durationMs);
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, show, dismiss };
}

// Toast overlay — bottom-right, z-index 2000
function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 2000,
      padding: "10px 16px", borderRadius: 8,
      fontSize: 12, fontWeight: 600, fontFamily: "var(--fm)",
      background: isError ? "rgba(248,113,113,.12)" : "rgba(74,222,128,.12)",
      color: isError ? "var(--red)" : "var(--green)",
      border: `1px solid ${isError ? "rgba(248,113,113,.3)" : "rgba(74,222,128,.3)"}`,
      boxShadow: "0 4px 16px rgba(0,0,0,.4)",
      maxWidth: 320,
      pointerEvents: "none",
    }}>
      {toast.text}
    </div>
  );
}

// Single toolbar button
function ToolBtn({ children, onClick, disabled, title, variant }) {
  const base = {
    padding: "6px 10px", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 11, fontWeight: 600, fontFamily: "var(--fm)",
    border: "1px solid var(--bdr)", transition: "all .15s",
    opacity: disabled ? 0.45 : 1,
    display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
    position: "relative",
  };

  const variants = {
    primary: { background: "var(--orange-dim)", color: "var(--orange)", borderColor: "rgba(249,115,22,.3)" },
    secondary: { background: "transparent", color: "var(--tx2)", borderColor: "var(--bdr)" },
    danger: { background: "transparent", color: "var(--tx3)", borderColor: "var(--bdr)" },
    send: { background: "rgba(74,222,128,.08)", color: "var(--green)", borderColor: "rgba(74,222,128,.25)" },
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      style={{ ...base, ...(variants[variant] || variants.secondary) }}
    >
      {children}
    </button>
  );
}

/**
 * EditorToolbar — action toolbar for ScenarioVisualEditor.
 *
 * @param {Object}   props.scenario           - current scenario state
 * @param {Function} props.onSave             - called after successful save
 * @param {Function} props.onSaveAs           - called to save with new name
 * @param {Function} props.onExport           - called to export JSON
 * @param {Function} props.onImport           - called after successful import (receives scenario)
 * @param {Function} props.onReset            - called to reset form
 * @param {Function} props.onSendToRelay      - called after publish to ArtifactBus
 * @param {string[]} props.validationErrors   - list of validation error strings
 */
export default function EditorToolbar({
  scenario,
  onSave,
  onSaveAs,
  onExport,
  onImport,
  onReset,
  onSendToRelay,
  validationErrors = [],
}) {
  const { t } = useTranslation();
  const { toast, show } = useToast();
  const importInputRef = useRef(null);
  const hasErrors = validationErrors.length > 0;

  let bus = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    bus = useArtifactBus();
  } catch {
    // ArtifactBus not available in this subtree — Send to Relay will be disabled
  }

  const handleSave = () => {
    if (hasErrors) return;
    const ok = saveCustomScenario(scenario);
    if (ok) {
      show(t("editorToolbar.toasts.saved"), "success", 2000);
      if (onSave) onSave(scenario);
    } else {
      show(t("editorToolbar.toasts.storageFull"), "error", 4000);
    }
  };

  const handleSaveAs = () => {
    if (onSaveAs) onSaveAs();
  };

  const handleExport = () => {
    if (!scenario) return;
    const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    const forExport = {
      ...scenario,
      id: scenario.id || `scenario_${ts}`,
    };
    exportScenarioAsJson({ ...forExport, id: `scenario_${ts}` });
    show(t("editorToolbar.toasts.exported"), "success", 2000);
    if (onExport) onExport();
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-imported
    e.target.value = "";
    try {
      const parsed = await importScenarioFromFile(file);
      // Accept single scenario object or array (use first element)
      const raw = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!raw || typeof raw !== "object" || !raw.phasors) {
        show(t("customScenarios.msgInvalidFile"), "error", 4000);
        return;
      }
      // Assign new id to avoid collision
      const imported = { ...raw, id: `imported_${Date.now()}` };
      const ok = saveCustomScenario(imported);
      if (ok) {
        show(t("editorToolbar.toasts.imported"), "success", 2000);
        if (onImport) onImport(imported);
      } else {
        show(t("customScenarios.msgImportFailed"), "error", 4000);
      }
    } catch {
      show(t("customScenarios.msgReadError"), "error", 4000);
    }
  };

  const handleReset = () => {
    if (onReset) onReset();
  };

  const handleSendToRelay = () => {
    if (!bus || !scenario) return;
    bus.publish("scenario.built", {
      ...scenario,
      timestamp: new Date().toISOString(),
    });
    show(t("editorToolbar.toasts.sentToRelay"), "success", 2000);
    if (onSendToRelay) onSendToRelay(scenario);
  };

  const saveTitle = hasErrors
    ? `${t("editorToolbar.tooltips.errorPrefix")} ${validationErrors[0]}`
    : t("editorToolbar.tooltips.save");

  return (
    <>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 5,
        padding: "8px 10px",
        borderTop: "1px solid var(--bdr)",
        background: "var(--card)",
        alignItems: "center",
      }}>
        {/* Save */}
        <ToolBtn
          onClick={handleSave}
          disabled={hasErrors}
          title={saveTitle}
          variant="primary"
        >
          {t("editorToolbar.buttons.save")}
        </ToolBtn>

        {/* Save As */}
        <ToolBtn onClick={handleSaveAs} variant="secondary" title={t("editorToolbar.tooltips.saveAs")}>
          {t("editorToolbar.buttons.saveAs")}
        </ToolBtn>

        {/* Export */}
        <ToolBtn onClick={handleExport} disabled={!scenario} variant="secondary" title={t("editorToolbar.tooltips.export")}>
          {t("editorToolbar.buttons.export")}
        </ToolBtn>

        {/* Import */}
        <ToolBtn onClick={handleImportClick} variant="secondary" title={t("editorToolbar.tooltips.import")}>
          {t("editorToolbar.buttons.import")}
        </ToolBtn>
        <input
          ref={importInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {/* Reset */}
        <ToolBtn onClick={handleReset} variant="danger" title={t("editorToolbar.tooltips.reset")}>
          {t("editorToolbar.buttons.reset")}
        </ToolBtn>

        {/* Send to Relay */}
        <ToolBtn
          onClick={handleSendToRelay}
          disabled={!bus || !scenario}
          variant="send"
          title={t("editorToolbar.tooltips.sendToRelay")}
        >
          {t("editorToolbar.buttons.sendToRelay")}
        </ToolBtn>

        {/* Validation badge */}
        {hasErrors && (
          <span style={{
            marginLeft: "auto", fontSize: 9, fontWeight: 700,
            color: "var(--red)", background: "rgba(248,113,113,.1)",
            border: "1px solid rgba(248,113,113,.25)",
            borderRadius: 4, padding: "2px 6px",
            fontFamily: "var(--fm)", whiteSpace: "nowrap",
          }}>
            {validationErrors.length} {t("editorToolbar.labels.errors")}
          </span>
        )}
      </div>

      <Toast toast={toast} />
    </>
  );
}
