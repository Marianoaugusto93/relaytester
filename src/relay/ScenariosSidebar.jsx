import { useState } from "react";
import { EDUCATIONAL_SCENARIOS } from "../scenarios/educational-scenarios.js";
import { useTranslation } from "../i18n/useTranslation.js";
import CustomScenarioBuilder from "./CustomScenarioBuilder.jsx";
import ScenarioVisualEditor from "../ScenarioVisualEditor.jsx";

export default function ScenariosSidebar({ pfMode, setPfMode, prot, outMatrix, inMatrix, phasors, applyTestPreset, sys }) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showVisualEditor, setShowVisualEditor] = useState(false);

  const handleLoad = (s) => {
    setActiveId(s.id);
    applyTestPreset(s);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const obj = JSON.parse(ev.target.result);
          if (!obj.fns || !Array.isArray(obj.fns)) { alert("Arquivo inválido"); return; }
          if (!obj.id) obj.id = `import_${Date.now()}`;
          obj.type = "custom";
          if (!obj.label && obj.name) obj.label = obj.name.slice(0, 20);
          applyTestPreset(obj);
          setActiveId(obj.id);
        } catch { alert("Erro ao ler arquivo"); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="card" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div className="ph">
        <div className="bar bar-orange" />
        <span className="ph-t">{t("settings.eduScenarios") || "Cenários"}</span>
      </div>

      {/* Pré-falta / Falta toggle */}
      <div style={{ display: "flex", gap: 3, padding: "6px 10px 4px" }}>
        <button
          className={`stb${pfMode === "prefault" ? " on" : ""}`}
          onClick={() => setPfMode("prefault")}
        >
          {t("tabs.preFault")}
        </button>
        <button
          className={`stb${pfMode === "fault" ? " on" : ""}`}
          onClick={() => setPfMode("fault")}
        >
          {t("tabs.fault")}
        </button>
      </div>

      {/* Scenario list */}
      <div className="scen-list">
        {EDUCATIONAL_SCENARIOS.map(s => (
          <button
            key={s.id}
            className={`scen${activeId === s.id ? " on" : ""}`}
            title={s.description}
            onClick={() => handleLoad(s)}
          >
            <span className="nm">{s.label}</span>
            <span className="ds">{s.description?.slice(0, 50)}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="scen-footer">
        <button
          className="btn"
          style={{ justifyContent: "center", fontSize: 11 }}
          onClick={() => setShowBuilder(v => !v)}
        >
          + Novo cenário
        </button>
        <button
          className="btn"
          style={{ justifyContent: "center", fontSize: 10, background: "var(--orange-dim)", borderColor: "rgba(249,115,22,.25)", color: "var(--orange)" }}
          onClick={() => setShowVisualEditor(true)}
        >
          + Visual Editor
        </button>
        <button
          className="btn ghost"
          style={{ justifyContent: "center", fontSize: 9.5 }}
          onClick={handleImport}
        >
          Carregar .json
        </button>
      </div>

      {/* Visual Editor modal */}
      {showVisualEditor && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 600,
          display: "flex", alignItems: "center", justifyContent: "center"
        }} onClick={() => setShowVisualEditor(false)}>
          <div style={{
            background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 12,
            width: 460, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", padding: "10px 14px 10px", borderBottom: "1px solid var(--bdr)", flexShrink: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 13, flex: 1, color: "var(--orange)", fontFamily: "var(--fh)", textTransform: "uppercase", letterSpacing: "1px" }}>Visual Editor</span>
              <button style={{ background: "none", border: "1px solid var(--bdr)", borderRadius: 6, color: "var(--tx3)", padding: "2px 8px", cursor: "pointer" }} onClick={() => setShowVisualEditor(false)}>✕</button>
            </div>
            <ScenarioVisualEditor
              sys={sys}
              onClose={() => setShowVisualEditor(false)}
              onSave={(s) => {
                applyTestPreset(s);
                setActiveId(s.id);
                setShowVisualEditor(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Custom scenario builder modal/inline */}
      {showBuilder && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 500,
          display: "flex", alignItems: "center", justifyContent: "center"
        }} onClick={() => setShowBuilder(false)}>
          <div style={{
            background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 12,
            width: 420, maxHeight: "80vh", overflowY: "auto", padding: "14px 0"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", padding: "0 14px 10px", borderBottom: "1px solid var(--bdr)", marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>Novo Cenário</span>
              <button style={{ background: "none", border: "1px solid var(--bdr)", borderRadius: 6, color: "var(--tx3)", padding: "2px 8px", cursor: "pointer" }} onClick={() => setShowBuilder(false)}>✕</button>
            </div>
            <CustomScenarioBuilder
              prot={prot}
              outMatrix={outMatrix}
              inMatrix={inMatrix}
              applyTestPreset={(s) => { applyTestPreset(s); setActiveId(s.id); setShowBuilder(false); }}
              phasors={phasors}
            />
          </div>
        </div>
      )}
    </div>
  );
}
