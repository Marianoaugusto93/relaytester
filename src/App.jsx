import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import CampoPage from "./CampoPage.jsx";
import { buildElectricalGraph, computeRelayReadings, checkMaletaTripDetection, checkBreakerTripCoil } from "./CampoPage.jsx";
import PainelPage from "./PainelPage.jsx";
import { generateComtrade } from "./comtrade.js";
import JSZip from "jszip";

const curveTypes=["IEC - Standard Inverse","IEC - Very Inverse","IEC - Extremely Inverse","IEC - Long-Time Inverse","IEC - Short-Time Inverse","US - Moderately Inverse","US - Inverse","US - Very Inverse","US - Extremely Inverse","US - Short-Time Inverse","IEEE - Moderately Inverse","IEEE - Very Inverse","IEEE - Extremely Inverse","ANSI - Moderately Inverse","ANSI - Normally Inverse","ANSI - Very Inverse","ANSI - Extremely Inverse","Tempo Definido"];
const mkS=(id,en=true,pu=1,td=0.1,cv="IEC - Standard Inverse",top=0)=>({id,enabled:en,pickup:pu,timeDial:td,curve:cv,timeOp:top});
const mkD=(id,en=true,pu=1,td=0.1,cv="IEC - Standard Inverse",mta=-45,pol="quadratura",minPolV=1,dir="forward")=>({id,enabled:en,pickup:pu,timeDial:td,curve:cv,mta,pol,timeOp:0,minPolV,dir});
const mkV=(id,en=true,pu=0.8,top=0.5)=>({id,enabled:en,pickup:pu,timeOp:top});
const mkF=(id,en=true,pu=59.5,top=1.0)=>({id,enabled:en,pickup:pu,timeOp:top});
const mkP=(id,en=true,pu=5,top=1.0)=>({id,enabled:en,pickup:pu,timeOp:top});
const defaultPhasors={currents:{Ia:{mag:0,ang:0},Ib:{mag:0,ang:-120},Ic:{mag:0,ang:120}},voltages:{Va:{mag:66.4,ang:0},Vb:{mag:66.4,ang:-120},Vc:{mag:66.4,ang:120}}};
const defaultSystem={tp:{priV:13800,secV:115,priConn:"estrela",secConn:"estrela"},tc:{priA:600,secA:5},freq:60};
const defaultProtections={
  "50":{label:"50",name:"Sobrecorrente Instantânea Fase",enabled:true,base:"secundario",stages:[mkS("50-1",true,10,0,"",0.05),mkS("50-2",false,15,0,"",0.05),mkS("50-3",false,20,0,"",0.05),mkS("50-4",false,25,0,"",0.05)]},
  "51":{label:"51",name:"Sobrecorrente Temporizada Fase",enabled:true,base:"secundario",stages:[mkS("51-1",true,5,0.1),mkS("51-2",false,8,0.2,"IEC - Very Inverse"),mkS("51-3",false,12,0.3,"IEC - Extremely Inverse"),mkS("51-4",false,15,0.5)]},
  "50N":{label:"50N",name:"Sobrecorrente Inst. Neutro",enabled:true,base:"secundario",stages:[mkS("50N-1",true,2,0,"",0.05),mkS("50N-2",false,4,0,"",0.05),mkS("50N-3",false,6,0,"",0.05),mkS("50N-4",false,8,0,"",0.05)]},
  "51N":{label:"51N",name:"Sobrecorrente Temp. Neutro",enabled:true,base:"secundario",stages:[mkS("51N-1",true,1,0.1),mkS("51N-2",false,3,0.2,"IEC - Very Inverse"),mkS("51N-3",false,5,0.3),mkS("51N-4",false,7,0.5)]},
  "67":{label:"67",name:"Direcional de Fase",enabled:false,base:"secundario",stages:[mkD("67-1",true,5),mkD("67-2",false,8),mkD("67-3",false,12),mkD("67-4",false,15)]},
  "67N":{label:"67N",name:"Direcional de Neutro",enabled:false,base:"secundario",stages:[mkD("67N-1",true,1.5),mkD("67N-2",false,3),mkD("67N-3",false,5),mkD("67N-4",false,7)]},
  "27/59":{label:"27/59",name:"Subtensão / Sobretensão",enabled:false,base:"secundario",startPhases:"any",voltageSelection:"ph-n",hysteresis:4.0,lowVoltageBlockEnabled:true,voltageBlockPu:0.20,stages27:[mkV("27-1",true,0.8,1.0),mkV("27-2",false,0.7,0.5),mkV("27-3",false,0.5,0.3)],stages59:[mkV("59-1",true,1.1,1.0),mkV("59-2",false,1.2,0.5),mkV("59-3",false,1.3,0.3)]},
  "47":{label:"47",name:"Seq. Negativa de Tensão",enabled:false,stages:[mkV("47-1",true,0.05,1.0),mkV("47-2",false,0.1,0.5)]},
  "46":{label:"46",name:"Sobrecorrente Seq. Negativa",enabled:false,base:"secundario",stages:[mkV("46-1",true,0.1,1.0),mkV("46-2",false,0.2,0.5),mkV("46-3",false,0.3,0.3),mkV("46-4",false,0.5,0.2)]},
  "81":{label:"81",name:"Sub / Sobrefrequência",enabled:false,stages81u:[mkF("81U-1",true,59.5,1.0),mkF("81U-2",false,59.0,0.5),mkF("81U-3",false,58.5,0.3)],stages81o:[mkF("81O-1",false,60.5,1.0),mkF("81O-2",false,61.0,0.5),mkF("81O-3",false,61.5,0.3)]},
  "32":{label:"32",name:"Potência Direcional/Reversa",enabled:false,stages32r:[mkP("32R-1",true,5,1.0),mkP("32R-2",false,10,0.5)],stages32f:[mkP("32F-1",false,5,1.0),mkP("32F-2",false,10,0.5)]},
  "79":{label:"79",name:"Religamento Automático",enabled:false,shots:3,deadTimes:[0.5,5.0,15.0],reclaimTime:3.0},
};
const protOrder=["51","50","51N","50N","67","67N","27/59","47","46","81","32","79"];
const biRows=["BI1","BI2","BI3","BI4","BI5","BI6"];
const cbStatusRows=["CB_Opened","CB_Closed"];
const cbCmdRows=["CLOSE_CB","OPEN_CB"];
const protStageRows=[];
protOrder.forEach(fid=>{const f=defaultProtections[fid];if(fid==="27/59"){(f.stages27||[]).forEach(s=>protStageRows.push(s.id));(f.stages59||[]).forEach(s=>protStageRows.push(s.id))}else if(fid==="81"){(f.stages81u||[]).forEach(s=>protStageRows.push(s.id));(f.stages81o||[]).forEach(s=>protStageRows.push(s.id))}else if(fid==="32"){(f.stages32r||[]).forEach(s=>protStageRows.push(s.id));(f.stages32f||[]).forEach(s=>protStageRows.push(s.id))}else if(fid==="79"){}else{(f.stages||[]).forEach(s=>protStageRows.push(s.id))}});
const allRows=[...biRows,...cbStatusRows,...cbCmdRows,...protStageRows];
const boCols=["BO1","BO2","BO3","BO4","BO5","BO6"];const ledCols=["L1","L2","L3","L4","L5","L6","L7","L8"];const allCols=[...boCols,...ledCols];
const buildDefaultMatrix=()=>{const m={};allRows.forEach(r=>{m[r]={};allCols.forEach(c=>{m[r][c]=false})});return m};
// Input matrix: CB feedback signals × BI inputs
const inMatrixRows=["CB_Opened","CB_Closed"];
const buildDefaultInMatrix=()=>{const m={};inMatrixRows.forEach(r=>{m[r]={};biRows.forEach(c=>{m[r][c]=false})});return m};
const mainTabs=[{id:"sys",label:"System Parameters"},{id:"relay",label:"Relay Settings"},{id:"output",label:"Output Matrix"},{id:"input",label:"Input Matrix"}];

const toRad=d=>d*Math.PI/180;const toRect=(m,a)=>({re:m*Math.cos(toRad(a)),im:m*Math.sin(toRad(a))});
const fromRect=(re,im)=>({mag:Math.sqrt(re*re+im*im),ang:Math.atan2(im,re)*180/Math.PI});
function calc3(obj,keys){const s=keys.reduce((a,k)=>{const r=toRect(obj[k].mag,obj[k].ang);return{re:a.re+r.re,im:a.im+r.im}},{re:0,im:0});return fromRect(s.re,s.im)}
function calcPower(v,i,vA,iA){const S=v*i;const phi=toRad(vA-iA);return{P:S*Math.cos(phi),Q:S*Math.sin(phi),S,fp:S>0?Math.cos(phi):0}}
// ── MOTOR DE PROTEÇÃO 50 — Instantânea com tolerância ──────────────────────────
const P50_ABSOLUTE_TIME_ERROR_S=0.02; // 20 ms
const P50_RELATIVE_TIME_ERROR_PCT=5;  // 5%
const P50_TBASIC_S=0.03;             // 30 ms — tempo teórico quando ajuste = 0
const P50_MIN_INSTANTANEOUS_S=0.02;  // 20 ms — piso absoluto

function get50TheoreticalTime(adjustedTime){
  return adjustedTime===0?P50_TBASIC_S:adjustedTime;
}

function simulate50OperateTime(adjustedTime){
  const theoretical=get50TheoreticalTime(adjustedTime);
  let tMin,tMax;
  if(adjustedTime===0){
    tMin=P50_MIN_INSTANTANEOUS_S;
    tMax=P50_TBASIC_S;
  }else{
    const relLimit=theoretical*(P50_RELATIVE_TIME_ERROR_PCT/100);
    const allowedDev=Math.max(P50_ABSOLUTE_TIME_ERROR_S,relLimit);
    tMin=Math.max(P50_MIN_INSTANTANEOUS_S,theoretical-allowedDev);
    tMax=theoretical+allowedDev;
  }
  return tMin+Math.random()*(tMax-tMin);
}
// ── FIM MOTOR DE PROTEÇÃO 50 ──────────────────────────────────────────────────

// ── MOTOR DE PROTEÇÃO 50N — Instantânea de neutro (3I0) com tolerância ────────
const P50N_ABSOLUTE_TIME_ERROR_S=0.02; // 20 ms
const P50N_RELATIVE_TIME_ERROR_PCT=5;  // 5%
const P50N_TBASIC_S=0.03;             // 30 ms — tempo teórico quando ajuste = 0
const P50N_MIN_INSTANTANEOUS_S=0.02;  // 20 ms — piso absoluto

function get50NTheoreticalTime(adjustedTime){
  return adjustedTime===0?P50N_TBASIC_S:adjustedTime;
}

function simulate50NOperateTime(adjustedTime){
  const theoretical=get50NTheoreticalTime(adjustedTime);
  let tMin,tMax;
  if(adjustedTime===0){
    tMin=P50N_MIN_INSTANTANEOUS_S;
    tMax=P50N_TBASIC_S;
  }else{
    const relLimit=theoretical*(P50N_RELATIVE_TIME_ERROR_PCT/100);
    const allowedDev=Math.max(P50N_ABSOLUTE_TIME_ERROR_S,relLimit);
    tMin=Math.max(P50N_MIN_INSTANTANEOUS_S,theoretical-allowedDev);
    tMax=theoretical+allowedDev;
  }
  return tMin+Math.random()*(tMax-tMin);
}
// ── FIM MOTOR DE PROTEÇÃO 50N ─────────────────────────────────────────────────

// ── MOTOR DE PROTEÇÃO 51 — Curvas IEC, US, IEEE, ANSI antiga, Tempo Definido ──
const MAX_OPERATING_MULTIPLE=20;
const ABSOLUTE_TIME_ERROR_S=0.04; // 40 ms
const RELATIVE_TIME_ERROR_PCT=5;  // 5%

const CURVE_MAP={
  // IEC: t = TD * k / (M^alpha - 1)
  "IEC - Standard Inverse":{type:"IEC",k:0.14,alpha:0.02},
  "IEC - Very Inverse":{type:"IEC",k:13.5,alpha:1},
  "IEC - Extremely Inverse":{type:"IEC",k:80,alpha:2},
  "IEC - Long-Time Inverse":{type:"IEC",k:120,alpha:1},
  "IEC - Short-Time Inverse":{type:"IEC",k:0.05,alpha:0.04},
  // US: t = TD * (A + B / (M^P - 1))
  "US - Moderately Inverse":{type:"US",A:0.0226,B:0.0104,P:0.02},
  "US - Inverse":{type:"US",A:0.18,B:5.95,P:2},
  "US - Very Inverse":{type:"US",A:0.0963,B:3.88,P:2},
  "US - Extremely Inverse":{type:"US",A:0.0352,B:5.67,P:2},
  "US - Short-Time Inverse":{type:"US",A:0.00262,B:0.00342,P:0.02},
  // IEEE: t = TD * (A + B / (M^P - 1))
  "IEEE - Moderately Inverse":{type:"IEEE",A:0.114,B:0.0515,P:0.02},
  "IEEE - Very Inverse":{type:"IEEE",A:0.491,B:19.61,P:2},
  "IEEE - Extremely Inverse":{type:"IEEE",A:0.1217,B:28.2,P:2},
  // ANSI antiga: t = (A + B/(M-C) + D/(M-C)^2 + E/(M-C)^3) * TD
  "ANSI - Moderately Inverse":{type:"ANSI",A:0.1735,B:0.6791,C:0.8,D:-0.08,E:0.1271},
  "ANSI - Normally Inverse":{type:"ANSI",A:0.0274,B:2.2614,C:0.3,D:-4.1899,E:9.1272},
  "ANSI - Very Inverse":{type:"ANSI",A:0.0615,B:0.7989,C:0.34,D:-0.284,E:4.0505},
  "ANSI - Extremely Inverse":{type:"ANSI",A:0.0399,B:0.2294,C:0.5,D:3.0094,E:0.7222},
  // Tempo Definido
  "Tempo Definido":{type:"DT"},
};

// Compatibilidade com arquivos salvos no formato antigo de nomes de curva
const CURVE_ALIASES={
  "IEC SI (Standard)":"IEC - Standard Inverse",
  "IEC VI (Very Inv.)":"IEC - Very Inverse",
  "IEC EI (Extremely)":"IEC - Extremely Inverse",
  "IEC LTI":"IEC - Long-Time Inverse",
  "ANSI NI":"ANSI - Normally Inverse",
  "ANSI VI":"ANSI - Very Inverse",
  "ANSI EI":"ANSI - Extremely Inverse",
  "US CO8":"US - Inverse",
  "IEEE MI":"IEEE - Moderately Inverse",
};

function resolveCurveName(name){return CURVE_ALIASES[name]||name}

function calcTheoreticalTripTime(stage,currentMag){
  if(!stage.enabled||currentMag<stage.pickup)return Infinity;
  const multiple=currentMag/stage.pickup;
  if(multiple<=1)return Infinity;
  const M=Math.min(multiple,MAX_OPERATING_MULTIPLE);
  const c=CURVE_MAP[resolveCurveName(stage.curve)];
  if(!c)return Infinity;
  const td=stage.timeDial;
  switch(c.type){
    case"IEC":{const d=Math.pow(M,c.alpha)-1;return d<=0?Infinity:td*(c.k/d)}
    case"US":case"IEEE":{const d=Math.pow(M,c.P)-1;return d<=0?Infinity:td*(c.A+c.B/d)}
    case"ANSI":{const x=M-c.C;if(x<=0)return Infinity;const t=(c.A+c.B/x+c.D/(x*x)+c.E/(x*x*x))*td;return(!Number.isFinite(t)||t<=0)?Infinity:t}
    case"DT":return(!Number.isFinite(td)||td<=0)?Infinity:td;
    default:return Infinity;
  }
}

function simulateRealOperateTime(theoreticalTime){
  if(!Number.isFinite(theoreticalTime)||theoreticalTime<=0)return theoreticalTime;
  const relLimit=theoreticalTime*(RELATIVE_TIME_ERROR_PCT/100);
  const maxDev=Math.max(ABSOLUTE_TIME_ERROR_S,relLimit);
  const deviation=(Math.random()*2-1)*maxDev;
  return Math.max(0.001,theoreticalTime+deviation);
}
// ── FIM MOTOR DE PROTEÇÃO 51 ──────────────────────────────────────────────────

// ── MOTOR DE PROTEÇÃO 51N — Sobrecorrente temporizada de neutro (3I0) ─────────
const P51N_MAX_OPERATING_MULTIPLE=20;
const P51N_ABSOLUTE_TIME_ERROR_S=0.04; // 40 ms
const P51N_RELATIVE_TIME_ERROR_PCT=5;  // 5%

function calc51NTheoreticalTripTime(stage,currentMag){
  if(!stage.enabled||currentMag<stage.pickup)return Infinity;
  const multiple=currentMag/stage.pickup;
  if(multiple<=1)return Infinity;
  const M=Math.min(multiple,P51N_MAX_OPERATING_MULTIPLE);
  const c=CURVE_MAP[resolveCurveName(stage.curve)];
  if(!c)return Infinity;
  const td=stage.timeDial;
  switch(c.type){
    case"IEC":{const d=Math.pow(M,c.alpha)-1;return d<=0?Infinity:td*(c.k/d)}
    case"US":case"IEEE":{const d=Math.pow(M,c.P)-1;return d<=0?Infinity:td*(c.A+c.B/d)}
    case"ANSI":{const x=M-c.C;if(x<=0)return Infinity;const t=(c.A+c.B/x+c.D/(x*x)+c.E/(x*x*x))*td;return(!Number.isFinite(t)||t<=0)?Infinity:t}
    case"DT":return(!Number.isFinite(td)||td<=0)?Infinity:td;
    default:return Infinity;
  }
}

function simulate51NRealOperateTime(theoreticalTime){
  if(!Number.isFinite(theoreticalTime)||theoreticalTime<=0)return theoreticalTime;
  const relLimit=theoreticalTime*(P51N_RELATIVE_TIME_ERROR_PCT/100);
  const allowedDev=Math.max(P51N_ABSOLUTE_TIME_ERROR_S,relLimit);
  const deviation=(Math.random()*2-1)*allowedDev;
  return Math.max(0.000001,theoreticalTime+deviation);
}
// ── FIM MOTOR DE PROTEÇÃO 51N ─────────────────────────────────────────────────

// ── MOTOR DE PROTEÇÃO 27 — Subtensão trifásica (PHPTUV) ──────────────────────
// Lógica: Detector de Nível → Seleção de Fase (any/all) → Temporizador DT
// Tolerância: ±max(5% do ajuste, 40 ms)
const P27_ABSOLUTE_TIME_ERROR_S=0.04; // 40 ms
const P27_RELATIVE_TIME_ERROR_PCT=5;  // 5%

function check27Pickup(voltagePu,pickupPu){return voltagePu<pickupPu}

function simulate27OperateTime(timeOpS){
  const nominal=timeOpS;
  const errorBound=Math.max(nominal*P27_RELATIVE_TIME_ERROR_PCT/100,P27_ABSOLUTE_TIME_ERROR_S);
  const error=(Math.random()*2-1)*errorBound;
  return Math.max(0.01,nominal+error);
}

// Avalia se a condição de subtensão está ativa para um estágio
// voltsPu: array [Va, Vb, Vc] em pu
// Retorna { started, faultedCount }
function evaluate27Stage(stage,voltsPu,startPhases,voltageBlockPu){
  if(!stage.enabled)return{started:false,faultedCount:0,blocked:false};
  // Low-voltage block: inibe se qualquer fase cai abaixo do bloqueio
  const anyBelowBlock=voltsPu.some(v=>v<voltageBlockPu);
  if(anyBelowBlock)return{started:false,faultedCount:0,blocked:true};
  const faulted=voltsPu.map(v=>check27Pickup(v,stage.pickup));
  const numFaulted=faulted.filter(Boolean).length;
  const started=startPhases==="any"?numFaulted>=1:numFaulted===3;
  return{started,faultedCount:numFaulted,blocked:false};
}
// ── FIM MOTOR DE PROTEÇÃO 27 ──────────────────────────────────────────────────

// ── MOTOR DE PROTEÇÃO 59 — Sobretensão trifásica (PHPTOV) ────────────────────
// Lógica: Detector de Nível → Seleção de Fase (any/all) → Temporizador DT
// Tolerância: ±max(5% do ajuste, 40 ms)
const P59_ABSOLUTE_TIME_ERROR_S=0.04; // 40 ms
const P59_RELATIVE_TIME_ERROR_PCT=5;  // 5%

function check59Pickup(voltagePu,pickupPu){return voltagePu>pickupPu}

function simulate59OperateTime(timeOpS){
  const nominal=timeOpS;
  const errorBound=Math.max(nominal*P59_RELATIVE_TIME_ERROR_PCT/100,P59_ABSOLUTE_TIME_ERROR_S);
  const error=(Math.random()*2-1)*errorBound;
  return Math.max(0.01,nominal+error);
}

// Avalia se a condição de sobretensão está ativa para um estágio
function evaluate59Stage(stage,voltsPu,startPhases){
  if(!stage.enabled)return{started:false,faultedCount:0};
  const faulted=voltsPu.map(v=>check59Pickup(v,stage.pickup));
  const numFaulted=faulted.filter(Boolean).length;
  const started=startPhases==="any"?numFaulted>=1:numFaulted===3;
  return{started,faultedCount:numFaulted};
}
// ── CÁLCULO DE TENSÃO EM PU CONFORME VOLTAGE SELECTION ────────────────────────
// ph-ph: calcula Vab, Vbc, Vca (subtração fasorial) e divide por Vnom (fase-fase)
// ph-n:  usa Va, Vb, Vc e divide por Vnom/√3 (fase-neutro)
// Retorna array [V1pu, V2pu, V3pu]
function getVoltagesPu(rr,voltageSelection,vNomSec){
  const vNom=vNomSec||115;
  if(voltageSelection==="ph-ph"){
    const va=toRect(rr.voltages.Va.mag,rr.voltages.Va.ang);
    const vb=toRect(rr.voltages.Vb.mag,rr.voltages.Vb.ang);
    const vc=toRect(rr.voltages.Vc.mag,rr.voltages.Vc.ang);
    const vab=Math.sqrt((va.re-vb.re)**2+(va.im-vb.im)**2);
    const vbc=Math.sqrt((vb.re-vc.re)**2+(vb.im-vc.im)**2);
    const vca=Math.sqrt((vc.re-va.re)**2+(vc.im-va.im)**2);
    return[vab/vNom,vbc/vNom,vca/vNom];
  }
  // ph-n: referência é Vnom/√3
  const vNomPN=vNom/Math.sqrt(3);
  return[rr.voltages.Va.mag/vNomPN,rr.voltages.Vb.mag/vNomPN,rr.voltages.Vc.mag/vNomPN];
}
// ── FIM MOTOR DE PROTEÇÃO 59 ──────────────────────────────────────────────────

// ── MOTOR DE PROTEÇÃO 67 — Direcional de sobrecorrente de fase ────────────────
const P67_MAX_OPERATING_MULTIPLE=20;
const P67_ABSOLUTE_TIME_ERROR_S=0.04;  // 40 ms
const P67_RELATIVE_TIME_ERROR_PCT=5;   // 5%
const P67_ABSOLUTE_TIME_ERROR_S_DT=0.02;  // 20 ms — erro abs para tempo definido
const P67_RELATIVE_TIME_ERROR_PCT_DT=5;  // 5% — erro rel para tempo definido
const P67_TBASIC_S=0.03;                 // 30 ms — tempo teórico quando ajuste = 0
const P67_MIN_INSTANTANEOUS_S=0.02;      // 20 ms — piso absoluto
const P67_FIXED_ANGLE_ERROR_DEG=-2;    // erro angular fixo do elemento direcional
const P67_ZERO_BIAS_DEG=-0.0001;       // viés para desempate no limiar 0
const P67_VERY_SMALL_TORQUE=1e-12;

// Operações fasoriais complexas para 67
const subC=(a,b)=>({re:a.re-b.re,im:a.im-b.im});
const mulC=(a,b)=>({re:a.re*b.re-a.im*b.im,im:a.re*b.im+a.im*b.re});
const rotC=(z,deg)=>mulC(z,toRect(1,deg));
const normAng=a=>{let v=a;while(v>180)v-=360;while(v<=-180)v+=360;return v};
const toPolar=z=>({mag:Math.sqrt(z.re*z.re+z.im*z.im),ang:normAng(Math.atan2(z.im,z.re)*180/Math.PI)});

