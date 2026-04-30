import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import CampoPage, { buildElectricalGraph, computeRelayReadings } from "./CampoPage.jsx";
import PainelPage from "./PainelPage.jsx";
import { generateComtrade } from "./comtrade.js";
import JSZip from "jszip";
import { deepClone, defaultPhasors, defaultSystem, defaultProtections, protOrder, biRows, allRows, boCols, ledCols, buildDefaultMatrix, buildDefaultInMatrix, mainTabs, TEST_PRESETS, fmtTs, nowShort } from "./defaults.js";
import { calc3, calcPower, calcI2 } from "./protection.js";
import { buildSaveContent, parseSaveFile } from "./fileIO.js";
import { S } from "./appStyles.js";
import { Tgl, IB } from "./widgets.jsx";
import FaultCalculator from "./FaultCalculator.jsx";
import PhasorDiagram from "./PhasorDiagram.jsx";
import RelayDisplay from "./RelayDisplay.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
import use27Monitor from "./use27Monitor.js";
import useSimulation from "./useSimulation.js";

export default function App(){
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
  const[ss,setSs]=useState("idle");const[stime,setStime]=useState(0);const[rp,setRp]=useState(0);
  const[trippedStageIds,setTrippedStageIds]=useState([]);const[diag,setDiag]=useState([]);const[evts,setEvts]=useState([]);
  const[isTripped,setIsTripped]=useState(false);const[maletaTripped,setMaletaTripped]=useState(false);const[faultRecord,setFaultRecord]=useState(null);
  const[sendFlash,setSendFlash]=useState(false);const[getFlash,setGetFlash]=useState(false);
  const[tripHistory,setTripHistory]=useState([]);
  const[bkResetCtr,setBkResetCtr]=useState(0);const[bkCloseCtr,setBkCloseCtr]=useState(0);const[bkOpenCtr,setBkOpenCtr]=useState(0);
  const onBkFieldCommand=useCallback((cmd)=>{if(cmd==='close')setBkCloseCtr(c=>c+1);},[]);
  const[campoLoadWiring,setCampoLoadWiring]=useState(null);
  const[wfModalOpen,setWfModalOpen]=useState(false);const[wfSelected,setWfSelected]=useState(null);
  const[phasorDiagOpen,setPhasorDiagOpen]=useState(false);
  const[fcOpen,setFcOpen]=useState(false);
  const[phasorVis,setPhasorVis]=useState({Ia:true,Ib:true,Ic:true,Va:true,Vb:true,Vc:true,Vab:false,Vbc:false,Vca:false,I0:false,I1:false,I2:false,V0:false,V1:false,V2:false});
  const[simPhase,setSimPhase]=useState("idle");
  const[fieldState,setFieldState]=useState({connections:[],internalConns:[]});
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
  const relayGraph=useMemo(()=>buildElectricalGraph(fieldState.connections,fieldState.internalConns),[fieldState]);
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

  // ── Phasor helpers ─────────────────────────────────────────────────────────
  const fillBalanced=(o,type,keyA,field,value,seq)=>{
    const offB=seq==="ABC"?-120:120;const offC=seq==="ABC"?120:-120;
    const keys=type==="currents"?["Ia","Ib","Ic"]:["Va","Vb","Vc"];
    const phA={...o[type][keys[0]],[field]:value};
    return{...o,[type]:{[keys[0]]:{mag:phA.mag,ang:phA.ang},[keys[1]]:{mag:phA.mag,ang:phA.ang+offB},[keys[2]]:{mag:phA.mag,ang:phA.ang+offC}}};
  };
  const uP=(t,ph,f,v)=>{
    const isBal=(t==="currents"&&balI==="balanced")||(t==="voltages"&&balV==="balanced");
    if(isBal){const seq=t==="currents"?seqI:seqV;const keyA=t==="currents"?"Ia":"Va";setP(o=>fillBalanced(o,t,keyA,f,v,seq));return;}
    setP(o=>({...o,[t]:{...o[t],[ph]:{...o[t][ph],[f]:v}}}));
  };
  const uPf=(t,ph,f,v)=>{
    const isBal=(t==="currents"&&balI==="balanced")||(t==="voltages"&&balV==="balanced");
    if(isBal){const seq=t==="currents"?seqI:seqV;const keyA=t==="currents"?"Ia":"Va";setPf(o=>fillBalanced(o,t,keyA,f,v,seq));return;}
    setPf(o=>({...o,[t]:{...o[t],[ph]:{...o[t][ph],[f]:v}}}));
  };
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

  const applyTestPreset=useCallback((preset)=>{
    const base=deepClone(defaultProtections);
    protOrder.forEach(fid=>{
      base[fid].enabled=preset.fns.includes(fid);
      if(fid==='27/59'){const s=preset.stages['27/59']||{};base[fid].stages27?.forEach((st,i)=>{st.enabled=!!(s.s27?.includes(i));});base[fid].stages59?.forEach((st,i)=>{st.enabled=!!(s.s59?.includes(i));});}
      else if(fid==='81'){const s=preset.stages['81']||{};base[fid].stages81u?.forEach((st,i)=>{st.enabled=!!(s.s81u?.includes(i));});base[fid].stages81o?.forEach((st,i)=>{st.enabled=!!(s.s81o?.includes(i));});}
      else if(fid==='32'){const s=preset.stages['32']||{};base[fid].stages32r?.forEach((st,i)=>{st.enabled=!!(s.s32r?.includes(i));});base[fid].stages32f?.forEach((st,i)=>{st.enabled=!!(s.s32f?.includes(i));});}
      else if(fid!=='79'){const idxs=preset.stages[fid]||[];base[fid].stages?.forEach((st,i)=>{st.enabled=idxs.includes(i);})}
    });
    if(preset.patch){Object.keys(preset.patch).forEach(fid=>{if(!base[fid])return;const p=preset.patch[fid];p.stages?.forEach((s,i)=>{if(base[fid].stages?.[i])Object.assign(base[fid].stages[i],s);});})}
    setProt(base);setRelayProt(deepClone(base));
    const nextOut=buildDefaultMatrix();
    Object.keys(preset.out||{}).forEach(row=>{Object.keys(preset.out[row]).forEach(col=>{if(nextOut[row]&&nextOut[row][col]!==undefined)nextOut[row][col]=preset.out[row][col];})});
    setOutMatrix(nextOut);setRelayMatrix(deepClone(nextOut));
    const nextIn=buildDefaultInMatrix();
    Object.keys(preset.inp||{}).forEach(row=>{Object.keys(preset.inp[row]).forEach(col=>{if(nextIn[row]&&nextIn[row][col]!==undefined)nextIn[row][col]=preset.inp[row][col];})});
    setInMatrix(nextIn);
    const firstFid=preset.fns[0];if(protOrder.includes(firstFid)){setTab(firstFid);setSi(0);}
    setSendFlash(true);setTimeout(()=>setSendFlash(false),1200);
    setEvts(ev=>[{time:nowShort(),icon:'⚡',text:`Preset "${preset.label}" aplicado — configurações enviadas ao relé.`,dt:''},...ev.slice(0,20)]);
  },[]);

  const sendSettings=()=>{setRelayProt(deepClone(prot));setRelayMatrix(deepClone(outMatrix));setSendFlash(true);setTimeout(()=>setSendFlash(false),1200);setEvts(ev=>[{time:nowShort(),icon:"↑",text:"Settings uploaded to relay.",dt:""},...ev.slice(0,20)])};
  const getSettings=()=>{setProt(deepClone(relayProt));setOutMatrix(deepClone(relayMatrix));setGetFlash(true);setTimeout(()=>setGetFlash(false),1200);setEvts(ev=>[{time:nowShort(),icon:"↓",text:"Settings downloaded from relay.",dt:""},...ev.slice(0,20)])};
  const resetFault=()=>{if(tr.current)clearInterval(tr.current);stop79();setSs("idle");setSimPhase("idle");setStime(0);stimeRef.current=0;setDiag([]);setEvts([]);setMaletaTripped(false);setBkResetCtr(c=>c+1)};
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

  const saveFile=async()=>{
    const content=buildSaveContent(sys,prot,outMatrix,{connections:fieldState.connections||[],switchSt:fieldState.switchSt||{}});
    try{const handle=await window.showSaveFilePicker({suggestedName:'relay_config.txt',types:[{description:'Text File',accept:{'text/plain':['.txt']}}]});const writable=await handle.createWritable();await writable.write(content);await writable.close();setEvts(ev=>[{time:nowShort(),icon:"💾",text:`Configuration saved: ${handle.name}`,dt:""},...ev.slice(0,20)]);}
    catch(err){if(err.name!=='AbortError'){const blob=new Blob([content],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='relay_config.txt';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);setEvts(ev=>[{time:nowShort(),icon:"💾",text:"Configuration saved to file.",dt:""},...ev.slice(0,20)]);}}
  };

  const loadFile=()=>{
    const input=document.createElement('input');input.type='file';input.accept='.txt';
    input.onchange=(e)=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=(ev)=>{try{const result=parseSaveFile(ev.target.result,prot,outMatrix);setSys(result.sys);setProt(result.prot);setOutMatrix(result.outMatrix);if(result.wiring)setCampoLoadWiring(result.wiring);setEvts(ev2=>[{time:nowShort(),icon:"📂",text:`Configuration loaded: ${file.name}`,dt:""},...ev2.slice(0,20)]);}catch(err){setEvts(ev2=>[{time:nowShort(),icon:"✗",text:`Error loading file: ${err.message}`,dt:""},...ev2.slice(0,20)]);}};reader.readAsText(file);};
    input.click();
  };

  // ── JSX ────────────────────────────────────────────────────────────────────
  return(<><style>{S}</style><div className="app">
    <div className="topbar">
      <div className="tb-l"><div className="tb-ico"><svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg"><rect width="36" height="36" rx="9" fill="#181b22"/><circle cx="18" cy="18" r="13" fill="none" stroke="#f97316" strokeWidth="1.8"/><circle cx="18" cy="18" r="9.5" fill="#0e1015"/><line x1="18" y1="5" x2="18" y2="8" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/><line x1="18" y1="28" x2="18" y2="31" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/><line x1="5" y1="18" x2="8" y2="18" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/><line x1="28" y1="18" x2="31" y2="18" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/><path d="M10 18 Q12.5 13 15 18 Q17.5 23 20 18" fill="none" stroke="#f3f4f6" strokeWidth="1.5" strokeLinecap="round"/><path d="M20 18 L22 14 L24 22 L26 16" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div><div><div className="tb-t">RelayLab <span>360</span></div><div className="tb-s">INTEGRAL PROTECTION ENGINEERING PLATFORM</div></div></div>
      <div className="tb-r">
        <div className="nav-pills"><button className={`nav-pill ${page===0?"on":""}`} onClick={()=>setPage(0)}>Campo</button><button className={`nav-pill ${page===1?"on":""}`} onClick={()=>setPage(1)}>Relé</button><button className={`nav-pill ${page===2?"on":""}`} onClick={()=>setPage(2)}>Painel{bkTripLatch&&<span style={{marginLeft:5,display:'inline-block',width:6,height:6,borderRadius:'50%',background:'var(--red)',verticalAlign:'middle',boxShadow:'0 0 6px var(--red)'}}/>}</button></div>
        <div className="tb-status"><div className="tb-dot"/>Online</div>
      </div>
    </div>
    <div className="slide-vp"><div className="slide-tk" style={{transform:`translateX(-${page*100}%)`}}>
      {/* CAMPO */}
      <div className="slide-pg"><CampoPage onFieldStateChange={onFieldStateChange} bkStatus={{state:bkState,spring:bkSpring,trip:bkTripLatch}} onBkCommand={onBkFieldCommand} loadWiring={campoLoadWiring}/></div>

      {/* RELÉ */}
      <div className="slide-pg"><div className="relay-pg"><div className="main">
        <div className="col">
          <div style={{display:"flex",gap:0,background:"var(--card2)",borderRadius:10,padding:3,marginBottom:4}}>
            <button className={`nav-pill ${pfMode==="prefault"?"on":""}`} style={{flex:1,fontSize:11}} onClick={()=>setPfMode("prefault")}>Pre-Fault</button>
            <button className={`nav-pill ${pfMode==="fault"?"on":""}`} style={{flex:1,fontSize:11}} onClick={()=>setPfMode("fault")}>Fault</button>
          </div>
          {pfMode==="prefault"&&<div className="card" style={{marginBottom:4}}><div className="cp" style={{padding:"8px 14px",display:"flex",flexDirection:"column",gap:6}}>
            <Tgl value={pfEnabled} onChange={v=>setPfEnabled(v)} label={pfEnabled?"Pre-Fault Enabled":"Pre-Fault Disabled"}/>
            {pfEnabled&&<div className="fg"><div className="fl">Pre-Fault Duration (s)</div><IB unit="s" value={pfDuration} onChange={v=>setPfDuration(v)} step="0.1"/></div>}
          </div></div>}
          <div className="card"><div className="ph"><div className="bar bar-warm"/><span className="ph-t">{pfMode==="prefault"?"PF Current":"Current Injection"}</span></div><div className="cp">
            <div style={{display:"flex",gap:4,marginBottom:4}}>
              <button className="nav-pill" style={{flex:1,fontSize:9,padding:"3px 0",background:balI==="manual"?"var(--warm)":"transparent",color:balI==="manual"?"#0e1015":"var(--tx3)"}} onClick={()=>onBalChangeI("manual")}>Manual</button>
              <button className="nav-pill" style={{flex:1,fontSize:9,padding:"3px 0",background:balI==="balanced"?"var(--warm)":"transparent",color:balI==="balanced"?"#0e1015":"var(--tx3)"}} onClick={()=>onBalChangeI("balanced")}>3φ Equil.</button>
              {balI==="balanced"&&<select className="sl" style={{width:70,fontSize:9,padding:"2px 4px"}} value={seqI} onChange={e=>onSeqChangeI(e.target.value)}><option value="ABC">ABC</option><option value="ACB">ACB</option></select>}
            </div>
            {balI==="balanced"?<div>
              <div className="fl" style={{marginBottom:2}}>Ia (ref.)</div>
              <div className="fr"><div className="fg"><div className="fl">Mag</div><IB unit="A" value={pfMode==="prefault"?pf.currents.Ia.mag:p.currents.Ia.mag} onChange={v=>pfMode==="prefault"?uPf("currents","Ia","mag",v):uP("currents","Ia","mag",v)}/></div><div className="fg"><div className="fl">Ang</div><IB unit="°" value={pfMode==="prefault"?pf.currents.Ia.ang:p.currents.Ia.ang} onChange={v=>pfMode==="prefault"?uPf("currents","Ia","ang",v):uP("currents","Ia","ang",v)} step="1" warm/></div></div>
              <div style={{fontSize:9,color:"var(--tx3)",marginTop:4,letterSpacing:.5}}>Ib: {(pfMode==="prefault"?pf:p).currents.Ib.mag.toFixed(2)}A ∠{(pfMode==="prefault"?pf:p).currents.Ib.ang.toFixed(1)}° · Ic: {(pfMode==="prefault"?pf:p).currents.Ic.mag.toFixed(2)}A ∠{(pfMode==="prefault"?pf:p).currents.Ic.ang.toFixed(1)}°</div>
            </div>:["Ia","Ib","Ic"].map(ph=><div key={ph}><div className="fl" style={{marginBottom:2}}>{ph}</div><div className="fr"><div className="fg"><div className="fl">Mag</div><IB unit="A" value={pfMode==="prefault"?pf.currents[ph].mag:p.currents[ph].mag} onChange={v=>pfMode==="prefault"?uPf("currents",ph,"mag",v):uP("currents",ph,"mag",v)}/></div><div className="fg"><div className="fl">Ang</div><IB unit="°" value={pfMode==="prefault"?pf.currents[ph].ang:p.currents[ph].ang} onChange={v=>pfMode==="prefault"?uPf("currents",ph,"ang",v):uP("currents",ph,"ang",v)} step="1" warm/></div></div></div>)}
          </div></div>
          <div className="card"><div className="ph"><div className="bar bar-lav"/><span className="ph-t">{pfMode==="prefault"?"PF Voltage":"Voltage Injection"}</span></div><div className="cp">
            <div style={{display:"flex",gap:4,marginBottom:4}}>
              <button className="nav-pill" style={{flex:1,fontSize:9,padding:"3px 0",background:balV==="manual"?"var(--lav)":"transparent",color:balV==="manual"?"#0e1015":"var(--tx3)"}} onClick={()=>onBalChangeV("manual")}>Manual</button>
              <button className="nav-pill" style={{flex:1,fontSize:9,padding:"3px 0",background:balV==="balanced"?"var(--lav)":"transparent",color:balV==="balanced"?"#0e1015":"var(--tx3)"}} onClick={()=>onBalChangeV("balanced")}>3φ Equil.</button>
              {balV==="balanced"&&<select className="sl" style={{width:70,fontSize:9,padding:"2px 4px"}} value={seqV} onChange={e=>onSeqChangeV(e.target.value)}><option value="ABC">ABC</option><option value="ACB">ACB</option></select>}
            </div>
            {balV==="balanced"?<div>
              <div className="fl" style={{marginBottom:2}}>Va (ref.)</div>
              <div className="fr"><div className="fg"><div className="fl">Mag</div><IB unit="V" value={pfMode==="prefault"?pf.voltages.Va.mag:p.voltages.Va.mag} onChange={v=>pfMode==="prefault"?uPf("voltages","Va","mag",v):uP("voltages","Va","mag",v)}/></div><div className="fg"><div className="fl">Ang</div><IB unit="°" value={pfMode==="prefault"?pf.voltages.Va.ang:p.voltages.Va.ang} onChange={v=>pfMode==="prefault"?uPf("voltages","Va","ang",v):uP("voltages","Va","ang",v)} step="1" warm/></div></div>
              <div style={{fontSize:9,color:"var(--tx3)",marginTop:4,letterSpacing:.5}}>Vb: {(pfMode==="prefault"?pf:p).voltages.Vb.mag.toFixed(2)}V ∠{(pfMode==="prefault"?pf:p).voltages.Vb.ang.toFixed(1)}° · Vc: {(pfMode==="prefault"?pf:p).voltages.Vc.mag.toFixed(2)}V ∠{(pfMode==="prefault"?pf:p).voltages.Vc.ang.toFixed(1)}°</div>
            </div>:["Va","Vb","Vc"].map(ph=><div key={ph}><div className="fl" style={{marginBottom:2}}>{ph}</div><div className="fr"><div className="fg"><div className="fl">Mag</div><IB unit="V" value={pfMode==="prefault"?pf.voltages[ph].mag:p.voltages[ph].mag} onChange={v=>pfMode==="prefault"?uPf("voltages",ph,"mag",v):uP("voltages",ph,"mag",v)}/></div><div className="fg"><div className="fl">Ang</div><IB unit="°" value={pfMode==="prefault"?pf.voltages[ph].ang:p.voltages[ph].ang} onChange={v=>pfMode==="prefault"?uPf("voltages",ph,"ang",v):uP("voltages",ph,"ang",v)} step="1" warm/></div></div></div>)}
          </div></div>
          <div className="card"><div className="ph" style={{padding:"6px 14px"}}><div className="bar bar-sky"/><span className="ph-t" style={{fontSize:11}}>Frequency</span></div><div className="cp" style={{padding:"8px 14px"}}><div className="fr"><div className="fg"><div className="fl">f (Hz)</div><IB unit="Hz" value={sys.freq??60} onChange={v=>setSys(o=>({...o,freq:v}))} step="0.1"/></div><div className="fg"><div className="fl">Nominal</div><div className="conn-r"><button className={`conn-b ${(sys.freq??60)===60?"on":""}`} onClick={()=>setSys(o=>({...o,freq:60}))}>60 Hz</button><button className={`conn-b ${(sys.freq??60)===50?"on":""}`} onClick={()=>setSys(o=>({...o,freq:50}))}>50 Hz</button></div></div></div></div></div>
          <button className="pd-open-btn" onClick={()=>setPhasorDiagOpen(true)}>◎ Phasor Diagram</button>
        </div>
        <div className="ccol">
          <div className="card ccol-top">
            <div className="main-tabs">{mainTabs.map(t=><button key={t.id} className={`mt ${mainTab===t.id?"on":""}`} onClick={()=>setMainTab(t.id)}>{t.label}</button>)}</div>
            <SettingsPanel prot={prot} outMatrix={outMatrix} inMatrix={inMatrix} sys={sys} tab={tab} si={si} mainTab={mainTab} uPr={uPr} uSt={uSt} uS={uS} setSi={setSi} setTab={setTab} toggleMatrix={toggleMatrix} toggleInMatrix={toggleInMatrix} applyTestPreset={applyTestPreset} rtp={rtp} rtc={rtc}/>
          </div>
          <div className="ccol-mid">
            <div className="card"><div className="ph"><div className="bar bar-green"/><span className="ph-t">Controls</span></div><div className="cp" style={{display:"flex",flexDirection:"column",gap:8}}>
              <div className="ctrl-r"><button className="ctrl-big" onClick={runSim} disabled={isTripped} title={isTripped?"Reset relay before injecting":""}><div className="ctrl-ico ci-p">▶</div><span className="ctrl-lbl">Inject</span></button><button className="ctrl-big" onClick={stopSim}><div className="ctrl-ico ci-s">■</div><span className="ctrl-lbl">Stop</span></button></div>
              <button className="ctrl-sec" onClick={resetFault}>↺ Reset Fault</button>
              <button className="ctrl-sec" style={{background:"var(--lav)",color:"#1a1a2e",border:"none",fontWeight:700}} onClick={()=>setFcOpen(true)}>⚡ Calculador de Falta</button>
            </div></div>
            <div className="card"><div className="ph"><div className="bar bar-rose"/><span className="ph-t">Status & Results</span></div><div className="cp">
              <div className="st-hd"><div className="st-tt">Simulation</div><div className={`st-pill ${maletaTripped?"sp-trip":ss==="running"?"sp-run":"sp-idle"}`}>{maletaTripped?"Tripped":ss==="running"?"Running":"Stopped"}</div></div>
              <div className="tmr"><div className="tmr-l">Trip Timer (sec)</div><div className="tmr-v">{stime.toFixed(3)}</div></div>
              <div className="st-hd" style={{marginTop:6,paddingTop:6,borderTop:'1px solid var(--bdr)'}}><div className="st-tt">Breaker BAY-01</div><div className={`st-pill ${bkState==='closed'?'sp-run':bkTripLatch?'sp-trip':'sp-idle'}`}>{bkState==='closed'?'52a ON / FECHADO':bkTripLatch?'52b ON / TRIP':'52b ON / ABERTO'}</div></div>
              <div className="tmr" style={{opacity:.7}}><div className="tmr-l">Mola</div><div className="tmr-v" style={{fontSize:12,color:bkSpring?'var(--amber)':'var(--tx3)'}}>{bkSpring?'Carregada':'Carregando...'}</div></div>
            </div></div>
          </div>
          <div className="ccol-bot">
            <div className="card"><div className="ph"><div className="bar bar-warm"/><span className="ph-t">Event Recorder</span></div><div className="cp"><div className="ev-box">{evts.length===0?<div style={{textAlign:"center",color:"var(--tx3)",padding:14,fontSize:10}}>No events recorded</div>:evts.map((e,i)=><div key={i} className="ev-e"><span className="ev-t">[{e.time}]</span><span className="ev-i">{e.icon}</span><span className="ev-x">{e.text}</span><span className="ev-d">{e.dt}</span></div>)}</div></div></div>
            <div className="card"><div className="ph"><div className="bar bar-warm"/><span className="ph-t">Diagnostics</span></div><div className="cp"><div className="dg-box"><table className="dt"><thead><tr><th>Func</th><th>Status</th><th>Stage</th><th>Time</th><th>Notes</th></tr></thead><tbody>{diag.length===0?<tr><td colSpan={5} style={{textAlign:"center",color:"var(--tx3)",padding:14}}>No simulation</td></tr>:diag.map((d,i)=><tr key={i}><td style={{fontWeight:700,color:"var(--tx)"}}>{d.label}</td><td><span className={`badge b-${d.status}`}>{d.status.toUpperCase()}</span></td><td>{d.stage}</td><td style={{fontFamily:"var(--fm)"}}>{d.time}{d.time!=="-"?"s":""}</td><td style={{fontSize:8}}>{d.obs}</td></tr>)}</tbody></table></div></div></div>
          </div>
        </div>
        <div className="rcol">
          <div className="card" style={{flex:1,display:"flex",flexDirection:"column"}}>
            <div className="ph"><div className="bar bar-orange"/><span className="ph-t">ReGrid Pro 1000</span></div>
            <div className="relay-wrap"><div className={`relay-shell${isTripped?" tripped":""}`}>
              <div className="relay-strip"/>
              <div className="relay-in">
                <div className="relay-header">
                  <div className="relay-id"><div className="rbn">ReGrid Pro 1000</div><div className="rbm">IED MULTIFUNÇÃO · BAY 1</div></div>
                  <div className="relay-pwr"><div className="rpw-led"/><span className="rpw-lbl">PWR</span></div>
                </div>
              </div>
              <div className={`relay-st ${isTripped?"rs-trip":"rs-ok"}`}>
                <span>{isTripped?"⚠ TRIP ATUADO":"● SISTEMA OK"}</span>
                {isTripped&&trippedStageIds.length>0&&<span style={{fontSize:7,opacity:.7,fontFamily:"var(--fm)"}}>{trippedStageIds[0]}</span>}
              </div>
              <RelayDisplay ci={ci} vi={vi} i0={i0} v0={v0} i2lcd={i2lcd} rtc={rtc} rtp={rtp} Inom={Inom} freqLcd={freqLcd} pTotal={pTotal} pA={pA} pB={pB} pC={pC} injecting={injecting} rp={rp} setRp={setRp} relayProt={relayProt} trippedStageIds={trippedStageIds} bkState={bkState} ledLabels={ledLabels} ledLitStates={ledLitStates} evts={evts} faultRecord={faultRecord} relayTab={relayTab} setRelayTab={setRelayTab} mensTab={mensTab} setMensTab={setMensTab} sys={sys}/>
              <div className="relay-bot">
                <button className="rbt rr" onClick={resetRelay}>RESET</button>
                <button className="rbt r0" onClick={()=>setBkOpenCtr(c=>c+1)}>0</button>
                <button className="rbt rii" onClick={()=>setBkCloseCtr(c=>c+1)}>I</button>
              </div>
              <div className="rfo"><div className="rfb">RELAYLAB 360 · INTEGRAL PROTECTION ENGINEERING PLATFORM</div></div>
            </div></div>
            <div className="relay-actions">
              <button className={`ra-btn ${sendFlash?"flash-g":""}`} onClick={sendSettings}><div className="ra-ico send">↑</div><span className="ra-lbl">Send<br/>Settings</span></button>
              <button className={`ra-btn ${getFlash?"flash-b":""}`} onClick={getSettings}><div className="ra-ico get">↓</div><span className="ra-lbl">Get<br/>Settings</span></button>
              <button className="ra-btn" onClick={()=>setWfModalOpen(true)}><div className="ra-ico wave">∿</div><span className="ra-lbl">Get<br/>Waveform</span></button>
            </div>
            <div className="relay-actions">
              <button className="ra-btn" onClick={loadFile}><div className="ra-ico get" style={{background:'var(--warm-dim)',color:'var(--warm)',borderColor:'rgba(253,230,138,.2)'}}>📂</div><span className="ra-lbl">Open<br/>File</span></button>
              <button className="ra-btn" onClick={saveFile}><div className="ra-ico send" style={{background:'var(--lav)',color:'#1a1a2e',borderColor:'rgba(196,181,253,.3)'}}>💾</div><span className="ra-lbl">Save<br/>File</span></button>
              <button className="ra-btn" onClick={takeSnapshot}><div className="ra-ico wave" style={{background:'var(--sky-dim)',color:'var(--sky)',borderColor:'rgba(125,211,252,.2)'}}>📷</div><span className="ra-lbl">Snapshot</span></button>
              <button className="ra-btn" onClick={dumpFullState}><div className="ra-ico wave" style={{background:'rgba(255,255,255,.08)',color:'var(--tx3)',borderColor:'rgba(255,255,255,.1)'}}>📋</div><span className="ra-lbl">Dump<br/>State</span></button>
            </div>
          </div>
        </div>
      </div></div></div>

      {/* PAINEL */}
      <div className="slide-pg"><PainelPage relayTrip={maletaTripped} onBreakerChange={onBreakerChange} resetSignal={bkResetCtr} closeSignal={bkCloseCtr} openSignal={bkOpenCtr} sys={sys} relayReadings={relayReadings} injecting={injecting}/></div>
    </div></div>
  </div>
  {wfModalOpen&&<div className="wf-overlay" onClick={()=>{setWfModalOpen(false);setWfSelected(null);}}>
    <div className="wf-modal" onClick={e=>e.stopPropagation()}>
      <div className="wf-title">FAULT RECORDS</div>
      {tripHistory.length===0?<div className="wf-empty">No trip records available.</div>:
        tripHistory.map((rec,i)=>(<div key={i} className={`wf-row${wfSelected===i?" selected":""}`} onClick={()=>setWfSelected(i)}>
          <div style={{flex:1}}><div className="wf-ts">{rec.timestamp}</div><div className="wf-stages">{rec.stages.join(", ")}</div></div>
          <div className="wf-time">{rec.tripTime!==null?`${rec.tripTime.toFixed(3)}s`:"PF"}</div>
        </div>))}
      <div className="wf-actions">
        <button className="wf-btn" onClick={()=>{setWfModalOpen(false);setWfSelected(null);}}>Close</button>
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
        }}>Download</button>
      </div>
    </div>
  </div>}
  {phasorDiagOpen&&<PhasorDiagram onClose={()=>setPhasorDiagOpen(false)} p={p} pf={pf} pfMode={pfMode} setPfMode={setPfMode} phasorVis={phasorVis} setPhasorVis={setPhasorVis} balI={balI} balV={balV} seqI={seqI} seqV={seqV} uP={uP} uPf={uPf} onBalChangeI={onBalChangeI} onBalChangeV={onBalChangeV} onSeqChangeI={onSeqChangeI} onSeqChangeV={onSeqChangeV}/>}
  {fcOpen&&<FaultCalculator sys={sys} onApply={(fp,pp)=>{setP(fp);if(pp){setPfEnabled(true);setPf(pp)}setFcOpen(false);setEvts(ev=>[{time:nowShort(),icon:"⚡",text:"Fasores de falta aplicados pelo Calculador.",dt:""},...ev.slice(0,20)]);}} onClose={()=>setFcOpen(false)}/>}
  </>);
}
