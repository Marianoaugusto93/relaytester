import { useState, useMemo } from "react";
import { useTranslation } from "./i18n/useTranslation.js";
import { saveCustomScenario } from "./scenarios/customScenarios.js";
import { calcTheoreticalTripTime, calc51NTheoreticalTripTime, get50TheoreticalTime, get50NTheoreticalTime, toRect, fromRect } from "./protection.js";
import { defaultProtections } from "./defaults.js";
import { CURVE_OPTIONS } from "./estudos/constants/curves.js";

// Protection functions available in the editor
const EDITOR_FUNCTIONS = [
  { id: "51",    label: "51",    name: "Sobrec. Temp. Fase" },
  { id: "50",    label: "50",    name: "Sobrec. Inst. Fase" },
  { id: "51N",   label: "51N",   name: "Sobrec. Temp. Neutro" },
  { id: "50N",   label: "50N",   name: "Sobrec. Inst. Neutro" },
  { id: "67",    label: "67",    name: "Direcional Fase" },
  { id: "67N",   label: "67N",   name: "Direcional Neutro" },
  { id: "27/59", label: "27/59", name: "Sub / Sobretensão" },
  { id: "47",    label: "47",    name: "Seq. Neg. Tensão" },
  { id: "46",    label: "46",    name: "Sobrec. Seq. Negativa" },
  { id: "81",    label: "81",    name: "Sub / Sobrefrequência" },
];

// Compute zero-sequence current magnitude from three phasors
function computeI0(currents) {
  const sum = ["Ia", "Ib", "Ic"].reduce(
    (acc, k) => {
      const r = toRect(currents[k].mag, currents[k].ang);
      return { re: acc.re + r.re, im: acc.im + r.im };
    },
    { re: 0, im: 0 }
  );
  return fromRect(sum.re, sum.im).mag;
}

// Compute negative-sequence current magnitude I2 from three phasors
function computeI2(currents) {
  const toR = (k) => toRect(currents[k].mag, currents[k].ang);
  const ia = toR("Ia"), ib = toR("Ib"), ic = toR("Ic");
  const a2Re = Math.cos((240 * Math.PI) / 180), a2Im = Math.sin((240 * Math.PI) / 180);
  const aRe = Math.cos((120 * Math.PI) / 180), aIm = Math.sin((120 * Math.PI) / 180);
  const aIbRe = aRe * ib.re - aIm * ib.im, aIbIm = aRe * ib.im + aIm * ib.re;
  const a2IcRe = a2Re * ic.re - a2Im * ic.im, a2IcIm = a2Re * ic.im + a2Im * ic.re;
  return fromRect(
    (ia.re + aIbRe + a2IcRe) / 3,
    (ia.im + aIbIm + a2IcIm) / 3
  ).mag;
}

