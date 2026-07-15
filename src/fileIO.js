import { deepClone } from './defaults.js';
import { resolveCurveName } from './protection.js';
import { normalizeGroups, clampGroupIdx } from './settingGroups.js';
import { normalizeBkMon } from './breakerMonitor.js';

export const FILE_HEADER='# RELAYLAB 360 — Parametrization File';
export const FILE_VERSION='v1.0';

/**
 * Parse a float, returning a fallback when the input is missing or non-finite.
 * Prevents corrupt save files from injecting NaN into the protection engine.
 * @param {string} v - Raw string value
 * @param {number} fallback - Value to keep when parse fails
 * @returns {number} Parsed finite number or fallback
 */
function safeNum(v,fallback){const n=parseFloat(v);return Number.isFinite(n)?n:fallback;}

/**
 * Build plaintext save file content.
 * Serializes system parameters, protection settings, output matrix, and field wiring.
 * Format: INI-style sections with key=value pairs.
 * @param {Object} sys - System parameters (TP, TC ratios)
 * @param {Object} prot - Protection functions config (51, 50, 67, 27/59, etc.)
 * @param {Object} outMatrix - Output matrix (stages → relay outputs)
 * @param {Object} wiring - Field wiring (switch state, manual connections)
 * @param {Object} [groupsData] - Setting groups G1–G4: {settingGroups:Array, activeGroup:number}
 * @returns {string} INI-formatted configuration text
 */
