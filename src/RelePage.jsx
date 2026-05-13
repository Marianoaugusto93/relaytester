import { useState } from "react";
import { useTranslation } from "./i18n/useTranslation.js";
import { mainTabs } from "./defaults.js";
import InjectionBand from "./relay/InjectionBand.jsx";
import ScenariosSidebar from "./relay/ScenariosSidebar.jsx";
import MeasuresPanel from "./relay/MeasuresPanel.jsx";
import ControlsBar from "./relay/ControlsBar.jsx";
import SettingsPanel from "./SettingsPanel.jsx";

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
}) {
  const { t } = useTranslation();
  const [activeReleTab, setActiveReleTab] = useState("relay");

  // Map tab IDs to labels for the top tabs row
  const releTabs = mainTabs;

  return (
    <div className="rele-page">

      {/* TOP: injection band */}
      <InjectionBand
        p={p} pf={pf} pfMode={pfMode}
        balI={balI} balV={balV} seqI={seqI} seqV={seqV}
        onBalChangeI={onBalChangeI} onBalChangeV={onBalChangeV}
        onSeqChangeI={onSeqChangeI} onSeqChangeV={onSeqChangeV}
        uP={uP} uPf={uPf} sys={sys} setSys={setSys}
      />

      {/* MIDDLE: 3-column layout */}
      <div className="rele-main">

        {/* LEFT: scenarios sidebar */}
        <div className="rele-left">
          <ScenariosSidebar
            pfMode={pfMode}
            setPfMode={setPfMode}
            prot={prot}
            outMatrix={outMatrix}
            inMatrix={inMatrix}
            phasors={p}
            applyTestPreset={applyTestPreset}
          />
        </div>

        {/* MID: tabs + settings content */}
        <div className="rele-mid">
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

        {/* RIGHT: measures panel */}
        <div className="rele-right">
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
          />
        </div>
      </div>

      {/* BOTTOM: controls bar */}
      <ControlsBar
        ss={ss}
        stime={stime}
        isTripped={isTripped}
        maletaTripped={maletaTripped}
        runSim={runSim}
        stopSim={stopSim}
        resetFault={resetFault}
        setFcOpen={setFcOpen}
      />
    </div>
  );
}

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
};

function FuncRail({ tab, setTab, setSi, prot }) {
  return (
    <div className="func-rail">
      {Object.keys(FUNC_LABELS).map(id => {
        const info = FUNC_LABELS[id];
        const enabled = prot?.[id]?.enabled;
        return (
          <button
            key={id}
            className={`func${tab === id ? " on" : ""}`}
            onClick={() => { setTab(id); setSi(0); }}
            title={prot?.[id]?.name}
          >
            {info.display || id}
            <span className="sub">{info.sub}</span>
            {enabled && tab !== id && (
              <span style={{ display: "block", width: 4, height: 4, borderRadius: "50%", background: "var(--green)", marginTop: 2 }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