// Constrói todos os fasores necessários a partir dos dados do relé
function build67Phasors(rr){
  const IA=toRect(rr.currents.Ia.mag,rr.currents.Ia.ang);
  const IB=toRect(rr.currents.Ib.mag,rr.currents.Ib.ang);
  const IC=toRect(rr.currents.Ic.mag,rr.currents.Ic.ang);
  const VA=toRect(rr.voltages.Va.mag,rr.voltages.Va.ang);
  const VB=toRect(rr.voltages.Vb.mag,rr.voltages.Vb.ang);
  const VC=toRect(rr.voltages.Vc.mag,rr.voltages.Vc.ang);
  const IAB=subC(IA,IB),IBC=subC(IB,IC),ICA=subC(IC,IA);
  const VAB=subC(VA,VB),VBC=subC(VB,VC),VCA=subC(VC,VA);
  const a120=toRect(1,120),a240=toRect(1,240);
  const V1={re:(VA.re+mulC(a120,VB).re+mulC(a240,VC).re)/3,im:(VA.im+mulC(a120,VB).im+mulC(a240,VC).im)/3};
  const I1={re:(IA.re+mulC(a120,IB).re+mulC(a240,IC).re)/3,im:(IA.im+mulC(a120,IB).im+mulC(a240,IC).im)/3};
  return{IA,IB,IC,IAB,IBC,ICA,VA,VB,VC,VAB,VBC,VCA,V1,I1};
}

// Offset angular por método de polarização (estilo ABB)
function get67MethodOffset(pol,elem){
  if(pol==="quadratura"){
    if(elem==="A"||elem==="B"||elem==="C")return 90;
    return 0;
  }
  if(pol==="quad_loop"){
    if(["A","B","C","AB","BC","CA"].includes(elem))return 90;
    return 0;
  }
  if(pol==="seq_pos")return 0;
  if(pol==="seq_pos_loop"){
    switch(elem){
      case"A":return 0;case"B":return-120;case"C":return 120;
      case"AB":return 30;case"BC":return-90;case"CA":return 150;
      default:return 0;
    }
  }
  return 0;
}

// Constrói candidatos direcionais e avalia torque para cada elemento
function build67Candidates(rr,pol,rcaDeg,desiredDir){
  const ph=build67Phasors(rr);
  let raw=[];
  if(pol==="quadratura"){
    raw=[
      {elem:"A",iop:ph.IA,vpol:ph.VBC},
      {elem:"B",iop:ph.IB,vpol:ph.VCA},
      {elem:"C",iop:ph.IC,vpol:ph.VAB},
    ];
  }else if(pol==="quad_loop"){
    raw=[
      {elem:"A",iop:ph.IA,vpol:ph.VBC},
      {elem:"B",iop:ph.IB,vpol:ph.VCA},
      {elem:"C",iop:ph.IC,vpol:ph.VAB},
      {elem:"AB",iop:ph.IAB,vpol:subC(ph.VBC,ph.VCA)},
      {elem:"BC",iop:ph.IBC,vpol:subC(ph.VCA,ph.VAB)},
      {elem:"CA",iop:ph.ICA,vpol:subC(ph.VAB,ph.VBC)},
    ];
  }else if(pol==="seq_pos"){
    raw=[{elem:"V1",iop:ph.I1,vpol:ph.V1}];
  }else if(pol==="seq_pos_loop"){
    raw=[
      {elem:"A",iop:ph.IA,vpol:ph.V1},
      {elem:"B",iop:ph.IB,vpol:rotC(ph.V1,-120)},
      {elem:"C",iop:ph.IC,vpol:rotC(ph.V1,120)},
      {elem:"AB",iop:ph.IAB,vpol:rotC(ph.V1,30)},
      {elem:"BC",iop:ph.IBC,vpol:rotC(ph.V1,-90)},
      {elem:"CA",iop:ph.ICA,vpol:rotC(ph.V1,150)},
    ];
  }
  const isSeq=pol==="seq_pos"||pol==="seq_pos_loop";
  return raw.map(c=>{
    const iopP=toPolar(c.iop),vpolP=toPolar(c.vpol);
    let angleDeg=0,torque=0,dir="REVERSE",pass=false;
    const offset=get67MethodOffset(pol,c.elem);
    if(iopP.mag>0&&vpolP.mag>0){
      const rcaSign=isSeq?+1:-1;
      angleDeg=normAng(vpolP.ang-iopP.ang+rcaSign*rcaDeg+offset+P67_FIXED_ANGLE_ERROR_DEG);
      torque=vpolP.mag*iopP.mag*Math.cos(toRad(angleDeg));
      if(Math.abs(torque)<P67_VERY_SMALL_TORQUE){
        angleDeg=normAng(angleDeg+P67_ZERO_BIAS_DEG);
        torque=vpolP.mag*iopP.mag*Math.cos(toRad(angleDeg));
      }
      dir=torque>=0?"FORWARD":"REVERSE";
      const wanted=desiredDir||"forward";
      pass=(wanted==="forward"&&dir==="FORWARD")||(wanted==="reverse"&&dir==="REVERSE");
    }
    return{elem:c.elem,iMag:iopP.mag,iAng:iopP.ang,vMag:vpolP.mag,vAng:vpolP.ang,angleDeg,torque,dir,pass};
  });
}

// Avalia um estágio 67 completo: direcionalidade + pickup + tempo de curva
// Retorna {tripped, currentUsed, theoreticalTime, simulatedTime, reason}
function evaluate67Stage(stage,rr){
  if(!stage.enabled)return{tripped:false,currentUsed:0,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"disabled"};
  const rcaDeg=(typeof stage.mta==="number"&&Number.isFinite(stage.mta))?stage.mta:45;
  const candidates=build67Candidates(rr,stage.pol||"quadratura",rcaDeg,stage.dir||"forward");
  // Filtrar: acima do pickup E direção FORWARD
  const valid=candidates.filter(c=>c.iMag>=stage.pickup&&c.pass);
  if(valid.length===0){
    const abovePickup=candidates.filter(c=>c.iMag>=stage.pickup);
    if(abovePickup.length===0)return{tripped:false,currentUsed:0,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"below pickup"};
    return{tripped:false,currentUsed:0,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"blocked by direction"};
  }
  const cv=CURVE_MAP[resolveCurveName(stage.curve)];
  const isDT=cv&&cv.type==="DT";
  // Tempo Definido: lógica própria da 67 (mesmo modelo da instantânea)
  if(isDT){
    const adjustedTime=stage.timeDial||0;
    const tTheo=adjustedTime===0?P67_TBASIC_S:adjustedTime;
    let tMin,tMax;
    if(adjustedTime===0){tMin=P67_MIN_INSTANTANEOUS_S;tMax=P67_TBASIC_S}
    else{const relL=tTheo*(P67_RELATIVE_TIME_ERROR_PCT_DT/100);const dev=Math.max(P67_ABSOLUTE_TIME_ERROR_S_DT,relL);tMin=Math.max(P67_MIN_INSTANTANEOUS_S,tTheo-dev);tMax=tTheo+dev}
    const simTime=tMin+Math.random()*(tMax-tMin);
    const w=valid[0];
    return{tripped:true,currentUsed:w.iMag,theoreticalTime:tTheo,simulatedTime:simTime,elem:w.elem,dir:w.dir,reason:null};
  }
  // Curvas inversas
  if(!cv)return{tripped:false,currentUsed:0,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"curve error"};
  const evaluated=valid.map(c=>{
    const multiple=c.iMag/stage.pickup;
    const M=Math.min(multiple,P67_MAX_OPERATING_MULTIPLE);
    const td=stage.timeDial;
    let tTheo=Infinity;
    switch(cv.type){
      case"IEC":{const d=Math.pow(M,cv.alpha)-1;if(d>0)tTheo=td*(cv.k/d);break}
      case"US":case"IEEE":{const d=Math.pow(M,cv.P)-1;if(d>0)tTheo=td*(cv.A+cv.B/d);break}
      case"ANSI":{const x=M-cv.C;if(x>0){const t=(cv.A+cv.B/x+cv.D/(x*x)+cv.E/(x*x*x))*td;if(Number.isFinite(t)&&t>0)tTheo=t}break}
    }
    if(!Number.isFinite(tTheo)||tTheo<=0)return null;
    return{...c,multiple,tTheo};
  }).filter(Boolean);
  if(evaluated.length===0)return{tripped:false,currentUsed:0,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"curve error"};
  evaluated.sort((a,b)=>a.tTheo-b.tTheo);
  const w=evaluated[0];
  const relLimit=w.tTheo*(P67_RELATIVE_TIME_ERROR_PCT/100);
  const allowedDev=Math.max(P67_ABSOLUTE_TIME_ERROR_S,relLimit);
  const deviation=(Math.random()*2-1)*allowedDev;
  const simTime=Math.max(0.000001,w.tTheo+deviation);
  return{tripped:true,currentUsed:w.iMag,theoreticalTime:w.tTheo,simulatedTime:simTime,elem:w.elem,dir:w.dir,reason:null};
}

// Calcula tempo teórico da 67 para o acumulador (sem aleatoriedade)
// Retorna Infinity se direção bloquear ou corrente abaixo do pickup
function calc67TheoreticalTripTime(stage,rr){
  const result=evaluate67Stage(stage,rr);
  return result.tripped?result.theoreticalTime:Infinity;
}

// Calcula tempo simulado da 67 para modo direto (com aleatoriedade)
function calc67TripTimeReal(stage,rr){
  const result=evaluate67Stage(stage,rr);
  return result.tripped?result.simulatedTime:Infinity;
}
// ── FIM MOTOR DE PROTEÇÃO 67 ──────────────────────────────────────────────────

// ── MOTOR DE PROTEÇÃO 67N — Direcional de sobrecorrente de neutro (3I0/3V0) ───
const P67N_MAX_OPERATING_MULTIPLE=20;
const P67N_ABSOLUTE_TIME_ERROR_S=0.04;  // 40 ms — curvas inversas
const P67N_RELATIVE_TIME_ERROR_PCT=5;   // 5%
const P67N_ABSOLUTE_TIME_ERROR_S_DT=0.02;  // 20 ms — tempo definido
const P67N_RELATIVE_TIME_ERROR_PCT_DT=5;   // 5%
const P67N_TBASIC_S=0.03;                  // 30 ms
const P67N_MIN_INSTANTANEOUS_S=0.02;       // 20 ms — piso absoluto
const P67N_FIXED_ANGLE_ERROR_DEG=-2;
const P67N_ZERO_BIAS_DEG=-0.0001;
const P67N_VERY_SMALL_TORQUE=1e-12;

// Avalia direcionalidade 67N: usa 3I0 como operação e 3V0 ou −3V0 como polarização
function evaluate67NDirectional(rr,pol,rcaDeg,desiredDir){
  const I0=calc3(rr.currents,["Ia","Ib","Ic"]);
  const V0=calc3(rr.voltages,["Va","Vb","Vc"]);
  const i0c=toRect(I0.mag,I0.ang);
  const v0c=toRect(V0.mag,V0.ang);
  const vPolC=pol==="-V0"?{re:-v0c.re,im:-v0c.im}:v0c;
  const vPolP=toPolar(vPolC);
  let angleDeg=0,torque=0,dir="REVERSE",pass=false;
  if(I0.mag>0&&vPolP.mag>0){
    angleDeg=normAng(vPolP.ang-I0.ang+rcaDeg+P67N_FIXED_ANGLE_ERROR_DEG);
    torque=vPolP.mag*I0.mag*Math.cos(toRad(angleDeg));
    if(Math.abs(torque)<P67N_VERY_SMALL_TORQUE){
      angleDeg=normAng(angleDeg+P67N_ZERO_BIAS_DEG);
      torque=vPolP.mag*I0.mag*Math.cos(toRad(angleDeg));
    }
    dir=torque>=0?"FORWARD":"REVERSE";
    const wanted=desiredDir||"forward";
    pass=(wanted==="forward"&&dir==="FORWARD")||(wanted==="reverse"&&dir==="REVERSE");
  }
  return{i0Mag:I0.mag,i0Ang:I0.ang,v0Mag:V0.mag,v0Ang:V0.ang,vPolMag:vPolP.mag,angleDeg,torque,dir,pass};
}

// Avalia estágio 67N completo: direcionalidade + pickup + tensão mínima + curva
function evaluate67NStage(stage,rr){
  if(!stage.enabled)return{tripped:false,currentUsed:0,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"disabled"};
  const rcaDeg=(typeof stage.mta==="number"&&Number.isFinite(stage.mta))?stage.mta:45;
  const d=evaluate67NDirectional(rr,stage.pol||"-V0",rcaDeg,stage.dir||"forward");
  if(d.i0Mag<stage.pickup)return{tripped:false,currentUsed:d.i0Mag,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"3I0 below pickup"};
  const minPolV=stage.minPolV||1;
  if(d.vPolMag<minPolV)return{tripped:false,currentUsed:d.i0Mag,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"Vpol < Vmin"};
  if(!d.pass)return{tripped:false,currentUsed:d.i0Mag,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"blocked by direction",dir:d.dir};
  const cv=CURVE_MAP[resolveCurveName(stage.curve)];
  const isDT=cv&&cv.type==="DT";
  // Tempo Definido: lógica própria da 67N (mesmo modelo da instantânea de neutro)
  if(isDT){
    const adjustedTime=stage.timeDial||0;
    const tTheo=adjustedTime===0?P67N_TBASIC_S:adjustedTime;
    let tMin,tMax;
    if(adjustedTime===0){tMin=P67N_MIN_INSTANTANEOUS_S;tMax=P67N_TBASIC_S}
    else{const relL=tTheo*(P67N_RELATIVE_TIME_ERROR_PCT_DT/100);const dev=Math.max(P67N_ABSOLUTE_TIME_ERROR_S_DT,relL);tMin=Math.max(P67N_MIN_INSTANTANEOUS_S,tTheo-dev);tMax=tTheo+dev}
    const simTime=tMin+Math.random()*(tMax-tMin);
    return{tripped:true,currentUsed:d.i0Mag,theoreticalTime:tTheo,simulatedTime:simTime,dir:d.dir,reason:null};
  }
  // Curvas inversas
  if(!cv)return{tripped:false,currentUsed:d.i0Mag,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"curve error"};
  const multiple=d.i0Mag/stage.pickup;
  const M=Math.min(multiple,P67N_MAX_OPERATING_MULTIPLE);
  const td=stage.timeDial;
  let tTheo=Infinity;
  switch(cv.type){
    case"IEC":{const dn=Math.pow(M,cv.alpha)-1;if(dn>0)tTheo=td*(cv.k/dn);break}
    case"US":case"IEEE":{const dn=Math.pow(M,cv.P)-1;if(dn>0)tTheo=td*(cv.A+cv.B/dn);break}
    case"ANSI":{const x=M-cv.C;if(x>0){const t=(cv.A+cv.B/x+cv.D/(x*x)+cv.E/(x*x*x))*td;if(Number.isFinite(t)&&t>0)tTheo=t}break}
  }
  if(!Number.isFinite(tTheo)||tTheo<=0)return{tripped:false,currentUsed:d.i0Mag,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"curve error"};
  const relLimit=tTheo*(P67N_RELATIVE_TIME_ERROR_PCT/100);
  const allowedDev=Math.max(P67N_ABSOLUTE_TIME_ERROR_S,relLimit);
  const deviation=(Math.random()*2-1)*allowedDev;
  const simTime=Math.max(0.000001,tTheo+deviation);
  return{tripped:true,currentUsed:d.i0Mag,theoreticalTime:tTheo,simulatedTime:simTime,dir:d.dir,reason:null};
}

function calc67NTheoreticalTripTime(stage,rr){
  const result=evaluate67NStage(stage,rr);
  return result.tripped?result.theoreticalTime:Infinity;
}

function calc67NTripTimeReal(stage,rr){
  const result=evaluate67NStage(stage,rr);
  return result.tripped?result.simulatedTime:Infinity;
}
// ── FIM MOTOR DE PROTEÇÃO 67N ─────────────────────────────────────────────────

// ── I2 (negative sequence current) from symmetrical components ────────────────
function calcI2(currents){
  const a2r=Math.cos(2*Math.PI/3),a2i=-Math.sin(2*Math.PI/3); // a² = e^(-j120°)
  const a1r=Math.cos(4*Math.PI/3),a1i=-Math.sin(4*Math.PI/3); // a  = e^(-j240°)
  const Ia=toRect(currents.Ia.mag,currents.Ia.ang);
  const Ib=toRect(currents.Ib.mag,currents.Ib.ang);
  const Ic=toRect(currents.Ic.mag,currents.Ic.ang);
  const re=(Ia.re+(a1r*Ib.re-a1i*Ib.im)+(a2r*Ic.re-a2i*Ic.im))/3;
  const im=(Ia.im+(a1r*Ib.im+a1i*Ib.re)+(a2r*Ic.im+a2i*Ic.re))/3;
  return fromRect(re,im);
}
// ── FIM I2 ────────────────────────────────────────────────────────────────────

const deepClone=o=>JSON.parse(JSON.stringify(o));

// ── PRESETS DE TESTE ──────────────────────────────────────────────────────────
// fns: funções habilitadas | stages: {fid:[índices habilitados]} | patch: overrides extra
// out/inp: matrizes esparsas (só os true) — refletem Interface CB preset no campo
const TEST_PRESETS=[
  {id:'oc_ph',   label:'51/50 Fase',
   desc:'Sobrecorrente temporizada + instantânea de fase',
   fns:['51','50'],
   stages:{'51':[0],'50':[0]},
   out:{'51-1':{BO3:true,L4:true},'50-1':{BO3:true,L3:true},'CB_Opened':{L1:true},'CB_Closed':{L2:true}},
   inp:{'CB_Opened':{BI3:true},'CB_Closed':{BI2:true}}},

  {id:'oc_neu',  label:'51N/50N Neutro',
   desc:'Sobrecorrente de neutro temporizada + instantânea',
   fns:['51N','50N'],
   stages:{'51N':[0],'50N':[0]},
   out:{'51N-1':{BO3:true,L4:true},'50N-1':{BO3:true,L3:true},'CB_Opened':{L1:true},'CB_Closed':{L2:true}},
   inp:{'CB_Opened':{BI3:true},'CB_Closed':{BI2:true}}},

  {id:'oc_all',  label:'50/51/50N/51N',
   desc:'Sobrecorrente completa — fase + neutro',
   fns:['51','50','51N','50N'],
   stages:{'51':[0],'50':[0],'51N':[0],'50N':[0]},
   out:{'51-1':{BO3:true,L4:true},'50-1':{BO3:true,L3:true},'51N-1':{BO4:true,L6:true},'50N-1':{BO4:true,L5:true},'CB_Opened':{L1:true},'CB_Closed':{L2:true}},
   inp:{'CB_Opened':{BI3:true},'CB_Closed':{BI2:true}}},

  {id:'dir_ph',  label:'67 Direcional',
   desc:'Sobrecorrente direcional de fase (pol. quadratura, MTA −45°)',
   fns:['67'],
   stages:{'67':[0]},
   out:{'67-1':{BO3:true,L3:true},'CB_Opened':{L1:true},'CB_Closed':{L2:true}},
   inp:{'CB_Opened':{BI3:true},'CB_Closed':{BI2:true}}},

  {id:'dir_neu', label:'67N Direcional N',
   desc:'Sobrecorrente direcional de neutro (pol. −V₀)',
   fns:['67N'],
   stages:{'67N':[0]},
   patch:{'67N':{stages:[{pol:'-V0'}]}},
   out:{'67N-1':{BO3:true,L3:true},'CB_Opened':{L1:true},'CB_Closed':{L2:true}},
   inp:{'CB_Opened':{BI3:true},'CB_Closed':{BI2:true}}},

  {id:'volt_2759',label:'27/59 Tensão',
   desc:'Subtensão e sobretensão (fase-terra)',
   fns:['27/59'],
   stages:{'27/59':{s27:[0],s59:[0]}},
   out:{'27-1':{BO3:true,L3:true},'59-1':{BO3:true,L5:true},'CB_Opened':{L1:true},'CB_Closed':{L2:true}},
   inp:{'CB_Opened':{BI3:true},'CB_Closed':{BI2:true}}},

  {id:'seq_v47', label:'47 Seq.V',
   desc:'Tensão de sequência negativa V₂',
   fns:['47'],
   stages:{'47':[0]},
   out:{'47-1':{BO3:true,L3:true},'CB_Opened':{L1:true},'CB_Closed':{L2:true}},
   inp:{'CB_Opened':{BI3:true},'CB_Closed':{BI2:true}}},

  {id:'seq_i46', label:'46 Seq.I',
   desc:'Sobrecorrente de sequência negativa I₂',
   fns:['46'],
   stages:{'46':[0]},
   out:{'46-1':{BO3:true,L3:true},'CB_Opened':{L1:true},'CB_Closed':{L2:true}},
   inp:{'CB_Opened':{BI3:true},'CB_Closed':{BI2:true}}},

  {id:'freq81', label:'81U Freq',
   desc:'Subfrequência 81U (3 estágios)',
   fns:['81'],
   stages:{'81':{s81u:[0],s81o:[]}},
   out:{'81U-1':{BO3:true,L3:true},'CB_Opened':{L1:true},'CB_Closed':{L2:true}},
   inp:{'CB_Opened':{BI3:true},'CB_Closed':{BI2:true}}},

  {id:'rev_pwr32', label:'32R Pot.Rev.',
   desc:'Potência reversa (32R) — protege geradores contra motorização',
   fns:['32'],
   stages:{'32':{s32r:[0],s32f:[]}},
   out:{'32R-1':{BO3:true,L3:true},'CB_Opened':{L1:true},'CB_Closed':{L2:true}},
   inp:{'CB_Opened':{BI3:true},'CB_Closed':{BI2:true}}},

  {id:'ar79_51', label:'79+51/50',
   desc:'Auto-reclose com sobrecorrente de fase (3 shots)',
   fns:['51','50','79'],
   stages:{'51':[0],'50':[0]},
   out:{'51-1':{BO3:true,L4:true},'50-1':{BO3:true,L3:true},'CB_Opened':{L1:true},'CB_Closed':{L2:true}},
   inp:{'CB_Opened':{BI3:true},'CB_Closed':{BI2:true}}},
];
const fmtTs=()=>{const d=new Date();const p2=v=>String(v).padStart(2,'0');const p3=v=>String(v).padStart(3,'0');return`${p2(d.getDate())}:${p2(d.getMonth()+1)}:${d.getFullYear()}-${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${p3(d.getMilliseconds())}`};
const nowShort=()=>new Date().toLocaleTimeString('pt-BR',{hour12:false});

// ── SAVE / LOAD FILE ──────────────────────────────────────────────────────────
const FILE_HEADER='# RELAYLAB 360 — Parametrization File';
const FILE_VERSION='v1.0';

