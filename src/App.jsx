import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import CampoPage, { buildElectricalGraph, computeRelayReadings } from "./CampoPage.jsx";
import CampoPageNew from "./CampoPageNew.jsx";
import PainelPage from "./PainelPage.jsx";
import { generateComtrade } from "./comtrade.js";
import JSZip from "jszip";
import { deepClone, defaultPhasors, defaultSystem, defaultProtections, protOrder, biRows, allRows, boCols, ledCols, buildDefaultMatrix, buildDefaultInMatrix, mainTabs, TEST_PRESETS, fmtTs, nowShort } from "./defaults.js";
import { EDUCATIONAL_SCENARIOS } from "./scenarios/educational-scenarios.js";
import { calc3, calcPower, calcI2 } from "./protection.js";
import { buildSaveContent, parseSaveFile } from "./fileIO.js";
import { S } from "./appStyles.js";
import { Tgl, IB } from "./widgets.jsx";
import { HelpProvider, useHelp } from "./HelpContext.jsx";
import HelpModal from "./HelpModal.jsx";
import Tutorial from "./Tutorial.jsx";
import { LanguageProvider } from "./i18n/LanguageContext.jsx";
import { useTranslation } from "./i18n/useTranslation.js";
import LanguageSelector from "./LanguageSelector.jsx";
import FaultCalculator from "./FaultCalculator.jsx";
import PhasorDiagram from "./PhasorDiagram.jsx";
import RelayDisplay from "./RelayDisplay.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
import RelePage from "./RelePage.jsx";
import TestsPage from "./TestsPage.jsx";
import WaveformDisplay from "./WaveformDisplay.jsx";
import use27Monitor from "./use27Monitor.js";
import useSimulation from "./useSimulation.js";

