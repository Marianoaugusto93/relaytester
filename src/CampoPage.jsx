import { useState, useRef, useEffect, useCallback, useMemo } from "react";

// ── DATA ──────────────────────────────────────────────────────────────────────
const SLOT_H=120,HANDLE_H=44,GAP=5,TOP_Y=GAP,BOT_Y=SLOT_H-HANDLE_H-GAP;
const ANILHA_BG='#FFE033',ANILHA_BORDER='#C8A800',ANILHA_TEXT='#111';
const BORNE_ANILHAS=['BO3-1','BO3-2','BO4-1','BO4-2','BO5-1','BO5-2','BO6-1','BO6-2','52a-1','52a-2','52b-1','52b-2','TC-1','TC-2','FC-1','FC-2'];
// TB 9–10: 52a (breaker closed contact), TB 11–12: 52b (breaker open contact)
// TB 13–14: TC trip coil, TB 15–16: FC close coil
const BORNE_TYPE={9:'52a',10:'52a',11:'52b',12:'52b',13:'tc',14:'tc',15:'fc',16:'fc'};

const CHAVE_POLES=[
  {id:'ia1',group:'ia',body:'#1565C0',dark:'#0D47A1',shine:'#42A5F5',cable:'#1E88E5',topAnilha:'A',botAnilha:'S1',kind:'normal'},
  {id:'ia2',group:'ia',body:'#1565C0',dark:'#0D47A1',shine:'#42A5F5',cable:'#1E88E5',topAnilha:'T',botAnilha:'S2',kind:'normal'},
  {id:'ib1',group:'ib',body:'#B71C1C',dark:'#7F0000',shine:'#EF5350',cable:'#E53935',topAnilha:'B',botAnilha:'S1',kind:'normal'},
  {id:'ib2',group:'ib',body:'#B71C1C',dark:'#7F0000',shine:'#EF5350',cable:'#E53935',topAnilha:'T',botAnilha:'S2',kind:'normal'},
  {id:'ic1',group:'ic',body:'#9E9E9E',dark:'#616161',shine:'#E0E0E0',cable:'#AAAAAA',topAnilha:'C',botAnilha:'S1',kind:'normal'},
  {id:'ic2',group:'ic',body:'#9E9E9E',dark:'#616161',shine:'#E0E0E0',cable:'#AAAAAA',topAnilha:'T',botAnilha:'S2',kind:'normal'},
  {id:'va',group:'va',body:'#1565C0',dark:'#0D47A1',shine:'#42A5F5',cable:'#1E88E5',topAnilha:'VA',botAnilha:'X1',kind:'normal'},
  {id:'vb',group:'vb',body:'#B71C1C',dark:'#7F0000',shine:'#EF5350',cable:'#E53935',topAnilha:'VB',botAnilha:'X2',kind:'normal'},
  {id:'vc',group:'vc',body:'#9E9E9E',dark:'#616161',shine:'#E0E0E0',cable:'#AAAAAA',topAnilha:'VC',botAnilha:'X1',kind:'normal'},
  {id:'terra',group:'terra',body:'#2E7D32',dark:'#1B5E20',shine:'#66BB6A',cable:'#43A047',topAnilha:'T',botAnilha:'T',kind:'terra'},
];

function mkPair(p,n){const l=p+n;return{label:l,red:{id:`${p.toLowerCase()}${n}_pos`,label:l,color:'red'},blk:{id:`${p.toLowerCase()}${n}_neg`,label:l,color:'black'}};}
const AO_I=[mkPair('I',1),mkPair('I',2),mkPair('I',3)];
const AO_V=[mkPair('V',1),mkPair('V',2),mkPair('V',3)];
const BO_PAIRS=[mkPair('BO',1),mkPair('BO',2),mkPair('BO',3),mkPair('BO',4)];
const BI_PAIRS=[mkPair('BI',1),mkPair('BI',2),mkPair('BI',3),mkPair('BI',4)];