export function buildSaveContent(sys,prot,outMatrix,wiring,groupsData,bkMon){
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
  const protKeys=["51","50","51N","50N","67","67N","27/59","47","46","81","32","79","87","21","50BF","49","25","81R"];
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
    }else if(fid==="87"){
      const j=fn.inj87||{IW1:{mag:0,ang:0},IW2:{mag:0,ang:0},h2pct:0};
      lines.push(`INJ87=${j.IW1.mag}|${j.IW1.ang}|${j.IW2.mag}|${j.IW2.ang}|${j.h2pct}`);
      (fn.stages87||[]).forEach((s,i)=>{lines.push(`STAGE87_${i}=${s.id}|${s.enabled}|${s.Ipu}|${s.knee}|${s.slope1}|${s.slope2}|${s.thr2h}|${s.tOp}`);});
    }else if(fid==="21"){
      (fn.stages21||[]).forEach((s,i)=>{lines.push(`STAGE21_${i}=${s.id}|${s.enabled}|${s.type}|${s.reach}|${s.mta}|${s.tDelay}|${s.minV}`);});
    }else if(fid==="50BF"){
      (fn.stages50bf||[]).forEach((s,i)=>{lines.push(`STAGE50BF_${i}=${s.id}|${s.enabled}|${s.pickup}|${s.tBF}`);});
    }else if(fid==="49"){
      (fn.stages49||[]).forEach((s,i)=>{lines.push(`STAGE49_${i}=${s.id}|${s.enabled}|${s.Ib}|${s.k}|${s.tau}|${s.ipPrior}`);});
    }else if(fid==="25"){
      const r=fn.ref25||{Vmag:66.4,Vang:0,fHz:60};
      lines.push(`REF25=${r.Vmag}|${r.Vang}|${r.fHz}`);
      (fn.stages25||[]).forEach((s,i)=>{lines.push(`STAGE25_${i}=${s.id}|${s.enabled}|${s.dVmax}|${s.dAngMax}|${s.dFmax}|${s.tCheck}`);});
    }else if(fid==="81R"){
      const j=fn.inj81r||{dfdt:0};
      lines.push(`INJ81R=${j.dfdt}`);
      (fn.stages81r||[]).forEach((s,i)=>{lines.push(`STAGE81R_${i}=${s.id}|${s.enabled}|${s.pickup}|${s.tOp}|${s.dir}`);});
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

  // ── SETTING GROUPS (G1–G4)
  // Cada grupo é um snapshot completo de `prot`. Serializado como uma linha JSON por
  // grupo (lossless para a estrutura de ajustes) sob a seção [SETTING_GROUPS].
  if(groupsData&&Array.isArray(groupsData.settingGroups)){
    lines.push('[SETTING_GROUPS]');
    lines.push(`ACTIVE=${groupsData.activeGroup||0}`);
    groupsData.settingGroups.forEach((g,i)=>{lines.push(`GROUP_${i}=${JSON.stringify(g)}`);});
    lines.push('');
  }

  // ── BREAKER MONITOR (desgaste do DJ)
  // Contadores acumulados de manutenção: nº de aberturas e ΣkA² interrompidos.
  if(bkMon&&typeof bkMon==='object'){
    lines.push('[BREAKER_MONITOR]');
    lines.push(`NOPS=${bkMon.nOps||0}`);
    lines.push(`SUMKA2=${bkMon.sumKA2||0}`);
    lines.push(`LASTIKA=${bkMon.lastIkA||0}`);
    lines.push(`LASTOPTS=${bkMon.lastOpTs!=null?bkMon.lastOpTs:''}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Parse plaintext save file and extract configuration.
 * Reads INI-style format and reconstructs system, protections, matrices, and wiring.
 * @param {string} text - File content
 * @param {Object} currentProt - Current protection config (used as base/fallback)
 * @param {Object} currentMatrix - Current output matrix (used as base/fallback)
 * @returns {{sys: Object, prot: Object, outMatrix: Object, wiring: Object|null}} - Parsed configuration
 */
export function parseSaveFile(text,currentProt,currentMatrix){
  const sys={tp:{priV:13800,secV:115,priConn:'estrela',secConn:'estrela'},tc:{priA:600,secA:5}};
  const prot=deepClone(currentProt);
  const matrix=deepClone(currentMatrix);
  // Reset matrix to all false
  Object.keys(matrix).forEach(r=>{Object.keys(matrix[r]).forEach(c=>{matrix[r][c]=false;});});
  const wiring={switchSt:{},connections:[]};let connIdx=0;
  const rawGroups=[];let groupActive=0;let hasGroups=false;
  const rawBkMon={};

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
      if(key==='TP_PRI_V')sys.tp.priV=safeNum(val,sys.tp.priV);
      else if(key==='TP_SEC_V')sys.tp.secV=safeNum(val,sys.tp.secV);
      else if(key==='TP_PRI_CONN')sys.tp.priConn=val;
      else if(key==='TP_SEC_CONN')sys.tp.secConn=val;
      else if(key==='TC_PRI_A')sys.tc.priA=safeNum(val,sys.tc.priA);
      else if(key==='TC_SEC_A')sys.tc.secA=safeNum(val,sys.tc.secA);
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
          fn.stages27[idx].pickup=safeNum(p[2],fn.stages27[idx].pickup);fn.stages27[idx].timeOp=safeNum(p[3],fn.stages27[idx].timeOp);
        }
      }
      else if(key.startsWith('STAGE59_')){
        const idx=parseInt(key.replace('STAGE59_',''));
        const p=val.split('|');if(fn.stages59&&fn.stages59[idx]){
          fn.stages59[idx].id=p[0];fn.stages59[idx].enabled=p[1]==='true';
          fn.stages59[idx].pickup=safeNum(p[2],fn.stages59[idx].pickup);fn.stages59[idx].timeOp=safeNum(p[3],fn.stages59[idx].timeOp);
        }
      }
      else if(key.startsWith('STAGE81U_')){
        const idx=parseInt(key.replace('STAGE81U_',''));
        const p=val.split('|');if(fn.stages81u&&fn.stages81u[idx]){
          fn.stages81u[idx].id=p[0];fn.stages81u[idx].enabled=p[1]==='true';
          fn.stages81u[idx].pickup=safeNum(p[2],fn.stages81u[idx].pickup);fn.stages81u[idx].timeOp=safeNum(p[3],fn.stages81u[idx].timeOp);
        }
      }
      else if(key.startsWith('STAGE32R_')){
        const idx=parseInt(key.replace('STAGE32R_',''));
        const p=val.split('|');if(fn.stages32r&&fn.stages32r[idx]){
          fn.stages32r[idx].id=p[0];fn.stages32r[idx].enabled=p[1]==='true';
          fn.stages32r[idx].pickup=safeNum(p[2],fn.stages32r[idx].pickup);fn.stages32r[idx].timeOp=safeNum(p[3],fn.stages32r[idx].timeOp);
        }
      }
      else if(key.startsWith('STAGE32F_')){
        const idx=parseInt(key.replace('STAGE32F_',''));
        const p=val.split('|');if(fn.stages32f&&fn.stages32f[idx]){
          fn.stages32f[idx].id=p[0];fn.stages32f[idx].enabled=p[1]==='true';
          fn.stages32f[idx].pickup=safeNum(p[2],fn.stages32f[idx].pickup);fn.stages32f[idx].timeOp=safeNum(p[3],fn.stages32f[idx].timeOp);
        }
      }
      else if(key==='INJ87'){
        const p=val.split('|');if(!fn.inj87)fn.inj87={IW1:{mag:0,ang:0},IW2:{mag:0,ang:0},h2pct:0};
        fn.inj87.IW1={mag:safeNum(p[0],fn.inj87.IW1.mag),ang:safeNum(p[1],fn.inj87.IW1.ang)};
        fn.inj87.IW2={mag:safeNum(p[2],fn.inj87.IW2.mag),ang:safeNum(p[3],fn.inj87.IW2.ang)};
        fn.inj87.h2pct=safeNum(p[4],fn.inj87.h2pct);
      }
      else if(key.startsWith('STAGE87_')){
        const idx=parseInt(key.replace('STAGE87_',''));
        const p=val.split('|');if(fn.stages87&&fn.stages87[idx]){
          const st=fn.stages87[idx];
          st.id=p[0];st.enabled=p[1]==='true';
          st.Ipu=safeNum(p[2],st.Ipu);st.knee=safeNum(p[3],st.knee);
          st.slope1=safeNum(p[4],st.slope1);st.slope2=safeNum(p[5],st.slope2);
          st.thr2h=safeNum(p[6],st.thr2h);st.tOp=safeNum(p[7],st.tOp);
        }
      }
      else if(key.startsWith('STAGE21_')){
        const idx=parseInt(key.replace('STAGE21_',''));
        const p=val.split('|');if(fn.stages21&&fn.stages21[idx]){
          const st=fn.stages21[idx];
          st.id=p[0];st.enabled=p[1]==='true';st.type=p[2];
          st.reach=safeNum(p[3],st.reach);st.mta=safeNum(p[4],st.mta);
          st.tDelay=safeNum(p[5],st.tDelay);st.minV=safeNum(p[6],st.minV);
        }
      }
      else if(key.startsWith('STAGE50BF_')){
        const idx=parseInt(key.replace('STAGE50BF_',''));
        const p=val.split('|');if(fn.stages50bf&&fn.stages50bf[idx]){
          const st=fn.stages50bf[idx];
          st.id=p[0];st.enabled=p[1]==='true';
          st.pickup=safeNum(p[2],st.pickup);st.tBF=safeNum(p[3],st.tBF);
        }
      }
      else if(key.startsWith('STAGE49_')){
        const idx=parseInt(key.replace('STAGE49_',''));
        const p=val.split('|');if(fn.stages49&&fn.stages49[idx]){
          const st=fn.stages49[idx];
          st.id=p[0];st.enabled=p[1]==='true';
          st.Ib=safeNum(p[2],st.Ib);st.k=safeNum(p[3],st.k);
          st.tau=safeNum(p[4],st.tau);st.ipPrior=safeNum(p[5],st.ipPrior);
        }
      }
      else if(key==='REF25'){
        const p=val.split('|');if(!fn.ref25)fn.ref25={Vmag:66.4,Vang:0,fHz:60};
        fn.ref25.Vmag=safeNum(p[0],fn.ref25.Vmag);
        fn.ref25.Vang=safeNum(p[1],fn.ref25.Vang);
        fn.ref25.fHz=safeNum(p[2],fn.ref25.fHz);
      }
      else if(key.startsWith('STAGE25_')){
        const idx=parseInt(key.replace('STAGE25_',''));
        const p=val.split('|');if(fn.stages25&&fn.stages25[idx]){
          const st=fn.stages25[idx];
          st.id=p[0];st.enabled=p[1]==='true';
          st.dVmax=safeNum(p[2],st.dVmax);st.dAngMax=safeNum(p[3],st.dAngMax);
          st.dFmax=safeNum(p[4],st.dFmax);st.tCheck=safeNum(p[5],st.tCheck);
        }
      }
      else if(key==='INJ81R'){
        const p=val.split('|');if(!fn.inj81r)fn.inj81r={dfdt:0};
        fn.inj81r.dfdt=safeNum(p[0],fn.inj81r.dfdt);
      }
      else if(key.startsWith('STAGE81R_')){
        const idx=parseInt(key.replace('STAGE81R_',''));
        const p=val.split('|');if(fn.stages81r&&fn.stages81r[idx]){
          const st=fn.stages81r[idx];
          st.id=p[0];st.enabled=p[1]==='true';
          st.pickup=safeNum(p[2],st.pickup);st.tOp=safeNum(p[3],st.tOp);
          if(p[4]!==undefined)st.dir=p[4];
        }
      }
      else if(key==='SHOTS')fn.shots=parseInt(val);
      else if(key==='DEAD_TIMES')fn.deadTimes=val.split(',').map(Number);
      else if(key==='RECLAIM_TIME')fn.reclaimTime=parseFloat(val);
      else if(key.startsWith('STAGE81O_')){
        const idx=parseInt(key.replace('STAGE81O_',''));
        const p=val.split('|');if(fn.stages81o&&fn.stages81o[idx]){
          fn.stages81o[idx].id=p[0];fn.stages81o[idx].enabled=p[1]==='true';
          fn.stages81o[idx].pickup=safeNum(p[2],fn.stages81o[idx].pickup);fn.stages81o[idx].timeOp=safeNum(p[3],fn.stages81o[idx].timeOp);
        }
      }
      else if(key.startsWith('STAGE_')){
        const idx=parseInt(key.replace('STAGE_',''));
        const p=val.split('|');if(fn.stages&&fn.stages[idx]){
          const st=fn.stages[idx];
          st.id=p[0];st.enabled=p[1]==='true';
          st.pickup=safeNum(p[2],st.pickup);
          if(currentFid==='47'||currentFid==='46'){
            st.timeOp=safeNum(p[3],st.timeOp);
          }else if(currentFid==='67'||currentFid==='67N'){
            st.timeDial=safeNum(p[3],st.timeDial);st.curve=resolveCurveName(p[4]);
            st.timeOp=safeNum(p[5],st.timeOp);st.mta=safeNum(p[6],st.mta);st.pol=p[7];
            if(p[8]!==undefined)st.minPolV=safeNum(p[8],st.minPolV);
            if(p[9]!==undefined)st.dir=p[9];
          }else{
            st.timeDial=safeNum(p[3],st.timeDial);st.curve=resolveCurveName(p[4]);st.timeOp=safeNum(p[5],st.timeOp);
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
    else if(section==='SETTING_GROUPS'){
      hasGroups=true;
      if(key==='ACTIVE'){groupActive=clampGroupIdx(safeNum(val,0));}
      else if(key.startsWith('GROUP_')){
        const idx=parseInt(key.replace('GROUP_',''));
        try{const g=JSON.parse(val);if(g&&typeof g==='object')rawGroups[idx]=g;}catch{/* ignora grupo corrompido */}
      }
    }
    else if(section==='BREAKER_MONITOR'){
      if(key==='NOPS')rawBkMon.nOps=safeNum(val,0);
      else if(key==='SUMKA2')rawBkMon.sumKA2=safeNum(val,0);
      else if(key==='LASTIKA')rawBkMon.lastIkA=safeNum(val,0);
      else if(key==='LASTOPTS')rawBkMon.lastOpTs=val===''?null:safeNum(val,null);
    }
  }
  const hasWiring=Object.keys(wiring.switchSt).length>0||wiring.connections.length>0;
  // Retrocompat: arquivos sem [SETTING_GROUPS] → 4 grupos clonados do prot carregado.
  const settingGroups=hasGroups?normalizeGroups(rawGroups,prot):normalizeGroups(null,prot);
  const activeGroup=hasGroups?groupActive:0;
  // Retrocompat: arquivos sem [BREAKER_MONITOR] → contadores zerados.
  const bkMon=normalizeBkMon(rawBkMon);
  return{sys,prot,outMatrix:matrix,wiring:hasWiring?wiring:null,settingGroups,activeGroup,bkMon};
}