// Mini phasor SVG diagram (read-only visualization)
function PhasorMini({ currents, voltages }) {
  const CX = 100, CY = 100, R = 80;
  const toRad = (deg) => ((deg - 90) * Math.PI) / 180;

  const allMags = [
    currents.Ia.mag, currents.Ib.mag, currents.Ic.mag,
    voltages.Va.mag, voltages.Vb.mag, voltages.Vc.mag,
  ];
  const maxMag = Math.max(5, ...allMags);

  const arrow = (mag, ang, color, dashed) => {
    const scale = mag / maxMag;
    const x2 = CX + R * scale * Math.cos(toRad(ang));
    const y2 = CY + R * scale * Math.sin(toRad(ang));
    return (
      <g key={`${color}-${ang}`}>
        <line
          x1={CX} y1={CY} x2={x2} y2={y2}
          stroke={color} strokeWidth={dashed ? 1.5 : 2}
          strokeDasharray={dashed ? "2,3" : undefined}
          markerEnd={`url(#arr-${dashed ? "dash" : "solid"})`}
        />
      </g>
    );
  };

  const degMarkers = [0, 90, 180, 270];

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", borderRadius: 8,
      border: "1px solid var(--bdr)", padding: 4,
      display: "flex", justifyContent: "center",
    }}>
      <svg width={200} height={200} viewBox="0 0 200 200">
        <defs>
          <marker id="arr-solid" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="currentColor" />
          </marker>
          <marker id="arr-dash" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#6ab4f5" />
          </marker>
        </defs>
        {/* Circular grid */}
        {[0.25, 0.5, 0.75, 1].map(r => (
          <circle key={r} cx={CX} cy={CY} r={R * r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        ))}
        {/* Cross axes */}
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
        <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
        {/* Degree markers */}
        {degMarkers.map(deg => {
          const rx = CX + (R + 10) * Math.cos(toRad(deg));
          const ry = CY + (R + 10) * Math.sin(toRad(deg));
          return (
            <text key={deg} x={rx} y={ry} textAnchor="middle" dominantBaseline="middle"
              fill="rgba(255,255,255,0.3)" fontSize={7}>{deg}°</text>
          );
        })}
        {/* Voltage arrows (dashed, blue family) */}
        {arrow(voltages.Va.mag, voltages.Va.ang, "#6ab4f5", true)}
        {arrow(voltages.Vb.mag, voltages.Vb.ang, "#93c5fd", true)}
        {arrow(voltages.Vc.mag, voltages.Vc.ang, "#818cf8", true)}
        {/* Current arrows (solid) */}
        {arrow(currents.Ia.mag, currents.Ia.ang, "#FFD700", false)}
        {arrow(currents.Ib.mag, currents.Ib.ang, "#E53935", false)}
        {arrow(currents.Ic.mag, currents.Ic.ang, "#9E9E9E", false)}
        {/* Center point */}
        <circle cx={CX} cy={CY} r={3} fill="#111" stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
        {/* Legend */}
        {[
          { color: "#FFD700", label: "Ia" }, { color: "#E53935", label: "Ib" }, { color: "#9E9E9E", label: "Ic" },
          { color: "#6ab4f5", label: "Va", dash: true }, { color: "#93c5fd", label: "Vb", dash: true }, { color: "#818cf8", label: "Vc", dash: true },
        ].map(({ color, label, dash }, i) => (
          <g key={label} transform={`translate(${4 + i * 32}, 190)`}>
            <line x1={0} y1={0} x2={10} y2={0} stroke={color} strokeWidth={dash ? 1.5 : 2} strokeDasharray={dash ? "2,3" : undefined} />
            <text x={12} y={0} dominantBaseline="middle" fill={color} fontSize={7}>{label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/**
 * Compute the expected trip time given phasors and a selected function + its stage settings.
 * Returns {stageId, time} for the fastest tripping stage, or null if no trip.
 */
function computePreviewTrip(currents, voltages, selectedFn, stageSettings, sys) {
  const fn = selectedFn;
  const Vnom = (sys?.tp?.secV) || 115;

  if (fn === "51") {
    const Ia = currents.Ia.mag;
    for (const st of stageSettings) {
      if (!st.enabled) continue;
      const t = calcTheoreticalTripTime(st, Ia);
      if (Number.isFinite(t) && t > 0) return { stageId: st.id, time: t };
    }
  }
  if (fn === "50") {
    const Ia = currents.Ia.mag;
    for (const st of stageSettings) {
      if (!st.enabled) continue;
      if (Ia >= st.pickup) {
        const t = get50TheoreticalTime(st.timeOp || 0);
        return { stageId: st.id, time: t };
      }
    }
  }
  if (fn === "51N") {
    const I0 = computeI0(currents);
    for (const st of stageSettings) {
      if (!st.enabled) continue;
      const t = calc51NTheoreticalTripTime(st, I0);
      if (Number.isFinite(t) && t > 0) return { stageId: st.id, time: t };
    }
  }
  if (fn === "50N") {
    const I0 = computeI0(currents);
    for (const st of stageSettings) {
      if (!st.enabled) continue;
      if (I0 >= st.pickup) {
        const t = get50NTheoreticalTime(st.timeOp || 0);
        return { stageId: st.id, time: t };
      }
    }
  }
  if (fn === "46") {
    const I2 = computeI2(currents);
    for (const st of stageSettings) {
      if (!st.enabled) continue;
      if (I2 >= st.pickup) return { stageId: st.id, time: st.timeOp || 1.0 };
    }
  }
  if (fn === "27/59") {
    const Va = voltages.Va.mag / Vnom;
    for (const st of stageSettings) {
      if (!st.enabled) continue;
      if (Va < st.pickup) return { stageId: st.id, time: st.timeOp || 1.0 };
    }
  }
  if (fn === "47") {
    const Vab = voltages.Va.mag;
    for (const st of stageSettings) {
      if (!st.enabled) continue;
      if (Vab < st.pickup * Vnom) return { stageId: st.id, time: st.timeOp || 1.0 };
    }
  }
  if (fn === "81") {
    for (const st of stageSettings) {
      if (!st.enabled) continue;
      return { stageId: st.id, time: st.timeOp || 1.0 };
    }
  }
  if (fn === "67") {
    const stage = stageSettings[0];
    if (!stage?.enabled) return null;
    if (currents.Ia.mag < stage.pickup) return null;
    const mta = stage.mta ?? 0;
    const relAng = ((currents.Ia.ang - mta + 360) % 360);
    if (relAng > 90 && relAng < 270) return null;
    return { stageId: stage.id, time: stage.timeDial ?? stage.timeOp ?? 0.1 };
  }
  if (fn === "67N") {
    const stage = stageSettings[0];
    if (!stage?.enabled) return null;
    const I0mag = computeI0(currents);
    if (I0mag < stage.pickup) return null;
    const mta = stage.mta ?? 0;
    const I0ang = (() => {
      const sum = ["Ia", "Ib", "Ic"].reduce(
        (acc, k) => {
          const r = toRect(currents[k].mag, currents[k].ang);
          return { re: acc.re + r.re, im: acc.im + r.im };
        },
        { re: 0, im: 0 }
      );
      return fromRect(sum.re, sum.im).ang;
    })();
    const relAng = ((I0ang - mta + 360) % 360);
    if (relAng > 90 && relAng < 270) return null;
    return { stageId: stage.id, time: stage.timeDial ?? stage.timeOp ?? 0.1 };
  }
  return null;
}

// Slider with label and value display
function Slider({ label, value, min, max, step, unit, color, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: color || "var(--cyan)", fontFamily: "var(--fm)" }}>
          {typeof value === "number" ? value.toFixed(step < 1 ? 1 : 0) : value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: color || "var(--cyan)", cursor: "pointer" }}
      />
    </div>
  );
}

// Section header
function SectionHead({ label, color }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, color: color || "var(--tx3)",
      textTransform: "uppercase", letterSpacing: "1px",
      borderBottom: `1px solid var(--bdr)`, paddingBottom: 4, marginBottom: 6,
      fontFamily: "var(--fm)"
    }}>
      {label}
    </div>
  );
}

