import{protOrder}from"./defaults.js";
export const toRad=d=>d*Math.PI/180;
export const toRect=(m,a)=>({re:m*Math.cos(toRad(a)),im:m*Math.sin(toRad(a))});
export const fromRect=(re,im)=>({mag:Math.sqrt(re*re+im*im),ang:Math.atan2(im,re)*180/Math.PI});
export function calc3(obj,keys){const s=keys.reduce((a,k)=>{const r=toRect(obj[k].mag,obj[k].ang);return{re:a.re+r.re,im:a.im+r.im}},{re:0,im:0});return fromRect(s.re,s.im)}
export function calcPower(v,i,vA,iA){const S=v*i;const phi=toRad(vA-iA);return{P:S*Math.cos(phi),Q:S*Math.sin(phi),S,fp:S>0?Math.cos(phi):0}}

// ── MOTOR DE PROTEÇÃO 50 — Instantânea com tolerância ──────────────────────────
const P50_ABSOLUTE_TIME_ERROR_S=0.02;
const P50_RELATIVE_TIME_ERROR_PCT=5;
const P50_TBASIC_S=0.03;
const P50_MIN_INSTANTANEOUS_S=0.02;

export function get50TheoreticalTime(adjustedTime){
  return adjustedTime===0?P50_TBASIC_S:adjustedTime;
}