function darken(hex,f){if(!hex||!hex.startsWith('#'))return hex;const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgb(${Math.round(r*f)},${Math.round(g*f)},${Math.round(b*f)})`;}

function cableColorFor(a,b){
  const isC=id=>id.endsWith('_top')||id.endsWith('_bot');
  const isB=id=>id.startsWith('tb_');
  if(!isC(a)&&!isB(a)&&!isC(b)&&!isB(b))return'#444444';
  const all=a+' '+b;
  if(/ia1|ia2|va_|i1_|v1_|bo1|bi1/.test(all))return'#D4AA00';
  if(/ib1|ib2|vb_|i2_|v2_|bo2|bi2/.test(all))return'#CC2222';
  if(/ic1|ic2|vc_|i3_|v3_|bo3|bi3/.test(all))return'#888888';
  return'#AAAAAA';
}

const initSwitchState=()=>{const s={};CHAVE_POLES.filter(p=>p.kind==='normal').forEach(p=>{s[p.id]='up'});return s;};

// ── ELECTRICAL LOGIC ──────────────────────────────────────────────────────────
//
// CHAVE DE AFERIÇÃO — Lógica elétrica dos terminais de corrente e tensão
//
// Cada grupo de corrente tem 2 polos (ex: ia1 + ia2 para fase A):
//   - id1 (ia1): top = cabo A (fase),   bot = plugue banana S1
//   - id2 (ia2): top = cabo T (retorno), bot = plugue banana S2
//
// POSIÇÃO FECHADA (slider UP):
//   - A ↔ S1 : continuidade (id1_top ↔ id1_bot)
//   - T ↔ S2 : continuidade (id2_top ↔ id2_bot)
//   - A ↔ T  : SEM continuidade (nunca conectados)
//   - S1 ↔ S2: SEM continuidade (nunca conectados nesta posição)
//
// POSIÇÃO CURTO / ABERTA (slider DOWN):
//   - S1 ↔ S2: continuidade — mesmo ponto elétrico (id1_bot ↔ id2_bot)
//   - A ↔ S1 : SEM continuidade (isolado)
//   - T ↔ S2 : SEM continuidade (isolado)
//   - A ↔ T  : SEM continuidade (isolados entre si)
//
// Terminais de tensão (va, vb, vc) — cada um é individual:
//   FECHADA (UP): top ↔ bot conectados (ex: VA ↔ X1)
//   ABERTA (DOWN): top e bot desconectados. Sem curto-circuito.
//
const CURRENT_GROUPS=[
  {group:'ia',id1:'ia1',id2:'ia2'},  // Fase A: ia1(A/S1) + ia2(T/S2)
  {group:'ib',id1:'ib1',id2:'ib2'},  // Fase B: ib1(B/S1) + ib2(T/S2)
  {group:'ic',id1:'ic1',id2:'ic2'},  // Fase C: ic1(C/S1) + ic2(T/S2)
];
const VOLTAGE_POLES=['va','vb','vc'];

// Retorna array de pares [tidA, tidB] com conexões internas ativas da chave
function getInternalConnections(switchSt){
  const conns=[];

  // CONEXÃO PERMANENTE: todos os terminais T (retorno) estão interconectados.
  // Os sensores de corrente do relé são fechados em estrela — o terminal T
  // da fase A, B e C é o mesmo ponto elétrico (neutro/terra do relé).
  // Isso vale SEMPRE, independente da posição da chave.
  // Consequência: o usuário pode conectar o retorno (preto) da maleta em
  // QUALQUER T (fase A, B ou C) e a corrente retorna para todas as fases.
  conns.push(['ia2_top','ib2_top']);  // T fase A ↔ T fase B
  conns.push(['ib2_top','ic2_top']);  // T fase B ↔ T fase C

  // CONEXÃO PERMANENTE: cada módulo da régua de bornes tem abertura superior
  // e inferior que são o mesmo ponto elétrico (mesmo condutor interno).
  for(let i=1;i<=16;i++) conns.push([`tb_${i}_top`,`tb_${i}_bottom`]);

  CURRENT_GROUPS.forEach(({id1,id2})=>{
    if(switchSt[id1]==='up'){
      // FECHADA: A↔S1, T↔S2 (continuidade através da chave)
      conns.push([`${id1}_top`,`${id1}_bot`]);
      conns.push([`${id2}_top`,`${id2}_bot`]);
      // A↔T: NÃO conectados. S1↔S2: NÃO conectados.
    } else {
      // CURTO (ABERTA): S1↔S2 (mesmo ponto elétrico)
      conns.push([`${id1}_bot`,`${id2}_bot`]);
      // A e T ficam isolados — sem conexão com S1, S2 ou entre si.
    }
  });
  VOLTAGE_POLES.forEach(id=>{
    if(switchSt[id]==='up'){
      // FECHADA: top↔bot (continuidade)
      conns.push([`${id}_top`,`${id}_bot`]);
    }
    // ABERTA: sem conexão alguma
  });
  return conns;
}

// Conexões dinâmicas do disjuntor: 52a fechado quando disjuntor fechado, 52b quando aberto
function getBreakerConns(bkStatus){
  if(!bkStatus)return[];
  if(bkStatus.state==='closed')return[['tb_9_top','tb_10_top']]; // 52a ON
  return[['tb_11_top','tb_12_top']]; // 52b ON
}

// Union-Find para determinar grupos elétricos (quais terminais compartilham
// o mesmo ponto elétrico considerando cabos manuais + chave de aferição)
export function buildElectricalGraph(manualConnections,internalConns){
  const parent={};
  // Union-Find iterativo (evita stack overflow em cadeias longas)
  const find=(x)=>{
    if(!x)return x;
    if(!parent[x])parent[x]=x;
    // Path to root
    let root=x;
    while(parent[root]!==root){root=parent[root];}
    // Path compression
    let cur=x;
    while(parent[cur]!==root){const next=parent[cur];parent[cur]=root;cur=next;}
    return root;
  };
  const union=(a,b)=>{if(!a||!b)return;const ra=find(a),rb=find(b);if(ra!==rb)parent[ra]=rb;};
  // Conexões internas da chave de aferição
  (internalConns||[]).forEach(([a,b])=>union(a,b));
  // Conexões manuais (cabos do usuário entre maleta, régua e chave)
  (manualConnections||[]).forEach(({from,to})=>union(from,to));
  return{
    areConnected:(a,b)=>{if(!a||!b)return false;return find(a)===find(b);},
    getGroup:(a)=>find(a),
  };
}

// ── MAPEAMENTO MALETA ↔ RELÉ ──────────────────────────────────────────────────
//
// SENSORES DE CORRENTE DO RELÉ — conectados permanentemente aos cabos superiores
// da chave de aferição (A/T, B/T, C/T). A corrente entra pelo cabo de fase e
// retorna pelo cabo T. Esses cabos vão diretamente ao sensor de corrente do relé.
//
// IMPORTANTE: os terminais T da fase A, B e C são TODOS interconectados
// permanentemente (ponto estrela / neutro do relé). Isso significa que o
// retorno (preto da maleta) pode ser conectado em QUALQUER T — a corrente
// retorna para todas as fases porque os T's são o mesmo ponto elétrico.
//
// MALETA DE TESTE — saídas de corrente I1/I2/I3 (vermelho=injeção, preto=retorno).
// O painel "Current Injection" da aba Relé controla I1→Ia, I2→Ib, I3→Ic.
// A corrente SÓ chega no relé se os cabos estiverem conectados corretamente.
//
// Conexão correta padrão (método 1 — cada preto no T da própria fase):
//   I1 vermelho→A, I1 preto→T(A), I2 verm→B, I2 preto→T(B), I3 verm→C, I3 preto→T(C)
//
// Conexão alternativa (método 2 — pretos interconectados, um só no T):
//   I1 verm→A, I2 verm→B, I3 verm→C
//   I1 preto↔I2 preto↔I3 preto (interconectados entre si)
//   Qualquer preto conectado a QUALQUER T (A, B ou C) → funciona igual
//   Isso funciona porque os T's já estão interconectados internamente (estrela).
//
// TENSÃO DO RELÉ — o retorno de tensão também é pelo ponto estrela (T).
// O usuário DEVE interconectar V1/V2/V3 pretos e conectar um deles a um T.
//
export const RELAY_CURRENT_SENSORS=[
  {phase:'Ia',posId:'ia1_top',negId:'ia2_top'},  // Fase A: entrada=A, retorno=T(A)
  {phase:'Ib',posId:'ib1_top',negId:'ib2_top'},  // Fase B: entrada=B, retorno=T(B)
  {phase:'Ic',posId:'ic1_top',negId:'ic2_top'},  // Fase C: entrada=C, retorno=T(C)
];
// Nota: como ia2_top≡ib2_top≡ic2_top (interconectados), qualquer negId funciona.
// Cada sensor usa o T da própria fase por clareza, mas eletricamente é o mesmo ponto.

export const RELAY_VOLTAGE_INPUTS=[
  {phase:'Va',posId:'va_top',negId:'terra_top'},  // Fase A: VA, retorno=Terra
  {phase:'Vb',posId:'vb_top',negId:'terra_top'},  // Fase B: VB, retorno=Terra
  {phase:'Vc',posId:'vc_top',negId:'terra_top'},  // Fase C: VC, retorno=Terra
];
// A referência de tensão do relé é o terminal Terra da chave de aferição.

// Saídas da maleta — cada par (pos=vermelho, neg=preto) com o fasor correspondente
export const MALETA_CURRENT_OUTPUTS=[
  {posId:'i1_pos',negId:'i1_neg',phasorKey:'Ia'},  // I1 → painel Ia
  {posId:'i2_pos',negId:'i2_neg',phasorKey:'Ib'},  // I2 → painel Ib
  {posId:'i3_pos',negId:'i3_neg',phasorKey:'Ic'},  // I3 → painel Ic
];

export const MALETA_VOLTAGE_OUTPUTS=[
  {posId:'v1_pos',negId:'v1_neg',phasorKey:'Va'},  // V1 → painel Va
  {posId:'v2_pos',negId:'v2_neg',phasorKey:'Vb'},  // V2 → painel Vb
  {posId:'v3_pos',negId:'v3_neg',phasorKey:'Vc'},  // V3 → painel Vc
];

// Calcula o que o relé REALMENTE vê baseado na conectividade elétrica.
// Se a maleta não estiver conectada corretamente, o relé vê 0.
// Se estiver conectada invertida, o ângulo é deslocado 180°.
export function computeRelayReadings(phasors,electricalGraph){
  const currents={Ia:{mag:0,ang:0},Ib:{mag:0,ang:0},Ic:{mag:0,ang:0}};
  const voltages={Va:{mag:0,ang:0},Vb:{mag:0,ang:0},Vc:{mag:0,ang:0}};

  // Para cada sensor de corrente do relé, verifica qual saída da maleta chega nele
  RELAY_CURRENT_SENSORS.forEach(sensor=>{
    MALETA_CURRENT_OUTPUTS.forEach(output=>{
      const ph=phasors.currents[output.phasorKey];
      // Conexão correta: pos→pos, neg→neg
      const fwd=electricalGraph.areConnected(output.posId,sensor.posId)
              &&electricalGraph.areConnected(output.negId,sensor.negId);
      // Conexão invertida: pos→neg, neg→pos (corrente flui ao contrário = 180°)
      const rev=electricalGraph.areConnected(output.posId,sensor.negId)
              &&electricalGraph.areConnected(output.negId,sensor.posId);
      if(fwd){
        currents[sensor.phase]={mag:ph.mag,ang:ph.ang};
      }else if(rev){
        currents[sensor.phase]={mag:ph.mag,ang:ph.ang+180};
      }
    });
  });

  // Para cada entrada de tensão do relé, verifica qual saída da maleta chega nele
  RELAY_VOLTAGE_INPUTS.forEach(sensor=>{
    MALETA_VOLTAGE_OUTPUTS.forEach(output=>{
      const ph=phasors.voltages[output.phasorKey];
      const fwd=electricalGraph.areConnected(output.posId,sensor.posId)
              &&electricalGraph.areConnected(output.negId,sensor.negId);
      const rev=electricalGraph.areConnected(output.posId,sensor.negId)
              &&electricalGraph.areConnected(output.negId,sensor.posId);
      if(fwd){
        voltages[sensor.phase]={mag:ph.mag,ang:ph.ang};
      }else if(rev){
        voltages[sensor.phase]={mag:ph.mag,ang:ph.ang+180};
      }
    });
  });

  return{currents,voltages};
}

// ── DETECÇÃO DE TRIP: BO → BORNE → BI (MALETA) ───────────────────────────────
//
// O relé sinaliza trip através de saídas binárias (BO) na régua de bornes.
// Cada BO do relé é um contato seco com dois pinos em bornes adjacentes.
// Quando o BO ativa (trip), o contato fecha e os dois bornes se conectam.
// A maleta só detecta o trip se:
//   1. O estágio tripado está mapeado a um BO na Output Matrix (relayMatrix)
//   2. Os bornes do BO estão conectados (via cabos) a uma BI da maleta
// Se qualquer condição falhar, a maleta não sabe que houve trip.
//
// BO1 e BO2 não possuem bornes na régua — não podem sinalizar a maleta.

// Mapeamento: coluna BO da Output Matrix → par de bornes na régua
// Quando BO ativa, cria conexão elétrica entre os dois bornes do par.
export const RELAY_BO_TO_BORNE={
  'BO3':['tb_1','tb_2'],   // BO3-1 (borne 1) ↔ BO3-2 (borne 2)
  'BO4':['tb_3','tb_4'],   // BO4-1 (borne 3) ↔ BO4-2 (borne 4)
  'BO5':['tb_5','tb_6'],   // BO5-1 (borne 5) ↔ BO5-2 (borne 6)
  'BO6':['tb_7','tb_8'],   // BO6-1 (borne 7) ↔ BO6-2 (borne 8)
};

// Entradas binárias da maleta (detectam contato fechado entre pos e neg)
export const MALETA_BI=[
  {id:'BI1',posId:'bi1_pos',negId:'bi1_neg'},
  {id:'BI2',posId:'bi2_pos',negId:'bi2_neg'},
  {id:'BI3',posId:'bi3_pos',negId:'bi3_neg'},
  {id:'BI4',posId:'bi4_pos',negId:'bi4_neg'},
];

// Verifica se a maleta detecta trip com base em:
// - stageIds: estágios que triparam (ex: ["51-1"])
// - relayMatrix: configuração do relé (quais estágios estão mapeados a quais BOs)
// - fieldState: {connections, internalConns} do campo (cabos + chave)
// Retorna true se a maleta detecta o trip (algum BI tem pos↔neg conectados
// através da cadeia: BO ativado → bornes → cabos → BI da maleta)
export function checkMaletaTripDetection(stageIds,relayMatrix,fieldState){
  if(!stageIds||!relayMatrix||!fieldState)return false;
  const boCols=['BO3','BO4','BO5','BO6'];
  // Determinar quais BOs estão ativados pelos estágios que triparam
  const activeBOs=new Set();
  stageIds.forEach(stageId=>{
    if(!relayMatrix[stageId])return;
    boCols.forEach(bo=>{
      if(relayMatrix[stageId][bo])activeBOs.add(bo);
    });
  });
  if(activeBOs.size===0)return false;

  // Construir grafo elétrico estendido: cabos + chave + BOs ativados
  // Cada BO ativado fecha o contato entre seus bornes (conexão temporária)
  const boConns=[];
  activeBOs.forEach(bo=>{
    const pair=RELAY_BO_TO_BORNE[bo];
    if(!pair)return;
    // Contato fecha: borne A ↔ borne B (top já conectado a bottom internamente)
    boConns.push([`${pair[0]}_top`,`${pair[1]}_top`]);
  });

  // Reconstruir grafo com as conexões BO ativas
  const conns=fieldState.connections||[];
  const internal=fieldState.internalConns||[];
  const graph=buildElectricalGraph(conns,[...internal,...boConns]);

  // Verificar se algum BI da maleta detecta o contato fechado
  // O usuário pode conectar QUALQUER BO a QUALQUER BI livremente.
  // Basta que o par de bornes do BO (fechado pelo relé) esteja conectado
  // ao par pos/neg de algum BI da maleta.
  return MALETA_BI.some(bi=>graph.areConnected(bi.posId,bi.negId));
}

// Verifica se o circuito da bobina de disparo (TC — TB_13/TB_14) está completo
// via um BO ativo do relé. Quando verdadeiro, o disjuntor deve abrir.
export function checkBreakerTripCoil(stageIds,relayMatrix,fieldState){
  if(!stageIds||!relayMatrix||!fieldState)return false;
  const boCols=['BO3','BO4','BO5','BO6'];
  const activeBOs=new Set();
  stageIds.forEach(stageId=>{
    if(!relayMatrix[stageId])return;
    boCols.forEach(bo=>{if(relayMatrix[stageId][bo])activeBOs.add(bo);});
  });
  if(activeBOs.size===0)return false;
  const boConns=[];
  activeBOs.forEach(bo=>{
    const pair=RELAY_BO_TO_BORNE[bo];
    if(!pair)return;
    boConns.push([`${pair[0]}_top`,`${pair[1]}_top`]);
  });
  const conns=fieldState.connections||[];
  const internal=fieldState.internalConns||[];
  const graph=buildElectricalGraph(conns,[...internal,...boConns]);
  return graph.areConnected('tb_13_top','tb_14_top');
}

// ── VALIDAÇÃO DE CONEXÕES ─────────────────────────────────────────────────────
//
// Regras:
// - Corrente da maleta (I1-I3) → SOMENTE chave de aferição SUPERIOR (corrente + terra)
// - Tensão da maleta (V1-V3) → SOMENTE chave de aferição SUPERIOR (tensão + T retorno + terra)
// - BI/BO da maleta → SOMENTE régua de bornes ou entre si
// - Parte INFERIOR da chave de aferição → NENHUMA conexão permitida
// - Corrente NUNCA conecta em tensão e vice-versa
// - Corrente/Tensão NUNCA conectam em BI/BO
//
const SWITCH_TOP_CURRENT_PHASE=new Set(['ia1_top','ib1_top','ic1_top']);
const SWITCH_TOP_CURRENT_T=new Set(['ia2_top','ib2_top','ic2_top']);
const SWITCH_TOP_VOLTAGE=new Set(['va_top','vb_top','vc_top']);
const TERRA=new Set(['terra_top','terra_bot']);
const SWITCH_BOT=new Set(['ia1_bot','ia2_bot','ib1_bot','ib2_bot','ic1_bot','ic2_bot','va_bot','vb_bot','vc_bot']);

function getTerminalGroup(tid){
  if(!tid)return'unknown';
  if(tid.startsWith('i')&&(tid.endsWith('_pos')||tid.endsWith('_neg'))&&!tid.startsWith('ic')&&!tid.startsWith('ia')&&!tid.startsWith('ib'))return'maleta_current';
  if(tid.startsWith('v')&&(tid.endsWith('_pos')||tid.endsWith('_neg'))&&!tid.startsWith('va')&&!tid.startsWith('vb')&&!tid.startsWith('vc'))return'maleta_voltage';
  if(tid.startsWith('bi')&&(tid.endsWith('_pos')||tid.endsWith('_neg')))return'maleta_bi';
  if(tid.startsWith('bo')&&(tid.endsWith('_pos')||tid.endsWith('_neg')))return'maleta_bo';
  if(SWITCH_TOP_CURRENT_PHASE.has(tid))return'switch_current_phase';
  if(SWITCH_TOP_CURRENT_T.has(tid))return'switch_current_T';
  if(SWITCH_TOP_VOLTAGE.has(tid))return'switch_voltage';
  if(SWITCH_BOT.has(tid))return'switch_bot';
  if(TERRA.has(tid))return'terra';
  if(tid.startsWith('tb_'))return'borne';
  return'unknown';
}

// Tabela de compatibilidade: grupo A pode conectar com grupo B?
const COMPAT={
  'maleta_current':   new Set(['maleta_current','switch_current_phase','switch_current_T','terra']),
  'maleta_voltage':   new Set(['maleta_voltage','switch_voltage','switch_current_T','terra']),
  'maleta_bi':        new Set(['maleta_bi','borne']),
  'maleta_bo':        new Set(['maleta_bo','borne']),
  'switch_current_phase': new Set(['maleta_current','switch_current_phase','switch_current_T','terra']),
  'switch_current_T': new Set(['maleta_current','maleta_voltage','switch_current_phase','switch_current_T','switch_voltage','terra']),
  'switch_voltage':   new Set(['maleta_voltage','switch_voltage','switch_current_T','terra']),
  'terra':            new Set(['maleta_current','maleta_voltage','switch_current_phase','switch_current_T','switch_voltage','terra']),
  'borne':            new Set(['maleta_bi','maleta_bo','borne']),
  'switch_bot':       new Set(),  // NADA pode conectar na parte inferior
};

const ERROR_MSGS={
  'switch_bot':'Parte inferior da chave de aferição não permite conexões',
  'current_voltage':'Terminais de corrente e tensão não podem ser conectados entre si',
  'current_binary':'Terminais de corrente não podem conectar em entradas/saídas binárias',
  'voltage_binary':'Terminais de tensão não podem conectar em entradas/saídas binárias',
  'analog_borne':'Terminais analógicos (corrente/tensão) não podem conectar na régua de bornes',
  'binary_switch':'Terminais binários não podem conectar na chave de aferição',
  'switch_closed_current':'Desça a chave de corrente antes de conectar (posição curto)',
  'switch_closed_voltage':'Desça a chave de tensão antes de conectar (posição aberta)',
  'default':'Conexão não permitida entre esses terminais',
};

// Mapeamento: terminal da chave superior → pole ID para verificar estado
const SWITCH_TID_TO_POLE={
  'ia1_top':'ia1','ia2_top':'ia2','ib1_top':'ib1','ib2_top':'ib2','ic1_top':'ic1','ic2_top':'ic2',
  'va_top':'va','vb_top':'vb','vc_top':'vc',
};

function validateConnection(tidA,tidB,switchSt){
  const gA=getTerminalGroup(tidA),gB=getTerminalGroup(tidB);
  // Parte inferior da chave: sempre proibido
  if(gA==='switch_bot'||gB==='switch_bot')return{valid:false,msg:ERROR_MSGS.switch_bot};

  // Chave na posição UP (fechada): não permite conectar corrente/tensão da maleta
  // O usuário precisa descer a chave primeiro para isolar o campo
  const switchGroups=new Set(['switch_current_phase','switch_current_T','switch_voltage']);
  const maletaAnalog=new Set(['maleta_current','maleta_voltage']);
  const checkSwitchUp=(switchTid,maletaGroup)=>{
    const poleId=SWITCH_TID_TO_POLE[switchTid];
    if(!poleId||!switchSt)return null;
    if(switchSt[poleId]!=='up')return null; // DOWN = ok
    // Chave está UP — verificar se é corrente ou tensão
    if(SWITCH_TOP_CURRENT_PHASE.has(switchTid)||SWITCH_TOP_CURRENT_T.has(switchTid))
      return{valid:false,msg:ERROR_MSGS.switch_closed_current};
    if(SWITCH_TOP_VOLTAGE.has(switchTid))
      return{valid:false,msg:ERROR_MSGS.switch_closed_voltage};
    return null;
  };
  // Se um é terminal da chave e outro é da maleta (corrente/tensão), verificar posição
  if(switchGroups.has(gA)&&maletaAnalog.has(gB)){const r=checkSwitchUp(tidA,gB);if(r)return r;}
  if(switchGroups.has(gB)&&maletaAnalog.has(gA)){const r=checkSwitchUp(tidB,gA);if(r)return r;}

  // Verificar compatibilidade de grupos
  const compatA=COMPAT[gA];
  if(!compatA||!compatA.has(gB)){
    const isCurrentA=gA==='maleta_current'||gA==='switch_current_phase'||gA==='switch_current_T';
    const isCurrentB=gB==='maleta_current'||gB==='switch_current_phase'||gB==='switch_current_T';
    const isVoltageA=gA==='maleta_voltage'||gA==='switch_voltage';
    const isVoltageB=gB==='maleta_voltage'||gB==='switch_voltage';
    const isBinaryA=gA==='maleta_bi'||gA==='maleta_bo';
    const isBinaryB=gB==='maleta_bi'||gB==='maleta_bo';
    const isBorneA=gA==='borne';const isBorneB=gB==='borne';
    if((isCurrentA&&isVoltageB)||(isVoltageA&&isCurrentB))return{valid:false,msg:ERROR_MSGS.current_voltage};
    if((isCurrentA&&isBinaryB)||(isBinaryA&&isCurrentB))return{valid:false,msg:ERROR_MSGS.current_binary};
    if((isVoltageA&&isBinaryB)||(isBinaryA&&isVoltageB))return{valid:false,msg:ERROR_MSGS.voltage_binary};
    if(((isCurrentA||isVoltageA)&&isBorneB)||(isBorneA&&(isCurrentB||isVoltageB)))return{valid:false,msg:ERROR_MSGS.analog_borne};
    if((isBinaryA&&(isCurrentB||isVoltageB))||(isBinaryB&&(isCurrentA||isVoltageA)))return{valid:false,msg:ERROR_MSGS.binary_switch};
    return{valid:false,msg:ERROR_MSGS.default};
  }
  return{valid:true,msg:''};
}

// ── WIRING PRESETS ────────────────────────────────────────────────────────────
// Cabos da Interface CB (sem chave de aferição):
//   BI1 → BO3 bornes (TB1/TB2): maleta detecta trip do relé
//   TB1/TB2 → TC bornes (TB13/TB14): BO3 energiza bobina de trip → abre disjuntor
//   BI2 → 52a bornes (TB9/TB10): maleta detecta disjuntor FECHADO
//   BI3 → 52b bornes (TB11/TB12): maleta detecta disjuntor ABERTO
//   TB15 → TB16: bobina FC conectada → habilita botão "I FECHAR CB"
const CB_INTERFACE_CONNS=[
  ['bi1_pos','tb_1_top'],   // BI1+ → BO3-1
  ['bi1_neg','tb_2_top'],   // BI1- → BO3-2
  ['tb_1_top','tb_13_top'], // BO3-1 → TC-1  (trip coil via BO3)
  ['tb_2_top','tb_14_top'], // BO3-2 → TC-2
  ['bi2_pos','tb_9_top'],   // BI2+ → 52a-1  (feedback disjuntor fechado)
  ['bi2_neg','tb_10_top'],  // BI2- → 52a-2
  ['bi3_pos','tb_11_top'],  // BI3+ → 52b-1  (feedback disjuntor aberto)
  ['bi3_neg','tb_12_top'],  // BI3- → 52b-2
  ['tb_15_top','tb_16_top'],// FC-1 → FC-2   (bobina de fechamento pronta)
];

const WIRING_PRESETS=[
  {id:'i3ph',   label:'I Trifásico',  switchGroups:['ia','ib','ic'],           conns:[['i1_pos','ia1_top'],['i1_neg','ia2_top'],['i2_pos','ib1_top'],['i2_neg','ib2_top'],['i3_pos','ic1_top'],['i3_neg','ic2_top']]},
  {id:'i1ph',   label:'I Mono A',     switchGroups:['ia'],                     conns:[['i1_pos','ia1_top'],['i1_neg','ia2_top']]},
  {id:'v3ph',   label:'V Trifásico',  switchGroups:['va','vb','vc'],           conns:[['v1_pos','va_top'],['v1_neg','terra_top'],['v2_pos','vb_top'],['v2_neg','terra_top'],['v3_pos','vc_top'],['v3_neg','terra_top']]},
  {id:'iv3ph',  label:'I+V Completo', switchGroups:['ia','ib','ic','va','vb','vc'],conns:[['i1_pos','ia1_top'],['i1_neg','ia2_top'],['i2_pos','ib1_top'],['i2_neg','ib2_top'],['i3_pos','ic1_top'],['i3_neg','ic2_top'],['v1_pos','va_top'],['v1_neg','terra_top'],['v2_pos','vb_top'],['v2_neg','terra_top'],['v3_pos','vc_top'],['v3_neg','terra_top']]},
  {id:'cb_if',  label:'Interface CB', switchGroups:[],                         conns:CB_INTERFACE_CONNS},
  {id:'full',   label:'Bancada Completa',switchGroups:['ia','ib','ic','va','vb','vc'],conns:[['i1_pos','ia1_top'],['i1_neg','ia2_top'],['i2_pos','ib1_top'],['i2_neg','ib2_top'],['i3_pos','ic1_top'],['i3_neg','ic2_top'],['v1_pos','va_top'],['v1_neg','terra_top'],['v2_pos','vb_top'],['v2_neg','terra_top'],['v3_pos','vc_top'],['v3_neg','terra_top'],...CB_INTERFACE_CONNS]},
];

// ── CSS ───────────────────────────────────────────────────────────────────────
const campoCSS=`
.campo-root{background:#09090C;padding:12px 16px;font-family:monospace;display:flex;flex-direction:column;align-items:center;gap:10px;overflow-y:auto;overflow-x:hidden;height:100%;}
.poles-row{display:flex;align-items:flex-start;justify-content:center;gap:6px;padding:8px 6px;background:#0E0E14;border:1px solid #1E1E28;border-radius:8px;}
.switch-body{position:relative;width:42px;height:120px;border-radius:7px;background:linear-gradient(90deg,#1A1A1C 0%,#232328 40%,#1A1A1C 100%);border:1.5px solid #111;box-shadow:inset 0 2px 8px rgba(0,0,0,0.7);}
.c-rail{position:absolute;left:50%;transform:translateX(-50%);width:10px;top:5px;bottom:5px;border-radius:3px;background:#0A0A0C;border:1px solid #000;}
.c-handle{position:absolute;left:50%;transform:translateX(-50%);width:29px;height:44px;border-radius:5px;transition:top 0.25s cubic-bezier(0.34,1.4,0.64,1);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;}
.c-rib{width:60%;height:2px;border-radius:1px;background:rgba(0,0,0,0.35);}
.banana-chave{width:34px;height:16px;border-radius:4px;background:linear-gradient(180deg,#5A5A5A 0%,#333 50%,#222 100%);border:1.5px solid #111;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:filter .15s,box-shadow .15s;}
.banana-chave:hover{filter:brightness(1.6);}
.banana-chave.sel{box-shadow:0 0 0 2px #FFE033,0 0 8px #FFE03388;}
.screw-chave{width:34px;height:11px;border-radius:3px;background:linear-gradient(180deg,#C0C0C0 0%,#888 40%,#AAA 70%,#777 100%);border:1.5px solid #555;display:flex;align-items:center;justify-content:center;position:relative;margin:2px 0;}
.c-sep{width:1px;background:#1E1E28;align-self:stretch;margin:0 2px;}
.terra-body{position:relative;width:42px;height:120px;border-radius:7px;background:linear-gradient(90deg,#141A14 0%,#1A221A 40%,#141A14 100%);border:1.5px solid #1A2A1A;box-shadow:inset 0 2px 8px rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;}
.terra-line{width:2px;height:100%;background:linear-gradient(180deg,#1A3A1A,#2A5A2A,#1A3A1A);position:absolute;left:50%;transform:translateX(-50%);}
.maleta{background:linear-gradient(180deg,#1A1A20 0%,#111118 60%,#1A1A20 100%);border:2px solid #2A2A36;border-radius:10px;padding:12px 16px 12px;position:relative;}
.maleta-latch{width:18px;height:6px;border-radius:2px;background:#333340;border:1px solid #444;}
.section-row{background:#0E0E14;border:1px solid #1E1E28;border-radius:6px;padding:10px 14px;}
.section-title{font-size:10px;color:#ccc;letter-spacing:3px;margin-bottom:8px;text-align:center;}
.subsection-label{font-size:9px;color:#bbb;letter-spacing:2px;margin-bottom:6px;text-align:center;}
.banana-jack{width:26px;height:26px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;transition:filter .15s,box-shadow .15s;flex-shrink:0;}
.banana-jack:hover{filter:brightness(1.6);}
.banana-jack.sel{box-shadow:0 0 0 2px #FFE033,0 0 8px #FFE03388;}
.jack-hole{width:10px;height:10px;border-radius:50%;background:#080808;border:1px solid #222;}
.jack-shine{position:absolute;top:3px;left:4px;width:9px;height:4px;border-radius:50%;background:rgba(255,255,255,0.28);}
.pair-group{display:flex;flex-direction:column;align-items:center;gap:3px;}
.pair-label{font-size:9px;color:#ddd;letter-spacing:1px;font-weight:700;}
.v-divider{width:1px;background:#252530;align-self:stretch;margin:0 10px;}
.borne-wrap{display:flex;align-items:center;}
.borne-arrow-l{width:0;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-right:12px solid #8d9291;margin-right:-1px;flex-shrink:0;}
.borne-arrow-r{width:0;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-left:12px solid #5a5a5a;margin-left:-1px;flex-shrink:0;}
.borne-chassis{display:flex;overflow:hidden;border-radius:4px;border:1px solid #8d9291;background:#aeb3b2;box-shadow:0 6px 16px rgba(0,0,0,0.25);}
.borne-module{position:relative;width:47px;flex-shrink:0;height:120px;background:#aeb3b2;display:grid;grid-template-rows:1fr 29px 1fr;border-top:1px solid #8d9291;border-bottom:1px solid #8d9291;border-right:1px solid #7b8080;}
.borne-module.first{border-left:1px solid #8c9190;border-radius:4px 0 0 4px;}
.borne-module.last{border-radius:0 4px 4px 0;}
.borne-zone{position:relative;display:flex;align-items:flex-end;padding:0 5px 4px;}
.borne-zone.bot{align-items:flex-start;padding:4px 5px 0;}
.borne-ear-l{position:absolute;left:3px;top:6px;height:20px;width:9px;background:#a6abab;border-left:1px solid #8f9494;border-radius:2px 0 0 2px;transform:skewX(-8deg);}
.borne-ear-r{position:absolute;right:3px;top:6px;height:20px;width:9px;background:#a6abab;border-right:1px solid #8f9494;border-radius:0 2px 2px 0;transform:skewX(8deg);}
.borne-ear-l.bot{top:auto;bottom:6px;transform:skewX(8deg);}
.borne-ear-r.bot{top:auto;bottom:6px;transform:skewX(-8deg);}
.borne-cap-top{position:absolute;left:0;right:0;top:0;height:7px;background:#a7acab;}
.borne-cap-bot{position:absolute;left:0;right:0;bottom:0;height:7px;background:#a7acab;}
.borne-pin{position:absolute;left:50%;transform:translateX(-50%);width:1px;height:5px;background:#818686;}
.borne-pin.top{top:0;}.borne-pin.bot{bottom:0;}
.borne-opening{position:relative;width:100%;height:24px;border-radius:2px;border:1px solid #8e9393;background:#9ea4a3;box-shadow:inset 0 1px 0 rgba(255,255,255,0.22);cursor:pointer;transition:box-shadow .15s;display:flex;align-items:center;justify-content:center;}
.borne-opening:hover{box-shadow:inset 0 1px 0 rgba(255,255,255,0.22),0 0 0 2px #FFE03388;}
.borne-opening.sel{box-shadow:inset 0 1px 0 rgba(255,255,255,0.22),0 0 0 2px #FFE033,0 0 6px #FFE03388;}
.borne-inner{position:absolute;inset:3px;border-radius:1px;background:#171717;}
.borne-ridge-l{position:absolute;left:6px;top:50%;transform:translateY(-50%);width:3px;height:10px;border-radius:1px;background:#55514b;}
.borne-ridge-r{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:3px;height:10px;border-radius:1px;background:#55514b;}
.borne-label{position:relative;display:flex;align-items:center;justify-content:center;background:#d7d8d4;padding:0 1px;}
.borne-label::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:rgba(255,255,255,0.7);}
.borne-label::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:#8f8f8f;}
.borne-number{display:flex;align-items:center;justify-content:center;width:100%;height:100%;border:1px solid #9a9a9a;background:#f0f0ec;font-size:12px;font-weight:600;color:#151515;font-family:Arial,sans-serif;box-shadow:inset 0 1px 0 rgba(255,255,255,0.6);}
.c-info-bar{font-size:14px;color:#ccd;letter-spacing:0.5px;padding:10px 14px;background:#12121a;border:1px solid #2a2a3a;border-radius:6px;text-align:center;line-height:1.5;}
.c-info-bar.active{color:#FFE033;}
.c-section-label{font-size:11px;color:#eee;letter-spacing:4px;text-align:center;margin-bottom:4px;font-weight:600;}
.borne-module.t-52a{background:#1a2e1a;border-color:#2d6b2d;}
.borne-module.t-52a .borne-chassis,.borne-module.t-52a>.borne-zone{background:#1a2e1a;}
.borne-module.t-52b{background:#2e1a1a;border-color:#6b2d2d;}
.borne-module.t-52a .borne-label,.borne-module.t-52b .borne-label{background:#2a3a2a;}
.borne-module.t-52b .borne-label{background:#3a2a2a;}
.borne-module.t-52a .borne-number{background:#d0ecd0;color:#0a3a0a;}
.borne-module.t-52b .borne-number{background:#ecdcd0;color:#3a0a0a;}
.borne-module.t-tc{background:#1a1a2e;border-color:#2d2d6b;}
.borne-module.t-tc .borne-label{background:#2a2a3a;}
.borne-module.t-tc .borne-number{background:#d0d0ec;color:#0a0a3a;}
.borne-module.t-fc{background:#2e2a1a;border-color:#6b5a2d;}
.borne-module.t-fc .borne-label{background:#3a2f1a;}
.borne-module.t-fc .borne-number{background:#ece0c0;color:#3a2a0a;}
.bk-cmd-bar{display:flex;align-items:center;justify-content:center;gap:16px;padding:8px 16px;background:#0e0e14;border:1px solid #1e1e28;border-radius:8px;flex-wrap:wrap;}
.bk-status-pill{display:flex;align-items:center;gap:6px;font-size:10px;font-family:monospace;font-weight:700;letter-spacing:1.5px;padding:4px 10px;border-radius:12px;border:1px solid;}
.bk-status-pill.on{border-color:#22c55e44;background:#0d2a14;color:#22c55e;}
.bk-status-pill.off{border-color:#ef444444;background:#2a0d0d;color:#ef4444;}
.bk-close-campo{padding:6px 18px;border-radius:6px;font-size:11px;font-weight:800;font-family:monospace;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;border:1px solid rgba(34,197,94,.4);background:rgba(34,197,94,.1);color:#22c55e;transition:all .2s;}
.bk-close-campo:hover{background:rgba(34,197,94,.2);border-color:rgba(34,197,94,.6);}
.bk-close-campo:disabled{opacity:.3;cursor:not-allowed;}
.preset-bar{display:flex;align-items:center;gap:8px;padding:8px 16px;background:#0e0e14;border:1px solid #1e1e28;border-radius:8px;flex-wrap:wrap;}
.preset-lbl{font-size:9px;color:#444;letter-spacing:2px;font-family:monospace;}
.preset-btn{padding:4px 11px;border-radius:5px;font-size:10px;font-weight:700;font-family:monospace;letter-spacing:.8px;cursor:pointer;border:1px solid #2a2a36;background:#12121a;color:#888;transition:all .15s;}
.preset-btn:hover{background:#1e1e2a;color:#ccc;border-color:#3a3a50;}
.preset-btn.clear{border-color:rgba(248,113,113,.35);color:#f87171;background:rgba(248,113,113,.07);}
.preset-btn.clear:hover{background:rgba(248,113,113,.15);border-color:rgba(248,113,113,.55);}
.bi-led{width:8px;height:8px;border-radius:50%;background:#141418;border:1px solid #2a2a36;transition:background .2s,box-shadow .2s;flex-shrink:0;}
.bi-led.on{background:#22c55e;border-color:#16a34a;box-shadow:0 0 5px #22c55e99;}
`;

// ── SVG COMPONENTS ────────────────────────────────────────────────────────────
function CableSVG({pole,side}){
  const svgH=46,cx=19,isTerra=pole.kind==='terra';
  const cableCol=isTerra?'#43A047':pole.cable;
  const aBg=isTerra?'#1A4A1A':ANILHA_BG,aBorder=isTerra?'#2A7A2A':ANILHA_BORDER,aTxt=isTerra?'#88FF88':ANILHA_TEXT;
  const off=isTerra?0:(pole.id.endsWith('1')||['va','vb','vc'].includes(pole.id)?-3:3);
  const d=side==='top'?`M${cx+off},0 C${cx+off},${svgH*0.3} ${cx},${svgH*0.55} ${cx},${svgH}`:`M${cx},0 C${cx},${svgH*0.5} ${cx+off},${svgH*0.7} ${cx+off},${svgH}`;
  const aY=side==='top'?svgH*0.34:svgH*0.54;
  const label=side==='top'?pole.topAnilha:pole.botAnilha;
  const aw=label.length>1?14:10;
  return(
    <svg width="38" height={svgH} viewBox={`0 0 38 ${svgH}`} style={{display:'block'}}>
      <path d={d} fill="none" stroke={darken(cableCol,0.5)} strokeWidth="6" strokeLinecap="round"/>
      <path d={d} fill="none" stroke={cableCol} strokeWidth="4.5" strokeLinecap="round"/>
      <path d={d} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x={cx-aw/2} y={aY-4.5} width={aw} height="9" rx="2" fill={aBg} stroke={aBorder} strokeWidth="0.8"/>
      <text x={cx} y={aY+3.2} textAnchor="middle" fontSize="7" fontFamily="monospace" fontWeight="700" fill={aTxt}>{label}</text>
    </svg>
  );
}

function BorneCable({n,anilha,side='bot'}){
  const W=47,H=52,cx=W/2;
  const lean=(n%2===1)?-4:4;
  const d=side==='bot'
    ?`M${cx},0 C${cx},${H*0.35} ${cx+lean},${H*0.65} ${cx+lean},${H}`
    :`M${cx+lean},0 C${cx+lean},${H*0.35} ${cx},${H*0.65} ${cx},${H}`;
  const aY=side==='bot'?H*0.52:H*0.42;
  const aX=side==='bot'?cx+lean:cx+lean;
  const aw=anilha.length<=3?14:anilha.length<=5?22:28;
  return(
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block'}}>
      <path d={d} fill="none" stroke="#111" strokeWidth="7" strokeLinecap="round"/>
      <path d={d} fill="none" stroke="#2A2A2A" strokeWidth="5" strokeLinecap="round"/>
      <path d={d} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x={aX-aw/2} y={aY-5} width={aw} height="10" rx="2" fill="#FFE033" stroke="#C8A800" strokeWidth="0.8"/>
      <text x={aX} y={aY+3.5} textAnchor="middle" fontSize="6.5" fontFamily="monospace" fontWeight="700" fill="#111">{anilha}</text>
    </svg>
  );
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────
function Screw(){
  return(
    <div className="screw-chave">
      <div style={{position:'absolute',width:'55%',height:2,background:'#444',borderRadius:1}}/>
      <div style={{position:'absolute',width:2,height:'55%',background:'#444',borderRadius:1}}/>
    </div>
  );
}

function BananaChave({tid,pole,pending,onTClick,onTDbl}){
  const isSel=pending===tid;
  return(
    <div className={`banana-chave${isSel?' sel':''}`} data-tid={tid} title={tid}
      onClick={e=>{e.stopPropagation();onTClick(tid);}} onDoubleClick={e=>{e.stopPropagation();onTDbl(tid);}}>
      <div style={{width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
        background:`radial-gradient(circle at 35% 30%,${pole.body}CC,${pole.body}44 60%,#111 100%)`,border:`2px solid ${pole.body}66`}}>
        <div style={{width:10,height:10,borderRadius:'50%',background:'#080808',border:'1px solid #222'}}/>
      </div>
    </div>
  );
}

function PoleCol({pole,switchSt,onToggle,pending,onTClick,onTDbl}){
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',width:42,userSelect:'none',cursor:pole.kind==='normal'?'pointer':'default'}}
      onClick={()=>{if(pole.kind==='normal')onToggle(pole.group);}}>
      <BananaChave tid={`${pole.id}_top`} pole={pole} pending={pending} onTClick={onTClick} onTDbl={onTDbl}/>
      <Screw/>
      {pole.kind==='terra'?(
        <div className="terra-body"><div className="terra-line"/></div>
      ):(
        <div className="switch-body">
          <div className="c-rail"/>
          <div className="c-handle" style={{
            top:switchSt[pole.id]==='down'?BOT_Y:TOP_Y,
            background:`linear-gradient(90deg,${pole.dark} 0%,${pole.body} 35%,${pole.shine}88 65%,${pole.dark} 100%)`,
            border:`1.5px solid ${pole.dark}`,
            boxShadow:'inset 0 1px 3px rgba(255,255,255,0.18),0 3px 8px rgba(0,0,0,0.6)'}}>
            <div className="c-rib"/><div className="c-rib"/><div className="c-rib"/>
            <div style={{position:'absolute',top:4,left:'50%',transform:'translateX(-50%)',width:4,height:'40%',borderRadius:2,background:'rgba(255,255,255,0.2)'}}/>
          </div>
        </div>
      )}
      <Screw/>
      <BananaChave tid={`${pole.id}_bot`} pole={pole} pending={pending} onTClick={onTClick} onTDbl={onTDbl}/>
    </div>
  );
}

function BananaJack({node,pending,onTClick,onTDbl}){
  const isRed=node.color==='red';const isSel=pending===node.id;
  return(
    <div className={`banana-jack${isSel?' sel':''}`} data-tid={node.id}
      style={{background:isRed?'radial-gradient(circle at 35% 30%,#EE4444,#AA1111 60%,#660000 100%)':'radial-gradient(circle at 35% 30%,#666666,#2A2A2A 60%,#111111 100%)',
        borderColor:isRed?'#881111':'#777777'}}
      onClick={()=>onTClick(node.id)} onDoubleClick={e=>{e.stopPropagation();onTDbl(node.id);}}>
      <div className="jack-hole"/><div className="jack-shine"/>
    </div>
  );
}

function PairGroup({pair,pending,onTClick,onTDbl}){
  return(
    <div className="pair-group">
      <div className="pair-label">{pair.label}</div>
      <div style={{display:'flex',flexDirection:'row',gap:4,alignItems:'center'}}>
        <BananaJack node={pair.red} pending={pending} onTClick={onTClick} onTDbl={onTDbl}/>
        <BananaJack node={pair.blk} pending={pending} onTClick={onTClick} onTDbl={onTDbl}/>
      </div>
    </div>
  );
}

function BorneOpening({n,side,pending,onTClick,onTDbl}){
  const tid=`tb_${n}_${side}`;const isSel=pending===tid;
  return(
    <div className={`borne-opening${isSel?' sel':''}`} data-tid={tid} title={`Borne ${n} — ${side==='top'?'superior':'inferior'}`}
      onClick={()=>onTClick(tid)} onDoubleClick={e=>{e.stopPropagation();onTDbl(tid);}}>
      <div className="borne-inner"/>
      <div className="borne-ridge-l"/>
      <div className="borne-ridge-r"/>
    </div>
  );
}

function BorneModule({n,isFirst,isLast,pending,onTClick,onTDbl}){
  const t=BORNE_TYPE[n];
  return(
    <div className={`borne-module${isFirst?' first':''}${isLast?' last':''}${t?` t-${t}`:''}`}>
      <div className="borne-zone">
        <div className="borne-cap-top"/>
        <div className="borne-pin top"/>
        <div className="borne-ear-l"/>
        <div className="borne-ear-r"/>
        <BorneOpening n={n} side="top" pending={pending} onTClick={onTClick} onTDbl={onTDbl}/>
      </div>
      <div className="borne-label"><div className="borne-number">{n}</div></div>
      <div className="borne-zone bot">
        <div className="borne-ear-l bot"/>
        <div className="borne-ear-r bot"/>
        <BorneOpening n={n} side="bottom" pending={pending} onTClick={onTClick} onTDbl={onTDbl}/>
        <div className="borne-cap-bot"/>
        <div className="borne-pin bot"/>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function CampoPage({onFieldStateChange,bkStatus,onBkCommand,loadWiring}){
  const[switchSt,setSwitchSt]=useState(initSwitchState);
  const switchStRef=useRef(switchSt);
  const[connections,setConnections]=useState([]);
  const[pendingTid,setPendingTid]=useState(null);
  const[infoMsg,setInfoMsg]=useState('Clique em qualquer terminal para iniciar uma conexão — duplo clique num cabo ou terminal para desconectar');
  const[infoActive,setInfoActive]=useState(false);
  const connIdRef=useRef(0);

  // Computed electrical state — inclui contatos auxiliares 52a/52b do disjuntor
  const internalConns=useMemo(()=>[...getInternalConnections(switchSt),...getBreakerConns(bkStatus)],[switchSt,bkStatus]);
  const electricalGraph=useMemo(()=>buildElectricalGraph(connections,internalConns),[connections,internalConns]);

  // Bobina de fechamento pronta quando TB_15 e TB_16 estão no mesmo grupo elétrico
  const closeCoilWired=useMemo(()=>electricalGraph.areConnected('tb_15_top','tb_16_top'),[electricalGraph]);

  // Estado das entradas binárias da maleta (monitoramento em tempo real)
  const biMonitor=useMemo(()=>MALETA_BI.map(bi=>({id:bi.id,active:electricalGraph.areConnected(bi.posId,bi.negId)})),[electricalGraph]);

  // Notifica App.jsx sempre que o estado elétrico muda (chave, cabos ou disjuntor)
  useEffect(()=>{
    if(onFieldStateChange)onFieldStateChange({connections,internalConns,closeCoilWired,switchSt});
  },[connections,internalConns,closeCoilWired,switchSt,onFieldStateChange]);

  // Restaura cabeamento salvo (acionado por loadWiring prop do App.jsx)
  useEffect(()=>{
    if(!loadWiring)return;
    connIdRef.current=0;
    if(loadWiring.switchSt){setSwitchSt(loadWiring.switchSt);switchStRef.current=loadWiring.switchSt;}
    if(loadWiring.connections){
      const restored=loadWiring.connections.map((c,i)=>{connIdRef.current=i+1;return{id:i+1,from:c.from,to:c.to,color:cableColorFor(c.from,c.to),fresh:false};});
      setConnections(restored);
    }
  },[loadWiring]);
  const svgRef=useRef(null);
  const rootRef=useRef(null);

  const tempInfo=useCallback((msg,ms=2500)=>{
    setInfoMsg(msg);setInfoActive(true);
    setTimeout(()=>{setInfoMsg('Clique em qualquer terminal para iniciar uma conexão — duplo clique num cabo ou terminal para desconectar');setInfoActive(false);},ms);
  },[]);

  const onTClick=useCallback((tid)=>{
    setPendingTid(prev=>{
      if(!prev){
        setInfoMsg(`"${tid}" selecionado — clique no destino`);setInfoActive(true);
        return tid;
      }
      if(prev===tid){
        setInfoMsg('Clique em qualquer terminal para iniciar uma conexão — duplo clique num cabo ou terminal para desconectar');setInfoActive(false);
        return null;
      }
      const from=prev,to=tid;
      // Validar conexão antes de criar
      const check=validateConnection(from,to,switchStRef.current);
      if(!check.valid){
        tempInfo(`✗ ${check.msg}`,3500);
        return null;
      }
      const col=cableColorFor(from,to);
      connIdRef.current++;
      setConnections(c=>[...c,{id:connIdRef.current,from,to,color:col,fresh:true}]);
      tempInfo(`✓ ${from} ↔ ${to}`);
      return null;
    });
  },[tempInfo]);

  const onTDbl=useCallback((tid)=>{
    setPendingTid(null);
    setConnections(c=>{const n=c.filter(x=>x.from!==tid&&x.to!==tid);if(n.length<c.length){tempInfo('Conexões removidas');}return n;});
  },[tempInfo]);

  const onToggleGroup=useCallback((group)=>{
    setSwitchSt(prev=>{const next={...prev};const poles=CHAVE_POLES.filter(p=>p.group===group);
      const np=prev[poles[0].id]==='down'?'up':'down';poles.forEach(p=>{next[p.id]=np;});
      switchStRef.current=next;return next;});
  },[]);

  const applyPreset=useCallback((preset)=>{
    setSwitchSt(prev=>{
      const next={...prev};
      preset.switchGroups.forEach(group=>{CHAVE_POLES.filter(p=>p.group===group).forEach(p=>{next[p.id]='down';});});
      switchStRef.current=next;return next;
    });
    connIdRef.current=preset.conns.length;
    setConnections(preset.conns.map((c,i)=>({id:i+1,from:c[0],to:c[1],color:cableColorFor(c[0],c[1]),fresh:true})));
  },[]);

  // Draw SVG connections
  useEffect(()=>{
    const svg=svgRef.current;if(!svg)return;
    svg.innerHTML='';
    const root=rootRef.current;
    connections.forEach(conn=>{
      const e1=root?.querySelector(`[data-tid="${conn.from}"]`);
      const e2=root?.querySelector(`[data-tid="${conn.to}"]`);
      if(!e1||!e2)return;
      const rootRect=root.getBoundingClientRect();
      const r1=e1.getBoundingClientRect(),r2=e2.getBoundingClientRect();
      const p1={x:r1.left+r1.width/2-rootRect.left,y:r1.top+r1.height/2-rootRect.top};
      const p2={x:r2.left+r2.width/2-rootRect.left,y:r2.top+r2.height/2-rootRect.top};
      const bend=Math.max(30,Math.abs(p2.y-p1.y)*0.38+Math.abs(p2.x-p1.x)*0.12);
      const d=`M${p1.x},${p1.y} C${p1.x},${p1.y+bend} ${p2.x},${p2.y-bend} ${p2.x},${p2.y}`;
      const col=conn.color;
      // Hit area
      const hit=document.createElementNS('http://www.w3.org/2000/svg','path');
      hit.setAttribute('d',d);hit.setAttribute('fill','none');hit.setAttribute('stroke','transparent');hit.setAttribute('stroke-width','18');
      hit.style.pointerEvents='stroke';hit.style.cursor='pointer';
      const cid=conn.id;
      hit.ondblclick=()=>{setConnections(c=>c.filter(x=>x.id!==cid));tempInfo('Conexão removida');};
      svg.appendChild(hit);
      // Cable layers
      [[darken(col,0.48),7],[col,5],['rgba(255,255,255,0.15)',2]].forEach(([stroke,sw])=>{
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d',d);path.setAttribute('fill','none');path.setAttribute('stroke',stroke);path.setAttribute('stroke-width',String(sw));path.setAttribute('stroke-linecap','round');
        if(conn.fresh){path.style.strokeDasharray='900';path.style.strokeDashoffset='900';
          requestAnimationFrame(()=>{path.style.transition='stroke-dashoffset 0.38s ease';path.style.strokeDashoffset='0';});}
        svg.appendChild(path);
      });
      conn.fresh=false;
    });
  },[connections,tempInfo]);

  // Redraw on resize
  useEffect(()=>{
    const h=()=>{setConnections(c=>[...c]);};
    window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h);
  },[]);

  // Build pole groups with separators
  const poleElements=[];
  CHAVE_POLES.forEach((pole,idx)=>{
    if(idx>0&&pole.group!==CHAVE_POLES[idx-1].group){
      poleElements.push({type:'sep',key:`sep-${idx}`});
    }
    poleElements.push({type:'pole',pole,key:pole.id});
  });

  return(<>
    <style>{campoCSS}</style>
    <div className="campo-root" ref={rootRef} style={{position:'relative'}}>
      <svg ref={svgRef} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:100}}/>

      {/* RÉGUA DE BORNES */}
      <div style={{width:'100%',maxWidth:900,display:'flex',flexDirection:'column',alignItems:'center'}}>
        <div className="c-section-label">RÉGUA DE BORNES</div>
        <div style={{display:'flex',alignItems:'flex-end',marginLeft:12}}>
          {Array.from({length:16},(_,i)=><BorneCable key={i+1} n={i+1} anilha={BORNE_ANILHAS[i]} side="top"/>)}
        </div>
        <div className="borne-wrap">
          <div className="borne-arrow-l"/>
          <div className="borne-chassis">
            {Array.from({length:16},(_,i)=><BorneModule key={i+1} n={i+1} isFirst={i===0} isLast={i===15} pending={pendingTid} onTClick={onTClick} onTDbl={onTDbl}/>)}
          </div>
          <div className="borne-arrow-r"/>
        </div>
      </div>

      {/* DISJUNTOR — estado + comando de fechamento via bobina FC */}
      <div style={{width:'100%',maxWidth:900}}>
        <div className="bk-cmd-bar">
          <div className={`bk-status-pill ${bkStatus?.state==='closed'?'on':'off'}`}>52a {bkStatus?.state==='closed'?'ON':'OFF'}</div>
          <div className={`bk-status-pill ${bkStatus?.state!=='closed'?'on':'off'}`}>52b {bkStatus?.state!=='closed'?'ON':'OFF'}</div>
          <div style={{fontSize:10,fontFamily:'monospace',color:'#555',letterSpacing:1}}>
            {closeCoilWired?'⚡ FC LIGADA':'FC desligada'}
          </div>
          <button className="bk-close-campo"
            disabled={!closeCoilWired||bkStatus?.state==='closed'||!bkStatus?.spring}
            title={!closeCoilWired?'Ligue a bobina FC (TB15-TB16)':!bkStatus?.spring?'Mola não carregada':bkStatus?.state==='closed'?'Disjuntor já fechado':'Fechar disjuntor'}
            onClick={()=>onBkCommand?.('close')}>
            I FECHAR CB
          </button>
        </div>
      </div>

      {/* PREDEFINIÇÕES + LIMPAR CABOS */}
      <div style={{width:'100%',maxWidth:900}}>
        <div className="preset-bar">
          <span className="preset-lbl">PREDEFINIÇÕES</span>
          {WIRING_PRESETS.map(p=><button key={p.id} className="preset-btn" onClick={()=>applyPreset(p)}>{p.label}</button>)}
          <div style={{flex:1}}/>
          <button className="preset-btn clear" onClick={()=>setConnections([])}>Limpar Cabos</button>
        </div>
      </div>

      {/* MALETA DE TESTE + INFO BAR */}
      <div style={{width:'100%',maxWidth:900,display:'flex',flexDirection:'column',alignItems:'center',position:'relative'}}>
        <div className="c-section-label">MALETA DE TESTE</div>
        <div className="maleta" style={{width:'100%'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}><div className="maleta-latch"/><div className="maleta-latch"/></div>
          <div className="section-row" style={{marginBottom:8}}>
            <div style={{display:'flex',alignItems:'stretch',width:'100%'}}>
              <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}>
                <div className="section-title" style={{marginBottom:8}}>SAÍDA BINÁRIA</div>
                <div style={{display:'flex',justifyContent:'space-evenly',width:'100%'}}>
                  {BO_PAIRS.map(p=><PairGroup key={p.label} pair={p} pending={pendingTid} onTClick={onTClick} onTDbl={onTDbl}/>)}
                </div>
              </div>
              <div className="v-divider"/>
              <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}>
                <div className="section-title" style={{marginBottom:8}}>ENTRADA BINÁRIA</div>
                <div style={{display:'flex',justifyContent:'space-evenly',width:'100%'}}>
                  {BI_PAIRS.map((p,i)=>(
                    <div key={p.label} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                      <div className={`bi-led${biMonitor[i]?.active?' on':''}`} title={`${p.label}: ${biMonitor[i]?.active?'ATIVO':'inativo'}`}/>
                      <PairGroup pair={p} pending={pendingTid} onTClick={onTClick} onTDbl={onTDbl}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="section-row">
            <div className="section-title">SAÍDAS ANALÓGICAS</div>
            <div style={{display:'flex',alignItems:'stretch',width:'100%'}}>
              <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}>
                <div className="subsection-label">CORRENTE</div>
                <div style={{display:'flex',justifyContent:'space-evenly',width:'100%'}}>
                  {AO_I.map(p=><PairGroup key={p.label} pair={p} pending={pendingTid} onTClick={onTClick} onTDbl={onTDbl}/>)}
                </div>
              </div>
              <div className="v-divider"/>
              <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}>
                <div className="subsection-label">TENSÃO</div>
                <div style={{display:'flex',justifyContent:'space-evenly',width:'100%'}}>
                  {AO_V.map(p=><PairGroup key={p.label} pair={p} pending={pendingTid} onTClick={onTClick} onTDbl={onTDbl}/>)}
                </div>
              </div>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:10}}><div className="maleta-latch"/><div className="maleta-latch"/></div>
        </div>
        <div style={{position:'absolute',right:-185,top:'50%',transform:'translateY(-50%)',width:170}}>
          <div className={`c-info-bar${infoActive?' active':''}`}>{infoMsg}</div>
        </div>
      </div>

      {/* CHAVE DE AFERIÇÃO */}
      <div style={{width:'100%',maxWidth:900,display:'flex',flexDirection:'column',alignItems:'center'}}>
        <div className="c-section-label">CHAVE DE AFERIÇÃO</div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'center',gap:6,padding:'0 4px'}}>
          {poleElements.map(e=>e.type==='sep'?<div key={e.key} style={{width:1,background:'transparent',margin:'0 2px'}}/>:
            <div key={e.key} style={{width:42,display:'flex',justifyContent:'center'}}><CableSVG pole={e.pole} side="top"/></div>)}
        </div>
        <div className="poles-row">
          {poleElements.map(e=>e.type==='sep'?<div key={e.key} className="c-sep"/>:
            <PoleCol key={e.key} pole={e.pole} switchSt={switchSt} onToggle={onToggleGroup} pending={pendingTid} onTClick={onTClick} onTDbl={onTDbl}/>)}
        </div>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'center',gap:6,padding:'0 4px'}}>
          {poleElements.map(e=>e.type==='sep'?<div key={e.key} style={{width:1,background:'transparent',margin:'0 2px'}}/>:
            <div key={e.key} style={{width:42,display:'flex',justifyContent:'center'}}><CableSVG pole={e.pole} side="bot"/></div>)}
        </div>
      </div>
    </div>
  </>);
}
