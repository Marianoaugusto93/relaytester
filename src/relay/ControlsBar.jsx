import { useTranslation } from "../i18n/useTranslation.js";

export default function ControlsBar({ ss, stime, isTripped, maletaTripped, runSim, stopSim, resetFault, setFcOpen }) {
  const { t } = useTranslation();
  const running = ss === "running";
  const tripped = isTripped || maletaTripped;

  return (
    <div className="controls-bar">
      <button className="cb-btn inj" onClick={runSim} disabled={isTripped} title={isTripped ? "Reset relay before injecting" : ""}>
        ▶&nbsp; {t("controls.inject")}
      </button>
      <button className="cb-btn stop" onClick={stopSim}>
        ■&nbsp; {t("controls.stop")}
      </button>
      <button className="cb-btn reset" onClick={resetFault}>
        ↺&nbsp; {t("controls.resetFault")}
      </button>
      <div className={`cb-status${running ? " running" : ""}`}>
        <span className="d" />
        <span style={{ fontSize: 18, fontWeight: 600 }}>
          {tripped
            ? `TRIP · ${stime.toFixed(3)} s`
            : running
              ? `Injetando · ${stime.toFixed(3)} s`
              : `Parado · TRIP timer ${stime.toFixed(3)} s`}
        </span>
      </div>
      <button className="cb-btn calc" onClick={() => setFcOpen(true)}>
        ⚡&nbsp; {t("controls.faultCalculator")}
      </button>
    </div>
  );
}
