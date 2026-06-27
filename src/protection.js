import{protOrder}from"./defaults.js";

/**
 * Convert degrees to radians.
 * @param {number} d — angle in degrees
 * @returns {number} angle in radians
 */
export const toRad=d=>d*Math.PI/180;

/**
 * Convert phasor from magnitude-angle form to rectangular coordinates.
 * @param {number} m — magnitude
 * @param {number} a — angle in degrees
 * @returns {{re: number, im: number}} rectangular form {real, imaginary}
 */
export const toRect=(m,a)=>({re:m*Math.cos(toRad(a)),im:m*Math.sin(toRad(a))});

/**
 * Convert phasor from rectangular coordinates to magnitude-angle form.
 * @param {number} re — real (cosine) component
 * @param {number} im — imaginary (sine) component
 * @returns {{mag: number, ang: number}} phasor {magnitude, angle in degrees}
 */
export const fromRect=(re,im)=>({mag:Math.sqrt(re*re+im*im),ang:Math.atan2(im,re)*180/Math.PI});

/**
 * Sum three phasors (e.g., three-phase currents or voltages) and return result in mag-angle form.
 * Used for calculating 3I0 (zero-sequence) and other three-phase summations.
 * @param {Object} obj — object containing phasor values indexed by keys (e.g., {Ia, Ib, Ic})
 * @param {Array<string>} keys — array of keys to sum (e.g., ["Ia", "Ib", "Ic"])
 * @returns {{mag: number, ang: number}} sum in phasor form
 * @example
 * const I0 = calc3(rr.currents, ["Ia", "Ib", "Ic"]);
 */
export function calc3(obj,keys){const s=keys.reduce((a,k)=>{const r=toRect(obj[k].mag,obj[k].ang);return{re:a.re+r.re,im:a.im+r.im}},{re:0,im:0});return fromRect(s.re,s.im)}

/**
 * Calculate apparent power S, real power P, reactive power Q, and power factor from voltage and current phasors.
 * @param {number} v — voltage magnitude in V
 * @param {number} i — current magnitude in A
 * @param {number} vA — voltage angle in degrees
 * @param {number} iA — current angle in degrees
 * @returns {{P: number, Q: number, S: number, fp: number}} power {real W, reactive VAr, apparent VA, power factor}
 */
export function calcPower(v,i,vA,iA){const S=v*i;const phi=toRad(vA-iA);return{P:S*Math.cos(phi),Q:S*Math.sin(phi),S,fp:S>0?Math.cos(phi):0}}

// ── MOTOR DE PROTEÇÃO 50 — Instantânea com tolerância ──────────────────────────
const P50_ABSOLUTE_TIME_ERROR_S=0.02;
const P50_RELATIVE_TIME_ERROR_PCT=5;
const P50_TBASIC_S=0.03;
const P50_MIN_INSTANTANEOUS_S=0.02;

/**
 * Calculate theoretical trip time for ANSI 50 (phase instantaneous overcurrent).
 * If adjustedTime is 0, returns the basic instantaneous time; otherwise returns the set time.
 * @param {number} adjustedTime — user-set time operation in seconds; 0 for instantaneous
 * @returns {number} theoretical trip time in seconds
 */
export function get50TheoreticalTime(adjustedTime){
  return adjustedTime===0?P50_TBASIC_S:adjustedTime;
}

/**
 * Simulate real 50 operate time with random tolerance (±5%, min ±20ms) per IEC 60255-151.
 * @param {number} adjustedTime — user-set time operation in seconds; 0 for instantaneous
 * @returns {number} simulated operate time in seconds with random deviation
 */
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

/**
 * Calculate theoretical trip time for ANSI 50N (neutral instantaneous overcurrent on 3I0).
 * If adjustedTime is 0, returns the basic instantaneous time; otherwise returns the set time.
 * @param {number} adjustedTime — user-set time operation in seconds; 0 for instantaneous
 * @returns {number} theoretical trip time in seconds
 */
export function get50NTheoreticalTime(adjustedTime){
  return adjustedTime===0?P50N_TBASIC_S:adjustedTime;
}