function buildSaveContent(sys,prot,outMatrix,wiring){
  const lines=[FILE_HEADER,`# Version: ${FILE_VERSION}`,`# Date: ${new Date().toISOString()}`,''];

  // ── SYSTEM PARAMETERS
  lines.push('[SYSTEM]');
  lines.push(`TP_PRI_V=${sys.tp.priV}`);
  lines.push(`TP_SEC_V=${sys.tp.secV}`);
  lines.push(`TP_PRI_CONN=${sys.tp.priConn}`);
  lines.push(`TP_SEC_CONN=${sys.tp.secConn}`);
  lines.push(`TC_PRI_A=${sys.tc.priA}`);
  lines.push(`TC_SEC_A=${sys.tc.secA}`);
  lines.push('');

  // ── PROTECTION FUNCTIONS
  const protKeys=["51","50","51N","50N","67","67N","27/59","47","46","81","32","79"];
  protKeys.forEach(fid=>{
    const fn=prot[fid];if(!fn)return;
    lines.push(`[PROT:${fid}]`);
    lines.push(`ENABLED=${fn.enabled}`);
    if(fn.base!==undefined)lines.push(`BASE=${fn.base}`);
    if(fid==="27/59"){
      if(fn.startPhases!==undefined)lines.push(`START_PHASES=${fn.startPhases}`);
      if(fn.voltageSelection!==undefined)lines.push(`VOLTAGE_SELECTION=${fn.voltageSelection}`);
      if(fn.hysteresis!==undefined)lines.push(`HYSTERESIS=${fn.hysteresis}`);
      if(fn.lowVoltageBlockEnabled!==undefined)lines.push(`LOW_V_BLOCK_ENABLED=${fn.lowVoltageBlockEnabled}`);
      if(fn.voltageBlockPu!==undefined)lines.push(`VOLTAGE_BLOCK_PU=${fn.voltageBlockPu}`);
      (fn.stages27||[]).forEach((s,i)=>{
        lines.push(`STAGE27_${i}=${s.id}|${s.enabled}|${s.pickup}|${s.timeOp}`);
      });
      (fn.stages59||[]).forEach((s,i)=>{
        lines.push(`STAGE59_${i}=${s.id}|${s.enabled}|${s.pickup}|${s.timeOp}`);
      });
    }else if(fid==="47"||fid==="46"){
      (fn.stages||[]).forEach((s,i)=>{
        lines.push(`STAGE_${i}=${s.id}|${s.enabled}|${s.pickup}|${s.timeOp}`);
      });
    }else if(fid==="81"){
      (fn.stages81u||[]).forEach((s,i)=>{lines.push(`STAGE81U_${i}=${s.id}|${s.enabled}|${s.pickup}|${s.timeOp}`);});
      (fn.stages81o||[]).forEach((s,i)=>{lines.push(`STAGE81O_${i}=${s.id}|${s.enabled}|${s.pickup}|${s.timeOp}`);});
    }else if(fid==="32"){
      (fn.stages32r||[]).forEach((s,i)=>{lines.push(`STAGE32R_${i}=${s.id}|${s.enabled}|${s.pickup}|${s.timeOp}`);});
      (fn.stages32f||[]).forEach((s,i)=>{lines.push(`STAGE32F_${i}=${s.id}|${s.enabled}|${s.pickup}|${s.timeOp}`);});
    }else if(fid==="79"){
      lines.push(`SHOTS=${fn.shots??3}`);
      lines.push(`DEAD_TIMES=${(fn.deadTimes||[0.5,5.0,15.0]).join(",")}`);
      lines.push(`RECLAIM_TIME=${fn.reclaimTime??3.0}`);
    }else if(fid==="67"||fid==="67N"){
      (fn.stages||[]).forEach((s,i)=>{
        lines.push(`STAGE_${i}=${s.id}|${s.enabled}|${s.pickup}|${s.timeDial}|${s.curve}|${s.timeOp}|${s.mta}|${s.pol}|${s.minPolV||1}|${s.dir||"forward"}`);
      });
    }else{
      (fn.stages||[]).forEach((s,i)=>{
        lines.push(`STAGE_${i}=${s.id}|${s.enabled}|${s.pickup}|${s.timeDial}|${s.curve}|${s.timeOp}`);
      });
    }
    lines.push('');
  });

  // ── OUTPUT MATRIX (only true values to keep file compact)
  lines.push('[OUTPUT_MATRIX]');
  Object.keys(outMatrix).forEach(row=>{
    Object.keys(outMatrix[row]).forEach(col=>{
      if(outMatrix[row][col])lines.push(`${row}:${col}=1`);
    });
  });
  lines.push('');

  // ── CAMPO WIRING
  if(wiring){
    lines.push('[WIRING]');
    const sw=wiring.switchSt||{};
    Object.keys(sw).forEach(k=>lines.push(`SWITCH_${k}=${sw[k]}`));
    (wiring.connections||[]).forEach((c,i)=>lines.push(`CONN_${i}=${c.from}|${c.to}`));
    lines.push('');
  }

  return lines.join('\n');
}

function parseSaveFile(text,currentProt,currentMatrix){
  const sys={tp:{priV:13800,secV:115,priConn:'estrela',secConn:'estrela'},tc:{priA:600,secA:5}};
  const prot=deepClone(currentProt);
  const matrix=deepClone(currentMatrix);
  // Reset matrix to all false
  Object.keys(matrix).forEach(r=>{Object.keys(matrix[r]).forEach(c=>{matrix[r][c]=false;});});
  const wiring={switchSt:{},connections:[]};let connIdx=0;

  let section='';
  let currentFid='';
  const lines=text.split('\n');

  for(const raw of lines){
    const line=raw.trim();
    if(!line||line.startsWith('#'))continue;

    // Section header
    if(line.startsWith('[')){
      const m=line.match(/^\[(.+)\]$/);
      if(m){
        section=m[1];
        if(section.startsWith('PROT:')){currentFid=section.replace('PROT:','');}
      }
      continue;
    }

    const eq=line.indexOf('=');
    if(eq<0)continue;
    const key=line.substring(0,eq).trim();
    const val=line.substring(eq+1).trim();

    if(section==='SYSTEM'){
      if(key==='TP_PRI_V')sys.tp.priV=parseFloat(val);
      else if(key==='TP_SEC_V')sys.tp.secV=parseFloat(val);
      else if(key==='TP_PRI_CONN')sys.tp.priConn=val;
      else if(key==='TP_SEC_CONN')sys.tp.secConn=val;
      else if(key==='TC_PRI_A')sys.tc.priA=parseFloat(val);
      else if(key==='TC_SEC_A')sys.tc.secA=parseFloat(val);
    }
    else if(section.startsWith('PROT:')&&prot[currentFid]){
      const fn=prot[currentFid];
      if(key==='ENABLED')fn.enabled=val==='true';
      else if(key==='BASE')fn.base=val;
      else if(key==='INHIBIT_NO_VOLTAGE')fn.inhibitNoVoltage=val==='true';
      else if(key==='START_PHASES')fn.startPhases=val;
      else if(key==='VOLTAGE_SELECTION')fn.voltageSelection=val;
      else if(key==='HYSTERESIS')fn.hysteresis=parseFloat(val);
      else if(key==='LOW_V_BLOCK_ENABLED')fn.lowVoltageBlockEnabled=val==='true';
      else if(key==='VOLTAGE_BLOCK_PU')fn.voltageBlockPu=parseFloat(val);
      else if(key.startsWith('STAGE27_')){
        const idx=parseInt(key.replace('STAGE27_',''));
        const p=val.split('|');if(fn.stages27&&fn.stages27[idx]){
          fn.stages27[idx].id=p[0];fn.stages27[idx].enabled=p[1]==='true';
          fn.stages27[idx].pickup=parseFloat(p[2]);fn.stages27[idx].timeOp=parseFloat(p[3]);
        }
      }
      else if(key.startsWith('STAGE59_')){
        const idx=parseInt(key.replace('STAGE59_',''));
        const p=val.split('|');if(fn.stages59&&fn.stages59[idx]){
          fn.stages59[idx].id=p[0];fn.stages59[idx].enabled=p[1]==='true';
          fn.stages59[idx].pickup=parseFloat(p[2]);fn.stages59[idx].timeOp=parseFloat(p[3]);
        }
      }
      else if(key.startsWith('STAGE81U_')){
        const idx=parseInt(key.replace('STAGE81U_',''));
        const p=val.split('|');if(fn.stages81u&&fn.stages81u[idx]){
          fn.stages81u[idx].id=p[0];fn.stages81u[idx].enabled=p[1]==='true';
          fn.stages81u[idx].pickup=parseFloat(p[2]);fn.stages81u[idx].timeOp=parseFloat(p[3]);
        }
      }
      else if(key.startsWith('STAGE32R_')){
        const idx=parseInt(key.replace('STAGE32R_',''));
        const p=val.split('|');if(fn.stages32r&&fn.stages32r[idx]){
          fn.stages32r[idx].id=p[0];fn.stages32r[idx].enabled=p[1]==='true';
          fn.stages32r[idx].pickup=parseFloat(p[2]);fn.stages32r[idx].timeOp=parseFloat(p[3]);
        }
      }
      else if(key.startsWith('STAGE32F_')){
        const idx=parseInt(key.replace('STAGE32F_',''));
        const p=val.split('|');if(fn.stages32f&&fn.stages32f[idx]){
          fn.stages32f[idx].id=p[0];fn.stages32f[idx].enabled=p[1]==='true';
          fn.stages32f[idx].pickup=parseFloat(p[2]);fn.stages32f[idx].timeOp=parseFloat(p[3]);
        }
      }
      else if(key==='SHOTS')fn.shots=parseInt(val);
      else if(key==='DEAD_TIMES')fn.deadTimes=val.split(',').map(Number);
      else if(key==='RECLAIM_TIME')fn.reclaimTime=parseFloat(val);
      else if(key.startsWith('STAGE81O_')){
        const idx=parseInt(key.replace('STAGE81O_',''));
        const p=val.split('|');if(fn.stages81o&&fn.stages81o[idx]){
          fn.stages81o[idx].id=p[0];fn.stages81o[idx].enabled=p[1]==='true';
          fn.stages81o[idx].pickup=parseFloat(p[2]);fn.stages81o[idx].timeOp=parseFloat(p[3]);
        }
      }
      else if(key.startsWith('STAGE_')){
        const idx=parseInt(key.replace('STAGE_',''));
        const p=val.split('|');if(fn.stages&&fn.stages[idx]){
          fn.stages[idx].id=p[0];fn.stages[idx].enabled=p[1]==='true';
          fn.stages[idx].pickup=parseFloat(p[2]);
          if(currentFid==='47'||currentFid==='46'){
            fn.stages[idx].timeOp=parseFloat(p[3]);
          }else if(currentFid==='67'||currentFid==='67N'){
            fn.stages[idx].timeDial=parseFloat(p[3]);fn.stages[idx].curve=resolveCurveName(p[4]);
            fn.stages[idx].timeOp=parseFloat(p[5]);fn.stages[idx].mta=parseFloat(p[6]);fn.stages[idx].pol=p[7];
            if(p[8]!==undefined)fn.stages[idx].minPolV=parseFloat(p[8]);
            if(p[9]!==undefined)fn.stages[idx].dir=p[9];
          }else{
            fn.stages[idx].timeDial=parseFloat(p[3]);fn.stages[idx].curve=resolveCurveName(p[4]);fn.stages[idx].timeOp=parseFloat(p[5]);
          }
        }
      }
    }
    else if(section==='OUTPUT_MATRIX'){
      const cm=key.split(':');if(cm.length===2){
        const[row,col]=cm;
        if(matrix[row]&&matrix[row][col]!==undefined)matrix[row][col]=true;
      }
    }
    else if(section==='WIRING'){
      if(key.startsWith('SWITCH_')){wiring.switchSt[key.replace('SWITCH_','')]=val;}
      else if(key.startsWith('CONN_')){
        const[from,to]=val.split('|');
        if(from&&to){wiring.connections.push({from,to});connIdx++;}
      }
    }
  }
  const hasWiring=Object.keys(wiring.switchSt).length>0||wiring.connections.length>0;
  return{sys,prot,outMatrix:matrix,wiring:hasWiring?wiring:null};
}

