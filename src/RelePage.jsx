import { useState, useEffect } from "react";
import { useTranslation } from "./i18n/useTranslation.js";
import { mainTabs } from "./defaults.js";
import InjectionBand from "./relay/InjectionBand.jsx";
import MeasuresPanel from "./relay/MeasuresPanel.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
import { useArtifactBus } from "./estudos/context/ArtifactBus.jsx";

export default function RelePage({
  // phasors
  p, pf, pfMode, setPfMode,
  pfEnabled, setPfEnabled, pfDuration, setPfDuration,
  balI, balV, seqI, seqV,
  onBalChangeI, onBalChangeV, onSeqChangeI, onSeqChangeV,
  uP, uPf, sys, setSys,
  // protections / settings
  prot, outMatrix, inMatrix,
  tab, setTab, si, setSi, mainTab, setMainTab,
  uPr, uSt, uS, toggleMatrix, toggleInMatrix,
  applyTestPreset, rtp, rtc,
  // simulation
  ss, stime, isTripped, maletaTripped,
  runSim, stopSim, resetFault, setFcOpen,
  // relay readings / display
  ci, vi, i0, v0, i2lcd, pTotal, pA, pB, pC,
  injecting, relayProt, trippedStageIds,
  bkState, ledLabels, ledLitStates,
  evts, diag, faultRecord,
  sendFlash, getFlash,
  // action callbacks
  sendSettings, getSettings,
  loadFile, saveFile,
  setWfDisplayOpen, setWfModalOpen,
  takeSnapshot, dumpFullState,
  resetRelay,
  setBkOpenCtr, setBkCloseCtr,
  onOpenAnalytics,
}) {
  const { t } = useTranslation();
  const bus = useArtifactBus();
  const [activeReleTab, setActiveReleTab] = useState("relay");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const unsub = bus.subscribe("artifact.sendToRele", (payload) => {
      setToast({
        message: "Preset enviado de Estudos · " + (payload.faultType || "Falta"),
        timeout: 3000,
      });
      const tid = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(tid);
    });
    return unsub;
  }, [bus]);

  // Map tab IDs to labels for the top tabs row
  const releTabs = mainTabs;

  return (
    <div className="rele-page-v2">

      {/* MAIN: 3-column layout */}
      <div className="rele-main-v2">

        {/* LEFT: Injection controls sidebar */}
        <div className="rele-left-v2">
          <InjectionBand
            p={p} pf={pf} pfMode={pfMode} setPfMode={setPfMode}
            balI={balI} balV={balV} seqI={seqI} seqV={seqV}
            onBalChangeI={onBalChangeI} onBalChangeV={onBalChangeV}
            onSeqChangeI={onSeqChangeI} onSeqChangeV={onSeqChangeV}
            uP={uP} uPf={uPf} sys={sys} setSys={setSys}
            ss={ss}
            stime={stime}
            isTripped={isTripped}
            injecting={injecting}
            runSim={runSim}
            stopSim={stopSim}
            resetFault={resetFault}
            setFcOpen={setFcOpen}
          />
        </div>

        {/* CENTER: REGRID Pro 1000 with classic styling */}
        <div className="rele-center-v2">
          <MeasuresPanel
            ci={ci} vi={vi} i0={i0} v0={v0}
            i2lcd={i2lcd}
            pTotal={pTotal} pA={pA} pB={pB} pC={pC}
            rtc={rtc} rtp={rtp}
            injecting={injecting}
            isTripped={isTripped}
            trippedStageIds={trippedStageIds}
            prot={prot}
            relayProt={relayProt}
            outMatrix={outMatrix}
            inMatrix={inMatrix}
            evts={evts}
            diag={diag}
            faultRecord={faultRecord}
            bkState={bkState}
            ledLabels={ledLabels}
            ledLitStates={ledLitStates}
            sendFlash={sendFlash}
            getFlash={getFlash}
            onSend={sendSettings}
            onGet={getSettings}
            onOpenFile={loadFile}
            onSaveFile={saveFile}
            onLiveWaveform={() => setWfDisplayOpen(true)}
            onCaptureWaveform={() => setWfModalOpen(true)}
            onSnapshot={takeSnapshot}
            onDump={dumpFullState}
            resetRelay={resetRelay}
            onOpenBk={() => setBkOpenCtr(c => c + 1)}
            onCloseBk={() => setBkCloseCtr(c => c + 1)}
            onOpenAnalytics={onOpenAnalytics}
          />
        </div>

        {/* RIGHT: Settings panel */}
        <div className="rele-right-v2">
          <div className="tabs-row">
            {releTabs.map(tb => (
              <button
                key={tb.id}
                className={`tab-h${mainTab === tb.id ? " on" : ""}`}
                onClick={() => setMainTab(tb.id)}
              >
                {tb.label}
              </button>
            ))}
          </div>
          <div className="rele-content">
            {/* func-rail only shows in relay settings tab */}
            {mainTab === "relay" && (
              <FuncRail tab={tab} setTab={setTab} setSi={setSi} prot={prot} />
            )}
            <div className="func-pane">
              <SettingsPanel
                prot={prot}
                outMatrix={outMatrix}
                inMatrix={inMatrix}
                sys={sys}
                tab={tab}
                si={si}
                mainTab={mainTab}
                uPr={uPr}
                uSt={uSt}
                uS={uS}
                setSi={setSi}
                setTab={setTab}
                toggleMatrix={toggleMatrix}
                toggleInMatrix={toggleInMatrix}
                applyTestPreset={applyTestPreset}
                rtp={rtp}
                rtc={rtc}
                phasors={p}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Toast notification for Estudos preset */}
      {toast && (
        <div style={toastStyles.root}>
          <div style={toastStyles.message}>
            <span style={toastStyles.icon}>⚡</span>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

const toastStyles = {
  root: {
    position: "fixed",
    bottom: 20,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 3000,
    animation: "slideUp .3s ease-out",
  },
  message: {
    padding: "10px 16px",
    background: "rgba(14,165,233,0.9)",
    color: "#fff",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "var(--fm)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
  },
  icon: {
    fontSize: 14,
  },
};

// ── Vertical function rail (110px) shown only in Relay Settings tab ────────────
const FUNC_LABELS = {
  "51":    { sub: "Sobrec. T" },
  "50":    { sub: "Sobrec. I" },
  "51N":   { sub: "Neutro T" },
  "50N":   { sub: "Neutro I" },
  "67":    { sub: "Direcional" },
  "67N":   { sub: "Dir. N" },
  "27/59": { sub: "Tensão", display: "27/59" },
  "47":    { sub: "Seq V" },
  "46":    { sub: "Seq I" },
  "81":    { sub: "Freq" },
  "32":    { sub: "Pot. Rev." },
  "79":    { sub: "Religam." },
  "87":    { sub: "Difer." },
  "21":    { sub: "Distância" },
  "50BF":  { sub: "Falha DJ" },
  "49":    { sub: "Térmica" },
  "25":    { sub: "Sincron." },
  "81R":   { sub: "df/dt" },
};

function FuncRail({ tab, setTab, setSi, prot }) {
  return (
    <div className="func-rail-v2">
      {Object.keys(FUNC_LABELS).map(id => {
        const info = FUNC_LABELS[id];
        const enabled = prot?.[id]?.enabled;
        return (
          <button
            key={id}
            className={`func-v2${tab === id ? " on" : ""}${enabled ? " enabled" : ""}`}
            onClick={() => { setTab(id); setSi(0); }}
            title={`${prot?.[id]?.name} ${enabled ? "(Ativo)" : "(Inativo)"}`}
          >
            {info.display || id}
          </button>
        );
      })}
    </div>
  );
}