/**
 * Simulate real 50N operate time with random tolerance (±5%, min ±20ms) per IEC 60255-151.
 * @param {number} adjustedTime — user-set time operation in seconds; 0 for instantaneous
 * @returns {number} simulated operate time in seconds with random deviation
 */
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

/**
 * Time-overcurrent protection curves database with mathematical coefficients.
 * Supports IEC (Standard/Very/Extremely/Long-Time/Short-Time Inverse),
 * US (Moderately/Inverse/Very/Extremely/Short-Time Inverse),
 * IEEE (Moderately/Very/Extremely Inverse),
 * ANSI (Moderately/Normally/Very/Extremely Inverse),
 * and Definite-Time (DT) curves.
 * @type {Object<string, {type: string, [k|A|B|P|C|D|E]: number}>}
 */
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

/**
 * Backward compatibility aliases for curve names used in older saved files.
 * Maps legacy short names to current full names.
 * @type {Object<string, string>}
 */
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

/**
 * Resolve a curve name, applying legacy alias mapping if needed.
 * @param {string} name — curve name (possibly an old alias)
 * @returns {string} resolved curve name in CURVE_MAP
 */
export function resolveCurveName(name){return CURVE_ALIASES[name]||name}

/**
 * Evaluate a time-overcurrent curve to its theoretical trip time.
 * Shared by 51, 51N, 67 and 67N inverse-time paths (IEC/US/IEEE/ANSI/DT).
 * @param {Object} c — curve coefficients from CURVE_MAP (already resolved)
 * @param {number} M — operating multiple (I/pickup), already clamped to the max
 * @param {number} td — time dial / time multiplier
 * @returns {number} theoretical trip time in seconds; Infinity if invalid/non-operating
 */
export function evalCurveTime(c,M,td){
  if(!c)return Infinity;
  switch(c.type){
    case"IEC":{const d=Math.pow(M,c.alpha)-1;return d<=0?Infinity:td*(c.k/d)}
    case"US":case"IEEE":{const d=Math.pow(M,c.P)-1;return d<=0?Infinity:td*(c.A+c.B/d)}
    case"ANSI":{const x=M-c.C;if(x<=0)return Infinity;const t=(c.A+c.B/x+c.D/(x*x)+c.E/(x*x*x))*td;return(!Number.isFinite(t)||t<=0)?Infinity:t}
    case"DT":return(!Number.isFinite(td)||td<=0)?Infinity:td;
    default:return Infinity;
  }
}

/**
 * Calculate theoretical trip time for 51 protection stage using selected time-overcurrent curve.
 * Computes t = f(multiple, curve_type, timeDial) per IEC 60255-151 / ANSI standards.
 * @param {Object} stage — protection stage with {enabled, pickup, curve, timeDial}
 * @param {number} currentMag — measured current magnitude in A
 * @returns {number} theoretical trip time in seconds; Infinity if not tripped or current below pickup
 */
export function calcTheoreticalTripTime(stage,currentMag){
  if(!stage.enabled||currentMag<stage.pickup)return Infinity;
  const multiple=currentMag/stage.pickup;
  if(multiple<=1)return Infinity;
  const M=Math.min(multiple,MAX_OPERATING_MULTIPLE);
  const c=CURVE_MAP[resolveCurveName(stage.curve)];
  if(!c)return Infinity;
  return evalCurveTime(c,M,stage.timeDial);
}

/**
 * Simulate real operate time with random tolerance (±5%, min ±40ms) per relay accuracy class.
 * @param {number} theoreticalTime — theoretical trip time in seconds
 * @returns {number} simulated operate time in seconds with random deviation; returns input if non-finite
 */
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

/**
 * Calculate theoretical trip time for 51N protection stage (neutral time-overcurrent on 3I0).
 * Uses the same time-overcurrent curves as 51 (phase).
 * @param {Object} stage — protection stage with {enabled, pickup, curve, timeDial}
 * @param {number} currentMag — measured 3I0 (zero-sequence current) magnitude in A
 * @returns {number} theoretical trip time in seconds; Infinity if not tripped or current below pickup
 */
