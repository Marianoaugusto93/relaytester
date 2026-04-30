import{useRef,useState,useCallback}from"react";
import{buildElectricalGraph,computeRelayReadings,checkMaletaTripDetection,checkBreakerTripCoil}from"./CampoPage.jsx";
import{calc3,calcPower,getVoltagesPu,evaluate27Stage,evaluate59Stage,calcI2,calc67TheoreticalTripTime,calc67NTheoreticalTripTime,calcTripTime,calcTripTimeReal,getCurrentForFunc,evalProtectionsDirect}from"./protection.js";
import{protOrder,boCols,nowShort,fmtTs}from"./defaults.js";

export default function useSimulation({p,pf,pfEnabled,pfDuration,relayProt,relayMatrix,fieldStateRef,sys,rtc,rtp,setEvts,setTripHistory,setSimPhase,setDiag,setSs,setStime,setTrippedStageIds,setIsTripped,setMaletaTripped,setFaultRecord,stimeRef}){
  const tr=useRef(null);
  const ar79Ref=useRef({shot:0,deadTimer:null,reclaimTimer:null,locked:false});

  const stop79=useCallback(()=>{
    const ar=ar79Ref.current;
    if(ar.deadTimer){clearTimeout(ar.deadTimer);ar.deadTimer=null}
    if(ar.reclaimTimer){clearTimeout(ar.reclaimTimer);ar.reclaimTimer=null}
    ar.shot=0;ar.locked=false;
  },[]);

  const stopSim=useCallback(()=>{
    if(tr.current)clearInterval(tr.current);
    stop79();
    setSs("idle");setSimPhase("idle");
    setEvts(ev=>[{time:nowShort(),icon:"⏹",text:"Stopped.",dt:`T+${stimeRef.current.toFixed(3)}s`},...ev.slice(0,20)]);
  },[stop79,setSs,setSimPhase,setEvts,stimeRef]);

  const runSim=useCallback(()=>{
    setSs("running");setStime(0);stimeRef.current=0;setDiag([]);setMaletaTripped(false);
    setEvts(ev=>[{time:nowShort(),icon:"⚡",text:"Simulation started.",dt:"T+0.000s"},...ev.slice(0,20)]);
    let el=0;const iv=10;
    const pfActive=pfEnabled&&pfDuration>0;
    const rp2=relayProt;

    const graph=buildElectricalGraph(fieldStateRef.current.connections,fieldStateRef.current.internalConns);
    const faultRR=computeRelayReadings(p,graph);
    const pfRR=pfActive?computeRelayReadings(pf,graph):null;

    const buildFaultBase=(rr)=>({
      currents:{Ia:{mag:rr.currents.Ia.mag*rtc,ang:rr.currents.Ia.ang},Ib:{mag:rr.currents.Ib.mag*rtc,ang:rr.currents.Ib.ang},Ic:{mag:rr.currents.Ic.mag*rtc,ang:rr.currents.Ic.ang}},
      voltages:{Va:{mag:rr.voltages.Va.mag*rtp,ang:rr.voltages.Va.ang},Vb:{mag:rr.voltages.Vb.mag*rtp,ang:rr.voltages.Vb.ang},Vc:{mag:rr.voltages.Vc.mag*rtp,ang:rr.voltages.Vc.ang}}});

    let firstTripRecorded=false;

    const handleTrips=(trippedSoFar,latest,phaseLabel,rr)=>{
      const ids=trippedSoFar.map(t=>t.stage);
      setTrippedStageIds(prev=>{const merged=new Set([...prev,...ids]);return[...merged];});
      setIsTripped(true);
      setFaultRecord({stages:[...trippedSoFar],timestamp:fmtTs(),...buildFaultBase(rr)});
      const dtLabel=latest.time!==null?`T+${latest.time.toFixed(3)}s`:phaseLabel;
      setEvts(ev=>[{time:nowShort(),icon:"⚡",text:`Relay trip: ${latest.stage}`,dt:dtLabel},...ev.slice(0,20)]);

      if(!firstTripRecorded){
        firstTripRecorded=true;
        const record={
          timestamp:fmtTs(),stages:ids,tripTime:latest.time,
          tripPhase:latest.time!==null?"fault":"prefault",
          prefault:{
            enabled:pfActive,duration:pfActive?pfDuration:0,
            currents:pfActive?{Ia:{...pf.currents.Ia},Ib:{...pf.currents.Ib},Ic:{...pf.currents.Ic}}:null,
            voltages:pfActive?{Va:{...pf.voltages.Va},Vb:{...pf.voltages.Vb},Vc:{...pf.voltages.Vc}}:null,
            relayCurrents:pfRR?{Ia:{...pfRR.currents.Ia},Ib:{...pfRR.currents.Ib},Ic:{...pfRR.currents.Ic}}:null,
            relayVoltages:pfRR?{Va:{...pfRR.voltages.Va},Vb:{...pfRR.voltages.Vb},Vc:{...pfRR.voltages.Vc}}:null,
          },
          fault:{
            currents:{Ia:{...p.currents.Ia},Ib:{...p.currents.Ib},Ic:{...p.currents.Ic}},
            voltages:{Va:{...p.voltages.Va},Vb:{...p.voltages.Vb},Vc:{...p.voltages.Vc}},
            relayCurrents:{Ia:{...faultRR.currents.Ia},Ib:{...faultRR.currents.Ib},Ic:{...faultRR.currents.Ic}},
            relayVoltages:{Va:{...faultRR.voltages.Va},Vb:{...faultRR.voltages.Vb},Vc:{...faultRR.voltages.Vc}},
          },
          primary:buildFaultBase(rr),
          system:{rtc,rtp,priV:sys.tp.priV,secV:sys.tp.secV,priA:sys.tc.priA,secA:sys.tc.secA},
        };
        setTripHistory(prev=>[record,...prev].slice(0,5));
      }

      const maletaDetected=checkMaletaTripDetection(ids,relayMatrix,fieldStateRef.current);
      if(maletaDetected){
        clearInterval(tr.current);setSs("idle");setSimPhase("idle");setMaletaTripped(true);
        if(latest.time!==null){setStime(latest.time);stimeRef.current=latest.time;}
        const maletaStop=latest.time;
        setTripHistory(prev=>{if(prev.length===0)return prev;const updated=[...prev];updated[0]={...updated[0],maletaStopTime:maletaStop};return updated;});
        setEvts(ev=>[{time:nowShort(),icon:"🔴",text:`TRIP detected by maleta: ${ids.join(", ")}`,dt:dtLabel},...ev.slice(0,20)]);
        return true;
      }
      const tcTrip=checkBreakerTripCoil(ids,relayMatrix,fieldStateRef.current);
      if(tcTrip){
        clearInterval(tr.current);setSs("idle");setSimPhase("idle");setMaletaTripped(true);
        if(latest.time!==null){setStime(latest.time);stimeRef.current=latest.time;}
        setTripHistory(prev=>{if(prev.length===0)return prev;const u=[...prev];u[0]={...u[0],maletaStopTime:latest.time};return u;});
        setEvts(ev=>[{time:nowShort(),icon:"🔓",text:`TRIP via bobina TC: ${ids.join(", ")}`,dt:dtLabel},...ev.slice(0,20)]);
        return true;
      }
      const boTriggered=ids.filter(id=>boCols.some(bo=>relayMatrix[id]?.[bo]));
      if(boTriggered.length>0){
        const activeBOs=boCols.filter(bo=>boTriggered.some(id=>relayMatrix[id]?.[bo]));
        clearInterval(tr.current);setSs("idle");setSimPhase("idle");setMaletaTripped(true);
        if(latest.time!==null){setStime(latest.time);stimeRef.current=latest.time;}
        setTripHistory(prev=>{if(prev.length===0)return prev;const updated=[...prev];updated[0]={...updated[0],maletaStopTime:latest.time};return updated;});
        setEvts(ev=>[{time:nowShort(),icon:"⚡",text:`${boTriggered.join(", ")} → ${activeBOs.join("/")} → OPEN_CB`,dt:dtLabel},...ev.slice(0,20)]);
        return true;
      }
      return false;
    };

    // ── MODO SEM PRÉ-FALTA ────────────────────────────────────────────────────
    if(!pfActive){
      setSimPhase("fault");
      const eval0=evalProtectionsDirect(faultRR,rp2,sys);
      setDiag(eval0.dg);
      const allTrips=eval0.allTrips;

      const fn27pre=rp2["27/59"];
      let preInj27Count=0;
      if(fn27pre&&fn27pre.enabled){
        const sp27=fn27pre.startPhases||"any";
        const vBlock27=fn27pre.lowVoltageBlockEnabled?(fn27pre.voltageBlockPu||0.20):0;
        const preInjVolts=[0,0,0];
        (fn27pre.stages27||[]).forEach(s=>{
          if(!s.enabled)return;
          const ev=evaluate27Stage(s,preInjVolts,sp27,vBlock27);
          if(ev.started){
            preInj27Count++;
            const dupIdx=allTrips.findIndex(t=>t.stage===s.id);
            if(dupIdx>=0)allTrips.splice(dupIdx,1);
            const t0=0.005+Math.random()*0.015;
            allTrips.push({func:"27",stage:s.id,time:t0});
            const dgIdx=eval0.dg.findIndex(d=>d.stage===s.id);
            if(dgIdx>=0)eval0.dg[dgIdx]={fid:"27/59",label:"27",status:"trip",stage:s.id,time:t0.toFixed(3),obs:"Pre-inj: 0V → trip imediato"};
          }
        });
      }
      if(preInj27Count>0){
        setEvts(ev=>[{time:nowShort(),icon:"⚠",text:`27 trip imediato: relé via 0V antes da injeção (sem pré-falta). Use pré-falta com tensão nominal para evitar.`,dt:"T+0.000s"},...ev.slice(0,20)]);
      }

      allTrips.sort((a,b)=>a.time-b.time);
      const trippedSoFar=[];let nextTripIdx=0;let stopped=false;

      tr.current=setInterval(()=>{
        el+=iv;if(stopped)return;
        const elSec=el/1000;setStime(elSec);stimeRef.current=elSec;
        let newTrips=false;
        while(nextTripIdx<allTrips.length&&elSec>=allTrips[nextTripIdx].time){
          trippedSoFar.push(allTrips[nextTripIdx]);nextTripIdx++;newTrips=true;
        }
        if(newTrips){
          const latest=trippedSoFar[trippedSoFar.length-1];
          if(handleTrips(trippedSoFar,latest,"T",faultRR))stopped=true;
        }
        if(el>60000&&!stopped){
          clearInterval(tr.current);setSs("idle");setSimPhase("idle");
          if(trippedSoFar.length>0)setEvts(ev=>[{time:nowShort(),icon:"⚠",text:`Timeout — relay tripped but maleta did not detect.`,dt:"T+60.000s"},...ev.slice(0,20)]);
        }
      },iv);
      return;
    }

    // ── MODO COM PRÉ-FALTA ────────────────────────────────────────────────────
    const pfDurMs=pfDuration*1000;
    let phase="prefault";let faultEl=0;let stopped=false;
    let currentRR=pfRR;
    const stageStates=[];
    protOrder.forEach(fid=>{
      const fn=rp2[fid];if(!fn||!fn.enabled)return;
      const stages=(fid==="27/59")?[...(fn.stages27||[]),...(fn.stages59||[])]:(fid==="81")?[...(fn.stages81u||[]),...(fn.stages81o||[])]:(fid==="32")?[...(fn.stages32r||[]),...(fn.stages32f||[])]:(fid==="79")?[]:(fn.stages||[]);
      stages.forEach(s=>{if(s.enabled){const thr=1.0+(Math.random()*2-1)*0.05;stageStates.push({fid,stage:s,accum:0,tripped:false,tripTime:null,tripThreshold:thr})}});
    });
    const trippedSoFar=[];

    setSimPhase("prefault");
    setEvts(ev=>[{time:nowShort(),icon:"⏳",text:`Pre-fault: ${pfDuration.toFixed(1)}s`,dt:""},...ev.slice(0,20)]);

    tr.current=setInterval(()=>{
      el+=iv;if(stopped)return;
      const dtSec=iv/1000;

      if(phase==="prefault"){
        currentRR=pfRR;
        if(el>=pfDurMs){
          phase="fault";faultEl=0;setSimPhase("fault");currentRR=faultRR;
          setEvts(ev=>[{time:nowShort(),icon:"⚡",text:"Fault phase started. Timer running.",dt:"T+0.000s"},...ev.slice(0,20)]);
        }
      }else{
        currentRR=faultRR;
        faultEl+=iv;setStime(faultEl/1000);stimeRef.current=faultEl/1000;
      }

      let newTrips=false;
      stageStates.forEach(ss=>{
        if(ss.tripped)return;
        let Ttotal;
        if(ss.fid==="27/59"){
          const fn27=rp2["27/59"];
          const voltsPu=getVoltagesPu(currentRR,fn27.voltageSelection||"ph-n",sys.tp.secV||115);
          const sp=fn27.startPhases||"any";
          const is27=ss.stage.id.startsWith("27");
          if(is27){
            const ev=evaluate27Stage(ss.stage,voltsPu,sp,fn27.lowVoltageBlockEnabled?fn27.voltageBlockPu||0.20:0);
            if(!ev.started)return;
          }else{
            const ev=evaluate59Stage(ss.stage,voltsPu,sp);
            if(!ev.started)return;
          }
          Ttotal=ss.stage.timeOp;
        }else if(ss.fid==="81"){
          const fr=sys.freq||60;
          const is81u=ss.stage.id.startsWith("81U");
          const inPu=is81u?fr<ss.stage.pickup:fr>ss.stage.pickup;
          if(!inPu)return;
          Ttotal=ss.stage.timeOp;
        }else if(ss.fid==="32"){
          const pA32=calcPower(currentRR.voltages.Va.mag,currentRR.currents.Ia.mag,currentRR.voltages.Va.ang,currentRR.currents.Ia.ang);
          const pB32=calcPower(currentRR.voltages.Vb.mag,currentRR.currents.Ib.mag,currentRR.voltages.Vb.ang,currentRR.currents.Ib.ang);
          const pC32=calcPower(currentRR.voltages.Vc.mag,currentRR.currents.Ic.mag,currentRR.voltages.Vc.ang,currentRR.currents.Ic.ang);
          const P3=pA32.P+pB32.P+pC32.P;
          const is32r=ss.stage.id.startsWith("32R");
          const inPu=is32r?P3<-ss.stage.pickup:P3>ss.stage.pickup;
          if(!inPu)return;
          Ttotal=ss.stage.timeOp;
        }else if(ss.fid==="67"){
          Ttotal=calc67TheoreticalTripTime(ss.stage,currentRR);
        }else if(ss.fid==="67N"){
          Ttotal=calc67NTheoreticalTripTime(ss.stage,currentRR);
        }else{
          const I=getCurrentForFunc(ss.fid,currentRR);
          if(I<ss.stage.pickup)return;
          Ttotal=calcTripTime(ss.fid,ss.stage,I);
        }
        if(Ttotal===Infinity||Ttotal<=0)return;
        ss.accum+=dtSec/Ttotal;
        if(ss.accum>=ss.tripThreshold){
          ss.tripped=true;
          ss.tripTime=phase==="fault"?faultEl/1000:null;
          trippedSoFar.push({func:ss.fid,stage:ss.stage.id,time:ss.tripTime,phase});
          newTrips=true;
        }
      });

      if(newTrips&&!stopped){
        const latest=trippedSoFar[trippedSoFar.length-1];
        const rr=phase==="fault"?faultRR:pfRR;
        if(phase==="prefault"){
          const ids=trippedSoFar.map(t=>t.stage);
          setTrippedStageIds(prev=>{const merged=new Set([...prev,...ids]);return[...merged]});
          setIsTripped(true);
          setEvts(ev=>[{time:nowShort(),icon:"⚠",text:`Trip na pré-falta: ${latest.stage} (maleta continua)`,dt:"PF"},...ev.slice(0,20)]);
        }else{
          if(handleTrips(trippedSoFar,latest,"T",rr))stopped=true;
        }
      }

      if(el%500===0||newTrips){
        const dg=[];
        protOrder.forEach(fid=>{
          const fn=rp2[fid];
          if(!fn||!fn.enabled){dg.push({fid,label:fn?.label||fid,status:"disabled",stage:"-",time:"-",obs:"Function disabled"});return}
          const stages=(fid==="27/59")?[...(fn.stages27||[]),...(fn.stages59||[])]:(fid==="81")?[...(fn.stages81u||[]),...(fn.stages81o||[])]:(fid==="32")?[...(fn.stages32r||[]),...(fn.stages32f||[])]:(fid==="79")?[]:(fn.stages||[]);
          let any=false;
          stages.forEach(s=>{
            if(!s.enabled){dg.push({fid,label:fn.label,status:"disabled",stage:s.id,time:"-",obs:"Stage disabled"});return}
            const ss2=stageStates.find(x=>x.stage.id===s.id);if(!ss2)return;
            if(fid==="27/59"){
              const vp2=getVoltagesPu(currentRR,fn.voltageSelection||"ph-n",sys.tp.secV||115);
              const is27d=s.id.startsWith("27");const sp2=fn.startPhases||"any";
              const evd=is27d?evaluate27Stage(s,vp2,sp2,fn.lowVoltageBlockEnabled?fn.voltageBlockPu||0.20:0):evaluate59Stage(s,vp2,sp2);
              if(ss2.tripped){any=true;dg.push({fid,label:is27d?"27":"59",status:"trip",stage:s.id,time:ss2.tripTime!==null?ss2.tripTime.toFixed(3):"PF",obs:"Accum=100%"});}
              else if(evd.started){any=true;dg.push({fid,label:is27d?"27":"59",status:"trip",stage:s.id,time:`${(ss2.accum*100).toFixed(0)}%`,obs:`V=[${vp2.map(v=>v.toFixed(2)).join(",")}]pu`});}
            }else if(fid==="81"){
              const fr=sys.freq||60;const is81u=s.id.startsWith("81U");
              const inPu=is81u?fr<s.pickup:fr>s.pickup;
              if(ss2.tripped){any=true;dg.push({fid,label:is81u?"81U":"81O",status:"trip",stage:s.id,time:ss2.tripTime!==null?ss2.tripTime.toFixed(3):"PF",obs:"Accum=100%"});}
              else if(inPu){any=true;dg.push({fid,label:is81u?"81U":"81O",status:"trip",stage:s.id,time:`${(ss2.accum*100).toFixed(0)}%`,obs:`f=${fr.toFixed(2)}Hz`});}
            }else if(fid==="32"){
              const pA32=calcPower(currentRR.voltages.Va.mag,currentRR.currents.Ia.mag,currentRR.voltages.Va.ang,currentRR.currents.Ia.ang);
              const pB32=calcPower(currentRR.voltages.Vb.mag,currentRR.currents.Ib.mag,currentRR.voltages.Vb.ang,currentRR.currents.Ib.ang);
              const pC32=calcPower(currentRR.voltages.Vc.mag,currentRR.currents.Ic.mag,currentRR.voltages.Vc.ang,currentRR.currents.Ic.ang);
              const P3=pA32.P+pB32.P+pC32.P;
              const is32r=s.id.startsWith("32R");
              const inPu=is32r?P3<-s.pickup:P3>s.pickup;
              if(ss2.tripped){any=true;dg.push({fid,label:is32r?"32R":"32F",status:"trip",stage:s.id,time:ss2.tripTime!==null?ss2.tripTime.toFixed(3):"PF",obs:"Accum=100%"});}
              else if(inPu){any=true;dg.push({fid,label:is32r?"32R":"32F",status:"trip",stage:s.id,time:`${(ss2.accum*100).toFixed(0)}%`,obs:`P=${P3.toFixed(2)}W`});}
            }else{
              const I=getCurrentForFunc(fid,currentRR);
              if(ss2.tripped){any=true;dg.push({fid,label:fn.label,status:"trip",stage:s.id,time:ss2.tripTime!==null?ss2.tripTime.toFixed(3):"PF",obs:"Accum=100%"});}
              else if(I>=s.pickup){any=true;dg.push({fid,label:fn.label,status:"trip",stage:s.id,time:`${(ss2.accum*100).toFixed(0)}%`,obs:`I=${I.toFixed(2)}A ≥ ${s.pickup}A`});}
            }
          });
          if(!any&&stages.some(s=>s.enabled))dg.push({fid,label:fn.label,status:"enabled",stage:"-",time:"-",obs:"No pick-up"});
        });
        setDiag(dg);
      }

      if(phase==="fault"&&faultEl>60000&&!stopped){
        clearInterval(tr.current);setSs("idle");setSimPhase("idle");
        if(trippedSoFar.length>0)setEvts(ev=>[{time:nowShort(),icon:"⚠",text:`Timeout — relay tripped but maleta did not detect.`,dt:"T+60.000s"},...ev.slice(0,20)]);
      }
    },iv);
  },[p,pf,pfEnabled,pfDuration,relayProt,relayMatrix,fieldStateRef,sys,rtc,rtp,setEvts,setTripHistory,setSs,setStime,setSimPhase,setDiag,setTrippedStageIds,setIsTripped,setMaletaTripped,setFaultRecord,stimeRef,stop79,ar79Ref,tr]);

  return{runSim,stopSim,stop79,ar79Ref,tr};
}