function AppInner(){
  const{t}=useTranslation();
  // ── State ──────────────────────────────────────────────────────────────────
  const[page,setPage]=useState(1);
  const[p,setP]=useState(defaultPhasors);const[sys,setSys]=useState(defaultSystem);
  const defaultPreFault={currents:{Ia:{mag:0,ang:0},Ib:{mag:0,ang:-120},Ic:{mag:0,ang:120}},voltages:{Va:{mag:66.4,ang:0},Vb:{mag:66.4,ang:-120},Vc:{mag:66.4,ang:120}}};
  const[pf,setPf]=useState(defaultPreFault);
  const[pfEnabled,setPfEnabled]=useState(false);
  const[pfDuration,setPfDuration]=useState(1.0);
  const[pfMode,setPfMode]=useState("fault");
  const[prot,setProt]=useState(deepClone(defaultProtections));const[relayProt,setRelayProt]=useState(deepClone(defaultProtections));
  const[outMatrix,setOutMatrix]=useState(buildDefaultMatrix);const[relayMatrix,setRelayMatrix]=useState(buildDefaultMatrix);
  const[inMatrix,setInMatrix]=useState(buildDefaultInMatrix);
  const[mainTab,setMainTab]=useState("relay");const[tab,setTab]=useState("51");const[si,setSi]=useState(0);const[relayTab,setRelayTab]=useState("mensuracao");const[mensTab,setMensTab]=useState("corr");
  const[campoLayoutMode,setCampoLayoutMode]=useState("legacy");const toggleCampoLayout=()=>setCampoLayoutMode(prev=>prev==="legacy"?"new":"legacy");
  const[ss,setSs]=useState("idle");const[stime,setStime]=useState(0);const[rp,setRp]=useState(0);
  const[trippedStageIds,setTrippedStageIds]=useState([]);const[diag,setDiag]=useState([]);const[evts,setEvts]=useState([]);
  const[isTripped,setIsTripped]=useState(false);const[maletaTripped,setMaletaTripped]=useState(false);const[faultRecord,setFaultRecord]=useState(null);
  const[boStatus,setBoStatus]=useState({bo1:false,bo2:false,bo3:false,bo4:false});
  const[biStatus,setBiStatus]=useState({bi1:false,bi2:false,bi3:false,bi4:false});
  const[sendFlash,setSendFlash]=useState(false);const[getFlash,setGetFlash]=useState(false);
  const[tripHistory,setTripHistory]=useState([]);
  const[bkResetCtr,setBkResetCtr]=useState(0);const[bkCloseCtr,setBkCloseCtr]=useState(0);const[bkOpenCtr,setBkOpenCtr]=useState(0);
  const onBkFieldCommand=useCallback((cmd)=>{if(cmd==='close')setBkCloseCtr(c=>c+1);},[]);
  const[campoLoadWiring,setCampoLoadWiring]=useState(null);
  const[wfModalOpen,setWfModalOpen]=useState(false);const[wfSelected,setWfSelected]=useState(null);
  const[wfDisplayOpen,setWfDisplayOpen]=useState(false);
  const[phasorDiagOpen,setPhasorDiagOpen]=useState(false);
  const[fcOpen,setFcOpen]=useState(false);
  const[phasorVis,setPhasorVis]=useState({Ia:true,Ib:true,Ic:true,Va:true,Vb:true,Vc:true,Vab:false,Vbc:false,Vca:false,I0:false,I1:false,I2:false,V0:false,V1:false,V2:false});
  const[simPhase,setSimPhase]=useState("idle");
  const[fieldState,setFieldState]=useState({connections:[],internalConns:[]});
  const{openHelp,closeHelp,tutorialOpen,closeTutorial,registerSetPage,startTutorial}=useHelp();

  // Auto-trigger tutorial on first visit
  useEffect(()=>{
    let done;
    try{ done=localStorage.getItem("tutorial_completed"); }catch{ done="true"; }
    if(done==="true") return;
    const tid=setTimeout(()=>startTutorial(0),2000);
    return ()=>clearTimeout(tid);
  },[startTutorial]);
  const fieldStateRef=useRef(fieldState);
  const onFieldStateChange=useCallback((fs)=>{setFieldState(fs);fieldStateRef.current=fs;},[]);
  const[bkState,setBkState]=useState('open');const[bkSpring,setBkSpring]=useState(true);const[bkTripLatch,setBkTripLatch]=useState(false);
  const[balI,setBalI]=useState("manual");const[balV,setBalV]=useState("manual");const[seqI,setSeqI]=useState("ABC");const[seqV,setSeqV]=useState("ABC");

  // ── Refs ───────────────────────────────────────────────────────────────────
  const stimeRef=useRef(0);
  const ssRef=useRef("idle");
  const inMatrixRef=useRef(buildDefaultInMatrix());
  const relayProtRef=useRef(relayProt);
  useEffect(()=>{inMatrixRef.current=inMatrix;},[inMatrix]);
  useEffect(()=>{ssRef.current=ss;},[ss]);
  useEffect(()=>{relayProtRef.current=relayProt;},[relayProt]);

  // ── Transformer ratios (needed before hooks) ───────────────────────────────
  const rtc=sys.tc.priA/sys.tc.secA;const rtp=sys.tp.priV/sys.tp.secV;const Inom=sys.tc.secA;

  // ── Simulation hook ────────────────────────────────────────────────────────
  const{runSim,stopSim,stop79,ar79Ref,tr}=useSimulation({
    p,pf,pfEnabled,pfDuration,relayProt,relayMatrix,fieldStateRef,
    sys,rtc,rtp,setEvts,setTripHistory,setSimPhase,setDiag,setSs,setStime,
    setTrippedStageIds,setIsTripped,setMaletaTripped,setFaultRecord,stimeRef
  });

  // ── Relay electrical readings ──────────────────────────────────────────────
  // Prefer pre-built electricalGraph if provided by field layout (CampoPageNew);
  // fall back to rebuilding from connections+internalConns (CampoPage legacy).
  const relayGraph=useMemo(()=>fieldState.electricalGraph||buildElectricalGraph(fieldState.connections,fieldState.internalConns),[fieldState]);
  const activePhasors=simPhase==="prefault"?pf:p;
  const relayReadings=useMemo(()=>computeRelayReadings(activePhasors,relayGraph),[activePhasors,relayGraph]);
  const injecting=ss==="running";
  const i3i0=calc3(relayReadings.currents,["Ia","Ib","Ic"]);const v3v0=calc3(relayReadings.voltages,["Va","Vb","Vc"]);
  const pA=calcPower(relayReadings.voltages.Va.mag,relayReadings.currents.Ia.mag,relayReadings.voltages.Va.ang,relayReadings.currents.Ia.ang);
  const pB=calcPower(relayReadings.voltages.Vb.mag,relayReadings.currents.Ib.mag,relayReadings.voltages.Vb.ang,relayReadings.currents.Ib.ang);
  const pC=calcPower(relayReadings.voltages.Vc.mag,relayReadings.currents.Ic.mag,relayReadings.voltages.Vc.ang,relayReadings.currents.Ic.ang);
  const pTotal={P:pA.P+pB.P+pC.P,Q:pA.Q+pB.Q+pC.Q,S:pA.S+pB.S+pC.S};pTotal.fp=pTotal.S>0?(pTotal.P/pTotal.S):0;
  const ledLabels=useMemo(()=>{const l={};ledCols.forEach((_,i)=>{const a=allRows.filter(r=>relayMatrix[r]?.[ledCols[i]]);l[i]=a.length>0?a.join(", "):""});return l},[relayMatrix]);
  const ledLitStates=useMemo(()=>{const s={};ledCols.forEach((_,i)=>{const mapped=allRows.filter(r=>relayMatrix[r]?.[ledCols[i]]);const protTrip=mapped.some(r=>trippedStageIds.includes(r));const cbOpenedLit=mapped.includes('CB_Opened')&&bkState!=='closed';const cbClosedLit=mapped.includes('CB_Closed')&&bkState==='closed';s[i]=protTrip||cbOpenedLit||cbClosedLit;});return s;},[relayMatrix,trippedStageIds,bkState]);

  // ── 27 monitor hook ────────────────────────────────────────────────────────
  const{check27IdleCondition}=use27Monitor({relayProt,relayReadings,sys,injecting,trippedStageIds,setTrippedStageIds,setIsTripped,setFaultRecord,setTripHistory,setDiag,setEvts,rtc,rtp});

  // ── Breaker callback ───────────────────────────────────────────────────────
  /**
   * Handle breaker state changes (open/closed) and automatic reclosing logic.
   * Manages 79 function (auto-reclose) sequence: dead time → reclose → reclaim.
   * @param {string} state - Breaker state: "open" or "closed"
   * @param {boolean} spring - Spring loaded status
   * @param {boolean} latch - Trip latch status
   */
  const onBreakerChange=useCallback((state,spring,latch)=>{
    setBkState(prev=>{
      if(prev!==state){
        const icon=state==='closed'?'🔒':'🔓';
        const msg=state==='closed'?'Disjuntor FECHADO — 52a ON':(latch?'Disjuntor ABERTO por TRIP — 52b ON':'Disjuntor ABERTO — 52b ON');
        setEvts(ev=>[{time:nowShort(),icon,text:msg,dt:''},...ev.slice(0,20)]);
        if(state==='open'&&ssRef.current==='running'){
          const im=inMatrixRef.current;
          const mappedBIs=biRows.filter(bi=>im.CB_Opened?.[bi]);
          if(mappedBIs.length>0){
            const t=stimeRef.current;
            clearInterval(tr.current);
            setSs('idle');setSimPhase('idle');setMaletaTripped(true);
            setEvts(ev=>[{time:nowShort(),icon:'🔴',text:`CB_Opened via ${mappedBIs.join(', ')} — abertura confirmada`,dt:`T+${t.toFixed(3)}s`},...ev.slice(0,20)]);
          }
        }
        if(state==='closed'){
          const im=inMatrixRef.current;
          const mappedBIs=biRows.filter(bi=>im.CB_Closed?.[bi]);
          if(mappedBIs.length>0)setEvts(ev=>[{time:nowShort(),icon:'🟢',text:`CB_Closed via ${mappedBIs.join(', ')}`,dt:''},...ev.slice(0,20)]);
        }
        if(state==='open'&&latch){
          const fn79=relayProtRef.current["79"];
          const ar=ar79Ref.current;
          if(fn79?.enabled&&!ar.locked){
            if(ar.shot>=(fn79.shots||3)){
              ar.locked=true;
              setEvts(ev=>[{time:nowShort(),icon:"🔒",text:`79 LOCKOUT após ${ar.shot} religamentos`,dt:''},...ev.slice(0,20)]);
            }else{
              const deadTimes=fn79.deadTimes||[0.5,5.0,15.0];
              const dt=Math.round((deadTimes[ar.shot]??deadTimes[deadTimes.length-1])*1000);
              if(ar.reclaimTimer){clearTimeout(ar.reclaimTimer);ar.reclaimTimer=null}
              if(ar.deadTimer){clearTimeout(ar.deadTimer);ar.deadTimer=null}
              const shotNum=ar.shot+1;
              setEvts(ev=>[{time:nowShort(),icon:"⏱",text:`79 Shot #${shotNum}: dead time ${dt/1000}s — aguardando religamento...`,dt:''},...ev.slice(0,20)]);
              ar.deadTimer=setTimeout(()=>{
                ar.deadTimer=null;ar.shot++;
                setTrippedStageIds([]);setIsTripped(false);setFaultRecord(null);
                setBkCloseCtr(c=>c+1);
                setEvts(ev=>[{time:nowShort(),icon:"🔄",text:`79 Religando... (shot ${ar.shot}/${fn79.shots||3})`,dt:''},...ev.slice(0,20)]);
                const rt=Math.round((fn79.reclaimTime||3.0)*1000);
                ar.reclaimTimer=setTimeout(()=>{
                  ar.reclaimTimer=null;ar.shot=0;ar.locked=false;
                  setEvts(ev=>[{time:nowShort(),icon:"✓",text:`79 Religamento bem-sucedido — contador resetado`,dt:''},...ev.slice(0,20)]);
                },rt);
              },dt);
            }
          }
        }
      }
      return state;
    });
    setBkSpring(spring);setBkTripLatch(latch);
  },[tr,ar79Ref]);

  // ── BO / BI status (derived from trip + breaker + field wiring) ───────────
  // BO ativo = relay tripou (isTripped) E o terminal BO pos está conectado à TC (tb_13/tb_14)
  // BI ativo (52a) = breaker fechado E BI pos conectado a tb_9_top (contato 52a)
  useEffect(()=>{
    const g=relayGraph;
    const tripped=isTripped||maletaTripped;
    const nextBo={bo1:false,bo2:false,bo3:false,bo4:false};
    if(tripped&&g){
      for(let i=1;i<=4;i++){
        const term=`bo${i}_pos`;
        if(g.areConnected(term,'tb_13_top')||g.areConnected(term,'tb_14_top')){
          nextBo[`bo${i}`]=true;
        }
      }
    }
    setBoStatus(nextBo);
    // BI feedback: 52a (tb_9_top). Quando disjuntor fecha, contato 52a fecha; lê quem está cabeado.
    const cbClosed=bkState==='closed';
    const nextBi={bi1:false,bi2:false,bi3:false,bi4:false};
    if(cbClosed&&g){
      for(let i=1;i<=4;i++){
        const term=`bi${i}_pos`;
        if(g.areConnected(term,'tb_9_top')){
          nextBi[`bi${i}`]=true;
        }
      }
    }
    setBiStatus(nextBi);
  },[isTripped,maletaTripped,bkState,relayGraph]);

  // ── Phasor helpers ─────────────────────────────────────────────────────────
  /**
   * Apply balanced three-phase phasors with angular offsets based on sequence.
   * @param {Object} o - Current phasor object
   * @param {string} type - "currents" or "voltages"
   * @param {string} keyA - Reference phase key (Ia/Va)
   * @param {string} field - "mag" or "ang"
   * @param {number} value - New value
   * @param {string} seq - Phase sequence "ABC" or "ACB"
   * @returns {Object} Updated phasor object
   */
  const fillBalanced=(o,type,keyA,field,value,seq)=>{
    const offB=seq==="ABC"?-120:120;const offC=seq==="ABC"?120:-120;
    const keys=type==="currents"?["Ia","Ib","Ic"]:["Va","Vb","Vc"];
    const phA={...o[type][keys[0]],[field]:value};
    return{...o,[type]:{[keys[0]]:{mag:phA.mag,ang:phA.ang},[keys[1]]:{mag:phA.mag,ang:phA.ang+offB},[keys[2]]:{mag:phA.mag,ang:phA.ang+offC}}};
  };
  /**
   * Update injection phasors (fault condition).
   * Applies balanced three-phase or individual phase update.
   * @param {string} t - "currents" or "voltages"
   * @param {string} ph - Phase (Ia/Ib/Ic or Va/Vb/Vc)
   * @param {string} f - Field ("mag" or "ang")
   * @param {number} v - New value
   */
  const uP=(t,ph,f,v)=>{
    const isBal=(t==="currents"&&balI==="balanced")||(t==="voltages"&&balV==="balanced");
    if(isBal){const seq=t==="currents"?seqI:seqV;const keyA=t==="currents"?"Ia":"Va";setP(o=>fillBalanced(o,t,keyA,f,v,seq));return;}
    setP(o=>({...o,[t]:{...o[t],[ph]:{...o[t][ph],[f]:v}}}));
  };
  /**
   * Update pre-fault phasors.
   * Applies balanced three-phase or individual phase update.
   * @param {string} t - "currents" or "voltages"
   * @param {string} ph - Phase (Ia/Ib/Ic or Va/Vb/Vc)
   * @param {string} f - Field ("mag" or "ang")
   * @param {number} v - New value
   */
  const uPf=(t,ph,f,v)=>{
    const isBal=(t==="currents"&&balI==="balanced")||(t==="voltages"&&balV==="balanced");
    if(isBal){const seq=t==="currents"?seqI:seqV;const keyA=t==="currents"?"Ia":"Va";setPf(o=>fillBalanced(o,t,keyA,f,v,seq));return;}
    setPf(o=>({...o,[t]:{...o[t],[ph]:{...o[t][ph],[f]:v}}}));
  };
  /**
   * Rebalance phasors when phase sequence changes.
   * Maintains magnitude from reference phase with new angular offsets.
   * @param {string} type - "currents" or "voltages"
   * @param {string} seq - Phase sequence "ABC" or "ACB"
   * @param {Function} setter - setState function (setP or setPf)
   * @param {Object} src - Source phasor object
   */
  const rebalance=(type,seq,setter,src)=>{
    const keys=type==="currents"?["Ia","Ib","Ic"]:["Va","Vb","Vc"];
    const offB=seq==="ABC"?-120:120;const offC=seq==="ABC"?120:-120;
    const phA=src[type][keys[0]];
    setter(o=>({...o,[type]:{[keys[0]]:{mag:phA.mag,ang:phA.ang},[keys[1]]:{mag:phA.mag,ang:phA.ang+offB},[keys[2]]:{mag:phA.mag,ang:phA.ang+offC}}}));
  };
  const onSeqChangeI=(newSeq)=>{setSeqI(newSeq);if(balI==="balanced"){rebalance("currents",newSeq,setP,p);rebalance("currents",newSeq,setPf,pf)}};
  const onSeqChangeV=(newSeq)=>{setSeqV(newSeq);if(balV==="balanced"){rebalance("voltages",newSeq,setP,p);rebalance("voltages",newSeq,setPf,pf)}};
  const onBalChangeI=(mode)=>{setBalI(mode);if(mode==="balanced"){rebalance("currents",seqI,setP,p);rebalance("currents",seqI,setPf,pf)}};
  const onBalChangeV=(mode)=>{setBalV(mode);if(mode==="balanced"){rebalance("voltages",seqV,setP,p);rebalance("voltages",seqV,setPf,pf)}};
  const uS=(s,f,v)=>setSys(o=>({...o,[s]:{...o[s],[f]:v}}));
  const uPr=(id,f,v)=>setProt(o=>({...o,[id]:{...o[id],[f]:v}}));
  const uSt=(id,idx,f,v)=>{setProt(o=>{const fn={...o[id]};if(id==="27/59"){const k=idx<3?"stages27":"stages59";const ri=idx<3?idx:idx-3;const s=[...fn[k]];s[ri]={...s[ri],[f]:v};return{...o,[id]:{...fn,[k]:s}}}if(id==="81"){const k=idx<3?"stages81u":"stages81o";const ri=idx<3?idx:idx-3;const s=[...fn[k]];s[ri]={...s[ri],[f]:v};return{...o,[id]:{...fn,[k]:s}}}if(id==="32"){const k=idx<2?"stages32r":"stages32f";const ri=idx<2?idx:idx-2;const s=[...fn[k]];s[ri]={...s[ri],[f]:v};return{...o,[id]:{...fn,[k]:s}}}const s=[...fn.stages];s[idx]={...s[idx],[f]:v};return{...o,[id]:{...fn,stages:s}}})};
  const toggleMatrix=(row,col)=>{setOutMatrix(m=>{const n=deepClone(m);n[row][col]=!n[row][col];return n})};
  const toggleInMatrix=(row,col)=>{setInMatrix(m=>{const n=deepClone(m);n[row][col]=!n[row][col];return n})};

  /**
   * Apply test preset to protection functions, output matrix, and input matrix.
   * Enables/disables stages and updates relay matrix mappings per preset config.
   * @param {Object} preset - Preset object with fns, stages, patch, out, inp properties
   */
  const applyTestPreset=useCallback((preset)=>{
    if(!preset||!Array.isArray(preset.fns)||typeof preset.stages!=="object"||preset.stages===null){console.warn("invalid preset",preset);return;}
    const base=deepClone(defaultProtections);
    protOrder.forEach(fid=>{
      base[fid].enabled=preset.fns.includes(fid);
      if(fid==='27/59'){const s=preset.stages['27/59']||{};base[fid].stages27?.forEach((st,i)=>{st.enabled=!!(s.s27?.includes(i));});base[fid].stages59?.forEach((st,i)=>{st.enabled=!!(s.s59?.includes(i));});}
      else if(fid==='81'){const s=preset.stages['81']||{};base[fid].stages81u?.forEach((st,i)=>{st.enabled=!!(s.s81u?.includes(i));});base[fid].stages81o?.forEach((st,i)=>{st.enabled=!!(s.s81o?.includes(i));});}
      else if(fid==='32'){const s=preset.stages['32']||{};base[fid].stages32r?.forEach((st,i)=>{st.enabled=!!(s.s32r?.includes(i));});base[fid].stages32f?.forEach((st,i)=>{st.enabled=!!(s.s32f?.includes(i));});}
      else if(fid!=='79'){const idxs=preset.stages[fid]||[];base[fid].stages?.forEach((st,i)=>{st.enabled=idxs.includes(i);})}
    });
    if(preset.patch){Object.keys(preset.patch).forEach(fid=>{if(!base[fid])return;const p=preset.patch[fid];p.stages?.forEach((s,i)=>{if(base[fid].stages?.[i])Object.assign(base[fid].stages[i],s);});p.stages81u?.forEach((s,i)=>{if(base[fid].stages81u?.[i])Object.assign(base[fid].stages81u[i],s);});p.stages81o?.forEach((s,i)=>{if(base[fid].stages81o?.[i])Object.assign(base[fid].stages81o[i],s);});p.stages27?.forEach((s,i)=>{if(base[fid].stages27?.[i])Object.assign(base[fid].stages27[i],s);});p.stages59?.forEach((s,i)=>{if(base[fid].stages59?.[i])Object.assign(base[fid].stages59[i],s);});p.stages32r?.forEach((s,i)=>{if(base[fid].stages32r?.[i])Object.assign(base[fid].stages32r[i],s);});p.stages32f?.forEach((s,i)=>{if(base[fid].stages32f?.[i])Object.assign(base[fid].stages32f[i],s);});})}
    setProt(base);setRelayProt(deepClone(base));
    const nextOut=buildDefaultMatrix();
    Object.keys(preset.out||{}).forEach(row=>{Object.keys(preset.out[row]).forEach(col=>{if(nextOut[row]&&nextOut[row][col]!==undefined)nextOut[row][col]=preset.out[row][col];})});
    setOutMatrix(nextOut);setRelayMatrix(deepClone(nextOut));
    const nextIn=buildDefaultInMatrix();
    Object.keys(preset.inp||{}).forEach(row=>{Object.keys(preset.inp[row]).forEach(col=>{if(nextIn[row]&&nextIn[row][col]!==undefined)nextIn[row][col]=preset.inp[row][col];})});
    setInMatrix(nextIn);
    const firstFid=preset.fns[0];if(protOrder.includes(firstFid)){setTab(firstFid);setSi(0);}
    if(preset.phasors){setP(deepClone(preset.phasors));}
    setSendFlash(true);setTimeout(()=>setSendFlash(false),1200);
    setEvts(ev=>[{time:nowShort(),icon:'⚡',text:`Preset "${preset.label}" aplicado — configurações enviadas ao relé.`,dt:''},...ev.slice(0,20)]);
  },[]);

  const sendSettings=()=>{setRelayProt(deepClone(prot));setRelayMatrix(deepClone(outMatrix));setSendFlash(true);setTimeout(()=>setSendFlash(false),1200);setEvts(ev=>[{time:nowShort(),icon:"↑",text:"Settings uploaded to relay.",dt:""},...ev.slice(0,20)])};
  const getSettings=()=>{setProt(deepClone(relayProt));setOutMatrix(deepClone(relayMatrix));setGetFlash(true);setTimeout(()=>setGetFlash(false),1200);setEvts(ev=>[{time:nowShort(),icon:"↓",text:"Settings downloaded from relay.",dt:""},...ev.slice(0,20)])};
  /**
   * Reset fault simulation and clear event/diagnostic history.
   */
  const resetFault=()=>{if(tr.current)clearInterval(tr.current);stop79();setSs("idle");setSimPhase("idle");setStime(0);stimeRef.current=0;setDiag([]);setEvts([]);setMaletaTripped(false);setBkResetCtr(c=>c+1)};
  /**
   * Reset tripped stages and fault record.
   * Prevents reset if 27 function is active (low-voltage protection).
   */
  const resetRelay=()=>{
    if(!injecting){const active27=check27IdleCondition();if(active27.length>0){setEvts(ev=>[{time:nowShort(),icon:"⚠",text:`Reset bloqueado: 27 ativa (${active27.map(s=>s.id).join(", ")}). Habilite Low-V Block ou injete tensão.`,dt:""},...ev.slice(0,20)]);return;}}
    setTrippedStageIds([]);setIsTripped(false);setFaultRecord(null);
  };

  // ── LCD display values ─────────────────────────────────────────────────────
  const ci=injecting?relayReadings.currents:{Ia:{mag:0,ang:0},Ib:{mag:0,ang:0},Ic:{mag:0,ang:0}};
  const vi=injecting?relayReadings.voltages:{Va:{mag:0,ang:0},Vb:{mag:0,ang:0},Vc:{mag:0,ang:0}};
  const i0=injecting?i3i0:{mag:0,ang:0};const v0=injecting?v3v0:{mag:0,ang:0};
  const i2lcd=injecting?calcI2(relayReadings.currents):{mag:0,ang:0};
  const freqLcd=sys.freq??60;

  // ── File I/O ───────────────────────────────────────────────────────────────
  /**
   * Record current relay readings and fault state to trip history.
   * Creates a snapshot object with pre-fault, fault, and primary-side values.
   * Limited to 5 most recent snapshots.
   */
  const takeSnapshot=()=>{
    const isInj=ss==="running";
    const z={mag:0,ang:0};const zI={Ia:{...z},Ib:{...z},Ic:{...z}};const zV={Va:{...z},Vb:{...z},Vc:{...z}};
    const nowI=isInj?{Ia:{...relayReadings.currents.Ia},Ib:{...relayReadings.currents.Ib},Ic:{...relayReadings.currents.Ic}}:zI;
    const nowV=isInj?{Va:{...relayReadings.voltages.Va},Vb:{...relayReadings.voltages.Vb},Vc:{...relayReadings.voltages.Vc}}:zV;
    const panelI=isInj?{Ia:{...p.currents.Ia},Ib:{...p.currents.Ib},Ic:{...p.currents.Ic}}:zI;
    const panelV=isInj?{Va:{...p.voltages.Va},Vb:{...p.voltages.Vb},Vc:{...p.voltages.Vc}}:zV;
    const pfActive2=pfEnabled&&pfDuration>0;const inPrefault=isInj&&simPhase==="prefault";
    const record={
      timestamp:fmtTs(),stages:["SNAPSHOT"],tripTime:isInj&&stime>0?stime:null,tripPhase:isInj?"snapshot_inj":"snapshot",
      prefault:{enabled:pfActive2&&inPrefault,duration:(pfActive2&&inPrefault)?pfDuration:0,currents:inPrefault?{Ia:{...pf.currents.Ia},Ib:{...pf.currents.Ib},Ic:{...pf.currents.Ic}}:null,voltages:inPrefault?{Va:{...pf.voltages.Va},Vb:{...pf.voltages.Vb},Vc:{...pf.voltages.Vc}}:null,relayCurrents:inPrefault?{...nowI}:null,relayVoltages:inPrefault?{...nowV}:null},
      fault:{currents:panelI,voltages:panelV,relayCurrents:nowI,relayVoltages:nowV},
      primary:{currents:{Ia:{mag:nowI.Ia.mag*rtc,ang:nowI.Ia.ang},Ib:{mag:nowI.Ib.mag*rtc,ang:nowI.Ib.ang},Ic:{mag:nowI.Ic.mag*rtc,ang:nowI.Ic.ang}},voltages:{Va:{mag:nowV.Va.mag*rtp,ang:nowV.Va.ang},Vb:{mag:nowV.Vb.mag*rtp,ang:nowV.Vb.ang},Vc:{mag:nowV.Vc.mag*rtp,ang:nowV.Vc.ang}}},
      system:{rtc,rtp,priV:sys.tp.priV,secV:sys.tp.secV,priA:sys.tc.priA,secA:sys.tc.secA},
    };
    setTripHistory(prev=>[record,...prev].slice(0,5));
    setEvts(ev=>[{time:nowShort(),icon:"📷",text:`Snapshot: ${isInj?"recording":"idle (zeros)"}`,dt:""},...ev.slice(0,20)]);
  };

  /**
   * Export complete system state as plaintext.
   * Includes system, phasors, protections, matrices, and relay readings.
   * Copies to clipboard or downloads as file if clipboard unavailable.
   */
  const dumpFullState=()=>{
    const L=[];
    L.push("═══ RELAY TESTER PRO — DUMP COMPLETO ═══");L.push(`Timestamp: ${fmtTs()}`);L.push("");
    L.push("── SYSTEM ──");L.push(`TP: ${sys.tp.priV}V / ${sys.tp.secV}V (${sys.tp.priConn}/${sys.tp.secConn}) RTP=${rtp.toFixed(2)}`);L.push(`TC: ${sys.tc.priA}A / ${sys.tc.secA}A RTC=${rtc.toFixed(2)}`);L.push("");
    L.push("── FAULT PHASORS ──");["Ia","Ib","Ic"].forEach(k=>L.push(`  ${k}: ${p.currents[k].mag.toFixed(3)}A ∠${p.currents[k].ang.toFixed(1)}°`));["Va","Vb","Vc"].forEach(k=>L.push(`  ${k}: ${p.voltages[k].mag.toFixed(3)}V ∠${p.voltages[k].ang.toFixed(1)}°`));L.push(`  Balanced: I=${balI} (${seqI}) V=${balV} (${seqV})`);L.push("");
    L.push("── PRE-FAULT ──");L.push(`  Enabled: ${pfEnabled} Duration: ${pfDuration}s`);if(pfEnabled){["Ia","Ib","Ic"].forEach(k=>L.push(`  ${k}: ${pf.currents[k].mag.toFixed(3)}A ∠${pf.currents[k].ang.toFixed(1)}°`));["Va","Vb","Vc"].forEach(k=>L.push(`  ${k}: ${pf.voltages[k].mag.toFixed(3)}V ∠${pf.voltages[k].ang.toFixed(1)}°`))}L.push("");
    L.push("── RELAY PROTECTIONS (active in relay) ──");
    protOrder.forEach(fid=>{const fn=relayProt[fid];if(!fn)return;L.push(`[${fid}] ${fn.name} — ${fn.enabled?"ENABLED":"disabled"}`);if(!fn.enabled)return;if(fn.base)L.push(`  Base: ${fn.base}`);if(fid==="27/59"){L.push(`  StartPhases: ${fn.startPhases||"any"} VoltageSelection: ${fn.voltageSelection||"ph-n"}`);L.push(`  Hysteresis: ${fn.hysteresis||4}% LowVBlock: ${fn.lowVoltageBlockEnabled?"ON":"OFF"} (${fn.voltageBlockPu||0.2}pu)`);(fn.stages27||[]).forEach(s=>L.push(`  ${s.id}: ${s.enabled?"ON":"off"} pickup=${s.pickup}pu timeOp=${s.timeOp}s`));(fn.stages59||[]).forEach(s=>L.push(`  ${s.id}: ${s.enabled?"ON":"off"} pickup=${s.pickup}pu timeOp=${s.timeOp}s`))}else if(fid==="47"){(fn.stages||[]).forEach(s=>L.push(`  ${s.id}: ${s.enabled?"ON":"off"} pickup=${s.pickup}pu timeOp=${s.timeOp}s`))}else if(fid==="67"||fid==="67N"){(fn.stages||[]).forEach(s=>L.push(`  ${s.id}: ${s.enabled?"ON":"off"} pickup=${s.pickup}A TD=${s.timeDial} curve=${s.curve} mta=${s.mta}° pol=${s.pol} dir=${s.dir||"forward"}`))}else{(fn.stages||[]).forEach(s=>L.push(`  ${s.id}: ${s.enabled?"ON":"off"} pickup=${s.pickup}A TD=${s.timeDial} curve=${s.curve} timeOp=${s.timeOp}s`))}});
    L.push("");const protDiff=protOrder.some(fid=>JSON.stringify(prot[fid])!==JSON.stringify(relayProt[fid]));if(protDiff)L.push("⚠ PANEL PROTECTIONS differ from RELAY (not yet sent)");L.push("");
    L.push("── OUTPUT MATRIX ──");let matCount=0;Object.keys(relayMatrix).forEach(row=>{Object.keys(relayMatrix[row]).forEach(col=>{if(relayMatrix[row][col]){L.push(`  ${row} → ${col}`);matCount++}})});if(matCount===0)L.push("  (empty — no mappings)");L.push("");
    L.push("── FIELD CONNECTIONS ──");const conns=fieldState.connections||[];if(conns.length===0)L.push("  (no cables)");else conns.forEach(c=>L.push(`  [${c.id}] ${c.from} ↔ ${c.to}`));L.push("");
    L.push("── SWITCH INTERNAL CONNS ──");const ics=fieldState.internalConns||[];if(ics.length===0)L.push("  (no internal connections — switch open)");else ics.forEach(c=>L.push(`  ${c[0]} ↔ ${c[1]}`));L.push("");
    L.push("── RELAY READINGS (what relay sees now) ──");L.push(`  Injecting: ${injecting} SimPhase: ${simPhase} Status: ${ss}`);const rI=injecting?relayReadings.currents:{Ia:{mag:0,ang:0},Ib:{mag:0,ang:0},Ic:{mag:0,ang:0}};const rV=injecting?relayReadings.voltages:{Va:{mag:0,ang:0},Vb:{mag:0,ang:0},Vc:{mag:0,ang:0}};["Ia","Ib","Ic"].forEach(k=>L.push(`  ${k}: ${rI[k].mag.toFixed(3)}A ∠${rI[k].ang.toFixed(1)}°`));["Va","Vb","Vc"].forEach(k=>L.push(`  ${k}: ${rV[k].mag.toFixed(3)}V ∠${rV[k].ang.toFixed(1)}°`));L.push("");
    L.push("── RELAY STATE ──");L.push(`  Tripped: ${isTripped} MaletaTripped: ${maletaTripped}`);L.push(`  TrippedStages: ${trippedStageIds.length>0?trippedStageIds.join(", "):"(none)"}`);L.push(`  Timer: ${stime.toFixed(3)}s`);L.push("");
    if(diag.length>0){L.push("── DIAGNOSTICS ──");diag.forEach(d=>L.push(`  [${d.label}] ${d.stage} ${d.status} t=${d.time} ${d.obs}`));L.push("")}
    if(evts.length>0){L.push("── EVENTS (recent) ──");evts.slice(0,5).forEach(e=>L.push(`  [${e.time}] ${e.icon} ${e.text} ${e.dt}`))}
    L.push("");L.push("═══ END DUMP ═══");
    const text=L.join("\n");
    navigator.clipboard.writeText(text).then(()=>setEvts(ev=>[{time:nowShort(),icon:"📋",text:"Full state dump copied to clipboard.",dt:""},...ev.slice(0,20)])).catch(()=>{const blob=new Blob([text],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='dump_state.txt';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);setEvts(ev=>[{time:nowShort(),icon:"📋",text:"Full state dump saved to file.",dt:""},...ev.slice(0,20)]);});
  };

  /**
   * Save system configuration to file.
   * Includes system parameters, protections, output matrix, and field wiring.
   * Uses native showSaveFilePicker or fallback download.
   */
  const saveFile=async()=>{
    const content=buildSaveContent(sys,prot,outMatrix,{connections:fieldState.connections||[],switchSt:fieldState.switchSt||{}});
    try{const handle=await window.showSaveFilePicker({suggestedName:'relay_config.txt',types:[{description:'Text File',accept:{'text/plain':['.txt']}}]});const writable=await handle.createWritable();await writable.write(content);await writable.close();setEvts(ev=>[{time:nowShort(),icon:"💾",text:`Configuration saved: ${handle.name}`,dt:""},...ev.slice(0,20)]);}
    catch(err){if(err.name!=='AbortError'){const blob=new Blob([content],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='relay_config.txt';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);setEvts(ev=>[{time:nowShort(),icon:"💾",text:"Configuration saved to file.",dt:""},...ev.slice(0,20)]);}}
  };

  /**
   * Load system configuration from file.
   * Parses saved settings and applies system, protections, matrix, and wiring.
   */
  const loadFile=()=>{
    const input=document.createElement('input');input.type='file';input.accept='.txt';
    input.onchange=(e)=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=(ev)=>{try{const result=parseSaveFile(ev.target.result,prot,outMatrix);setSys(result.sys);setProt(result.prot);setOutMatrix(result.outMatrix);if(result.wiring)setCampoLoadWiring(result.wiring);setEvts(ev2=>[{time:nowShort(),icon:"📂",text:`Configuration loaded: ${file.name}`,dt:""},...ev2.slice(0,20)]);}catch(err){setEvts(ev2=>[{time:nowShort(),icon:"✗",text:`Error loading file: ${err.message}`,dt:""},...ev2.slice(0,20)]);}};reader.readAsText(file);};
    input.click();
  };

  // ── JSX ────────────────────────────────────────────────────────────────────
  return(<><style>{S}</style><div className="app">
    <div className="topbar">
      <div className="tb-l"><div className="tb-ico"><svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg"><rect width="36" height="36" rx="9" fill="#181b22"/><circle cx="18" cy="18" r="13" fill="none" stroke="#f97316" strokeWidth="1.8"/><circle cx="18" cy="18" r="9.5" fill="#0e1015"/><line x1="18" y1="5" x2="18" y2="8" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/><line x1="18" y1="28" x2="18" y2="31" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/><line x1="5" y1="18" x2="8" y2="18" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/><line x1="28" y1="18" x2="31" y2="18" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/><path d="M10 18 Q12.5 13 15 18 Q17.5 23 20 18" fill="none" stroke="#f3f4f6" strokeWidth="1.5" strokeLinecap="round"/><path d="M20 18 L22 14 L24 22 L26 16" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div><div><div className="tb-t">RelayLab <span>360</span></div><div className="tb-s">{t("topbar.subtitle")}</div></div></div>
      <div className="tb-r">
        <div className="nav-pills"><button data-tutorial-target="nav-campo" className={`nav-pill ${page===0?"on":""}`} onClick={()=>setPage(0)}>{t("nav.campo")}</button><button data-tutorial-target="nav-relay" className={`nav-pill ${page===1?"on":""}`} onClick={()=>setPage(1)}>{t("nav.rele")}</button><button data-tutorial-target="nav-panel" className={`nav-pill ${page===2?"on":""}`} onClick={()=>setPage(2)}>{t("nav.painel")}{bkTripLatch&&<span style={{marginLeft:5,display:'inline-block',width:6,height:6,borderRadius:'50%',background:'var(--red)',verticalAlign:'middle',boxShadow:'0 0 6px var(--red)'}}/>}</button><button className={`nav-pill ${page===3?"on":""}`} onClick={()=>setPage(3)}>Testes</button></div>
        {page===0&&<button className={`topbar-toggle ${campoLayoutMode}`} onClick={toggleCampoLayout} title="Toggle layout">{campoLayoutMode==="legacy"?"⚙️ Layout Novo":"⚙️ Layout Clássico"}</button>}
        <div className="tb-status"><div className="tb-dot"/>{t("nav.online")}</div>
        <LanguageSelector/>
        <button className="help-btn" onClick={()=>openHelp("getting-started")} title="Help &amp; Reference">?</button>
      </div>
    </div>
    <div className="slide-vp"><div className="slide-tk" style={{transform:`translateX(-${page*100}%)`}}>
      {/* CAMPO */}
      <div className="slide-pg">{campoLayoutMode==="legacy"?<CampoPage onFieldStateChange={onFieldStateChange} bkStatus={{state:bkState,spring:bkSpring,trip:bkTripLatch}} onBkCommand={onBkFieldCommand} loadWiring={campoLoadWiring}/>:<CampoPageNew onFieldStateChange={onFieldStateChange} bkStatus={{state:bkState,spring:bkSpring,trip:bkTripLatch}} onBkCommand={onBkFieldCommand} loadWiring={campoLoadWiring} boStatus={boStatus} biStatus={biStatus}/>}</div>

      {/* RELÉ */}
      <div className="slide-pg"><RelePage
        p={p} pf={pf} pfMode={pfMode} setPfMode={setPfMode}
        pfEnabled={pfEnabled} setPfEnabled={setPfEnabled}
        pfDuration={pfDuration} setPfDuration={setPfDuration}
        balI={balI} balV={balV} seqI={seqI} seqV={seqV}
        onBalChangeI={onBalChangeI} onBalChangeV={onBalChangeV}
        onSeqChangeI={onSeqChangeI} onSeqChangeV={onSeqChangeV}
        uP={uP} uPf={uPf} sys={sys} setSys={setSys}
        prot={prot} outMatrix={outMatrix} inMatrix={inMatrix}
        tab={tab} setTab={setTab} si={si} setSi={setSi}
        mainTab={mainTab} setMainTab={setMainTab}
        uPr={uPr} uSt={uSt} uS={uS}
        toggleMatrix={toggleMatrix} toggleInMatrix={toggleInMatrix}
        applyTestPreset={applyTestPreset} rtp={rtp} rtc={rtc}
        ss={ss} stime={stime} isTripped={isTripped} maletaTripped={maletaTripped}
        runSim={runSim} stopSim={stopSim} resetFault={resetFault} setFcOpen={setFcOpen}
        ci={ci} vi={vi} i0={i0} v0={v0} i2lcd={i2lcd}
        pTotal={pTotal} pA={pA} pB={pB} pC={pC}
        injecting={injecting} relayProt={relayProt} trippedStageIds={trippedStageIds}
        bkState={bkState} ledLabels={ledLabels} ledLitStates={ledLitStates}
        evts={evts} diag={diag} faultRecord={faultRecord}
        sendFlash={sendFlash} getFlash={getFlash}
        sendSettings={sendSettings} getSettings={getSettings}
        loadFile={loadFile} saveFile={saveFile}
        setWfDisplayOpen={setWfDisplayOpen} setWfModalOpen={setWfModalOpen}
        takeSnapshot={takeSnapshot} dumpFullState={dumpFullState}
        resetRelay={resetRelay}
        setBkOpenCtr={setBkOpenCtr} setBkCloseCtr={setBkCloseCtr}
      /></div>

      {/* PAINEL */}
      <div className="slide-pg"><PainelPage relayTrip={maletaTripped} onBreakerChange={onBreakerChange} resetSignal={bkResetCtr} closeSignal={bkCloseCtr} openSignal={bkOpenCtr} sys={sys} relayReadings={relayReadings} injecting={injecting} phasors={p} tripHistory={tripHistory}/></div>

      {/* TESTES */}
      <div className="slide-pg"><TestsPage prot={prot} relayProt={relayProt} sys={sys} rtc={rtc} rtp={rtp} runSim={runSim} stopSim={stopSim} setP={setP} setPf={setPf} setEvts={setEvts} setPfEnabled={setPfEnabled} setPfDuration={setPfDuration} tripHistory={tripHistory}/></div>
    </div></div>
  </div>
  {wfModalOpen&&<div className="wf-overlay" onClick={()=>{setWfModalOpen(false);setWfSelected(null);}}>
    <div className="wf-modal" onClick={e=>e.stopPropagation()}>
      <div className="wf-title">{t("waveform.title")}</div>
      {tripHistory.length===0?<div className="wf-empty">{t("waveform.noRecords")}</div>:
        tripHistory.map((rec,i)=>(<div key={i} className={`wf-row${wfSelected===i?" selected":""}`} onClick={()=>setWfSelected(i)}>
          <div style={{flex:1}}><div className="wf-ts">{rec.timestamp}</div><div className="wf-stages">{rec.stages.join(", ")}</div></div>
          <div className="wf-time">{rec.tripTime!==null?`${rec.tripTime.toFixed(3)}s`:"PF"}</div>
        </div>))}
      <div className="wf-actions">
        <button className="wf-btn" onClick={()=>{setWfModalOpen(false);setWfSelected(null);}}>{t("waveform.close")}</button>
        <button className={`wf-btn primary${wfSelected===null?" disabled":""}`} style={wfSelected===null?{opacity:.4,pointerEvents:'none'}:{}} onClick={async()=>{
          if(wfSelected===null)return;const rec=tripHistory[wfSelected];if(!rec)return;
          try{
            const files=generateComtrade(rec);const ts=rec.timestamp.replace(/[:/\.]/g,'-');
            const baseName=`Workshop_Protecao_360_${ts}`;
            const zip=new JSZip();zip.file(`${baseName}.cfg`,files.cfg);zip.file(`${baseName}.dat`,files.dat);zip.file(`${baseName}.hdr`,files.hdr);
            const blob=await zip.generateAsync({type:'blob'});
            const handle=await window.showSaveFilePicker({suggestedName:`${baseName}.zip`,types:[{description:'ZIP Archive',accept:{'application/zip':['.zip']}}]});
            const wr=await handle.createWritable();await wr.write(blob);await wr.close();
            setEvts(ev=>[{time:nowShort(),icon:"∿",text:`Waveform saved: ${handle.name}`,dt:""},...ev.slice(0,20)]);
            setWfModalOpen(false);setWfSelected(null);
          }catch(err){if(err.name!=='AbortError')setEvts(ev=>[{time:nowShort(),icon:"✗",text:`Error: ${err.message}`,dt:""},...ev.slice(0,20)]);}
        }}>{t("waveform.download")}</button>
      </div>
    </div>
  </div>}
  {phasorDiagOpen&&<PhasorDiagram onClose={()=>setPhasorDiagOpen(false)} p={p} pf={pf} pfMode={pfMode} setPfMode={setPfMode} phasorVis={phasorVis} setPhasorVis={setPhasorVis} balI={balI} balV={balV} seqI={seqI} seqV={seqV} uP={uP} uPf={uPf} onBalChangeI={onBalChangeI} onBalChangeV={onBalChangeV} onSeqChangeI={onSeqChangeI} onSeqChangeV={onSeqChangeV}/>}
  {fcOpen&&<FaultCalculator sys={sys} onApply={(fp,pp)=>{setP(fp);if(pp){setPfEnabled(true);setPf(pp)}setFcOpen(false);setEvts(ev=>[{time:nowShort(),icon:"⚡",text:"Fasores de falta aplicados pelo Calculador.",dt:""},...ev.slice(0,20)]);}} onClose={()=>setFcOpen(false)}/>}
  {wfDisplayOpen&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:1500,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setWfDisplayOpen(false)}><div style={{background:'var(--card)',borderRadius:16,width:'90vw',maxWidth:1000,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid var(--bdr)',boxShadow:'0 24px 80px rgba(0,0,0,.6)'}} onClick={e=>e.stopPropagation()}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid var(--bdr)',flexShrink:0}}><div style={{fontSize:14,fontWeight:800,color:'var(--tx)',fontFamily:'var(--fh)',letterSpacing:1,textTransform:'uppercase'}}>Live Waveform</div><button onClick={()=>setWfDisplayOpen(false)} style={{background:'transparent',border:'1px solid var(--bdr)',color:'var(--tx3)',width:30,height:30,borderRadius:8,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'}} onMouseEnter={e=>{e.currentTarget.style.background='var(--red-dim)';e.currentTarget.style.borderColor='rgba(248,113,113,.3)';e.currentTarget.style.color='var(--red)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='var(--bdr)';e.currentTarget.style.color='var(--tx3)'}}>✕</button></div><div style={{flex:1,minHeight:0,overflow:'hidden',padding:'8px'}}><WaveformDisplay phasors={p} isInjecting={injecting} injectionTime={stime} tripHistory={tripHistory} freq={sys.freq??60}/></div></div></div>}
  <HelpModal/>
  <Tutorial show={tutorialOpen} onDismiss={closeTutorial}/>
  </>);
}

export default function App(){
  return(<LanguageProvider><HelpProvider><AppInner/></HelpProvider></LanguageProvider>);
}
