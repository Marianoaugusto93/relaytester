import{useState,useCallback,useRef}from"react";
import{Tgl,IB}from"./widgets.jsx";
import{protOrder,curveTypes,TEST_PRESETS,biRows,cbStatusRows,cbCmdRows,protStageRows,allRows,boCols,ledCols,allCols,inMatrixRows}from"./defaults.js";
import{EDUCATIONAL_SCENARIOS}from"./scenarios/educational-scenarios.js";
import{useTranslation}from"./i18n/useTranslation.js";
import{getAllCustomScenarios,saveCustomScenario,deleteCustomScenario,exportScenarioAsJson,importScenarioFromFile}from"./scenarios/customScenarios.js";

// ── Difficulty badge class helper ─────────────────────────────────────────────
function diffClass(d){return d==="Beginner"?"beg":d==="Advanced"?"adv":"int";}

// ── Custom Scenario Builder component ─────────────────────────────────────────
function CustomScenarioBuilder({prot,outMatrix,inMatrix,applyTestPreset,phasors}){
  const{t}=useTranslation();
  const[open,setOpen]=useState(false);
  const[scenarios,setScenarios]=useState(()=>getAllCustomScenarios());
  const[editId,setEditId]=useState(null);
  const[name,setName]=useState("");
  const[desc,setDesc]=useState("");
  const[diff,setDiff]=useState("Intermediate");
  const[expTrip,setExpTrip]=useState("");
  const[expTime,setExpTime]=useState("");
  const[msg,setMsg]=useState(null);
  const importRef=useRef(null);

  const refresh=()=>setScenarios(getAllCustomScenarios());

  const showMsg=(text,ok=true)=>{setMsg({text,ok});setTimeout(()=>setMsg(null),2500);};

  const clearForm=useCallback(()=>{
    setEditId(null);setName("");setDesc("");setDiff("Intermediate");setExpTrip("");setExpTime("");
  },[]);

  const openNew=()=>{clearForm();setOpen(true);};

  const handleSave=()=>{
    if(!name.trim()){showMsg(t("customScenarios.msgNameRequired"),false);return;}
    const fns=protOrder.filter(fid=>prot[fid]?.enabled);
    const stages={};
    protOrder.forEach(fid=>{
      const f=prot[fid];
      if(!f)return;
      if(fid==="27/59"){stages[fid]={s27:(f.stages27||[]).map((s,i)=>s.enabled?i:null).filter(i=>i!==null),s59:(f.stages59||[]).map((s,i)=>s.enabled?i:null).filter(i=>i!==null)};}
      else if(fid==="81"){stages[fid]={s81u:(f.stages81u||[]).map((s,i)=>s.enabled?i:null).filter(i=>i!==null),s81o:(f.stages81o||[]).map((s,i)=>s.enabled?i:null).filter(i=>i!==null)};}
      else if(fid==="32"){stages[fid]={s32r:(f.stages32r||[]).map((s,i)=>s.enabled?i:null).filter(i=>i!==null),s32f:(f.stages32f||[]).map((s,i)=>s.enabled?i:null).filter(i=>i!==null)};}
      else if(fid!=="79"){stages[fid]=(f.stages||[]).map((s,i)=>s.enabled?i:null).filter(i=>i!==null);}
    });
    const out={};
    Object.keys(outMatrix).forEach(row=>{
      const cols=Object.keys(outMatrix[row]).filter(c=>outMatrix[row][c]);
      if(cols.length>0){out[row]={};cols.forEach(c=>{out[row][c]=true;});}
    });
    const inp={};
    Object.keys(inMatrix).forEach(row=>{
      const cols=Object.keys(inMatrix[row]).filter(c=>inMatrix[row][c]);
      if(cols.length>0){inp[row]={};cols.forEach(c=>{inp[row][c]=true;});}
    });
    const id=editId||`custom_${Date.now()}`;
    const scenario={
      id,type:"custom",
      label:name.trim().slice(0,20),
      name:name.trim(),
      description:desc.trim(),
      difficulty:diff,
      createdAt:new Date().toISOString(),
      phasors:phasors||undefined,
      fns,stages,patch:{},out,inp,
      expectedTrip:expTrip.trim()||undefined,
      expectedTime:expTime!=""?parseFloat(expTime):undefined,
    };
    const ok=saveCustomScenario(scenario);
    if(ok){showMsg(editId?t("customScenarios.msgUpdated"):t("customScenarios.msgSaved"));refresh();clearForm();setOpen(false);}
    else{showMsg(t("customScenarios.msgSaveFailed"),false);}
  };

  const handleEdit=(s)=>{
    setEditId(s.id);setName(s.name);setDesc(s.description||"");setDiff(s.difficulty||"Intermediate");
    setExpTrip(s.expectedTrip||"");setExpTime(s.expectedTime!=null?String(s.expectedTime):"");
    setOpen(true);
  };

  const handleDelete=(id)=>{
    if(!window.confirm(t("customScenarios.confirmDelete")))return;
    deleteCustomScenario(id);refresh();showMsg(t("customScenarios.msgDeleted"));
  };

  const handleExport=(s)=>{exportScenarioAsJson(s);showMsg(t("customScenarios.msgExported"));};

  const handleLoad=(s)=>{
    applyTestPreset(s);showMsg(t("customScenarios.msgLoaded"));
  };

  const handleImport=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    e.target.value="";
    importScenarioFromFile(file).then(obj=>{
      if(!obj.fns||!Array.isArray(obj.fns)){showMsg(t("customScenarios.msgInvalidFile"),false);return;}
      if(!obj.id)obj.id=`custom_${Date.now()}`;
      obj.type="custom";
      if(!obj.label&&obj.name)obj.label=obj.name.slice(0,20);
      const ok=saveCustomScenario(obj);
      if(ok){showMsg(t("customScenarios.msgImported"));refresh();}
      else{showMsg(t("customScenarios.msgImportFailed"),false);}
    }).catch(()=>showMsg(t("customScenarios.msgReadError"),false));
  };

  const enabledFns=protOrder.filter(fid=>prot[fid]?.enabled);

  return(
    <section className="cs-section" aria-label={t("customScenarios.title")}>
      <h4 className="cs-title">
        <span className="cs-title-lbl">{t("customScenarios.title")}</span>
        <button className="cs-add-btn" onClick={openNew}>{t("customScenarios.newBtn")}</button>
      </h4>

      {msg&&<div style={{fontSize:9,padding:"4px 8px",borderRadius:6,marginBottom:6,background:msg.ok?"rgba(74,222,128,.1)":"rgba(248,113,113,.1)",color:msg.ok?"var(--green)":"var(--red)",border:`1px solid ${msg.ok?"rgba(74,222,128,.25)":"rgba(248,113,113,.25)"}`}}>{msg.text}</div>}

      {open&&(
        <div className="cs-form">
          <div className="cs-field">
            <label>{t("customScenarios.nameLabel")}</label>
            <input className="cs-input" value={name} onChange={e=>setName(e.target.value)} placeholder={t("customScenarios.namePlaceholder")} maxLength={60}/>
          </div>
          <div className="cs-field">
            <label>{t("customScenarios.descLabel")}</label>
            <textarea className="cs-textarea" value={desc} onChange={e=>setDesc(e.target.value)} placeholder={t("customScenarios.descPlaceholder")} rows={2}/>
          </div>
          <div className="cs-field">
            <label>{t("customScenarios.diffLabel")}</label>
            <div className="cs-diff">
              {["Beginner","Intermediate","Advanced"].map(d=>(
                <button key={d} className={`cs-diff-btn ${diffClass(d)} ${diff===d?"on":""}`} onClick={()=>setDiff(d)}>{d}</button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <div className="cs-field">
              <label>{t("customScenarios.expTripLabel")}</label>
              <input className="cs-input" value={expTrip} onChange={e=>setExpTrip(e.target.value)} placeholder={t("customScenarios.expTripPlaceholder")}/>
            </div>
            <div className="cs-field">
              <label>{t("customScenarios.expTimeLabel")}</label>
              <input className="cs-input" type="number" step="0.01" min="0" value={expTime} onChange={e=>setExpTime(e.target.value)} placeholder={t("customScenarios.expTimePlaceholder")}/>
            </div>
          </div>
          <div className="cs-snapshot">
            <div style={{fontSize:8,color:"var(--tx3)",marginBottom:4,letterSpacing:1,textTransform:"uppercase",fontWeight:700}}>{t("customScenarios.captureHint")}</div>
            <div className="cs-snap-row">
              <span style={{color:"var(--tx3)"}}>{t("customScenarios.activeFns")}</span>
              {enabledFns.length>0?enabledFns.map(f=><span key={f} style={{color:"var(--orange)",marginRight:4,fontWeight:700}}>{f}</span>):<span style={{color:"var(--tx3)"}}>{t("customScenarios.none")}</span>}
            </div>
            <div style={{marginTop:2,color:"var(--tx3)",fontSize:8}}>{t("customScenarios.captureDesc")}</div>
          </div>
          <CaptureAndSave onSave={handleSave} onCancel={()=>{clearForm();setOpen(false);}} isEdit={!!editId}/>
        </div>
      )}

      <div className="cs-import-row">
        <span className="cs-import-lbl">{t("customScenarios.importLbl")}</span>
        <button className="cs-import-btn" onClick={()=>importRef.current?.click()}>{t("customScenarios.importBtn")}</button>
        <input ref={importRef} type="file" accept=".json,application/json" style={{display:"none"}} onChange={handleImport}/>
      </div>

      {scenarios.length===0
        ?<div className="cs-empty">{t("customScenarios.empty")}</div>
        :<div className="cs-list">
          {scenarios.map(s=>(
            <div key={s.id} className="cs-item">
              <div className="cs-item-top">
                <span className="cs-item-name">{s.name}</span>
                {s.difficulty&&<span className={`cs-diff-badge ${diffClass(s.difficulty)}`}>{s.difficulty}</span>}
              </div>
              {s.description&&<div className="cs-item-desc">{s.description}</div>}
              <div className="cs-item-btns">
                <button className="cs-item-btn load" onClick={()=>handleLoad(s)}>{t("customScenarios.loadBtn")}</button>
                <button className="cs-item-btn edit" onClick={()=>handleEdit(s)}>{t("customScenarios.editBtn")}</button>
                <button className="cs-item-btn exp" onClick={()=>handleExport(s)}>{t("customScenarios.exportBtn")}</button>
                <button className="cs-item-btn del" onClick={()=>handleDelete(s.id)}>{t("customScenarios.deleteBtn")}</button>
              </div>
            </div>
          ))}
        </div>
      }
    </section>
  );
}

function CaptureAndSave({onSave,onCancel,isEdit}){
  const{t}=useTranslation();
  return(
    <div className="cs-form-btns">
      <button className="cs-save-btn" onClick={onSave}>{isEdit?t("customScenarios.updateBtn"):t("customScenarios.saveBtn")}</button>
      <button className="cs-clear-btn" onClick={onCancel}>{t("customScenarios.cancelBtn")}</button>
    </div>
  );
}

// ── Main SettingsPanel export ─────────────────────────────────────────────────
export default function SettingsPanel({prot,outMatrix,inMatrix,sys,tab,si,mainTab,uPr,uSt,uS,setSi,setTab,toggleMatrix,toggleInMatrix,applyTestPreset,rtp,rtc,phasors}){
  const{t}=useTranslation();
  const getStages=()=>{const f=prot[tab];if(tab==="27/59")return[...(f.stages27||[]),...(f.stages59||[])];if(tab==="81")return[...(f.stages81u||[]),...(f.stages81o||[])];if(tab==="32")return[...(f.stages32r||[]),...(f.stages32f||[])];if(tab==="79")return[];return f.stages||[]};
  const getCur=()=>{if(tab==="27/59"){return si<3?prot["27/59"].stages27?.[si]:prot["27/59"].stages59?.[si-3]}if(tab==="81"){return si<3?prot["81"].stages81u?.[si]:prot["81"].stages81o?.[si-3]}if(tab==="32"){return si<2?prot["32"].stages32r?.[si]:prot["32"].stages32f?.[si-2]}if(tab==="79")return null;return(prot[tab].stages||[])[si]};
  const isOC=["50","51","50N","51N","67","67N"].includes(tab);const isTm=["51","51N","67","67N"].includes(tab);const isDir=["67","67N"].includes(tab);const isVlt=tab==="27/59";const is46=tab==="46";const is81=tab==="81";const is32=tab==="32";const is79=tab==="79";
  const stages=getStages();const cur=getCur();

  if(mainTab==="sys")return(<div className="card-scroll"><div className="cp"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><div><div className="fn" style={{marginBottom:10}}>{t("sys.pt")}</div><div className="fr"><div className="fg"><div className="fl">{t("sys.vPri")}</div><IB unit="V" value={sys.tp.priV} onChange={v=>uS("tp","priV",v)}/></div><div className="fg"><div className="fl">{t("sys.vSec")}</div><IB unit="V" value={sys.tp.secV} onChange={v=>uS("tp","secV",v)}/></div></div><div className="fl" style={{margin:"6px 0 3px"}}>{t("sys.primary")}</div><div className="conn-r"><button className={`conn-b ${sys.tp.priConn==="estrela"?"on":""}`} onClick={()=>uS("tp","priConn","estrela")}>Y</button><button className={`conn-b ${sys.tp.priConn==="delta"?"on":""}`} onClick={()=>uS("tp","priConn","delta")}>Δ</button></div><div className="fl" style={{margin:"6px 0 3px"}}>{t("sys.secondary")}</div><div className="conn-r"><button className={`conn-b ${sys.tp.secConn==="estrela"?"on":""}`} onClick={()=>uS("tp","secConn","estrela")}>Y</button><button className={`conn-b ${sys.tp.secConn==="delta"?"on":""}`} onClick={()=>uS("tp","secConn","delta")}>Δ</button></div><div className="ratio">{t("sys.rtp")}{rtp.toFixed(2)}</div></div><div><div className="fn" style={{marginBottom:10}}>{t("sys.ct")}</div><div className="fr"><div className="fg"><div className="fl">{t("sys.iPri")}</div><IB unit="A" value={sys.tc.priA} onChange={v=>uS("tc","priA",v)}/></div><div className="fg"><div className="fl">{t("sys.iSec")}</div><IB unit="A" value={sys.tc.secA} onChange={v=>uS("tc","secA",v)}/></div></div><div className="ratio">{t("sys.rtc")}{rtc.toFixed(2)}</div></div></div></div></div>);

  if(mainTab==="relay")return(<><div className="tp-strip"><span className="tp-lbl">{t("settings.preset")}</span>{TEST_PRESETS.map(p=><button key={p.id} className="tp-btn" title={p.desc} onClick={()=>applyTestPreset(p)}>{p.label}</button>)}</div><section className="edu-section" aria-label="Educational Scenarios"><h4 className="edu-title">{t("settings.eduScenarios")}</h4><div className="edu-grid">{EDUCATIONAL_SCENARIOS.map(s=><button key={s.id} className="tp-btn edu-btn" title={s.description+" (replaces current phasors and settings)"} onClick={()=>applyTestPreset(s)}>{s.label}</button>)}</div></section><CustomScenarioBuilder prot={prot} outMatrix={outMatrix} inMatrix={inMatrix} applyTestPreset={applyTestPreset} phasors={phasors}/><div className="tbar">{protOrder.map(id=><button key={id} className={`ti ${tab===id?"on":""}`} onClick={()=>{setTab(id);setSi(0)}}>{id}</button>)}</div><div className="card-scroll"><div className="cp">
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
