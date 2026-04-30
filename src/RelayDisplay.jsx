import{toRect}from"./protection.js";
import{protOrder,ledCols}from"./defaults.js";

export default function RelayDisplay({ci,vi,i0,v0,i2lcd,rtc,rtp,Inom,freqLcd,pTotal,pA,pB,pC,injecting,rp,setRp,relayProt,trippedStageIds,bkState,ledLabels,ledLitStates,evts,faultRecord,relayTab,setRelayTab,mensTab,setMensTab,sys}){
  const ff=(v,d=2)=>v.toFixed(d);const fa=v=>v.toFixed(1);
  const pageNames=["I Secundária","I Primária","I Múltiplo TC","V Secundária","V Primária","V Múltiplo TP","P Secundária","P Primária","Seq. / Freq.","Fault Record"];
  const totalPages=10;

  const renderPage=()=>{
    switch(rp){
      case 0:return(<div className="lcd-content">{["Ia","Ib","Ic"].map(k=><div key={k} className="lcd-r"><span className="l">{k}</span><span className="v">{ff(ci[k].mag)}A ∠{fa(ci[k].ang)}°</span></div>)}<div className="lcd-s"/><div className="lcd-r"><span className="l">3I₀</span><span className="v">{ff(i0.mag,3)}A ∠{fa(i0.ang)}°</span></div></div>);
      case 1:return(<div className="lcd-content">{["Ia","Ib","Ic"].map(k=><div key={k} className="lcd-r"><span className="l">{k}</span><span className="v">{ff(ci[k].mag*rtc)}A ∠{fa(ci[k].ang)}°</span></div>)}<div className="lcd-s"/><div className="lcd-r"><span className="l">3I₀</span><span className="v">{ff(i0.mag*rtc,3)}A ∠{fa(i0.ang)}°</span></div></div>);
      case 2:return(<div className="lcd-content">{["Ia","Ib","Ic"].map(k=><div key={k} className="lcd-r"><span className="l">{k}</span><span className="v">{ff(ci[k].mag/Inom,3)}×In ∠{fa(ci[k].ang)}°</span></div>)}<div className="lcd-s"/><div className="lcd-r"><span className="l">3I₀</span><span className="v">{ff(i0.mag/Inom,3)}×In ∠{fa(i0.ang)}°</span></div></div>);
      case 3:return(<div className="lcd-content">{["Va","Vb","Vc"].map(k=><div key={k} className="lcd-r"><span className="l">{k}</span><span className="v">{ff(vi[k].mag)}V ∠{fa(vi[k].ang)}°</span></div>)}<div className="lcd-s"/><div className="lcd-r"><span className="l">3V₀</span><span className="v">{ff(v0.mag,3)}V ∠{fa(v0.ang)}°</span></div></div>);
      case 4:return(<div className="lcd-content">{["Va","Vb","Vc"].map(k=><div key={k} className="lcd-r"><span className="l">{k}</span><span className="v">{ff(vi[k].mag*rtp)}V ∠{fa(vi[k].ang)}°</span></div>)}<div className="lcd-s"/><div className="lcd-r"><span className="l">3V₀</span><span className="v">{ff(v0.mag*rtp,3)}V ∠{fa(v0.ang)}°</span></div></div>);
      case 5:{const vn=sys.tp.secV||1;return(<div className="lcd-content">{["Va","Vb","Vc"].map(k=><div key={k} className="lcd-r"><span className="l">{k}</span><span className="v">{ff(vi[k].mag/vn*100,1)}% ∠{fa(vi[k].ang)}°</span></div>)}<div className="lcd-s"/><div className="lcd-r"><span className="l">3V₀</span><span className="v">{ff(v0.mag/vn*100,1)}%</span></div></div>)}
      case 6:{const pt=injecting?pTotal:{P:0,Q:0,S:0,fp:0};return(<div className="lcd-content"><div className="lcd-r"><span className="l">P</span><span className="v">{ff(pt.P,1)} W</span></div><div className="lcd-r"><span className="l">Q</span><span className="v">{ff(pt.Q,1)} var</span></div><div className="lcd-r"><span className="l">S</span><span className="v">{ff(pt.S,1)} VA</span></div><div className="lcd-s"/><div className="lcd-r"><span className="l">FP</span><span className="v">{ff(Math.abs(pt.fp),3)}</span></div></div>)}
      case 7:{const k=rtc*rtp;const pt=injecting?pTotal:{P:0,Q:0,S:0,fp:0};const pP=pt.P*k,pQ=pt.Q*k,pS=pt.S*k;const fmtP=v=>{const a=Math.abs(v);return a>=1000?ff(v/1000,2):ff(v,2)};const uP=v=>Math.abs(v)>=1000?"kW":"W";const uQ=v=>Math.abs(v)>=1000?"kvar":"var";const uS=v=>Math.abs(v)>=1000?"kVA":"VA";return(<div className="lcd-content"><div className="lcd-r"><span className="l">P</span><span className="v">{fmtP(pP)} {uP(pP)}</span></div><div className="lcd-r"><span className="l">Q</span><span className="v">{fmtP(pQ)} {uQ(pQ)}</span></div><div className="lcd-r"><span className="l">S</span><span className="v">{fmtP(pS)} {uS(pS)}</span></div><div className="lcd-s"/><div className="lcd-r"><span className="l">FP</span><span className="v">{ff(Math.abs(pt.fp),3)}</span></div></div>)}
      case 8:{return(<div className="lcd-content"><div className="lcd-r"><span className="l">I₂</span><span className="v">{ff(i2lcd.mag,3)}A ∠{fa(i2lcd.ang)}°</span></div><div className="lcd-r"><span className="l">I₂/In</span><span className="v">{ff(i2lcd.mag/Inom,3)}×In</span></div><div className="lcd-s"/><div className="lcd-r"><span className="l">Freq</span><span className="v">{freqLcd.toFixed(2)} Hz</span></div><div className="lcd-r"><span className="l">Δf</span><span className="v">{(freqLcd-60).toFixed(2)} Hz</span></div></div>)}
      case 9:{if(!faultRecord)return(<div className="lcd-content" style={{display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:"rgba(0,255,100,.25)",fontSize:8,textAlign:"center",letterSpacing:1}}>NO FAULT<br/>RECORDED</div></div>);
        const fr=faultRecord;return(<div className="lcd-content" style={{fontSize:8,overflow:"auto"}}><div className="lcd-r" style={{fontSize:8}}><span className="l">TIME</span><span className="v" style={{fontSize:7}}>{fr.timestamp}</span></div>{fr.stages.map((s,i)=><div key={i} className="lcd-r" style={{fontSize:9}}><span className="l">TRIP</span><span className="v">{s.stage}</span></div>)}<div className="lcd-s"/>{["Ia","Ib","Ic"].map(k=><div key={k} className="lcd-r" style={{fontSize:8}}><span className="l">{k}</span><span className="v">{ff(fr.currents[k].mag,1)}A</span></div>)}{["Va","Vb","Vc"].map(k=><div key={k} className="lcd-r" style={{fontSize:8}}><span className="l">{k}</span><span className="v">{ff(fr.voltages[k].mag,1)}V</span></div>)}</div>)}
      default:return null;
    }
  };

  const renderMensuracaoTab=()=>{
    const a1r=Math.cos(2*Math.PI/3),a1i=Math.sin(2*Math.PI/3);
    const a2r=Math.cos(4*Math.PI/3),a2i=Math.sin(4*Math.PI/3);
    const IaR=toRect(ci.Ia.mag,ci.Ia.ang),IbR=toRect(ci.Ib.mag,ci.Ib.ang),IcR=toRect(ci.Ic.mag,ci.Ic.ang);
    const VaR=toRect(vi.Va.mag,vi.Va.ang),VbR=toRect(vi.Vb.mag,vi.Vb.ang),VcR=toRect(vi.Vc.mag,vi.Vc.ang);
    const i1re=(IaR.re+(a1r*IbR.re-a1i*IbR.im)+(a2r*IcR.re-a2i*IcR.im))/3;
    const i1im=(IaR.im+(a1r*IbR.im+a1i*IbR.re)+(a2r*IcR.im+a2i*IcR.re))/3;
    const i1mag=injecting?Math.sqrt(i1re*i1re+i1im*i1im):0;
    const v2re=(VaR.re+(a2r*VbR.re-a2i*VbR.im)+(a1r*VcR.re-a1i*VcR.im))/3;
    const v2im=(VaR.im+(a2r*VbR.im+a2i*VbR.re)+(a1r*VcR.im+a1i*VcR.re))/3;
    const v2mag=injecting?Math.sqrt(v2re*v2re+v2im*v2im):0;
    const v2ang=injecting?Math.atan2(v2im,v2re)*180/Math.PI:0;
    const pk=rtc*rtp;
    const fmtPwr=(v,u)=>Math.abs(v)>=1000?`${(v/1000).toFixed(2)} k${u}`:`${v.toFixed(2)} ${u}`;
    const Vnom=sys.tp.secV/Math.sqrt(3);
    const df=freqLcd-60;
    return(<div className="rp-mensuracao">
      <div className="rp-subnav">
        {[["corr","CORR."],["tens","TENS."],["pot","POT."],["sist","SIST."]].map(([id,lbl])=>(
          <button key={id} className={`rp-snb ${mensTab===id?"on":""}`} onClick={()=>setMensTab(id)}>{lbl}</button>
        ))}
      </div>
      <div className="rp-mensuracao-content">
        {mensTab==="corr"&&(<div>
          <div className="rp-section"><div className="rp-stitle">I SECUNDÁRIA</div>
            {["Ia","Ib","Ic"].map(ph=><div key={ph} className="rp-row"><span className="rp-lbl">{ph}</span><span className="rp-val">{ff(ci[ph].mag)} A ∠{fa(ci[ph].ang)}°</span></div>)}
            <div className="rp-sep"/><div className="rp-row"><span className="rp-lbl">3I₀</span><span className="rp-val">{ff(i0.mag,3)} A ∠{fa(i0.ang)}°</span></div>
          </div>
          <div className="rp-sep" style={{margin:"0 10px"}}/>
          <div className="rp-section"><div className="rp-stitle">I PRIMÁRIA</div>
            {["Ia","Ib","Ic"].map(ph=><div key={ph} className="rp-row"><span className="rp-lbl">{ph}</span><span className="rp-val">{ff(ci[ph].mag*rtc)} A</span></div>)}
            <div className="rp-sep"/><div className="rp-row"><span className="rp-lbl">3I₀ pri</span><span className="rp-val">{ff(i0.mag*rtc,3)} A</span></div>
          </div>
          <div className="rp-sep" style={{margin:"0 10px"}}/>
          <div className="rp-section"><div className="rp-stitle">MÚLTIPLO TC (×In)</div>
            {["Ia","Ib","Ic"].map(ph=><div key={ph} className="rp-row"><span className="rp-lbl">{ph}/In</span><span className="rp-val">{Inom>0?(ci[ph].mag/Inom).toFixed(3):"-"}×</span></div>)}
          </div>
          <div className="rp-sep" style={{margin:"0 10px"}}/>
          <div className="rp-section"><div className="rp-stitle">SEQ. NEGATIVA (I₂)</div>
            <div className="rp-row"><span className="rp-lbl">I₂ sec</span><span className="rp-val">{ff(i2lcd.mag,3)} A ∠{fa(i2lcd.ang)}°</span></div>
            <div className="rp-row"><span className="rp-lbl">I₂ pri</span><span className="rp-val">{ff(i2lcd.mag*rtc,3)} A</span></div>
            <div className="rp-row"><span className="rp-lbl">I₂/I₁</span><span className="rp-val">{i1mag>0.01?(i2lcd.mag/i1mag*100).toFixed(1)+"%":"—"}</span></div>
          </div>
        </div>)}
        {mensTab==="tens"&&(<div>
          <div className="rp-section"><div className="rp-stitle">V SECUNDÁRIA</div>
            {["Va","Vb","Vc"].map(ph=><div key={ph} className="rp-row"><span className="rp-lbl">{ph}</span><span className="rp-val">{ff(vi[ph].mag)} V ∠{fa(vi[ph].ang)}°</span></div>)}
            <div className="rp-sep"/><div className="rp-row"><span className="rp-lbl">3V₀</span><span className="rp-val">{ff(v0.mag,3)} V ∠{fa(v0.ang)}°</span></div>
          </div>
          <div className="rp-sep" style={{margin:"0 10px"}}/>
          <div className="rp-section"><div className="rp-stitle">V PRIMÁRIA</div>
            {["Va","Vb","Vc"].map(ph=><div key={ph} className="rp-row"><span className="rp-lbl">{ph}</span><span className="rp-val">{ff(vi[ph].mag*rtp)} V</span></div>)}
            <div className="rp-sep"/><div className="rp-row"><span className="rp-lbl">3V₀ pri</span><span className="rp-val">{ff(v0.mag*rtp,3)} V</span></div>
          </div>
          <div className="rp-sep" style={{margin:"0 10px"}}/>
          <div className="rp-section"><div className="rp-stitle">{"% NOMINAL ("+sys.tp.secV+"V)"}</div>
            {["Va","Vb","Vc"].map(ph=><div key={ph} className="rp-row"><span className="rp-lbl">{ph}/Vn</span><span className="rp-val">{Vnom>0?(vi[ph].mag/Vnom*100).toFixed(1):"-"}%</span></div>)}
          </div>
          <div className="rp-sep" style={{margin:"0 10px"}}/>
          <div className="rp-section"><div className="rp-stitle">SEQ. NEGATIVA (V₂)</div>
            <div className="rp-row"><span className="rp-lbl">V₂ sec</span><span className="rp-val">{v2mag.toFixed(2)} V ∠{fa(v2ang)}°</span></div>
            <div className="rp-row"><span className="rp-lbl">V₂ pri</span><span className="rp-val">{ff(v2mag*rtp,2)} V</span></div>
            <div className="rp-row"><span className="rp-lbl">V₂/Vn</span><span className="rp-val">{Vnom>0?(v2mag/Vnom*100).toFixed(1)+"%":"—"}</span></div>
          </div>
        </div>)}
        {mensTab==="pot"&&(<div>
          <div className="rp-section"><div className="rp-stitle">TRIFÁSICO SECUNDÁRIO</div>
            <div className="rp-row"><span className="rp-lbl">P ativa</span><span className="rp-val">{fmtPwr(pTotal.P,"W")}</span></div>
            <div className="rp-row"><span className="rp-lbl">Q reativa</span><span className="rp-val">{fmtPwr(pTotal.Q,"VAr")}</span></div>
            <div className="rp-row"><span className="rp-lbl">S aparente</span><span className="rp-val">{fmtPwr(pTotal.S,"VA")}</span></div>
            <div className="rp-row"><span className="rp-lbl">FP</span><span className="rp-val">{pTotal.fp.toFixed(3)}</span></div>
          </div>
          <div className="rp-sep" style={{margin:"0 10px"}}/>
          <div className="rp-section"><div className="rp-stitle">TRIFÁSICO PRIMÁRIO</div>
            <div className="rp-row"><span className="rp-lbl">P ativa</span><span className="rp-val">{fmtPwr(pTotal.P*pk,"W")}</span></div>
            <div className="rp-row"><span className="rp-lbl">Q reativa</span><span className="rp-val">{fmtPwr(pTotal.Q*pk,"VAr")}</span></div>
            <div className="rp-row"><span className="rp-lbl">S aparente</span><span className="rp-val">{fmtPwr(pTotal.S*pk,"VA")}</span></div>
          </div>
          <div className="rp-sep" style={{margin:"0 10px"}}/>
          <div className="rp-section"><div className="rp-stitle">POR FASE (SECUNDÁRIO)</div>
            {[["A",pA],["B",pB],["C",pC]].map(([ph,pw])=>(<div key={ph}>
              <div className="rp-row"><span className="rp-lbl">P{ph}</span><span className="rp-val">{fmtPwr(pw.P,"W")}</span></div>
              <div className="rp-row"><span className="rp-lbl">Q{ph}</span><span className="rp-val">{fmtPwr(pw.Q,"VAr")}</span></div>
              <div className="rp-row"><span className="rp-lbl">S{ph}</span><span className="rp-val">{fmtPwr(pw.S,"VA")}</span></div>
              {ph!=="C"&&<div className="rp-sep"/>}
            </div>))}
          </div>
        </div>)}
        {mensTab==="sist"&&(<div>
          <div className="rp-section"><div className="rp-stitle">FREQUÊNCIA</div>
            <div className="rp-row"><span className="rp-lbl">Frequência</span><span className="rp-val">{freqLcd.toFixed(1)} Hz</span></div>
            <div className="rp-row"><span className="rp-lbl">Δf (60 Hz)</span><span className="rp-val">{df>=0?"+":""}{df.toFixed(1)} Hz</span></div>
          </div>
          <div className="rp-sep" style={{margin:"0 10px"}}/>
          <div className="rp-section"><div className="rp-stitle">RELAÇÕES TC / TP</div>
            <div className="rp-row"><span className="rp-lbl">TC</span><span className="rp-val">{sys.tc.priA}/{sys.tc.secA} A</span></div>
            <div className="rp-row"><span className="rp-lbl">RTC</span><span className="rp-val">{rtc.toFixed(2)}</span></div>
            <div className="rp-sep"/>
            <div className="rp-row"><span className="rp-lbl">TP</span><span className="rp-val">{sys.tp.priV}/{sys.tp.secV} V</span></div>
            <div className="rp-row"><span className="rp-lbl">RTP</span><span className="rp-val">{rtp.toFixed(2)}</span></div>
          </div>
          <div className="rp-sep" style={{margin:"0 10px"}}/>
          <div className="rp-section"><div className="rp-stitle">DESEQUILÍBRIO</div>
            <div className="rp-row"><span className="rp-lbl">I₂/I₁</span><span className="rp-val">{i1mag>0.01?(i2lcd.mag/i1mag*100).toFixed(1)+"%":"—"}</span></div>
            <div className="rp-row"><span className="rp-lbl">V₂/Vn</span><span className="rp-val">{Vnom>0?(v2mag/Vnom*100).toFixed(1)+"%":"—"}</span></div>
            <div className="rp-row"><span className="rp-lbl">3I₀</span><span className="rp-val">{ff(i0.mag,3)} A</span></div>
            <div className="rp-row"><span className="rp-lbl">3V₀</span><span className="rp-val">{ff(v0.mag,3)} V</span></div>
          </div>
        </div>)}
      </div>
    </div>);
  };

  const renderProtecaoTab=()=>(<div>
    {relayProt&&protOrder.map(fid=>{
      const f=relayProt[fid];if(!f)return null;
      const isTrip=trippedStageIds.some(id=>id.startsWith(fid+"-"));
      const dotBg=isTrip?"#f87171":f.enabled?"#4ade80":"#1e2230";
      const dotGlow=isTrip?"0 0 5px #f87171":f.enabled?"0 0 4px rgba(74,222,128,.5)":"none";
      return(<div key={fid} className="rp-prot">
        <div className="rp-pdot" style={{background:dotBg,boxShadow:dotGlow}}/>
        <span className="rp-plbl">{fid}</span>
        <span className="rp-pname">{f.name}</span>
        <span className={`rp-pst ${isTrip?"trip":f.enabled?"en":"dis"}`}>{isTrip?"TRIP":f.enabled?"EN":"OFF"}</span>
      </div>);
    })}
  </div>);

  const renderLogicaTab=()=>(<div>
    {ledCols.map((_,i)=>{
      const lit=ledLitStates[i];const lb=ledLabels[i];
      return(<div key={i} className="rp-led-row">
        <div className={`rp-led-dot ${lit?"on":"off"}`}/>
        <span className={`rp-led-lbl ${lb?(lit?"on":"off"):"empty"}`}>{lb||"—"}</span>
        <span className={`rp-led-st ${lit?"on":"off"}`}>{lit?"TRIP":"—"}</span>
      </div>);
    })}
  </div>);

  const renderEventosTab=()=>(<div>
    {evts.length===0
      ?<div className="rp-empty">NO EVENTS</div>
      :evts.slice(0,10).map((e,i)=>(
        <div key={i} className="rp-evt">
          <span className="rp-evt-t">[{e.time}]</span>
          <span className="rp-evt-x">{e.icon} {e.text}</span>
        </div>
      ))
    }
  </div>);

  return(<>
    <div className="relay-lcd">
      <div className="lcd-nav">
        <button className="lcd-b" onClick={()=>setRp(p=>(p-1+totalPages)%totalPages)}>◀</button>
        <span className="lcd-pg">{pageNames[rp]}</span>
        <button className="lcd-b" onClick={()=>setRp(p=>(p+1)%totalPages)}>▶</button>
      </div>
      {renderPage()}
    </div>
    <div className="relay-tabs">
      <button className={`rtab ${relayTab==="mensuracao"?"on":""}`} onClick={()=>setRelayTab("mensuracao")}>MENS.</button>
      <button className={`rtab ${relayTab==="protecao"?"on":""}`} onClick={()=>setRelayTab("protecao")}>PROT.</button>
      <button className={`rtab ${relayTab==="logica"?"on":""}`} onClick={()=>setRelayTab("logica")}>LÓGICA</button>
      <button className={`rtab ${relayTab==="eventos"?"on":""}`} onClick={()=>setRelayTab("eventos")}>EVENTOS</button>
    </div>
    <div className="relay-panel">
      {relayTab==="mensuracao"&&renderMensuracaoTab()}
      {relayTab==="protecao"&&renderProtecaoTab()}
      {relayTab==="logica"&&renderLogicaTab()}
      {relayTab==="eventos"&&renderEventosTab()}
    </div>
  </>);
}
