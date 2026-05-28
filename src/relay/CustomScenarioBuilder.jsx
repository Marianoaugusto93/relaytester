import { useState, useCallback, useRef } from "react";
import { protOrder } from "../defaults.js";
import { useTranslation } from "../i18n/useTranslation.js";
import { getAllCustomScenarios, saveCustomScenario, deleteCustomScenario, exportScenarioAsJson, importScenarioFromFile } from "../scenarios/customScenarios.js";

function diffClass(d) { return d === "Beginner" ? "beg" : d === "Advanced" ? "adv" : "int"; }

function CaptureAndSave({ onSave, onCancel, isEdit }) {
  const { t } = useTranslation();
  return (
    <div className="cs-form-btns">
      <button className="cs-save-btn" onClick={onSave}>{isEdit ? t("customScenarios.updateBtn") : t("customScenarios.saveBtn")}</button>
      <button className="cs-clear-btn" onClick={onCancel}>{t("customScenarios.cancelBtn")}</button>
    </div>
  );
}

export default function CustomScenarioBuilder({ prot, outMatrix, inMatrix, applyTestPreset, phasors }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [scenarios, setScenarios] = useState(() => getAllCustomScenarios());
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [diff, setDiff] = useState("Intermediate");
  const [expTrip, setExpTrip] = useState("");
  const [expTime, setExpTime] = useState("");
  const [msg, setMsg] = useState(null);
  const importRef = useRef(null);

  const refresh = () => setScenarios(getAllCustomScenarios());
  const showMsg = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 2500); };

  const clearForm = useCallback(() => {
    setEditId(null); setName(""); setDesc(""); setDiff("Intermediate"); setExpTrip(""); setExpTime("");
  }, []);

  const handleSave = () => {
    if (!name.trim()) { showMsg(t("customScenarios.msgNameRequired"), false); return; }
    const fns = protOrder.filter(fid => prot[fid]?.enabled);
    const stages = {};
    protOrder.forEach(fid => {
      const f = prot[fid];
      if (!f) return;
      if (fid === "27/59") { stages[fid] = { s27: (f.stages27 || []).map((s, i) => s.enabled ? i : null).filter(i => i !== null), s59: (f.stages59 || []).map((s, i) => s.enabled ? i : null).filter(i => i !== null) }; }
      else if (fid === "81") { stages[fid] = { s81u: (f.stages81u || []).map((s, i) => s.enabled ? i : null).filter(i => i !== null), s81o: (f.stages81o || []).map((s, i) => s.enabled ? i : null).filter(i => i !== null) }; }
      else if (fid === "32") { stages[fid] = { s32r: (f.stages32r || []).map((s, i) => s.enabled ? i : null).filter(i => i !== null), s32f: (f.stages32f || []).map((s, i) => s.enabled ? i : null).filter(i => i !== null) }; }
      else if (fid !== "79") { stages[fid] = (f.stages || []).map((s, i) => s.enabled ? i : null).filter(i => i !== null); }
    });
    const out = {};
    Object.keys(outMatrix).forEach(row => { const cols = Object.keys(outMatrix[row]).filter(c => outMatrix[row][c]); if (cols.length > 0) { out[row] = {}; cols.forEach(c => { out[row][c] = true; }); } });
    const inp = {};
    Object.keys(inMatrix).forEach(row => { const cols = Object.keys(inMatrix[row]).filter(c => inMatrix[row][c]); if (cols.length > 0) { inp[row] = {}; cols.forEach(c => { inp[row][c] = true; }); } });
    const id = editId || `custom_${Date.now()}`;
    const scenario = {
      id, type: "custom",
      label: name.trim().slice(0, 20),
      name: name.trim(),
      description: desc.trim(),
      difficulty: diff,
      createdAt: new Date().toISOString(),
      phasors: phasors || undefined,
      fns, stages, patch: {}, out, inp,
      expectedTrip: expTrip.trim() || undefined,
      expectedTime: expTime !== "" ? parseFloat(expTime) : undefined,
    };
    const ok = saveCustomScenario(scenario);
    if (ok) { showMsg(editId ? t("customScenarios.msgUpdated") : t("customScenarios.msgSaved")); refresh(); clearForm(); setOpen(false); }
    else { showMsg(t("customScenarios.msgSaveFailed"), false); }
  };

  const handleEdit = (s) => {
    setEditId(s.id); setName(s.name); setDesc(s.description || ""); setDiff(s.difficulty || "Intermediate");
    setExpTrip(s.expectedTrip || ""); setExpTime(s.expectedTime != null ? String(s.expectedTime) : "");
    setOpen(true);
  };

  const handleDelete = (id) => {
    if (!window.confirm(t("customScenarios.confirmDelete"))) return;
    deleteCustomScenario(id); refresh(); showMsg(t("customScenarios.msgDeleted"));
  };

  const handleExport = (s) => { exportScenarioAsJson(s); showMsg(t("customScenarios.msgExported")); };

  const handleLoad = (s) => { applyTestPreset(s); showMsg(t("customScenarios.msgLoaded")); };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    importScenarioFromFile(file).then(obj => {
      if (!obj.fns || !Array.isArray(obj.fns)) { showMsg(t("customScenarios.msgInvalidFile"), false); return; }
      if (!obj.id) obj.id = `custom_${Date.now()}`;
      obj.type = "custom";
      if (!obj.label && obj.name) obj.label = obj.name.slice(0, 20);
      const ok = saveCustomScenario(obj);
      if (ok) { showMsg(t("customScenarios.msgImported")); refresh(); }
      else { showMsg(t("customScenarios.msgImportFailed"), false); }
    }).catch(() => showMsg(t("customScenarios.msgReadError"), false));
  };

  const enabledFns = protOrder.filter(fid => prot[fid]?.enabled);
  const handleKeyDown=(e)=>{if(e.key==="Escape"){clearForm();setOpen(false);}};

  return (
    <section className="cs-section" aria-label={t("customScenarios.title")}>
      {msg && (
        <div style={{ fontSize: 9, padding: "4px 8px", borderRadius: 6, marginBottom: 6, background: msg.ok ? "rgba(74,222,128,.1)" : "rgba(248,113,113,.1)", color: msg.ok ? "var(--green)" : "var(--red)", border: `1px solid ${msg.ok ? "rgba(74,222,128,.25)" : "rgba(248,113,113,.25)"}` }}>
          {msg.text}
        </div>
      )}

      {open && (
        <div className="cs-form" role="dialog" aria-modal="true" aria-labelledby="csb-title" onKeyDown={handleKeyDown}>
          <div id="csb-title" style={{fontSize:13,fontWeight:700,marginBottom:12,color:"var(--tx)"}}>{editId ? t("customScenarios.updateBtn") : t("customScenarios.saveBtn")}</div>
          <div className="cs-field">
            <label>{t("customScenarios.nameLabel")}</label>
            <input className="cs-input" value={name} onChange={e => setName(e.target.value)} placeholder={t("customScenarios.namePlaceholder")} maxLength={60} />
          </div>
          <div className="cs-field">
            <label>{t("customScenarios.descLabel")}</label>
            <textarea className="cs-textarea" value={desc} onChange={e => setDesc(e.target.value)} placeholder={t("customScenarios.descPlaceholder")} rows={2} />
          </div>
          <div className="cs-field">
            <label>{t("customScenarios.diffLabel")}</label>
            <div className="cs-diff">
              {["Beginner", "Intermediate", "Advanced"].map(d => (
                <button key={d} className={`cs-diff-btn ${diffClass(d)} ${diff === d ? "on" : ""}`} onClick={() => setDiff(d)}>{d}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div className="cs-field">
              <label>{t("customScenarios.expTripLabel")}</label>
              <input className="cs-input" value={expTrip} onChange={e => setExpTrip(e.target.value)} placeholder={t("customScenarios.expTripPlaceholder")} />
            </div>
            <div className="cs-field">
              <label>{t("customScenarios.expTimeLabel")}</label>
              <input className="cs-input" type="number" step="0.01" min="0" value={expTime} onChange={e => setExpTime(e.target.value)} placeholder={t("customScenarios.expTimePlaceholder")} />
            </div>
          </div>
          <div className="cs-snapshot">
            <div style={{ fontSize: 8, color: "var(--tx3)", marginBottom: 4, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>{t("customScenarios.captureHint")}</div>
            <div className="cs-snap-row">
              <span style={{ color: "var(--tx3)" }}>{t("customScenarios.activeFns")}</span>
              {enabledFns.length > 0
                ? enabledFns.map(f => <span key={f} style={{ color: "var(--orange)", marginRight: 4, fontWeight: 700 }}>{f}</span>)
                : <span style={{ color: "var(--tx3)" }}>{t("customScenarios.none")}</span>}
            </div>
            <div style={{ marginTop: 2, color: "var(--tx3)", fontSize: 8 }}>{t("customScenarios.captureDesc")}</div>
          </div>
          <CaptureAndSave onSave={handleSave} onCancel={() => { clearForm(); setOpen(false); }} isEdit={!!editId} />
        </div>
      )}

      <div className="cs-import-row">
        <span className="cs-import-lbl">{t("customScenarios.importLbl")}</span>
        <button className="cs-import-btn" onClick={() => importRef.current?.click()}>{t("customScenarios.importBtn")}</button>
        <input ref={importRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleImport} />
      </div>

      {scenarios.length === 0
        ? <div className="cs-empty">{t("customScenarios.empty")}</div>
        : <div className="cs-list">
          {scenarios.map(s => (
            <div key={s.id} className="cs-item">
              <div className="cs-item-top">
                <span className="cs-item-name">{s.name}</span>
                {s.difficulty && <span className={`cs-diff-badge ${diffClass(s.difficulty)}`}>{s.difficulty}</span>}
              </div>
              {s.description && <div className="cs-item-desc">{s.description}</div>}
              <div className="cs-item-btns">
                <button className="cs-item-btn load" onClick={() => handleLoad(s)}>{t("customScenarios.loadBtn")}</button>
                <button className="cs-item-btn edit" onClick={() => handleEdit(s)}>{t("customScenarios.editBtn")}</button>
                <button className="cs-item-btn exp" onClick={() => handleExport(s)}>{t("customScenarios.exportBtn")}</button>
                <button className="cs-item-btn del" onClick={() => handleDelete(s.id)}>{t("customScenarios.deleteBtn")}</button>
              </div>
            </div>
          ))}
        </div>
      }
    </section>
  );
}