const S=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Rajdhani:wght@500;600;700&display=swap');
:root{--bg:#0e1015;--card:#181b22;--card2:#1e2129;--card3:#252830;--bdr:rgba(255,255,255,.06);--orange:#f97316;--orange-dim:rgba(249,115,22,.12);--cyan:#0ea5e9;--cyan-dim:rgba(14,165,233,.1);--lav:#c4b5fd;--warm:#fde68a;--warm-dim:rgba(253,230,138,.1);--rose:#fda4af;--sky:#7dd3fc;--sky-dim:rgba(125,211,252,.1);--red:#f87171;--red-dim:rgba(248,113,113,.1);--green:#4ade80;--green-dim:rgba(74,222,128,.12);--amber:#fbbf24;--amber-dim:rgba(251,191,36,.1);--tx:#f0f0f5;--tx2:#9ca3b0;--tx3:#5c6370;--fi:'Inter',sans-serif;--fm:'JetBrains Mono',monospace;--fh:'Rajdhani',sans-serif;--r:16px;--rs:12px}
*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:10px}
body,html,#root{font-family:var(--fi);background:var(--bg);color:var(--tx);height:100%;overflow:hidden}
.app{height:100vh;display:flex;flex-direction:column;padding:10px;gap:10px;overflow:hidden}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:var(--card);border-radius:var(--r);flex-shrink:0}
.tb-l{display:flex;align-items:center;gap:14px}.tb-ico{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tb-t{font-size:18px;font-weight:800;color:var(--tx);letter-spacing:-.5px}.tb-t span{color:var(--orange)}.tb-s{font-size:11px;color:var(--tx3);font-weight:500;letter-spacing:.5px}
.tb-r{display:flex;align-items:center;gap:12px}
.nav-pills{display:flex;gap:4px;background:var(--card2);border-radius:10px;padding:3px}
.nav-pill{padding:7px 20px;border:none;border-radius:8px;background:transparent;color:var(--tx3);font-size:12px;font-weight:700;font-family:var(--fh);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;transition:all .2s;white-space:nowrap}.nav-pill:hover{color:var(--tx2)}.nav-pill.on{background:var(--orange);color:#0e1015}
.tb-status{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--tx2);font-weight:600}.tb-dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green)}
.slide-vp{flex:1;overflow:hidden;position:relative;min-height:0}.slide-tk{display:flex;height:100%;transition:transform .45s cubic-bezier(.4,0,.2,1);will-change:transform}.slide-pg{min-width:100%;width:100%;height:100%;flex-shrink:0;overflow:hidden}
.campo-pg{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px}
.relay-pg{height:100%;display:flex;flex-direction:column;gap:10px;overflow:hidden}
.main{flex:1;display:grid;grid-template-columns:260px 1fr 330px;gap:10px;min-height:0;overflow:hidden}
.col{display:flex;flex-direction:column;gap:10px;min-height:0;overflow-y:auto;overflow-x:hidden;padding-right:2px}
.ccol{display:flex;flex-direction:column;gap:10px;min-height:0;overflow:hidden}.ccol-top{flex:1 1 auto;min-height:200px;display:flex;flex-direction:column;overflow:hidden}
.ccol-mid{display:grid;grid-template-columns:1fr 1fr;gap:10px;flex-shrink:0}.ccol-bot{display:grid;grid-template-columns:1fr 1fr;gap:10px;flex-shrink:0}
.rcol{display:flex;flex-direction:column;gap:10px;min-height:0;overflow-y:auto;overflow-x:hidden}
.card{background:var(--card);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column}.card-scroll{flex:1;min-height:0;overflow-y:auto}
.ph{padding:9px 14px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;font-family:var(--fh);display:flex;align-items:center;border-bottom:1px solid var(--bdr);flex-shrink:0}
.bar{width:4px;height:18px;border-radius:2px;margin-right:10px;flex-shrink:0}.bar-warm{background:var(--warm)}.bar-lav{background:var(--lav)}.bar-mint{background:var(--orange)}.bar-orange{background:var(--orange)}.bar-sky{background:var(--sky)}.bar-rose{background:var(--rose)}.bar-green{background:var(--green)}.ph-t{color:var(--tx)}
.cp{padding:12px 14px}.fr{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px}.fg{display:flex;flex-direction:column;gap:3px}
.fl{font-size:10px;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.8px}
.ib{display:flex;align-items:center;background:var(--card2);border-radius:var(--rs);overflow:hidden;border:1px solid transparent}.ib:focus-within{border-color:rgba(249,115,22,.3);box-shadow:0 0 0 3px rgba(249,115,22,.08)}
.iu{padding:7px 9px;font-size:10px;color:var(--tx3);min-width:24px;text-align:center;font-family:var(--fm);background:rgba(0,0,0,.2);border-right:1px solid var(--bdr)}
.iv{background:transparent;border:none;color:var(--cyan);padding:7px 10px;font-size:13px;font-family:var(--fm);width:100%;outline:none;text-align:right;font-weight:600}.iv.warm{color:var(--warm)}
select.sl{background:var(--card2);border:1px solid transparent;color:var(--tx);padding:7px 10px;border-radius:var(--rs);font-size:11px;font-family:var(--fi);width:100%;outline:none;cursor:pointer;font-weight:500}
.conn-r{display:flex;gap:4px;margin-bottom:4px}.conn-b{flex:1;padding:6px;border:1px solid var(--bdr);background:var(--card2);color:var(--tx3);border-radius:var(--rs);cursor:pointer;font-size:11px;font-family:var(--fi);text-align:center;font-weight:600;transition:all .2s}.conn-b.on{background:var(--orange-dim);border-color:rgba(249,115,22,.25);color:var(--orange)}
.ratio{font-size:14px;font-weight:800;color:var(--cyan);font-family:var(--fm);text-align:center;padding:8px;margin-top:4px;background:var(--cyan-dim);border-radius:var(--rs)}.sep{height:1px;background:var(--bdr);margin:10px 0}
.wf-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:1000;display:flex;align-items:center;justify-content:center}
.wf-modal{background:var(--bg2);border:1px solid var(--bdr);border-radius:12px;padding:20px;width:380px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 50px rgba(0,0,0,.5)}
.wf-title{font-size:14px;font-weight:700;color:var(--tx1);margin-bottom:14px;letter-spacing:1px;text-align:center}
.wf-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--bdr);border-radius:var(--rs);margin-bottom:6px;cursor:pointer;transition:all .15s;background:var(--card2)}
.wf-row:hover{border-color:var(--sky);background:rgba(125,211,252,.05)}
.wf-row.selected{border-color:var(--sky);background:var(--sky-dim);box-shadow:0 0 0 1px var(--sky)}
.wf-ts{font-size:12px;font-family:var(--fm);color:var(--tx2);flex:1}
.wf-stages{font-size:10px;color:var(--tx3);font-family:var(--fm)}
.wf-time{font-size:11px;color:var(--warm);font-weight:700;font-family:var(--fm)}
.wf-empty{font-size:12px;color:var(--tx3);text-align:center;padding:20px}
.wf-actions{display:flex;gap:8px;margin-top:14px;justify-content:flex-end}
.wf-btn{padding:8px 18px;border-radius:var(--rs);border:1px solid var(--bdr);background:var(--card2);color:var(--tx2);font-size:11px;font-family:var(--fi);cursor:pointer;transition:all .15s;font-weight:600}
.wf-btn:hover{border-color:var(--tx3);color:var(--tx1)}
.wf-btn.primary{background:var(--sky-dim);border-color:rgba(125,211,252,.3);color:var(--sky)}
.wf-btn.primary:hover{background:rgba(125,211,252,.15)}
.pd-open-btn{width:100%;padding:10px;border:1px solid rgba(249,115,22,.2);background:var(--orange-dim);color:var(--orange);border-radius:var(--rs);font-size:12px;font-weight:700;font-family:var(--fh);cursor:pointer;letter-spacing:1px;text-transform:uppercase;transition:all .2s;margin-top:4px}.pd-open-btn:hover{background:rgba(249,115,22,.18);border-color:rgba(249,115,22,.4)}
.pd-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:2000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.pd-modal{background:var(--card);border:1px solid var(--bdr);border-radius:16px;width:920px;max-width:96vw;max-height:94vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6)}
.pd-header{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--bdr);flex-shrink:0}
.pd-title{font-size:16px;font-weight:800;color:var(--tx);font-family:var(--fh);letter-spacing:1px;text-transform:uppercase;flex:1}
.pd-mode{font-size:10px;font-weight:700;padding:4px 10px;border-radius:6px;background:var(--orange-dim);color:var(--orange);letter-spacing:1px;font-family:var(--fm)}
.pd-close{background:transparent;border:1px solid var(--bdr);color:var(--tx3);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s}.pd-close:hover{background:var(--red-dim);border-color:rgba(248,113,113,.3);color:var(--red)}
.pd-body{display:flex;gap:0;flex:1;min-height:0;overflow:hidden}
.pd-chart{padding:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pd-side{flex:1;overflow-y:auto;padding:12px 16px;border-left:1px solid var(--bdr);display:flex;flex-direction:column;gap:8px}
.pd-tabs{display:flex;gap:0;background:var(--card2);border-radius:8px;padding:2px;margin-bottom:4px}
.pd-section{background:var(--card2);border-radius:10px;padding:10px 12px}
.pd-sec-title{font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-family:var(--fm)}
.pd-row{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.pd-chk{width:16px;height:16px;border-radius:4px;border:2px solid;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#0e1015;flex-shrink:0;transition:all .15s}
.pd-lbl{font-size:11px;font-weight:700;font-family:var(--fm);min-width:24px}
.pd-inp{background:var(--card3);border:1px solid var(--bdr);color:var(--cyan);padding:4px 6px;border-radius:6px;font-size:11px;font-family:var(--fm);width:82px;text-align:right;outline:none}.pd-inp:focus{border-color:rgba(14,165,233,.3)}
.pd-inp.pd-ang{width:66px;color:var(--warm)}
.pd-u{font-size:9px;color:var(--tx3);font-family:var(--fm);min-width:12px}
.pd-val{font-size:10px;color:var(--tx2);font-family:var(--fm);margin-left:auto;white-space:nowrap}
.pd-metric{display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:10px;font-family:var(--fm)}.pd-metric span:first-child{color:var(--tx3)}.pd-metric span:last-child{color:var(--tx);font-weight:600}
.main-tabs{display:flex;gap:0;border-bottom:1px solid var(--bdr);flex-shrink:0;overflow-x:auto}
.mt{padding:9px 16px;border:none;background:transparent;color:var(--tx3);font-size:13px;font-weight:700;font-family:var(--fh);cursor:pointer;white-space:nowrap;letter-spacing:1px;text-transform:uppercase;border-bottom:3px solid transparent;transition:all .2s}.mt:hover{color:var(--tx2)}.mt.on{color:var(--orange);border-bottom-color:var(--orange);background:rgba(249,115,22,.04)}
.tbar{display:flex;gap:2px;padding:2px 4px;border-bottom:1px solid var(--bdr);overflow-x:auto;flex-shrink:0;background:rgba(0,0,0,.1)}
.ti{padding:7px 11px;border:none;background:transparent;color:var(--tx3);font-size:10px;font-weight:600;font-family:var(--fm);cursor:pointer;border-radius:6px;white-space:nowrap;transition:all .2s}.ti:hover{color:var(--tx2);background:rgba(255,255,255,.03)}.ti.on{color:var(--orange);background:var(--orange-dim)}
.stbar{display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap}.stb{padding:5px 12px;background:var(--card2);color:var(--tx3);border-radius:20px;cursor:pointer;font-size:10px;font-family:var(--fi);font-weight:600;border:1px solid transparent}.stb.on{background:var(--orange-dim);border-color:rgba(249,115,22,.2);color:var(--orange)}.stb.dis{opacity:.3}
.tw{display:flex;align-items:center;gap:10px;margin-bottom:8px}.tg{width:40px;height:22px;border-radius:11px;background:var(--card3);cursor:pointer;position:relative;border:none;padding:0}.tg.on{background:var(--orange)}.tg .dk{width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:left .25s;box-shadow:0 1px 4px rgba(0,0,0,.3)}.tg.on .dk{left:20px}.tl{font-size:11px;color:var(--tx2);font-weight:500}
.pg{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pi label{font-size:9px;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px}
.ctrl-r{display:flex;gap:8px}.ctrl-big{flex:1;padding:16px 8px;border-radius:var(--r);background:var(--card2);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;border:1px solid transparent;transition:all .2s}.ctrl-big:hover{border-color:rgba(255,255,255,.08);background:var(--card3)}.ctrl-big:active{transform:scale(.97)}
.ctrl-ico{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px}.ci-p{background:var(--green-dim);color:var(--green);border:2px solid rgba(74,222,128,.2)}.ci-s{background:var(--red-dim);color:var(--red);border:2px solid rgba(248,113,113,.2)}
.ctrl-lbl{font-size:10px;color:var(--tx2);font-weight:700;letter-spacing:1px;text-transform:uppercase}
.ctrl-sec{padding:10px;border-radius:var(--rs);background:var(--card2);cursor:pointer;font-size:11px;color:var(--tx2);text-align:center;font-weight:600;border:1px solid transparent;transition:all .2s}.ctrl-sec:hover{border-color:rgba(255,255,255,.08);color:var(--tx)}
.st-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.st-tt{font-size:14px;font-weight:700;color:var(--tx);font-family:var(--fh);text-transform:uppercase;letter-spacing:1px}
.st-pill{padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700}.sp-idle{color:var(--tx3);background:var(--card3)}.sp-run{color:var(--green);background:var(--green-dim)}.sp-trip{color:var(--red);background:var(--red-dim)}
.tmr{background:var(--card2);border-radius:var(--rs);padding:12px;text-align:center}.tmr-l{font-size:9px;color:var(--tx3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;font-weight:600}.tmr-v{font-family:var(--fm);font-size:30px;font-weight:800;color:var(--tx);letter-spacing:2px}
.relay-wrap{padding:8px 10px 4px;background:var(--bg);flex:1;display:flex;flex-direction:column;min-height:0}
.relay-shell{background:#0e1015;border-radius:var(--r);overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.7),inset 0 0 0 1px rgba(255,255,255,.07);display:flex;flex-direction:column;flex:1;min-height:0}
.relay-strip{height:3px;background:linear-gradient(90deg,transparent,var(--orange),#c2410c,var(--orange),transparent);flex-shrink:0}
.relay-in{padding:10px 12px 8px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.05)}
.relay-header{display:flex;align-items:flex-start;justify-content:space-between}
.relay-id{flex:1}.rbn{font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--tx);font-family:var(--fh)}.rbm{font-size:7px;color:#3d4455;letter-spacing:1.5px;font-family:var(--fm)}
.relay-pwr{display:flex;align-items:center;gap:5px;margin-top:3px}.rpw-led{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green)}.rpw-lbl{font-size:6px;color:#3d4455;text-transform:uppercase;letter-spacing:1px;font-weight:700;font-family:var(--fm)}
.relay-st{display:flex;align-items:center;justify-content:space-between;padding:5px 12px;font-size:9px;font-weight:700;letter-spacing:1px;flex-shrink:0}
.rs-ok{background:rgba(74,222,128,.06);color:var(--green);border-top:1px solid rgba(74,222,128,.1);border-bottom:1px solid rgba(74,222,128,.08)}
.rs-trip{background:rgba(248,113,113,.08);color:var(--red);border-top:1px solid rgba(248,113,113,.15);border-bottom:1px solid rgba(248,113,113,.12);animation:bk .8s infinite}
@keyframes bk{0%,100%{opacity:1}50%{opacity:.4}}
.relay-tabs{display:flex;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.05)}
.rtab{flex:1;padding:7px 2px;border:none;background:transparent;color:#3d4455;font-size:8px;font-weight:700;font-family:var(--fh);cursor:pointer;letter-spacing:1.2px;text-transform:uppercase;transition:all .2s;border-bottom:2px solid transparent;margin-bottom:-1px}
.rtab:hover{color:#6b7280}.rtab.on{color:var(--cyan);border-bottom-color:var(--cyan);background:rgba(14,165,233,.04)}
.relay-panel{flex:1;overflow-y:auto;min-height:0}
.rp-section{padding:6px 10px}
.rp-stitle{font-size:7px;color:#3d4455;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;font-weight:700;font-family:var(--fh)}
.rp-row{display:flex;justify-content:space-between;align-items:center;padding:2px 0}
.rp-lbl{font-size:9px;color:#4a5568;font-family:var(--fm)}.rp-val{font-size:10px;font-weight:600;color:var(--cyan);font-family:var(--fm)}
.rp-sep{height:1px;background:rgba(255,255,255,.04);margin:4px 0}
.rp-prot{display:flex;align-items:center;gap:6px;padding:4px 10px;border-bottom:1px solid rgba(255,255,255,.03)}.rp-prot:last-child{border-bottom:none}
.rp-pdot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.rp-plbl{font-size:9px;font-weight:700;color:var(--tx2);font-family:var(--fm);min-width:30px}
.rp-pname{font-size:8px;color:#4a5060;flex:1;font-family:var(--fi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rp-pst{font-size:7px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;flex-shrink:0}.rp-pst.en{color:var(--green)}.rp-pst.dis{color:#2a2a35}.rp-pst.trip{color:var(--red)}
.rp-led-row{display:flex;align-items:center;gap:6px;padding:4px 10px;border-bottom:1px solid rgba(255,255,255,.03)}.rp-led-row:last-child{border-bottom:none}
.rp-led-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}.rp-led-dot.off{background:radial-gradient(circle at 40% 35%,#252535,#111)}.rp-led-dot.on{background:radial-gradient(circle at 40% 35%,#ff8a80,#ff1744);box-shadow:0 0 6px #ff1744;animation:bk .6s infinite}
.rp-led-lbl{font-size:9px;font-weight:700;font-family:var(--fm);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rp-led-lbl.empty{color:#252535}.rp-led-lbl.on{color:#ccc}.rp-led-lbl.off{color:#3d4455}
.rp-led-st{font-size:7px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;flex-shrink:0}.rp-led-st.off{color:#252535}.rp-led-st.on{color:#ff4444}
.rp-evt{padding:4px 10px;border-bottom:1px solid rgba(255,255,255,.03);display:flex;gap:5px;align-items:flex-start}.rp-evt:last-child{border-bottom:none}
.rp-evt-t{color:#3d4455;font-size:8px;white-space:nowrap;min-width:52px;font-family:var(--fm)}.rp-evt-x{color:#5c6370;font-size:8px;flex:1;line-height:1.4}
.rp-empty{padding:20px;text-align:center;color:#3d4455;font-size:8px;font-family:var(--fm);letter-spacing:1.5px;text-transform:uppercase}
.relay-bot{display:flex;justify-content:center;gap:6px;padding:6px 10px;border-top:1px solid rgba(255,255,255,.05);flex-shrink:0}
.rbt{padding:4px 12px;border-radius:6px;font-size:8px;font-weight:700;cursor:pointer;border:1px solid;text-transform:uppercase;letter-spacing:.5px;transition:all .15s;font-family:var(--fm)}.rbt:active{transform:scale(.94)}
.rr{background:rgba(127,29,29,.5);color:#fca5a5;border-color:rgba(248,113,113,.25)}.r0{background:rgba(255,255,255,.04);color:#4a5060;border-color:rgba(255,255,255,.08)}.rii{background:rgba(20,83,45,.5);color:#86efac;border-color:rgba(74,222,128,.25)}
.rfo{text-align:center;padding:2px 6px 4px;flex-shrink:0}.rfb{font-size:6px;color:#1e2230;letter-spacing:2px;font-family:var(--fm);text-transform:uppercase}
.relay-actions{display:flex;gap:8px;padding:6px 10px 2px;flex-shrink:0}
.rp-mensuracao{display:flex;height:100%;overflow:hidden}.rp-subnav{display:flex;flex-direction:column;width:38px;border-right:1px solid rgba(255,255,255,.05);flex-shrink:0;padding:4px 0;gap:2px;background:rgba(0,0,0,.15)}.rp-snb{padding:8px 2px;border:none;background:transparent;color:#3d4455;font-size:7px;font-weight:700;font-family:var(--fh);cursor:pointer;letter-spacing:.8px;text-align:center;text-transform:uppercase;transition:all .2s;border-left:2px solid transparent;line-height:1.3}.rp-snb:hover{color:#6b7280}.rp-snb.on{color:var(--cyan);background:rgba(14,165,233,.06);border-left-color:var(--cyan)}.rp-mensuracao-content{flex:1;overflow-y:auto;min-width:0}
.ra-btn{flex:1;padding:10px 4px;border-radius:var(--rs);background:var(--card2);border:1px solid transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;transition:all .2s}.ra-btn:hover{border-color:rgba(255,255,255,.1);background:var(--card3)}.ra-btn:active{transform:scale(.96)}
.ra-ico{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700}
.ra-ico.send{background:var(--orange-dim);color:var(--orange);border:2px solid rgba(249,115,22,.2)}.ra-ico.get{background:var(--sky-dim);color:var(--sky);border:2px solid rgba(125,211,252,.2)}.ra-ico.wave{background:var(--amber-dim);color:var(--amber);border:2px solid rgba(251,191,36,.2)}
.ra-lbl{font-size:8px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;text-align:center;line-height:1.2}
.ra-btn.flash-g{border-color:rgba(74,222,128,.4);background:rgba(74,222,128,.08)}.ra-btn.flash-b{border-color:rgba(125,211,252,.4);background:rgba(125,211,252,.08)}
.ev-box{max-height:140px;overflow-y:auto;background:var(--card2);border-radius:var(--rs);padding:8px}
.ev-e{padding:5px 0;border-bottom:1px solid var(--bdr);display:flex;gap:6px;align-items:flex-start}.ev-e:last-child{border-bottom:none}
.ev-t{color:var(--tx3);font-size:9px;white-space:nowrap;min-width:62px;font-family:var(--fm)}.ev-i{font-size:10px}.ev-x{color:var(--tx2);font-size:9px;flex:1}.ev-d{color:var(--tx3);font-size:8px;white-space:nowrap;font-family:var(--fm)}
.dg-box{max-height:140px;overflow-y:auto}.dt{width:100%;border-collapse:collapse;font-size:9px}
.dt th{text-align:left;padding:5px 6px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--bdr);font-size:8px}
.dt td{padding:5px 6px;border-bottom:1px solid var(--bdr);color:var(--tx2)}.dt tr:last-child td{border-bottom:none}
.badge{display:inline-block;padding:3px 8px;border-radius:20px;font-size:8px;font-weight:700}.b-enabled{background:var(--orange-dim);color:var(--orange)}.b-disabled{color:var(--tx3);background:var(--card3)}.b-trip{background:var(--red-dim);color:var(--red)}
.fh{display:flex;align-items:center;justify-content:space-between;padding:4px 0;margin-bottom:4px}.fn{font-size:12px;font-weight:700;color:var(--tx)}
.bs{margin-bottom:8px}.bs label{font-size:9px;color:var(--tx3);font-weight:600;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px}
.placeholder{display:flex;align-items:center;justify-content:center;padding:40px;color:var(--tx3);font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase}
.mx-wrap{overflow:auto;max-height:100%;padding:8px}.mx{border-collapse:separate;border-spacing:0;font-family:var(--fm);width:max-content}
.mx th,.mx td{padding:6px 10px;text-align:center;white-space:nowrap}
.mx th{background:var(--card3);color:var(--tx2);font-weight:700;font-size:10px;letter-spacing:.5px;text-transform:uppercase;position:sticky;top:0;z-index:2;border-bottom:2px solid var(--bdr)}
.mx th.corner{background:var(--card);z-index:3;text-align:left;color:var(--tx3);font-size:9px}.mx th.col-bo{color:var(--orange);font-size:11px}.mx th.col-led{color:var(--amber);font-size:11px}
.mx td.row-label{text-align:left;font-weight:700;color:var(--tx);background:var(--card2);position:sticky;left:0;z-index:1;font-size:10px;border-right:1px solid var(--bdr)}.mx td.row-label.is-bi{color:var(--sky)}.mx td.row-label.is-prot{color:var(--rose)}
.mx td{border-bottom:1px solid rgba(255,255,255,.03)}.mx tr:hover td{background:rgba(255,255,255,.02)}
.mx-section td{background:var(--card3)!important;color:var(--tx3);font-weight:700;font-size:9px;letter-spacing:1px;text-transform:uppercase;text-align:left!important;padding:8px 10px!important}
.mx-cell{display:flex;align-items:center;justify-content:center}.mx-chk{width:16px;height:16px;border-radius:4px;border:2px solid var(--card3);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}.mx-chk:hover{border-color:var(--tx3)}.mx-chk.on{background:var(--orange);border-color:var(--orange)}.mx-chk.on::after{content:'✓';color:#0e1015;font-size:10px;font-weight:800;line-height:1}
@media(max-width:1100px){.main{grid-template-columns:1fr 1fr}.rcol{grid-column:1/-1}}@media(max-width:768px){.main{grid-template-columns:1fr}}
.tp-strip{display:flex;align-items:center;gap:5px;padding:5px 8px;border-bottom:1px solid var(--bdr);background:rgba(249,115,22,.025);flex-shrink:0;overflow-x:auto;flex-wrap:nowrap;}
.tp-lbl{font-size:9px;color:var(--tx3);letter-spacing:2px;font-family:var(--fm);white-space:nowrap;flex-shrink:0;padding-right:4px;}
.tp-btn{padding:4px 10px;border:1px solid var(--bdr);background:var(--card2);color:var(--tx2);border-radius:6px;font-size:10px;font-weight:700;font-family:var(--fm);cursor:pointer;white-space:nowrap;transition:all .15s;flex-shrink:0;}
.tp-btn:hover{border-color:rgba(249,115,22,.45);color:var(--orange);background:var(--orange-dim);}
`;

function Tgl({value,onChange,label}){return(<div className="tw"><button className={`tg ${value?"on":""}`} onClick={()=>onChange(!value)}><div className="dk"/></button>{label&&<span className="tl">{label}</span>}</div>)}
function IB({unit,value,onChange,step="0.1",warm=false}){return(<div className="ib">{unit&&<span className="iu">{unit}</span>}<input className={`iv${warm?" warm":""}`} type="number" value={value} step={step} onChange={e=>onChange(parseFloat(e.target.value)||0)}/></div>)}

// ── FAULT CALCULATOR ──────────────────────────────────────────────────────────
const FC_TYPES=["AG","BG","CG","AB","BC","CA","ABG","BCG","CAG","ABC"];
function calcFaultPhasors({type,Vf,Z1r,Z1i,Z0r,Z0i,Rf}){
  // complex helpers
  const add=(a,b)=>({r:a.r+b.r,i:a.i+b.i});
  const sub=(a,b)=>({r:a.r-b.r,i:a.i-b.i});
  const mul=(a,b)=>({r:a.r*b.r-a.i*b.i,i:a.r*b.i+a.i*b.r});
  const div=(a,b)=>{const d=b.r*b.r+b.i*b.i;return{r:(a.r*b.r+a.i*b.i)/d,i:(a.i*b.r-a.r*b.i)/d}};
  const mag=(a)=>Math.sqrt(a.r*a.r+a.i*a.i);
  const ang=(a)=>Math.atan2(a.i,a.r)*180/Math.PI;
  const polar=(m,deg)=>({r:m*Math.cos(deg*Math.PI/180),i:m*Math.sin(deg*Math.PI/180)});
  const Vfv={r:Vf,i:0};
  const Z1={r:Z1r,i:Z1i};const Z0={r:Z0r,i:Z0i};const Zf={r:Rf,i:0};
  const a=polar(1,120),a2=polar(1,240);
  // Symmetrical components → phase
  const toPhase=(I0c,I1c,I2c)=>{
    const Ia=add(add(I0c,I1c),I2c);
    const Ib=add(add(I0c,mul(a2,I1c)),mul(a,I2c));
    const Ic=add(add(I0c,mul(a,I1c)),mul(a2,I2c));
    return[Ia,Ib,Ic];
  };
  const seqV=(I0c,I1c,I2c)=>{
    const Va1=sub(Vfv,mul(Z1,I1c));const Va2=mul({r:-1,i:0},mul(Z1,I2c));const Va0=mul({r:-1,i:0},mul(Z0,I0c));
    return toPhase(Va0,Va1,Va2);
  };
  let I0c,I1c,I2c;
  const Z1Z2=add(Z1,Z1);
  if(type==="AG"||type==="BG"||type==="CG"){
    const den=add(add(Z1Z2,Z0),{r:Rf*3,i:0});
    I1c=div(Vfv,den);I0c=I2c=I1c;
  }else if(type==="AB"||type==="BC"||type==="CA"){
    I1c=div(Vfv,Z1Z2);I2c={r:-I1c.r,i:-I1c.i};I0c={r:0,i:0};
  }else if(type==="ABG"||type==="BCG"||type==="CAG"){
    const Z0f=add(Z0,{r:Rf*3,i:0});
    const par=div(mul(Z1,Z0f),add(Z1,Z0f));
    I1c=div(Vfv,add(Z1,par));
    I2c=mul({r:-1,i:0},div(mul(I1c,Z0f),add(Z1,Z0f)));
    I0c=sub(mul({r:-1,i:0},I1c),I2c);
  }else{
    I1c=div(Vfv,add(Z1,Zf));I0c=I2c={r:0,i:0};
  }
  // rotate for fault phase
  let rotI=0,rotV=0;
  if(type==="BG"||type==="BC")rotI=-120,rotV=-120;
  else if(type==="CG"||type==="CA")rotI=120,rotV=120;
  else if(type==="BCG")rotI=-120,rotV=-120;
  else if(type==="CAG")rotI=120,rotV=120;
  const rotC=(c,deg)=>mul(c,polar(1,deg));
  if(rotI!==0){I0c=rotC(I0c,rotI);I1c=rotC(I1c,rotI);I2c=rotC(I2c,rotI);}
  const [Ia,Ib,Ic]=toPhase(I0c,I1c,I2c);
  if(rotV!==0){I0c=rotC(I0c,0)} // noop, voltages computed below
  const [Va,Vb,Vc]=seqV(I0c,I1c,I2c);
  const phas=(c)=>({mag:Math.round(mag(c)*1000)/1000,ang:Math.round(ang(c)*10)/10});
  return{currents:{Ia:phas(Ia),Ib:phas(Ib),Ic:phas(Ic)},voltages:{Va:phas(Va),Vb:phas(Vb),Vc:phas(Vc)}};
}

function FaultCalculator({sys,onApply,onClose}){
  const secV=sys?.tp?.secV||115;const secA=sys?.tc?.secA||5;
  const Vln=secV/Math.sqrt(3);
  const [type,setType]=useState("AG");
  const [Vf,setVf]=useState(parseFloat(Vln.toFixed(2)));
  const [Z1r,setZ1r]=useState(0.3);const [Z1i,setZ1i]=useState(1.2);
  const [Z0r,setZ0r]=useState(0.5);const [Z0i,setZ0i]=useState(3.0);
  const [Rf,setRf]=useState(0);
  const [withPf,setWithPf]=useState(true);
  const res=useMemo(()=>{try{return calcFaultPhasors({type,Vf,Z1r,Z1i,Z0r,Z0i,Rf})}catch{return null}},[type,Vf,Z1r,Z1i,Z0r,Z0i,Rf]);
  const preFaultP={currents:{Ia:{mag:0,ang:0},Ib:{mag:0,ang:-120},Ic:{mag:0,ang:120}},voltages:{Va:{mag:Vf,ang:0},Vb:{mag:Vf,ang:-120},Vc:{mag:Vf,ang:120}}};
  const fmtC=(v,u)=><span style={{color:"var(--orange)",fontFamily:"var(--fm)",fontSize:11}}>{v} {u}</span>;
  return(<div className="wf-overlay" onClick={onClose}><div className="wf-modal" style={{width:500,maxWidth:"96vw"}} onClick={e=>e.stopPropagation()}>
    <div className="wf-title" style={{fontSize:15,letterSpacing:1,textAlign:"left",color:"var(--lav)"}}>⚡ Calculador de Falta</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
      <div><div style={{fontSize:9,color:"var(--tx3)",marginBottom:4,fontWeight:700,letterSpacing:1}}>TIPO DE FALTA</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{FC_TYPES.map(t=><button key={t} onClick={()=>setType(t)} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${t===type?"var(--lav)":"var(--bdr)"}`,background:t===type?"rgba(196,181,253,.15)":"var(--card2)",color:t===type?"var(--lav)":"var(--tx3)",fontSize:10,fontWeight:700,cursor:"pointer"}}>{t}</button>)}</div>
      </div>
      <div><div style={{fontSize:9,color:"var(--tx3)",marginBottom:4,fontWeight:700,letterSpacing:1}}>TENSÃO PRÉ-FALTA (V fase-terra)</div>
        <div style={{display:"flex",alignItems:"center",gap:6}}><IB unit="V" value={Vf} onChange={v=>setVf(v)} step="0.1"/><button onClick={()=>setVf(parseFloat(Vln.toFixed(2)))} style={{padding:"4px 8px",border:"1px solid var(--bdr)",background:"var(--card2)",color:"var(--tx3)",borderRadius:6,fontSize:9,cursor:"pointer"}}>Nom.</button></div>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
      <div style={{background:"var(--card2)",borderRadius:10,padding:"8px 10px"}}>
        <div style={{fontSize:9,color:"var(--sky)",marginBottom:6,fontWeight:700,letterSpacing:1}}>Z₁ = Z₂ (seq. positiva/negativa)</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <div><div style={{fontSize:8,color:"var(--tx3)",marginBottom:2}}>R₁ (Ω)</div><IB unit="Ω" value={Z1r} onChange={v=>setZ1r(v)} step="0.01"/></div>
          <div><div style={{fontSize:8,color:"var(--tx3)",marginBottom:2}}>X₁ (Ω)</div><IB unit="Ω" value={Z1i} onChange={v=>setZ1i(v)} step="0.01"/></div>
        </div>
      </div>
      <div style={{background:"var(--card2)",borderRadius:10,padding:"8px 10px"}}>
        <div style={{fontSize:9,color:"var(--rose)",marginBottom:6,fontWeight:700,letterSpacing:1}}>Z₀ (seq. zero)</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <div><div style={{fontSize:8,color:"var(--tx3)",marginBottom:2}}>R₀ (Ω)</div><IB unit="Ω" value={Z0r} onChange={v=>setZ0r(v)} step="0.01"/></div>
          <div><div style={{fontSize:8,color:"var(--tx3)",marginBottom:2}}>X₀ (Ω)</div><IB unit="Ω" value={Z0i} onChange={v=>setZ0i(v)} step="0.01"/></div>
        </div>
      </div>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
      <div style={{flex:1}}><div style={{fontSize:9,color:"var(--tx3)",marginBottom:4,fontWeight:700,letterSpacing:1}}>Rf — RESISTÊNCIA DE FALTA (Ω)</div><IB unit="Ω" value={Rf} onChange={v=>setRf(v)} step="0.1"/></div>
      <div style={{flex:1}}><div style={{fontSize:9,color:"var(--tx3)",marginBottom:4,fontWeight:700,letterSpacing:1}}>PRÉ-FALTA</div><Tgl value={withPf} onChange={setWithPf} label="Aplicar pré-falta nominal"/></div>
    </div>
    {res&&<div style={{background:"var(--card2)",borderRadius:10,padding:"10px 12px",marginBottom:12}}>
      <div style={{fontSize:9,color:"var(--tx3)",marginBottom:6,fontWeight:700,letterSpacing:1}}>RESULTADO — FASORES DE FALTA</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
        {["Ia","Ib","Ic"].map(k=><div key={k} style={{fontSize:10,padding:"3px 0"}}><span style={{color:"var(--tx3)",minWidth:22,display:"inline-block"}}>{k}</span>{fmtC(`${res.currents[k].mag.toFixed(3)}A`,`∠${res.currents[k].ang.toFixed(1)}°`)}</div>)}
        {["Va","Vb","Vc"].map(k=><div key={k} style={{fontSize:10,padding:"3px 0"}}><span style={{color:"var(--tx3)",minWidth:22,display:"inline-block"}}>{k}</span>{fmtC(`${res.voltages[k].mag.toFixed(3)}V`,`∠${res.voltages[k].ang.toFixed(1)}°`)}</div>)}
      </div>
    </div>}
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
      <button className="wf-btn" onClick={onClose}>Fechar</button>
      <button className={`wf-btn primary${!res?" disabled":""}`} style={!res?{opacity:.4,pointerEvents:"none"}:{}} onClick={()=>{if(res)onApply(res,withPf?preFaultP:null)}}>Aplicar Fasores</button>
    </div>
  </div></div>);
}
// ── FIM FAULT CALCULATOR ──────────────────────────────────────────────────────

export default function App(){
  const[page,setPage]=useState(1);
  const[p,setP]=useState(defaultPhasors);const[sys,setSys]=useState(defaultSystem);
  // Pré-falta: fasores injetados antes da falta (condição normal do sistema)
  const defaultPreFault={currents:{Ia:{mag:0,ang:0},Ib:{mag:0,ang:-120},Ic:{mag:0,ang:120}},voltages:{Va:{mag:66.4,ang:0},Vb:{mag:66.4,ang:-120},Vc:{mag:66.4,ang:120}}};
  const[pf,setPf]=useState(defaultPreFault);
  const[pfEnabled,setPfEnabled]=useState(false);   // pré-falta habilitada pelo usuário
  const[pfDuration,setPfDuration]=useState(1.0);   // duração pré-falta em segundos
  const[pfMode,setPfMode]=useState("fault");        // "prefault" ou "fault" — qual painel está visível
  const[prot,setProt]=useState(deepClone(defaultProtections));const[relayProt,setRelayProt]=useState(deepClone(defaultProtections));
  const[outMatrix,setOutMatrix]=useState(buildDefaultMatrix);const[relayMatrix,setRelayMatrix]=useState(buildDefaultMatrix);
  const[inMatrix,setInMatrix]=useState(buildDefaultInMatrix);
  const[mainTab,setMainTab]=useState("relay");const[tab,setTab]=useState("51");const[si,setSi]=useState(0);const[relayTab,setRelayTab]=useState("mensuracao");const[mensTab,setMensTab]=useState("corr");
  const[ss,setSs]=useState("idle");const[stime,setStime]=useState(0);const[rp,setRp]=useState(0);
  const[trippedStageIds,setTrippedStageIds]=useState([]);const[diag,setDiag]=useState([]);const[evts,setEvts]=useState([]);
  const[isTripped,setIsTripped]=useState(false);const[maletaTripped,setMaletaTripped]=useState(false);const[faultRecord,setFaultRecord]=useState(null);
  const[sendFlash,setSendFlash]=useState(false);const[getFlash,setGetFlash]=useState(false);
  const[tripHistory,setTripHistory]=useState([]);  // últimos 5 registros de trip {timestamp, stages, faultData}
  const[bkResetCtr,setBkResetCtr]=useState(0);
  const[bkCloseCtr,setBkCloseCtr]=useState(0);
  const[bkOpenCtr,setBkOpenCtr]=useState(0);
  const onBkFieldCommand=useCallback((cmd)=>{if(cmd==='close')setBkCloseCtr(c=>c+1);},[]);
  const[campoLoadWiring,setCampoLoadWiring]=useState(null);
  const[wfModalOpen,setWfModalOpen]=useState(false);const[wfSelected,setWfSelected]=useState(null);
  const[phasorDiagOpen,setPhasorDiagOpen]=useState(false);
  const[fcOpen,setFcOpen]=useState(false);
  const[phasorVis,setPhasorVis]=useState({Ia:true,Ib:true,Ic:true,Va:true,Vb:true,Vc:true,Vab:false,Vbc:false,Vca:false,I0:false,I1:false,I2:false,V0:false,V1:false,V2:false});
  const tr=useRef(null);const pendingTrip=useRef(null);const totalPages=10;
  const stimeRef=useRef(0); // mirrors stime for use in async callbacks

  // Estado elétrico do campo (cabos + chave de aferição)
  const[fieldState,setFieldState]=useState({connections:[],internalConns:[]});
  const fieldStateRef=useRef(fieldState);
  const onFieldStateChange=useCallback((fs)=>{setFieldState(fs);fieldStateRef.current=fs;},[]);

  // ── Estado do disjuntor (PAINEL ↔ RELÉ interlocking) ──────────────────────
  const[bkState,setBkState]=useState('open');
  const[bkSpring,setBkSpring]=useState(true);
  const[bkTripLatch,setBkTripLatch]=useState(false);

  const inMatrixRef=useRef(buildDefaultInMatrix());
  const ssRef=useRef("idle");
  useEffect(()=>{inMatrixRef.current=inMatrix;},[inMatrix]);
  useEffect(()=>{ssRef.current=ss;},[ss]);
  const ar79Ref=useRef({shot:0,deadTimer:null,reclaimTimer:null,locked:false});
  const relayProtRef=useRef(relayProt);
  useEffect(()=>{relayProtRef.current=relayProt;},[relayProt]);

  const onBreakerChange=useCallback((state,spring,latch)=>{
    setBkState(prev=>{
      if(prev!==state){
        const icon=state==='closed'?'🔒':'🔓';
        const msg=state==='closed'
          ?'Disjuntor FECHADO — 52a ON'
          :(latch?'Disjuntor ABERTO por TRIP — 52b ON':'Disjuntor ABERTO — 52b ON');
        setEvts(ev=>[{time:nowShort(),icon,text:msg,dt:''},...ev.slice(0,20)]);

        // ── CB_Opened feedback: stop timer when breaker opens ──
        if(state==='open' && ssRef.current==='running'){
          const im=inMatrixRef.current;
          const mappedBIs=biRows.filter(bi=>im.CB_Opened?.[bi]);
          if(mappedBIs.length>0){
            const t=stimeRef.current;
            clearInterval(tr.current);
            setSs('idle');setSimPhase('idle');setMaletaTripped(true);
            setEvts(ev=>[{time:nowShort(),icon:'🔴',text:`CB_Opened via ${mappedBIs.join(', ')} — abertura confirmada`,dt:`T+${t.toFixed(3)}s`},...ev.slice(0,20)]);
          }
        }
        // ── CB_Closed feedback: log BI activity ──
        if(state==='closed'){
          const im=inMatrixRef.current;
          const mappedBIs=biRows.filter(bi=>im.CB_Closed?.[bi]);
          if(mappedBIs.length>0)
            setEvts(ev=>[{time:nowShort(),icon:'🟢',text:`CB_Closed via ${mappedBIs.join(', ')}`,dt:''},...ev.slice(0,20)]);
        }
        // ── 79 Auto-reclose ──
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
    setBkSpring(spring);
    setBkTripLatch(latch);
  },[]);

  // Fase atual da simulação: "idle", "prefault" ou "fault"
  const[simPhase,setSimPhase]=useState("idle");

  // O que o relé REALMENTE vê — depende da conectividade elétrica do campo.
  // Durante pré-falta, usa fasores de pré-falta; durante falta, usa fasores de falta.
  const relayGraph=useMemo(()=>buildElectricalGraph(fieldState.connections,fieldState.internalConns),[fieldState]);
  const activePhasors=simPhase==="prefault"?pf:p;
  const relayReadings=useMemo(()=>computeRelayReadings(activePhasors,relayGraph),[activePhasors,relayGraph]);

  // Modo equilibrado: "manual" = edita cada fase, "balanced" = preenche B/C a partir de A
  const[balI,setBalI]=useState("manual"); // correntes: "manual" | "balanced"
  const[balV,setBalV]=useState("manual"); // tensões: "manual" | "balanced"
  const[seqI,setSeqI]=useState("ABC");    // sequência correntes: "ABC" (pos) | "ACB" (neg)
  const[seqV,setSeqV]=useState("ABC");    // sequência tensões: "ABC" (pos) | "ACB" (neg)

  // Preenche 3 fases equilibradas a partir dos dados da fase A
  const fillBalanced=(o,type,keyA,field,value,seq)=>{
    const offB=seq==="ABC"?-120:120;
    const offC=seq==="ABC"?120:-120;
    const keys=type==="currents"?["Ia","Ib","Ic"]:["Va","Vb","Vc"];
    const phA={...o[type][keys[0]],[field]:value};
    return{...o,[type]:{
      [keys[0]]:{mag:phA.mag,ang:phA.ang},
      [keys[1]]:{mag:phA.mag,ang:phA.ang+offB},
      [keys[2]]:{mag:phA.mag,ang:phA.ang+offC},
    }};
  };

  const uP=(t,ph,f,v)=>{
    const isBal=(t==="currents"&&balI==="balanced")||(t==="voltages"&&balV==="balanced");
    if(isBal){
      const seq=t==="currents"?seqI:seqV;
      const keyA=t==="currents"?"Ia":"Va";
      setP(o=>fillBalanced(o,t,keyA,f,v,seq));
      return;
    }
    setP(o=>({...o,[t]:{...o[t],[ph]:{...o[t][ph],[f]:v}}}));
  };
  const uPf=(t,ph,f,v)=>{
    const isBal=(t==="currents"&&balI==="balanced")||(t==="voltages"&&balV==="balanced");
    if(isBal){
      const seq=t==="currents"?seqI:seqV;
      const keyA=t==="currents"?"Ia":"Va";
      setPf(o=>fillBalanced(o,t,keyA,f,v,seq));
      return;
    }
    setPf(o=>({...o,[t]:{...o[t],[ph]:{...o[t][ph],[f]:v}}}));
  };
  // Recalcula fases B/C quando muda sequência ou ativa modo equilibrado
  const rebalance=(type,seq,setter,src)=>{
    const keys=type==="currents"?["Ia","Ib","Ic"]:["Va","Vb","Vc"];
    const offB=seq==="ABC"?-120:120;const offC=seq==="ABC"?120:-120;
    const phA=src[type][keys[0]];
    setter(o=>({...o,[type]:{
      [keys[0]]:{mag:phA.mag,ang:phA.ang},
      [keys[1]]:{mag:phA.mag,ang:phA.ang+offB},
      [keys[2]]:{mag:phA.mag,ang:phA.ang+offC},
    }}));
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
    // Clonar defaults, desabilitar tudo, depois habilitar só o que o preset especifica
    const base=deepClone(defaultProtections);
    protOrder.forEach(fid=>{
      base[fid].enabled=preset.fns.includes(fid);
      if(fid==='27/59'){
        const s=preset.stages['27/59']||{};
        base[fid].stages27?.forEach((st,i)=>{st.enabled=!!(s.s27?.includes(i));});
        base[fid].stages59?.forEach((st,i)=>{st.enabled=!!(s.s59?.includes(i));});
      }else if(fid==='81'){
        const s=preset.stages['81']||{};
        base[fid].stages81u?.forEach((st,i)=>{st.enabled=!!(s.s81u?.includes(i));});
        base[fid].stages81o?.forEach((st,i)=>{st.enabled=!!(s.s81o?.includes(i));});
      }else if(fid==='32'){
        const s=preset.stages['32']||{};
        base[fid].stages32r?.forEach((st,i)=>{st.enabled=!!(s.s32r?.includes(i));});
        base[fid].stages32f?.forEach((st,i)=>{st.enabled=!!(s.s32f?.includes(i));});
      }else if(fid==='79'){
        // no stages to enable/disable
      }else{
        const idxs=preset.stages[fid]||[];
        base[fid].stages?.forEach((st,i)=>{st.enabled=idxs.includes(i);});
      }
    });
    // Aplicar patches específicos (ex: polarização 67N)
    if(preset.patch){
      Object.keys(preset.patch).forEach(fid=>{
        if(!base[fid])return;
        const p=preset.patch[fid];
        p.stages?.forEach((s,i)=>{if(base[fid].stages?.[i])Object.assign(base[fid].stages[i],s);});
      });
    }
    setProt(base);setRelayProt(deepClone(base));
    // Output matrix
    const nextOut=buildDefaultMatrix();
    Object.keys(preset.out||{}).forEach(row=>{Object.keys(preset.out[row]).forEach(col=>{if(nextOut[row]&&nextOut[row][col]!==undefined)nextOut[row][col]=preset.out[row][col];});});
    setOutMatrix(nextOut);setRelayMatrix(deepClone(nextOut));
    // Input matrix
    const nextIn=buildDefaultInMatrix();
    Object.keys(preset.inp||{}).forEach(row=>{Object.keys(preset.inp[row]).forEach(col=>{if(nextIn[row]&&nextIn[row][col]!==undefined)nextIn[row][col]=preset.inp[row][col];});});
    setInMatrix(nextIn);
    // Navegar para a primeira função configurada e piscar LED de envio
    const firstFid=preset.fns[0];if(protOrder.includes(firstFid)){setTab(firstFid);setSi(0);}
    setSendFlash(true);setTimeout(()=>setSendFlash(false),1200);
    setEvts(ev=>[{time:nowShort(),icon:'⚡',text:`Preset "${preset.label}" aplicado — configurações enviadas ao relé.`,dt:''},...ev.slice(0,20)]);
  },[]);

  const rtc=sys.tc.priA/sys.tc.secA;const rtp=sys.tp.priV/sys.tp.secV;const Inom=sys.tc.secA;
  const i3i0=calc3(relayReadings.currents,["Ia","Ib","Ic"]);const v3v0=calc3(relayReadings.voltages,["Va","Vb","Vc"]);
  const injecting=ss==="running";
  const pA=calcPower(relayReadings.voltages.Va.mag,relayReadings.currents.Ia.mag,relayReadings.voltages.Va.ang,relayReadings.currents.Ia.ang);
  const pB=calcPower(relayReadings.voltages.Vb.mag,relayReadings.currents.Ib.mag,relayReadings.voltages.Vb.ang,relayReadings.currents.Ib.ang);
  const pC=calcPower(relayReadings.voltages.Vc.mag,relayReadings.currents.Ic.mag,relayReadings.voltages.Vc.ang,relayReadings.currents.Ic.ang);
  const pTotal={P:pA.P+pB.P+pC.P,Q:pA.Q+pB.Q+pC.Q,S:pA.S+pB.S+pC.S};pTotal.fp=pTotal.S>0?(pTotal.P/pTotal.S):0;

  const ledLabels=useMemo(()=>{const l={};ledCols.forEach((_,i)=>{const a=allRows.filter(r=>relayMatrix[r]?.[ledCols[i]]);l[i]=a.length>0?a.join(", "):""});return l},[relayMatrix]);
  const ledLitStates=useMemo(()=>{
    const s={};
    ledCols.forEach((_,i)=>{
      const mapped=allRows.filter(r=>relayMatrix[r]?.[ledCols[i]]);
      const protTrip=mapped.some(r=>trippedStageIds.includes(r));
      const cbOpenedLit=mapped.includes('CB_Opened')&&bkState!=='closed';
      const cbClosedLit=mapped.includes('CB_Closed')&&bkState==='closed';
      s[i]=protTrip||cbOpenedLit||cbClosedLit;
    });
    return s;
  },[relayMatrix,trippedStageIds,bkState]);

  const sendSettings=()=>{setRelayProt(deepClone(prot));setRelayMatrix(deepClone(outMatrix));setSendFlash(true);setTimeout(()=>setSendFlash(false),1200);setEvts(ev=>[{time:nowShort(),icon:"↑",text:"Settings uploaded to relay.",dt:""},...ev.slice(0,20)])};
  const getSettings=()=>{setProt(deepClone(relayProt));setOutMatrix(deepClone(relayMatrix));setGetFlash(true);setTimeout(()=>setGetFlash(false),1200);setEvts(ev=>[{time:nowShort(),icon:"↓",text:"Settings downloaded from relay.",dt:""},...ev.slice(0,20)])};

  // ── MONITORAMENTO CONTÍNUO DA 27: relé vê tensão o tempo todo ──────────
  // Na vida real, o relé monitora tensão continuamente.
  // Se 27 habilitada, Low-V Block desabilitado e tensão < pickup → timer → trip.
  // O trip é latched e gera fault record/oscilografia/diagnostics.
  // RESET só funciona se a condição 27 deixar de existir (Low-V Block ON ou tensão ok).
  const idle27Ref=useRef({iv:null,start:null,targets:null});

  // Verifica se algum estágio 27 está em condição de trip neste instante
  // Quando a maleta não injeta → relé vê 0V (não usa relayReadings que reflete fasores configurados)
  const check27IdleCondition=useCallback(()=>{
    const fn27=relayProt["27/59"];
    if(!fn27||!fn27.enabled)return[];
    const sp=fn27.startPhases||"any";
    const vBlock=fn27.lowVoltageBlockEnabled?(fn27.voltageBlockPu||0.20):0;
    // Maleta desligada → relé vê 0V. Injetando → usa leitura real.
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
    // Se está injetando (simulação), timer idle é cancelado
    if(injecting){
      if(ref.iv){clearInterval(ref.iv);ref.iv=null;ref.start=null;ref.targets=null}
      return;
    }
    const stagesToTrip=check27IdleCondition().filter(s=>!trippedStageIds.includes(s.id));
    // Se não há estágios para tripar, limpar timer
    if(stagesToTrip.length===0){
      if(ref.iv){clearInterval(ref.iv);ref.iv=null;ref.start=null;ref.targets=null}
      return;
    }
    // Se já há timer rodando para os mesmos estágios, manter
    if(ref.iv&&ref.targets){
      const curIds=ref.targets.map(t=>t.id).sort().join(",");
      const newIds=stagesToTrip.map(s=>s.id).sort().join(",");
      if(curIds===newIds)return; // já monitorando esses estágios
    }
    // Iniciar novo timer
    if(ref.iv)clearInterval(ref.iv);
    ref.targets=stagesToTrip.map(s=>({id:s.id,timeOp:s.timeOp,pickup:s.pickup,targetMs:simulate27OperateTime(s.timeOp)*1000,tripped:false}));
    ref.start=Date.now();
    setEvts(ev=>[{time:nowShort(),icon:"⏳",text:`27 timer: relé vê subtensão (sem injeção). Contando ${stagesToTrip.map(s=>s.id).join(", ")}...`,dt:""},...ev.slice(0,20)]);

    ref.iv=setInterval(()=>{
      const elapsed=Date.now()-ref.start;
      // Atualizar diagnostics com progresso
      const dgEntries=ref.targets.map(t=>{
        const pct=Math.min(100,elapsed/t.targetMs*100);
        if(t.tripped)return{fid:"27/59",label:"27",status:"trip",stage:t.id,time:(t.targetMs/1000).toFixed(3),obs:"Idle: 0V → TRIP"};
        return{fid:"27/59",label:"27",status:pct>0?"trip":"enabled",stage:t.id,time:`${pct.toFixed(0)}%`,obs:`Timer: ${(elapsed/1000).toFixed(2)}s / ${(t.targetMs/1000).toFixed(3)}s`};
      });
      setDiag(dgEntries);

      // Verificar trips
      const newlyTripped=ref.targets.filter(t=>!t.tripped&&elapsed>=t.targetMs);
      if(newlyTripped.length>0){
        newlyTripped.forEach(t=>{t.tripped=true});
        const ids=newlyTripped.map(t=>t.id);
        const tripTimeS=newlyTripped[0].targetMs/1000;
        setTrippedStageIds(prev=>{const merged=new Set([...prev,...ids]);return[...merged]});
        setIsTripped(true);
        // Fault record para oscilografia (0V, 0A)
        const z={mag:0,ang:0};
        setFaultRecord({stages:newlyTripped.map(t=>({stage:t.id,time:t.targetMs/1000})),timestamp:fmtTs(),currents:{Ia:z,Ib:z,Ic:z},voltages:{Va:z,Vb:z,Vc:z}});
        // Trip history para oscilografia
        setTripHistory(prev=>[{
          timestamp:fmtTs(),stages:ids,tripTime:tripTimeS,tripPhase:"idle",
          prefault:{enabled:false,duration:0,currents:null,voltages:null,relayCurrents:null,relayVoltages:null},
          fault:{currents:{Ia:z,Ib:z,Ic:z},voltages:{Va:z,Vb:z,Vc:z},relayCurrents:{Ia:z,Ib:z,Ic:z},relayVoltages:{Va:z,Vb:z,Vc:z}},
          primary:{currents:{Ia:z,Ib:z,Ic:z},voltages:{Va:z,Vb:z,Vc:z}},
          system:{rtc,rtp,priV:sys.tp.priV,secV:sys.tp.secV,priA:sys.tc.priA,secA:sys.tc.secA},
        },...prev].slice(0,5));
        setEvts(ev=>[{time:nowShort(),icon:"⚠",text:`27 trip: ${ids.join(", ")} — ${tripTimeS.toFixed(3)}s (relé sem tensão)`,dt:`T+${tripTimeS.toFixed(3)}s`},...ev.slice(0,20)]);
        // Se todos os targets triparam, parar interval
        if(ref.targets.every(t=>t.tripped)){clearInterval(ref.iv);ref.iv=null}
      }
    },20);

    return()=>{if(ref.iv){clearInterval(ref.iv);ref.iv=null;ref.start=null;ref.targets=null}};
  },[injecting,trippedStageIds,check27IdleCondition,rtc,rtp,sys]);

  // Calcula tempo de operação de um estágio para uma dada corrente
  // Retorna Infinity se corrente abaixo do pickup
  // Calcula tempo teórico (sem aleatoriedade) — usado no acumulador
  const calcTripTime=(fid,stage,currentMag)=>{
    if(!stage.enabled||currentMag<stage.pickup)return Infinity;
    if(fid==="50")return get50TheoreticalTime(stage.timeOp||0);
    if(fid==="50N")return get50NTheoreticalTime(stage.timeOp||0);
    if(fid==="46")return stage.timeOp||0.1;
    if(fid==="51N")return calc51NTheoreticalTripTime(stage,currentMag);
    return calcTheoreticalTripTime(stage,currentMag);
  };
  const calcTripTimeReal=(fid,stage,currentMag)=>{
    if(!stage.enabled||currentMag<stage.pickup)return Infinity;
    if(fid==="50")return simulate50OperateTime(stage.timeOp||0);
    if(fid==="50N")return simulate50NOperateTime(stage.timeOp||0);
    if(fid==="46"){const t=stage.timeOp||0.1;const dev=t*0.05;return t+(Math.random()*2-1)*dev;}
    if(fid==="51N"){const t=calc51NTheoreticalTripTime(stage,currentMag);return!Number.isFinite(t)?Infinity:simulate51NRealOperateTime(t)}
    const t=calcTheoreticalTripTime(stage,currentMag);
    if(!Number.isFinite(t))return Infinity;
    return simulateRealOperateTime(t);
  };

  // Obtém a corrente relevante para cada função
  const getCurrentForFunc=(fid,rr)=>{
    if(fid==="50"||fid==="51"||fid==="67")return Math.max(rr.currents.Ia.mag,rr.currents.Ib.mag,rr.currents.Ic.mag);
    if(fid==="50N"||fid==="51N"||fid==="67N")return calc3(rr.currents,["Ia","Ib","Ic"]).mag;
    if(fid==="46")return calcI2(rr.currents).mag;
    return 0;
  };

  // Avalia proteções (modo direto, sem acumulador) — retorna trips com tempos calculados
  const evalProtectionsDirect=(rr)=>{
    const maxI=Math.max(rr.currents.Ia.mag,rr.currents.Ib.mag,rr.currents.Ic.mag);
    const ri3i0=calc3(rr.currents,["Ia","Ib","Ic"]);
    const rp2=relayProt;const dg=[];const allTrips=[];
    protOrder.forEach(fid=>{
      const fn=rp2[fid];
      if(!fn.enabled){dg.push({fid,label:fn.label,status:"disabled",stage:"-",time:"-",obs:"Function disabled"});return}
      if(fid==="50"||fid==="51"){
        const m=maxI;let ft=false;
        (fn.stages||[]).forEach(s=>{
          if(!s.enabled){dg.push({fid,label:fn.label,status:"disabled",stage:s.id,time:"-",obs:"Stage disabled"});return}
          if(m>=s.pickup){ft=true;const t=calcTripTimeReal(fid,s,m);allTrips.push({func:fid,stage:s.id,time:t});dg.push({fid,label:fn.label,status:"trip",stage:s.id,time:t.toFixed(3),obs:`I=${m.toFixed(2)}A ≥ ${s.pickup}A`})}
        });if(!ft)dg.push({fid,label:fn.label,status:"enabled",stage:"-",time:"-",obs:"No pick-up"})
      }else if(fid==="50N"||fid==="51N"){
        const m=ri3i0.mag;let ft=false;
        (fn.stages||[]).forEach(s=>{
          if(!s.enabled){dg.push({fid,label:fn.label,status:"disabled",stage:s.id,time:"-",obs:"Stage disabled"});return}
          if(m>=s.pickup){ft=true;const t=calcTripTimeReal(fid,s,m);allTrips.push({func:fid,stage:s.id,time:t});dg.push({fid,label:fn.label,status:"trip",stage:s.id,time:t.toFixed(3),obs:`In=${m.toFixed(2)}A`})}
        });if(!ft)dg.push({fid,label:fn.label,status:"enabled",stage:"-",time:"-",obs:`In=${m.toFixed(2)}A`})
      }else if(fid==="67"){
        let ft=false;
        (fn.stages||[]).forEach(s=>{
          if(!s.enabled){dg.push({fid,label:fn.label,status:"disabled",stage:s.id,time:"-",obs:"Stage disabled"});return}
          const ev=evaluate67Stage(s,rr);
          if(ev.tripped){ft=true;allTrips.push({func:fid,stage:s.id,time:ev.simulatedTime});dg.push({fid,label:fn.label,status:"trip",stage:s.id,time:ev.simulatedTime.toFixed(3),obs:`${ev.elem} I=${ev.currentUsed.toFixed(2)}A dir=${ev.dir}`})}
          else{dg.push({fid,label:fn.label,status:"enabled",stage:s.id,time:"-",obs:ev.reason||"No trip"})}
        });if(!ft)dg.push({fid,label:fn.label,status:"enabled",stage:"-",time:"-",obs:"No pick-up or blocked"})
      }else if(fid==="67N"){
        let ft=false;
        (fn.stages||[]).forEach(s=>{
          if(!s.enabled){dg.push({fid,label:fn.label,status:"disabled",stage:s.id,time:"-",obs:"Stage disabled"});return}
          const ev=evaluate67NStage(s,rr);
          if(ev.tripped){ft=true;allTrips.push({func:fid,stage:s.id,time:ev.simulatedTime});dg.push({fid,label:fn.label,status:"trip",stage:s.id,time:ev.simulatedTime.toFixed(3),obs:`3I0=${ev.currentUsed.toFixed(2)}A dir=${ev.dir}`})}
          else{dg.push({fid,label:fn.label,status:"enabled",stage:s.id,time:"-",obs:ev.reason||"No trip"})}
        });if(!ft)dg.push({fid,label:fn.label,status:"enabled",stage:"-",time:"-",obs:"No pick-up or blocked"})
      }else if(fid==="27/59"){
        // Tensões em pu conforme voltageSelection (ph-ph ou ph-n)
        const voltsPu=getVoltagesPu(rr,fn.voltageSelection||"ph-n",sys.tp.secV||115);
        const sp=fn.startPhases||"any";const vBlock=fn.lowVoltageBlockEnabled?fn.voltageBlockPu||0.20:0;
        let ft27=false;
        (fn.stages27||[]).forEach(s=>{
          if(!s.enabled){dg.push({fid,label:"27",status:"disabled",stage:s.id,time:"-",obs:"Stage disabled"});return}
          const ev=evaluate27Stage(s,voltsPu,sp,vBlock);
          if(ev.blocked){dg.push({fid,label:"27",status:"enabled",stage:s.id,time:"-",obs:`Low-V Block (V<${vBlock.toFixed(2)}pu)`});return}
          if(ev.started){ft27=true;const t=simulate27OperateTime(s.timeOp);allTrips.push({func:"27",stage:s.id,time:t});dg.push({fid,label:"27",status:"trip",stage:s.id,time:t.toFixed(3),obs:`${ev.faultedCount}φ<${s.pickup}pu V=[${voltsPu.map(v=>v.toFixed(2)).join(",")}]`})}
          else{dg.push({fid,label:"27",status:"enabled",stage:s.id,time:"-",obs:`V=[${voltsPu.map(v=>v.toFixed(2)).join(",")}] pu`})}
        });
        let ft59=false;
        (fn.stages59||[]).forEach(s=>{
          if(!s.enabled){dg.push({fid,label:"59",status:"disabled",stage:s.id,time:"-",obs:"Stage disabled"});return}
          const ev=evaluate59Stage(s,voltsPu,sp);
          if(ev.started){ft59=true;const t=simulate59OperateTime(s.timeOp);allTrips.push({func:"59",stage:s.id,time:t});dg.push({fid,label:"59",status:"trip",stage:s.id,time:t.toFixed(3),obs:`${ev.faultedCount}φ>${s.pickup}pu V=[${voltsPu.map(v=>v.toFixed(2)).join(",")}]`})}
          else{dg.push({fid,label:"59",status:"enabled",stage:s.id,time:"-",obs:`V=[${voltsPu.map(v=>v.toFixed(2)).join(",")}] pu`})}
        });
        if(!ft27&&!ft59)dg.push({fid,label:fn.label,status:"enabled",stage:"-",time:"-",obs:"No pick-up"});
      }else if(fid==="46"){
        const i2=calcI2(rr.currents).mag;let ft=false;
        (fn.stages||[]).forEach(s=>{
          if(!s.enabled){dg.push({fid,label:fn.label,status:"disabled",stage:s.id,time:"-",obs:"Stage disabled"});return}
          if(i2>=s.pickup){ft=true;const t=calcTripTimeReal(fid,s,i2);allTrips.push({func:fid,stage:s.id,time:t});dg.push({fid,label:fn.label,status:"trip",stage:s.id,time:t.toFixed(3),obs:`I2=${i2.toFixed(3)}A ≥ ${s.pickup}A`})}
          else{dg.push({fid,label:fn.label,status:"enabled",stage:s.id,time:"-",obs:`I2=${i2.toFixed(3)}A`})}
        });if(!ft)dg.push({fid,label:fn.label,status:"enabled",stage:"-",time:"-",obs:`I2=${i2.toFixed(3)}A`})
      }else if(fid==="81"){
        const fr=sys.freq||60;let ft81u=false,ft81o=false;
        (fn.stages81u||[]).forEach(s=>{
          if(!s.enabled){dg.push({fid,label:"81U",status:"disabled",stage:s.id,time:"-",obs:"Stage disabled"});return}
          if(fr<s.pickup){ft81u=true;const t=s.timeOp+(Math.random()*2-1)*s.timeOp*0.02;allTrips.push({func:"81U",stage:s.id,time:t});dg.push({fid,label:"81U",status:"trip",stage:s.id,time:t.toFixed(3),obs:`f=${fr.toFixed(2)}Hz < ${s.pickup}Hz`})}
          else{dg.push({fid,label:"81U",status:"enabled",stage:s.id,time:"-",obs:`f=${fr.toFixed(2)}Hz ≥ ${s.pickup}Hz`})}
        });
        (fn.stages81o||[]).forEach(s=>{
          if(!s.enabled){dg.push({fid,label:"81O",status:"disabled",stage:s.id,time:"-",obs:"Stage disabled"});return}
          if(fr>s.pickup){ft81o=true;const t=s.timeOp+(Math.random()*2-1)*s.timeOp*0.02;allTrips.push({func:"81O",stage:s.id,time:t});dg.push({fid,label:"81O",status:"trip",stage:s.id,time:t.toFixed(3),obs:`f=${fr.toFixed(2)}Hz > ${s.pickup}Hz`})}
          else{dg.push({fid,label:"81O",status:"enabled",stage:s.id,time:"-",obs:`f=${fr.toFixed(2)}Hz ≤ ${s.pickup}Hz`})}
        });
        if(!ft81u&&!ft81o)dg.push({fid,label:fn.label,status:"enabled",stage:"-",time:"-",obs:`f=${fr.toFixed(2)}Hz`});
      }else if(fid==="32"){
        const pA32=calcPower(rr.voltages.Va.mag,rr.currents.Ia.mag,rr.voltages.Va.ang,rr.currents.Ia.ang);
        const pB32=calcPower(rr.voltages.Vb.mag,rr.currents.Ib.mag,rr.voltages.Vb.ang,rr.currents.Ib.ang);
        const pC32=calcPower(rr.voltages.Vc.mag,rr.currents.Ic.mag,rr.voltages.Vc.ang,rr.currents.Ic.ang);
        const P3=pA32.P+pB32.P+pC32.P;let ft32=false;
        (fn.stages32r||[]).forEach(s=>{
          if(!s.enabled){dg.push({fid,label:"32R",status:"disabled",stage:s.id,time:"-",obs:"Stage disabled"});return}
          if(P3<-s.pickup){ft32=true;const t=s.timeOp+(Math.random()*2-1)*s.timeOp*0.02;allTrips.push({func:"32R",stage:s.id,time:t});dg.push({fid,label:"32R",status:"trip",stage:s.id,time:t.toFixed(3),obs:`P=${P3.toFixed(2)}W < -${s.pickup}W`})}
          else{dg.push({fid,label:"32R",status:"enabled",stage:s.id,time:"-",obs:`P=${P3.toFixed(2)}W ≥ -${s.pickup}W`})}
        });
        (fn.stages32f||[]).forEach(s=>{
          if(!s.enabled){dg.push({fid,label:"32F",status:"disabled",stage:s.id,time:"-",obs:"Stage disabled"});return}
          if(P3>s.pickup){ft32=true;const t=s.timeOp+(Math.random()*2-1)*s.timeOp*0.02;allTrips.push({func:"32F",stage:s.id,time:t});dg.push({fid,label:"32F",status:"trip",stage:s.id,time:t.toFixed(3),obs:`P=${P3.toFixed(2)}W > ${s.pickup}W`})}
          else{dg.push({fid,label:"32F",status:"enabled",stage:s.id,time:"-",obs:`P=${P3.toFixed(2)}W ≤ ${s.pickup}W`})}
        });
        if(!ft32)dg.push({fid,label:fn.label,status:"enabled",stage:"-",time:"-",obs:`P3φ=${P3.toFixed(2)}W`})
      }else if(fid==="79"){
        dg.push({fid,label:"79",status:fn.enabled?"enabled":"disabled",stage:"-",time:"-",obs:`Shots:${fn.shots||3} DT:${(fn.deadTimes||[]).join("/")}s Reclaim:${fn.reclaimTime||3.0}s`})
      }else{dg.push({fid,label:fn.label,status:"enabled",stage:"-",time:"-",obs:"Simplified"})}
    });
    return{dg,allTrips};
  };

  const runSim=()=>{
    setSs("running");setStime(0);stimeRef.current=0;setDiag([]);setMaletaTripped(false);
    setEvts(ev=>[{time:nowShort(),icon:"⚡",text:"Simulation started.",dt:"T+0.000s"},...ev.slice(0,20)]);
    let el=0;const iv=10;
    const pfActive=pfEnabled&&pfDuration>0;
    const rp2=relayProt;

    const graph=buildElectricalGraph(fieldState.connections,fieldState.internalConns);
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

      // Registrar evento na PRIMEIRA vez que o relé tripa (proteção mais rápida)
      // Independente de a maleta detectar ou não
      if(!firstTripRecorded){
        firstTripRecorded=true;
        const record={
          timestamp:fmtTs(),
          stages:ids,
          tripTime:latest.time,
          tripPhase:latest.time!==null?"fault":"prefault",
          prefault:{
            enabled:pfActive,
            duration:pfActive?pfDuration:0,
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

      // Verificar se a maleta detecta via BO→Borne→BI (cabos físicos)
      const maletaDetected=checkMaletaTripDetection(ids,relayMatrix,fieldStateRef.current);
      if(maletaDetected){
        clearInterval(tr.current);setSs("idle");setSimPhase("idle");setMaletaTripped(true);
        if(latest.time!==null){setStime(latest.time);stimeRef.current=latest.time;}
        const maletaStop=latest.time;
        setTripHistory(prev=>{
          if(prev.length===0)return prev;
          const updated=[...prev];
          updated[0]={...updated[0],maletaStopTime:maletaStop};
          return updated;
        });
        setEvts(ev=>[{time:nowShort(),icon:"🔴",text:`TRIP detected by maleta: ${ids.join(", ")}`,dt:dtLabel},...ev.slice(0,20)]);
        return true;
      }
      // Bobina de trip (TC — TB13/TB14): BO do relé cabeado → trip coil → disjuntor abre
      const tcTrip=checkBreakerTripCoil(ids,relayMatrix,fieldStateRef.current);
      if(tcTrip){
        clearInterval(tr.current);setSs("idle");setSimPhase("idle");setMaletaTripped(true);
        if(latest.time!==null){setStime(latest.time);stimeRef.current=latest.time;}
        setTripHistory(prev=>{if(prev.length===0)return prev;const u=[...prev];u[0]={...u[0],maletaStopTime:latest.time};return u;});
        setEvts(ev=>[{time:nowShort(),icon:"🔓",text:`TRIP via bobina TC: ${ids.join(", ")}`,dt:dtLabel},...ev.slice(0,20)]);
        return true;
      }
      // FALLBACK — Output Matrix: stage mapeado a BO → BO aciona bobina de trip do disjuntor
      // Não requer cabo físico BO→BI. Representa o circuito externo relé→disjuntor.
      const boTriggered=ids.filter(id=>boCols.some(bo=>relayMatrix[id]?.[bo]));
      if(boTriggered.length>0){
        const activeBOs=boCols.filter(bo=>boTriggered.some(id=>relayMatrix[id]?.[bo]));
        clearInterval(tr.current);setSs("idle");setSimPhase("idle");setMaletaTripped(true);
        if(latest.time!==null){setStime(latest.time);stimeRef.current=latest.time;}
        setTripHistory(prev=>{
          if(prev.length===0)return prev;
          const updated=[...prev];
          updated[0]={...updated[0],maletaStopTime:latest.time};
          return updated;
        });
        setEvts(ev=>[{time:nowShort(),icon:"⚡",text:`${boTriggered.join(", ")} → ${activeBOs.join("/")} → OPEN_CB`,dt:dtLabel},...ev.slice(0,20)]);
        return true;
      }
      return false;
    };

    // ══════════════════════════════════════════════════════════════════════════
    // MODO SEM PRÉ-FALTA: cálculo direto de tempos, timer progressivo simples
    // ══════════════════════════════════════════════════════════════════════════
    if(!pfActive){
      setSimPhase("fault");
      const eval0=evalProtectionsDirect(faultRR);
      setDiag(eval0.dg);
      const allTrips=eval0.allTrips;

      // ── PRÉ-INJEÇÃO 27: sem pré-falta, o relé estava a 0V antes da injeção ──
      // Se 27 habilitada e Low-V Block desabilitado, o relé já tripou na 27
      // antes da injeção começar (0V = subtensão total). Trip em T~0.
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

    // ══════════════════════════════════════════════════════════════════════════
    // MODO COM PRÉ-FALTA: integração por acumulador (fração de operação)
    // Necessário porque a corrente muda de pré-falta→falta e o relé mantém
    // memória acumulada da curva inversa.
    // ══════════════════════════════════════════════════════════════════════════
    const pfDurMs=pfDuration*1000;
    let phase="prefault";let faultEl=0;let stopped=false;
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

      let currentRR;
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

      // Integração da curva por estágio
      let newTrips=false;
      stageStates.forEach(ss=>{
        if(ss.tripped)return;
        let Ttotal;
        if(ss.fid==="27/59"){
          // Proteção de tensão: verificar condição de pickup por tensão
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
          Ttotal=ss.stage.timeOp; // DT puro
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
          // Trip na pré-falta NÃO para a maleta — apenas registra
          const ids=trippedSoFar.map(t=>t.stage);
          setTrippedStageIds(prev=>{const merged=new Set([...prev,...ids]);return[...merged]});
          setIsTripped(true);
          setEvts(ev=>[{time:nowShort(),icon:"⚠",text:`Trip na pré-falta: ${latest.stage} (maleta continua)`,dt:"PF"},...ev.slice(0,20)]);
        }else{
          if(handleTrips(trippedSoFar,latest,"T",rr))stopped=true;
        }
      }

      // Diagnostics
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
              // Diagnóstico por tensão
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

      // Timeout
      if(phase==="fault"&&faultEl>60000&&!stopped){
        clearInterval(tr.current);setSs("idle");setSimPhase("idle");
        if(trippedSoFar.length>0)setEvts(ev=>[{time:nowShort(),icon:"⚠",text:`Timeout — relay tripped but maleta did not detect.`,dt:"T+60.000s"},...ev.slice(0,20)]);
      }
    },iv);
  };
  const stop79=()=>{const ar=ar79Ref.current;if(ar.deadTimer){clearTimeout(ar.deadTimer);ar.deadTimer=null}if(ar.reclaimTimer){clearTimeout(ar.reclaimTimer);ar.reclaimTimer=null}ar.shot=0;ar.locked=false};
  const stopSim=()=>{if(tr.current)clearInterval(tr.current);stop79();pendingTrip.current=null;setSs("idle");setSimPhase("idle");setEvts(ev=>[{time:nowShort(),icon:"⏹",text:"Stopped.",dt:`T+${stime.toFixed(3)}s`},...ev.slice(0,20)])};
  // Reset Fault: para simulação e limpa cronômetro/diagnostics, mas NÃO limpa trip/LEDs do relé
  const resetFault=()=>{if(tr.current)clearInterval(tr.current);stop79();pendingTrip.current=null;setSs("idle");setSimPhase("idle");setStime(0);stimeRef.current=0;setDiag([]);setEvts([]);setMaletaTripped(false);setBkResetCtr(c=>c+1)};
  // RESET do relé (botão frontal): ÚNICO que limpa trip, LEDs e fault record
  // Porém: se a condição de 27 ainda está ativa (0V sem Low-V Block), o reset é bloqueado.
  const resetRelay=()=>{
    if(!injecting){
      const active27=check27IdleCondition();
      if(active27.length>0){
        setEvts(ev=>[{time:nowShort(),icon:"⚠",text:`Reset bloqueado: 27 ativa (${active27.map(s=>s.id).join(", ")}). Habilite Low-V Block ou injete tensão.`,dt:""},...ev.slice(0,20)]);
        return;
      }
    }
    setTrippedStageIds([]);setIsTripped(false);setFaultRecord(null);
  };

  // ── SALVAR / ABRIR ARQUIVO ──────────────────────────────────────────────────
  // Snapshot: registra o que o relé VÊ NESTE MOMENTO.
  // Se não está injetando → zeros. Se está injetando → valores reais.
  // Sem sinalização, sem parar cronômetro, sem LEDs, sem BO.
  const takeSnapshot=()=>{
    const isInj=ss==="running";
    const z={mag:0,ang:0};
    const zI={Ia:{...z},Ib:{...z},Ic:{...z}};
    const zV={Va:{...z},Vb:{...z},Vc:{...z}};
    const nowI=isInj?{Ia:{...relayReadings.currents.Ia},Ib:{...relayReadings.currents.Ib},Ic:{...relayReadings.currents.Ic}}:zI;
    const nowV=isInj?{Va:{...relayReadings.voltages.Va},Vb:{...relayReadings.voltages.Vb},Vc:{...relayReadings.voltages.Vc}}:zV;
    const panelI=isInj?{Ia:{...p.currents.Ia},Ib:{...p.currents.Ib},Ic:{...p.currents.Ic}}:zI;
    const panelV=isInj?{Va:{...p.voltages.Va},Vb:{...p.voltages.Vb},Vc:{...p.voltages.Vc}}:zV;
    const pfActive2=pfEnabled&&pfDuration>0;
    const inPrefault=isInj&&simPhase==="prefault";
    const record={
      timestamp:fmtTs(),
      stages:["SNAPSHOT"],
      tripTime:isInj&&stime>0?stime:null,
      tripPhase:isInj?"snapshot_inj":"snapshot",
      prefault:{
        enabled:pfActive2&&inPrefault,
        duration:(pfActive2&&inPrefault)?pfDuration:0,
        currents:inPrefault?{Ia:{...pf.currents.Ia},Ib:{...pf.currents.Ib},Ic:{...pf.currents.Ic}}:null,
        voltages:inPrefault?{Va:{...pf.voltages.Va},Vb:{...pf.voltages.Vb},Vc:{...pf.voltages.Vc}}:null,
        relayCurrents:inPrefault?{...nowI}:null,
        relayVoltages:inPrefault?{...nowV}:null,
      },
      fault:{
        currents:panelI,
        voltages:panelV,
        relayCurrents:nowI,
        relayVoltages:nowV,
      },
      primary:{
        currents:{Ia:{mag:nowI.Ia.mag*rtc,ang:nowI.Ia.ang},Ib:{mag:nowI.Ib.mag*rtc,ang:nowI.Ib.ang},Ic:{mag:nowI.Ic.mag*rtc,ang:nowI.Ic.ang}},
        voltages:{Va:{mag:nowV.Va.mag*rtp,ang:nowV.Va.ang},Vb:{mag:nowV.Vb.mag*rtp,ang:nowV.Vb.ang},Vc:{mag:nowV.Vc.mag*rtp,ang:nowV.Vc.ang}},
      },
      system:{rtc,rtp,priV:sys.tp.priV,secV:sys.tp.secV,priA:sys.tc.priA,secA:sys.tc.secA},
    };
    setTripHistory(prev=>[record,...prev].slice(0,5));
    setEvts(ev=>[{time:nowShort(),icon:"📷",text:`Snapshot: ${isInj?"recording":"idle (zeros)"}`,dt:""},...ev.slice(0,20)]);
  };

  // ── DUMP COMPLETO: exporta todo o estado da ferramenta para diagnóstico ──
  const dumpFullState=()=>{
    const L=[];
    L.push("═══ RELAY TESTER PRO — DUMP COMPLETO ═══");
    L.push(`Timestamp: ${fmtTs()}`);
    L.push("");

    // Sistema
    L.push("── SYSTEM ──");
    L.push(`TP: ${sys.tp.priV}V / ${sys.tp.secV}V (${sys.tp.priConn}/${sys.tp.secConn}) RTP=${rtp.toFixed(2)}`);
    L.push(`TC: ${sys.tc.priA}A / ${sys.tc.secA}A RTC=${rtc.toFixed(2)}`);
    L.push("");

    // Fasores de falta
    L.push("── FAULT PHASORS ──");
    ["Ia","Ib","Ic"].forEach(k=>L.push(`  ${k}: ${p.currents[k].mag.toFixed(3)}A ∠${p.currents[k].ang.toFixed(1)}°`));
    ["Va","Vb","Vc"].forEach(k=>L.push(`  ${k}: ${p.voltages[k].mag.toFixed(3)}V ∠${p.voltages[k].ang.toFixed(1)}°`));
    L.push(`  Balanced: I=${balI} (${seqI}) V=${balV} (${seqV})`);
    L.push("");

    // Pré-falta
    L.push("── PRE-FAULT ──");
    L.push(`  Enabled: ${pfEnabled} Duration: ${pfDuration}s`);
    if(pfEnabled){
      ["Ia","Ib","Ic"].forEach(k=>L.push(`  ${k}: ${pf.currents[k].mag.toFixed(3)}A ∠${pf.currents[k].ang.toFixed(1)}°`));
      ["Va","Vb","Vc"].forEach(k=>L.push(`  ${k}: ${pf.voltages[k].mag.toFixed(3)}V ∠${pf.voltages[k].ang.toFixed(1)}°`));
    }
    L.push("");

    // Proteções (relayProt = o que está no relé)
    L.push("── RELAY PROTECTIONS (active in relay) ──");
    protOrder.forEach(fid=>{
      const fn=relayProt[fid];if(!fn)return;
      L.push(`[${fid}] ${fn.name} — ${fn.enabled?"ENABLED":"disabled"}`);
      if(!fn.enabled)return;
      if(fn.base)L.push(`  Base: ${fn.base}`);
      if(fid==="27/59"){
        L.push(`  StartPhases: ${fn.startPhases||"any"} VoltageSelection: ${fn.voltageSelection||"ph-n"}`);
        L.push(`  Hysteresis: ${fn.hysteresis||4}% LowVBlock: ${fn.lowVoltageBlockEnabled?"ON":"OFF"} (${fn.voltageBlockPu||0.2}pu)`);
        (fn.stages27||[]).forEach(s=>L.push(`  ${s.id}: ${s.enabled?"ON":"off"} pickup=${s.pickup}pu timeOp=${s.timeOp}s`));
        (fn.stages59||[]).forEach(s=>L.push(`  ${s.id}: ${s.enabled?"ON":"off"} pickup=${s.pickup}pu timeOp=${s.timeOp}s`));
      }else if(fid==="47"){
        (fn.stages||[]).forEach(s=>L.push(`  ${s.id}: ${s.enabled?"ON":"off"} pickup=${s.pickup}pu timeOp=${s.timeOp}s`));
      }else if(fid==="67"||fid==="67N"){
        (fn.stages||[]).forEach(s=>L.push(`  ${s.id}: ${s.enabled?"ON":"off"} pickup=${s.pickup}A TD=${s.timeDial} curve=${s.curve} mta=${s.mta}° pol=${s.pol} dir=${s.dir||"forward"}`));
      }else{
        (fn.stages||[]).forEach(s=>L.push(`  ${s.id}: ${s.enabled?"ON":"off"} pickup=${s.pickup}A TD=${s.timeDial} curve=${s.curve} timeOp=${s.timeOp}s`));
      }
    });
    L.push("");

    // Pending config (painel, ainda não enviado)
    const protDiff=protOrder.some(fid=>JSON.stringify(prot[fid])!==JSON.stringify(relayProt[fid]));
    if(protDiff)L.push("⚠ PANEL PROTECTIONS differ from RELAY (not yet sent)");
    L.push("");

    // Output Matrix (apenas true)
    L.push("── OUTPUT MATRIX ──");
    let matCount=0;
    Object.keys(relayMatrix).forEach(row=>{
      Object.keys(relayMatrix[row]).forEach(col=>{
        if(relayMatrix[row][col]){L.push(`  ${row} → ${col}`);matCount++}
      });
    });
    if(matCount===0)L.push("  (empty — no mappings)");
    L.push("");

    // Campo: conexões
    L.push("── FIELD CONNECTIONS ──");
    const conns=fieldState.connections||[];
    if(conns.length===0)L.push("  (no cables)");
    else conns.forEach(c=>L.push(`  [${c.id}] ${c.from} ↔ ${c.to}`));
    L.push("");

    // Campo: conexões internas (chave de aferição)
    L.push("── SWITCH INTERNAL CONNS ──");
    const ics=fieldState.internalConns||[];
    if(ics.length===0)L.push("  (no internal connections — switch open)");
    else ics.forEach(c=>L.push(`  ${c[0]} ↔ ${c[1]}`));
    L.push("");

    // Relay readings (o que o relé vê agora)
    L.push("── RELAY READINGS (what relay sees now) ──");
    L.push(`  Injecting: ${injecting} SimPhase: ${simPhase} Status: ${ss}`);
    const rI=injecting?relayReadings.currents:{Ia:{mag:0,ang:0},Ib:{mag:0,ang:0},Ic:{mag:0,ang:0}};
    const rV=injecting?relayReadings.voltages:{Va:{mag:0,ang:0},Vb:{mag:0,ang:0},Vc:{mag:0,ang:0}};
    ["Ia","Ib","Ic"].forEach(k=>L.push(`  ${k}: ${rI[k].mag.toFixed(3)}A ∠${rI[k].ang.toFixed(1)}°`));
    ["Va","Vb","Vc"].forEach(k=>L.push(`  ${k}: ${rV[k].mag.toFixed(3)}V ∠${rV[k].ang.toFixed(1)}°`));
    L.push("");

    // Estado do relé
    L.push("── RELAY STATE ──");
    L.push(`  Tripped: ${isTripped} MaletaTripped: ${maletaTripped}`);
    L.push(`  TrippedStages: ${trippedStageIds.length>0?trippedStageIds.join(", "):"(none)"}`);
    L.push(`  Timer: ${stime.toFixed(3)}s`);
    L.push("");

    // Diagnostics
    if(diag.length>0){
      L.push("── DIAGNOSTICS ──");
      diag.forEach(d=>L.push(`  [${d.label}] ${d.stage} ${d.status} t=${d.time} ${d.obs}`));
      L.push("");
    }

    // Events (últimos 5)
    if(evts.length>0){
      L.push("── EVENTS (recent) ──");
      evts.slice(0,5).forEach(e=>L.push(`  [${e.time}] ${e.icon} ${e.text} ${e.dt}`));
    }

    L.push("");
    L.push("═══ END DUMP ═══");
    const text=L.join("\n");
    navigator.clipboard.writeText(text).then(()=>{
      setEvts(ev=>[{time:nowShort(),icon:"📋",text:"Full state dump copied to clipboard.",dt:""},...ev.slice(0,20)]);
    }).catch(()=>{
      // Fallback: download como arquivo
      const blob=new Blob([text],{type:'text/plain'});const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='dump_state.txt';
      document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
      setEvts(ev=>[{time:nowShort(),icon:"📋",text:"Full state dump saved to file.",dt:""},...ev.slice(0,20)]);
    });
  };

  const saveFile=async()=>{
    const content=buildSaveContent(sys,prot,outMatrix,{connections:fieldState.connections||[],switchSt:fieldState.switchSt||{}});
    try{
      // API moderna: abre janela "Salvar como" com nome editável
      const handle=await window.showSaveFilePicker({
        suggestedName:'relay_config.txt',
        types:[{description:'Text File',accept:{'text/plain':['.txt']}}],
      });
      const writable=await handle.createWritable();
      await writable.write(content);
      await writable.close();
      setEvts(ev=>[{time:nowShort(),icon:"💾",text:`Configuration saved: ${handle.name}`,dt:""},...ev.slice(0,20)]);
    }catch(err){
      if(err.name!=='AbortError'){
        // Fallback para navegadores sem suporte
        const blob=new Blob([content],{type:'text/plain;charset=utf-8'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download='relay_config.txt';
        document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
        setEvts(ev=>[{time:nowShort(),icon:"💾",text:"Configuration saved to file.",dt:""},...ev.slice(0,20)]);
      }
    }
  };
  const loadFile=()=>{
    const input=document.createElement('input');input.type='file';input.accept='.txt';
    input.onchange=(e)=>{
      const file=e.target.files[0];if(!file)return;
      const reader=new FileReader();
      reader.onload=(ev)=>{
        try{
          const result=parseSaveFile(ev.target.result,prot,outMatrix);
          setSys(result.sys);setProt(result.prot);setOutMatrix(result.outMatrix);
          if(result.wiring)setCampoLoadWiring(result.wiring);
          setEvts(ev2=>[{time:nowShort(),icon:"📂",text:`Configuration loaded: ${file.name}`,dt:""},...ev2.slice(0,20)]);
        }catch(err){
          setEvts(ev2=>[{time:nowShort(),icon:"✗",text:`Error loading file: ${err.message}`,dt:""},...ev2.slice(0,20)]);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const getStages=()=>{const f=prot[tab];if(tab==="27/59")return[...(f.stages27||[]),...(f.stages59||[])];if(tab==="81")return[...(f.stages81u||[]),...(f.stages81o||[])];if(tab==="32")return[...(f.stages32r||[]),...(f.stages32f||[])];if(tab==="79")return[];return f.stages||[]};
  const getCur=()=>{if(tab==="27/59"){return si<3?prot["27/59"].stages27?.[si]:prot["27/59"].stages59?.[si-3]}if(tab==="81"){return si<3?prot["81"].stages81u?.[si]:prot["81"].stages81o?.[si-3]}if(tab==="32"){return si<2?prot["32"].stages32r?.[si]:prot["32"].stages32f?.[si-2]}if(tab==="79")return null;return(prot[tab].stages||[])[si]};
  const isOC=["50","51","50N","51N","67","67N"].includes(tab);const isTm=["51","51N","67","67N"].includes(tab);const isDir=["67","67N"].includes(tab);const isVlt=tab==="27/59";const is46=tab==="46";const is81=tab==="81";const is32=tab==="32";const is79=tab==="79";
  const stages=getStages();const cur=getCur();
  const ff=(v,d=2)=>v.toFixed(d);const fa=v=>v.toFixed(1);
  // O display do relé mostra relayReadings (o que chega via cabos), não p (painel)
  const ci=injecting?relayReadings.currents:{Ia:{mag:0,ang:0},Ib:{mag:0,ang:0},Ic:{mag:0,ang:0}};
  const vi=injecting?relayReadings.voltages:{Va:{mag:0,ang:0},Vb:{mag:0,ang:0},Vc:{mag:0,ang:0}};
  const i0=injecting?i3i0:{mag:0,ang:0};const v0=injecting?v3v0:{mag:0,ang:0};
  const i2lcd=injecting?calcI2(relayReadings.currents):{mag:0,ang:0};
  const freqLcd=sys.freq??60;
  const pageNames=["I Secundária","I Primária","I Múltiplo TC","V Secundária","V Primária","V Múltiplo TP","P Secundária","P Primária","Seq. / Freq.","Fault Record"];

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
    {protOrder.map(fid=>{
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

  const renderCenter=()=>{
    if(mainTab==="sys")return(<div className="card-scroll"><div className="cp"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><div><div className="fn" style={{marginBottom:10}}>Potential Transformer (TP)</div><div className="fr"><div className="fg"><div className="fl">V Pri</div><IB unit="V" value={sys.tp.priV} onChange={v=>uS("tp","priV",v)}/></div><div className="fg"><div className="fl">V Sec</div><IB unit="V" value={sys.tp.secV} onChange={v=>uS("tp","secV",v)}/></div></div><div className="fl" style={{margin:"6px 0 3px"}}>Primary</div><div className="conn-r"><button className={`conn-b ${sys.tp.priConn==="estrela"?"on":""}`} onClick={()=>uS("tp","priConn","estrela")}>Y</button><button className={`conn-b ${sys.tp.priConn==="delta"?"on":""}`} onClick={()=>uS("tp","priConn","delta")}>Δ</button></div><div className="fl" style={{margin:"6px 0 3px"}}>Secondary</div><div className="conn-r"><button className={`conn-b ${sys.tp.secConn==="estrela"?"on":""}`} onClick={()=>uS("tp","secConn","estrela")}>Y</button><button className={`conn-b ${sys.tp.secConn==="delta"?"on":""}`} onClick={()=>uS("tp","secConn","delta")}>Δ</button></div><div className="ratio">RTP = {rtp.toFixed(2)}</div></div><div><div className="fn" style={{marginBottom:10}}>Current Transformer (TC)</div><div className="fr"><div className="fg"><div className="fl">I Pri</div><IB unit="A" value={sys.tc.priA} onChange={v=>uS("tc","priA",v)}/></div><div className="fg"><div className="fl">I Sec</div><IB unit="A" value={sys.tc.secA} onChange={v=>uS("tc","secA",v)}/></div></div><div className="ratio">RTC = {rtc.toFixed(2)}</div></div></div></div></div>);
    if(mainTab==="relay")return(<><div className="tp-strip"><span className="tp-lbl">PRESET</span>{TEST_PRESETS.map(p=><button key={p.id} className="tp-btn" title={p.desc} onClick={()=>applyTestPreset(p)}>{p.label}</button>)}</div><div className="tbar">{protOrder.map(id=><button key={id} className={`ti ${tab===id?"on":""}`} onClick={()=>{setTab(id);setSi(0)}}>{id}</button>)}</div><div className="card-scroll"><div className="cp">
      <div className="fh"><span className="fn">{prot[tab].name}</span><Tgl value={prot[tab].enabled} onChange={v=>uPr(tab,"enabled",v)} label={prot[tab].enabled?"Enabled":"Disabled"}/></div>
      {isOC&&<div className="bs"><label>Adjustment Base</label><select className="sl" value={prot[tab].base} onChange={e=>uPr(tab,"base",e.target.value)}><option value="primario">Primary Value</option><option value="secundario">Secondary Value</option><option value="multiplo">CT Multiple</option></select></div>}
      {isVlt&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
        <div className="bs"><label>Start Phases</label><select className="sl" value={prot[tab].startPhases||"any"} onChange={e=>uPr(tab,"startPhases",e.target.value)}><option value="any">Any (qualquer 1φ)</option><option value="all">All (todas 3φ)</option></select></div>
        <div className="bs"><label>Voltage Selection</label><select className="sl" value={prot[tab].voltageSelection||"ph-n"} onChange={e=>uPr(tab,"voltageSelection",e.target.value)}><option value="ph-n">Fase-Terra (Ph-N)</option><option value="ph-ph">Fase-Fase (Ph-Ph)</option></select></div>
        <div className="bs"><label>Hysteresis (%)</label><IB unit="%" value={prot[tab].hysteresis||4.0} onChange={v=>uPr(tab,"hysteresis",v)} step="0.1"/></div>
        <div className="bs"><Tgl value={prot[tab].lowVoltageBlockEnabled||false} onChange={v=>uPr(tab,"lowVoltageBlockEnabled",v)} label="Low-V Block (27)"/>{prot[tab].lowVoltageBlockEnabled&&<div style={{marginTop:4}}><IB unit="pu" value={prot[tab].voltageBlockPu||0.20} onChange={v=>uPr(tab,"voltageBlockPu",v)} step="0.01"/></div>}</div>
      </div>}
      <div className="stbar">{stages.map((s,i)=><button key={s.id} className={`stb ${i===si?"on":""} ${!s.enabled?"dis":""}`} onClick={()=>setSi(i)}>{s.id}</button>)}</div>
      {is46&&<div className="bs" style={{marginBottom:8,padding:"6px 8px",background:"var(--card2)",borderRadius:"var(--rs)",fontSize:10,color:"var(--tx3)"}}>Pickup = I₂ (seq. negativa) em Ampères secundários. Tempo Definido.</div>}
      {is81&&<div className="bs" style={{marginBottom:8,padding:"6px 8px",background:"var(--card2)",borderRadius:"var(--rs)",fontSize:10,color:"var(--tx3)"}}>81U-1..3 = subfrequência · 81O-1..3 = sobrefrequência · Frequência ajustada no painel lateral (Frequency).</div>}
      {is32&&<div className="bs" style={{marginBottom:8,padding:"6px 8px",background:"var(--card2)",borderRadius:"var(--rs)",fontSize:10,color:"var(--tx3)"}}>32R-1..2 = potência reversa (P3φ &lt; −pickup) · 32F-1..2 = potência direta (P3φ &gt; pickup) · Pickup em Watts secundários.</div>}
      {is79&&<div style={{marginTop:4}}><div style={{marginBottom:8,padding:"6px 8px",background:"var(--card2)",borderRadius:"var(--rs)",fontSize:10,color:"var(--tx3)"}}>Dead time = tempo aberto antes de religar. Reclaim time = tempo após religamento bem-sucedido para resetar o contador de shots.</div><div className="pg"><div className="pi"><label>Nº de Shots</label><IB unit="shots" value={prot["79"].shots??3} onChange={v=>uPr("79","shots",Math.max(1,Math.round(v)))}/></div><div className="pi"><label>Reclaim Time</label><IB unit="s" value={prot["79"].reclaimTime??3.0} onChange={v=>uPr("79","reclaimTime",v)} step="0.1"/></div></div><div style={{marginTop:8}}><div className="fl" style={{marginBottom:4}}>Dead Times (s) por shot</div>{(prot["79"].deadTimes||[0.5,5.0,15.0]).map((dt,i)=><div key={i} className="fr" style={{marginBottom:4}}><div className="fg"><div className="fl">Shot {i+1}</div><IB unit="s" value={dt} onChange={v=>{const dts=[...(prot["79"].deadTimes||[0.5,5.0,15.0])];dts[i]=v;uPr("79","deadTimes",dts);}} step="0.1"/></div></div>)}</div></div>}
      {cur&&<div><Tgl value={cur.enabled} onChange={v=>uSt(tab,si,"enabled",v)} label={`Stage ${cur.id}`}/><div className="pg">
        {(isOC||isDir)&&<div className="pi"><label>{tab.includes("50")?"Pickup (Inst)":"Pickup (Time)"}</label><IB unit="A" value={cur.pickup} onChange={v=>uSt(tab,si,"pickup",v)}/></div>}
        {(isVlt||tab==="47")&&<div className="pi"><label>Pickup (pu)</label><IB unit="pu" value={cur.pickup} onChange={v=>uSt(tab,si,"pickup",v)} step="0.01"/></div>}
        {is46&&<div className="pi"><label>Pickup I₂ (A)</label><IB unit="A" value={cur.pickup} onChange={v=>uSt(tab,si,"pickup",v)} step="0.01"/></div>}
        {is81&&<div className="pi"><label>{cur.id.startsWith("81U")?"Pickup subfreq (Hz)":"Pickup sobrefreq (Hz)"}</label><IB unit="Hz" value={cur.pickup} onChange={v=>uSt(tab,si,"pickup",v)} step="0.05"/></div>}
        {is32&&<div className="pi"><label>{cur.id.startsWith("32R")?"Pickup 32R (W)":"Pickup 32F (W)"}</label><IB unit="W" value={cur.pickup} onChange={v=>uSt(tab,si,"pickup",v)} step="1"/></div>}
        {isTm&&<><div className="pi"><label>Time Dial</label><IB value={cur.timeDial} onChange={v=>uSt(tab,si,"timeDial",v)} step="0.01"/></div><div className="pi"><label>Curve</label><select className="sl" value={cur.curve} onChange={e=>uSt(tab,si,"curve",e.target.value)}>{curveTypes.map(c=><option key={c} value={c}>{c}</option>)}</select></div></>}
        {(!isTm&&!isVlt&&tab!=="47"&&!is46&&!is81&&!is32)&&<div className="pi"><label>Time Op. (s)</label><IB unit="s" value={cur.timeOp} onChange={v=>uSt(tab,si,"timeOp",v)} step="0.01"/></div>}
        {(isVlt||tab==="47"||is46||is81||is32)&&<div className="pi"><label>Time Op. (s)</label><IB unit="s" value={cur.timeOp} onChange={v=>uSt(tab,si,"timeOp",v)} step="0.01"/></div>}
        {isDir&&<><div className="pi"><label>MTA (°)</label><IB unit="°" value={cur.mta} onChange={v=>uSt(tab,si,"mta",v)} step="1"/></div><div className="pi"><label>Polarization</label><select className="sl" value={cur.pol} onChange={e=>uSt(tab,si,"pol",e.target.value)}>{tab==="67"?<><option value="quadratura">Quadrature</option><option value="quad_loop">Quad. Loop</option><option value="seq_pos">Positive Seq.</option><option value="seq_pos_loop">Pos. Seq. Loop</option></>:<><option value="-V0">−V₀</option><option value="V0">V₀</option></>}</select></div><div className="pi"><label>Direction</label><select className="sl" value={cur.dir||"forward"} onChange={e=>uSt(tab,si,"dir",e.target.value)}><option value="forward">Forward</option><option value="reverse">Reverse</option></select></div>{tab==="67N"&&<div className="pi"><label>Vmin Pol.</label><IB unit="V" value={cur.minPolV} onChange={v=>uSt(tab,si,"minPolV",v)} step="0.1"/></div>}</>}
      </div></div>}
    </div></div></>);
    if(mainTab==="output")return(<div className="card-scroll"><div className="mx-wrap"><table className="mx"><thead><tr><th className="corner">Signal</th>{boCols.map(c=><th key={c} className="col-bo">{c}</th>)}{ledCols.map(c=><th key={c} className="col-led">{c}</th>)}</tr></thead><tbody>
      <tr className="mx-section"><td colSpan={allCols.length+1}>Binary Inputs</td></tr>
      {biRows.map(r=><tr key={r}><td className="row-label is-bi">{r}</td>{allCols.map(c=><td key={c}><div className="mx-cell"><div className={`mx-chk ${outMatrix[r]?.[c]?"on":""}`} onClick={()=>toggleMatrix(r,c)}/></div></td>)}</tr>)}
      <tr className="mx-section"><td colSpan={allCols.length+1}>CB Status</td></tr>
      {cbStatusRows.map(r=><tr key={r}><td className="row-label" style={{color:'var(--sky)'}}>{r}</td>{allCols.map(c=><td key={c}><div className="mx-cell"><div className={`mx-chk ${outMatrix[r]?.[c]?"on":""}`} onClick={()=>toggleMatrix(r,c)}/></div></td>)}</tr>)}
      <tr className="mx-section"><td colSpan={allCols.length+1}>CB Commands</td></tr>
      {cbCmdRows.map(r=><tr key={r}><td className="row-label" style={{color:'var(--amber)'}}>{r}</td>{allCols.map(c=><td key={c}><div className="mx-cell"><div className={`mx-chk ${outMatrix[r]?.[c]?"on":""}`} onClick={()=>toggleMatrix(r,c)}/></div></td>)}</tr>)}
      <tr className="mx-section"><td colSpan={allCols.length+1}>Protection Stages</td></tr>
      {protStageRows.map(r=><tr key={r}><td className="row-label is-prot">{r}</td>{allCols.map(c=><td key={c}><div className="mx-cell"><div className={`mx-chk ${outMatrix[r]?.[c]?"on":""}`} onClick={()=>toggleMatrix(r,c)}/></div></td>)}</tr>)}
    </tbody></table></div></div>);
    return(<div className="card-scroll"><div className="mx-wrap">
      <table className="mx"><thead><tr>
        <th className="corner">Signal</th>
        {biRows.map(c=><th key={c} className="col-bo">{c}</th>)}
      </tr></thead><tbody>
        <tr className="mx-section"><td colSpan={biRows.length+1}>CB Status</td></tr>
        {inMatrixRows.map(r=><tr key={r}><td className="row-label" style={{color:'var(--sky)'}}>{r}</td>{biRows.map(c=><td key={c}><div className="mx-cell"><div className={`mx-chk ${inMatrix[r]?.[c]?"on":""}`} onClick={()=>toggleInMatrix(r,c)}/></div></td>)}</tr>)}
      </tbody></table>
      <div style={{marginTop:16,padding:'10px 12px',background:'var(--card2)',borderRadius:'var(--rs)',border:'1px solid var(--bdr)',fontSize:10,fontFamily:'var(--fm)',color:'var(--tx3)',lineHeight:1.7}}>
        <span style={{color:'var(--sky)',fontWeight:700}}>CB_Opened</span> → BI mapeada recebe sinal quando o disjuntor <b>abre</b> (contato 52b). A contagem de tempo do trip para neste instante.<br/>
        <span style={{color:'var(--sky)',fontWeight:700}}>CB_Closed</span> → BI mapeada recebe sinal quando o disjuntor <b>fecha</b> (contato 52a). Registrado no Event Log.
      </div>
    </div></div>);
  };

  // ── Cálculo de componentes simétricas para diagrama fasorial ──
  const seqComponents=useMemo(()=>{
    const src=pfMode==="prefault"?pf:p;
    const a1=toRect(1,120),a2=toRect(1,240);
    const cI={Ia:toRect(src.currents.Ia.mag,src.currents.Ia.ang),Ib:toRect(src.currents.Ib.mag,src.currents.Ib.ang),Ic:toRect(src.currents.Ic.mag,src.currents.Ic.ang)};
    const cV={Va:toRect(src.voltages.Va.mag,src.voltages.Va.ang),Vb:toRect(src.voltages.Vb.mag,src.voltages.Vb.ang),Vc:toRect(src.voltages.Vc.mag,src.voltages.Vc.ang)};
    // I0=(Ia+Ib+Ic)/3, I1=(Ia+a·Ib+a²·Ic)/3, I2=(Ia+a²·Ib+a·Ic)/3
    const s=(a,b,c)=>({re:(a.re+b.re+c.re)/3,im:(a.im+b.im+c.im)/3});
    const I0=s(cI.Ia,cI.Ib,cI.Ic);
    const I1=s(cI.Ia,mulC(a1,cI.Ib),mulC(a2,cI.Ic));
    const I2=s(cI.Ia,mulC(a2,cI.Ib),mulC(a1,cI.Ic));
    const V0=s(cV.Va,cV.Vb,cV.Vc);
    const V1=s(cV.Va,mulC(a1,cV.Vb),mulC(a2,cV.Vc));
    const V2=s(cV.Va,mulC(a2,cV.Vb),mulC(a1,cV.Vc));
    const tp=z=>({mag:Math.sqrt(z.re*z.re+z.im*z.im),ang:normAng(Math.atan2(z.im,z.re)*180/Math.PI)});
    // Tensões entre fases: Vab=Va-Vb, Vbc=Vb-Vc, Vca=Vc-Va
    const Vab=subC(cV.Va,cV.Vb),Vbc=subC(cV.Vb,cV.Vc),Vca=subC(cV.Vc,cV.Va);
    return{I0:tp(I0),I1:tp(I1),I2:tp(I2),V0:tp(V0),V1:tp(V1),V2:tp(V2),Vab:tp(Vab),Vbc:tp(Vbc),Vca:tp(Vca)};
  },[p,pf,pfMode]);

  // ── Renderização do diagrama fasorial ──
  const renderPhasorDiagram=()=>{
    if(!phasorDiagOpen)return null;
    const src=pfMode==="prefault"?pf:p;
    const allPhasors=[];
    const colors={Ia:"#ff6b6b",Ib:"#51cf66",Ic:"#339af0",Va:"#ff922b",Vb:"#845ef7",Vc:"#20c997",Vab:"#e8590c",Vbc:"#9775fa",Vca:"#38d9a9",I0:"#ff8787",I1:"#69db7c",I2:"#74c0fc",V0:"#ffa94d",V1:"#b197fc",V2:"#63e6be"};
    const dashes={I0:"4,3",I1:"4,3",I2:"4,3",V0:"4,3",V1:"4,3",V2:"4,3",Vab:"6,3",Vbc:"6,3",Vca:"6,3"};
    if(phasorVis.Ia)allPhasors.push({id:"Ia",mag:src.currents.Ia.mag,ang:src.currents.Ia.ang,color:colors.Ia,type:"I"});
    if(phasorVis.Ib)allPhasors.push({id:"Ib",mag:src.currents.Ib.mag,ang:src.currents.Ib.ang,color:colors.Ib,type:"I"});
    if(phasorVis.Ic)allPhasors.push({id:"Ic",mag:src.currents.Ic.mag,ang:src.currents.Ic.ang,color:colors.Ic,type:"I"});
    if(phasorVis.Va)allPhasors.push({id:"Va",mag:src.voltages.Va.mag,ang:src.voltages.Va.ang,color:colors.Va,type:"V"});
    if(phasorVis.Vb)allPhasors.push({id:"Vb",mag:src.voltages.Vb.mag,ang:src.voltages.Vb.ang,color:colors.Vb,type:"V"});
    if(phasorVis.Vc)allPhasors.push({id:"Vc",mag:src.voltages.Vc.mag,ang:src.voltages.Vc.ang,color:colors.Vc,type:"V"});
    if(phasorVis.Vab)allPhasors.push({id:"Vab",mag:seqComponents.Vab.mag,ang:seqComponents.Vab.ang,color:colors.Vab,type:"V",seq:true});
    if(phasorVis.Vbc)allPhasors.push({id:"Vbc",mag:seqComponents.Vbc.mag,ang:seqComponents.Vbc.ang,color:colors.Vbc,type:"V",seq:true});
    if(phasorVis.Vca)allPhasors.push({id:"Vca",mag:seqComponents.Vca.mag,ang:seqComponents.Vca.ang,color:colors.Vca,type:"V",seq:true});
    if(phasorVis.I0)allPhasors.push({id:"I0",mag:seqComponents.I0.mag,ang:seqComponents.I0.ang,color:colors.I0,type:"I",seq:true});
    if(phasorVis.I1)allPhasors.push({id:"I1",mag:seqComponents.I1.mag,ang:seqComponents.I1.ang,color:colors.I1,type:"I",seq:true});
    if(phasorVis.I2)allPhasors.push({id:"I2",mag:seqComponents.I2.mag,ang:seqComponents.I2.ang,color:colors.I2,type:"I",seq:true});
    if(phasorVis.V0)allPhasors.push({id:"V0",mag:seqComponents.V0.mag,ang:seqComponents.V0.ang,color:colors.V0,type:"V",seq:true});
    if(phasorVis.V1)allPhasors.push({id:"V1",mag:seqComponents.V1.mag,ang:seqComponents.V1.ang,color:colors.V1,type:"V",seq:true});
    if(phasorVis.V2)allPhasors.push({id:"V2",mag:seqComponents.V2.mag,ang:seqComponents.V2.ang,color:colors.V2,type:"V",seq:true});
    // Escala independente para I e V
    const iPhasors=allPhasors.filter(x=>x.type==="I");
    const vPhasors=allPhasors.filter(x=>x.type==="V");
    const maxI=Math.max(...iPhasors.map(x=>x.mag),0.001);
    const maxV=Math.max(...vPhasors.map(x=>x.mag),0.001);
    const R=170;
    const cx=220,cy=220;
    let labelIdx=0;
    const arrow=(ph,scale)=>{
      const r=(ph.mag/scale)*R;if(r<1)return null;
      const rad=ph.ang*Math.PI/180;
      const ex=cx+r*Math.cos(rad),ey=cy-r*Math.sin(rad);
      const aLen=Math.min(10,r*0.2);const aAng=0.4;
      const a1x=ex-aLen*Math.cos(rad-aAng),a1y=ey+aLen*Math.sin(rad-aAng);
      const a2x=ex-aLen*Math.cos(rad+aAng),a2y=ey+aLen*Math.sin(rad+aAng);
      // Desloca rótulo perpendicular ao fasor alternando lados para evitar sobreposição
      const idx=labelIdx++;const perpSign=(idx%2===0?1:-1);const perpOff=5+4*(Math.floor(idx/2)%3);
      const lRad=8;const lx=ex+lRad*Math.cos(rad)+perpSign*perpOff*Math.cos(rad+Math.PI/2);
      const ly=ey-lRad*Math.sin(rad)-perpSign*perpOff*Math.sin(rad+Math.PI/2);
      return(<g key={ph.id}><line x1={cx} y1={cy} x2={ex} y2={ey} stroke={ph.color} strokeWidth={2} strokeDasharray={ph.seq?dashes[ph.id]:undefined}/><polygon points={`${ex},${ey} ${a1x},${a1y} ${a2x},${a2y}`} fill={ph.color}/><text x={lx} y={ly} fill={ph.color} fontSize={11} fontWeight={700} textAnchor="middle" dominantBaseline="central" fontFamily="var(--fm)">{ph.id}</text></g>);
    };
    // Grade circular e eixos
    const gridCircles=[0.25,0.5,0.75,1].map(f=>f*R);
    const angLines=[0,30,60,90,120,150,180,210,240,270,300,330];
    return(
      <div className="pd-overlay" onClick={()=>setPhasorDiagOpen(false)}>
        <div className="pd-modal" onClick={e=>e.stopPropagation()}>
          <div className="pd-header">
            <div className="pd-title">Phasor Diagram</div>
            <div className="pd-mode">{pfMode==="prefault"?"PRE-FAULT":"FAULT"}</div>
            <button className="pd-close" onClick={()=>setPhasorDiagOpen(false)}>✕</button>
          </div>
          <div className="pd-body">
            <div className="pd-chart">
              <svg width={440} height={440} style={{background:"#0e1015",borderRadius:12}}>
                {/* Grade */}
                {gridCircles.map((r,i)=><circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={1}/>)}
                {angLines.map(a=>{const rad=a*Math.PI/180;return<line key={a} x1={cx} y1={cy} x2={cx+R*Math.cos(rad)} y2={cy-R*Math.sin(rad)} stroke="rgba(255,255,255,.04)" strokeWidth={1}/>})}
                <line x1={cx-R-15} y1={cy} x2={cx+R+15} y2={cy} stroke="rgba(255,255,255,.1)" strokeWidth={1}/>
                <line x1={cx} y1={cy-R-15} x2={cx} y2={cy+R+15} stroke="rgba(255,255,255,.1)" strokeWidth={1}/>
                {/* Labels dos eixos */}
                <text x={cx+R+8} y={cy-6} fill="rgba(255,255,255,.2)" fontSize={9} fontFamily="var(--fm)">0°</text>
                <text x={cx+4} y={cy-R-8} fill="rgba(255,255,255,.2)" fontSize={9} fontFamily="var(--fm)">90°</text>
                <text x={cx-R-22} y={cy-6} fill="rgba(255,255,255,.2)" fontSize={9} fontFamily="var(--fm)">180°</text>
                <text x={cx+4} y={cy+R+14} fill="rgba(255,255,255,.2)" fontSize={9} fontFamily="var(--fm)">270°</text>
                {/* Fasores */}
                {vPhasors.map(ph=>arrow(ph,maxV))}
                {iPhasors.map(ph=>arrow(ph,maxI))}
                {/* Escalas */}
                <text x={8} y={16} fill="rgba(255,255,255,.3)" fontSize={9} fontFamily="var(--fm)">I max: {maxI.toFixed(2)} A</text>
                <text x={8} y={28} fill="rgba(255,255,255,.3)" fontSize={9} fontFamily="var(--fm)">V max: {maxV.toFixed(2)} V</text>
              </svg>
            </div>
            <div className="pd-side">
              <div className="pd-tabs">
                <button className={`nav-pill ${pfMode==="prefault"?"on":""}`} style={{flex:1,fontSize:10}} onClick={()=>setPfMode("prefault")}>Pre-Fault</button>
                <button className={`nav-pill ${pfMode==="fault"?"on":""}`} style={{flex:1,fontSize:10}} onClick={()=>setPfMode("fault")}>Fault</button>
              </div>
              {/* Toggles e edição de correntes */}
              <div className="pd-section">
                <div className="pd-sec-title" style={{display:"flex",alignItems:"center",gap:6}}>Currents
                  <div style={{marginLeft:"auto",display:"flex",gap:2}}>
                    <button style={{fontSize:8,padding:"1px 5px",background:balI==="manual"?"var(--warm)":"var(--card3)",color:balI==="manual"?"#0e1015":"var(--tx3)",border:"none",borderRadius:3,cursor:"pointer"}} onClick={()=>onBalChangeI("manual")}>Man</button>
                    <button style={{fontSize:8,padding:"1px 5px",background:balI==="balanced"?"var(--warm)":"var(--card3)",color:balI==="balanced"?"#0e1015":"var(--tx3)",border:"none",borderRadius:3,cursor:"pointer"}} onClick={()=>onBalChangeI("balanced")}>3φ</button>
                    {balI==="balanced"&&<select style={{fontSize:8,padding:"0 2px",background:"var(--card3)",color:"var(--tx2)",border:"1px solid var(--card3)",borderRadius:3}} value={seqI} onChange={e=>onSeqChangeI(e.target.value)}><option value="ABC">ABC</option><option value="ACB">ACB</option></select>}
                  </div>
                </div>
                {(balI==="balanced"?["Ia"]:["Ia","Ib","Ic"]).map(k=>{const d=pfMode==="prefault"?pf.currents[k]:p.currents[k];return(
                  <div key={k} className="pd-row">
                    <div className="pd-chk" style={{background:phasorVis[k]?colors[k]:"transparent",borderColor:colors[k]}} onClick={()=>setPhasorVis(v=>({...v,[k]:!v[k]}))}>{phasorVis[k]?"✓":""}</div>
                    <span className="pd-lbl" style={{color:colors[k]}}>{k}{balI==="balanced"?" (ref)":""}</span>
                    <input type="number" className="pd-inp" value={d.mag} onChange={e=>{const v=parseFloat(e.target.value)||0;pfMode==="prefault"?uPf("currents",k,"mag",v):uP("currents",k,"mag",v)}}/>
                    <span className="pd-u">A</span>
                    <input type="number" className="pd-inp pd-ang" value={d.ang} onChange={e=>{const v=parseFloat(e.target.value)||0;pfMode==="prefault"?uPf("currents",k,"ang",v):uP("currents",k,"ang",v)}}/>
                    <span className="pd-u">°</span>
                  </div>)})}
                {balI==="balanced"&&["Ib","Ic"].map(k=>{const d=pfMode==="prefault"?pf.currents[k]:p.currents[k];return(
                  <div key={k} className="pd-row" style={{opacity:.5}}>
                    <div className="pd-chk" style={{background:phasorVis[k]?colors[k]:"transparent",borderColor:colors[k]}} onClick={()=>setPhasorVis(v=>({...v,[k]:!v[k]}))}>{phasorVis[k]?"✓":""}</div>
                    <span className="pd-lbl" style={{color:colors[k]}}>{k}</span>
                    <span className="pd-val" style={{fontSize:10}}>{d.mag.toFixed(2)}A ∠{d.ang.toFixed(1)}°</span>
                  </div>)})}
              </div>
              {/* Toggles e edição de tensões */}
              <div className="pd-section">
                <div className="pd-sec-title" style={{display:"flex",alignItems:"center",gap:6}}>Voltages
                  <div style={{marginLeft:"auto",display:"flex",gap:2}}>
                    <button style={{fontSize:8,padding:"1px 5px",background:balV==="manual"?"var(--lav)":"var(--card3)",color:balV==="manual"?"#0e1015":"var(--tx3)",border:"none",borderRadius:3,cursor:"pointer"}} onClick={()=>onBalChangeV("manual")}>Man</button>
                    <button style={{fontSize:8,padding:"1px 5px",background:balV==="balanced"?"var(--lav)":"var(--card3)",color:balV==="balanced"?"#0e1015":"var(--tx3)",border:"none",borderRadius:3,cursor:"pointer"}} onClick={()=>onBalChangeV("balanced")}>3φ</button>
                    {balV==="balanced"&&<select style={{fontSize:8,padding:"0 2px",background:"var(--card3)",color:"var(--tx2)",border:"1px solid var(--card3)",borderRadius:3}} value={seqV} onChange={e=>onSeqChangeV(e.target.value)}><option value="ABC">ABC</option><option value="ACB">ACB</option></select>}
                  </div>
                </div>
                {(balV==="balanced"?["Va"]:["Va","Vb","Vc"]).map(k=>{const d=pfMode==="prefault"?pf.voltages[k]:p.voltages[k];return(
                  <div key={k} className="pd-row">
                    <div className="pd-chk" style={{background:phasorVis[k]?colors[k]:"transparent",borderColor:colors[k]}} onClick={()=>setPhasorVis(v=>({...v,[k]:!v[k]}))}>{phasorVis[k]?"✓":""}</div>
                    <span className="pd-lbl" style={{color:colors[k]}}>{k}{balV==="balanced"?" (ref)":""}</span>
                    <input type="number" className="pd-inp" value={d.mag} onChange={e=>{const v=parseFloat(e.target.value)||0;pfMode==="prefault"?uPf("voltages",k,"mag",v):uP("voltages",k,"mag",v)}}/>
                    <span className="pd-u">V</span>
                    <input type="number" className="pd-inp pd-ang" value={d.ang} onChange={e=>{const v=parseFloat(e.target.value)||0;pfMode==="prefault"?uPf("voltages",k,"ang",v):uP("voltages",k,"ang",v)}}/>
                    <span className="pd-u">°</span>
                  </div>)})}
                {balV==="balanced"&&["Vb","Vc"].map(k=>{const d=pfMode==="prefault"?pf.voltages[k]:p.voltages[k];return(
                  <div key={k} className="pd-row" style={{opacity:.5}}>
                    <div className="pd-chk" style={{background:phasorVis[k]?colors[k]:"transparent",borderColor:colors[k]}} onClick={()=>setPhasorVis(v=>({...v,[k]:!v[k]}))}>{phasorVis[k]?"✓":""}</div>
                    <span className="pd-lbl" style={{color:colors[k]}}>{k}</span>
                    <span className="pd-val" style={{fontSize:10}}>{d.mag.toFixed(2)}V ∠{d.ang.toFixed(1)}°</span>
                  </div>)})}
              </div>
              {/* Tensões entre fases */}
              <div className="pd-section">
                <div className="pd-sec-title">Line-to-Line Voltages</div>
                {[{k:"Vab",label:"Vab"},{k:"Vbc",label:"Vbc"},{k:"Vca",label:"Vca"}].map(({k,label})=>{
                  const d=seqComponents[k];return(
                  <div key={k} className="pd-row">
                    <div className="pd-chk" style={{background:phasorVis[k]?colors[k]:"transparent",borderColor:colors[k]}} onClick={()=>setPhasorVis(v=>({...v,[k]:!v[k]}))}>{phasorVis[k]?"✓":""}</div>
                    <span className="pd-lbl" style={{color:colors[k]}}>{label}</span>
                    <span className="pd-val">{d.mag.toFixed(2)} V ∠ {d.ang.toFixed(1)}°</span>
                  </div>)})}
              </div>
              {/* Sequências */}
              <div className="pd-section">
                <div className="pd-sec-title">Sequence Components</div>
                {[{k:"I0",label:"I₀ (Zero)",u:"A"},{k:"I1",label:"I₁ (Pos)",u:"A"},{k:"I2",label:"I₂ (Neg)",u:"A"},{k:"V0",label:"V₀ (Zero)",u:"V"},{k:"V1",label:"V₁ (Pos)",u:"V"},{k:"V2",label:"V₂ (Neg)",u:"V"}].map(({k,label,u})=>{
                  const d=seqComponents[k];return(
                  <div key={k} className="pd-row">
                    <div className="pd-chk" style={{background:phasorVis[k]?colors[k]:"transparent",borderColor:colors[k]}} onClick={()=>setPhasorVis(v=>({...v,[k]:!v[k]}))}>{phasorVis[k]?"✓":""}</div>
                    <span className="pd-lbl" style={{color:colors[k]}}>{label}</span>
                    <span className="pd-val">{d.mag.toFixed(2)} {u} ∠ {d.ang.toFixed(1)}°</span>
                  </div>)})}
              </div>
              {/* Métricas rápidas */}
              <div className="pd-section">
                <div className="pd-sec-title">Quick Metrics</div>
                <div className="pd-metric"><span>Unbalance I₂/I₁</span><span>{seqComponents.I1.mag>0.01?(seqComponents.I2.mag/seqComponents.I1.mag*100).toFixed(1)+"%":"—"}</span></div>
                <div className="pd-metric"><span>Unbalance V₂/V₁</span><span>{seqComponents.V1.mag>0.01?(seqComponents.V2.mag/seqComponents.V1.mag*100).toFixed(1)+"%":"—"}</span></div>
                <div className="pd-metric"><span>3I₀</span><span>{(seqComponents.I0.mag*3).toFixed(2)} A</span></div>
                <div className="pd-metric"><span>3V₀</span><span>{(seqComponents.V0.mag*3).toFixed(2)} V</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return(<><style>{S}</style><div className="app">
    <div className="topbar">
      <div className="tb-l"><div className="tb-ico"><svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg"><rect width="36" height="36" rx="9" fill="#181b22"/><circle cx="18" cy="18" r="13" fill="none" stroke="#f97316" stroke-width="1.8"/><circle cx="18" cy="18" r="9.5" fill="#0e1015"/><line x1="18" y1="5" x2="18" y2="8" stroke="#f97316" stroke-width="1.5" stroke-linecap="round"/><line x1="18" y1="28" x2="18" y2="31" stroke="#f97316" stroke-width="1.5" stroke-linecap="round"/><line x1="5" y1="18" x2="8" y2="18" stroke="#f97316" stroke-width="1.5" stroke-linecap="round"/><line x1="28" y1="18" x2="31" y2="18" stroke="#f97316" stroke-width="1.5" stroke-linecap="round"/><path d="M10 18 Q12.5 13 15 18 Q17.5 23 20 18" fill="none" stroke="#f3f4f6" stroke-width="1.5" stroke-linecap="round"/><path d="M20 18 L22 14 L24 22 L26 16" fill="none" stroke="#f97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div><div className="tb-t">RelayLab <span>360</span></div><div className="tb-s">INTEGRAL PROTECTION ENGINEERING PLATFORM</div></div></div>
      <div className="tb-r">
        <div className="nav-pills"><button className={`nav-pill ${page===0?"on":""}`} onClick={()=>setPage(0)}>Campo</button><button className={`nav-pill ${page===1?"on":""}`} onClick={()=>setPage(1)}>Relé</button><button className={`nav-pill ${page===2?"on":""}`} onClick={()=>setPage(2)}>Painel{bkTripLatch&&<span style={{marginLeft:5,display:'inline-block',width:6,height:6,borderRadius:'50%',background:'var(--red)',verticalAlign:'middle',boxShadow:'0 0 6px var(--red)'}}/>}</button></div>
        <div className="tb-status"><div className="tb-dot"/>Online</div>
      </div>
    </div>
    <div className="slide-vp"><div className="slide-tk" style={{transform:`translateX(-${page*100}%)`}}>
      {/* CAMPO */}
      <div className="slide-pg"><CampoPage onFieldStateChange={onFieldStateChange} bkStatus={{state:bkState,spring:bkSpring,trip:bkTripLatch}} onBkCommand={onBkFieldCommand} loadWiring={campoLoadWiring}/></div>

      {/* RELÉ — full app */}
      <div className="slide-pg"><div className="relay-pg"><div className="main">
        <div className="col">
          {/* Seletor Pré-Falta / Falta */}
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
              <button className={`nav-pill`} style={{flex:1,fontSize:9,padding:"3px 0",background:balI==="manual"?"var(--warm)":"transparent",color:balI==="manual"?"#0e1015":"var(--tx3)"}} onClick={()=>onBalChangeI("manual")}>Manual</button>
              <button className={`nav-pill`} style={{flex:1,fontSize:9,padding:"3px 0",background:balI==="balanced"?"var(--warm)":"transparent",color:balI==="balanced"?"#0e1015":"var(--tx3)"}} onClick={()=>onBalChangeI("balanced")}>3φ Equil.</button>
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
              <button className={`nav-pill`} style={{flex:1,fontSize:9,padding:"3px 0",background:balV==="manual"?"var(--lav)":"transparent",color:balV==="manual"?"#0e1015":"var(--tx3)"}} onClick={()=>onBalChangeV("manual")}>Manual</button>
              <button className={`nav-pill`} style={{flex:1,fontSize:9,padding:"3px 0",background:balV==="balanced"?"var(--lav)":"transparent",color:balV==="balanced"?"#0e1015":"var(--tx3)"}} onClick={()=>onBalChangeV("balanced")}>3φ Equil.</button>
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
          <div className="card ccol-top"><div className="main-tabs">{mainTabs.map(t=><button key={t.id} className={`mt ${mainTab===t.id?"on":""}`} onClick={()=>setMainTab(t.id)}>{t.label}</button>)}</div>{renderCenter()}</div>
          <div className="ccol-mid">
            <div className="card"><div className="ph"><div className="bar bar-green"/><span className="ph-t">Controls</span></div><div className="cp" style={{display:"flex",flexDirection:"column",gap:8}}><div className="ctrl-r"><button className="ctrl-big" onClick={runSim}><div className="ctrl-ico ci-p">▶</div><span className="ctrl-lbl">Inject</span></button><button className="ctrl-big" onClick={stopSim}><div className="ctrl-ico ci-s">■</div><span className="ctrl-lbl">Stop</span></button></div><button className="ctrl-sec" onClick={resetFault}>↺ Reset Fault</button><button className="ctrl-sec" style={{background:"var(--lav)",color:"#1a1a2e",border:"none",fontWeight:700}} onClick={()=>setFcOpen(true)}>⚡ Calculador de Falta</button></div></div>
            <div className="card"><div className="ph"><div className="bar bar-rose"/><span className="ph-t">Status & Results</span></div><div className="cp"><div className="st-hd"><div className="st-tt">Simulation</div><div className={`st-pill ${maletaTripped?"sp-trip":ss==="running"?"sp-run":"sp-idle"}`}>{maletaTripped?"Tripped":ss==="running"?"Running":"Stopped"}</div></div><div className="tmr"><div className="tmr-l">Trip Timer (sec)</div><div className="tmr-v">{stime.toFixed(3)}</div></div><div className="st-hd" style={{marginTop:6,paddingTop:6,borderTop:'1px solid var(--bdr)'}}><div className="st-tt">Breaker BAY-01</div><div className={`st-pill ${bkState==='closed'?'sp-run':bkTripLatch?'sp-trip':'sp-idle'}`}>{bkState==='closed'?'52a ON / FECHADO':bkTripLatch?'52b ON / TRIP':'52b ON / ABERTO'}</div></div><div className="tmr" style={{opacity:.7}}><div className="tmr-l">Mola</div><div className="tmr-v" style={{fontSize:12,color:bkSpring?'var(--amber)':'var(--tx3)'}}>{bkSpring?'Carregada':'Carregando...'}</div></div></div></div>
          </div>
          <div className="ccol-bot">
            <div className="card"><div className="ph"><div className="bar bar-warm"/><span className="ph-t">Event Recorder</span></div><div className="cp"><div className="ev-box">{evts.length===0?<div style={{textAlign:"center",color:"var(--tx3)",padding:14,fontSize:10}}>No events recorded</div>:evts.map((e,i)=><div key={i} className="ev-e"><span className="ev-t">[{e.time}]</span><span className="ev-i">{e.icon}</span><span className="ev-x">{e.text}</span><span className="ev-d">{e.dt}</span></div>)}</div></div></div>
            <div className="card"><div className="ph"><div className="bar bar-warm"/><span className="ph-t">Diagnostics</span></div><div className="cp"><div className="dg-box"><table className="dt"><thead><tr><th>Func</th><th>Status</th><th>Stage</th><th>Time</th><th>Notes</th></tr></thead><tbody>{diag.length===0?<tr><td colSpan={5} style={{textAlign:"center",color:"var(--tx3)",padding:14}}>No simulation</td></tr>:diag.map((d,i)=><tr key={i}><td style={{fontWeight:700,color:"var(--tx)"}}>{d.label}</td><td><span className={`badge b-${d.status}`}>{d.status.toUpperCase()}</span></td><td>{d.stage}</td><td style={{fontFamily:"var(--fm)"}}>{d.time}{d.time!=="-"?"s":""}</td><td style={{fontSize:8}}>{d.obs}</td></tr>)}</tbody></table></div></div></div>
          </div>
        </div>
        <div className="rcol">
          <div className="card" style={{flex:1,display:"flex",flexDirection:"column"}}>
            <div className="ph"><div className="bar bar-orange"/><span className="ph-t">ReGrid Pro 1000</span></div>
            <div className="relay-wrap"><div className="relay-shell">
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

      {/* PAINEL — circuit breaker + command diagram */}
      <div className="slide-pg"><PainelPage relayTrip={maletaTripped} onBreakerChange={onBreakerChange} resetSignal={bkResetCtr} closeSignal={bkCloseCtr} openSignal={bkOpenCtr} sys={sys} relayReadings={relayReadings} injecting={injecting}/></div>
    </div></div>
  </div>
  {wfModalOpen&&<div className="wf-overlay" onClick={()=>{setWfModalOpen(false);setWfSelected(null);}}>
    <div className="wf-modal" onClick={e=>e.stopPropagation()}>
      <div className="wf-title">FAULT RECORDS</div>
      {tripHistory.length===0?<div className="wf-empty">No trip records available.</div>:
        tripHistory.map((rec,i)=>(
          <div key={i} className={`wf-row${wfSelected===i?" selected":""}`} onClick={()=>setWfSelected(i)}>
            <div style={{flex:1}}>
              <div className="wf-ts">{rec.timestamp}</div>
              <div className="wf-stages">{rec.stages.join(", ")}</div>
            </div>
            <div className="wf-time">{rec.tripTime!==null?`${rec.tripTime.toFixed(3)}s`:"PF"}</div>
          </div>
        ))
      }
      <div className="wf-actions">
        <button className="wf-btn" onClick={()=>{setWfModalOpen(false);setWfSelected(null);}}>Close</button>
        <button className={`wf-btn primary${wfSelected===null?" disabled":""}`} style={wfSelected===null?{opacity:.4,pointerEvents:'none'}:{}} onClick={async()=>{if(wfSelected===null)return;
          const rec=tripHistory[wfSelected];if(!rec)return;
          try{
            const files=generateComtrade(rec);
            const ts=rec.timestamp.replace(/[:/\.]/g,'-');
            const baseName=`Workshop_Protecao_360_${ts}`;
            const zip=new JSZip();
            zip.file(`${baseName}.cfg`,files.cfg);
            zip.file(`${baseName}.dat`,files.dat);
            zip.file(`${baseName}.hdr`,files.hdr);
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
  {renderPhasorDiagram()}
  {fcOpen&&<FaultCalculator sys={sys} onApply={(fp,pp)=>{setP(fp);if(pp){setPfEnabled(true);setPf(pp)}setFcOpen(false);setEvts(ev=>[{time:nowShort(),icon:"⚡",text:"Fasores de falta aplicados pelo Calculador.",dt:""},...ev.slice(0,20)]);}} onClose={()=>setFcOpen(false)}/>}
  </>);
}
