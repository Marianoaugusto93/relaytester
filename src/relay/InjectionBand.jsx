import { IB } from "../widgets.jsx";
import { useTranslation } from "../i18n/useTranslation.js";

function SegCtrl({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map(o => (
        <button key={o.value} className={`s${value === o.value ? " on" : ""}`} onClick={() => onChange(o.value)}>
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
  uP, uPf, setSys
}) {
  const { t } = useTranslation();
  const cur = pfMode === "prefault" ? pf : p;
  const updCur = pfMode === "prefault" ? uPf : uP;

  return (
    <div className="rele-injection">
      {/* CURRENT */}
      <div className="inj-block">
        <div className="inj-h">
          <span className="ttl">{pfMode === "prefault" ? t("labels.preFaultCurrent") : t("labels.currentInjection")}</span>
          <SegCtrl
            options={[{ value: "manual", label: t("labels.manual") }, { value: "balanced", label: "3φ Eq." }]}
            value={balI}
            onChange={onBalChangeI}
          />
          {balI === "balanced" && (
            <select
              style={{ marginLeft: 4, background: "var(--card3)", border: "1px solid var(--bdr)", color: "var(--tx2)", borderRadius: 4, fontSize: 9, padding: "2px 4px", fontFamily: "var(--fm)" }}
              value={seqI}
              onChange={e => onSeqChangeI(e.target.value)}
            >
              <option value="ABC">ABC</option>
              <option value="ACB">ACB</option>
            </select>
          )}
        </div>
        <div className="inj-grid">
          {balI === "balanced" ? (
            <>
              <div className="inj-cell">
                <span className="l">Iₐ MAG</span>
                <IB unit="A" value={cur.currents.Ia.mag} onChange={v => updCur("currents", "Ia", "mag", v)} />
              </div>
              <InjCell label="Iᵦ MAG" value={cur.currents.Ib.mag} unit="A" colorClass="cy" />
              <InjCell label="I꜀ MAG" value={cur.currents.Ic.mag} unit="A" colorClass="cy" />
              <div className="inj-cell">
                <span className="l">Iₐ ÂNG</span>
                <IB unit="°" value={cur.currents.Ia.ang} onChange={v => updCur("currents", "Ia", "ang", v)} step="1" warm />
              </div>
              <InjCell label="Iᵦ ÂNG" value={cur.currents.Ib.ang} unit="°" colorClass="tx2" />
              <InjCell label="I꜀ ÂNG" value={cur.currents.Ic.ang} unit="°" colorClass="tx2" />
            </>
          ) : (
            ["Ia", "Ib", "Ic"].map((ph, idx) => (
              <>
                <div key={ph + "m"} className="inj-cell">
                  <span className="l">{["Iₐ", "Iᵦ", "I꜀"][idx]} MAG</span>
                  <IB unit="A" value={cur.currents[ph].mag} onChange={v => updCur("currents", ph, "mag", v)} />
                </div>
                <div key={ph + "a"} className="inj-cell">
                  <span className="l">{["Iₐ", "Iᵦ", "I꜀"][idx]} ÂNG</span>
                  <IB unit="°" value={cur.currents[ph].ang} onChange={v => updCur("currents", ph, "ang", v)} step="1" warm />
                </div>
              </>
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
          />
          {balV === "balanced" && (
            <select
              style={{ marginLeft: 4, background: "var(--card3)", border: "1px solid var(--bdr)", color: "var(--tx2)", borderRadius: 4, fontSize: 9, padding: "2px 4px", fontFamily: "var(--fm)" }}
              value={seqV}
              onChange={e => onSeqChangeV(e.target.value)}
            >
              <option value="ABC">ABC</option>
              <option value="ACB">ACB</option>
            </select>
          )}
        </div>
        <div className="inj-grid">
          {balV === "balanced" ? (
            <>
              <div className="inj-cell">
                <span className="l">Vₐ MAG</span>
                <IB unit="V" value={cur.voltages.Va.mag} onChange={v => updCur("voltages", "Va", "mag", v)} />
              </div>
              <InjCell label="Vᵦ MAG" value={cur.voltages.Vb.mag} unit="V" colorClass="am" />
              <InjCell label="V꜀ MAG" value={cur.voltages.Vc.mag} unit="V" colorClass="am" />
              <div className="inj-cell">
                <span className="l">Vₐ ÂNG</span>
                <IB unit="°" value={cur.voltages.Va.ang} onChange={v => updCur("voltages", "Va", "ang", v)} step="1" warm />
              </div>
              <InjCell label="Vᵦ ÂNG" value={cur.voltages.Vb.ang} unit="°" colorClass="tx2" />
              <InjCell label="V꜀ ÂNG" value={cur.voltages.Vc.ang} unit="°" colorClass="tx2" />
            </>
          ) : (
            ["Va", "Vb", "Vc"].map((ph, idx) => (
              <>
                <div key={ph + "m"} className="inj-cell">
                  <span className="l">{["Vₐ", "Vᵦ", "V꜀"][idx]} MAG</span>
                  <IB unit="V" value={cur.voltages[ph].mag} onChange={v => updCur("voltages", ph, "mag", v)} />
                </div>
                <div key={ph + "a"} className="inj-cell">
                  <span className="l">{["Vₐ", "Vᵦ", "V꜀"][idx]} ÂNG</span>
                  <IB unit="°" value={cur.voltages[ph].ang} onChange={v => updCur("voltages", ph, "ang", v)} step="1" warm />
                </div>
              </>
            ))
          )}
        </div>
      </div>

      {/* FREQUENCY */}
      <div className="inj-block">
        <div className="inj-h">
          <span className="ttl">Frequência &amp; Fase</span>
          <SegCtrl
            options={[{ value: 60, label: "60 Hz" }, { value: 50, label: "50 Hz" }]}
            value={sys.freq ?? 60}
            onChange={v => setSys(o => ({ ...o, freq: Number(v) }))}
          />
        </div>
        <div className="inj-grid">
          <div className="inj-cell">
            <span className="l">Freq</span>
            <IB unit="Hz" value={sys.freq ?? 60} onChange={v => setSys(o => ({ ...o, freq: v }))} step="0.1" />
          </div>
          <InjCell label="df/dt" value="0.00" unit="Hz/s" colorClass="tx2" />
          <InjCell label="Rampa" value="—" colorClass="tx2" />
          <div className="inj-cell">
            <span className="l">Pré-falta</span>
            <div className="v tx2"><span>—</span></div>
          </div>
          <div className="inj-cell">
            <span className="l">Falta</span>
            <div className="v tx2"><span>—</span></div>
          </div>
          <div className="inj-cell">
            <span className="l">Pós</span>
            <div className="v tx2"><span>—</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
