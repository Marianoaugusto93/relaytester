import { deepClone } from './defaults.js';
import { resolveCurveName } from './protection.js';

export const FILE_HEADER='# RELAYLAB 360 — Parametrization File';
export const FILE_VERSION='v1.0';

export function buildSaveContent(sys,prot,outMatrix,wiring){
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

export function parseSaveFile(text,currentProt,currentMatrix){
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