export function calc51NTheoreticalTripTime(stage,currentMag){
  if(!stage.enabled||currentMag<stage.pickup)return Infinity;
  const multiple=currentMag/stage.pickup;
  if(multiple<=1)return Infinity;
  const M=Math.min(multiple,P51N_MAX_OPERATING_MULTIPLE);
  const c=CURVE_MAP[resolveCurveName(stage.curve)];
  if(!c)return Infinity;
  return evalCurveTime(c,M,stage.timeDial);
}

/**
 * Simulate real 51N operate time with random tolerance (±5%, min ±40ms) per relay accuracy class.
 * @param {number} theoreticalTime — theoretical trip time in seconds
 * @returns {number} simulated operate time in seconds with random deviation; returns input if non-finite
 */
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

/**
 * Check if a three-phase voltage is below the 27 (under-voltage) pickup threshold.
 * @param {number} voltagePu — measured voltage in per-unit (pu)
 * @param {number} pickupPu — pickup threshold in per-unit
 * @returns {boolean} true if voltage is below pickup (protection picked up)
 */
export function check27Pickup(voltagePu,pickupPu){return voltagePu<pickupPu}

/**
 * Simulate real 27 operate time with random tolerance (±5%, min ±40ms).
 * @param {number} timeOpS — time operation delay setting in seconds
 * @returns {number} simulated operate time in seconds with random deviation
 */
export function simulate27OperateTime(timeOpS){
  const nominal=timeOpS;
  const errorBound=Math.max(nominal*P27_RELATIVE_TIME_ERROR_PCT/100,P27_ABSOLUTE_TIME_ERROR_S);
  const error=(Math.random()*2-1)*errorBound;
  return Math.max(0.01,nominal+error);
}

/**
 * Evaluate 27 (under-voltage) stage: check pickup, low-voltage block, and phase participation.
 * @param {Object} stage — protection stage with {enabled, pickup}
 * @param {Array<number>} voltsPu — three-phase voltages in per-unit [Vab|Vph, Vbc|Vph, Vca|Vph]
 * @param {string} startPhases — "any" for single-phase pickup, "3φ" for three-phase
 * @param {number} voltageBlockPu — low-voltage block threshold; protection blocked if any phase below this
 * @returns {{started: boolean, faultedCount: number, blocked: boolean}} stage evaluation result
 */
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

/**
 * Check if a three-phase voltage is above the 59 (over-voltage) pickup threshold.
 * @param {number} voltagePu — measured voltage in per-unit (pu)
 * @param {number} pickupPu — pickup threshold in per-unit
 * @returns {boolean} true if voltage is above pickup (protection picked up)
 */
export function check59Pickup(voltagePu,pickupPu){return voltagePu>pickupPu}

/**
 * Simulate real 59 operate time with random tolerance (±5%, min ±40ms).
 * @param {number} timeOpS — time operation delay setting in seconds
 * @returns {number} simulated operate time in seconds with random deviation
 */
export function simulate59OperateTime(timeOpS){
  const nominal=timeOpS;
  const errorBound=Math.max(nominal*P59_RELATIVE_TIME_ERROR_PCT/100,P59_ABSOLUTE_TIME_ERROR_S);
  const error=(Math.random()*2-1)*errorBound;
  return Math.max(0.01,nominal+error);
}

/**
 * Evaluate 59 (over-voltage) stage: check pickup and phase participation.
 * @param {Object} stage — protection stage with {enabled, pickup}
 * @param {Array<number>} voltsPu — three-phase voltages in per-unit [Vab|Vph, Vbc|Vph, Vca|Vph]
 * @param {string} startPhases — "any" for single-phase pickup, "3φ" for three-phase
 * @returns {{started: boolean, faultedCount: number}} stage evaluation result
 */
