import{useState}from"react";
import{Tgl,IB}from"./widgets.jsx";
import{protOrder,curveTypes,TEST_PRESETS,biRows,cbStatusRows,cbCmdRows,protStageRows,allRows,boCols,ledCols,allCols,inMatrixRows}from"./defaults.js";
import{useTranslation}from"./i18n/useTranslation.js";
import ScenariosSidebar from"./relay/ScenariosSidebar.jsx";

// ── Main SettingsPanel export ─────────────────────────────────────────────────
export default function SettingsPanel({prot,outMatrix,inMatrix,sys,tab,si,mainTab,uPr,uSt,uS,setSi,setTab,toggleMatrix,toggleInMatrix,applyTestPreset,rtp,rtc,phasors}){
  const{t}=useTranslation();
  const getStages=()=>{const f=prot[tab];if(tab==="27/59")return[...(f.stages27||[]),...(f.stages59||[])];if(tab==="81")return[...(f.stages81u||[]),...(f.stages81o||[])];if(tab==="32")return[...(f.stages32r||[]),...(f.stages32f||[])];if(tab==="79")return[];return f.stages||[]};
  const getCur=()=>{if(tab==="27/59"){return si<3?prot["27/59"].stages27?.[si]:prot["27/59"].stages59?.[si-3]}if(tab==="81"){return si<3?prot["81"].stages81u?.[si]:prot["81"].stages81o?.[si-3]}if(tab==="32"){return si<2?prot["32"].stages32r?.[si]:prot["32"].stages32f?.[si-2]}if(tab==="79")return null;return(prot[tab].stages||[])[si]};
  const isOC=["50","51","50N","51N","67","67N"].includes(tab);const isTm=["51","51N","67","67N"].includes(tab);const isDir=["67","67N"].includes(tab);const isVlt=tab==="27/59";const is46=tab==="46";const is81=tab==="81";const is32=tab==="32";const is79=tab==="79";
  const stages=getStages();const cur=getCur();

  if(mainTab==="sys")return(<div className="card-scroll"><div className="cp"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><div><div className="fn" style={{marginBottom:10}}>{t("sys.pt")}</div><div className="fr"><div className="fg"><div className="fl">{t("sys.vPri")}</div><IB unit="V" value={sys.tp.priV} onChange={v=>uS("tp","priV",v)}/></div><div className="fg"><div className="fl">{t("sys.vSec")}</div><IB unit="V" value={sys.tp.secV} onChange={v=>uS("tp","secV",v)}/></div></div><div className="fl" style={{margin:"6px 0 3px"}}>{t("sys.primary")}</div><div className="conn-r"><button className={`conn-b ${sys.tp.priConn==="estrela"?"on":""}`} onClick={()=>uS("tp","priConn","estrela")}>Y</button><button className={`conn-b ${sys.tp.priConn==="delta"?"on":""}`} onClick={()=>uS("tp","priConn","delta")}>Δ</button></div><div className="fl" style={{margin:"6px 0 3px"}}>{t("sys.secondary")}</div><div className="conn-r"><button className={`conn-b ${sys.tp.secConn==="estrela"?"on":""}`} onClick={()=>uS("tp","secConn","estrela")}>Y</button><button className={`conn-b ${sys.tp.secConn==="delta"?"on":""}`} onClick={()=>uS("tp","secConn","delta")}>Δ</button></div><div className="ratio">{t("sys.rtp")}{rtp.toFixed(2)}</div></div><div><div className="fn" style={{marginBottom:10}}>{t("sys.ct")}</div><div className="fr"><div className="fg"><div className="fl">{t("sys.iPri")}</div><IB unit="A" value={sys.tc.priA} onChange={v=>uS("tc","priA",v)}/></div><div className="fg"><div className="fl">{t("sys.iSec")}</div><IB unit="A" value={sys.tc.secA} onChange={v=>uS("tc","secA",v)}/></div></div><div className="ratio">{t("sys.rtc")}{rtc.toFixed(2)}</div></div></div></div></div>);

  if(mainTab==="relay")return(<><div className="tp-strip"><span className="tp-lbl">{t("settings.preset")}</span>{TEST_PRESETS.map(p=><button key={p.id} className="tp-btn" title={p.desc} onClick={()=>applyTestPreset(p)}>{p.label}</button>)}</div><div className="card-scroll"><div className="cp">
    <div className="fh"><span className="fn">{prot[tab].name}</span><Tgl value={prot[tab].enabled} onChange={v=>uPr(tab,"enabled",v)} label={prot[tab].enabled?t("settings.enabled"):t("settings.disabled")}/></div>
    {isOC&&<div className="bs"><label>{t("settings.adjustBase")}</label><select className="sl" value={prot[tab].base} onChange={e=>uPr(tab,"base",e.target.value)}><option value="primario">{t("settings.primary")}</option><option value="secundario">{t("settings.secondary")}</option><option value="multiplo">{t("settings.multiple")}</option></select></div>}
    {isVlt&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
      <div className="bs"><label>{t("settings.startPhases")}</label><select className="sl" value={prot[tab].startPhases||"any"} onChange={e=>uPr(tab,"startPhases",e.target.value)}><option value="any">{t("settings.anyPhase")}</option><option value="all">{t("settings.allPhases")}</option></select></div>
      <div className="bs"><label>{t("settings.voltageSelection")}</label><select className="sl" value={prot[tab].voltageSelection||"ph-n"} onChange={e=>uPr(tab,"voltageSelection",e.target.value)}><option value="ph-n">{t("settings.phaseNeutral")}</option><option value="ph-ph">{t("settings.phasePhase")}</option></select></div>
      <div className="bs"><label>{t("settings.hysteresis")}</label><IB unit="%" value={prot[tab].hysteresis||4.0} onChange={v=>uPr(tab,"hysteresis",v)} step="0.1"/></div>
      <div className="bs"><Tgl value={prot[tab].lowVoltageBlockEnabled||false} onChange={v=>uPr(tab,"lowVoltageBlockEnabled",v)} label={t("settings.lowVBlock")}/>{prot[tab].lowVoltageBlockEnabled&&<div style={{marginTop:4}}><IB unit="pu" value={prot[tab].voltageBlockPu||0.20} onChange={v=>uPr(tab,"voltageBlockPu",v)} step="0.01"/></div>}</div>
    </div>}
    <div className="stbar">{stages.map((s,i)=><button key={s.id} className={`stb ${i===si?"on":""} ${!s.enabled?"dis":""}`} onClick={()=>setSi(i)}>{s.id}</button>)}</div>
    {is46&&<div className="bs" style={{marginBottom:8,padding:"6px 8px",background:"var(--card2)",borderRadius:"var(--rs)",fontSize:10,color:"var(--tx3)"}}>{t("customScenarios.info46")}</div>}
    {is81&&<div className="bs" style={{marginBottom:8,padding:"6px 8px",background:"var(--card2)",borderRadius:"var(--rs)",fontSize:10,color:"var(--tx3)"}}>{t("customScenarios.info81")}</div>}
    {is32&&<div className="bs" style={{marginBottom:8,padding:"6px 8px",background:"var(--card2)",borderRadius:"var(--rs)",fontSize:10,color:"var(--tx3)"}}>{t("customScenarios.info32")}</div>}
    {is79&&<div style={{marginTop:4}}><div style={{marginBottom:8,padding:"6px 8px",background:"var(--card2)",borderRadius:"var(--rs)",fontSize:10,color:"var(--tx3)"}}>{t("customScenarios.info79dead")}</div><div className="pg"><div className="pi"><label>{t("settings.shots")}</label><IB unit="shots" value={prot["79"].shots??3} onChange={v=>uPr("79","shots",Math.max(1,Math.round(v)))}/></div><div className="pi"><label>{t("settings.reclaimTime")}</label><IB unit="s" value={prot["79"].reclaimTime??3.0} onChange={v=>uPr("79","reclaimTime",v)} step="0.1"/></div></div><div style={{marginTop:8}}><div className="fl" style={{marginBottom:4}}>{t("settings.deadTimes")}</div>{(prot["79"].deadTimes||[0.5,5.0,15.0]).map((dt,i)=><div key={i} className="fr" style={{marginBottom:4}}><div className="fg"><div className="fl">{t("settings.shot")} {i+1}</div><IB unit="s" value={dt} onChange={v=>{const dts=[...(prot["79"].deadTimes||[0.5,5.0,15.0])];dts[i]=v;uPr("79","deadTimes",dts);}} step="0.1"/></div></div>)}</div></div>}
    {cur&&<div><Tgl value={cur.enabled} onChange={v=>uSt(tab,si,"enabled",v)} label={`${t("settings.stage")} ${cur.id}`}/><div className="pg">
      {(isOC||isDir)&&<div className="pi"><label>{tab.includes("50")?t("settings.pickupInst"):t("settings.pickupTime")}</label><IB unit="A" value={cur.pickup} onChange={v=>uSt(tab,si,"pickup",v)}/></div>}
      {(isVlt||tab==="47")&&<div className="pi"><label>{t("settings.pickupPu")}</label><IB unit="pu" value={cur.pickup} onChange={v=>uSt(tab,si,"pickup",v)} step="0.01"/></div>}
      {is46&&<div className="pi"><label>{t("settings.pickupI2")}</label><IB unit="A" value={cur.pickup} onChange={v=>uSt(tab,si,"pickup",v)} step="0.01"/></div>}
      {is81&&<div className="pi"><label>{cur.id.startsWith("81U")?t("settings.pickupSubfreq"):t("settings.pickupOverfreq")}</label><IB unit="Hz" value={cur.pickup} onChange={v=>uSt(tab,si,"pickup",v)} step="0.05"/></div>}
      {is32&&<div className="pi"><label>{cur.id.startsWith("32R")?t("settings.pickup32R"):t("settings.pickup32F")}</label><IB unit="W" value={cur.pickup} onChange={v=>uSt(tab,si,"pickup",v)} step="1"/></div>}
      {isTm&&<><div className="pi"><label>{t("settings.timeDial")}</label><IB value={cur.timeDial} onChange={v=>uSt(tab,si,"timeDial",v)} step="0.01"/></div><div className="pi"><label>{t("settings.curve")}</label><select className="sl" value={cur.curve} onChange={e=>uSt(tab,si,"curve",e.target.value)}>{curveTypes.map(c=><option key={c} value={c}>{c}</option>)}</select></div></>}
      {(!isTm&&!isVlt&&tab!=="47"&&!is46&&!is81&&!is32)&&<div className="pi"><label>{t("settings.timeOp")}</label><IB unit="s" value={cur.timeOp} onChange={v=>uSt(tab,si,"timeOp",v)} step="0.01"/></div>}
      {(isVlt||tab==="47"||is46||is81||is32)&&<div className="pi"><label>{t("settings.timeOp")}</label><IB unit="s" value={cur.timeOp} onChange={v=>uSt(tab,si,"timeOp",v)} step="0.01"/></div>}
      {isDir&&<><div className="pi"><label>{t("settings.mta")}</label><IB unit="°" value={cur.mta} onChange={v=>uSt(tab,si,"mta",v)} step="1"/></div><div className="pi"><label>{t("settings.polarization")}</label><select className="sl" value={cur.pol} onChange={e=>uSt(tab,si,"pol",e.target.value)}>{tab==="67"?<><option value="quadratura">Quadrature</option><option value="quad_loop">Quad. Loop</option><option value="seq_pos">Positive Seq.</option><option value="seq_pos_loop">Pos. Seq. Loop</option></>:<><option value="-V0">−V₀</option><option value="V0">V₀</option></>}</select></div><div className="pi"><label>{t("settings.direction")}</label><select className="sl" value={cur.dir||"forward"} onChange={e=>uSt(tab,si,"dir",e.target.value)}><option value="forward">{t("settings.forward")}</option><option value="reverse">{t("settings.reverse")}</option></select></div>{tab==="67N"&&<div className="pi"><label>{t("settings.vminPol")}</label><IB unit="V" value={cur.minPolV} onChange={v=>uSt(tab,si,"minPolV",v)} step="0.1"/></div>}</>}
    </div></div>}
  </div></div></>);

  if(mainTab==="output")return(<div className="card-scroll"><div className="mx-wrap"><table className="mx"><thead><tr><th className="corner">{t("matrix.signal")}</th>{boCols.map(c=><th key={c} className="col-bo">{c}</th>)}{ledCols.map(c=><th key={c} className="col-led">{c}</th>)}</tr></thead><tbody>
    <tr className="mx-section"><td colSpan={allCols.length+1}>{t("matrix.binaryInputs")}</td></tr>
    {biRows.map(r=><tr key={r}><td className="row-label is-bi">{r}</td>{allCols.map(c=><td key={c}><div className="mx-cell"><div className={`mx-chk ${outMatrix[r]?.[c]?"on":""}`} onClick={()=>toggleMatrix(r,c)}/></div></td>)}</tr>)}
    <tr className="mx-section"><td colSpan={allCols.length+1}>{t("matrix.cbStatus")}</td></tr>
    {cbStatusRows.map(r=><tr key={r}><td className="row-label" style={{color:'var(--sky)'}}>{r}</td>{allCols.map(c=><td key={c}><div className="mx-cell"><div className={`mx-chk ${outMatrix[r]?.[c]?"on":""}`} onClick={()=>toggleMatrix(r,c)}/></div></td>)}</tr>)}
    <tr className="mx-section"><td colSpan={allCols.length+1}>{t("matrix.cbCommands")}</td></tr>
    {cbCmdRows.map(r=><tr key={r}><td className="row-label" style={{color:'var(--amber)'}}>{r}</td>{allCols.map(c=><td key={c}><div className="mx-cell"><div className={`mx-chk ${outMatrix[r]?.[c]?"on":""}`} onClick={()=>toggleMatrix(r,c)}/></div></td>)}</tr>)}
    <tr className="mx-section"><td colSpan={allCols.length+1}>{t("matrix.protectionStages")}</td></tr>
    {protStageRows.map(r=><tr key={r}><td className="row-label is-prot">{r}</td>{allCols.map(c=><td key={c}><div className="mx-cell"><div className={`mx-chk ${outMatrix[r]?.[c]?"on":""}`} onClick={()=>toggleMatrix(r,c)}/></div></td>)}</tr>)}
  </tbody></table></div></div>);

  if(mainTab==="scenarios")return(<ScenariosSidebar pfMode={phasors.pfMode} setPfMode={phasors.setPfMode} prot={prot} outMatrix={outMatrix} inMatrix={inMatrix} phasors={phasors} applyTestPreset={applyTestPreset}/>);

  return(<div className="card-scroll"><div className="mx-wrap">
    <table className="mx"><thead><tr>
      <th className="corner">{t("matrix.signal")}</th>
      {biRows.map(c=><th key={c} className="col-bo">{c}</th>)}
    </tr></thead><tbody>
      <tr className="mx-section"><td colSpan={biRows.length+1}>{t("matrix.cbStatus")}</td></tr>
      {inMatrixRows.map(r=><tr key={r}><td className="row-label" style={{color:'var(--sky)'}}>{r}</td>{biRows.map(c=><td key={c}><div className="mx-cell"><div className={`mx-chk ${inMatrix[r]?.[c]?"on":""}`} onClick={()=>toggleInMatrix(r,c)}/></div></td>)}</tr>)}
    </tbody></table>
    <div style={{marginTop:16,padding:'10px 12px',background:'var(--card2)',borderRadius:'var(--rs)',border:'1px solid var(--bdr)',fontSize:10,fontFamily:'var(--fm)',color:'var(--tx3)',lineHeight:1.7}}>
      <span style={{color:'var(--sky)',fontWeight:700}}>CB_Opened</span> → {t("customScenarios.infoCbOpened")}<br/>
      <span style={{color:'var(--sky)',fontWeight:700}}>CB_Closed</span> → {t("customScenarios.infoCbClosed")}
    </div>
  </div></div>);
}
