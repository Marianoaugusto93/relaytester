import{useRef,useEffect,useCallback}from"react";
import{getVoltagesPu,evaluate27Stage,simulate27OperateTime}from"./protection.js";
import{fmtTs,nowShort}from"./defaults.js";

export default function use27Monitor({relayProt,relayReadings,sys,injecting,trippedStageIds,setTrippedStageIds,setIsTripped,setFaultRecord,setTripHistory,setDiag,setEvts,rtc,rtp}){
  const idle27Ref=useRef({iv:null,start:null,targets:null});

  const check27IdleCondition=useCallback(()=>{
    const fn27=relayProt["27/59"];
    if(!fn27||!fn27.enabled)return[];
    const sp=fn27.startPhases||"any";
    const vBlock=fn27.lowVoltageBlockEnabled?(fn27.voltageBlockPu||0.20):0;
    const voltsPu=injecting?getVoltagesPu(relayReadings,fn27.voltageSelection||"ph-n",sys.tp.secV||115):[0,0,0];
    const active=[];
    (fn27.stages27||[]).forEach(s=>{
      if(!s.enabled)return;
      const ev=evaluate27Stage(s,voltsPu,sp,vBlock);
      if(ev.started)active.push(s);
    });
    return active;
  },[relayProt,relayReadings,sys.tp.secV,injecting]);

  useEffect(()=>{
    const ref=idle27Ref.current;
    if(injecting){
      if(ref.iv){clearInterval(ref.iv);ref.iv=null;ref.start=null;ref.targets=null}
      return;
    }
    const stagesToTrip=check27IdleCondition().filter(s=>!trippedStageIds.includes(s.id));
    if(stagesToTrip.length===0){
      if(ref.iv){clearInterval(ref.iv);ref.iv=null;ref.start=null;ref.targets=null}
      return;
    }
    if(ref.iv&&ref.targets){
      const curIds=ref.targets.map(t=>t.id).sort().join(",");
      const newIds=stagesToTrip.map(s=>s.id).sort().join(",");
      if(curIds===newIds)return;
    }
    if(ref.iv)clearInterval(ref.iv);
    ref.targets=stagesToTrip.map(s=>({id:s.id,timeOp:s.timeOp,pickup:s.pickup,targetMs:simulate27OperateTime(s.timeOp)*1000,tripped:false}));
    ref.start=Date.now();
    setEvts(ev=>[{time:nowShort(),icon:"⏳",text:`27 timer: relé vê subtensão (sem injeção). Contando ${stagesToTrip.map(s=>s.id).join(", ")}...`,dt:""},...ev.slice(0,20)]);

    ref.iv=setInterval(()=>{
      const elapsed=Date.now()-ref.start;
      const dgEntries=ref.targets.map(t=>{
        const pct=Math.min(100,elapsed/t.targetMs*100);
        if(t.tripped)return{fid:"27/59",label:"27",status:"trip",stage:t.id,time:(t.targetMs/1000).toFixed(3),obs:"Idle: 0V → TRIP"};
        return{fid:"27/59",label:"27",status:pct>0?"trip":"enabled",stage:t.id,time:`${pct.toFixed(0)}%`,obs:`Timer: ${(elapsed/1000).toFixed(2)}s / ${(t.targetMs/1000).toFixed(3)}s`};
      });
      setDiag(dgEntries);

      const newlyTripped=ref.targets.filter(t=>!t.tripped&&elapsed>=t.targetMs);
      if(newlyTripped.length>0){
        newlyTripped.forEach(t=>{t.tripped=true});
        const ids=newlyTripped.map(t=>t.id);
        const tripTimeS=newlyTripped[0].targetMs/1000;
        setTrippedStageIds(prev=>{const merged=new Set([...prev,...ids]);return[...merged]});
        setIsTripped(true);
        const z={mag:0,ang:0};
        setFaultRecord({stages:newlyTripped.map(t=>({stage:t.id,time:t.targetMs/1000})),timestamp:fmtTs(),currents:{Ia:z,Ib:z,Ic:z},voltages:{Va:z,Vb:z,Vc:z}});
        setTripHistory(prev=>[{
          timestamp:fmtTs(),stages:ids,tripTime:tripTimeS,tripPhase:"idle",
          prefault:{enabled:false,duration:0,currents:null,voltages:null,relayCurrents:null,relayVoltages:null},
          fault:{currents:{Ia:z,Ib:z,Ic:z},voltages:{Va:z,Vb:z,Vc:z},relayCurrents:{Ia:z,Ib:z,Ic:z},relayVoltages:{Va:z,Vb:z,Vc:z}},
          primary:{currents:{Ia:z,Ib:z,Ic:z},voltages:{Va:z,Vb:z,Vc:z}},
          system:{rtc,rtp,priV:sys.tp.priV,secV:sys.tp.secV,priA:sys.tc.priA,secA:sys.tc.secA},
        },...prev].slice(0,5));
        setEvts(ev=>[{time:nowShort(),icon:"⚠",text:`27 trip: ${ids.join(", ")} — ${tripTimeS.toFixed(3)}s (relé sem tensão)`,dt:`T+${tripTimeS.toFixed(3)}s`},...ev.slice(0,20)]);
        if(ref.targets.every(t=>t.tripped)){clearInterval(ref.iv);ref.iv=null}
      }
    },20);

    return()=>{if(ref.iv){clearInterval(ref.iv);ref.iv=null;ref.start=null;ref.targets=null}};
  },[injecting,trippedStageIds,check27IdleCondition,rtc,rtp,sys]);

  return{check27IdleCondition};
}