export function evaluate59Stage(stage,voltsPu,startPhases){
  if(!stage.enabled)return{started:false,faultedCount:0};
  const faulted=voltsPu.map(v=>check59Pickup(v,stage.pickup));
  const numFaulted=faulted.filter(Boolean).length;
  const started=startPhases==="any"?numFaulted>=1:numFaulted===3;
  return{started,faultedCount:numFaulted};
}

/**
 * Calculate three-phase voltages in per-unit (pu) from relay reading, with optional phase-to-phase or phase-to-neutral selection.
 * @param {Object} rr — relay reading with {voltages: {Va, Vb, Vc: {mag, ang}}}
 * @param {string} voltageSelection — "ph-ph" for phase-to-phase (line voltages) or "ph-n" for phase-to-neutral
 * @param {number} vNomSec — secondary (relay input) voltage nominal in V; default 115V
 * @returns {Array<number>} three-phase voltages in pu
 */
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

/**
 * Subtract two complex phasors in rectangular form: a - b.
 * @param {{re: number, im: number}} a — first phasor
 * @param {{re: number, im: number}} b — second phasor
 * @returns {{re: number, im: number}} difference a - b
 */
export const subC=(a,b)=>({re:a.re-b.re,im:a.im-b.im});

/**
 * Multiply two complex phasors in rectangular form: a × b.
 * @param {{re: number, im: number}} a — first phasor
 * @param {{re: number, im: number}} b — second phasor
 * @returns {{re: number, im: number}} product a × b
 */
export const mulC=(a,b)=>({re:a.re*b.re-a.im*b.im,im:a.re*b.im+a.im*b.re});

/**
 * Rotate a complex phasor by a fixed angle in rectangular form: z × e^(j*deg).
 * @param {{re: number, im: number}} z — phasor to rotate
 * @param {number} deg — rotation angle in degrees
 * @returns {{re: number, im: number}} rotated phasor
 */
const rotC=(z,deg)=>mulC(z,toRect(1,deg));

/**
 * Normalize an angle to the range (-180, 180] degrees.
 * @param {number} a — angle in degrees
 * @returns {number} normalized angle in degrees
 */
export const normAng=a=>{let v=a;while(v>180)v-=360;while(v<=-180)v+=360;return v};
/**
 * Convert complex phasor from rectangular to magnitude-angle (polar) form.
 * @param {{re: number, im: number}} z — phasor in rectangular form
 * @returns {{mag: number, ang: number}} phasor in polar form with angle in (-180, 180]
 */
const toPolar=z=>({mag:Math.sqrt(z.re*z.re+z.im*z.im),ang:normAng(Math.atan2(z.im,z.re)*180/Math.PI)});

/**
 * Build three-phase phasors (phase and line currents/voltages, positive-sequence) for 67 directional evaluation.
 * @param {Object} rr — relay reading with currents and voltages in polar form
 * @returns {Object} phasors in rectangular form: {IA, IB, IC, IAB, IBC, ICA, VA, VB, VC, VAB, VBC, VCA, V1, I1}
 * @internal
 */
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

/**
 * Calculate angle offset for a given polarization method and element.
 * Accounts for phase rotation and quadrature offset in different directional schemes.
 * @param {string} pol — polarization method: "quadratura", "quad_loop", "seq_pos", "seq_pos_loop"
 * @param {string} elem — element identifier (phase A/B/C or line AB/BC/CA)
 * @returns {number} angle offset in degrees
 * @internal
 */
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

/**
 * Build candidate elements for 67 directional evaluation from three-phase currents and voltages.
 * Evaluates all applicable phase/line combinations against MTA and desired direction.
 * @param {Object} rr — relay reading with currents and voltages
 * @param {string} pol — polarization method: "quadratura", "quad_loop", "seq_pos", "seq_pos_loop"
 * @param {number} rcaDeg — MTA (Measuring Torque Angle) in degrees
 * @param {string} desiredDir — "forward" or "reverse" to filter direction
 * @returns {Array} candidate elements with evaluation results (torque, direction, pass status)
 * @internal
 */
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

