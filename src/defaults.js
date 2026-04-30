export const deepClone=o=>JSON.parse(JSON.stringify(o));

export const curveTypes=["IEC - Standard Inverse","IEC - Very Inverse","IEC - Extremely Inverse","IEC - Long-Time Inverse","IEC - Short-Time Inverse","US - Moderately Inverse","US - Inverse","US - Very Inverse","US - Extremely Inverse","US - Short-Time Inverse","IEEE - Moderately Inverse","IEEE - Very Inverse","IEEE - Extremely Inverse","ANSI - Moderately Inverse","ANSI - Normally Inverse","ANSI - Very Inverse","ANSI - Extremely Inverse","Tempo Definido"];
export const mkS=(id,en=true,pu=1,td=0.1,cv="IEC - Standard Inverse",top=0)=>({id,enabled:en,pickup:pu,timeDial:td,curve:cv,timeOp:top});
export const mkD=(id,en=true,pu=1,td=0.1,cv="IEC - Standard Inverse",mta=-45,pol="quadratura",minPolV=1,dir="forward")=>({id,enabled:en,pickup:pu,timeDial:td,curve:cv,mta,pol,timeOp:0,minPolV,dir});
export const mkV=(id,en=true,pu=0.8,top=0.5)=>({id,enabled:en,pickup:pu,timeOp:top});
export const mkF=(id,en=true,pu=59.5,top=1.0)=>({id,enabled:en,pickup:pu,timeOp:top});
export const mkP=(id,en=true,pu=5,top=1.0)=>({id,enabled:en,pickup:pu,timeOp:top});
export const defaultPhasors={currents:{Ia:{mag:0,ang:0},Ib:{mag:0,ang:-120},Ic:{mag:0,ang:120}},voltages:{Va:{mag:66.4,ang:0},Vb:{mag:66.4,ang:-120},Vc:{mag:66.4,ang:120}}};
export const defaultSystem={tp:{priV:13800,secV:115,priConn:"estrela",secConn:"estrela"},tc:{priA:600,secA:5},freq:60};
export const defaultProtections={
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
export const protOrder=["51","50","51N","50N","67","67N","27/59","47","46","81","32","79"];
export const biRows=["BI1","BI2","BI3","BI4","BI5","BI6"];
export const cbStatusRows=["CB_Opened","CB_Closed"];
export const cbCmdRows=["CLOSE_CB","OPEN_CB"];
export const protStageRows=[];
protOrder.forEach(fid=>{const f=defaultProtections[fid];if(fid==="27/59"){(f.stages27||[]).forEach(s=>protStageRows.push(s.id));(f.stages59||[]).forEach(s=>protStageRows.push(s.id))}else if(fid==="81"){(f.stages81u||[]).forEach(s=>protStageRows.push(s.id));(f.stages81o||[]).forEach(s=>protStageRows.push(s.id))}else if(fid==="32"){(f.stages32r||[]).forEach(s=>protStageRows.push(s.id));(f.stages32f||[]).forEach(s=>protStageRows.push(s.id))}else if(fid==="79"){}else{(f.stages||[]).forEach(s=>protStageRows.push(s.id))}});
export const allRows=[...biRows,...cbStatusRows,...cbCmdRows,...protStageRows];
export const boCols=["BO1","BO2","BO3","BO4","BO5","BO6"];
export const ledCols=["L1","L2","L3","L4","L5","L6","L7","L8"];
export const allCols=[...boCols,...ledCols];
export const buildDefaultMatrix=()=>{const m={};allRows.forEach(r=>{m[r]={};allCols.forEach(c=>{m[r][c]=false})});return m};
export const inMatrixRows=["CB_Opened","CB_Closed"];
export const buildDefaultInMatrix=()=>{const m={};inMatrixRows.forEach(r=>{m[r]={};biRows.forEach(c=>{m[r][c]=false})});return m};
export const mainTabs=[{id:"sys",label:"System Parameters"},{id:"relay",label:"Relay Settings"},{id:"output",label:"Output Matrix"},{id:"input",label:"Input Matrix"}];

export const TEST_PRESETS=[
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
export const fmtTs=()=>{const d=new Date();const p2=v=>String(v).padStart(2,'0');const p3=v=>String(v).padStart(3,'0');return`${p2(d.getDate())}:${p2(d.getMonth()+1)}:${d.getFullYear()}-${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${p3(d.getMilliseconds())}`};
export const nowShort=()=>new Date().toLocaleTimeString('pt-BR',{hour12:false});