export default function ScenarioVisualEditor({ onClose, onSave, sys }) {
  const { t } = useTranslation();
  // Scenario metadata
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  // Selected protection function
  const [selectedFn, setSelectedFn] = useState("51");

  // Phasor state: currents and voltages
  const [currents, setCurrents] = useState({
    Ia: { mag: 5.0, ang: 0 },
    Ib: { mag: 5.0, ang: -120 },
    Ic: { mag: 5.0, ang: 120 },
  });
  const [voltages, setVoltages] = useState({
    Va: { mag: 66.4, ang: 0 },
    Vb: { mag: 66.4, ang: -120 },
    Vc: { mag: 66.4, ang: 120 },
  });

  // Function-specific stage settings (derived from defaults, editable)
  const [stageSettings, setStageSettings] = useState(() => {
    const fn = defaultProtections["51"];
    return fn.stages.map(s => ({ ...s, enabled: s.id === "51-1" }));
  });

  const [msg, setMsg] = useState(null);

  const showMsg = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 2500);
  };

  // When function changes, reset stage settings to defaults for that function
  const handleFnChange = (fid) => {
    setSelectedFn(fid);
    const fnDef = defaultProtections[fid];
    if (!fnDef) { setStageSettings([]); return; }
    if (fid === "27/59") {
      setStageSettings((fnDef.stages27 || []).map((s, i) => ({ ...s, enabled: i === 0 })));
    } else if (fid === "81") {
      setStageSettings((fnDef.stages81u || []).map((s, i) => ({ ...s, enabled: i === 0 })));
    } else if (fid === "32") {
      setStageSettings((fnDef.stages32r || []).map((s, i) => ({ ...s, enabled: i === 0 })));
    } else if (fnDef.stages) {
      setStageSettings(fnDef.stages.map((s, i) => ({ ...s, enabled: i === 0 })));
    } else {
      setStageSettings([]);
    }
  };

  const updateStage = (idx, field, value) => {
    setStageSettings(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const updateCurrent = (phase, field, value) => {
    setCurrents(prev => ({ ...prev, [phase]: { ...prev[phase], [field]: value } }));
  };

  const updateVoltage = (phase, field, value) => {
    setVoltages(prev => ({ ...prev, [phase]: { ...prev[phase], [field]: value } }));
  };

  // Preview calculation
  const preview = useMemo(() => {
    return computePreviewTrip(currents, voltages, selectedFn, stageSettings, sys);
  }, [currents, voltages, selectedFn, stageSettings, sys]);

  const handleSave = () => {
    if (!name.trim()) { showMsg(t("scenarioEditor.messages.nameRequired"), false); return; }

    // Build scenario object matching the format applyTestPreset expects
    const id = `visual_${Date.now()}`;
    const fnInfo = EDITOR_FUNCTIONS.find(f => f.id === selectedFn);
    const labelName = selectedFn;

    // Build fns and stages structures
    const fns = [selectedFn];
    let stages = {};
    const fnDef = defaultProtections[selectedFn];

    if (selectedFn === "27/59") {
      stages["27/59"] = {
        s27: stageSettings.map((s, i) => s.enabled ? i : null).filter(i => i !== null),
        s59: [],
      };
    } else if (selectedFn === "81") {
      stages["81"] = {
        s81u: stageSettings.map((s, i) => s.enabled ? i : null).filter(i => i !== null),
        s81o: [],
      };
    } else if (fnDef?.stages) {
      stages[selectedFn] = stageSettings.map((s, i) => s.enabled ? i : null).filter(i => i !== null);
    }

    // Build patch with the edited stage values
    const patch = {};
    if (selectedFn !== "27/59" && selectedFn !== "81" && fnDef?.stages) {
      patch[selectedFn] = {
        stages: stageSettings.map(s => ({
          pickup: s.pickup,
          timeDial: s.timeDial,
          curve: s.curve,
          timeOp: s.timeOp,
        })),
      };
    }

    const scenario = {
      id,
      type: "custom",
      label: name.trim().slice(0, 20),
      name: name.trim(),
      description: desc.trim(),
      difficulty: "Intermediate",
      createdAt: new Date().toISOString(),
      phasors: {
        currents: { ...currents },
        voltages: { ...voltages },
      },
      fns,
      stages,
      patch,
      out: {},
      inp: {},
      expectedTrip: preview ? `${preview.stageId}` : undefined,
      expectedTime: preview ? parseFloat(preview.time.toFixed(3)) : undefined,
    };

    const ok = saveCustomScenario(scenario);
    if (ok) {
      showMsg(t("scenarioEditor.messages.saved"));
      if (onSave) onSave(scenario);
      setTimeout(() => onClose && onClose(), 800);
    } else {
      showMsg("Erro ao salvar", false);
    }
  };

  const handleReset = () => {
    setName("");
    setDesc("");
    setSelectedFn("51");
    handleFnChange("51");
    setCurrents({ Ia: { mag: 5.0, ang: 0 }, Ib: { mag: 5.0, ang: -120 }, Ic: { mag: 5.0, ang: 120 } });
    setVoltages({ Va: { mag: 66.4, ang: 0 }, Vb: { mag: 66.4, ang: -120 }, Vc: { mag: 66.4, ang: 120 } });
  };

  // Render function-specific stage settings
  const renderStageSettings = () => {
    if (!stageSettings || stageSettings.length === 0) return null;
    const fn = selectedFn;
    const hasCurve = ["51", "51N", "67", "67N"].includes(fn);
    const isInstant = ["50", "50N"].includes(fn);
    const isVolt = ["27/59", "47"].includes(fn);
    const isFreq = fn === "81";
    const isCurrent = ["46"].includes(fn);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {stageSettings.map((st, idx) => (
          <div key={st.id} style={{
            background: "var(--card2)", borderRadius: 8, padding: "8px 10px",
            border: st.enabled ? "1px solid rgba(249,115,22,.25)" : "1px solid var(--bdr)",
            opacity: st.enabled ? 1 : 0.5,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: st.enabled ? 8 : 0 }}>
              <button
                onClick={() => updateStage(idx, "enabled", !st.enabled)}
                style={{
                  width: 14, height: 14, borderRadius: 3, border: "2px solid",
                  borderColor: st.enabled ? "var(--orange)" : "var(--tx3)",
                  background: st.enabled ? "var(--orange)" : "transparent",
                  cursor: "pointer", flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--tx)", fontFamily: "var(--fm)" }}>
                {st.id}
              </span>
            </div>
            {st.enabled && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div>
                  <div style={{ fontSize: 8, color: "var(--tx3)", marginBottom: 2, textTransform: "uppercase" }}>
                    {isVolt ? "Pickup (pu)" : isFreq ? "Pickup (Hz)" : "Pickup (A)"}
                  </div>
                  <input
                    type="number"
                    step={isVolt ? "0.01" : isFreq ? "0.1" : "0.1"}
                    min="0"
                    value={st.pickup}
                    onChange={e => updateStage(idx, "pickup", parseFloat(e.target.value) || 0)}
                    style={{
                      background: "var(--card3)", border: "1px solid var(--bdr)",
                      color: "var(--cyan)", padding: "4px 6px", borderRadius: 6,
                      fontSize: 11, fontFamily: "var(--fm)", width: "100%", outline: "none",
                    }}
                  />
                </div>
                {hasCurve && (
                  <div>
                    <div style={{ fontSize: 8, color: "var(--tx3)", marginBottom: 2, textTransform: "uppercase" }}>Time Dial</div>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={st.timeDial}
                      onChange={e => updateStage(idx, "timeDial", parseFloat(e.target.value) || 0.01)}
                      style={{
                        background: "var(--card3)", border: "1px solid var(--bdr)",
                        color: "var(--warm)", padding: "4px 6px", borderRadius: 6,
                        fontSize: 11, fontFamily: "var(--fm)", width: "100%", outline: "none",
                      }}
                    />
                  </div>
                )}
                {(isInstant || !hasCurve) && !isVolt && !isFreq && (
                  <div>
                    <div style={{ fontSize: 8, color: "var(--tx3)", marginBottom: 2, textTransform: "uppercase" }}>Tempo Op. (s)</div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={st.timeOp ?? 0.05}
                      onChange={e => updateStage(idx, "timeOp", parseFloat(e.target.value) || 0)}
                      style={{
                        background: "var(--card3)", border: "1px solid var(--bdr)",
                        color: "var(--warm)", padding: "4px 6px", borderRadius: 6,
                        fontSize: 11, fontFamily: "var(--fm)", width: "100%", outline: "none",
                      }}
                    />
                  </div>
                )}
                {(isVolt || isFreq || isCurrent) && (
                  <div>
                    <div style={{ fontSize: 8, color: "var(--tx3)", marginBottom: 2, textTransform: "uppercase" }}>Tempo Op. (s)</div>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={st.timeOp ?? 1.0}
                      onChange={e => updateStage(idx, "timeOp", parseFloat(e.target.value) || 0)}
                      style={{
                        background: "var(--card3)", border: "1px solid var(--bdr)",
                        color: "var(--warm)", padding: "4px 6px", borderRadius: 6,
                        fontSize: 11, fontFamily: "var(--fm)", width: "100%", outline: "none",
                      }}
                    />
                  </div>
                )}
                {hasCurve && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 8, color: "var(--tx3)", marginBottom: 2, textTransform: "uppercase" }}>Curva</div>
                    <select
                      value={st.curve || "IEC - Standard Inverse"}
                      onChange={e => updateStage(idx, "curve", e.target.value)}
                      style={{
                        background: "var(--card3)", border: "1px solid var(--bdr)",
                        color: "var(--tx)", padding: "4px 6px", borderRadius: 6,
                        fontSize: 10, fontFamily: "var(--fi)", width: "100%", outline: "none",
                      }}
                    >
                      {CURVE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 0,
      height: "100%", overflow: "hidden",
    }}>
      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Feedback message */}
        {msg && (
          <div style={{
            fontSize: 10, padding: "5px 10px", borderRadius: 6,
            background: msg.ok ? "rgba(74,222,128,.1)" : "rgba(248,113,113,.1)",
            color: msg.ok ? "var(--green)" : "var(--red)",
            border: `1px solid ${msg.ok ? "rgba(74,222,128,.25)" : "rgba(248,113,113,.25)"}`,
          }}>
            {msg.text}
          </div>
        )}

        {/* Name & Description */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SectionHead label={t("scenarioEditor.sections.identification")} color="var(--orange)" />
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <label style={{ fontSize: 9, fontWeight: 700, color: "var(--tx3)", textTransform: "uppercase" }}>{t("scenarioEditor.labels.scenarioName")} *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t("scenarioEditor.placeholders.name")}
              maxLength={60}
              style={{
                background: "var(--card2)", border: "1px solid var(--bdr)",
                color: "var(--tx)", padding: "6px 10px", borderRadius: 8,
                fontSize: 12, fontFamily: "var(--fi)", outline: "none", width: "100%",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <label style={{ fontSize: 9, fontWeight: 700, color: "var(--tx3)", textTransform: "uppercase" }}>{t("scenarioEditor.labels.scenarioDesc")}</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder={t("scenarioEditor.placeholders.objective")}
              rows={2}
              style={{
                background: "var(--card2)", border: "1px solid var(--bdr)",
                color: "var(--tx2)", padding: "6px 10px", borderRadius: 8,
                fontSize: 11, fontFamily: "var(--fi)", outline: "none", width: "100%",
                resize: "vertical",
              }}
            />
          </div>
        </div>

        {/* Function selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SectionHead label={t("scenarioEditor.sections.protectionFn")} color="var(--lav)" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
            {EDITOR_FUNCTIONS.map(f => (
              <button
                key={f.id}
                onClick={() => handleFnChange(f.id)}
                title={f.name}
                style={{
                  padding: "6px 4px",
                  background: selectedFn === f.id ? "var(--orange-dim)" : "var(--card2)",
                  border: selectedFn === f.id ? "1px solid rgba(249,115,22,.4)" : "1px solid var(--bdr)",
                  borderRadius: 8, cursor: "pointer",
                  color: selectedFn === f.id ? "var(--orange)" : "var(--tx3)",
                  fontSize: 10, fontWeight: 700, fontFamily: "var(--fm)",
                  textAlign: "center", transition: "all .15s",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "var(--tx3)", textAlign: "center", fontStyle: "italic" }}>
            {EDITOR_FUNCTIONS.find(f => f.id === selectedFn)?.name}
          </div>
        </div>

        {/* Current injection sliders */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionHead label={t("scenarioEditor.sections.currentInjection")} color="var(--cyan)" />
          {/* Balanced preset buttons */}
          <div style={{ display: "flex", flexDirection: "row", gap: 4, padding: "6px 8px", background: "var(--card2)", borderRadius: 8 }}>
            {[
              { label: "3φ Eq 5A", fn: () => setCurrents({ Ia: { mag: 5, ang: 0 }, Ib: { mag: 5, ang: -120 }, Ic: { mag: 5, ang: 120 } }) },
              { label: "3φ Eq 1A", fn: () => setCurrents({ Ia: { mag: 1, ang: 0 }, Ib: { mag: 1, ang: -120 }, Ic: { mag: 1, ang: 120 } }) },
              { label: "L-G 5A/0.3", fn: () => setCurrents({ Ia: { mag: 5, ang: 0 }, Ib: { mag: 0.3, ang: -120 }, Ic: { mag: 0.3, ang: 120 } }) },
            ].map(({ label, fn }) => (
              <button
                key={label}
                onClick={fn}
                style={{
                  flex: 1, padding: "5px 4px", fontSize: 9, fontWeight: 700,
                  background: "var(--card3)", border: "1px solid var(--bdr)",
                  borderRadius: 6, color: "var(--tx2)", cursor: "pointer",
                  fontFamily: "var(--fm)", letterSpacing: "0.3px",
                  transition: "border-color .15s, color .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cyan)"; e.currentTarget.style.color = "var(--cyan)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--bdr)"; e.currentTarget.style.color = "var(--tx2)"; }}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { key: "Ia", label: "Ia Mag", color: "var(--cyan)" },
              { key: "Ib", label: "Ib Mag", color: "var(--sky)" },
              { key: "Ic", label: "Ic Mag", color: "var(--lav)" },
            ].map(({ key, label, color }) => (
              <Slider
                key={key}
                label={label}
                value={currents[key].mag}
                min={0} max={Math.max(10, (sys?.tc?.secA || 5) * 3)} step={0.1}
                unit=" A"
                color={color}
                onChange={v => updateCurrent(key, "mag", v)}
              />
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 2 }}>
              {["Ia", "Ib", "Ic"].map((key) => (
                <div key={key}>
                  <div style={{ fontSize: 8, color: "var(--tx3)", marginBottom: 2, textTransform: "uppercase" }}>
                    {key} Ang (°)
                  </div>
                  <input
                    type="number"
                    step="1"
                    min="-360"
                    max="360"
                    value={currents[key].ang}
                    onChange={e => updateCurrent(key, "ang", parseFloat(e.target.value) || 0)}
                    style={{
                      background: "var(--card2)", border: "1px solid var(--bdr)",
                      color: "var(--warm)", padding: "4px 6px", borderRadius: 6,
                      fontSize: 11, fontFamily: "var(--fm)", width: "100%", outline: "none",
                      textAlign: "right",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Voltage injection sliders */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionHead label={t("scenarioEditor.sections.voltageInjection")} color="var(--warm)" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { key: "Va", label: "Va Mag", color: "var(--warm)" },
              { key: "Vb", label: "Vb Mag", color: "var(--amber)" },
              { key: "Vc", label: "Vc Mag", color: "var(--rose)" },
            ].map(({ key, label, color }) => (
              <Slider
                key={key}
                label={label}
                value={voltages[key].mag}
                min={0} max={120} step={0.5}
                unit=" V"
                color={color}
                onChange={v => updateVoltage(key, "mag", v)}
              />
            ))}
            {/* Voltage angle inputs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 2 }}>
              {["Va", "Vb", "Vc"].map((key) => (
                <div key={key}>
                  <div style={{ fontSize: 8, color: "var(--tx3)", marginBottom: 2, textTransform: "uppercase" }}>
                    {key} Ang (°)
                  </div>
                  <input
                    type="number"
                    step="1"
                    min="-360"
                    max="360"
                    value={voltages[key].ang}
                    onChange={e => updateVoltage(key, "ang", parseFloat(e.target.value) || 0)}
                    style={{
                      background: "var(--card2)", border: "1px solid var(--bdr)",
                      color: "var(--warm)", padding: "4px 6px", borderRadius: 6,
                      fontSize: 11, fontFamily: "var(--fm)", width: "100%", outline: "none",
                      textAlign: "right",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mini phasor diagram */}
        <PhasorMini currents={currents} voltages={voltages} />

        {/* Stage settings for selected function */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SectionHead label={`Configurações — ${selectedFn}`} color="var(--green)" />
          {renderStageSettings()}
        </div>

        {/* Preview */}
        <div style={{
          background: "var(--card2)", borderRadius: 10, padding: "10px 12px",
          border: preview ? "1px solid rgba(74,222,128,.2)" : "1px solid var(--bdr)",
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6, fontFamily: "var(--fm)" }}>
            Preview de Trip
          </div>
          {preview ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                background: "var(--green-dim)", color: "var(--green)",
                border: "1px solid rgba(74,222,128,.25)",
                borderRadius: 6, padding: "3px 8px",
                fontSize: 11, fontWeight: 700, fontFamily: "var(--fm)",
              }}>
                {preview.stageId}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--warm)", fontFamily: "var(--fm)" }}>
                @ {preview.time.toFixed(3)} s
              </span>
              <span style={{ fontSize: 9, color: "var(--tx3)" }}>±10%</span>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "var(--tx3)", fontStyle: "italic" }}>
              Nenhum trip esperado com os valores atuais
            </div>
          )}
        </div>
      </div>

      {/* Footer buttons */}
      <div style={{
        flexShrink: 0, padding: "10px 14px",
        borderTop: "1px solid var(--bdr)",
        display: "flex", gap: 6,
      }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1, padding: "8px 0",
            background: "var(--orange-dim)", border: "1px solid rgba(249,115,22,.3)",
            borderRadius: 8, color: "var(--orange)", fontSize: 11, fontWeight: 700,
            fontFamily: "var(--fh)", cursor: "pointer", letterSpacing: "0.5px",
            textTransform: "uppercase", transition: "all .15s",
          }}
        >
          {t("scenarioEditor.buttons.save")}
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: "8px 14px",
            background: "transparent", border: "1px solid var(--bdr)",
            borderRadius: 8, color: "var(--tx3)", fontSize: 11, fontWeight: 600,
            cursor: "pointer", transition: "all .15s",
          }}
        >
          Reset
        </button>
        <button
          onClick={onClose}
          style={{
            padding: "8px 14px",
            background: "transparent", border: "1px solid var(--bdr)",
            borderRadius: 8, color: "var(--tx3)", fontSize: 11, fontWeight: 600,
            cursor: "pointer", transition: "all .15s",
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