/**
 * Evaluate 67 (directional phase overcurrent) stage: check directional control and compute trip time.
 * Returns comprehensive evaluation including direction, torque, and trip calculations.
 * @param {Object} stage — protection stage with {enabled, pickup, mta, pol, dir, curve, timeDial}
 * @param {Object} rr — relay reading with {currents, voltages} in phasor form
 * @returns {{tripped: boolean, currentUsed: number, theoreticalTime: number, simulatedTime: number, elem?: string, dir?: string, reason?: string}}
 * stage evaluation result; reason explains why trip did not occur
 */
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
    const tTheo=evalCurveTime(cv,M,stage.timeDial);
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

/**
 * Calculate theoretical trip time for 67 (directional) protection without tolerance simulation.
 * @param {Object} stage — protection stage configuration
 * @param {Object} rr — relay reading with currents and voltages
 * @returns {number} theoretical trip time in seconds; Infinity if not tripped
 */
export function calc67TheoreticalTripTime(stage,rr){
  const result=evaluate67Stage(stage,rr);
  return result.tripped?result.theoreticalTime:Infinity;
}

/**
 * Calculate real (simulated) trip time for 67 protection with random tolerance.
 * @param {Object} stage — protection stage configuration
 * @param {Object} rr — relay reading with currents and voltages
 * @returns {number} simulated trip time in seconds with random deviation; Infinity if not tripped
 */
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

/**
 * Evaluate directionality of 67N (zero-sequence neutral current) relative to polarizing voltage.
 * Computes torque and determines forward/reverse direction for trip control.
 * @param {Object} rr — relay reading with three-phase currents and voltages
 * @param {string} pol — polarization method: "3V0" (zero-sequence voltage) or "-V0" (negative V0)
 * @param {number} rcaDeg — MTA (Measuring Torque Angle) in degrees
 * @param {string} desiredDir — "forward" or "reverse" to filter directional output
 * @returns {{i0Mag: number, i0Ang: number, v0Mag: number, v0Ang: number, vPolMag: number, angleDeg: number, torque: number, dir: string, pass: boolean}}
 * directional evaluation with 3I0, 3V0, and torque values
 */
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

/**
 * Evaluate 67N (directional neutral overcurrent) stage: check 3I0 pickup, direction, and compute trip time.
 * @param {Object} stage — protection stage with {enabled, pickup, mta, pol, dir, curve, timeDial, minPolV}
 * @param {Object} rr — relay reading with currents and voltages in phasor form
 * @returns {{tripped: boolean, currentUsed: number, theoreticalTime: number, simulatedTime: number, dir?: string, reason?: string}}
 * stage evaluation result; currentUsed is 3I0 magnitude; reason explains why trip did not occur
 */
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
  const tTheo=evalCurveTime(cv,M,stage.timeDial);
  if(!Number.isFinite(tTheo)||tTheo<=0)return{tripped:false,currentUsed:d.i0Mag,theoreticalTime:Infinity,simulatedTime:Infinity,reason:"curve error"};
  const relLimit=tTheo*(P67N_RELATIVE_TIME_ERROR_PCT/100);
  const allowedDev=Math.max(P67N_ABSOLUTE_TIME_ERROR_S,relLimit);
  const deviation=(Math.random()*2-1)*allowedDev;
  const simTime=Math.max(0.000001,tTheo+deviation);
  return{tripped:true,currentUsed:d.i0Mag,theoreticalTime:tTheo,simulatedTime:simTime,dir:d.dir,reason:null};
}

/**
 * Calculate theoretical trip time for 67N (directional neutral) protection without tolerance simulation.
 * @param {Object} stage — protection stage configuration
 * @param {Object} rr — relay reading with currents and voltages
 * @returns {number} theoretical trip time in seconds; Infinity if not tripped
 */
export function calc67NTheoreticalTripTime(stage,rr){
  const result=evaluate67NStage(stage,rr);
  return result.tripped?result.theoreticalTime:Infinity;
}

/**
 * Calculate real (simulated) trip time for 67N protection with random tolerance.
 * @param {Object} stage — protection stage configuration
 * @param {Object} rr — relay reading with currents and voltages
 * @returns {number} simulated trip time in seconds with random deviation; Infinity if not tripped
 */
