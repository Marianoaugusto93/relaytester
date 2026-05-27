import { useState, useEffect } from "react";
import { EDUCATIONAL_SCENARIOS } from "../scenarios/educational-scenarios.js";
import { getAllCustomScenarios, toggleFavorite, exportAllCustomScenarios, exportScenarioAsJson, saveCustomScenario } from "../scenarios/customScenarios.js";
import { useTranslation } from "../i18n/useTranslation.js";
import CustomScenarioBuilder from "./CustomScenarioBuilder.jsx";
import ScenarioVisualEditor from "../ScenarioVisualEditor.jsx";

export default function ScenariosSidebar({ pfMode, setPfMode, prot, outMatrix, inMatrix, phasors, applyTestPreset, sys }) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const [customScenarios, setCustomScenarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setCustomScenarios(getAllCustomScenarios());
  }, []);

  const refreshCustomScenarios = () => {
    setCustomScenarios(getAllCustomScenarios());
  };

  const filteredCustom = customScenarios
    .filter(s => !searchTerm || s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.label?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

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

          if (Array.isArray(obj)) {
            // Batch import: array of scenarios
            obj.forEach((scenario, idx) => {
              if (!scenario.id) scenario.id = `import_${Date.now()}_${idx}`;
              if (!scenario.type) scenario.type = "custom";
              if (!scenario.label && scenario.name) scenario.label = scenario.name.slice(0, 20);
              if (!scenario.createdAt) scenario.createdAt = new Date().toISOString();
              saveCustomScenario(scenario);
            });
            refreshCustomScenarios();
          } else {
            // Single scenario import
            if (!obj.fns || !Array.isArray(obj.fns)) { alert("Arquivo inválido: fns array required"); return; }
            if (!obj.id) obj.id = `import_${Date.now()}`;
            obj.type = "custom";
            if (!obj.label && obj.name) obj.label = obj.name.slice(0, 20);
            if (!obj.createdAt) obj.createdAt = new Date().toISOString();
            saveCustomScenario(obj);
            applyTestPreset(obj);
            setActiveId(obj.id);
            refreshCustomScenarios();
          }
        } catch (err) { alert("Erro ao ler arquivo: " + err.message); }
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

      {/* Search bar (only affects custom scenarios) */}
      {customScenarios.length > 0 && (
        <div style={{ padding: "6px 10px 4px" }}>
          <input
            type="text"
            className="scen-search"
            placeholder="Buscar cenário…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: "4px",
              border: "1px solid var(--bdr)",
              background: "var(--card2)",
              color: "var(--tx)",
              fontSize: 12,
              boxSizing: "border-box"
            }}
          />
        </div>
      )}

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
        {filteredCustom.map(s => (
          <div
            key={`custom-${s.id}`}
            style={{
              display: "flex",
              gap: 4,
              alignItems: "center",
              padding: "4px 6px",
              borderRadius: 4,
              background: activeId === s.id ? "var(--orange-dim)" : "transparent"
            }}
          >
            <button
              className={`scen${activeId === s.id ? " on" : ""}`}
              title={s.description}
              onClick={() => handleLoad(s)}
              style={{ flex: 1 }}
            >
              <span className="nm">{s.label || s.name}{s.favorite && " ★"}</span>
              <span className="ds">{s.description?.slice(0, 50)}</span>
            </button>
            <button
              className="scen-star"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(s.id);
                refreshCustomScenarios();
              }}
              title={s.favorite ? "Remover favorito" : "Marcar como favorito"}
              style={{
                background: "none",
                border: "none",
                color: s.favorite ? "#FFD700" : "var(--tx3)",
                cursor: "pointer",
                fontSize: 14,
                padding: "4px 6px",
                transition: "color 0.2s"
              }}
            >
              {s.favorite ? "★" : "☆"}
            </button>
            <button
              className="scen-export-btn"
              onClick={(e) => {
                e.stopPropagation();
                exportScenarioAsJson(s);
              }}
              title="Exportar cenário"
              style={{
                background: "none",
                border: "none",
                color: "var(--tx3)",
                cursor: "pointer",
                fontSize: 12,
                padding: "4px 6px",
                transition: "color 0.2s"
              }}
            >
              ↓
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="scen-footer" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: "var(--rs)",
              border: "1px solid var(--bdr)",
              background: "var(--card2)",
              color: "var(--tx2)",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all .2s"
            }}
            onMouseEnter={e => { e.target.style.background = "var(--card3)"; e.target.style.color = "var(--tx)"; }}
            onMouseLeave={e => { e.target.style.background = "var(--card2)"; e.target.style.color = "var(--tx2)"; }}
            onClick={() => setShowBuilder(v => !v)}
          >
            + Novo cenário
          </button>
          <button
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: "var(--rs)",
              border: "1px solid rgba(249,115,22,.4)",
              background: "var(--orange-dim)",
              color: "var(--orange)",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all .2s"
            }}
            onMouseEnter={e => { e.target.style.background = "rgba(249,115,22,.18)"; }}
            onMouseLeave={e => { e.target.style.background = "var(--orange-dim)"; }}
            onClick={() => setShowVisualEditor(true)}
          >
            + Visual Editor
          </button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: "var(--rs)",
              border: "1px solid var(--bdr)",
              background: "transparent",
              color: "var(--tx3)",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all .2s"
            }}
            onMouseEnter={e => { e.target.style.background = "var(--card2)"; e.target.style.color = "var(--tx2)"; }}
            onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "var(--tx3)"; }}
            onClick={handleImport}
          >
            Carregar .json
          </button>
          <button
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: "var(--rs)",
              border: "1px solid var(--bdr)",
              background: "transparent",
              color: customScenarios.length > 0 ? "var(--tx3)" : "var(--tx-disabled, rgba(255,255,255,0.3))",
              fontSize: 10,
              fontWeight: 600,
              cursor: customScenarios.length > 0 ? "pointer" : "not-allowed",
              transition: "all .2s",
              opacity: customScenarios.length > 0 ? 1 : 0.5
            }}
            onMouseEnter={e => { if (customScenarios.length > 0) { e.target.style.background = "var(--card2)"; e.target.style.color = "var(--tx2)"; }}}
            onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = customScenarios.length > 0 ? "var(--tx3)" : "var(--tx-disabled, rgba(255,255,255,0.3))"; }}
            onClick={() => customScenarios.length > 0 && exportAllCustomScenarios(customScenarios)}
            disabled={customScenarios.length === 0}
          >
            Exportar Todos
          </button>
        </div>
      </div>

      {/* Visual Editor modal */}
      {showVisualEditor && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 600,
          display: "flex", alignItems: "center", justifyContent: "center"
        }} onClick={() => { refreshCustomScenarios(); setShowVisualEditor(false); }}>
          <div style={{
            background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 12,
            width: 460, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", padding: "10px 14px 10px", borderBottom: "1px solid var(--bdr)", flexShrink: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 13, flex: 1, color: "var(--orange)", fontFamily: "var(--fh)", textTransform: "uppercase", letterSpacing: "1px" }}>Visual Editor</span>
              <button style={{ background: "none", border: "1px solid var(--bdr)", borderRadius: 6, color: "var(--tx3)", padding: "2px 8px", cursor: "pointer" }} onClick={() => { refreshCustomScenarios(); setShowVisualEditor(false); }}>✕</button>
            </div>
            <ScenarioVisualEditor
              sys={sys}
              onClose={() => { refreshCustomScenarios(); setShowVisualEditor(false); }}
              onSave={(s) => {
                applyTestPreset(s);
                setActiveId(s.id);
                setShowVisualEditor(false);
                refreshCustomScenarios();
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
        }} onClick={() => { refreshCustomScenarios(); setShowBuilder(false); }}>
          <div style={{
            background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 12,
            width: 420, maxHeight: "80vh", overflowY: "auto", padding: "14px 0"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", padding: "0 14px 10px", borderBottom: "1px solid var(--bdr)", marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>Novo Cenário</span>
              <button style={{ background: "none", border: "1px solid var(--bdr)", borderRadius: 6, color: "var(--tx3)", padding: "2px 8px", cursor: "pointer" }} onClick={() => { refreshCustomScenarios(); setShowBuilder(false); }}>✕</button>
            </div>
            <CustomScenarioBuilder
              prot={prot}
              outMatrix={outMatrix}
              inMatrix={inMatrix}
              applyTestPreset={(s) => { applyTestPreset(s); setActiveId(s.id); setShowBuilder(false); refreshCustomScenarios(); }}
              phasors={phasors}
            />
          </div>
        </div>
      )}
    </div>
  );
}
