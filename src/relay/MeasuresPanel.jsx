import { useState } from "react";
import { useTranslation } from "../i18n/useTranslation.js";

export default function MeasuresPanel({
  ci, vi, i0, v0, i2lcd, pTotal, pA, pB, pC,
  rtc, rtp, injecting, isTripped, trippedStageIds,
  prot, relayProt, outMatrix, inMatrix,
  evts, diag, faultRecord,
  bkState, ledLabels, ledLitStates,
  sendFlash, getFlash,
  onSend, onGet, onOpenFile, onSaveFile,
  onLiveWaveform, onCaptureWaveform, onSnapshot, onDump,
  resetRelay, onOpenBk, onCloseBk,
}) {
  const { t } = useTranslation();
  const [measTab, setMeasTab] = useState("med");
  const [showPrimary, setShowPrimary] = useState(true);

  const fmt = (v, d = 3) => (v ?? 0).toFixed(d);
  const fmtPow = (v) => {
    const av = Math.abs(v ?? 0);
    if (av >= 1e6) return (v / 1e6).toFixed(2) + " MW";
    if (av >= 1e3) return (v / 1e3).toFixed(1) + " kW";
    return (v ?? 0).toFixed(1) + " W";
  };

  return (
    <div className="card" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div className="ph">
        <div className="bar bar-orange" />
        <span className="ph-t">ReGrid Pro 1000</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--fm)", fontSize: 9, color: "var(--tx3)" }}>BAY-01</span>
      </div>

      {/* relay status strip */}
      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--fm)", fontSize: 11, color: isTripped ? "var(--red)" : "var(--green)", fontWeight: 700 }}>
          {isTripped ? "● TRIP" : "● OK"}
        </span>
        {isTripped && trippedStageIds?.length > 0 && (
          <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--red)", opacity: 0.8 }}>{trippedStageIds[0]}</span>
        )}
        <span style={{ marginLeft: "auto", fontFamily: "var(--fm)", fontSize: 14, color: "var(--green)", fontWeight: 700 }}>
          {injecting ? "● Injeção" : "● Parado"}
        </span>
      </div>

      {/* internal tabs */}
      <div className="measure-tab">
        {[["med", "Medidas"], ["prot", "Proteções"], ["log", "Lógica"], ["evt", "Eventos"]].map(([id, lbl]) => (
          <button key={id} className={`mtb${measTab === id ? " on" : ""}`} onClick={() => setMeasTab(id)}>{lbl}</button>
        ))}
      </div>

      {/* MEDIDAS tab */}
      {measTab === "med" && (
        <div className="measures-scroll">
          {/* CORR */}
          <div className="measures-h">
            <span>CORR</span>
            <span style={{ textAlign: "right" }}>Sec</span>
            <button className={showPrimary ? "on" : ""} onClick={() => setShowPrimary(v => !v)}>≡ Primária</button>
          </div>
          <div className="measures-wrap">
            {[["Iₐ", ci.Ia, rtc], ["Iᵦ", ci.Ib, rtc], ["I꜀", ci.Ic, rtc]].map(([lbl, ph, ratio]) => (
              <div key={lbl} className={`m-row${showPrimary ? " dual" : ""}`}>
                <span className="nm">{lbl}</span>
                <span className={`v ${injecting ? "g" : "t"}`}>{fmt(ph.mag)} A ∠ {fmt(ph.ang, 1)}°</span>
                {showPrimary && <span className="v t">{fmt(ph.mag * ratio, 0)} A</span>}
              </div>
            ))}
            <div className={`m-row${showPrimary ? " dual" : ""}`}>
              <span className="nm">3I₀</span>
              <span className="v t">{fmt(i0.mag)} A</span>
              {showPrimary && <span className="v t">{fmt(i0.mag * rtc, 1)} A</span>}
            </div>
            <div className={`m-row${showPrimary ? " dual" : ""}`}>
              <span className="nm">I₂</span>
              <span className="v t">{fmt(i2lcd?.mag ?? 0)} A</span>
              {showPrimary && <span className="v t">{fmt((i2lcd?.mag ?? 0) * rtc, 1)} A</span>}
            </div>
          </div>

          {/* TENS */}
          <div className="measures-h" style={{ marginTop: 6 }}>
            <span>TENS</span>
            <span style={{ textAlign: "right" }}>Sec</span>
            <button className={showPrimary ? "on" : ""} onClick={() => setShowPrimary(v => !v)}>≡ Primária</button>
          </div>
          <div className="measures-wrap">
            {[["Vₐ", vi.Va, rtp], ["Vᵦ", vi.Vb, rtp], ["V꜀", vi.Vc, rtp]].map(([lbl, ph, ratio]) => (
              <div key={lbl} className={`m-row${showPrimary ? " dual" : ""}`}>
                <span className="nm">{lbl}</span>
                <span className={`v ${injecting ? "g" : "t"}`}>{fmt(ph.mag)} V ∠ {fmt(ph.ang, 1)}°</span>
                {showPrimary && <span className="v t">{fmt(ph.mag * ratio, 0)} V</span>}
              </div>
            ))}
          </div>

          {/* POT */}
          <div className="measures-h" style={{ marginTop: 6 }}>
            <span>POT</span>
          </div>
          <div className="measures-wrap">
            <div className="m-row"><span className="nm">P</span><span className="v t">{fmtPow(pTotal?.P)}</span></div>
            <div className="m-row"><span className="nm">Q</span><span className="v t">{fmtPow(pTotal?.Q).replace("W", "VAr")}</span></div>
            <div className="m-row"><span className="nm">FP</span><span className="v t">{(pTotal?.fp ?? 0).toFixed(3)}</span></div>
          </div>
        </div>
      )}

      {/* PROTEÇÕES tab */}
      {measTab === "prot" && (
        <div className="measures-scroll" style={{ padding: "6px 0" }}>
          {Object.entries(relayProt ?? {}).map(([fid, fn]) => (
            <div key={fid} className="rp-prot">
              <div className={`rp-pdot`} style={{ background: fn.enabled ? (trippedStageIds.some(s => s.startsWith(fid)) ? "var(--red)" : "var(--green)") : "var(--tx4,#3F4651)" }} />
              <span className="rp-plbl">{fid}</span>
              <span className="rp-pname">{fn.name}</span>
              <span className={`rp-pst ${fn.enabled ? (trippedStageIds.some(s => s.startsWith(fid)) ? "trip" : "en") : "dis"}`}>
                {fn.enabled ? (trippedStageIds.some(s => s.startsWith(fid)) ? "TRIP" : "ON") : "OFF"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* LÓGICA tab */}
      {measTab === "log" && (
        <div className="measures-scroll" style={{ padding: "8px 10px", fontSize: 10, color: "var(--tx3)", fontFamily: "var(--fm)" }}>
          <div style={{ marginBottom: 6, fontWeight: 700, color: "var(--tx2)", fontSize: 9, letterSpacing: 1, textTransform: "uppercase" }}>Output Matrix</div>
          {Object.entries(outMatrix ?? {}).map(([row, cols]) => {
            const active = Object.keys(cols).filter(c => cols[c]);
            if (!active.length) return null;
            return (
              <div key={row} style={{ display: "flex", gap: 4, padding: "2px 0", borderBottom: "1px solid var(--bdr)" }}>
                <span style={{ color: "var(--orange)", minWidth: 60, fontWeight: 700 }}>{row}</span>
                <span style={{ color: "var(--tx3)" }}>{active.join(", ")}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* EVENTOS tab */}
      {measTab === "evt" && (
        <div className="measures-scroll">
          {evts.length === 0
            ? <div className="rp-empty">Sem eventos · aguardando injeção</div>
            : evts.slice(0, 20).map((e, i) => (
              <div key={i} className="rp-evt">
                <span className="rp-evt-t">[{e.time}]</span>
                <span style={{ fontSize: 10 }}>{e.icon}</span>
                <span className="rp-evt-x">{e.text}</span>
              </div>
            ))
          }
        </div>
      )}

      {/* Action buttons inline with labels */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", borderTop: "1px solid var(--bdr)", flexShrink: 0 }}>
        <span style={{ fontSize: 8, color: "var(--tx3)", fontWeight: 700, letterSpacing: ".8px", textTransform: "uppercase", minWidth: 50 }}>Ajustes</span>
        <button className={`act-btn${sendFlash ? " flash-g" : ""}`} onClick={onSend}><span className="ico">↑</span>Send</button>
        <button className={`act-btn${getFlash ? " flash-b" : ""}`} onClick={onGet}><span className="ico">↓</span>Get</button>
        <button className="act-btn" onClick={onOpenFile}><span className="ico">⇧</span>Open</button>
        <button className="act-btn" onClick={onSaveFile}><span className="ico">⇩</span>Save</button>
        <span style={{ fontSize: 8, color: "var(--tx3)", fontWeight: 700, letterSpacing: ".8px", textTransform: "uppercase", marginLeft: 6, minWidth: 60 }}>Operação</span>
        <button className="act-btn" onClick={onLiveWaveform}><span className="ico">∿</span>Live</button>
        <button className="act-btn" onClick={onCaptureWaveform}><span className="ico">≈</span>Capture</button>
        <button className="act-btn" onClick={onSnapshot}><span className="ico">⊙</span>Snap</button>
        <button className="act-btn" onClick={onDump}><span className="ico">⏚</span>Dump</button>
      </div>

      {/* relay hardware buttons */}
      <div className="relay-bot">
        <button className="rbt rr" onClick={resetRelay}>RESET</button>
        <button className="rbt r0" onClick={onOpenBk}>0</button>
        <button className="rbt rii" onClick={onCloseBk}>I</button>
      </div>
    </div>
  );
}