export function calc67NTripTimeReal(stage,rr){
  const result=evaluate67NStage(stage,rr);
  return result.tripped?result.simulatedTime:Infinity;
}

// ── I2 (negative sequence current) from symmetrical components ────────────────
/**
 * Calculate negative-sequence (I2) current using symmetrical component transformation.
 * I2 = (Ia + a*Ib + a²*Ic) / 3, where a = e^(j120°).
 * Used for phase imbalance and motor unbalance protection (46).
 * @param {{Ia: {mag: number, ang: number}, Ib: {mag: number, ang: number}, Ic: {mag: number, ang: number}}} currents — three-phase currents
 * @returns {{mag: number, ang: number}} negative-sequence current in phasor form
 */
export function calcI2(currents){
  const a2r=Math.cos(2*Math.PI/3),a2i=-Math.sin(2*Math.PI/3); // a² = e^(-j120°)
  const a1r=Math.cos(4*Math.PI/3),a1i=-Math.sin(4*Math.PI/3); // a  = e^(-j240°) = e^(+j120°)
  const Ia=toRect(currents.Ia.mag,currents.Ia.ang);
  const Ib=toRect(currents.Ib.mag,currents.Ib.ang);
  const Ic=toRect(currents.Ic.mag,currents.Ic.ang);
  // I2 = (Ia + a²·Ib + a·Ic) / 3 — a² rotaciona Ib, a rotaciona Ic
  const re=(Ia.re+(a2r*Ib.re-a2i*Ib.im)+(a1r*Ic.re-a1i*Ic.im))/3;
  const im=(Ia.im+(a2r*Ib.im+a2i*Ib.re)+(a1r*Ic.im+a1i*Ic.re))/3;
  return fromRect(re,im);
}

// ── Helpers de avaliação — usados em runSim e evalProtectionsDirect ───────────
/**
 * Calculate theoretical trip time for a protection function by ID.
 * Routes to the appropriate function: 50/50N/51/51N/67/67N etc.
 * @param {string} fid — function ID: "50", "50N", "51", "51N", "67", "67N", "46", etc.
 * @param {Object} stage — protection stage with {enabled, pickup, timeOp, timeDial, curve}
 * @param {number} currentMag — current magnitude to evaluate (phase or zero-sequence as appropriate)
 * @returns {number} theoretical trip time in seconds; Infinity if not tripped or current below pickup
 */
export function calcTripTime(fid,stage,currentMag){
  if(!stage.enabled||currentMag<stage.pickup)return Infinity;
  if(fid==="50")return get50TheoreticalTime(stage.timeOp||0);
  if(fid==="50N")return get50NTheoreticalTime(stage.timeOp||0);
  if(fid==="46")return stage.timeOp||0.1;
  if(fid==="51N")return calc51NTheoreticalTripTime(stage,currentMag);
  return calcTheoreticalTripTime(stage,currentMag);
}

/**
 * Calculate real (simulated) trip time for a protection function with random tolerance.
 * Routes to the appropriate function: 50/50N/51/51N/67/67N etc.
 * @param {string} fid — function ID: "50", "50N", "51", "51N", "67", "67N", "46", etc.
 * @param {Object} stage — protection stage with {enabled, pickup, timeOp, timeDial, curve}
 * @param {number} currentMag — current magnitude to evaluate (phase or zero-sequence as appropriate)
 * @returns {number} simulated trip time in seconds with random deviation; Infinity if not tripped
 */
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

/**
 * Extract the relevant current magnitude for a given protection function.
 * Returns phase current (max of Ia/Ib/Ic), zero-sequence (3I0), or negative-sequence (I2).
 * @param {string} fid — function ID: "50", "51", "67" (phase) or "50N", "51N", "67N" (neutral) or "46" (I2)
 * @param {Object} rr — relay reading with currents {Ia, Ib, Ic}
 * @returns {number} current magnitude in A for the specified function
 */
