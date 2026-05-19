import { IB } from "../widgets.jsx";
import { useTranslation } from "../i18n/useTranslation.js";

function SegCtrl({ options, value, onChange, ariaLabel }) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={`s${value === o.value ? " on" : ""}`}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          aria-label={`${ariaLabel}: ${o.label}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function InjCell({ label, value, unit, colorClass = "tx2" }) {
  return (
    <div className="inj-cell">
      <span className="l">{label}</span>
      <div className={`v ${colorClass}`}>
        <span>{typeof value === "number" ? value.toFixed(value < 10 ? 3 : 2) : value}</span>
        {unit && <span className="u">{unit}</span>}
      </div>
    </div>
  );
}

export default function InjectionBand({
  p, pf, pfMode, balI, balV, seqI, seqV, sys,
  onBalChangeI, onBalChangeV, onSeqChangeI, onSeqChangeV,
  uP, uPf, setSys, setPfMode
}) {
  const { t } = useTranslation();
  const cur = pfMode === "prefault" ? pf : p;
  const updCur = pfMode === "prefault" ? uPf : uP;

  return (
    <section className="rele-injection" aria-label="Injection settings panel">
      {/* PRE/FAULT toggle at the top */}
      <div className="inj-pf-toggle" role="tablist" aria-label="Pre-fault or fault mode">
        <button
          type="button"
          role="tab"
          aria-selected={pfMode === "prefault"}
          className={`pf-btn${pfMode === "prefault" ? " on" : ""}`}
          onClick={() => setPfMode("prefault")}
        >
          {t("tabs.preFault") || "Pré"}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pfMode === "fault"}
          className={`pf-btn${pfMode === "fault" ? " on" : ""}`}
          onClick={() => setPfMode("fault")}
        >
          {t("tabs.fault") || "Falta"}
        </button>
      </div>

      <div className="rele-injection-inner">
      {/* CURRENT */}
      <div className="inj-block">
        <div className="inj-h">
          <span className="ttl">{pfMode === "prefault" ? t("labels.preFaultCurrent") : t("labels.currentInjection")}</span>
          <SegCtrl
            options={[{ value: "manual", label: t("labels.manual") }, { value: "balanced", label: "3φ Eq." }]}
            value={balI}
            onChange={onBalChangeI}
            ariaLabel="Current injection mode"
          />
          {balI === "balanced" && (
            <select
              aria-label="Current phase sequence"
              style={{ marginLeft: 4, background: "var(--card3)", border: "1px solid var(--bdr)", color: "var(--tx2)", borderRadius: 4, fontSize: 9, padding: "2px 4px", fontFamily: "var(--fm)" }}
              value={seqI}
              onChange={e => onSeqChangeI(e.target.value)}
            >
              <option value="ABC">ABC</option>
              <option value="ACB">ACB</option>
            </select>
          )}
        </div>
        <div className="inj-grid-vertical">
          {balI === "balanced" ? (
            <>
              <div className="inj-col">
                <span className="col-label">Iₐ</span>
                <div className="inj-cell">
                  <span className="l">MAG</span>
                  <IB unit="A" value={cur.currents.Ia.mag} onChange={v => updCur("currents", "Ia", "mag", v)} />
                </div>
                <div className="inj-cell">
                  <span className="l">ÂNG</span>
                  <IB unit="°" value={cur.currents.Ia.ang} onChange={v => updCur("currents", "Ia", "ang", v)} step="1" warm />
                </div>
              </div>
              <div className="inj-col">
                <span className="col-label">Iᵦ</span>
                <InjCell label="MAG" value={cur.currents.Ib.mag} unit="A" colorClass="cy" />
                <InjCell label="ÂNG" value={cur.currents.Ib.ang} unit="°" colorClass="tx2" />
              </div>
              <div className="inj-col">
                <span className="col-label">I꜀</span>
                <InjCell label="MAG" value={cur.currents.Ic.mag} unit="A" colorClass="cy" />
                <InjCell label="ÂNG" value={cur.currents.Ic.ang} unit="°" colorClass="tx2" />
              </div>
            </>
          ) : (
            ["Ia", "Ib", "Ic"].map((ph, idx) => (
              <div key={ph} className="inj-col">
                <span className="col-label">{["Iₐ", "Iᵦ", "I꜀"][idx]}</span>
                <div className="inj-cell">
                  <span className="l">MAG</span>
                  <IB unit="A" value={cur.currents[ph].mag} onChange={v => updCur("currents", ph, "mag", v)} />
                </div>
                <div className="inj-cell">
                  <span className="l">ÂNG</span>
                  <IB unit="°" value={cur.currents[ph].ang} onChange={v => updCur("currents", ph, "ang", v)} step="1" warm />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* VOLTAGE */}
      <div className="inj-block">
        <div className="inj-h">
          <span className="ttl">{pfMode === "prefault" ? t("labels.preFaultVoltage") : t("labels.voltageInjection")}</span>
          <SegCtrl
            options={[{ value: "manual", label: t("labels.manual") }, { value: "balanced", label: "3φ Eq." }]}
            value={balV}
            onChange={onBalChangeV}
            ariaLabel="Voltage injection mode"
          />
          {balV === "balanced" && (
            <select
              aria-label="Voltage phase sequence"
              style={{ marginLeft: 4, background: "var(--card3)", border: "1px solid var(--bdr)", color: "var(--tx2)", borderRadius: 4, fontSize: 9, padding: "2px 4px", fontFamily: "var(--fm)" }}
              value={seqV}
              onChange={e => onSeqChangeV(e.target.value)}
            >
              <option value="ABC">ABC</option>
              <option value="ACB">ACB</option>
            </select>
          )}
        </div>
        <div className="inj-grid-vertical">
          {balV === "balanced" ? (
            <>
              <div className="inj-col">
                <span className="col-label">Vₐ</span>
                <div className="inj-cell">
                  <span className="l">MAG</span>
                  <IB unit="V" value={cur.voltages.Va.mag} onChange={v => updCur("voltages", "Va", "mag", v)} />
                </div>
                <div className="inj-cell">
                  <span className="l">ÂNG</span>
                  <IB unit="°" value={cur.voltages.Va.ang} onChange={v => updCur("voltages", "Va", "ang", v)} step="1" warm />
                </div>
              </div>
              <div className="inj-col">
                <span className="col-label">Vᵦ</span>
                <InjCell label="MAG" value={cur.voltages.Vb.mag} unit="V" colorClass="am" />
                <InjCell label="ÂNG" value={cur.voltages.Vb.ang} unit="°" colorClass="tx2" />
              </div>
              <div className="inj-col">
                <span className="col-label">V꜀</span>
                <InjCell label="MAG" value={cur.voltages.Vc.mag} unit="V" colorClass="am" />
                <InjCell label="ÂNG" value={cur.voltages.Vc.ang} unit="°" colorClass="tx2" />
              </div>
            </>
          ) : (
            ["Va", "Vb", "Vc"].map((ph, idx) => (
              <div key={ph} className="inj-col">
                <span className="col-label">{["Vₐ", "Vᵦ", "V꜀"][idx]}</span>
                <div className="inj-cell">
                  <span className="l">MAG</span>
                  <IB unit="V" value={cur.voltages[ph].mag} onChange={v => updCur("voltages", ph, "mag", v)} />
                </div>
                <div className="inj-cell">
                  <span className="l">ÂNG</span>
                  <IB unit="°" value={cur.voltages[ph].ang} onChange={v => updCur("voltages", ph, "ang", v)} step="1" warm />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FREQUENCY */}
      <div className="inj-block">
        <div className="inj-h">
          <span className="ttl">Frequência</span>
          <SegCtrl
            options={[{ value: 60, label: "60 Hz" }, { value: 50, label: "50 Hz" }]}
            value={sys.freq ?? 60}
            onChange={v => setSys(o => ({ ...o, freq: Number(v) }))}
            ariaLabel="System frequency"
          />
        </div>
        <div className="inj-grid-vertical">
          <div className="inj-cell">
            <span className="l">Freq (Hz)</span>
            <IB unit="Hz" value={sys.freq ?? 60} onChange={v => setSys(o => ({ ...o, freq: v }))} step="0.1" />
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