export function simulate50OperateTime(adjustedTime){
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

// ── MOTOR DE PROTEÇÃO 50N — Instantânea de neutro (3I0) com tolerância ────────
const P50N_ABSOLUTE_TIME_ERROR_S=0.02;
const P50N_RELATIVE_TIME_ERROR_PCT=5;
const P50N_TBASIC_S=0.03;
const P50N_MIN_INSTANTANEOUS_S=0.02;

export function get50NTheoreticalTime(adjustedTime){
  return adjustedTime===0?P50N_TBASIC_S:adjustedTime;
}

export function simulate50NOperateTime(adjustedTime){
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

// ── MOTOR DE PROTEÇÃO 51 — Curvas IEC, US, IEEE, ANSI antiga, Tempo Definido ──
const MAX_OPERATING_MULTIPLE=20;
const ABSOLUTE_TIME_ERROR_S=0.04;
const RELATIVE_TIME_ERROR_PCT=5;

export const CURVE_MAP={
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
export const CURVE_ALIASES={
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

export function resolveCurveName(name){return CURVE_ALIASES[name]||name}

export function calcTheoreticalTripTime(stage,currentMag){
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

export function simulateRealOperateTime(theoreticalTime){
  if(!Number.isFinite(theoreticalTime)||theoreticalTime<=0)return theoreticalTime;
  const relLimit=theoreticalTime*(RELATIVE_TIME_ERROR_PCT/100);
  const maxDev=Math.max(ABSOLUTE_TIME_ERROR_S,relLimit);
  const deviation=(Math.random()*2-1)*maxDev;
  return Math.max(0.001,theoreticalTime+deviation);
}

// ── MOTOR DE PROTEÇÃO 51N — Sobrecorrente temporizada de neutro (3I0) ─────────
const P51N_MAX_OPERATING_MULTIPLE=20;
const P51N_ABSOLUTE_TIME_ERROR_S=0.04;
const P51N_RELATIVE_TIME_ERROR_PCT=5;

export function calc51NTheoreticalTripTime(stage,currentMag){
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

export function simulate51NRealOperateTime(theoreticalTime){
  if(!Number.isFinite(theoreticalTime)||theoreticalTime<=0)return theoreticalTime;
  const relLimit=theoreticalTime*(P51N_RELATIVE_TIME_ERROR_PCT/100);
  const allowedDev=Math.max(P51N_ABSOLUTE_TIME_ERROR_S,relLimit);
  const deviation=(Math.random()*2-1)*allowedDev;
  return Math.max(0.000001,theoreticalTime+deviation);
}

// ── MOTOR DE PROTEÇÃO 27 — Subtensão trifásica (PHPTUV) ──────────────────────
const P27_ABSOLUTE_TIME_ERROR_S=0.04;
const P27_RELATIVE_TIME_ERROR_PCT=5;

export function check27Pickup(voltagePu,pickupPu){return voltagePu<pickupPu}

export function simulate27OperateTime(timeOpS){
  const nominal=timeOpS;
  const errorBound=Math.max(nominal*P27_RELATIVE_TIME_ERROR_PCT/100,P27_ABSOLUTE_TIME_ERROR_S);
  const error=(Math.random()*2-1)*errorBound;
  return Math.max(0.01,nominal+error);
}

export function evaluate27Stage(stage,voltsPu,startPhases,voltageBlockPu){
  if(!stage.enabled)return{started:false,faultedCount:0,blocked:false};
  const anyBelowBlock=voltsPu.some(v=>v<voltageBlockPu);
  if(anyBelowBlock)return{started:false,faultedCount:0,blocked:true};
  const faulted=voltsPu.map(v=>check27Pickup(v,stage.pickup));
  const numFaulted=faulted.filter(Boolean).length;
  const started=startPhases==="any"?numFaulted>=1:numFaulted===3;
  return{started,faultedCount:numFaulted,blocked:false};
}

// ── MOTOR DE PROTEÇÃO 59 — Sobretensão trifásica (PHPTOV) ────────────────────
const P59_ABSOLUTE_TIME_ERROR_S=0.04;
const P59_RELATIVE_TIME_ERROR_PCT=5;

export function check59Pickup(voltagePu,pickupPu){return voltagePu>pickupPu}

export function simulate59OperateTime(timeOpS){
  const nominal=timeOpS;
  const errorBound=Math.max(nominal*P59_RELATIVE_TIME_ERROR_PCT/100,P59_ABSOLUTE_TIME_ERROR_S);
  const error=(Math.random()*2-1)*errorBound;
  return Math.max(0.01,nominal+error);
}

export function evaluate59Stage(stage,voltsPu,startPhases){
  if(!stage.enabled)return{started:false,faultedCount:0};
  const faulted=voltsPu.map(v=>check59Pickup(v,stage.pickup));
  const numFaulted=faulted.filter(Boolean).length;
  const started=startPhases==="any"?numFaulted>=1:numFaulted===3;
  return{started,faultedCount:numFaulted};
}

// Calcula tensões em pu conforme seleção ph-ph ou ph-n
export function getVoltagesPu(rr,voltageSelection,vNomSec){
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
  const vNomPN=vNom/Math.sqrt(3);
  return[rr.voltages.Va.mag/vNomPN,rr.voltages.Vb.mag/vNomPN,rr.voltages.Vc.mag/vNomPN];
}

// ── MOTOR DE PROTEÇÃO 67 — Direcional de sobrecorrente de fase ────────────────
const P67_MAX_OPERATING_MULTIPLE=20;
const P67_ABSOLUTE_TIME_ERROR_S=0.04;
const P67_RELATIVE_TIME_ERROR_PCT=5;
const P67_ABSOLUTE_TIME_ERROR_S_DT=0.02;
const P67_RELATIVE_TIME_ERROR_PCT_DT=5;
const P67_TBASIC_S=0.03;
const P67_MIN_INSTANTANEOUS_S=0.02;
const P67_FIXED_ANGLE_ERROR_DEG=-2;
const P67_ZERO_BIAS_DEG=-0.0001;
const P67_VERY_SMALL_TORQUE=1e-12;

export const subC=(a,b)=>({re:a.re-b.re,im:a.im-b.im});
export const mulC=(a,b)=>({re:a.re*b.re-a.im*b.im,im:a.re*b.im+a.im*b.re});
const rotC=(z,deg)=>mulC(z,toRect(1,deg));
export const normAng=a=>{let v=a;while(v>180)v-=360;while(v<=-180)v+=360;return v};
const toPolar=z=>({mag:Math.sqrt(z.re*z.re+z.im*z.im),ang:normAng(Math.atan2(z.im,z.re)*180/Math.PI)});

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

export function evaluate67Stage(stage,rr){
  if(!stage.enabled)return{tripped:false,currentUsed:0,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"disabled"};
  const rcaDeg=(typeof stage.mta==="number"&&Number.isFinite(stage.mta))?stage.mta:45;
  const candidates=build67Candidates(rr,stage.pol||"quadratura",rcaDeg,stage.dir||"forward");
  const valid=candidates.filter(c=>c.iMag>=stage.pickup&&c.pass);
  if(valid.length===0){
    const abovePickup=candidates.filter(c=>c.iMag>=stage.pickup);
    if(abovePickup.length===0)return{tripped:false,currentUsed:0,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"below pickup"};
    return{tripped:false,currentUsed:0,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"blocked by direction"};
  }
  const cv=CURVE_MAP[resolveCurveName(stage.curve)];
  const isDT=cv&&cv.type==="DT";
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

export function calc67TheoreticalTripTime(stage,rr){
  const result=evaluate67Stage(stage,rr);
  return result.tripped?result.theoreticalTime:Infinity;
}

export function calc67TripTimeReal(stage,rr){
  const result=evaluate67Stage(stage,rr);
  return result.tripped?result.simulatedTime:Infinity;
}

// ── MOTOR DE PROTEÇÃO 67N — Direcional de sobrecorrente de neutro (3I0/3V0) ───
const P67N_MAX_OPERATING_MULTIPLE=20;
const P67N_ABSOLUTE_TIME_ERROR_S=0.04;
const P67N_RELATIVE_TIME_ERROR_PCT=5;
const P67N_ABSOLUTE_TIME_ERROR_S_DT=0.02;
const P67N_RELATIVE_TIME_ERROR_PCT_DT=5;
const P67N_TBASIC_S=0.03;
const P67N_MIN_INSTANTANEOUS_S=0.02;
const P67N_FIXED_ANGLE_ERROR_DEG=-2;
const P67N_ZERO_BIAS_DEG=-0.0001;
const P67N_VERY_SMALL_TORQUE=1e-12;

export function evaluate67NDirectional(rr,pol,rcaDeg,desiredDir){
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

export function evaluate67NStage(stage,rr){
  if(!stage.enabled)return{tripped:false,currentUsed:0,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"disabled"};
  const rcaDeg=(typeof stage.mta==="number"&&Number.isFinite(stage.mta))?stage.mta:45;
  const d=evaluate67NDirectional(rr,stage.pol||"-V0",rcaDeg,stage.dir||"forward");
  if(d.i0Mag<stage.pickup)return{tripped:false,currentUsed:d.i0Mag,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"3I0 below pickup"};
  const minPolV=stage.minPolV||1;
  if(d.vPolMag<minPolV)return{tripped:false,currentUsed:d.i0Mag,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"Vpol < Vmin"};
  if(!d.pass)return{tripped:false,currentUsed:d.i0Mag,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"blocked by direction",dir:d.dir};
  const cv=CURVE_MAP[resolveCurveName(stage.curve)];
  const isDT=cv&&cv.type==="DT";
  if(isDT){
    const adjustedTime=stage.timeDial||0;
    const tTheo=adjustedTime===0?P67N_TBASIC_S:adjustedTime;
    let tMin,tMax;
    if(adjustedTime===0){tMin=P67N_MIN_INSTANTANEOUS_S;tMax=P67N_TBASIC_S}
    else{const relL=tTheo*(P67N_RELATIVE_TIME_ERROR_PCT_DT/100);const dev=Math.max(P67N_ABSOLUTE_TIME_ERROR_S_DT,relL);tMin=Math.max(P67N_MIN_INSTANTANEOUS_S,tTheo-dev);tMax=tTheo+dev}
    const simTime=tMin+Math.random()*(tMax-tMin);
    return{tripped:true,currentUsed:d.i0Mag,theoreticalTime:tTheo,simulatedTime:simTime,dir:d.dir,reason:null};
  }
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

export function calc67NTheoreticalTripTime(stage,rr){
  const result=evaluate67NStage(stage,rr);
  return result.tripped?result.theoreticalTime:Infinity;
}

export function calc67NTripTimeReal(stage,rr){
  const result=evaluate67NStage(stage,rr);
  return result.tripped?result.simulatedTime:Infinity;
}

// ── I2 (negative sequence current) from symmetrical components ────────────────
export function calcI2(currents){
  const a2r=Math.cos(2*Math.PI/3),a2i=-Math.sin(2*Math.PI/3); // a² = e^(-j120°)
  const a1r=Math.cos(4*Math.PI/3),a1i=-Math.sin(4*Math.PI/3); // a  = e^(-j240°)
  const Ia=toRect(currents.Ia.mag,currents.Ia.ang);
  const Ib=toRect(currents.Ib.mag,currents.Ib.ang);
  const Ic=toRect(currents.Ic.mag,currents.Ic.ang);
  const re=(Ia.re+(a1r*Ib.re-a1i*Ib.im)+(a2r*Ic.re-a2i*Ic.im))/3;
  const im=(Ia.im+(a1r*Ib.im+a1i*Ib.re)+(a2r*Ic.im+a2i*Ic.re))/3;
  return fromRect(re,im);
}

// ── Helpers de avaliação — usados em runSim e evalProtectionsDirect ───────────
export function calcTripTime(fid,stage,currentMag){
  if(!stage.enabled||currentMag<stage.pickup)return Infinity;
  if(fid==="50")return get50TheoreticalTime(stage.timeOp||0);
  if(fid==="50N")return get50NTheoreticalTime(stage.timeOp||0);
  if(fid==="46")return stage.timeOp||0.1;
  if(fid==="51N")return calc51NTheoreticalTripTime(stage,currentMag);
  return calcTheoreticalTripTime(stage,currentMag);
}

export function calcTripTimeReal(fid,stage,currentMag){
  if(!stage.enabled||currentMag<stage.pickup)return Infinity;
  if(fid==="50")return simulate50OperateTime(stage.timeOp||0);
  if(fid==="50N")return simulate50NOperateTime(stage.timeOp||0);
  if(fid==="46"){const t=stage.timeOp||0.1;const dev=t*0.05;return t+(Math.random()*2-1)*dev;}
  if(fid==="51N"){const t=calc51NTheoreticalTripTime(stage,currentMag);return!Number.isFinite(t)?Infinity:simulate51NRealOperateTime(t)}
  const t=calcTheoreticalTripTime(stage,currentMag);
  if(!Number.isFinite(t))return Infinity;
  return simulateRealOperateTime(t);
}

export function getCurrentForFunc(fid,rr){
  if(fid==="50"||fid==="51"||fid==="67")return Math.max(rr.currents.Ia.mag,rr.currents.Ib.mag,rr.currents.Ic.mag);
  if(fid==="50N"||fid==="51N"||fid==="67N")return calc3(rr.currents,["Ia","Ib","Ic"]).mag;
  if(fid==="46")return calcI2(rr.currents).mag;
  return 0;
}

export function evalProtectionsDirect(rr,relayProt,sys){
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
}