export function getCurrentForFunc(fid,rr){
  if(fid==="50"||fid==="51"||fid==="67")return Math.max(rr.currents.Ia.mag,rr.currents.Ib.mag,rr.currents.Ic.mag);
  if(fid==="50N"||fid==="51N"||fid==="67N")return calc3(rr.currents,["Ia","Ib","Ic"]).mag;
  if(fid==="46")return calcI2(rr.currents).mag;
  return 0;
}

/**
 * Comprehensive evaluation of all enabled protection functions against a relay reading.
 * Evaluates 50/50N/51/51N/67/67N/27/59/46/81/32/79 and returns trip times and diagnostic details.
 * @param {Object} rr — relay reading with {currents: {Ia, Ib, Ic}, voltages: {Va, Vb, Vc}} in phasor form
 * @param {Object} relayProt — relay protection settings with functions {50, 50N, 51, 51N, 67, 67N, 27/59, 46, 81, 32, 79}
 * @param {Object} sys — system parameters {tp: {secV}, freq}
 * @returns {{dg: Array<{fid, label, status, stage, time, obs}>, allTrips: Array<{func, stage, time}>}}
 * diagnostic results and list of tripped functions with times
 * @example
 * const {dg, allTrips} = evalProtectionsDirect(relayReading, protectionSettings, systemParams);
 * const shortestTripTime = Math.min(...allTrips.map(t => t.time));
 */
/**
 * Evaluate an 87 differential stage from its own dual-winding inputs.
 * The bench injects a single CT set, so 87 carries its own W1/W2 phasors
 * (worst-phase / single-phase model). Math ported from estudos/engine/
 * differential.js (dual-slope + 2nd-harmonic block) to keep core self-contained.
 *
 * @param {Object} stage - {Ipu, knee, slope1, slope2, thr2h, tOp}
 * @param {Object} inj87 - {IW1:{mag,ang}, IW2:{mag,ang}, h2pct}
 * @returns {{tripped:boolean, Idiff:number, Irest:number, Iop:number, blocked:boolean}}
 */
export function evaluate87Stage(stage,inj87){
  if(!stage||!inj87) return {tripped:false,Idiff:0,Irest:0,Iop:0,blocked:false};
  const IW1=inj87.IW1||{mag:0,ang:0};
  const IW2=inj87.IW2||{mag:0,ang:0};
  const r1=toRect(IW1.mag||0,IW1.ang||0);
  const r2=toRect(IW2.mag||0,IW2.ang||0);
  const Idiff=fromRect(r1.re-r2.re,r1.im-r2.im).mag;          // |IW1 - IW2|
  const Irest=((IW1.mag||0)+(IW2.mag||0))/2;                   // restrição (média)
  const pickup=Number(stage.Ipu)||0, knee=Number(stage.knee)||0;
  const s1=Number(stage.slope1)||0, s2=Number(stage.slope2)||0;
  const Iop = Irest<=knee
    ? pickup+(s1/100)*Irest
    : pickup+(s1/100)*knee+(s2/100)*(Irest-knee);
  const thr2h=Number(stage.thr2h)||15;
  const i2h=((Number(inj87.h2pct)||0)/100)*(IW1.mag||0);
  const blocked = (IW1.mag||0)>0 ? ((i2h/(IW1.mag||1))*100)>thr2h : false;
  const tripped = Idiff>Iop && !blocked;
  return {tripped,Idiff:+Idiff.toFixed(4),Irest:+Irest.toFixed(4),Iop:+Iop.toFixed(4),blocked};
}

/**
 * Definite-time operate time for an 87 stage (Infinity if not tripped).
 * @param {Object} stage - 87 stage settings (uses stage.tOp, default 0.025 s)
 * @param {Object} inj87 - dual-winding inputs (see evaluate87Stage)
 * @returns {number} operate time in seconds, or Infinity
 */
export function calc87TripTimeReal(stage,inj87){
  const r=evaluate87Stage(stage,inj87);
  if(!r.tripped) return Infinity;
  const t=Number(stage&&stage.tOp);
  return isFinite(t)&&t>=0 ? t : 0.025;
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
