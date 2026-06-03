(function(){
'use strict';
const $=id=>document.getElementById(id), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const val=id=>{const e=$(id); const n=parseFloat(String(e?.value??'').replace(',','.')); return Number.isFinite(n)?n:0};
const valid=n=>Number.isFinite(n)&&!Number.isNaN(n);
const str=id=>String($(id)?.value??'');
const setVal=(id,v,markAuto=false)=>{const e=$(id); if(!e)return; if(typeof v==='number'&&!valid(v)){e.value=''; e.dataset.error='1';} else {e.value=(typeof v==='number')?round(v,4):v; delete e.dataset.error;} if(markAuto){e.dataset.state=e.dataset.forced==='1'?'manual':'auto'; paintField(e)}};
const setAuto=(id,v,recalcAutos=false)=>{const e=$(id); if(!e)return; if(recalcAutos || e.dataset.forced!=='1') setVal(id,v,true);};
const round=(n,d=2)=>{const p=Math.pow(10,d);return Math.round((n+Number.EPSILON)*p)/p};
const fmt=(n,d=2,u='')=>Number.isFinite(n)?n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+(u?' '+u:''):'-';
const row=(...c)=>'<tr>'+c.map(x=>`<td>${x}</td>`).join('')+'</tr>';

let trafosV507=[
  {ativo:true,tag:'TRF01',tipo:'Seco',kva:500,z:5.28,ligacao:'Dyn1',mult:8,hhMode:'sem',hhFuse:0}
];
function fatorDefaultTrafoV507(tipo){return String(tipo||'').toLowerCase().includes('óleo')||String(tipo||'').toLowerCase().includes('oleo')?6:8}

const PHILOSOPHY_LIBRARY_V635={
  neoenergia:{label:'Neoenergia / DIS-NOR-036',note:'51F em 1,30 x demanda; neutro tipicamente em 20% da fase; 51NS conforme exigência da distribuidora.',fields:{base51:'demanda',mult51:1.30,modo50:'auto',margem50:1.30,inrush50FSource:'maiorMaisDemais',modo51n:'pct51',pct51n:20,modo50n:'pct50',pct50n:20,modo51ns:'autoFaixa',curva51ns:'TD',p51ns:6,t51ns:1,modo59:'pct',v59:120,t59:.5,modo47:'pct',v47:25,t47:.2}},
  cemig:{label:'CEMIG / ND 5.3',note:'51F em 1,05 x demanda; 51N e 50N sugeridas em 1/3 da correspondente de fase.',fields:{base51:'demanda',mult51:1.05,modo50:'auto',margem50:1.20,inrush50FSource:'maiorMaisDemais',modo51n:'terco51',pct51n:33.33,modo50n:'terco50',pct50n:33.33,modo51ns:'desligado'}},
  energisa:{label:'Energisa / NDU-002',note:'51F em 1,25 x demanda; 50F referenciado no inrush real; neutro em 20% da fase.',fields:{base51:'demanda',mult51:1.25,modo50:'auto',margem50:1.05,inrushMethod:'real',inrush50FSource:'real',inrush50NSource:'residual',modo51n:'pct51',pct51n:20,modo50n:'pct50',pct50n:20,modo51ns:'autoFaixa'}},
  mesh:{label:'Mesh / modelo geral de coordenograma',note:'51F = 1,30 x demanda; 50F = 1,30 x inrush; 51N/50N em 20%; 51NS com faixa 3 a 6 A.',fields:{base51:'demanda',mult51:1.30,modo50:'auto',margem50:1.30,inrushMethod:'maiorMaisDemais',inrush50FSource:'maiorMaisDemais',inrush50NSource:'residual',modo51n:'pct51',pct51n:20,modo50n:'pct50',pct50n:20,modo51ns:'inversa',p51ns:6,curva51ns:'MI',t51ns:1,modo59:'pct',v59:120,t59:.5,modo47:'pct',v47:25,t47:.2}},
  rele:{label:'Relé manual / ordem de ajuste',note:'Valores informados diretamente conforme a ordem de ajustes do equipamento; cálculos automáticos ficam como conferência.',fields:{base51:'manual',modo50:'manual',modo51n:'manual',modo50n:'manual',modo51ns:'manual'}},
  livre:{label:'Engenharia livre',note:'Sem imposição automática de filosofia. Use fórmulas, curva e validação gráfica conforme memorial técnico.',fields:{}}
};
function filosofiaAtualV635(){return PHILOSOPHY_LIBRARY_V635[str('protectionPhilosophy')]||PHILOSOPHY_LIBRARY_V635.mesh}
function renderPhilosophyV635(){
  const p=filosofiaAtualV635(), hint=$('philosophyHint'); if(!hint)return;
  hint.innerHTML=`<b>${p.label}</b>${p.note}<br><span class="presetRange">Sugestão editável:</span> o preset nunca substitui a validação técnica nem os dados reais da concessionária.`;
}
function applyPhilosophyPresetV635(){
  const p=filosofiaAtualV635();
  Object.entries(p.fields).forEach(([id,value])=>{
    const e=$(id); if(!e)return;
    e.value=value; delete e.dataset.forced; e.dataset.state='auto'; paintField(e);
  });
  renderPhilosophyV635();
  calcular(true); updateProgress();
}

function hhPadroesV514(){return [6,10,16,20,25,31.5,40,50,63,80,100,125,160,200]}
function nextHHPadraoV514(I){const arr=hhPadroesV514(); return arr.find(x=>x>=I)||arr[arr.length-1]}
function hhSugestaoV514(inAT,fator=1.5){return nextHHPadraoV514(Math.max(inAT||0,0)*Math.max(fator||1.5,1))}
function fusePresetV514(type){
  const n=parseFloat(String(type||'65K').replace('K',''));
  const base=Number.isFinite(n)&&n>0?n:65;
  // Parâmetros didáticos aproximados para a família K; operador pode editar.
  return {base,t2:18,exp:2.05,min:.45,max:1.35};
}
function applyFusePresetV514(force=false){
  const mode=str('coordFuseMode')||'selecionado';
  const type=str('coordFuseType')||'65K';
  if(mode==='manual') return;
  if(mode==='auto') return; // autoFuseMontanteV513 cuida da seleção sugerida
  const p=fusePresetV514(type);
  if(type!=='manual' || force){
    setVal('coordFuseManual',p.base,true);
    setVal('fuseT2',p.t2,true);
    setVal('fuseExp',p.exp,true);
    setVal('fuseMinScale',p.min,true);
    setVal('fuseMaxScale',p.max,true);
    setVal('fuseAutoCrit',`Elo ${type} selecionado. Parâmetros TCC aproximados atualizados automaticamente e editáveis pelo operador.`,true);
  }
}

function ansiMultiplierFromZ(z){
  const zn=Number(z);
  return zn>0 ? 100/zn : NaN;
}
function ansiTimeTableV620(){
  return [
    {z:4,k:25,t:2},
    {z:5,k:20,t:3},
    {z:6,k:16.67,t:4.5},
    {z:7,k:14.29,t:6.13},
    {z:8,k:12.5,t:8},
    {z:10,k:10,t:12.5}
  ];
}
function ansiDamageTimeFromZ(z){
  const zn=Number(z);
  if(!(zn>0)) return NaN;
  const table=ansiTimeTableV620();
  const nearest=table.reduce((best,row)=>Math.abs(row.z-zn)<Math.abs(best.z-zn)?row:best,table[0]);
  return nearest.t;
}
function nansiFactorFromLigacao(ligacao){
  const txt=String(ligacao||'').toLowerCase();
  return /dyn|delta|d/.test(txt) ? 0.58 : 0.58;
}
function ansiNansiFromTrafo(inAT,z,ligacao){
  const mult=ansiMultiplierFromZ(z);
  const tempo=ansiDamageTimeFromZ(z);
  const ansi=Number.isFinite(mult)&&inAT>0 ? inAT*mult : NaN;
  const nansi=Number.isFinite(ansi) ? ansi*nansiFactorFromLigacao(ligacao) : NaN;
  return {ansiMult:mult,nansiMult:Number.isFinite(mult)?mult*nansiFactorFromLigacao(ligacao):NaN,ansi,nansi,ansiTempo:tempo,nansiTempo:tempo};
}

function trafoCalcV507(t,kvRef){
  const kva=Number(t.kva)||0, kv=kvRef||val('kv'), mult=Number(t.mult)||fatorDefaultTrafoV507(t.tipo);
  const inAT=kv>0?kva/(Math.sqrt(3)*kv):NaN;
  const zn=Number(t.z)||val('ztrafo');
  const an=ansiNansiFromTrafo(inAT,zn,t.ligacao);
  const ansi=Number.isFinite(an.ansi)?an.ansi:inAT*val('ansiMult');
  const nansi=Number.isFinite(an.nansi)?an.nansi:inAT*val('nansiMult');
  return {...t,kva,mult,inAT,inrush:inAT*mult,ansi,nansi,ansiMult:an.ansiMult,nansiMult:an.nansiMult,ansiTempo:an.ansiTempo,nansiTempo:an.nansiTempo};
}
function trafosAtivosV507(){
  return trafosV507.filter(t=>t&&t.ativo!==false&&(Number(t.kva)||0)>0).slice(0,10);
}
function calcTrafosV507(){
  const kvRef=val('kv'), ativos=trafosAtivosV507().map(t=>trafoCalcV507(t,kvRef));
  if(!ativos.length) return null;
  const kvaTotal=ativos.reduce((s,t)=>s+t.kva,0);
  const inTotal=ativos.reduce((s,t)=>s+(Number.isFinite(t.inAT)?t.inAT:0),0);
  const maior=ativos.slice().sort((a,b)=>b.kva-a.kva)[0];
  const menor=ativos.slice().sort((a,b)=>a.kva-b.kva)[0];
  const maiorInrush=ativos.slice().sort((a,b)=>b.inrush-a.inrush)[0];
  const somaInrush=ativos.reduce((s,t)=>s+(Number.isFinite(t.inrush)?t.inrush:0),0);
  const demaisNominais=ativos.filter(t=>t!==maiorInrush).reduce((s,t)=>s+(Number.isFinite(t.inAT)?t.inAT:0),0);
  const fatorEq=Number(val('inrushMult'))||8;
  const inrushParcial=maiorInrush.inrush+demaisNominais;
  const inrushManual=val('inrushManualAssoc')>0?val('inrushManualAssoc'):maiorInrush.inrush;
  const icc3f=val('icc3f');
  const inrushReal=icc3f>0&&inrushParcial>0?1/((1/icc3f)+(1/inrushParcial)):inrushParcial;
  const inrushResidual=inrushReal*Math.max(val('inrushResidualFactor')||.20,0);
  const inrushValores={maior:maiorInrush.inrush,maiorMaisDemais:inrushParcial,somaInrush,potenciaTotal:inTotal*fatorEq,manual:inrushManual,real:inrushReal,residual:inrushResidual};
  const metodo=str('inrushMethod')||'maiorMaisDemais';
  let inrushTotal=inrushValores[metodo]||maiorInrush.inrush, metodoTxt='Método 1 — inrush do maior transformador';
  if(metodo==='maiorMaisDemais'){metodoTxt='Método 2 — maior inrush + In dos demais'}
  else if(metodo==='somaInrush'){inrushTotal=somaInrush; metodoTxt='Método 3 — soma dos inrush individuais'}
  else if(metodo==='potenciaTotal'){inrushTotal=inTotal*fatorEq; metodoTxt='Método 4 — potência total equivalente'}
  else if(metodo==='manual'){metodoTxt='Método 5 — valor manual informado'}
  else if(metodo==='real'){metodoTxt='Método 6 — inrush real limitado pela Icc 3F'}
  else if(metodo==='residual'){metodoTxt='Método 7 — inrush residual'}
  const zEq=ativos.reduce((s,t)=>s+(Number(t.z)||0)*t.kva,0)/Math.max(kvaTotal,1);
  const refMode=str('ansiRefMode')||'maior';
  let ref=maior;
  if(refMode==='menor') ref=menor;
  else if(refMode==='total'){
    const an=ansiNansiFromTrafo(inTotal,zEq,ativos[0]?.ligacao||'Dyn1');
    ref={tag:'TOTAL',ansi:an.ansi,nansi:an.nansi,ansiMult:an.ansiMult,nansiMult:an.nansiMult,ansiTempo:an.ansiTempo,nansiTempo:an.nansiTempo,inAT:inTotal,kva:kvaTotal};
  }
  else if(refMode==='selecionado') ref=ativos.find(t=>t.tag===str('ansiRefTag'))||maior;
  const tipoEq=ativos.some(t=>String(t.tipo).toLowerCase().includes('seco'))?'Seco':'Óleo';
  return {ativos:ativos.length,lista:ativos,kvaTotal,inTotal,maior,menor,maiorInrush,demaisNominais,somaInrush,inrushParcial,inrushReal,inrushResidual,inrushValores,inrushTotal,metodoTxt,ansiRef:ref.ansi,nansiRef:ref.nansi,ansiMultRef:ref.ansiMult,nansiMultRef:ref.nansiMult,ansiTempoRef:ref.ansiTempo,nansiTempoRef:ref.nansiTempo,refTag:ref.tag,zEq,tipoEq};
}
function inrushSelecionadoV635(multi,id,fallback='maiorMaisDemais'){
  if(!multi)return val('inrush');
  const key=str(id)||fallback;
  return multi.inrushValores[key]||multi.inrushValores[fallback]||multi.inrushTotal;
}

function fusePadroesV513(){return [15,25,40,50,65,80,100,140,200]}
function nextFusePadraoV513(I){const arr=fusePadroesV513(); const v=arr.find(x=>x>=I); return v||arr[arr.length-1]}
function autoFuseMontanteV513(d){
  const baseLoad=Math.max(d?.inAT||0,d?.iDem||0);
  const fator=Math.max(val('fuseSizingFactor')||1.5,1);
  const alvo=baseLoad*fator;
  const elo=nextFusePadraoV513(alvo);
  const mode=str('coordFuseMode')||'selecionado';
  if(mode==='auto'){
    setVal('coordFuseType',elo+'K',true);
    setVal('coordFuseManual',elo,true);
    setVal('coordFuseLabel','Fusível montante',true);
    setVal('equipMontante','Elo fusível '+elo+'K sugerido automaticamente',true);
    const p=fusePresetV514(elo+'K');
    setVal('fuseT2',p.t2,true); setVal('fuseExp',p.exp,true); setVal('fuseMinScale',p.min,true); setVal('fuseMaxScale',p.max,true);
    const crit=`Sugestão: elo ${elo}K = próxima corrente padronizada >= ${fmt(alvo,1,'A')} (${fmt(baseLoad,2,'A')} × ${fator.toFixed(2)}).`;
    setVal('fuseAutoCrit',crit,true);
  } else if(mode==='selecionado') {
    applyFusePresetV514(false);
    if(!str('fuseAutoCrit')) setVal('fuseAutoCrit','Elo selecionado pelo operador/concessionária. Parâmetros TCC atualizados pelo tipo escolhido e editáveis.',true);
  } else {
    setVal('fuseAutoCrit','Modo manual livre: operador/concessionária define corrente e parâmetros TCC.',true);
  }
}

function updateAnsiRefTagsV507(){
  const sel=$('ansiRefTag'); if(!sel) return;
  const current=sel.value || 'TRF01';
  sel.replaceChildren();
  trafosV507.slice(0,10).forEach(t=>{
    const opt=document.createElement('option');
    opt.value=String(t.tag??'');
    opt.textContent=String(t.tag??'');
    sel.appendChild(opt);
  });
  sel.value=trafosV507.some(t=>t.tag===current)?current:(trafosV507[0]?.tag||'');
}
function renderTrafosV507(){
  updateAnsiRefTagsV507();
  const body=$('trafosBody'); if(!body) return;
  const kvRef=val('kv')||13.8;
  const escAttr=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  body.innerHTML=trafosV507.slice(0,10).map((t,i)=>{
    const c=trafoCalcV507(t,kvRef);
    const tag=escAttr(t.tag||('TRF'+String(i+1).padStart(2,'0')));
    const ligacao=escAttr(t.ligacao||'Dyn1');
    return `<tr>
      <td><input type="checkbox" ${t.ativo!==false?'checked':''} onchange="window.setTrafoV507(${i},'ativo',this.checked)"></td>
      <td><input value="${tag}" onchange="window.setTrafoV507(${i},'tag',this.value)"></td>
      <td><select onchange="window.setTrafoV507(${i},'tipo',this.value)"><option ${t.tipo==='Seco'?'selected':''}>Seco</option><option ${t.tipo==='Óleo'?'selected':''}>Óleo</option></select></td>
      <td><input type="number" step="1" value="${Number(t.kva)||0}" onchange="window.setTrafoV507(${i},'kva',this.value)"></td>
      <td><input type="number" step="0.01" value="${Number(t.z)||0}" onchange="window.setTrafoV507(${i},'z',this.value)"></td>
      <td><input value="${ligacao}" onchange="window.setTrafoV507(${i},'ligacao',this.value)"></td>
      <td><input type="number" step="0.1" value="${Number(t.mult)||fatorDefaultTrafoV507(t.tipo)}" onchange="window.setTrafoV507(${i},'mult',this.value)"></td>
      <td>${fmt(c.inAT,2,'A')}</td><td>${fmt(c.inrush,1,'A')}</td><td>${fmt(c.ansi,1,'A')}</td><td>${fmt(c.nansi,1,'A')}</td>
      <td>
        <select onchange="window.setTrafoV507(${i},'hhMode',this.value)" title="Fusível HH do transformador">
          <option value="sem" ${(!t.hhMode||t.hhMode==='sem')?'selected':''}>Sem HH</option>
          <option value="auto" ${t.hhMode==='auto'?'selected':''}>HH auto</option>
          <option value="manual" ${t.hhMode==='manual'?'selected':''}>HH manual</option>
        </select>
        <input type="number" step="0.5" value="${Number(t.hhFuse)||hhSugestaoV514(c.inAT,1.5)}" onchange="window.setTrafoV507(${i},'hhFuse',this.value)" style="margin-top:6px" title="Corrente nominal do fusível HH (A)">
      </td>
      <td><button class="secondary miniBtn" onclick="window.dupTrafoV507(${i})" type="button">Duplicar</button> <button class="danger miniBtn" onclick="window.delTrafoV507(${i})" type="button">Excluir</button></td>
    </tr>`;
  }).join('');
  const s=calcTrafosV507();
  const resumo=$('trafosResumo');
  if(resumo && s){
    resumo.innerHTML=[
      ['Transformadores ativos',s.ativos,'unidades consideradas na associação'],
      ['Potência total ativa',fmt(s.kvaTotal,0,'kVA'),'soma das potências ativas'],
      ['In AT total',fmt(s.inTotal,2,'A'),'corrente nominal total no primário'],
      ['Inrush plotado',fmt(s.inrushTotal,1,'A'),s.metodoTxt],
      ['Inrush parcial',fmt(s.inrushParcial,1,'A'),'maior inrush + In dos demais'],
      ['Inrush real',fmt(s.inrushReal,1,'A'),'limitado pela Icc 3F'],
      ['Inrush residual',fmt(s.inrushResidual,1,'A'),'residual selecionável para neutro'],
      ['ANSI referência',fmt(s.ansiRef,1,'A'),`${s.refTag} — fase`],
      ['NANSI referência',fmt(s.nansiRef,1,'A'),`${s.refTag} — neutro/terra`]
    ].map(k=>`<div class="bigResult"><b>${k[0]}</b><div class="value">${k[1]}</div><div class="subv">${k[2]||''}</div></div>`).join('');
    const txt=$('txtMetodoInrush'); if(txt) txt.textContent=s.metodoTxt+` = ${fmt(s.inrushTotal,1,'A')}`;
  }
}
function applyTrafosResumoV507(recalc=true){
  const s=calcTrafosV507(); if(!s) return;
  setVal('kva',s.kvaTotal,true); setVal('ztrafo',s.zEq,true); setVal('tipoTrafo',s.tipoEq,true);
  setAuto('ansiMult',s.ansiMultRef,true); setAuto('nansiMult',s.nansiMultRef,true);
  setAuto('ansiTempo',s.ansiTempoRef,true); setAuto('nansiTempo',s.nansiTempoRef,true);
  setAuto('inrush',s.inrushTotal,true); setAuto('ansi',s.ansiRef,true); setAuto('nansi',s.nansiRef,true);
  if(recalc) calcular(true);
}
window.setTrafoV507=function(i,k,v){
  if(!trafosV507[i]) return;
  if(['kva','z','mult','hhFuse'].includes(k)) v=Number(String(v).replace(',','.'))||0;
  trafosV507[i][k]=v;
  if(k==='tipo' && !(Number(trafosV507[i].mult)>0)) trafosV507[i].mult=fatorDefaultTrafoV507(v);
  if(k==='hhMode' && v==='auto'){const c=trafoCalcV507(trafosV507[i],val('kv')||13.8); trafosV507[i].hhFuse=hhSugestaoV514(c.inAT,1.5);}
  renderTrafosV507(); calcular(true);
};
window.delTrafoV507=function(i){ if(trafosV507.length<=1) return; trafosV507.splice(i,1); renderTrafosV507(); calcular(true); };
window.dupTrafoV507=function(i){ if(trafosV507.length>=10) return alert('Limite de 10 transformadores atingido.'); const b={...trafosV507[i]}; b.tag='TRF'+String(trafosV507.length+1).padStart(2,'0'); trafosV507.push(b); renderTrafosV507(); calcular(true); };
function addTrafoV507(){ if(trafosV507.length>=10) return alert('Limite de 10 transformadores atingido.'); const n=trafosV507.length+1; trafosV507.push({ativo:true,tag:'TRF'+String(n).padStart(2,'0'),tipo:'Seco',kva:500,z:5.75,ligacao:'Dyn1',mult:8,hhMode:'sem',hhFuse:0}); renderTrafosV507(); calcular(true); }
function syncTrafosFromMainV507(){
  if(trafosV507.length===1 && Number(trafosV507[0].kva)===500){
    trafosV507[0]={ativo:true,tag:'TRF01',tipo:str('tipoTrafo')||'Seco',kva:val('kva')||500,z:val('ztrafo')||5.28,ligacao:str('ligacao')||'Dyn1',mult:val('inrushMult')||8,hhMode:'sem',hhFuse:0};
  }
  renderTrafosV507();
}

let PARAM_ROWS=[];
const curvaNome=c=>({NI:'IEC Normal Inversa',MI:'IEC Muito Inversa',VI:'IEC Muito Inversa',EI:'IEC Extremamente Inversa',LTI:'IEC Long Time Inverse',TD:'Tempo definido'}[c]||c);
function normCurve360(c){return String(c||'').trim().toUpperCase()}
function curvaNome360(c){const k=normCurve360(c);const nomes={TD:'Tempo Definido',NI:'C1 / NI - IEC Normal Inversa',MI:'C2 / MI / VI - IEC Muito Inversa',VI:'C2 / MI / VI - IEC Muito Inversa',EI:'C3 / EI - IEC Extremamente Inversa',LTI:'C4 / LTI - IEC Longa Inversa',STI:'C5 / STI - IEC Curta Inversa',C1:'C1 / NI - IEC Normal Inversa',C2:'C2 / MI / VI - IEC Muito Inversa',C3:'C3 / EI - IEC Extremamente Inversa',C4:'C4 / LTI - IEC Longa Inversa',C5:'C5 / STI - IEC Curta Inversa',U1:'SEL/IEEE U1 - Moderately Inverse',U2:'SEL/IEEE U2 - Inverse',U3:'SEL/IEEE U3 - Very Inverse',U4:'SEL/IEEE U4 - Extremely Inverse',U5:'SEL/IEEE U5 - Short-Time Inverse'};return nomes[k]||String(c||'-')}
function tTCC(c,M,dial){const k=normCurve360(c); if(k==='TD') return dial; if(!(M>1)||!(dial>0)) return Infinity; const IEC={NI:{a:.02,b:.14},C1:{a:.02,b:.14},MI:{a:1,b:13.5},VI:{a:1,b:13.5},C2:{a:1,b:13.5},EI:{a:2,b:80},C3:{a:2,b:80},LTI:{a:1,b:120},C4:{a:1,b:120},STI:{a:.04,b:.05},C5:{a:.04,b:.05}}; const IEEE={U1:{A:.0226,B:.0104,P:.02},U2:{A:.18,B:5.95,P:2},U3:{A:.0963,B:3.88,P:2},U4:{A:.02434,B:5.64,P:2},U5:{A:.00262,B:.00342,P:.02}}; if(IEC[k]){const q=IEC[k],den=Math.pow(M,q.a)-1;return den>0?dial*q.b/den:Infinity} if(IEEE[k]){const q=IEEE[k],den=Math.pow(M,q.P)-1;return den>0?dial*(q.A+q.B/den):Infinity} return Infinity;}

function tIEC(c,M,tms){return tTCC(c,M,tms)}

// ===== v6.4.9 R13 — ENGINE CURVAS PRO: biblioteca, início/fim auditável e geração log-log =====
const FL_APP_VERSION='v1.0';
const FL_FILE_TAG='v1_0';
const FL_CURVE_ENGINE_VERSION='Coordenograma Engine Curvas Pro';
const DEFAULT_START_FACTOR_IDMT=1.01;
function coordStartFactor64(){
  const n=Number(String(document.getElementById('coordStartFactor')?.value||DEFAULT_START_FACTOR_IDMT).replace(',','.'));
  return Number.isFinite(n)&&n>1?n:DEFAULT_START_FACTOR_IDMT;
}
const CURVE_LIBRARY64={
  NI:{family:'IEC',k:.14,alpha:.02,formula:'t = TMS × k / (M^α − 1)',name:'IEC Normal Inversa'},
  C1:{family:'IEC',k:.14,alpha:.02,formula:'t = TMS × k / (M^α − 1)',name:'C1 / IEC Normal Inversa'},
  MI:{family:'IEC',k:13.5,alpha:1,formula:'t = TMS × k / (M^α − 1)',name:'IEC Muito Inversa'},
  VI:{family:'IEC',k:13.5,alpha:1,formula:'t = TMS × k / (M^α − 1)',name:'IEC Muito Inversa'},
  C2:{family:'IEC',k:13.5,alpha:1,formula:'t = TMS × k / (M^α − 1)',name:'C2 / IEC Muito Inversa'},
  EI:{family:'IEC',k:80,alpha:2,formula:'t = TMS × k / (M^α − 1)',name:'IEC Extremamente Inversa'},
  C3:{family:'IEC',k:80,alpha:2,formula:'t = TMS × k / (M^α − 1)',name:'C3 / IEC Extremamente Inversa'},
  LTI:{family:'IEC',k:120,alpha:1,formula:'t = TMS × k / (M^α − 1)',name:'IEC Long Time Inverse'},
  C4:{family:'IEC',k:120,alpha:1,formula:'t = TMS × k / (M^α − 1)',name:'C4 / IEC Long Time Inverse'},
  STI:{family:'IEC',k:.05,alpha:.04,formula:'t = TMS × k / (M^α − 1)',name:'IEC Short Time Inverse'},
  C5:{family:'IEC',k:.05,alpha:.04,formula:'t = TMS × k / (M^α − 1)',name:'C5 / IEC Short Time Inverse'},
  U1:{family:'SEL/IEEE',A:.0226,B:.0104,P:.02,formula:'t = TD × (A + B/(M^P − 1))',name:'SEL/IEEE U1 Moderately Inverse'},
  U2:{family:'SEL/IEEE',A:.18,B:5.95,P:2,formula:'t = TD × (A + B/(M^P − 1))',name:'SEL/IEEE U2 Inverse'},
  U3:{family:'SEL/IEEE',A:.0963,B:3.88,P:2,formula:'t = TD × (A + B/(M^P − 1))',name:'SEL/IEEE U3 Very Inverse'},
  U4:{family:'SEL/IEEE',A:.02434,B:5.64,P:2,formula:'t = TD × (A + B/(M^P − 1))',name:'SEL/IEEE U4 Extremely Inverse'},
  U5:{family:'SEL/IEEE',A:.00262,B:.00342,P:.02,formula:'t = TD × (A + B/(M^P − 1))',name:'SEL/IEEE U5 Short-Time Inverse'},
  TD:{family:'Tempo definido',formula:'t = tempo ajustado',name:'Tempo definido'}
};
function curveInfo64(curva){const k=normCurve360(curva);return CURVE_LIBRARY64[k]||{family:'Desconhecida',formula:'-',name:String(curva||'-')}}
function generateLogPoints64(start,stop,n=720){
  const out=[]; if(!(start>0&&stop>start)) return out;
  for(let i=0;i<n;i++) out.push(start*Math.pow(stop/start,i/(n-1)));
  return out;
}
function getCurveEnd64({pickup,tipoElemento,instantaneaPickup,iccMax,xMax,limiteManual}={}){
  const p=Number(pickup)||0, inst=Number(instantaneaPickup)||0, icc=Number(iccMax)||0, xm=Number(xMax)||0, man=Number(limiteManual)||0;
  if(man>p) return {fim:Math.min(man,xm||man),motivoFim:'limitada por limite manual do estudo'};
  if(inst>p) return {fim:Math.min(inst,xm||inst),motivoFim:'limitada pela função instantânea correspondente'};
  if(icc>p) return {fim:Math.min(icc,xm||icc),motivoFim:'limitada pela corrente de curto-circuito máxima informada'};
  return {fim:xm>p?xm:p*10,motivoFim:'limitada pelo eixo X do coordenograma'};
}
function generateIDMTCurvePoints64({pickup,curveType,tms,start,stop,yMin,yMax,n=720}={}){
  const pontosBrutos=[], pontosVisiveis=[], avisos=[];
  if(!(pickup>0)){return {pontosBrutos,pontosVisiveis,avisos:['pickup inválido']};}
  if(!(tms>0)){return {pontosBrutos,pontosVisiveis,avisos:['TMS/TD inválido para curva IDMT']};}
  generateLogPoints64(start,stop,n).forEach(I=>{
    const M=I/pickup, tempo=tTCC(curveType,M,tms);
    if(Number.isFinite(tempo)&&tempo>0){
      const pt={x:I,y:tempo}; pontosBrutos.push(pt);
      if((!yMin||tempo>=yMin)&&(!yMax||tempo<=yMax)) pontosVisiveis.push(pt);
    }
  });
  if(!pontosBrutos.length) avisos.push('nenhum ponto IDMT válido gerado');
  if(pontosVisiveis.length<pontosBrutos.length) avisos.push('pontos cortados pelos limites yMin/yMax');
  return {pontosBrutos,pontosVisiveis,avisos};
}
function buildCurveElement64(cfg={}){
  const erros=[], avisos=[];
  const tipo=(cfg.tipoElemento||'IDMT').toUpperCase();
  const curva=normCurve360(cfg.curva||'NI');
  const pickup=Number(cfg.pickup)||0;
  const xMax=Number(cfg.xMax)||10000, yMax=Number(cfg.yMax)||100, yMin=Number(cfg.yMin)||.01;
  const ativo=cfg.ativo!==false;
  const base={id:cfg.id||'',label:cfg.label||'',tipoElemento:tipo,funcaoANSI:cfg.funcaoANSI||'',lado:cfg.lado||'',curva,pickup,status:'OK',avisos,erros,pontos:[],pontosBrutos:[],pontosVisiveis:[],inicio:0,fim:0,motivoInicio:'',motivoFim:'',equacao:'',constantes:curveInfo64(curva)};
  if(!ativo){base.status='DESABILITADA';base.motivoInicio='Elemento desabilitado';return base;}
  if(!(pickup>0)){erros.push('pickup <= 0');base.status='ERRO';return base;}
  if(tipo==='TD'||curva==='TD'||tipo==='50'){
    const tempo=coordInstantDelay360(Number(cfg.tempoDefinido ?? cfg.instantaneaTempo ?? cfg.tms));
    if(!(tempo>0)) erros.push('tempo definido <= 0');
    const end=getCurveEnd64({pickup,tipoElemento:tipo,iccMax:cfg.iccMax,xMax,limiteManual:cfg.limiteFinal});
    base.inicio=pickup; base.fim=Math.max(end.fim,pickup*1.01); base.motivoInicio='Tempo definido iniciado exatamente no pickup ajustado.'; base.motivoFim=end.motivoFim; base.equacao='t = tempo definido';
    base.pontos=[{x:pickup,y:yMax},{x:pickup,y:tempo},{x:base.fim,y:tempo}]; base.pontosBrutos=base.pontos; base.pontosVisiveis=base.pontos.filter(p=>p.y>=yMin&&p.y<=yMax);
    base.status=erros.length?'ERRO':'OK'; return base;
  }
  if(!(Number(cfg.tms)>0)){erros.push('TMS <= 0 em curva IDMT');base.status='ERRO';return base;}
  const factor=coordStartFactor64();
  const start=Math.max(pickup*factor,Number(cfg.xMin)||0.001);
  const end=getCurveEnd64({pickup,tipoElemento:tipo,instantaneaPickup:cfg.instantaneaPickup,iccMax:cfg.iccMax,xMax,limiteManual:cfg.limiteFinal});
  base.inicio=start; base.fim=Math.max(end.fim,start*1.01); base.motivoInicio=`Curva IDMT iniciada em ${String(factor).replace('.',',')} × pickup para evitar singularidade matemática em I = pickup.`; base.motivoFim=end.motivoFim; base.equacao=curveInfo64(curva).formula;
  const gen=generateIDMTCurvePoints64({pickup,curveType:curva,tms:Number(cfg.tms),start:base.inicio,stop:base.fim,yMin,yMax,n:cfg.n||720});
  base.pontos=gen.pontosBrutos; base.pontosBrutos=gen.pontosBrutos; base.pontosVisiveis=gen.pontosVisiveis; avisos.push(...gen.avisos);
  base.status=erros.length?'ERRO':(avisos.length?'ALERTA':'OK');
  return base;
}
function curvePointsEngine64(pick,curva,tms,end,xmin,xmax,ymin,ymax,label='curva'){
  const norm=normCurve360(curva);
  const el=buildCurveElement64({id:label,label,tipoElemento:norm==='TD'?'TD':'IDMT',curva,pickup:pick,tms,tempoDefinido:tms,xMin:xmin,xMax:xmax,yMin:ymin,yMax:ymax,limiteFinal:end});
  if(window.currentCoordRenderModel&&Array.isArray(window.currentCoordRenderModel.curveAudit)) window.currentCoordRenderModel.curveAudit.push(el);
  return el.pontos||[];
}
function buildCoordRenderModel64(d,xmin,xmax,ymin,ymax){
  const iccF=Math.max(val('icc3f'),val('icc2f'),val('icc2ft'),val('iccftmax'))||0;
  const iccN=Math.max(val('iccftmax'),val('iccftmin'),val('icc2ft'))||iccF;
  const curves=[];
  const add=o=>curves.push(buildCurveElement64(Object.assign({xMin:xmin,xMax:xmax,yMin:ymin,yMax:ymax},o)));
  add({id:'cliente_51f',label:'51F Cliente',tipoElemento:'IDMT',funcaoANSI:'51',lado:'Cliente',curva:str('curva51'),pickup:d.p51,tms:val('tms51'),instantaneaPickup:d.p50,iccMax:iccF});
  add({id:'cliente_50f',label:'50F Cliente',tipoElemento:'50',funcaoANSI:'50',lado:'Cliente',curva:'TD',pickup:d.p50,tempoDefinido:val('t50'),iccMax:iccF});
  add({id:'cliente_51n',label:'51N Cliente',tipoElemento:'IDMT',funcaoANSI:'51N',lado:'Cliente',curva:str('curva51n'),pickup:d.p51n,tms:val('tms51n'),instantaneaPickup:d.p50n,iccMax:iccN});
  add({id:'cliente_50n',label:'50N Cliente',tipoElemento:'50',funcaoANSI:'50N',lado:'Cliente',curva:'TD',pickup:d.p50n,tempoDefinido:val('t50n'),iccMax:iccN});
  add({id:'cliente_51ns',label:'51NS Cliente',tipoElemento:normCurve360(str('curva51ns'))==='TD'?'TD':'IDMT',funcaoANSI:'51NS',lado:'Cliente',curva:str('curva51ns')||'TD',pickup:d.p51ns,tms:val('t51ns'),tempoDefinido:val('t51ns'),instantaneaPickup:val('p50ns')||d.p50n,iccMax:iccN,ativo:d.p51ns>0});
  add({id:'cliente_51gs',label:'51GS Cliente',tipoElemento:normCurve360(str('curva51gs'))==='TD'?'TD':'IDMT',funcaoANSI:'51GS',lado:'Cliente',curva:str('curva51gs')||'TD',pickup:d.p51gs,tms:val('t51gs'),tempoDefinido:val('t51gs'),instantaneaPickup:val('p50ns')||d.p50n,iccMax:iccN,ativo:d.p51gs>0});
  add({id:'cliente_50ns',label:'50NS Cliente',tipoElemento:'50',funcaoANSI:'50NS',lado:'Cliente',curva:'TD',pickup:val('p50ns'),tempoDefinido:val('t50ns'),iccMax:iccN,ativo:val('p50ns')>0});
  add({id:'montante_51f',label:'51F Montante',tipoElemento:'IDMT',funcaoANSI:'51',lado:'Montante',curva:str('mCurvaF'),pickup:val('m51f'),tms:val('mTmsF'),instantaneaPickup:val('m50f'),iccMax:iccF});
  add({id:'montante_50f',label:'50F Montante',tipoElemento:'50',funcaoANSI:'50',lado:'Montante',curva:'TD',pickup:val('m50f'),tempoDefinido:val('mT50f'),iccMax:iccF});
  add({id:'montante_51n',label:'51N Montante',tipoElemento:'IDMT',funcaoANSI:'51N',lado:'Montante',curva:str('mCurvaN'),pickup:val('m51n'),tms:val('mTmsN'),instantaneaPickup:val('m50n'),iccMax:iccN});
  add({id:'montante_50n',label:'50N Montante',tipoElemento:'50',funcaoANSI:'50N',lado:'Montante',curva:'TD',pickup:val('m50n'),tempoDefinido:val('mT50n'),iccMax:iccN});
  add({id:'montante_51ns',label:'51NS Montante',tipoElemento:normCurve360(str('mCurva51ns'))==='TD'?'TD':'IDMT',funcaoANSI:'51NS',lado:'Montante',curva:str('mCurva51ns')||'TD',pickup:val('m51ns'),tms:val('mT51ns'),tempoDefinido:val('mT51ns'),instantaneaPickup:val('m50ns')||val('m50n'),iccMax:iccN,ativo:val('m51ns')>0});
  add({id:'montante_51gs',label:'51GS Montante',tipoElemento:normCurve360(str('mCurva51gs'))==='TD'?'TD':'IDMT',funcaoANSI:'51GS',lado:'Montante',curva:str('mCurva51gs')||'TD',pickup:val('m51gs'),tms:val('mT51gs'),tempoDefinido:val('mT51gs'),instantaneaPickup:val('m50ns')||val('m50n'),iccMax:iccN,ativo:val('m51gs')>0});
  add({id:'montante_50ns',label:'50NS Montante',tipoElemento:'50',funcaoANSI:'50NS',lado:'Montante',curva:'TD',pickup:val('m50ns'),tempoDefinido:val('mT50ns'),iccMax:iccN,ativo:val('m50ns')>0});
  const mode=str('coordNeutralMode')||'hybrid';
  const warnings=[];
  if(d.p50>0&&d.inrush50F>0&&d.p50<=d.inrush50F) warnings.push({nivel:'ERRO',texto:'50F está menor ou igual ao inrush: risco de atuação indevida na energização.'});
  else if(d.p50>0&&d.inrush50F>0&&d.p50<1.2*d.inrush50F) warnings.push({nivel:'ALERTA',texto:'50F está com margem menor que 1,20 × inrush.'});
  curves.filter(c=>c.status==='ERRO').forEach(c=>warnings.push({nivel:'ERRO',texto:`${c.label}: ${c.erros.join('; ')}`}));
  curves.filter(c=>c.avisos?.length).forEach(c=>warnings.push({nivel:'INFO',texto:`${c.label}: ${c.avisos.join('; ')}`}));
  return window.currentCoordRenderModel={version:FL_CURVE_ENGINE_VERSION,curves,curveAudit:curves.slice(),markers:[],tags:[],axes:{xmin,xmax,ymin,ymax},theme:str('coordTheme')||'white',neutralMode:mode,startFactor:coordStartFactor64(),minMargin:val('coordMinMargin')||.30,warnings,timestamp:new Date().toISOString()};
}
function renderCurveEngineBox64(d){
  const box=document.getElementById('curveEngineBox'), audit=document.getElementById('curveAuditBox'); if(!box&&!audit)return;
  const g=window.__flCoordGeom||{}; const model=window.currentCoordRenderModel||buildCoordRenderModel64(d,g.xmin||1,g.xmax||10000,g.ymin||.01,g.ymax||100);
  const curves=model.curves||[], idmt=curves.filter(c=>c.tipoElemento==='IDMT'&&c.pontos?.length).length, td=curves.filter(c=>['TD','50'].includes(c.tipoElemento)&&c.pontos?.length).length;
  const pts=curves.reduce((s,c)=>s+(c.pontos?.length||0),0), errs=curves.filter(c=>c.status==='ERRO').length, alerts=(model.warnings||[]).filter(w=>w.nivel!=='INFO').length;
  if(box) box.innerHTML=`<div class="coordSideTitle">Motor de Curvas</div><div class="coordStats"><div class="coordStat"><b>IDMT</b><span>${idmt}</span></div><div class="coordStat"><b>TD/50</b><span>${td}</span></div><div class="coordStat"><b>Pontos</b><span>${pts}</span></div><div class="coordStat"><b>Início IDMT</b><span>${String(model.startFactor).replace('.',',')} × pickup</span></div><div class="coordStat"><b>Neutro</b><span>${model.neutralMode}</span></div><div class="coordStat"><b>Alertas</b><span>${alerts} / Erros ${errs}</span></div></div>`;
  if(audit){
    const rows=curves.filter(c=>c.pickup>0).slice(0,10).map(c=>`<tr><td>${esc(c.label)}</td><td>${esc(c.tipoElemento)}</td><td>${fmt(c.pickup,2,'A')}</td><td>${fmt(c.inicio,2,'A')}</td><td>${fmt(c.fim,2,'A')}</td><td>${esc(c.motivoFim||'-')}</td><td>${c.pontos?.length||0}</td></tr>`).join('');
    audit.innerHTML=`<details><summary>Auditoria técnica das curvas</summary><div class="tableWrap"><table><thead><tr><th>Elemento</th><th>Tipo</th><th>Pickup</th><th>Início</th><th>Fim</th><th>Motivo fim</th><th>Pontos</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }
}
function runCurveEngineSelfTest(){
  const old=window.currentCoordRenderModel; window.currentCoordRenderModel={curveAudit:[]};
  const t1=buildCurveElement64({id:'t1',label:'Teste 51F',tipoElemento:'IDMT',curva:'NI',pickup:100,tms:.1,instantaneaPickup:1200,xMax:10000,yMin:.01,yMax:100});
  const t2=buildCurveElement64({id:'t2',label:'Teste 50F',tipoElemento:'50',curva:'TD',pickup:1200,tempoDefinido:.1,xMax:10000,yMin:.01,yMax:100});
  const t3=buildCurveElement64({id:'t3',label:'Teste 51NS off',tipoElemento:'IDMT',curva:'NI',pickup:0,tms:.1,ativo:false});
  const ok={
    t1:t1.inicio>100&&Math.abs(t1.fim-1200)<1e-6&&t1.pontos.length>100&&t1.pontos[0].y>t1.pontos[t1.pontos.length-1].y,
    t2:t2.pontos.length===3&&t2.inicio===1200&&Math.abs(t2.pontos[1].y-.1)<1e-6,
    t3:t3.status==='DESABILITADA'
  };
  window.currentCoordRenderModel=old; console.table(ok); return ok;
}
window.runCurveEngineSelfTest=runCurveEngineSelfTest;

// v6.3.1 — Motor Mesh: tempos instantâneos 0 s são representados com tempo visual mínimo,
// preservando o ajuste real do relé como 0 s nas tabelas e relatórios.
function coordVisualMinTime360(){const y=val('coordYMin')||0.01; return Math.max(y*4,0.04)}
function coordInstantDelay360(t){return (Number.isFinite(t)&&t>0)?t:coordVisualMinTime360()}
function tempoEstagio360(I,pick,curva,tms){ if(!(pick>0)) return Infinity; const norm=normCurve360(curva); if(norm==='TD') return I>=pick?coordInstantDelay360(tms):Infinity; if(!(tms>0)||!(I>pick)) return Infinity; const t=tTCC(curva,I/pick,tms); return Number.isFinite(t)&&t>0?t:Infinity;}
function candidatosNeutro360(I,estagios){const cand=[]; estagios.forEach(e=>{let t=e.inst?(I>=e.pick?coordInstantDelay360(e.t):Infinity):tempoEstagio360(I,e.pick,e.curva,e.t); if(Number.isFinite(t)) cand.push({t,fn:e.fn})}); cand.sort((a,b)=>a.t-b.t); return cand;}
function tempoNeutroComposto360(I,estagios){const c=candidatosNeutro360(I,estagios);return c.length?c[0].t:Infinity}
function winnerNeutro360(I,estagios){const c=candidatosNeutro360(I,estagios);return c.length?c[0].fn:null}
function pontosNeutroComposto360(estagios,xmin,xmax){const picks=estagios.map(e=>e.pick).filter(v=>v>0); if(!picks.length)return[]; const minP=Math.max(Math.min(...picks)*.75,xmin), a=[]; for(let I=minP;I<=xmax;I*=1.012){const t=tempoNeutroComposto360(I,estagios); if(Number.isFinite(t)&&t>0) a.push({x:I,y:t,fn:winnerNeutro360(I,estagios)})} return a;}
function paintField(e){
  e.classList.remove('model','user','auto','manual','okField','validated','errorField'); const tag=e.parentElement?.querySelector('.sourceTag');
  let st=e.dataset.state||''; if(e.hasAttribute('readonly')||e.dataset.auto==='1'){ if(e.dataset.forced==='1') st='manual'; else if(!st) st='auto'; }
  if(st==='model'){e.classList.add('model'); if(tag)tag.textContent='MODELO'}
  else if(st==='auto'){e.classList.add('auto'); if(tag)tag.textContent='AUTO'}
  else if(st==='manual'){e.classList.add('manual'); if(tag)tag.textContent='FORÇADO'}
  else {e.classList.add('user'); if(tag)tag.textContent='OPERADOR'}
  if(e.dataset.valid==='1') e.classList.add('validated');
  if(e.dataset.error==='1') e.classList.add('errorField');
}
function flvAuditProtectionPro649(d){
  const n=v=>Number(v)||0;
  const fmtS=v=>Number.isFinite(Number(v))&&Number(v)>0?fmt(Number(v),3,'s'):'-';
  const iccF=Math.max(n(val('icc3f')),n(val('icc2f')),n(val('icc2ft')),n(val('iccftmax')));
  const iccN=Math.max(n(val('iccftmax')),n(val('iccftmin')),n(val('icc2ft')));
  const rows=[], cards=[];
  const row=(e,tipo,pick,tempo,fim,motivo)=>rows.push({e,tipo,pick,tempo,fim,motivo});
  const card=(cls,title,msg)=>cards.push({cls,title,msg});
  row('51F Cliente','IDMT / curva inversa',d.p51,val('tms51'),d.p50>0?d.p50:iccF,'Termina na 50F ou no limite de curto/eixo.');
  row('50F Cliente','Tempo definido',d.p50,val('t50'),iccF,'Termina no maior Icc de fase informado.');
  row('51N Cliente','IDMT / curva inversa',d.p51n,val('tms51n'),d.p50n>0?d.p50n:iccN,'Termina na 50N ou no limite de falta à terra/eixo.');
  row('50N Cliente','Tempo definido',d.p50n,val('t50n'),iccN,'Termina no maior Icc de terra informado.');
  if(n(val('m51f'))>0) row('51F Montante','IDMT / curva inversa',val('m51f'),val('mTmsF'),val('m50f')>0?val('m50f'):iccF,'Referência de montante para seletividade.');
  if(n(val('m50f'))>0) row('50F Montante','Tempo definido',val('m50f'),val('mT50f'),iccF,'Tempo definido do relé/dispositivo montante.');
  if(n(val('m51n'))>0) row('51N Montante','IDMT / curva inversa',val('m51n'),val('mTmsN'),val('m50n')>0?val('m50n'):iccN,'Referência de montante para faltas à terra.');
  if(n(val('m50n'))>0) row('50N Montante','Tempo definido',val('m50n'),val('mT50n'),iccN,'Tempo definido do neutro/terra montante.');
  if(d.p50>0 && n(val('inrush'))>0){
    if(d.p50<=n(val('inrush'))) card('bad','50F × Inrush','50F está igual ou abaixo do inrush. Risco de atuação na energização.');
    else if(d.p50<1.2*n(val('inrush'))) card('warn','50F × Inrush','50F está acima do inrush, porém com margem pequena.');
    else card('ok','50F × Inrush','50F acima do inrush com margem preliminar adequada.');
  } else card('info','50F × Inrush','Dados insuficientes para avaliar inrush.');
  if(d.p50>0 && iccF>0) card(d.p50<iccF?'ok':'warn','Sensibilização fase',d.p50<iccF?'Icc máximo supera a partida da 50F.':'Icc máximo não supera a partida da 50F; verificar ajuste.');
  if(d.p50n>0 && iccN>0) card(d.p50n<iccN?'ok':'warn','Sensibilização terra',d.p50n<iccN?'Icc de terra supera a partida da 50N.':'Icc de terra não supera a partida da 50N; verificar ajuste.');
  card('info','50/50N temporizada',`Cliente: 50F ${fmtS(val('t50'))}, 50N ${fmtS(val('t50n'))}. Montante: 50F ${fmtS(val('mT50f'))}, 50N ${fmtS(val('mT50n'))}.`);
  card('info','Critério de finalização','Trechos horizontais das funções 50/50N são limitados ao maior Icc do estudo, não ao fim visual do eixo.');
  return {rows,cards};
}
function renderCoordAuditPro649(d){
  const host=document.getElementById('coordAuditPro649');
  if(!host) return;
  const audit=flvAuditProtectionPro649(d);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const cardHtml=audit.cards.map(c=>`<div class="auditCurveProItem ${esc(c.cls)}"><b>${esc(c.title)}</b>${esc(c.msg)}</div>`).join('');
  const rowsHtml=audit.rows.map(r=>`<tr><td>${esc(r.e)}</td><td>${esc(r.tipo)}</td><td>${esc(fmt(Number(r.pick)||0,2,'A'))}</td><td>${esc(String(r.tipo).includes('IDMT')?fmt(Number(r.tempo)||0,3,''):fmt(Number(r.tempo)||0,3,'s'))}</td><td>${esc(fmt(Number(r.fim)||0,2,'A'))}</td><td>${esc(r.motivo)}</td></tr>`).join('');
  host.innerHTML=`<div class="divider">Auditoria técnica Pro</div><div class="auditCurveProBox">${cardHtml}</div><table class="auditCurveProTable"><thead><tr><th>Elemento</th><th>Tipo</th><th>Partida</th><th>Dial/Tempo</th><th>Fim gráfico</th><th>Critério</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

function initModel(){
  
$$('input,select,textarea').forEach(e=>{ if(e.dataset.model!==undefined){e.value=e.dataset.model; e.dataset.state='model'; delete e.dataset.forced;} paintField(e); });
  if($('dataEstudo') && !str('dataEstudo')){$('dataEstudo').value=new Date().toISOString().slice(0,10); $('dataEstudo').dataset.state='auto'; paintField($('dataEstudo'));}
  calcular(true); updateProgress();
}
function markChanged(e){
  if(e.dataset.auto==='1' && e.dataset.forceable==='1'){ e.dataset.forced='1'; e.dataset.state='manual'; }
  else if(e.dataset.auto!=='1'){ e.dataset.state='user'; }
  paintField(e); calcular(false); updateProgress();
}
function setSecondaryOutputV635(id,value,isSecondarySource,recalcAutos){
  const e=$(id); if(!e)return;
  if(isSecondarySource){
    e.removeAttribute('readonly');
    e.dataset.state=e.dataset.forced==='1'?'manual':'user';
    paintField(e);
    return;
  }
  e.setAttribute('readonly','readonly');
  delete e.dataset.forced;
  setVal(id,value,true);
}
function calcData(recalcAutos=true){
  const multi=calcTrafosV507();
  const kv=val('kv'), vbt=val('vbt'), kw=val('kw'), fp=val('fp');
  const kva=multi?multi.kvaTotal:val('kva');
  const tcP=val('tcPrim'), tcS=val('tcSec'), rtc=tcS>0?tcP/tcS:NaN;
  const rtp=val('tpSec')>0?val('tpPrim')/val('tpSec'):NaN;
  const inAT=kv>0?kva/(Math.sqrt(3)*kv):NaN;
  const inBT=vbt>0?(kva*1000)/(Math.sqrt(3)*vbt):NaN;
  const iDem=(kv>0&&fp>0)?kw/(Math.sqrt(3)*kv*fp):NaN;
  const icc51=val(str('iccAdotada')), iccTerra=val(str('iccTerra'));
  const soloAnsi=ansiNansiFromTrafo(inAT,val('ztrafo'),str('ligacao')||'Dyn1');
  const inrushAuto=multi?multi.inrushTotal:inAT*val('inrushMult'), inrush50F=multi?inrushSelecionadoV635(multi,'inrush50FSource'):inrushAuto, inrush50N=multi?inrushSelecionadoV635(multi,'inrush50NSource'):inrushAuto, ansiAuto=multi?multi.ansiRef:soloAnsi.ansi, nansiAuto=multi?multi.nansiRef:soloAnsi.nansi;
  setAuto('ansiMult',multi?multi.ansiMultRef:soloAnsi.ansiMult,recalcAutos); setAuto('nansiMult',multi?multi.nansiMultRef:soloAnsi.nansiMult,recalcAutos);
  setAuto('ansiTempo',multi?multi.ansiTempoRef:soloAnsi.ansiTempo,recalcAutos); setAuto('nansiTempo',multi?multi.nansiTempoRef:soloAnsi.nansiTempo,recalcAutos);
  setAuto('inrush',inrushAuto,recalcAutos); setAuto('ansi',ansiAuto,recalcAutos); setAuto('nansi',nansiAuto,recalcAutos);
  if(multi){ setVal('kva',multi.kvaTotal,true); setVal('ztrafo',multi.zEq,true); setVal('ligacao',multi.lista?.[0]?.ligacao||'Múltiplos',true); setVal('tipoTrafo',multi.tipoEq,true); }
  setVal('inAT',inAT,true); setVal('inBT',inBT,true); setVal('iDemanda',iDem,true); setVal('rtc',rtc,true); setVal('rtp',rtp,true);
  const mult51=val('mult51'), base51=str('base51');
  let p51Auto=NaN;
  if(base51==='desligado') p51Auto=0;
  else if(base51==='secundario') p51Auto=val('p51SecManual')*rtc;
  else if(mult51>0){
    if(base51==='demanda') p51Auto=iDem*mult51;
    else if(base51==='trafo'||base51==='inTrafo'||base51==='potenciaInstalada') p51Auto=inAT*mult51;
    else p51Auto=val('p51Manual');
  }
  if(!['manual','secundario','desligado'].includes(base51) && !(mult51>0)){delete $('p51Manual').dataset.forced; setVal('p51Manual',NaN,true);}
  else if(base51!=='manual') setAuto('p51Manual',p51Auto,recalcAutos);
  const p51=val('p51Manual');
  let p50Auto=inrush50F*val('margem50');
  if(str('modo50')==='secundario') p50Auto=val('p50SecManual')*rtc;
  else if(str('modo50')==='desligado') p50Auto=0;
  else if(str('modo50')==='iccPct') p50Auto=icc51*val('margem50')/100;
  if(str('modo50')!=='manual') setAuto('p50Manual',p50Auto,recalcAutos);
  const pct51n=val('pct51n');
  let p51nAuto=val('p51n');
  if(str('modo51n')==='pct51') p51nAuto=pct51n>0?round(p51*pct51n/100,1):NaN;
  else if(str('modo51n')==='terco51') p51nAuto=round(p51/3,2);
  else if(str('modo51n')==='pctIn') p51nAuto=pct51n>0?round(inAT*pct51n/100,1):NaN;
  else if(str('modo51n')==='normativo') p51nAuto=Math.max(0.5,Math.min(iccTerra*.30,inAT*.35));
  else if(str('modo51n')==='secundario') p51nAuto=val('p51nSecManual')*rtc;
  else if(str('modo51n')==='desligado') p51nAuto=0;
  if(str('modo51n')!=='manual') setAuto('p51n',p51nAuto,recalcAutos);
  let p50nAuto=val('p50n'), p50nLimiteIcc80=iccTerra*.80;
  if(str('modo50n')==='autoIcc80') p50nAuto=p50nLimiteIcc80;
  else if(str('modo50n')==='normativo') p50nAuto=Math.max(10,Math.min(100,p50nLimiteIcc80));
  else if(str('modo50n')==='pct50') p50nAuto=val('p50Manual')*val('pct50n')/100;
  else if(str('modo50n')==='terco50') p50nAuto=val('p50Manual')/3;
  else if(str('modo50n')==='inrush') p50nAuto=inrush50N*val('margem50n');
  else if(str('modo50n')==='secundario') p50nAuto=val('p50nSecManual')*rtc;
  else if(str('modo50n')==='pctFT') p50nAuto=iccTerra*val('pct50n')/100;
  else if(str('modo50n')==='bloqueado') p50nAuto=0;
  if(str('modo50n')!=='manual'){
    const p50nEl=$('p50n');
    if(p50nEl) delete p50nEl.dataset.forced;
    setAuto('p50n',p50nAuto,true);
  }
  let p51nsAuto=val('p51ns');
  if(str('modo51ns')==='autoFaixa') p51nsAuto=Math.max(3,Math.min(6,iccTerra*.10));
  else if(str('modo51ns')==='pctIn') p51nsAuto=inAT*.25;
  else if(str('modo51ns')==='secundario') p51nsAuto=val('p51nsSecManual')*rtc;
  else if(str('modo51ns')==='desligado') p51nsAuto=0;
  if(str('modo51ns')!=='manual') setAuto('p51ns',p51nsAuto,recalcAutos);
  const p51gsAuto=val('p51gs');
  const s51=p51/rtc, m51=icc51/p51, tempo51=tIEC(str('curva51'),m51,val('tms51'));
  const p50=val('p50Manual'), s50=p50/rtc;
  const p51n=val('p51n'), s51n=p51n/rtc, m51n=iccTerra/p51n, tempo51n=tIEC(str('curva51n'),m51n,val('tms51n'));
  const p50n=val('p50n'), s50n=p50n/rtc, p51ns=val('p51ns'), s51ns=p51ns/rtc, p51gs=val('p51gs'), s51gs=p51gs/rtc;
  setSecondaryOutputV635('p51SecManual',s51,base51==='secundario',recalcAutos);
  setSecondaryOutputV635('p50SecManual',s50,str('modo50')==='secundario',recalcAutos);
  setSecondaryOutputV635('p51nSecManual',s51n,str('modo51n')==='secundario',recalcAutos);
  setSecondaryOutputV635('p50nSecManual',s50n,str('modo50n')==='secundario',recalcAutos);
  setSecondaryOutputV635('p51nsSecManual',s51ns,str('modo51ns')==='secundario',recalcAutos);
  setAuto('p51gsSecCalc',s51gs,true);
  const p51nsM=val('m51ns'), p51gsM=val('m51gs'); const curva51ns=str('curva51ns'), curva51gs=str('curva51gs'), mCurva51ns=str('mCurva51ns'), mCurva51gs=str('mCurva51gs');
  const tpP=val('tpPrim'), tpS=val('tpSec'), v27s=tpS*val('v27')/100, v59s=tpS*val('v59')/100, v27p=tpP*val('v27')/100, v59p=tpP*val('v59')/100;
  const rCu=0.02*(val('tcCaboM')/Math.max(val('tcCaboSecao'),0.1)); const zRele=val('releVA')/(tcS*tcS); const zTotal=rCu+zRele+val('tcRint'); const vaReal=tcS*tcS*zTotal; const alfEf=val('tcALF')*(val('tcVA')/Math.max(vaReal,.01)); const iSecFalta=val('icc3f')/rtc; const tcOk=alfEf*tcS>=iSecFalta;
  return {kva,kv,vbt,kw,fp,multi,filosofia:filosofiaAtualV635(),tcP,tcS,rtc,rtp,inAT,inBT,iDem,icc51,iccTerra,inrushAuto,inrush50F,inrush50N,p51,s51,m51,tempo51,p50,s50,p51n,s51n,m51n,tempo51n,p50n,s50n,p51ns,s51ns,p51gs,s51gs,p51nsM,p51gsM,tpP,tpS,v27s,v59s,v27p,v59p,rCu,zRele,zTotal,vaReal,alfEf,iSecFalta,tcOk,p51Auto,p50Auto,p51nAuto,p50nAuto,p50nLimiteIcc80,p51nsAuto,p51gsAuto,curva51ns,curva51gs,mCurva51ns,mCurva51gs};
}
function accepted(x,step=0.01){ if(!Number.isFinite(x))return '-'; return fmt(Math.round(x/step)*step, step>=1?0:2,''); }
function calcular(recalcAutos=false){ const d=calcData(recalcAutos); autoFuseMontanteV513(d); renderPhilosophyV635(); renderTrafosV507(); renderMetrics(d); renderParam(d); renderValid(d); renderMemory(d); drawChart(d); renderReport(d); return d; }
function runV5SelfTest(){
  initModel();
  let d=calcular(true);
  const tests=[
    ['inAT',d.inAT,20.9185,.0002],
    ['iDemanda',d.iDem,11.3687,.0002],
    ['inrush',val('inrush'),167.3479,.0002],
    ['ANSI',val('ansi'),396.1835,.0005],
    ['NANSI',val('nansi'),229.7864,.0005],
    ['tempo_ANSI',val('ansiTempo'),3.0,.0005],
    ['tempo_NANSI',val('nansiTempo'),3.0,.0005],
    ['p51',d.p51,14.7793,.0002],
    ['p51_sec',d.s51,.4926,.0005],
    ['p50',d.p50,217.5523,.0002],
    ['p50_sec',d.s50,7.2517,.0005],
    ['p51n',d.p51n,3.0,.0002],
    ['p51n_sec',d.s51n,.1,.0002],
    ['p51ns',d.p51ns,6.0,.0002],
    ['p51ns_sec',d.s51ns,.2,.0002],
    ['p50n',d.p50n,40.0,.0002],
    ['p50n_sec',d.s50n,1.3333,.0005],
    ['V59_sec',d.v59s,138,.0002],
    ['V59_prim',d.v59p,16560,.0002],
    ['V27_sec',d.v27s,97.75,.0002],
    ['V47',val('v47'),25,.0002],
    ['t47',val('t47'),.2,.0002],
    ['Ztotal_TC',d.zTotal,.284,.0002],
    ['VAreal_TC',d.vaReal,7.10,.0002],
    ['ALFef_TC',d.alfEf,42.2535,.0005]
  ];
  const results=tests.map(([name,got,exp,tol])=>({name,got,expected:exp,pass:Math.abs(got-exp)<=tol}));
  $('mult51').value='0'; $('mult51').dataset.state='user'; calcular(false);
  const invalidPass=$('p51Manual').value==='' && $('validações').innerHTML.includes('Multiplicador 51 deve ser maior que zero');
  results.push({name:'mult51_zero_invalidates_p51',got:$('p51Manual').value,expected:'campo vazio com erro',pass:invalidPass});
  $('mult51').value='1.3'; delete $('p51Manual').dataset.forced; calcular(true);
  const failed=results.filter(r=>!r.pass);
  const summary={pass:failed.length===0,total:results.length,failed,results};
  console.table(results);
  return summary;
}
function makeSimpleStateV630(overrides={},trafos=null){
  const fields={};
  $$('input,select,textarea').forEach(e=>{
    if(!e.id||e.type==='file')return;
    fields[e.id]={value:e.type==='checkbox'?e.value:(e.dataset.model!==undefined?e.dataset.model:e.value),state:'test',checked:e.type==='checkbox'?!!e.checked:undefined,type:e.type||e.tagName};
  });
  Object.entries(overrides||{}).forEach(([id,value])=>{
    const e=$(id);
    fields[id]={value,state:'test',checked:e?.type==='checkbox'?!!value:undefined,type:e?.type||'text'};
    if(e?.type==='checkbox') fields[id].value=e.value||'on';
  });
  return {schema:'FL_VOLTS_PROTECAO_360',version:'6.3.0-test',fields,trafos:trafos||trafosV507};
}
function internalTestCasesV630(){
  const baseTrafos=[{ativo:true,tag:'TRF01',tipo:'Seco',kva:500,z:5.28,ligacao:'Dyn1',mult:8,hhMode:'sem',hhFuse:0}];
  return [
    {id:'caso_01_300kva_iec_ni',name:'Caso 1 - 300 kVA IEC NI TC 100/5',state:makeSimpleStateV630({kva:300,kv:13.8,vbt:380,kw:180,fp:.92,tcPrim:100,tcSec:5,curva51:'NI',tms51:.1,curva51n:'NI',tms51n:.1,p51ns:0,p51gs:0,m51ns:0,m51gs:0},[{ativo:true,tag:'TRF01',tipo:'Seco',kva:300,z:5.75,ligacao:'Dyn1',mult:8,hhMode:'sem',hhFuse:0}]),expectedStatus:'REVISAR ANTES DE EMITIR',checks:['inAT>0','rtc=20','51NS desabilitada']},
    {id:'caso_02_500kva_iec_mi_51n_50n',name:'Caso 2 - 500 kVA IEC MI TC 150/5 com 51N/50N',state:makeSimpleStateV630({kva:500,kw:300,tcPrim:150,tcSec:5,curva51:'MI',tms51:.12,curva51n:'MI',tms51n:.12,p51n:6,p50n:80,p51ns:0,p51gs:0},baseTrafos),expectedStatus:'REVISAR ANTES DE EMITIR',checks:['inAT>0','rtc=30','51N ativa','50N ativa']},
    {id:'caso_03_2mva_demanda_500kw',name:'Caso 3 - 2 MVA demanda 500 kW com inrush ANSI/NANSI',state:makeSimpleStateV630({kva:2000,kw:500,tcPrim:300,tcSec:5,curva51:'NI',tms51:.14,ansiRefMode:'total',inrushMethod:'maiorMaisDemais'},[{ativo:true,tag:'TRF01',tipo:'Óleo',kva:2000,z:5.75,ligacao:'Dyn1',mult:8,hhMode:'auto',hhFuse:65}]),expectedStatus:'REVISAR ANTES DE EMITIR',checks:['multi ativo','inrush>0','ANSI>0','NANSI>0']},
    {id:'caso_04_51ns_tempo_definido',name:'Caso 4 - 51NS em tempo definido',state:makeSimpleStateV630({tcPrim:150,tcSec:5,p51ns:5,curva51ns:'TD',t51ns:1.2,terraSensivelNome:'51NS Cliente',coordStageAudit:'on'},baseTrafos),expectedStatus:'REVISAR ANTES DE EMITIR',checks:['51NS ativa','curva TD','tempo válido']},
    {id:'caso_05_51ns_51gs_desabilitada',name:'Caso 5 - 51NS/51GS desabilitada por decisão técnica',state:makeSimpleStateV630({p51ns:0,p51gs:0,modo51ns:'manual',terraSensivelNome:'51NS Cliente',m51ns:0,m51gs:0},baseTrafos),expectedStatus:'REVISAR ANTES DE EMITIR',checks:['51NS desabilitada','51GS desabilitada']},
    {id:'caso_06_multiplos_transformadores',name:'Caso 6 - múltiplos transformadores ativos',state:makeSimpleStateV630({tcPrim:300,tcSec:5,inrushMethod:'somaInrush',ansiRefMode:'todos'},[{ativo:true,tag:'TRF01',tipo:'Seco',kva:500,z:5.75,ligacao:'Dyn1',mult:8,hhMode:'auto',hhFuse:40},{ativo:true,tag:'TRF02',tipo:'Seco',kva:750,z:5.8,ligacao:'Dyn1',mult:8,hhMode:'auto',hhFuse:50},{ativo:true,tag:'TRF03',tipo:'Óleo',kva:1000,z:6,ligacao:'Dyn1',mult:8,hhMode:'auto',hhFuse:65}]),expectedStatus:'REVISAR ANTES DE EMITIR',checks:['multi ativos>=2','inrush equivalente','ANSI/NANSI múltiplos']}
  ];
}
function evaluateNamedInternalCheckV630(name,d,audit,fidelity){
  const near=(a,b,tol=.02)=>Number.isFinite(a)&&Math.abs(a-b)<=Math.max(tol,Math.abs(b)*tol);
  const activeElements=fidelity?.items?.map(i=>i.id)||[];
  const checks={
    'inAT>0':()=>({pass:Number.isFinite(d.inAT)&&d.inAT>0,got:d.inAT,expected:'>0'}),
    'rtc=20':()=>({pass:near(d.rtc,20,.01),got:d.rtc,expected:'20'}),
    'rtc=30':()=>({pass:near(d.rtc,30,.01),got:d.rtc,expected:'30'}),
    '51NS desabilitada':()=>({pass:!(d.p51ns>0),got:d.p51ns,expected:'0 ou desabilitada'}),
    '51GS desabilitada':()=>({pass:!(d.p51gs>0),got:d.p51gs,expected:'0 ou desabilitada'}),
    '51N ativa':()=>({pass:d.p51n>0&&activeElements.includes('cliente_neutro'),got:d.p51n,expected:'pickup >0 e curva neutro plotada'}),
    '50N ativa':()=>({pass:d.p50n>0&&activeElements.includes('cliente_neutro'),got:d.p50n,expected:'pickup >0 e curva neutro plotada'}),
    'multi ativo':()=>({pass:(d.multi?.ativos||0)>=1,got:d.multi?.ativos||0,expected:'>=1'}),
    'multi ativos>=2':()=>({pass:(d.multi?.ativos||0)>=2,got:d.multi?.ativos||0,expected:'>=2'}),
    'inrush>0':()=>({pass:val('inrush')>0,got:val('inrush'),expected:'>0'}),
    'inrush equivalente':()=>({pass:val('inrush')>0&&(d.multi?.ativos||0)>=2,got:val('inrush'),expected:'>0 com múltiplos trafos'}),
    'ANSI>0':()=>({pass:val('ansi')>0,got:val('ansi'),expected:'>0'}),
    'NANSI>0':()=>({pass:val('nansi')>0,got:val('nansi'),expected:'>0'}),
    'ANSI/NANSI múltiplos':()=>({pass:val('ansi')>0&&val('nansi')>0&&(d.multi?.ativos||0)>=2,got:`ANSI ${val('ansi')} / NANSI ${val('nansi')}`,expected:'ambos >0 em múltiplos trafos'}),
    '51NS ativa':()=>({pass:d.p51ns>0&&activeElements.includes('cliente_51ns'),got:d.p51ns,expected:'pickup >0 e plotada'}),
    'curva TD':()=>({pass:str('curva51ns')==='TD',got:str('curva51ns'),expected:'TD'}),
    'tempo válido':()=>({pass:val('t51ns')>0,got:val('t51ns'),expected:'>0 s'})
  };
  const fn=checks[name];
  const r=fn?fn():{pass:true,got:'não aplicável',expected:'informativo'};
  return {name,pass:!!r.pass,got:r.got,expected:r.expected};
}
function evaluateInternalCaseV630(tc){
  const snapshot=getState();
  const trafosSnapshot=JSON.parse(JSON.stringify(trafosV507||[]));
  try{
    loadState(tc.state);
    const d=calcData(true);
    calcular(true);
    const audit=executarAuditoriaTecnica(d);
    const fidelity=validateRenderConsistency(d,{skipRedraw:true,reportElement:$('report')});
    const passStatus=!tc.expectedStatus || audit.nivel===tc.expectedStatus || (tc.expectedStatus==='REVISAR ANTES DE EMITIR' && /REVISAR|RESSALVAS|APROVADO/.test(audit.nivel));
    const checks=[
      {name:'Status esperado',pass:passStatus,got:audit.nivel,expected:tc.expectedStatus},
      {name:'Corrente nominal AT',pass:Number.isFinite(d.inAT)&&d.inAT>0,got:d.inAT,expected:'>0'},
      {name:'RTC válido',pass:Number.isFinite(d.rtc)&&d.rtc>0,got:d.rtc,expected:'>0'},
      {name:'Fidelidade gráfica',pass:fidelity.status!=='REVISAR',got:fidelity.status,expected:'OK/ATENÇÃO'},
      {name:'51NS coerente',pass:tc.id.includes('51ns_tempo')?d.p51ns>0:d.p51ns>=0,got:d.p51ns,expected:tc.id.includes('51ns_tempo')?'>0':'>=0'},
      {name:'Múltiplos trafos',pass:tc.id.includes('multiplos')?(d.multi?.ativos>=2):true,got:d.multi?.ativos||0,expected:tc.id.includes('multiplos')?'>=2':'opcional'}
    ].concat((tc.checks||[]).map(name=>evaluateNamedInternalCheckV630(name,d,audit,fidelity)));
    return {id:tc.id,name:tc.name,expectedStatus:tc.expectedStatus,obtainedStatus:audit.nivel,pass:checks.every(x=>x.pass),checks,auditCounts:audit.status?.counts,fidelityStatus:fidelity.status};
  }catch(e){
    return {id:tc.id,name:tc.name,expectedStatus:tc.expectedStatus,obtainedStatus:'ERRO',pass:false,error:e.message||String(e),checks:[]};
  }finally{
    try{trafosV507=trafosSnapshot; loadState(snapshot); calcular(true);}catch(e){console.warn('Failed to restore snapshot state:', e);}
  }
}
function runInternalJsonTestsV630(){
  const cases=internalTestCasesV630();
  const results=cases.map(evaluateInternalCaseV630);
  window.__lastInternalJsonTestsV630=results;
  renderInternalTestResultsV630(results);
  return {version:'v1.0',generatedAt:new Date().toISOString(),total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};
}
function renderInternalTestResultsV630(results){
  const box=$('internalTestsBox'); if(!box)return;
  const rows=(results||[]).map(r=>`<tr><td>${auditHtml(r.name)}</td><td>${auditHtml(r.expectedStatus)}</td><td>${auditHtml(r.obtainedStatus)}</td><td><span class="${r.pass?'devTestOk':'devTestFail'}">${r.pass?'OK':'Revisar'}</span></td><td>${auditHtml((r.checks||[]).filter(c=>!c.pass).map(c=>`${c.name}: ${c.got} esperado ${c.expected}`).join(' | ')||r.error||'Sem falhas')}</td></tr>`).join('');
  const ok=(results||[]).filter(r=>r.pass).length;
  box.innerHTML=`<div class="tableWrap auditMiniTable"><table><thead><tr><th>Caso</th><th>Status esperado</th><th>Status obtido</th><th>Resultado</th><th>Erros encontrados</th></tr></thead><tbody>${rows}</tbody></table></div><div class="small"><b class="${ok===results.length?'devTestOk':'devTestWarn'}">Testes internos: ${ok}/${results.length} aprovados.</b></div>`;
}
function renderMetrics(d){
  const arr=[['Filosofia',d.filosofia.label,'Preset editável do estudo'],['In AT / In BT',`${fmt(d.inAT,2,'A')} / ${fmt(d.inBT,2,'A')}`,'Correntes nominais calculadas'],['Demanda AT',fmt(d.iDem,2,'A'),'Base operacional de carga'],['Inrush plotado / 50F',`${fmt(val('inrush'),1,'A')} / ${fmt(d.inrush50F,1,'A')}`,'Fontes escolhidas'],['Inrush 50N',fmt(d.inrush50N,1,'A'),'Fonte selecionada do neutro'],['ANSI / NANSI',`${fmt(val('ansi'),1,'A')} / ${fmt(val('nansi'),1,'A')}`,'Pontos do transformador'],['51 / 50 fase',`${fmt(d.p51,2,'A')} / ${fmt(d.p50,1,'A')}`,'Ajustes primários'],['51N / 50N',`${fmt(d.p51n,2,'A')} / ${fmt(d.p50n,2,'A')}`,'Neutro/terra'],['51NS / 51GS',`${fmt(d.p51ns,2,'A')} / ${fmt(d.p51gs,2,'A')}`,'Terra sensível'],['27 / 59',`${fmt(d.v27s,1,'V')} / ${fmt(d.v59s,1,'V')}`,'Secundário do TP'],['TC burden / ALF',`${fmt(d.vaReal,2,'VA')} / ${fmt(d.alfEf,1,'')}`,'Verificação preliminar']];
  $('resultMetrics').innerHTML=arr.map(a=>`<div class="metric"><div class="name">${a[0]}</div><div class="value">${a[1]}</div><div class="note">${a[2]}</div></div>`).join('');
}
function curvaParamLabel(c){return curvaNome360(c).replace('SEL/IEEE ','SEL/IEEE ').replace('Tempo Definido','TD - Tempo Definido')}
function pillStatus(status){const s=String(status||'info').toLowerCase(); const label={ativa:'Ativa',avaliar:'Avaliar',desabilitada:'Desabilitada',info:'Informativa'}[s]||status; return `<span class="pill ${s}">${label}</span>`}
function secFmt(v,d=3){return Number.isFinite(v)&&v>0?fmt(v,d,'A sec'):'-'}
function primFmt(v,d=2,u='A'){return Number.isFinite(v)&&v>0?fmt(v,d,u):'-'}
function acceptedRelay(v,step=.01,u='A sec'){if(!(Number.isFinite(v)&&v>0))return '-'; const r=Math.round(v/step)*step; return fmt(r, step>=1?0:2, u)}
function paramRow(o){
  PARAM_ROWS.push(o);
  const cls=String(o.status||'info').toLowerCase();
  return `<tr class="param-${cls}"><td>${o.funcao}</td><td>${o.descricao}</td><td>${pillStatus(cls)}</td><td>${o.primario}</td><td>${o.secundario}</td><td>${o.curva}</td><td>${o.dial}</td><td>${o.aceito}</td><td>${o.obs}</td><td>${o.criterio}</td></tr>`;
}
function renderParam(d){
  PARAM_ROWS=[];
  const criterio51={demanda:'Demanda × multiplicador',inTrafo:'In do transformador × multiplicador',potenciaInstalada:'Corrente instalada × multiplicador',secundario:'Ajuste secundário do relé',manual:'Valor manual/forçado',desligado:'Desligada'}[str('base51')]||str('base51');
  const criterio51n={pct51:'Percentual da 51 fase',terco51:'1/3 da 51 fase',pctIn:'Percentual da In do transformador',secundario:'Ajuste secundário do relé',manual:'Manual/modelo',normativo:'Critério normativo/faixa',desligado:'Desligada'}[str('modo51n')]||str('modo51n');
  const criterio50n={pct50:'Percentual da 50 fase',terco50:'1/3 da 50 fase',inrush:'Inrush selecionado × multiplicador',secundario:'Ajuste secundário do relé',manual:'Manual/modelo',autoIcc80:'80% da Icc FT mínima',pctFT:'Percentual da Icc FT',normativo:'Faixa normativa/configurada',bloqueado:'Desligada'}[str('modo50n')]||str('modo50n');
  const criterio51ns={manual:'Manual/modelo',autoFaixa:'Automático por faixa',td:'Tempo definido',inversa:'Curva inversa IEC/IEEE',secundario:'Ajuste secundário do relé',pctIn:'Percentual da In do transformador',desligado:'Desligada'}[str('modo51ns')]||str('modo51ns');
  const obs50=d.p50>d.inrush50F?'Acima do inrush usado pela 50F.':'Atenção: igual/abaixo do inrush usado pela 50F.';
  const obs50n=d.p50n>d.iccTerra?'Atenção: acima da falta fase-terra mínima/de referência.':'Sensível à falta fase-terra de referência.';
  const nsDom=nsDominaTrecho360(d,'cliente');
  const justSens=str('just51ns')||'Sem justificativa técnica registrada.';
  const obs51ns=d.p51ns>0?(nsDom?'Domina trecho da curva composta de neutro.':'Habilitada, porém não domina trecho da curva composta.'):('Desabilitada. Justificativa: '+justSens);
  const rows=[];
  rows.push(paramRow({funcao:'51',descricao:'Sobrecorrente temporizada de fase',status:str('base51')==='desligado'?'desabilitada':'ativa',primario:primFmt(d.p51,2),secundario:secFmt(d.s51,3),curva:curvaParamLabel(str('curva51')),dial:'TMS/TD '+fmt(val('tms51'),2,''),aceito:acceptedRelay(d.s51,.01),obs:`M=${fmt(d.m51,2,'')} no ponto de referência; tempo ${Number.isFinite(d.tempo51)?fmt(d.tempo51,3,'s'):'não atua'}.`,criterio:criterio51}));
  rows.push(paramRow({funcao:'50',descricao:'Sobrecorrente instantânea de fase',status:str('modo50')==='desligado'?'desabilitada':(d.p50>d.inrush50F?'ativa':'avaliar'),primario:primFmt(d.p50,1),secundario:secFmt(d.s50,2),curva:'TD - Instantânea',dial:fmt(val('t50'),2,'s'),aceito:acceptedRelay(d.s50,.01),obs:obs50,criterio:str('modo50')==='manual'?'Manual':str('modo50')==='secundario'?'Ajuste secundário':`k × inrush (${str('inrush50FSource')})`}));
  rows.push(paramRow({funcao:'51N',descricao:'Sobrecorrente temporizada de neutro/terra',status:str('modo51n')==='desligado'?'desabilitada':'ativa',primario:primFmt(d.p51n,2),secundario:secFmt(d.s51n,3),curva:curvaParamLabel(str('curva51n')),dial:'TMS/TD '+fmt(val('tms51n'),2,''),aceito:acceptedRelay(d.s51n,.01),obs:`FT mín/ref. ${fmt(d.iccTerra,1,'A')}; tempo ${Number.isFinite(d.tempo51n)?fmt(d.tempo51n,3,'s'):'não atua'}.`,criterio:criterio51n}));
  rows.push(paramRow({funcao:'50N',descricao:'Instantânea de neutro/terra',status:str('modo50n')==='bloqueado'?'desabilitada':(d.p50n>d.iccTerra?'avaliar':'ativa'),primario:primFmt(d.p50n,2),secundario:secFmt(d.s50n,3),curva:'TD - Instantânea',dial:fmt(val('t50n'),2,'s'),aceito:acceptedRelay(d.s50n,.01),obs:obs50n,criterio:criterio50n}));
  rows.push(paramRow({funcao:'51NS/51GS',descricao:'Terra sensível do cliente',status:d.p51ns>0?(nsDom?'ativa':'avaliar'):'desabilitada',primario:primFmt(d.p51ns,2),secundario:secFmt(d.s51ns,3),curva:curvaParamLabel(str('curva51ns')),dial:fmt(val('t51ns'),2,'s'),aceito:acceptedRelay(d.s51ns,.01),obs:obs51ns,criterio:criterio51ns}));
  rows.push(paramRow({funcao:'51GS',descricao:'Ground sensitive / terra sensível alternativa',status:d.p51gs>0?'ativa':'desabilitada',primario:d.p51gs>0?primFmt(d.p51gs,2):'Não habilitada',secundario:d.p51gs>0?secFmt(d.s51gs,3):'-',curva:d.p51gs>0?curvaParamLabel(str('curva51gs')):'-',dial:d.p51gs>0?fmt(val('t51gs'),2,'s'):'-',aceito:d.p51gs>0?acceptedRelay(d.s51gs,.01):'-',obs:d.p51gs>0?'Função sensível independente; não altera 51N nem 51NS automaticamente.':'Desabilitada. Justificativa: '+justSens,criterio:'Função sensível independente quando aplicável'}));
  rows.push(paramRow({funcao:'27',descricao:'Subtensão',status:str('modo27')==='Desabilitado'?'desabilitada':'ativa',primario:fmt(d.v27p/1000,2,'kV'),secundario:fmt(d.v27s,1,'V sec'),curva:'Tensão',dial:fmt(val('t27'),2,'s'),aceito:acceptedRelay(d.v27s,.1,'V sec'),obs:str('modo27'),criterio:`${fmt(val('v27'),0,'%')} Vn`}));
  rows.push(paramRow({funcao:'59',descricao:'Sobretensão',status:str('modo59')==='desligado'?'desabilitada':'ativa',primario:fmt(d.v59p/1000,2,'kV'),secundario:fmt(d.v59s,1,'V sec'),curva:'Tensão',dial:fmt(val('t59'),2,'s'),aceito:acceptedRelay(d.v59s,.1,'V sec'),obs:'Supervisão/atuação conforme filosofia adotada.',criterio:`${fmt(val('v59'),0,'%')} Vn / ${str('modo59')}`}));
  rows.push(paramRow({funcao:'47',descricao:'Sequência negativa / perda de fase',status:str('modo47')==='desligado'?'desabilitada':'ativa',primario:fmt(val('v47'),0,'%'),secundario:'relé',curva:'Tensão',dial:fmt(val('t47'),2,'s'),aceito:fmt(val('v47'),0,'%'),obs:'Confirmar compatibilidade com o relé aplicado.',criterio:`Supervisão por tensão negativa / ${str('modo47')}`}));
  rows.push(paramRow({funcao:'50BF/74/86/98',descricao:'Funções complementares',status:'info',primario:'-',secundario:'-',curva:'Complementares',dial:`74 ${fmt(val('t74'),1,'s')}`,aceito:`${str('bfEnable')} / ${str('bloqueio86')}`,obs:`Oscilografia: ${str('oscilografia')}.`,criterio:'Filosofia operacional'}));
  if(val('m51f')>0) rows.push(paramRow({funcao:'51 Mont.',descricao:'Sobrecorrente temporizada de fase montante',status:'info',primario:primFmt(val('m51f'),2),secundario:'-',curva:curvaParamLabel(str('mCurvaF')),dial:'TMS/TD '+fmt(val('mTmsF'),2,''),aceito:'-',obs:'Referência para coordenação com a proteção do cliente.',criterio:'Concessionária/montante'}));
  if(val('m50f')>0) rows.push(paramRow({funcao:'50 Mont.',descricao:'Instantânea de fase montante',status:'info',primario:primFmt(val('m50f'),1),secundario:'-',curva:'TD - Instantânea',dial:fmt(val('mT50f'),2,'s'),aceito:'-',obs:'Comparar com 50 fase do cliente.',criterio:'Concessionária/montante'}));
  if(val('m51n')>0) rows.push(paramRow({funcao:'51N Mont.',descricao:'Temporizada de neutro/terra montante',status:'info',primario:primFmt(val('m51n'),2),secundario:'-',curva:curvaParamLabel(str('mCurvaN')),dial:'TMS/TD '+fmt(val('mTmsN'),2,''),aceito:'-',obs:'Referência para coordenação de neutro.',criterio:'Concessionária/montante'}));
  if(val('m50n')>0) rows.push(paramRow({funcao:'50N Mont.',descricao:'Instantânea de neutro/terra montante',status:'info',primario:primFmt(val('m50n'),2),secundario:'-',curva:'TD - Instantânea',dial:fmt(val('mT50n'),2,'s'),aceito:'-',obs:'Comparar com 50N do cliente.',criterio:'Concessionária/montante'}));
  if(val('m51ns')>0 || val('m51gs')>0) rows.push(paramRow({funcao:'51NS/GS Mont.',descricao:'Terra sensível de montante',status:'info',primario:primFmt(Math.max(val('m51ns'),val('m51gs')),2),secundario:'-',curva:curvaParamLabel(val('m51ns')>0?str('mCurva51ns'):str('mCurva51gs')),dial:fmt(val('m51ns')>0?val('mT51ns'):val('mT51gs'),2,'s'),aceito:'-',obs:'Usar conforme dados reais da concessionária/relé montante.',criterio:'Montante sensível'}));
  $('tblParam').innerHTML=rows.join('');
  const ativas=PARAM_ROWS.filter(r=>String(r.status).toLowerCase()==='ativa').length;
  const avaliar=PARAM_ROWS.filter(r=>String(r.status).toLowerCase()==='avaliar').length;
  const desab=PARAM_ROWS.filter(r=>String(r.status).toLowerCase()==='desabilitada').length;
  $('paramResumo').innerHTML=`<div class="diagCard ok"><b>✅ Funções ativas</b><br>${ativas} funções com status ativo para parametrização ou análise.</div><div class="diagCard warn"><b>⚠️ Funções para avaliar</b><br>${avaliar} itens exigem revisão técnica antes de lançar no relé.</div><div class="diagCard info"><b>ℹ️ Desabilitadas/informativas</b><br>${desab} funções desabilitadas e ${PARAM_ROWS.length-ativas-avaliar-desab} itens informativos.</div>`;
}
function exportParamCSV(){
  const text=paramCSVText();
  const blob=new Blob([text],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='coordenograma_parametrizacao.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),800);
}
function paramCSVText(){
  if(!PARAM_ROWS.length) renderParam(calcData(false));
  const header=['Função ANSI','Descrição','Status','Pickup primário','Pickup secundário','Curva / Família','Dial / Tempo','Valor aceito no relé','Observação técnica','Origem / Critério'];
  const esc=s=>'"'+String(s??'').replace(/<[^>]*>/g,'').replace(/"/g,'""')+'"';
  const lines=[header.map(esc).join(';')].concat(PARAM_ROWS.map(r=>[r.funcao,r.descricao,r.status,r.primario,r.secundario,r.curva,r.dial,r.aceito,r.obs,r.criterio].map(esc).join(';')));
  return lines.join('\n');
}
function copiarParam(){
  if(!PARAM_ROWS.length) renderParam(calcData(false));
  const txt=PARAM_ROWS.map(r=>`${r.funcao}\t${r.descricao}\t${r.status}\t${r.primario}\t${r.secundario}\t${r.curva}\t${r.dial}\t${r.aceito}\t${r.obs}\t${r.criterio}`).join('\n');
  if(navigator.clipboard) navigator.clipboard.writeText(txt);
}

function setFieldStatus(id,state){const e=$(id); if(!e)return; delete e.dataset.valid; delete e.dataset.error; if(state==='ok')e.dataset.valid='1'; if(state==='bad')e.dataset.error='1'; paintField(e);}

function validarEntradas360(d){
  const erros=[]; const req=(id,msg)=>{if(!(val(id)>0))erros.push({id,msg})};
  ['kva','kv','tcPrim','tcSec','icc3f','iccftmin','inrush','ansi','nansi'].forEach(id=>req(id,'Campo obrigatório inválido: '+id));
  if(str('base51')!=='desligado'&&d.p51<=0)erros.push({id:'p51Manual',msg:'Pickup 51 fase inválido.'});
  if(str('modo50')!=='desligado'&&d.p50<=0)erros.push({id:'p50Manual',msg:'Pickup 50 fase inválido.'});
  if(str('modo51n')!=='desligado'&&d.p51n<=0)erros.push({id:'p51n',msg:'Pickup 51N inválido.'});
  if(str('modo50n')!=='bloqueado'&&d.p50n<=0)erros.push({id:'p50n',msg:'Pickup 50N inválido.'});
  if(str('base51')!=='desligado'&&val('tms51')<=0)erros.push({id:'tms51',msg:'TMS/tempo 51 inválido.'});
  if(str('modo51n')!=='desligado'&&val('tms51n')<=0)erros.push({id:'tms51n',msg:'TMS/tempo 51N inválido.'});
  return erros;
}
function marcarCamposInvalidos360(erros){$$('.field').forEach(f=>f.classList.remove('invalid')); erros.forEach(e=>{const el=$(e.id); const f=el?.closest('.field'); if(f)f.classList.add('invalid')});}
function estagiosClienteNeutro360(d){return[
  {fn:'51NS',pick:d.p51ns,curva:str('curva51ns')||'TD',t:val('t51ns')},
  {fn:'51GS',pick:d.p51gs,curva:str('curva51gs')||'TD',t:val('t51gs')},
  {fn:'51N',pick:d.p51n,curva:str('curva51n'),t:val('tms51n')},
  {fn:'50NS',pick:val('p50ns'),curva:'TD',t:val('t50ns'),inst:true,limit:d.p50n||d.p50||0},
  // Mesh strict: o trecho instantâneo do neutro/terra é plotado até o próximo estágio instantâneo de fase,
  // quando houver, reproduzindo a envoltória visual típica de relés 50/51 + 50N/51N.
  {fn:'50N',pick:d.p50n,curva:'TD',t:val('t50n'),inst:true,limit:val('p50Manual')||d.p50||0}
].filter(e=>e.pick>0&&(e.inst||e.t>0))}
function estagiosMontanteNeutro360(){return[
  {fn:'51NS montante',pick:val('m51ns'),curva:str('mCurva51ns')||'TD',t:val('mT51ns')},
  {fn:'51GS montante',pick:val('m51gs'),curva:str('mCurva51gs')||'TD',t:val('mT51gs')},
  {fn:'51N montante',pick:val('m51n'),curva:str('mCurvaN'),t:val('mTmsN')},
  {fn:'50NS montante',pick:val('m50ns'),curva:'TD',t:val('mT50ns'),inst:true,limit:val('m50n')||val('m50f')||0},
  {fn:'50N montante',pick:val('m50n'),curva:'TD',t:val('mT50n'),inst:true,limit:val('m50f')||0}
].filter(e=>e.pick>0&&(e.inst||e.t>0))}
function nsDominaTrecho360(d,lado){const est=lado==='montante'?estagiosMontanteNeutro360():estagiosClienteNeutro360(d); for(let I=1;I<=10000;I*=1.05){const w=winnerNeutro360(I,est); if(w&&(w.includes('51NS')||w.includes('51GS')))return true} return false;}
function nsGsSobreposto51N360(pick51n,pickSens){
  if(!(pick51n>0&&pickSens>0))return false;
  const ratio=pickSens/pick51n;
  return ratio>=0.75&&ratio<=1.35;
}
function usaCurvaSEL360(){return [str('curva51'),str('curva51n'),str('curva51ns'),str('curva51gs'),str('mCurvaF'),str('mCurvaN'),str('mCurva51ns'),str('mCurva51gs')].some(c=>/^U[1-5]$/.test(normCurve360(c)))}
function diagnosticoTecnico360(d){const msgs=[]; const ok=m=>msgs.push({t:'ok',m}), warn=m=>msgs.push({t:'warn',m}), info=m=>msgs.push({t:'info',m}), bad=m=>msgs.push({t:'bad',m}); const erros=validarEntradas360(d); if(erros.length)bad('Existem campos obrigatórios inválidos. Corrija os dados destacados antes de confiar no estudo.');
  info('Filosofia selecionada: '+d.filosofia.label+'. O preset é orientação configurável e deve ser conferido com o parecer aplicável.');
  if(str('modo50')!=='desligado'&&d.p50<=d.inrush50F)warn('50 fase do cliente está igual ou abaixo do inrush escolhido para 50F. Avaliar risco de atuação indevida na energização.'); else if(str('modo50')!=='desligado')ok('50 fase do cliente está acima do inrush escolhido para 50F.');
  if(str('base51')!=='desligado'&&d.p51<d.iDem*1.05)warn('51 fase está abaixo de 1,05 x demanda. Verificar compatibilidade com carga e filosofia selecionada.');
  if(val('m50f')>0){ if(d.p50>=val('m50f'))warn('50 fase cliente está igual ou acima do 50 fase montante.'); else ok('50 fase cliente está abaixo do 50 fase montante.'); }
  if(nsGsSobreposto51N360(d.p51n,d.p51ns)||nsGsSobreposto51N360(d.p51n,d.p51gs))warn('51NS/51GS encontra-se sobreposta ou próxima da 51N. Verificar coordenação e seletividade.');
  if(d.p51ns>0&&!nsDominaTrecho360(d,'cliente'))warn('51NS cliente está habilitada, porém não domina nenhum trecho da curva composta.');
  if(nsGsSobreposto51N360(val('m51n'),val('m51ns'))||nsGsSobreposto51N360(val('m51n'),val('m51gs')))warn('51NS/51GS montante encontra-se sobreposta ou próxima da 51N montante.');
  if(val('m51ns')>0&&!nsDominaTrecho360(d,'montante'))warn('51NS montante está habilitada, porém não domina nenhum trecho da curva composta.');
  if(str('modo50n')!=='bloqueado'&&d.p50n>d.iccTerra)warn('50N cliente está acima da corrente fase-terra mínima/de referência. Pode não atuar para faltas à terra mínimas.');
  if(str('modo51ns')!=='desligado'&&d.p51ns>0&&(d.p51ns<3||d.p51ns>6)&&['mesh','neoenergia','energisa'].includes(str('protectionPhilosophy')))warn('51NS está fora da faixa indicativa de 3 A a 6 A para a filosofia selecionada.');
  const expected=d.filosofia.fields||{};
  const divergent=Object.entries(expected).filter(([id,v])=>$(id)&&String($(id).value)!==String(v)).map(([id])=>id);
  if(divergent.length)info('Configuração possui ajustes diferentes do preset selecionado: '+divergent.slice(0,5).join(', ')+(divergent.length>5?'...':'')+'.');
  if(val('ansi')<=d.p50)warn('ANSI está igual ou abaixo do 50 fase. Avaliar coordenação com suportabilidade do transformador.');
  if(val('nansi')<=d.p50n)warn('NANSI está igual ou abaixo do 50N. Avaliar coordenação de neutro.');
  if(usaCurvaSEL360())info('Curva SEL/IEEE U aplicada. Conferir equivalência com o ajuste real do relé.');
  ['curva51','curva51n','curva51ns','curva51gs','mCurvaF','mCurvaN','mCurva51ns','mCurva51gs'].forEach(id=>{ if(normCurve360(str(id))==='U3') info('Curva U3 representa SEL/IEEE Very Inverse, não IEC Muito Inversa.');});
  info('Curvas: cliente fase '+curvaNome360(str('curva51'))+'; cliente neutro '+curvaNome360(str('curva51n'))+'; montante fase '+curvaNome360(str('mCurvaF'))+'; montante neutro '+curvaNome360(str('mCurvaN'))+'.');
  return {erros,msgs};
}
function renderDiagnósticoTecnico360(d){const r=diagnosticoTecnico360(d); marcarCamposInvalidos360(r.erros); const icon={ok:'✅',warn:'⚠️',bad:'❌',info:'ℹ️'}; return '<div class="divider">Diagnóstico técnico integrado</div><div class="diagBox">'+r.msgs.map(x=>'<div class="diagCard '+x.t+'"><b>'+icon[x.t]+' '+(x.t==='ok'?'OK':x.t==='warn'?'Atenção':x.t==='bad'?'Erro':'Info')+'</b><br>'+x.m+'</div>').join('')+'</div>';}
function diagnosticoAvancadoSeletividade54(d){
  const itens=[];
  const add=(nivel,titulo,achado,acao)=>itens.push({nivel,titulo,achado,acao});
  const ratio=(a,b)=>b>0?a/b:Infinity;
  if(val('m51f')>0){
    const r=ratio(val('m51f'),d.p51);
    if(r<1.15)add('bad','51 fase sem separação adequada',`Pickup montante/clientes = ${fmt(r,2,'')}.`,'Revisar pickup 51 do cliente ou confirmar ajuste real da proteção de montante.');
    else if(r<1.5)add('warn','51 fase com margem estreita',`Pickup montante/clientes = ${fmt(r,2,'')}.`,'Conferir margem temporal no coordenograma e curva oficial da concessionária.');
    else add('ok','51 fase com separação preliminar',`Pickup montante/clientes = ${fmt(r,2,'')}.`,'Manter validação gráfica e documental.');
  }else add('warn','51 montante ausente','Não há referência de 51 fase montante informada.','Inserir dados da concessionária/religador para concluir seletividade.');
  if(val('m50f')>0){
    if(d.p50>=val('m50f'))add('bad','50 fase conflitante','Instantâneo do cliente igual ou acima do instantâneo montante.','Reduzir 50 do cliente, elevar/validar montante ou bloquear função conforme filosofia aprovada.');
    else if(d.p50>val('m50f')*.8)add('warn','50 fase próximo do montante','Instantâneo do cliente acima de 80% do montante.','Confirmar seletividade e margem de segurança com curvas reais.');
    else add('ok','50 fase abaixo do montante','Instantâneo do cliente preserva separação preliminar.','Confirmar atuação para faltas internas de alta magnitude.');
  }
  if(d.p50<=d.inrush50F)add('bad','50 fase vulnerável ao inrush','Pickup 50 não está acima do inrush escolhido para 50F.','Aumentar margem do 50 ou revisar critério de inrush/múltiplos transformadores.');
  else if(d.p50<d.inrush50F*1.25)add('warn','50 fase com pouca folga sobre inrush',`Folga = ${fmt(d.p50/Math.max(d.inrush50F,.01),2,'')} x inrush usado na 50F.`,'Avaliar energização simultânea e tolerâncias do relé.');
  if(d.p51n>=d.iccTerra)add('bad','51N pode não enxergar falta à terra mínima','Pickup 51N igual/acima da corrente FT mínima/de referência.','Reduzir pickup 51N ou revisar corrente de curto informada.');
  else add('ok','51N sensível à FT mínima','Pickup 51N abaixo da referência de falta à terra.','Confirmar coordenação temporal com montante.');
  if(d.p50n>=d.iccTerra)add('warn','50N acima da FT mínima','Instantâneo de neutro pode não atuar na menor falta considerada.','Validar se a atuação instantânea deve cobrir apenas faltas de maior magnitude.');
  if(!d.tcOk)add('bad','TC requer revisão','ALF efetivo/burden pode ser insuficiente para a maior falta.','Conferir cabo, resistência interna, classe, burden real e saturação com fabricante.');
  else add('ok','TC atende preliminarmente','Burden e ALF efetivo passaram na verificação automática.','Manter conferência documental.');
  if(val('ansi')<=d.p50)add('warn','ANSI próximo/abaixo do 50','Ponto ANSI fica antes do ajuste instantâneo de fase.','Revisar suportabilidade do transformador e filosofia de atuação instantânea.');
  if(val('nansi')<=d.p50n)add('warn','NANSI próximo/abaixo do 50N','Ponto NANSI fica antes do ajuste instantâneo de neutro.','Revisar referência térmica de neutro/terra.');
  return itens;
}
function renderDiagnosticoAvancado54(d){
  const icon={ok:'OK',warn:'Atenção',bad:'Crítico',info:'Info'};
  const itens=diagnosticoAvancadoSeletividade54(d);
  return '<div class="divider">Diagnóstico avançado de seletividade</div><div class="diagBox">'+itens.map(x=>`<div class="diagCard ${x.nivel}"><b>${icon[x.nivel]||'Info'} — ${x.titulo}</b><br>${x.achado}<br><span class="small">${x.acao}</span></div>`).join('')+'</div>';
}
function renderValid(d){
  ['p51Manual','mult51','p50Manual','p51n','p50n','p51ns','p51gs','tcPrim','tcSec','rtc','tpPrim','tpSec','rtp','inrush','ansi','nansi'].forEach(id=>setFieldStatus(id,''));
  const issues=[], ok=[], notes=[];
  if(d.multi && d.multi.ativos>1){notes.push(`Múltiplos transformadores: ${d.multi.ativos} unidades ativas; inrush equivalente por ${d.multi.metodoTxt}.`);}
  if(d.multi && d.multi.ativos>1 && Math.abs(val('inrush')-d.multi.inrushTotal)<0.5){ok.push('Inrush equivalente dos transformadores associados aplicado ao estudo e ao coordenograma.');}
  if(d.multi && d.multi.lista?.some(t=>Math.abs((t.z||0)-d.multi.zEq)>1.5)){issues.push('Existem transformadores com impedâncias significativamente diferentes; avaliar contribuição individual de curto-circuito quando aplicável.');}
  const add=(pass,okTxt,badTxt,ids=[])=>{(pass?ok:issues).push(pass?okTxt:badTxt); ids.forEach(id=>setFieldStatus(id,pass?'ok':'bad'));};
  add(str('base51')==='manual' || val('mult51')>0,'Multiplicador 51 positivo para cálculo automático.','Multiplicador 51 deve ser maior que zero; o pickup 51 automático foi invalidado para não manter valor antigo/cache.',['mult51','p51Manual']);
  add(d.p51>d.iDem,'51 fase acima da corrente de demanda considerada, conforme critério técnico adotado.','51 fase está abaixo ou muito próxima da corrente de demanda; revisar pickup para evitar atuação em regime normal.',['p51Manual']);
  if(str('base51')==='demanda') add(d.p51<d.inAT,'Filosofia por demanda: 51 fase abaixo da corrente nominal do transformador e acima da demanda.','Filosofia por demanda selecionada, mas 51 fase não ficou abaixo da corrente nominal do transformador; revisar multiplicador ou filosofia.',['p51Manual']);
  else notes.push('Pickup 51 não está em filosofia pura de demanda; comparar com In do transformador conforme critério adotado.');
  add(d.p50>=d.p50Auto && d.p50>d.inrush50F,'50 fase atende inrush × margem e fica acima do inrush selecionado para 50F.','50 fase está menor que inrush × margem ou menor/igual ao inrush selecionado para 50F; revisar margem instantânea ou filosofia de bloqueio.',['p50Manual','inrush50FSource']);
  add(val('m50f')===0 || d.p50<val('m50f'),'50 fase cliente abaixo do 50 fase montante informado.','50 fase cliente está igual ou acima do 50 fase montante informado; revisar coordenação.',['p50Manual']);
  add(d.p51n>0 && d.p51n<d.iccTerra,'51N sensível à falta fase-terra mínima/de referência.','51N não está sensível à falta fase-terra mínima/de referência informada.',['p51n']);
  add(str('modo50n')!=='autoIcc80' || d.p50n===d.p50nLimiteIcc80,'50N automático usa explicitamente 80% da Icc FT mínima.','50N não deve ser substituído por 80% da Icc FT mínima fora do modo automático escolhido pelo operador.',['p50n']);
  add(d.p50n>=10 && d.p50n<=100,'50N dentro da faixa configurada de 10 A a 100 A para o caso/modelo informado.','50N fora da faixa configurada de 10 A a 100 A; revisar ajuste adotado ou faixa normativa.',['p50n']);
  add(d.p50n>d.p51n && (val('m50n')===0 || d.p50n<val('m50n')),'50N acima do 51N e abaixo do 50N montante informado, quando aplicável.','50N não está coerente com 51N ou com o 50N montante informado; revisar coordenação de terra.',['p50n']);
  add(d.p51ns>=3 && d.p51ns<=6,'51NS/51GS respeita a faixa configurada de 3 A a 6 A para o exemplo base.','51NS/51GS fora da faixa configurada de 3 A a 6 A; revisar modo, valor manual ou filosofia.',['p51ns','p51gs']);
  add(d.tcOk,'Burden e ALF efetivo do TC tendem a atender na verificação preliminar.','ALF efetivo ou burden do TC pode ser insuficiente para a maior falta informada; validar com dados do fabricante.',['tcPrim','tcSec','rtc']);
  add(d.tcP>0 && d.tcS>0 && d.rtc>0,'TC/RTC informados são válidos para conversão primário/secundário.','TC, secundário do TC ou RTC inválido; correntes secundárias não são confiáveis.',['tcPrim','tcSec','rtc']);
  add(d.tpP>0 && d.tpS>0 && d.rtp>0,'TP/RTP informados são válidos para conversão primário/secundário.','TP, secundário do TP ou RTP inválido; tensões secundárias não são confiáveis.',['tpPrim','tpSec','rtp']);
  add(d.s51>0 && d.s51<=val('tcSec')*20,'Corrente secundária dos ajustes está em faixa usual de entrada do relé.','Corrente secundária calculada pode estar fora de faixa usual do relé; verificar manual do equipamento.',['p51Manual']);
  add(d.m51>1 && Number.isFinite(d.tempo51),'Curva IEC de fase possui múltiplo M maior que 1 e tempo teórico calculável.','Curva IEC de fase não atua no ponto de referência porque M é menor ou igual a 1.',['p51Manual']);
  add(val('m51f')===0 || d.p51<val('m51f'),'Coordenação preliminar: 51 cliente abaixo do pickup 51 montante informado.','51 cliente está igual ou acima do pickup 51 montante; revisar seletividade preliminar.',['p51Manual']);
  if(str('modo27')==='Supervisão, sem trip') notes.push('Função 27 configurada como supervisão sem trip; não deve ser tratada como função de desligamento no resumo executivo.');
  if(str('modo27')==='Desabilitado' && (val('v27')>0 || val('t27')>0)) notes.push('27 está desabilitada, mas há valores preenchidos para referência; confirmar se são apenas registro/supervisão.');
  if(str('btEnable')==='Sim') notes.push(val('djBTIn')>0?'Proteção BT informada para análise em camada própria.':'Proteção BT habilitada, mas corrente do disjuntor BT não foi informada.');
  if(val('m51ns')>0 || val('m51gs')>0) ok.push('Proteção montante de terra sensível informada para análise de coordenação.');
  notes.push('As mensagens usam critérios técnicos adotados e dados informados; não são apresentadas como exigência da Neoenergia sem referência normativa explícita.');
  const cls=issues.length?'status warn':'status';
  $('validações').className=cls;
  $('validações').innerHTML='<strong>Validações técnicas:</strong><br>'+ok.map(x=>'✓ '+x).join('<br>')+(issues.length?'<br>'+issues.map(x=>'⚠ '+x).join('<br>'):'')+'<br><span class="small">'+notes.join('<br>')+'</span>';
  $('coordAnalise').className=cls;
  $('coordAnalise').innerHTML='<strong>Análise preliminar de seletividade:</strong> '+(issues.length?issues.join(' '):'Não foram identificadas inconsistências críticas nos critérios básicos. A margem de seletividade deve ser confirmada no coordenograma final, nos dados oficiais da concessionária e nos limites parametrizáveis do relé.');
}
function memSection(t,obj,formula,sub,res,interp){return `<div class="memBlock"><h3>${t}</h3><p class="muted"><strong>Objetivo:</strong> ${obj}</p><div class="formula"><strong>Fórmula:</strong> ${formula}<br><strong>Substituição:</strong> ${sub}<br><strong>Resultado:</strong> ${res}</div><p><strong>Interpretação técnica:</strong> ${interp}</p></div>`}
function renderMemory(d){
  const html=[];
  const obs51Instantanea=d.p50>0&&d.icc51>d.p50?' Para correntes superiores ao pickup da função 50, a atuação prática esperada será pela função instantânea 50, respeitando o tempo definido de '+fmt(val('t50'),2,'s')+'. O tempo teórico da curva 51 é apresentado apenas como referência matemática da curva IEC.':'';
  const calc51gs=d.p51gs>0
    ? '51GS = '+fmt(d.p51gs,2,'A')+' / '+fmt(d.rtc,0,'')+' = '+fmt(d.s51gs,3,'A sec')
    : '51GS: Não habilitada / não aplicável neste estudo.';
  const res51gs=d.p51gs>0?'; 51GS tempo = '+fmt(val('t51gs'),2,'s'):'; 51GS sem parametrização de pickup zero';
  html.push(memSection('Cálculo 01 — Corrente nominal do transformador no lado de média tensão','Determinar a corrente base do transformador no primário para referência dos ajustes de proteção.','Iₙ = S / (√3 × V)','Iₙ = '+fmt(d.kva,0,'kVA')+' / (√3 × '+fmt(d.kv,2,'kV')+')','Iₙ AT = '+fmt(d.inAT,2,'A'),'A corrente nominal primária é usada como referência para avaliação da carga, corrente de magnetização, ponto ANSI/NANSI e sensibilidade das funções de sobrecorrente.'));
  html.push(memSection('Cálculo 02 — Corrente de demanda no primário','Converter a demanda ativa considerada para corrente equivalente no lado de média tensão.','Iᴅ = P / (√3 × V × fp)','Iᴅ = '+fmt(d.kw,0,'kW')+' / (√3 × '+fmt(d.kv,2,'kV')+' × '+fmt(d.fp,2,'')+')','Iᴅ = '+fmt(d.iDem,2,'A'),'Este valor serve como referência quando o pickup 51 é baseado na demanda da unidade, evitando atuação indevida em regime normal.'));
  html.push(memSection('Cálculo 03 — Relação do TC e conversão primário/secundário','Converter os ajustes primários para os valores que serão inseridos no relé.','RTC = Iprim / Isec; Isec_ajuste = Iprim_ajuste / RTC','RTC = '+fmt(d.tcP,0,'A')+' / '+fmt(d.tcS,0,'A')+' = '+fmt(d.rtc,0,''),'51 fase = '+fmt(d.p51,2,'A')+' / '+fmt(d.rtc,0,'')+' = '+fmt(d.s51,3,'A sec'),'A conversão primário/secundário é indispensável para parametrizar o relé de acordo com a relação real dos TCs instalados.'));
  html.push(memSection('Cálculo 04 — Corrente de inrush','Estimar a corrente de magnetização do transformador para imunização da função instantânea 50.','Iinrush = Iₙ × múltiplo adotado','Iinrush = '+fmt(d.inAT,2,'A')+' × '+fmt(val('inrushMult'),1,''),'Iinrush = '+fmt(val('inrush'),1,'A'),'A função 50 fase deve ser analisada para não atuar durante a energização do transformador, preservando seletividade e continuidade operacional.'));
  html.push(memSection('Cálculo 05 — Ponto ANSI e NANSI','Definir pontos de referência da curva de dano do transformador para visualização no coordenograma.','IANSI = Iₙ × (100 / Z%); tANSI = tabela ANSI por Z%; INANSI = 0,58 × IANSI','IANSI = '+fmt(d.inAT,2,'A')+' × (100 / '+fmt(val('ztrafo'),2,'')+') = '+fmt(val('ansi'),1,'A')+'; para Z% ≈ '+fmt(val('ztrafo'),2,'')+', tANSI = '+fmt(val('ansiTempo'),2,'s')+'; INANSI = 0,58 × '+fmt(val('ansi'),1,'A'),'IANSI = '+fmt(val('ansi'),1,'A')+' em '+fmt(val('ansiTempo'),2,'s')+'; INANSI = '+fmt(val('nansi'),1,'A')+' em '+fmt(val('nansiTempo'),2,'s'),'ANSI representa o curto franco no secundário referido ao primário. NANSI é a curva deslocada para neutro/terra, usualmente adotada como 0,58 × ANSI em transformadores com delta/Dyn. Os tempos são preenchidos automaticamente pela tabela ANSI por impedância e podem ser alterados pelo operador.'));
  html.push(memSection('Cálculo 06 — Função 51 fase','Calcular o ajuste temporizado de fase e o tempo teórico de atuação na corrente de curto adotada.','t = TMS × k / (M^α − 1), conforme família IEC; M = Icc / Ipickup','M = '+fmt(d.icc51,1,'A')+' / '+fmt(d.p51,2,'A')+' = '+fmt(d.m51,2,''),'t51 = '+(Number.isFinite(d.tempo51)?fmt(d.tempo51,3,'s'):'não atua'),'A função 51 deve permitir a carga normal e atuar para sobrecorrentes dentro da zona protegida, coordenando com as proteções de montante.'+obs51Instantanea));
  html.push(memSection('Cálculo 07 — Função 50 fase','Definir o ajuste instantâneo de fase, observando inrush, curto-circuito e coordenação com a concessionária.','I50 = valor manual ou Iinrush × margem','I50 = '+fmt(d.p50,1,'A')+'; Iinrush = '+fmt(val('inrush'),1,'A'),'I50 secundário = '+fmt(d.s50,2,'A'),'A função 50 deve ser suficientemente alta para não atuar por energização do transformador e suficientemente baixa para atuar em faltas internas de alta magnitude.'));
  html.push(memSection('Cálculo 08 — Função 51N','Verificar sensibilidade da proteção temporizada de terra em relação à falta fase-terra mínima/de referência.','Mterra = IccFT / Ipickup51N','Mterra = '+fmt(d.iccTerra,1,'A')+' / '+fmt(d.p51n,2,'A')+' = '+fmt(d.m51n,2,''),'t51N = '+(Number.isFinite(d.tempo51n)?fmt(d.tempo51n,3,'s'):'não atua'),'O ajuste 51N deve enxergar a menor falta à terra considerada e coordenar com a proteção montante de neutro/terra.'));
  html.push(memSection('Cálculo 09 — Funções 51NS e 51GS','Registrar a proteção de terra sensível conforme nomenclatura disponível no relé.','Isec = Iprim / RTC','51NS = '+fmt(d.p51ns,2,'A')+' / '+fmt(d.rtc,0,'')+' = '+fmt(d.s51ns,3,'A sec')+'; '+calc51gs,'51NS tempo = '+fmt(val('t51ns'),2,'s')+res51gs,'A função de terra sensível pode aparecer como 51NS, 51GS ou 51G sensível, mantendo a finalidade de detectar faltas à terra de baixa magnitude. Quando 51GS não estiver habilitada, o relatório registra a função como não aplicável para evitar parametrização indevida com pickup zero.'));
  html.push(memSection('Cálculo 10 — Função 50N','Definir a atuação instantânea de neutro/terra, respeitando sensibilidade e coordenação com a proteção montante.','I50Nsec = I50Nprim / RTC','I50Nsec = '+fmt(d.p50n,2,'A')+' / '+fmt(d.rtc,0,''),'I50Nsec = '+fmt(d.s50n,3,'A sec')+'; tempo = '+fmt(val('t50n'),2,'s'),'O ajuste 50N deve ser analisado junto com a proteção 51N, curto fase-terra máximo/mínimo e proteção montante. Quando houver restrição da concessionária, o valor informado deve prevalecer sobre a sugestão automática.'));
  html.push(memSection('Cálculo 11 — Verificação preliminar do TC','Avaliar burden real e ALF efetivo para reduzir risco de saturação durante faltas.','Ztotal = Rcabo + Zrelé + Rint; VAreal = Is² × Ztotal; ALFef = ALF × VA nominal / VAreal','Ztotal = '+fmt(d.rCu,3,'Ω')+' + '+fmt(d.zRele,3,'Ω')+' + '+fmt(val('tcRint'),3,'Ω')+' = '+fmt(d.zTotal,3,'Ω')+'; VAreal = '+fmt(d.tcS,0,'A')+'² × '+fmt(d.zTotal,3,'Ω')+' = '+fmt(d.vaReal,2,'VA'),'ALF efetivo = '+fmt(val('tcALF'),0,'')+' × '+fmt(val('tcVA'),2,'VA')+' / '+fmt(d.vaReal,2,'VA')+' = '+fmt(d.alfEf,2,''),'A análise é preliminar e deve ser complementada com dados reais do fabricante, classe de proteção e condição de saturação admissível.'));
  html.push(memSection('Cálculo 12 — Funções 27, 59 e 47','Definir supervisões de tensão e desequilíbrio conforme filosofia do estudo.','Vsec = VTPsec × percentual / 100','27 = '+fmt(d.tpS,0,'V')+' × '+fmt(val('v27'),0,'%')+' = '+fmt(d.v27s,1,'V')+'; 59 = '+fmt(d.tpS,0,'V')+' × '+fmt(val('v59'),0,'%')+' = '+fmt(d.v59s,1,'V'),'47 = '+fmt(val('v47'),0,'%')+' com tempo '+fmt(val('t47'),2,'s'),'As funções de tensão devem ser ajustadas conforme a filosofia aprovada, podendo atuar em trip, supervisão ou alarme.'));
  html.push(memSection('Cálculo 13 — Seletividade preliminar','Comparar os ajustes do cliente com os ajustes de montante disponíveis e identificar conflitos evidentes antes da análise gráfica final.','Comparação direta de pickups e tempos nos pontos de curto informados','51 cliente = '+fmt(d.p51,2,'A')+'; 51 montante = '+fmt(val('m51f'),2,'A')+'; 50 cliente = '+fmt(d.p50,2,'A')+'; 50 montante = '+fmt(val('m50f'),2,'A'),'Resultado preliminar apresentado na aba de validações técnicas.','Esta verificação é um critério técnico adotado de coordenação preliminar. A conclusão final deve considerar o coordenograma, curvas oficiais do equipamento, dados da concessionária e eventuais restrições do parecer de acesso.'));
  html.push(memSection('Cálculo 14 — Proteção BT','Registrar a proteção geral de baixa tensão quando informada e sua referência equivalente no lado de média tensão.','IBT_ref_MT = IDJBT × VBT / VAT','IBT_ref_MT = '+fmt(val('djBTIn'),0,'A')+' × '+fmt(d.vbt,0,'V')+' / '+fmt(d.kv*1000,0,'V'),'IBT_ref_MT = '+fmt(val('djBTIn')*d.vbt/(d.kv*1000),2,'A'),'Quando habilitada, a proteção BT é exibida como camada auxiliar no coordenograma e deve ser confirmada com curva real do disjuntor ou unidade de disparo.'));
  html.push(memSection('Cálculo 15 — Conclusão técnica preliminar','Consolidar a leitura dos ajustes gerados e reforçar a responsabilidade de validação técnica do estudo.','Síntese técnica dos resultados calculados','Ajustes calculados a partir dos dados do operador, modelo inicial revisado, critérios técnicos adotados e proteções montante informadas.','Estudo preliminar pronto para revisão técnica.','Os resultados devem ser validados pelo responsável técnico com os dados oficiais da concessionária, manual do relé, curvas reais de fusíveis/religadores/disjuntores e ensaios de comissionamento. Nenhuma margem de seletividade é tratada como exigência da Neoenergia sem referência normativa explícita.'));
  $('memoria').innerHTML=html.join('');
}
function fuseBaseCoordV511(){
  const type=str('coordFuseType')||'65K';
  if(type==='manual') return Math.max(val('coordFuseManual')||65,1);
  const n=parseFloat(String(type).replace('K',''));
  return Number.isFinite(n)&&n>0?n:65;
}
function fuseLabelCoordV511(){
  const type=str('coordFuseType')||'65K';
  const lbl=str('coordFuseLabel')||'Fusível montante';
  return type==='manual'?`${lbl} ${fmt(fuseBaseCoordV511(),0,'A')}`:`${lbl} ${type}`;
}
function fuseTimeV513(x,scale=1){
  const base=fuseBaseCoordV511()*Math.max(val('coordFuseShift')||1,.01);
  const M=x/base;
  if(!(M>1.01))return Infinity;
  const t2=Math.max(val('fuseT2')||18,.01);
  const exp=Math.max(val('fuseExp')||2.05,.1);
  return scale*t2/Math.pow(Math.max(M-1,.02),exp);
}
function coordHHFuseItems54(d){
  const colors=['#0369a1','#0f766e','#7c3aed','#b45309','#be123c','#2563eb','#15803d','#9333ea'];
  return ((d?.multi?.lista)||[]).filter(t=>t.hhMode&&t.hhMode!=='sem'&&(Number(t.hhFuse)||0)>0).map((t,idx)=>{
    const base=Number(t.hhFuse)||0;
    const tag=t.tag||('TRF'+String(idx+1).padStart(2,'0'));
    const modo=t.hhMode==='auto'?'HH auto':String(t.hhMode).toUpperCase();
    return {tag,base,mode:t.hhMode,label:`Fusível HH ${tag} ${fmt(base,1,'A')}`,legend:`${modo} ${tag}`,color:colors[idx%colors.length],dash:idx%2?[2,4]:[4,3]};
  });
}
function coordFeatureKey64(kind,tag){return `${kind}_${String(tag||'ref').replace(/[^\w-]+/g,'_')}`;}
function coordFeatureOn64(kind,tag){
  const key=coordFeatureKey64(kind,tag);
  const cb=document.querySelector(`[data-coord-feature="${key}"]`);
  if(cb) return cb.checked!==false;
  window.coordFeatureVisibility=window.coordFeatureVisibility||{};
  if(typeof window.coordFeatureVisibility[key]==='undefined') window.coordFeatureVisibility[key]=true;
  return window.coordFeatureVisibility[key]!==false;
}
function renderCoordTrafoToggles64(d){
  const host=document.getElementById('coordTrafoToggles');
  if(!host)return;
  const multi=d?.multi||calcTrafosV507();
  const lista=(multi?.lista||[]).slice(0,10);
  const rows=[];
  lista.forEach((t,i)=>{
    const tag=t.tag||('TRF'+String(i+1).padStart(2,'0'));
    [['ansi','ANSI'],['nansi','NANSI']].forEach(([kind,label])=>{
      const key=coordFeatureKey64(kind,tag);
      rows.push(`<label class="coordSwitch miniFeature"><input type="checkbox" data-coord-feature="${key}" data-kind="${kind}" data-tag="${tag}" ${coordFeatureOn64(kind,tag)?'checked':''}><span class="swText">${label} ${tag}</span><span class="swKnob"></span></label>`);
    });
    if(t.hhMode&&t.hhMode!=='sem'&&(Number(t.hhFuse)||0)>0){
      const key=coordFeatureKey64('hh',tag);
      rows.push(`<label class="coordSwitch miniFeature"><input type="checkbox" data-coord-feature="${key}" data-kind="hh" data-tag="${tag}" ${coordFeatureOn64('hh',tag)?'checked':''}><span class="swText">HH ${tag}</span><span class="swKnob"></span></label>`);
    }
  });
  host.innerHTML=rows.length?`<div class="coordLineGroupTitle">Por transformador</div>${rows.join('')}`:'';
}
function coordHHFuseCurvePts54(base,xmin,xmax){
  const pts=[]; const start=Math.max(xmin,base*1.02), stop=xmax;
  if(!(base>0&&stop>start))return pts;
  for(let i=0;i<420;i++){
    const x=start*Math.pow(stop/start,i/419), M=x/base;
    const tt=12/Math.pow(Math.max(M-1,.02),2.15);
    if(Number.isFinite(tt)&&tt>0)pts.push({x,y:tt});
  }
  return pts;
}
function coordAnsiMarkersV54(d){
  const mode=str('coordAnsiMode')||'todos';
  const tempoA=val('ansiTempo')||3, tempoN=val('nansiTempo')||3;
  const multi=d?.multi||calcTrafosV507();
  const out=[];
  const mk=(tag,ansi,nansi,idx,total=false)=>{
    const off=(idx%5)*8;
    if(ansi>0&&coordFeatureOn64('ansi',tag)) out.push({x:ansi,y:tempoA,l:total?'AΣ':('A'+(idx+1)),name:total?'ANSI total':('ANSI '+tag),c:'#4d7c0f',dx:18+off,dy:-4,shape:'tri',tag,kind:'ansi'});
    if(nansi>0&&coordFeatureOn64('nansi',tag)) out.push({x:nansi,y:tempoN,l:total?'NΣ':('N'+(idx+1)),name:total?'NANSI total':('NANSI '+tag),c:'#4338ca',dx:-18-off,dy:-4,shape:'tri',tag,kind:'nansi'});
  };
  if(!multi||!multi.lista?.length||mode==='adotada'){mk('ref.',val('ansi'),val('nansi'),28,false);return out;}
  const lista=multi.lista||[];
  if(mode==='todos'){lista.forEach((t,i)=>mk(t.tag||('TRF'+(i+1)),t.ansi,t.nansi,i,false));return out;}
  if(mode==='total'){const an=ansiNansiFromTrafo(multi.inTotal,multi.zEq,multi.lista?.[0]?.ligacao||'Dyn1');mk('total',an.ansi,an.nansi,0,true);return out;}
  let t=multi.maior;
  if(mode==='menor')t=multi.menor;
  else if(mode==='selecionado')t=lista.find(x=>x.tag===str('ansiRefTag'))||multi.maior;
  mk(t?.tag||'ref.',t?.ansi||val('ansi'),t?.nansi||val('nansi'),0,false);
  return out;
}
function buildCoordReferenceItems54(d,visibleFn=()=>true){
  const show=k=>visibleFn(k)!==false, refs=[], pos=v=>Number.isFinite(Number(v))&&Number(v)>0;
  const add=item=>{if(item&&pos(item.x)&&pos(item.y)&&item.visible!==false)refs.push(Object.assign({shape:'circle',extra:'',dx:0,dy:0},item));};
  const inrushTag=d?.multi?.refTag||d?.multi?.maior?.tag||'TRF01';
  add({key:'c51n',tag:'51N cliente',desc:'Partida 51N cliente',value:d.p51n,x:d.p51n,y:.01,color:'#7e22ce',visible:show('c51n'),dx:-42});
  add({key:'c51f',tag:'51F cliente',desc:'Partida 51F cliente',value:d.p51,x:d.p51,y:.01,color:'#2563eb',visible:show('c51f'),dx:-28});
  add({key:'c50n',tag:'50N cliente',desc:'Partida 50N cliente',value:d.p50n,x:d.p50n,y:coordInstantDelay360(val('t50n')),color:'#ea580c',visible:show('c50n'),extra:' / '+fmt(coordInstantDelay360(val('t50n')),2,'s'),dy:-18});
  add({key:'c50f',tag:'50F cliente',desc:'Partida 50F cliente',value:d.p50,x:d.p50,y:coordInstantDelay360(val('t50')),color:'#f97316',visible:show('c50f'),extra:' / '+fmt(coordInstantDelay360(val('t50')),2,'s'),dy:-18});
  add({key:'ftmin',tag:'FT mín.',desc:'FT mín.',value:val('iccftmin'),x:val('iccftmin'),y:.01,color:'#16a34a',dx:-12,dy:-5});
  add({key:'ftmax',tag:'FT máx.',desc:'FT máx.',value:val('iccftmax'),x:val('iccftmax'),y:.01,color:'#ca8a04',dx:36,dy:-52});
  add({key:'inrush',tag:'Inrush '+inrushTag,desc:'Inrush '+inrushTag,value:val('inrush'),x:val('inrush'),y:.1,color:'#0891b2',dx:-34,dy:-10});
  add({key:'m51n',tag:'51N montante',desc:'Partida 51N montante',value:val('m51n'),x:val('m51n'),y:.01,color:'#a16207',visible:show('m51n'),dx:-26,dy:-18});
  add({key:'m51f',tag:'51F montante',desc:'Partida 51F montante',value:val('m51f'),x:val('m51f'),y:.01,color:'#dc2626',visible:show('m51f'),dx:20,dy:-22});
  add({key:'icc3f',tag:'Icc 3F',desc:'Icc 3F',value:val('icc3f'),x:val('icc3f'),y:.01,color:'#db2777',dx:42,dy:-14});
  add({key:'icc2f',tag:'Icc 2F',desc:'Icc 2F',value:val('icc2f'),x:val('icc2f'),y:.01,color:'#7c3aed',dx:54,dy:-26});
  add({key:'m50n',tag:'50N montante',desc:'50N montante',value:val('m50n'),x:val('m50n'),y:coordInstantDelay360(val('mT50n')),color:'#a16207',visible:show('m50n'),extra:' / '+fmt(coordInstantDelay360(val('mT50n')),2,'s'),dx:-36,dy:-22});
  add({key:'m50f',tag:'50F montante',desc:'50F montante',value:val('m50f'),x:val('m50f'),y:coordInstantDelay360(val('mT50f')),color:'#dc2626',visible:show('m50f'),extra:' / '+fmt(coordInstantDelay360(val('mT50f')),2,'s'),dx:42,dy:-18});
  add({key:'c51ns',tag:'51NS cliente',desc:'51NS cliente',value:d.p51ns,x:d.p51ns,y:Math.max(val('t51ns')||.01,.01),color:'#9333ea',visible:show('c51ns'),shape:'tri',dx:28,dy:-5});
  add({key:'m51ns',tag:'51NS montante',desc:'51NS montante',value:val('m51ns'),x:val('m51ns'),y:Math.max(val('mT51ns')||.01,.01),color:'#a16207',visible:show('m51ns'),shape:'tri',dx:30,dy:-10});
  coordAnsiMarkersV54(d).forEach(m=>add({key:m.kind||'ansi',tag:m.name,desc:m.name,value:m.x,x:m.x,y:m.y,color:m.c,shape:'tri',dx:m.dx||0,dy:m.dy||0}));
  if(show('hh'))coordHHFuseItems54(d).filter(item=>coordFeatureOn64('hh',item.tag)).forEach(item=>add({key:'hh',tag:'HH '+item.tag,desc:'HH '+item.tag,value:item.base,x:item.base,y:.01,color:item.color,dx:18,dy:-38}));
  refs.forEach((r,i)=>{r.n=i+1;r.label=String(i+1);});
  return refs;
}
function coordRatioText54(num,den,okMin=1.0){
  if(!(num>0&&den>0))return '-';
  const r=num/den;
  return `${fmt(r,2,'x')} (${r>=okMin?'OK':'revisar'})`;
}
function updateCoordSideStats54(d){
  const set=(id,txt)=>{const el=$(id); if(el)el.textContent=txt;};
  set('coordMargemF',coordRatioText54(val('m50f'),d.p50,1.05));
  set('coordMargemN',coordRatioText54(val('m50n'),d.p50n,1.05));
  const sens=Math.max(d.p51ns||0,d.p51gs||0);
  set('coordMargemS',(sens>0&&d.iccTerra>0)?`${fmt(d.iccTerra/sens,1,'x')} Ipickup (${d.iccTerra>sens?'OK':'revisar'})`:'-');
  set('coordCheckInrush',coordRatioText54(d.p50,d.inrush50F,1.0));
}
function drawChart(d,opts={}){
  const canvas=$('coord'); if(!canvas)return;
  const shell=canvas.parentElement;
  const board=canvas.closest('.coordBoard');
  const focusMode=false; // R3: modo Foco Coordenograma removido para não conflitar com a visualização padrão.
  const focusZoom=Math.min(Math.max(Number(window.coordFocusZoom)||1,0.75),1.60);
  const focusVis=Object.assign({c51f:true,c50f:true,c51n:true,c50n:true,c51ns:true,c50ns:true,m51f:true,m50f:true,m51n:true,m50n:true,m51ns:true,m50ns:true,fuse:true,hh:true},window.coordCurveVisibility||{});
  const show=k=>{
    const cb=document.querySelector(`[data-coord-curve="${k}"]`);
    if(cb) return cb.checked!==false;
    return focusVis[k]!==false;
  };
  const aspect=focusMode?.98:(1040/820);
  const widthCap=focusMode?1100:820;
  const roomW=Math.max(320,Math.min((board?.clientWidth||shell?.clientWidth||widthCap)-26,widthCap));
  const roomH=Math.max(360,(window.innerHeight||900)-(focusMode?118:176));
  const fittedW=Math.min(roomW,Math.floor(roomH/aspect));
  const legacyMaxW=Math.min(820,(shell?.clientWidth?shell.clientWidth-24:820));
  // v6.4.9 FIX: trava o tamanho visual do coordenograma após o primeiro render.
  // Antes, qualquer mudança em marcadores/opções chamava drawChart() sem tamanho fixo;
  // como o painel lateral podia mudar de largura/altura, o canvas recalculava cssW/cssH
  // e dava a sensação de zoom diminuindo ou coordenograma deslocando.
  const requestedW=focusMode?Math.round(Math.max(320,fittedW)*focusZoom):Math.round(Math.max(720,legacyMaxW)*focusZoom);
  const requestedH=focusMode?Math.round(requestedW*aspect):Math.round(requestedW*1040/820);
  const hasExternalSize=Number(opts.cssWidth)>0 || Number(opts.cssHeight)>0;
  const lockedW=Number(canvas.dataset.stableCssWidth)||0;
  const lockedH=Number(canvas.dataset.stableCssHeight)||0;
  const preserveSize=opts.preserveSize===true;
  const forceResize=opts.forceResize===true;
  // FIX v6.4.9-r2: opções visuais podem preservar o tamanho, mas zoom/foco precisam recalcular.
  // O bug anterior usava lockedW/lockedH sempre; por isso os botões -/+ alteravam coordFocusZoom,
  // porém o canvas continuava preso ao tamanho antigo.
  const cssW=Number(opts.cssWidth)||((preserveSize&&!forceResize)?lockedW:0)||requestedW;
  const cssH=Number(opts.cssHeight)||((preserveSize&&!forceResize)?lockedH:0)||requestedH;
  if(!hasExternalSize || forceResize){
    canvas.dataset.stableCssWidth=String(cssW);
    canvas.dataset.stableCssHeight=String(cssH);
  }
  const dpr=Number(opts.pixelRatio)||(focusMode?Math.max(window.devicePixelRatio||1,2):(window.devicePixelRatio||1));
  canvas.width=Math.round(cssW*dpr); canvas.height=Math.round(cssH*dpr);
  canvas.style.setProperty('width',cssW+'px','important');
  canvas.style.setProperty('height',cssH+'px','important');
  canvas.style.imageRendering='auto';
  const ctx=canvas.getContext('2d',{alpha:true,desynchronized:false});
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingEnabled=true;
  if('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality='high';
  const W=cssW,H=cssH;
  const isNight=(str('coordTheme')||'white')==='black';
  const pal=isNight?{
    page:'#06101d', plot:'#071827', border:'#1f3a55', axis:'#78a6c8', gridMajor:'#31516f', gridMinor:'#172b42',
    title:'#eef8ff', subtitle:'#a9c6dd', axisText:'#c7d9ea', tick:'#9fb7cc', markerLine:'rgba(148,196,222,.55)',
    tagFill:'rgba(6,16,29,.94)', tagStroke:'rgba(125,190,220,.55)', tagText:'#eaf7ff', note:'#95b4cb', legendText:'#cfe0ef'
  }:{
    page:'#ffffff', plot:'#fbfdff', border:'#cbd5e1', axis:'#64748b', gridMajor:'#aab8ca', gridMinor:'#e9eef5',
    title:'#111827', subtitle:'#475569', axisText:'#334155', tick:'#475569', markerLine:'#cbd5e1',
    tagFill:'rgba(255,255,255,.94)', tagStroke:'rgba(148,163,184,.68)', tagText:'#0f172a', note:'#64748b', legendText:'#334155'
  };
  const readNum=(id,fb)=>{const el=$(id); const n=Number(String(el?.value??'').replace(',','.')); return Number.isFinite(n)&&n>0?n:fb};
  const readTxt=(id,fb)=>String($(id)?.value||fb||'');
  let xmin=readNum('coordXMin',0.1), xmax=Math.max(readNum('coordXMax',10000),xmin*10);
  let ymin=readNum('coordYMin',.01), ymax=Math.max(readNum('coordYMax',100),ymin*10);
  const refVals=[d.p51,d.p50,d.p51n,d.p50n,d.p51ns,d.p51gs,val('m51f'),val('m50f'),val('m51n'),val('m50n'),val('m51ns'),val('m51gs'),val('icc3f'),val('icc2f'),val('icc2ft'),val('iccftmax'),val('iccftmin'),val('inrush'),val('ansi'),val('nansi'),fuseBaseCoordV511?fuseBaseCoordV511():65,d.inAT,d.iDem].filter(v=>Number.isFinite(v)&&v>0);
  (d.multi?.lista||[]).forEach(t=>{[t.ansi,t.nansi,Number(t.hhFuse)||0].forEach(v=>{if(Number.isFinite(v)&&v>0)refVals.push(v);});});
  if(refVals.length){const minX=Math.min(...refVals),maxX=Math.max(...refVals); xmin=Math.min(xmin,Math.max(.1,Math.pow(10,Math.floor(Math.log10(minX/2))))); xmax=Math.max(xmax,Math.pow(10,Math.ceil(Math.log10(maxX*2))));}
  const L=76,R=46,T=focusMode?28:60,B=focusMode?56:220,PL=L,PR=W-R,PT=T,PB=H-B;
  window.__flCoordGeom={W,H,plotLeft:PL,plotRight:PR,plotTop:PT,plotBottom:PB,xmin,xmax,ymin,ymax};
  buildCoordRenderModel64(d,xmin,xmax,ymin,ymax);
  renderCoordTrafoToggles64(d);
  const lx=x=>Math.log10(x), ly=y=>Math.log10(y);
  const X=x=>PL+((lx(x)-lx(xmin))/(lx(xmax)-lx(xmin)))*(PR-PL);
  const Y=y=>PT+((ly(ymax)-ly(y))/(ly(ymax)-ly(ymin)))*(PB-PT);
  function text(t,x,y,o={}){ctx.save();ctx.fillStyle=o.color||'#1f2937';ctx.font=o.font||'10.4px Segoe UI';ctx.textAlign=o.align||'left';ctx.textBaseline=o.baseline||'alphabetic';ctx.fillText(String(t),x,y);ctx.restore()}
  function line(x1,y1,x2,y2,c='#e2e8f0',w=1,dash=[]){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=w;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()}
  function tick(v){if(v>=1000)return v.toLocaleString('pt-BR',{maximumFractionDigits:0}); return String(v).replace('.',',')}
  // R12: escala visual inspirada no ETAP, sem alterar o layout didático do R8.
  function tickETAP(v){
    if(!(v>0))return '';
    if(v>=1000){ const k=v/1000; return (Number.isInteger(k)?String(k):String(Number(k.toFixed(2))).replace('.',','))+'K'; }
    if(v<1){ return v.toFixed(v<0.1?2:1).replace('.',',').replace(/^0,/,','); }
    return String(Number(v.toFixed(6))).replace('.',',');
  }
  function axisTickValuesEtap(min,max){
    const vals=[], seen=new Set();
    const add=v=>{ if(v>=min*.999999&&v<=max*1.000001){ const k=Number(v).toPrecision(12); if(!seen.has(k)){seen.add(k); vals.push(v);} } };
    const e0=Math.floor(Math.log10(min))-1, e1=Math.ceil(Math.log10(max))+1;
    for(let e=e0;e<=e1;e++){ [1,3,5].forEach(m=>add(m*Math.pow(10,e))); }
    // Garante marcações usuais do ETAP no tempo: 0,03 / 0,05 / 0,3 / 0,5 etc.
    [0.01,0.03,0.05,0.1,0.3,0.5,1,3,5,10,30,50,100,300,500,1000].forEach(add);
    return vals.sort((a,b)=>a-b);
  }
  function circle(x,y,r,c){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.1;ctx.stroke()}
  ctx.clearRect(0,0,W,H);ctx.fillStyle=pal.page;ctx.fillRect(0,0,W,H);ctx.strokeStyle=pal.border;ctx.lineWidth=1;ctx.strokeRect(.5,.5,W-1,H-1);
  ctx.fillStyle=pal.plot;ctx.fillRect(PL,PT,PR-PL,PB-PT);
  for(let e=Math.floor(lx(xmin));e<=Math.ceil(lx(xmax));e++)for(let m=1;m<10;m++){
    const x=m*Math.pow(10,e);if(x<xmin||x>xmax)continue;
    const major=m===1, xx=X(x), tickLen=major?7:4;
    line(xx,PT,xx,PB,major?pal.gridMajor:pal.gridMinor,major?.95:.45);
    // R12: pequenos traços nos eixos superior/inferior, estilo ETAP.
    line(xx,PT,xx,PT+tickLen,major?pal.axis:pal.tick,major?1:.65);
    line(xx,PB-tickLen,xx,PB,major?pal.axis:pal.tick,major?1:.65);
  }
  for(let e=Math.floor(ly(ymin));e<=Math.ceil(ly(ymax));e++)for(let m=1;m<10;m++){
    const y=m*Math.pow(10,e); if(y<ymin||y>ymax)continue;
    const major=m===1, yy=Y(y), tickLen=major?7:4;
    line(PL,yy,PR,yy,major?pal.gridMajor:pal.gridMinor,major?.95:.45);
    line(PL,yy,PL+tickLen,yy,major?pal.axis:pal.tick,major?1:.65);
    line(PR-tickLen,yy,PR,yy,major?pal.axis:pal.tick,major?1:.65);
  }
  ctx.strokeStyle=pal.axis;ctx.lineWidth=1.1;ctx.strokeRect(PL,PT,PR-PL,PB-PT);
  if(!focusMode){
    text(readTxt('coordTitle','Coordenograma — Coordenação 50/51'),W/2,24,{align:'center',font:'bold 15px Segoe UI',color:pal.title});
    text(readTxt('coordSubtitle',str('cliente')+' × '+str('concessionaria')+' × Terra Sensível'),W/2,42,{align:'center',font:'10.7px Segoe UI',color:pal.subtitle});
  }
  text('Corrente primária (A)',W/2,PB+31,{align:'center',font:'bold 11.6px Segoe UI',color:pal.axisText});
  ctx.save();ctx.translate(19,(PT+PB)/2);ctx.rotate(-Math.PI/2);text('Tempo de atuação (s)',0,0,{align:'center',font:'bold 11.6px Segoe UI',color:pal.axisText});ctx.restore();
  axisTickValuesEtap(xmin,xmax).forEach(x=>{
    const xx=X(x);
    text(tickETAP(x),xx,PB+16,{align:'center',font:'8.8px Segoe UI',color:pal.subtitle});
    text(tickETAP(x),xx,PT-8,{align:'center',font:'8.8px Segoe UI',color:pal.subtitle});
  });
  axisTickValuesEtap(ymin,ymax).forEach(y=>{
    const yy=Y(y)+4;
    text(tickETAP(y),PL-8,yy,{align:'right',font:'8.8px Segoe UI',color:pal.subtitle});
    text(tickETAP(y),PR+10,yy,{align:'left',font:'8.8px Segoe UI',color:pal.subtitle});
  });
  function curvePoints(pick,curva,tms,end=xmax){return curvePointsEngine64(pick,curva,tms,end,xmin,xmax,ymin,ymax,'Canvas '+(curva||''))}
  function clipY(p1,p2,bound){const a=ly(p1.y),b=ly(p2.y),r=(ly(bound)-a)/(b-a);return{x:p1.x*Math.pow(p2.x/p1.x,r),y:bound}}
  function poly(pts,c,dash=[],w=1.55){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=w;ctx.setLineDash(dash);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();let prev=null,started=false;pts.forEach(raw=>{if(!(raw.x>0&&raw.y>0)||raw.x<xmin||raw.x>xmax){prev=raw;return}let p={x:raw.x,y:raw.y};if(prev&&prev.x>0&&prev.y>0&&((prev.y<ymin&&p.y>=ymin)||(prev.y>ymax&&p.y<=ymax))){const b=prev.y<ymin?ymin:ymax,ip=clipY(prev,p,b);ctx.moveTo(X(ip.x),Y(ip.y));started=true}else if(!started&&p.y>=ymin&&p.y<=ymax){ctx.moveTo(X(p.x),Y(p.y));started=true}if(started){if(p.y<ymin||p.y>ymax){const b=p.y<ymin?ymin:ymax,ip=clipY(prev||p,p,b);ctx.lineTo(X(ip.x),Y(ip.y));started=false}else ctx.lineTo(X(p.x),Y(p.y))}prev=raw});ctx.stroke();ctx.restore()}
  function phase51SegmentTo50(pick,curva,tms,inst,t50){
    const raw=curvePoints(pick,curva,tms,inst).filter(p=>p.x<inst);
    if(!(pick>0&&inst>0))return raw;
    const tAtInst=tTCC(curva,inst/pick,tms);
    if(Number.isFinite(tAtInst)&&tAtInst>0) raw.push({x:inst,y:tAtInst});
    return raw;
  }
  function drawPhase(pick,curva,tms,inst,tinst,c,dash=[],limitEnd=0,flags={inv:true,inst:true}){
    const tv=coordInstantDelay360(tinst);
    const hasInv=pick>0 && flags.inv!==false;
    const has50=inst>0 && flags.inst!==false;
    if(hasInv){
      let pts=has50?phase51SegmentTo50(pick,curva,tms,inst,tinst):curvePoints(pick,curva,tms,xmax);
      poly(pts,c,dash,1.55);
    }
    if(has50){
      let tj=hasInv?tTCC(curva,inst/pick,tms):ymax;
      tj=Number.isFinite(tj)?Math.min(Math.max(tj,ymin),ymax):ymax;
      const end=(limitEnd&&limitEnd>inst)?Math.min(limitEnd,xmax):xmax;
      // 50F/50N não é assumida como instantânea pura: usa o tempo definido informado no relé.
      const instPts=tj>tv?[{x:inst,y:tj},{x:inst,y:tv},{x:end,y:tv}]:[{x:inst,y:tv},{x:end,y:tv}];
      poly(instPts,c,dash,1.55);
    }
  }
  function stageTimeMesh(e,I){return e.inst?(I>=e.pick?coordInstantDelay360(e.t):Infinity):tempoEstagio360(I,e.pick,e.curva,e.t)}
  function bestNonInstTimeMesh(stages,I){let best=Infinity; stages.filter(e=>!e.inst).forEach(e=>{const t=stageTimeMesh(e,I); if(Number.isFinite(t)&&t<best)best=t}); return best}
  function findCrossMesh(td,inv,from,to){
    if(!(from>0&&to>from))return from; const tdt=coordInstantDelay360(td.t);
    let lo=from, hi=to, found=false;
    for(let k=0;k<96;k++){const mid=Math.sqrt(lo*hi), tm=stageTimeMesh(inv,mid); if(Number.isFinite(tm)&&tm<=tdt){hi=mid; found=true}else lo=mid}
    return found?hi:to;
  }
  function invSegmentMesh(inv,from,to){
    const pts=[]; if(!(to>from&&inv.pick>0))return pts; const n=520;
    for(let i=0;i<n;i++){const x=from*Math.pow(to/from,i/(n-1)), tt=tTCC(inv.curva,x/inv.pick,inv.t); if(Number.isFinite(tt)&&tt>0)pts.push({x,y:tt})}
    return pts;
  }
  function drawNeutral(estagios,c,dash=[]){
    estagios=(estagios||[]).filter(e=>e&&e.pick>0); if(!estagios.length)return;
    const insts=estagios.filter(e=>e.inst).sort((a,b)=>a.pick-b.pick), inst=insts[0]||null;
    const normals=estagios.filter(e=>!e.inst);
    const tds=normals.filter(e=>normCurve360(e.curva)==='TD').sort((a,b)=>a.pick-b.pick);
    const invs=normals.filter(e=>normCurve360(e.curva)!=='TD').sort((a,b)=>a.pick-b.pick);
    const td=tds[0]||null, inv=invs[0]||null;
    const stop=inst?Math.min(inst.pick,xmax):xmax;
    // Mesh strict: desenha o degrau de pickup vertical do estágio TD/51NS até o tempo definido.
    if(td){
      const ty=coordInstantDelay360(td.t);
      poly([{x:td.pick,y:ymax},{x:td.pick,y:ty}],c,dash,1.65);
    }
    if(td&&inv){
      const from=Math.max(td.pick, inv.pick*coordStartFactor64(), xmin);
      const cross=findCrossMesh(td,inv,from,stop);
      if(cross>td.pick) poly([{x:td.pick,y:coordInstantDelay360(td.t)},{x:cross,y:coordInstantDelay360(td.t)}],c,dash,1.65);
      if(stop>cross){const seg=invSegmentMesh(inv,Math.max(cross,inv.pick*coordStartFactor64()),stop); if(seg.length>1)poly(seg,c,dash,1.65)}
    }else if(inv){
      const seg=invSegmentMesh(inv,Math.max(inv.pick*coordStartFactor64(),xmin),stop); if(seg.length>1)poly(seg,c,dash,1.65);
    }else if(td){
      poly([{x:td.pick,y:coordInstantDelay360(td.t)},{x:stop,y:coordInstantDelay360(td.t)}],c,dash,1.65);
    }
    if(inst){
      const tv=coordInstantDelay360(inst.t); let tj=bestNonInstTimeMesh(normals,inst.pick);
      if(!Number.isFinite(tj)) tj=ymax; tj=Math.min(Math.max(tj,ymin),ymax);
      const end=inst.limit&&inst.limit>inst.pick?Math.min(inst.limit,xmax):xmax;
      poly([{x:inst.pick,y:tj},{x:inst.pick,y:tv},{x:end,y:tv}],c,dash,1.65);
    }
  }
  
  function drawNeutralAudit(estagios,c,dash=[]){
    // MeshLike Limpo: a auditoria de estágios individuais não pode criar linhas decorativas
    // atravessando todo o coordenograma. Cada estágio respeita o limite visual do próximo
    // instantâneo ou limite informado, mantendo o desenho comparável ao Mesh.
    const insts=(estagios||[]).filter(e=>e.inst&&e.pick>0).sort((a,b)=>a.pick-b.pick);
    (estagios||[]).forEach(e=>{
      if(!(e&&e.pick>0))return;
      let end=xmax;
      if(e.inst){
        end=(e.limit&&e.limit>e.pick)?Math.min(e.limit,xmax):Math.min(Math.max(val('icc3f'),val('icc2f'),val('icc2ft'),val('iccftmax'),val('iccftmin'))||xmax,xmax);
      }else{
        const nextInst=insts.find(i=>i.pick>e.pick);
        if(nextInst)end=nextInst.pick;
      }
      poly(curvePoints(e.pick,e.curva,e.t,end),c,dash,0.58);
    })
  }

  function fuseBaseCoordV511(){
    const type=str('coordFuseType')||'65K';
    if(type==='manual') return Math.max(val('coordFuseManual')||65,1);
    const n=parseFloat(String(type).replace('K',''));
    return Number.isFinite(n)&&n>0?n:65;
  }
  function fuseLabelCoordV511(){
    const type=str('coordFuseType')||'65K';
    const lbl=str('coordFuseLabel')||'Fusível montante';
    return type==='manual'?`${lbl} ${fmt(fuseBaseCoordV511(),0,'A')}`:`${lbl} ${type}`;
  }
  function fuseTimeV513(x,scale=1){
    const base=fuseBaseCoordV511()*Math.max(val('coordFuseShift')||1,.01);
    const M=x/base;
    if(!(M>1.01))return Infinity;
    const t2=Math.max(val('fuseT2')||18,.01);
    const exp=Math.max(val('fuseExp')||2.05,.1);
    return scale*t2/Math.pow(Math.max(M-1,.02),exp);
  }
  function drawFuse(){
    if(!show('fuse'))return;
    const base=fuseBaseCoordV511()*Math.max(val('coordFuseShift')||1,.01);
    const fmin=[],fmax=[];
    const start=Math.max(xmin,base*1.02), stop=xmax;
    if(!(stop>start))return;
    for(let i=0;i<720;i++){
      const x=start*Math.pow(stop/start,i/719);
      const tMin=fuseTimeV513(x,Math.max(val('fuseMinScale')||.45,.01)), tMax=fuseTimeV513(x,Math.max(val('fuseMaxScale')||1.35,.01));
      if(Number.isFinite(tMin)&&tMin>0)fmin.push({x,y:tMin});
      if(Number.isFinite(tMax)&&tMax>0)fmax.push({x,y:tMax});
    }
    poly(fmin,'#15803d',[5,4],1.25);
    poly(fmax,'#15803d',[],1.55);
  }
  const clientPhaseEnd=Math.max(val('icc3f'),val('icc2f'),val('icc2ft'),val('iccftmax'),val('iccftmin'))||0;
  drawPhase(d.p51,str('curva51'),val('tms51'),d.p50,val('t50'),'#2563eb',[],clientPhaseEnd,{inv:show('c51f'),inst:show('c50f')});
  const neutralMode64='hybrid'; // R4: retirado seletor duplicado; neutro fica em visualização híbrida padrão.
  function filterNeutralStagesR4(estagios,side){
    return (estagios||[]).filter(e=>{
      const fn=String(e.fn||'').toUpperCase();
      if(fn.includes('51NS')||fn.includes('51GS')) return show(side+'51ns');
      if(fn.includes('50NS')) return show(side+'50ns');
      if(fn.includes('51N')) return show(side+'51n');
      if(fn.includes('50N')) return show(side+'50n');
      return true;
    });
  }
  const cNeu=filterNeutralStagesR4(estagiosClienteNeutro360(d),'c');
  if(cNeu.length && neutralMode64!=='individual') drawNeutral(cNeu,'#7e22ce',[]);
  if(cNeu.length && (neutralMode64==='individual'||neutralMode64==='hybrid')) drawNeutralAudit(cNeu,neutralMode64==='hybrid'?'rgba(126,34,206,.55)':'#7e22ce',neutralMode64==='hybrid'?[2,3]:[]);
  drawPhase(val('m51f'),str('mCurvaF'),val('mTmsF'),val('m50f'),val('mT50f'),'#dc2626',[7,4],0,{inv:show('m51f'),inst:show('m50f')});
  const mNeu=filterNeutralStagesR4(estagiosMontanteNeutro360(),'m');
  if(mNeu.length && neutralMode64!=='individual') drawNeutral(mNeu,'#a16207',[7,4]);
  if(mNeu.length && (neutralMode64==='individual'||neutralMode64==='hybrid')) drawNeutralAudit(mNeu,neutralMode64==='hybrid'?'rgba(161,98,7,.55)':'#a16207',neutralMode64==='hybrid'?[6,3]:[7,4]);
  if($('coordStageAudit')?.checked && neutralMode64==='envelope'){if(cNeu.length) drawNeutralAudit(cNeu,'rgba(126,34,206,.48)',[2,3]); if(mNeu.length) drawNeutralAudit(mNeu,'rgba(161,98,7,.50)',[6,3])}
  drawFuse();

  function drawHHFuses(){
    if(!show('hh'))return;
    coordHHFuseItems54(d).filter(item=>coordFeatureOn64('hh',item.tag)).forEach(item=>poly(coordHHFuseCurvePts54(item.base,xmin,xmax),item.color,item.dash,.98));
  }

  drawHHFuses();
  // R12: linhas-guia discretas do tempo real das funções 50 do cliente.
  function drawTimeGuideR12(t,label,c){
    if(!(t>0)||t<ymin||t>ymax)return;
    const yy=Y(t);
    line(PL,yy,PR,yy,c,.45,[3,5]);
    const same50=Math.abs(coordInstantDelay360(val('t50'))-coordInstantDelay360(val('t50n')))<1e-9;
    const is50n=/t50N/i.test(label);
    const tx=PR-(same50&&is50n?74:4), ty=yy-4+(same50&&is50n?12:0);
    ctx.save();
    ctx.font='7.8px Segoe UI';
    const tw=ctx.measureText(label).width+7;
    ctx.fillStyle=isNight?'rgba(5,14,25,.78)':'rgba(255,255,255,.78)';
    ctx.fillRect(tx-tw,ty-9,tw,12);
    ctx.restore();
    text(label,tx,ty,{align:'right',font:'7.8px Segoe UI',color:c});
  }
  if(show('c50f')) drawTimeGuideR12(coordInstantDelay360(val('t50')),'t50F '+fmt(coordInstantDelay360(val('t50')),2,'s'),'rgba(249,115,22,.55)');
  if(show('c50n')) drawTimeGuideR12(coordInstantDelay360(val('t50n')),'t50N '+fmt(coordInstantDelay360(val('t50n')),2,'s'),'rgba(234,88,12,.48)');
  const markerBoxes=[];
  function marker(x,y,shortLabel,longLabel,c,dx=0,dy=0,shape='circle'){
    if(!$('coordMarkers')?.checked)return;
    if(!(x>0&&y>0)||x<xmin||x>xmax)return;
    const yy=Math.min(Math.max(y,ymin),ymax),px=X(x),py=Y(yy),isBottomMarker=yy<=ymin*1.05||py>PB-34;
    line(px,py,px,PB,pal.markerLine,.55,[2,4]);
    if(shape==='tri'){
      ctx.save();ctx.fillStyle=c;ctx.strokeStyle='#fff';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(px,py-5.6);ctx.lineTo(px-5.2,py+4.6);ctx.lineTo(px+5.2,py+4.6);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    }else circle(px,py,3.4,c);
    const mode=(str('coordMarkerMode')==='compact')?'compact':'technical';
    const compactMap={'1':'51N','2':'51F','3':'50N','4':'50F','5':'FT mín.','6':'FT máx.','7':'Inrush','8':'NANSI','9':'ANSI','10':'Icc 3F','11':'Icc 2F','12':'Icc 2F-T','M50F':'50F mont.','M50N':'50N mont.'};
    const compactLabel=compactMap[String(shortLabel)]||String(longLabel||shortLabel).replace('M51NS','51NS mont.').replace('M50NS','50NS mont.');
    const label=mode==='technical'?longLabel:compactLabel;
    const rawShort=String(shortLabel);
    const num=rawShort==='M50F'?'MF':rawShort==='M50N'?'MN':(rawShort.replace(/[^0-9]/g,'') || rawShort);
    ctx.save();
    ctx.font='bold 8.4px Segoe UI';
    const numR=7.2;
    ctx.font='8.7px Segoe UI';
    const labelW=ctx.measureText(label).width;
    const compactMode=mode==='compact';
    const tw=Math.max(compactMode?34:36,labelW+(compactMode?16:numR*2+18)), th=compactMode?18:19, gap=4;
    let tx=Math.min(Math.max(px+dx,PL+tw/2+2),PR-tw/2-2);
    let ty=py-9+dy;
    let rect={x1:tx-tw/2,x2:tx+tw/2,y1:ty-14,y2:ty-14+th};
    const overlap=(a,b)=>a.x1<b.x2+gap&&a.x2>b.x1-gap&&a.y1<b.y2+gap&&a.y2>b.y1-gap;
    const fixedClientPickup=/^(3|4)$/.test(rawShort);
    if(fixedClientPickup){
      tx=Math.min(Math.max(px,PL+tw/2+2),PR-tw/2-2);
      ty=py-18;
      rect={x1:tx-tw/2,x2:tx+tw/2,y1:ty-14,y2:ty-14+th};
    }else if(isBottomMarker && /^(1|2)$/.test(rawShort)){
      tx=Math.min(Math.max(px,PL+tw/2+2),PR-tw/2-2);
      ty=PB-13;
      rect={x1:tx-tw/2,x2:tx+tw/2,y1:ty-14,y2:ty-14+th};
    }else if(isBottomMarker){
      const candidates=[];
      for(let lane=0;lane<7;lane++){
        const laneY=PB-13-lane*18;
        [0,-42,42,-84,84,-126,126,168,-168].forEach(shift=>candidates.push({tx:px+dx+shift,ty:laneY}));
      }
      for(const cand of candidates){
        tx=Math.min(Math.max(cand.tx,PL+tw/2+2),PR-tw/2-2);
        ty=cand.ty; rect={x1:tx-tw/2,x2:tx+tw/2,y1:ty-14,y2:ty-14+th};
        if(!markerBoxes.some(b=>overlap(rect,b)))break;
      }
    }else{
      let tries=0;
      while(markerBoxes.some(b=>overlap(rect,b))&&tries<16){
        tries++; ty-=20;
        if(ty<PT+24){ty=py+24+(tries%5)*19;}
        tx=Math.min(Math.max(px+dx+((tries%2)?24:-24),PL+tw/2+2),PR-tw/2-2);
        rect={x1:tx-tw/2,x2:tx+tw/2,y1:ty-14,y2:ty-14+th};
      }
    }
    markerBoxes.push(rect);
    const anchorX=tx-tw/2+numR+6, anchorY=ty-4.2;
    if(!isBottomMarker && !fixedClientPickup){
      ctx.strokeStyle=pal.markerLine;ctx.lineWidth=.65;ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(anchorX,anchorY);ctx.stroke();ctx.setLineDash([]);
    }
    ctx.fillStyle=pal.tagFill;ctx.strokeStyle=c;ctx.lineWidth=1.05;ctx.beginPath();
    if(ctx.roundRect){ctx.roundRect(rect.x1,rect.y1,tw,th,5)}else{ctx.rect(rect.x1,rect.y1,tw,th)}
    ctx.fill();ctx.stroke();
    if(compactMode){
      ctx.fillStyle=pal.tagText;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 8.2px Segoe UI';ctx.fillText(label,rect.x1+tw/2,rect.y1+th/2+.1);
    }else{
      ctx.beginPath();ctx.arc(rect.x1+numR+5,rect.y1+th/2,numR,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=.8;ctx.stroke();
      ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 8px Segoe UI';ctx.fillText(num,rect.x1+numR+5,rect.y1+th/2+.1);
      ctx.fillStyle=pal.tagText;ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='8.7px Segoe UI';ctx.fillText(label,rect.x1+numR*2+10,rect.y1+th/2+.1);
    }
    ctx.restore();
  }

  function ansiNansiMarkersCoordV508(){
    const mode=str('coordAnsiMode')||'todos';
    const tempoA=val('ansiTempo')||3, tempoN=val('nansiTempo')||3;
    const multi=d.multi||calcTrafosV507();
    const out=[];
    const mk=(tag,ansi,nansi,idx,total=false)=>{
      const off=(idx%5)*8;
      if(ansi>0 && coordFeatureOn64('ansi',tag)) out.push({x:ansi,y:tempoA,l:total?'AΣ':('A'+(idx+1)),name:total?'ANSI total':('ANSI '+tag),c:'#4d7c0f',dx:18+off,dy:-4,shape:'tri',tag,kind:'ansi'});
      if(nansi>0 && coordFeatureOn64('nansi',tag)) out.push({x:nansi,y:tempoN,l:total?'NΣ':('N'+(idx+1)),name:total?'NANSI total':('NANSI '+tag),c:'#4338ca',dx:-18-off,dy:-4,shape:'tri',tag,kind:'nansi'});
    };
    if(!multi||!multi.lista?.length || mode==='adotada'){
      mk('ref.',val('ansi'),val('nansi'),28,false);
      return out;
    }
    const lista=multi.lista||[];
    if(mode==='todos'){
      lista.forEach((t,i)=>mk(t.tag||('TRF'+(i+1)),t.ansi,t.nansi,i,false));
      return out;
    }
    if(mode==='total'){ const an=ansiNansiFromTrafo(multi.inTotal,multi.zEq,multi.lista?.[0]?.ligacao||'Dyn1'); mk('total',an.ansi,an.nansi,0,true); return out; }
    let t=multi.maior;
    if(mode==='menor') t=multi.menor;
    else if(mode==='selecionado') t=lista.find(x=>x.tag===str('ansiRefTag'))||multi.maior;
  mk(t.tag||'ref.',t.ansi||val('ansi'),t.nansi||val('nansi'),0,false);
  return out;
}
function buildCoordReferenceItems54(d,visibleFn=()=>true){
  const show=k=>visibleFn(k)!==false;
  const refs=[];
  const pos=v=>Number.isFinite(Number(v))&&Number(v)>0;
  const add=(item)=>{
    if(!item||!pos(item.x)||!pos(item.y)||item.visible===false)return;
    refs.push(Object.assign({shape:'circle',extra:'',dx:0,dy:0},item));
  };
  const inrushTag=d?.multi?.refTag||d?.multi?.maior?.tag||'TRF01';
  add({key:'c51n',tag:'51N cliente',desc:'Partida 51N cliente',value:d.p51n,x:d.p51n,y:.01,color:'#7e22ce',visible:show('c51n'),dx:-42,dy:0});
  add({key:'c51f',tag:'51F cliente',desc:'Partida 51F cliente',value:d.p51,x:d.p51,y:.01,color:'#2563eb',visible:show('c51f'),dx:-28,dy:0});
  add({key:'c50n',tag:'50N cliente',desc:'Partida 50N cliente',value:d.p50n,x:d.p50n,y:coordInstantDelay360(val('t50n')),color:'#ea580c',visible:show('c50n'),extra:' / '+fmt(coordInstantDelay360(val('t50n')),2,'s'),dy:-18});
  add({key:'c50f',tag:'50F cliente',desc:'Partida 50F cliente',value:d.p50,x:d.p50,y:coordInstantDelay360(val('t50')),color:'#f97316',visible:show('c50f'),extra:' / '+fmt(coordInstantDelay360(val('t50')),2,'s'),dy:-18});
  add({key:'ftmin',tag:'FT mín.',desc:'FT mín.',value:val('iccftmin'),x:val('iccftmin'),y:.01,color:'#16a34a',dx:-12,dy:-5});
  add({key:'ftmax',tag:'FT máx.',desc:'FT máx.',value:val('iccftmax'),x:val('iccftmax'),y:.01,color:'#ca8a04',dx:36,dy:-52});
  add({key:'inrush',tag:'Inrush '+inrushTag,desc:'Inrush '+inrushTag,value:val('inrush'),x:val('inrush'),y:.1,color:'#0891b2',dx:-34,dy:-10});
  add({key:'m51n',tag:'51N montante',desc:'Partida 51N montante',value:val('m51n'),x:val('m51n'),y:.01,color:'#a16207',visible:show('m51n'),dx:-26,dy:-18});
  add({key:'m51f',tag:'51F montante',desc:'Partida 51F montante',value:val('m51f'),x:val('m51f'),y:.01,color:'#dc2626',visible:show('m51f'),dx:20,dy:-22});
  add({key:'icc3f',tag:'Icc 3F',desc:'Icc 3F',value:val('icc3f'),x:val('icc3f'),y:.01,color:'#db2777',dx:42,dy:-14});
  add({key:'icc2f',tag:'Icc 2F',desc:'Icc 2F',value:val('icc2f'),x:val('icc2f'),y:.01,color:'#7c3aed',dx:54,dy:-26});
  add({key:'m50n',tag:'50N montante',desc:'50N montante',value:val('m50n'),x:val('m50n'),y:coordInstantDelay360(val('mT50n')),color:'#a16207',visible:show('m50n'),extra:' / '+fmt(coordInstantDelay360(val('mT50n')),2,'s'),dx:-36,dy:-22});
  add({key:'m50f',tag:'50F montante',desc:'50F montante',value:val('m50f'),x:val('m50f'),y:coordInstantDelay360(val('mT50f')),color:'#dc2626',visible:show('m50f'),extra:' / '+fmt(coordInstantDelay360(val('mT50f')),2,'s'),dx:42,dy:-18});
  add({key:'c51ns',tag:'51NS cliente',desc:'51NS cliente',value:d.p51ns,x:d.p51ns,y:Math.max(val('t51ns')||.01,.01),color:'#9333ea',visible:show('c51ns'),shape:'tri',dx:28,dy:-5});
  add({key:'m51ns',tag:'51NS montante',desc:'51NS montante',value:val('m51ns'),x:val('m51ns'),y:Math.max(val('mT51ns')||.01,.01),color:'#a16207',visible:show('m51ns'),shape:'tri',dx:30,dy:-10});
  coordAnsiMarkersV54(d).forEach(m=>add({key:m.kind||'ansi',tag:m.name,desc:m.name,value:m.x,x:m.x,y:m.y,color:m.c,shape:'tri',dx:m.dx||0,dy:m.dy||0,visible:pos(m.x)}));
  if(show('hh')) coordHHFuseItems54(d).filter(item=>coordFeatureOn64('hh',item.tag)).forEach(item=>add({key:'hh',tag:'HH '+item.tag,desc:'HH '+item.tag,value:item.base,x:item.base,y:.01,color:item.color,dx:18,dy:-38,visible:pos(item.base)}));
  refs.forEach((r,i)=>{r.n=i+1; r.label=String(i+1);});
  return refs;
}

  if($('coordMarkers')?.checked){
    buildCoordReferenceItems54(d,show).forEach(m=>marker(m.x,m.y,m.label,m.tag,m.color,m.dx||0,m.dy||0,m.shape||'circle'));
  }
  const footerY=PB+48;
  if(!focusMode) line(PL,footerY-14,PR,footerY-14,'#d8e0ea',.8);
  const focusLegendItems=[];
  const focusRefItems=[];
  function bubble(n,x,y,c,r=6.7){
    const raw=String(n), label=raw==='M50F'?'MF':raw==='M50N'?'MN':raw;
    const rr=Math.max(r,label.length>2?8:r);
    ctx.save();ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=.75;ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 7px Segoe UI';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,y+.15);ctx.restore();
  }
  function drawRefLegendItemCanvas(p,x,y){
    const maxDescW=58, maxValW=56, value=fmt(Number(p.value),1,'A')+(p.extra||'');
    bubble(p.n,x,y-3.5,p.color||'#64748b',6.1);
    ctx.save();
    ctx.font='7.3px Segoe UI';ctx.fillStyle=pal.axisText;ctx.textAlign='left';ctx.textBaseline='middle';
    const desc=String(p.desc||p.tag||'');
    let label=desc;
    while(ctx.measureText(label).width>maxDescW&&label.length>5) label=label.slice(0,-2);
    if(label!==desc) label=label.trim()+'…';
    ctx.fillText(label,x+13,y-1);
    ctx.fillText('=',x+75,y-1);
    let valTxt=value;
    while(ctx.measureText(valTxt).width>maxValW&&valTxt.length>5) valTxt=valTxt.slice(0,-2);
    if(valTxt!==value) valTxt=valTxt.trim()+'…';
    ctx.fillText(valTxt,x+84,y-1);
    ctx.restore();
  }
  const coordRefs=buildCoordReferenceItems54(d,show);
  if($('coordCurveLegend')?.checked){
    const bx=PL+10,by=footerY;
    if(!focusMode) text('Curvas',bx,by,{font:'700 9.2px Segoe UI',color:pal.axisText});
    const items=[];
    const addItem=(key,label,color,dash=[])=>{ if(show(key)) items.push([label,color,dash]); };
    addItem('c51f','Relé Cliente Fase','#2563eb',[]);
    addItem('c51n','Relé Cliente Neutro','#7e22ce',[]);
    addItem('m51f','Relé Montante Fase','#dc2626',[7,4]);
    addItem('m51n','Relé Montante Neutro','#a16207',[7,4]);
    if(show('fuse')){items.push([fuseLabelCoordV511()+' mín.','#15803d',[5,4]],[fuseLabelCoordV511()+' máx.','#15803d',[]]);}
    if(show('hh')) coordHHFuseItems54(d).filter(item=>coordFeatureOn64('hh',item.tag)).forEach(item=>items.push([item.label,item.color,item.dash]));
    focusLegendItems.push(...items);
    if(!focusMode){
      items.slice(0,8).forEach((it,i)=>{
        const x=bx,y=by+18+i*13;
        line(x,y,x+24,y,it[1],1.7,it[2]);
        text(it[0],x+32,y+3.3,{font:'8px Segoe UI',color:pal.axisText});
      });
    }
  }
  if($('coordRefLegend')?.checked){
    const rx=PL+242,ry=footerY;
    if(!focusMode) text('Referências principais',rx,ry,{font:'700 9.2px Segoe UI',color:pal.axisText});
    focusRefItems.push(...coordRefs.map(p=>`${p.n} ${p.desc} = ${fmt(Number(p.value),1,'A')}${p.extra||''}`));
    if(!focusMode){
      const colW=150,rowH=13.8;
      const availableCols=Math.max(1,Math.floor((PR-rx-4)/colW));
      const maxPerCol=Math.max(5,Math.ceil(coordRefs.length/availableCols));
      coordRefs.forEach((p,i)=>{
        const col=Math.floor(i/maxPerCol), row=i%maxPerCol;
        const x=rx+col*colW, y=ry+18+row*rowH;
        drawRefLegendItemCanvas(p,x,y);
      });
    }
  }
  const focusBox=$('coordFocusReadout');
  if(focusBox){ focusBox.innerHTML=''; }
  document.querySelectorAll('[data-coord-curve]').forEach(el=>{ if(el && el.dataset) el.checked=show(el.dataset.coordCurve); });
  const headerMain=$('coordFocusHeaderMain'), headerSub=$('coordFocusHeaderSub');
  if(headerMain) headerMain.textContent=readTxt('coordTitle','Coordenograma — Coordenação 50/51');
  if(headerSub) headerSub.textContent=readTxt('coordSubtitle','Curvas tempo-corrente · IEC / IEEE / ANSI');
  text('Nota: validar o coordenograma com dados oficiais da concessionária, curva real dos equipamentos e manual do relé.',PL,H-12,{font:'8px Segoe UI',color:pal.note});

  const ansiInfo=$('coordAnsiInfo');
  if(ansiInfo){
    const mode=str('coordAnsiMode')||'todos';
    const multi=d.multi||calcTrafosV507();
    if(mode==='todos') ansiInfo.textContent=`Todos (${multi?.ativos||0} trafos)`;
    else if(mode==='maior') ansiInfo.textContent=`Maior: ${multi?.maior?.tag||'ref.'}`;
    else if(mode==='menor') ansiInfo.textContent=`Menor: ${multi?.menor?.tag||'ref.'}`;
    else if(mode==='total') ansiInfo.textContent='Equivalente total';
    else if(mode==='selecionado') ansiInfo.textContent=`Selecionado: ${str('ansiRefTag')||'ref.'}`;
    else ansiInfo.textContent=`Adotada: ${multi?.refTag||'ref.'}`;
  }

  updateCoordSideStats54(d);
  try{renderFidelityPanel(d);}catch(e){console.warn('Painel de fidelidade gráfica não renderizado.',e);}
  if($('coordFuseInfo')) $('coordFuseInfo').textContent=(show('fuse')?fuseLabelCoordV511():'Oculto')+(show('hh')&&coordHHFuseItems54(d).length?` + ${coordHHFuseItems54(d).length} HH`:'');
  try{renderCoordAuditPro649(d);}catch(e){console.warn('Auditoria Pro não renderizada.',e);}
  renderCoordDiagnóstico33(d);
}
function gerarCoordenogramaSVG54(d){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const coordCurveOn=k=>document.querySelector(`[data-coord-curve="${k}"]`)?.checked!==false;
  const W=820,H=1040,PL=76,PR=W-24,PT=60,PB=H-260;
  const isNight=(str('coordTheme')||'white')==='black';
  const pal=isNight?{
    page:'#06101d', plot:'#071827', border:'#1f3a55', axis:'#78a6c8', gridMajor:'#31516f', gridMinor:'#172b42',
    title:'#eef8ff', subtitle:'#a9c6dd', axisText:'#c7d9ea', tick:'#9fb7cc', markerLine:'rgba(148,196,222,.55)',
    tagFill:'rgba(6,16,29,.96)', tagStroke:'rgba(125,190,220,.58)', tagText:'#eaf7ff', note:'#95b4cb', legendText:'#cfe0ef', markerStroke:'#06101d', legendLine:'#284762'
  }:{
    page:'#ffffff', plot:'#fbfdff', border:'#cbd5e1', axis:'#64748b', gridMajor:'#aab8ca', gridMinor:'#e9eef5',
    title:'#111827', subtitle:'#475569', axisText:'#334155', tick:'#475569', markerLine:'#cbd5e1',
    tagFill:'rgba(255,255,255,.96)', tagStroke:'rgba(148,163,184,.68)', tagText:'#0f172a', note:'#64748b', legendText:'#334155', markerStroke:'#ffffff', legendLine:'#d8e0ea'
  };
  const readNum=(id,fb)=>{const n=Number(String($(id)?.value??'').replace(',','.')); return Number.isFinite(n)&&n>0?n:fb};
  let xmin=readNum('coordXMin',0.1), xmax=Math.max(readNum('coordXMax',10000),xmin*10);
  let ymin=readNum('coordYMin',.01), ymax=Math.max(readNum('coordYMax',100),ymin*10);
  function fuseBaseCoordV511(){
    const type=str('coordFuseType')||'65K';
    if(type==='manual') return Math.max(val('coordFuseManual')||65,1);
    const n=parseFloat(String(type).replace('K',''));
    return Number.isFinite(n)&&n>0?n:65;
  }
  function fuseLabelCoordV511(){
    const type=str('coordFuseType')||'65K';
    const lbl=str('coordFuseLabel')||'Fusível montante';
    return type==='manual'?`${lbl} ${fmt(fuseBaseCoordV511(),0,'A')}`:`${lbl} ${type}`;
  }
  const refVals=[d.p51,d.p50,d.p51n,d.p50n,d.p51ns,d.p51gs,val('m51f'),val('m50f'),val('m51n'),val('m50n'),val('m51ns'),val('m51gs'),val('icc3f'),val('icc2f'),val('icc2ft'),val('iccftmax'),val('iccftmin'),val('inrush'),val('ansi'),val('nansi'),fuseBaseCoordV511(),d.inAT,d.iDem].filter(v=>Number.isFinite(v)&&v>0);
  (d.multi?.lista||[]).forEach(t=>{[t.ansi,t.nansi,Number(t.hhFuse)||0].forEach(v=>{if(Number.isFinite(v)&&v>0)refVals.push(v);});});
  if(refVals.length){const minX=Math.min(...refVals),maxX=Math.max(...refVals); xmin=Math.min(xmin,Math.max(.1,Math.pow(10,Math.floor(Math.log10(minX/2))))); xmax=Math.max(xmax,Math.pow(10,Math.ceil(Math.log10(maxX*2))));}
  const lx=x=>Math.log10(x), ly=y=>Math.log10(y);
  const X=x=>PL+((lx(x)-lx(xmin))/(lx(xmax)-lx(xmin)))*(PR-PL);
  const Y=y=>PT+((ly(ymax)-ly(y))/(ly(ymax)-ly(ymin)))*(PB-PT);
  const tick=v=>v>=1000?v.toLocaleString('pt-BR',{maximumFractionDigits:0}):String(v).replace('.',',');
  const out=[];
  const line=(x1,y1,x2,y2,c=pal.gridMinor,w=1,dash='')=>out.push(`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${c}" stroke-width="${w}"${dash?` stroke-dasharray="${dash}"`:''}/>`);
  const text=(t,x,y,opts={})=>out.push(`<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" fill="${opts.color||pal.legendText}" font-family="Segoe UI, Arial, sans-serif" font-size="${opts.size||10}" font-weight="${opts.weight||400}" text-anchor="${opts.anchor||'start'}">${esc(t)}</text>`);
  function curvePoints(pick,curva,tms,end=xmax){return curvePointsEngine64(pick,curva,tms,end,xmin,xmax,ymin,ymax,'SVG '+(curva||''))}
  function clipY(p1,p2,bound){const a=ly(p1.y),b=ly(p2.y),r=(ly(bound)-a)/(b-a);return{x:p1.x*Math.pow(p2.x/p1.x,r),y:bound}}
  function pathFrom(pts){let dstr='',open=false,prev=null;pts.forEach(raw=>{if(!(raw.x>0&&raw.y>0)||raw.x<xmin||raw.x>xmax){open=false;prev=raw;return}let p={x:raw.x,y:raw.y};if(prev&&prev.x>0&&prev.y>0&&((prev.y<ymin&&p.y>=ymin)||(prev.y>ymax&&p.y<=ymax))){const b=prev.y<ymin?ymin:ymax,ip=clipY(prev,p,b);dstr+=` M ${X(ip.x).toFixed(2)} ${Y(ip.y).toFixed(2)}`;open=true;}else if(!open&&p.y>=ymin&&p.y<=ymax){dstr+=` M ${X(p.x).toFixed(2)} ${Y(p.y).toFixed(2)}`;open=true}if(open){if(p.y<ymin||p.y>ymax){const b=p.y<ymin?ymin:ymax,ip=clipY(prev||p,p,b);dstr+=` L ${X(ip.x).toFixed(2)} ${Y(ip.y).toFixed(2)}`;open=false}else dstr+=` L ${X(p.x).toFixed(2)} ${Y(p.y).toFixed(2)}`}prev=raw});return dstr}
  const path=(pts,c,w=1.6,dash='',opacity=1)=>{const dpath=pathFrom(pts); if(dpath)out.push(`<path d="${dpath}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"${dash?` stroke-dasharray="${dash}"`:''}/>`)};
  function phase51SegmentTo50(pick,curva,tms,inst,t50){const raw=curvePoints(pick,curva,tms,inst).filter(p=>p.x<inst); if(!(pick>0&&inst>0))return raw; const tAtInst=tTCC(curva,inst/pick,tms); if(Number.isFinite(tAtInst)&&tAtInst>0)raw.push({x:inst,y:tAtInst}); return raw}
  function drawPhase(pick,curva,tms,inst,tinst,c,dash='',flags={inv:true,inst:true}){const tv=coordInstantDelay360(tinst), hasInv=pick>0&&flags.inv!==false, has50=inst>0&&flags.inst!==false; if(hasInv)path(has50?phase51SegmentTo50(pick,curva,tms,inst,tinst):curvePoints(pick,curva,tms,xmax),c,1.65,dash); if(has50){let tj=hasInv?tTCC(curva,inst/pick,tms):ymax;tj=Number.isFinite(tj)?Math.min(Math.max(tj,ymin),ymax):ymax;const pts=tj>tv?[{x:inst,y:tj},{x:inst,y:tv},{x:xmax,y:tv}]:[{x:inst,y:tv},{x:xmax,y:tv}];path(pts,c,1.65,dash)}}
  function stageTimeMesh(e,I){return e.inst?(I>=e.pick?coordInstantDelay360(e.t):Infinity):tempoEstagio360(I,e.pick,e.curva,e.t)}
  function bestNonInstTimeMesh(stages,I){let best=Infinity; stages.filter(e=>!e.inst).forEach(e=>{const t=stageTimeMesh(e,I); if(Number.isFinite(t)&&t<best)best=t}); return best}
  function findCrossMesh(td,inv,from,to){if(!(from>0&&to>from))return from; const tdt=coordInstantDelay360(td.t); let lo=from, hi=to, found=false; for(let k=0;k<96;k++){const mid=Math.sqrt(lo*hi), tm=stageTimeMesh(inv,mid); if(Number.isFinite(tm)&&tm<=tdt){hi=mid; found=true}else lo=mid} return found?hi:to;}
  function invSegmentMesh(inv,from,to){const pts=[]; if(!(to>from&&inv.pick>0))return pts; const n=520; for(let i=0;i<n;i++){const x=from*Math.pow(to/from,i/(n-1)), tt=tTCC(inv.curva,x/inv.pick,inv.t); if(Number.isFinite(tt)&&tt>0)pts.push({x,y:tt})} return pts}
  function drawNeutral(estagios,c,dash=''){estagios=(estagios||[]).filter(e=>e&&e.pick>0); if(!estagios.length)return; const insts=estagios.filter(e=>e.inst).sort((a,b)=>a.pick-b.pick), inst=insts[0]||null; const normals=estagios.filter(e=>!e.inst); const tds=normals.filter(e=>normCurve360(e.curva)==='TD').sort((a,b)=>a.pick-b.pick); const invs=normals.filter(e=>normCurve360(e.curva)!=='TD').sort((a,b)=>a.pick-b.pick); const td=tds[0]||null, inv=invs[0]||null; const stop=inst?Math.min(inst.pick,xmax):xmax; if(td){const ty=coordInstantDelay360(td.t); path([{x:td.pick,y:ymax},{x:td.pick,y:ty}],c,1.7,dash)} if(td&&inv){const from=Math.max(td.pick,inv.pick*coordStartFactor64(),xmin); const cross=findCrossMesh(td,inv,from,stop); if(cross>td.pick) path([{x:td.pick,y:coordInstantDelay360(td.t)},{x:cross,y:coordInstantDelay360(td.t)}],c,1.7,dash); if(stop>cross){const seg=invSegmentMesh(inv,Math.max(cross,inv.pick*coordStartFactor64()),stop); if(seg.length>1)path(seg,c,1.7,dash)}} else if(inv){const seg=invSegmentMesh(inv,Math.max(inv.pick*coordStartFactor64(),xmin),stop); if(seg.length>1)path(seg,c,1.7,dash)} else if(td){path([{x:td.pick,y:coordInstantDelay360(td.t)},{x:stop,y:coordInstantDelay360(td.t)}],c,1.7,dash)} if(inst){const tv=coordInstantDelay360(inst.t); let tj=bestNonInstTimeMesh(normals,inst.pick); if(!Number.isFinite(tj))tj=ymax; tj=Math.min(Math.max(tj,ymin),ymax); const end=inst.limit&&inst.limit>inst.pick?Math.min(inst.limit,xmax):xmax; path([{x:inst.pick,y:tj},{x:inst.pick,y:tv},{x:end,y:tv}],c,1.7,dash)}}
  function drawStageLines(estagios,c,dash='2 3'){estagios.forEach(e=>path(curvePoints(e.pick,e.curva,e.t,xmax),c,.82,dash,.62))}
  function fusePts(scale){const base=fuseBaseCoordV511()*Math.max(val('coordFuseShift')||1,.01), start=Math.max(xmin,base*1.02), stop=xmax, pts=[];if(!(stop>start))return pts;for(let i=0;i<720;i++){const x=start*Math.pow(stop/start,i/719),M=x/base,tt=scale*(Math.max(val('fuseT2')||18,.01))/Math.pow(Math.max(M-1,.02),Math.max(val('fuseExp')||2.05,.1)); if(Number.isFinite(tt)&&tt>0)pts.push({x,y:tt})}return pts}
  const mode=str('coordMarkerMode')||'technical';
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Coordenograma de coordenação de proteção">`);
  out.push(`<rect width="${W}" height="${H}" fill="${pal.page}"/><rect x="0.5" y="0.5" width="${W-1}" height="${H-1}" fill="none" stroke="${pal.border}"/>`);
  out.push(`<rect x="${PL}" y="${PT}" width="${PR-PL}" height="${PB-PT}" fill="${pal.plot}" stroke="${pal.axis}"/>`);
  for(let e=Math.floor(lx(xmin));e<=Math.ceil(lx(xmax));e++)for(let m=1;m<10;m++){const x=m*Math.pow(10,e);if(x<xmin||x>xmax)continue;line(X(x),PT,X(x),PB,m===1?pal.gridMajor:pal.gridMinor,m===1?.95:.45)}
  for(let e=Math.floor(ly(ymin));e<=Math.ceil(ly(ymax));e++)for(let m=1;m<10;m++){
    const y=m*Math.pow(10,e); if(y<ymin||y>ymax)continue;
    const major=m===1, yy=Y(y), tickLen=major?7:4;
    line(PL,yy,PR,yy,major?pal.gridMajor:pal.gridMinor,major?.95:.45);
    line(PL,yy,PL+tickLen,yy,major?pal.axis:pal.tick,major?1:.65);
    line(PR-tickLen,yy,PR,yy,major?pal.axis:pal.tick,major?1:.65);
  }
  text(str('coordTitle')||'Relaytester Proteção SEP — Coordenograma',W/2,24,{anchor:'middle',size:15,weight:700,color:pal.title});
  text(str('coordSubtitle')||'Coordenograma vetorial SVG integrado',W/2,42,{anchor:'middle',size:10.7,color:pal.subtitle});
  text('Corrente primária (A)',W/2,PB+31,{anchor:'middle',size:11.6,weight:700,color:pal.axisText});
  out.push(`<text x="19" y="${((PT+PB)/2).toFixed(2)}" fill="${pal.axisText}" font-family="Segoe UI, Arial, sans-serif" font-size="11.6" font-weight="700" text-anchor="middle" transform="rotate(-90 19 ${((PT+PB)/2).toFixed(2)})">Tempo de atuação (s)</text>`);
  for(let e=Math.floor(lx(xmin));e<=Math.ceil(lx(xmax));e++){const x=Math.pow(10,e);if(x>=xmin&&x<=xmax)text(tick(x),X(x),PB+16,{anchor:'middle',size:9.8,color:pal.tick})}
  for(let e=Math.floor(ly(ymin));e<=Math.ceil(ly(ymax));e++){
    const y=Math.pow(10,e);
    if(y>=ymin&&y<=ymax){
      const yy=Y(y)+4;
      text(tick(y),PL-8,yy,{anchor:'end',size:9.8,color:pal.tick});
      text(tick(y),PR+10,yy,{anchor:'start',size:9.8,color:pal.tick});
    }
  }
  const col={cf:isNight?'#5aa7ff':'#2563eb', cn:isNight?'#d49aff':'#7e22ce', mf:isNight?'#ff7b85':'#dc2626', mn:isNight?'#ffd166':'#a16207', fs:isNight?'#63e39b':'#15803d', mark:isNight?'#29d7f0':'#0891b2'};
  function filterNeutralStagesSVG(estagios,side){
    return (estagios||[]).filter(e=>{
      const fn=String(e.fn||'').toUpperCase();
      if(fn.includes('51NS')||fn.includes('51GS')) return coordCurveOn(side+'51ns');
      if(fn.includes('50NS')) return coordCurveOn(side+'50ns');
      if(fn.includes('51N')) return coordCurveOn(side+'51n');
      if(fn.includes('50N')) return coordCurveOn(side+'50n');
      return true;
    });
  }
  drawPhase(d.p51,str('curva51'),val('tms51'),d.p50,val('t50'),col.cf,'',{inv:coordCurveOn('c51f'),inst:coordCurveOn('c50f')});
  const estCli=estagiosClienteNeutro360(d), estMon=estagiosMontanteNeutro360();
  const estCliOn=filterNeutralStagesSVG(estCli,'c'), estMonOn=filterNeutralStagesSVG(estMon,'m');
  if(estCliOn.length) drawNeutral(estCliOn,col.cn,'');
  if(estCliOn.length) drawStageLines(estCliOn,isNight?'#bc8cff':'rgba(126,34,206,.82)','2 3');
  drawPhase(val('m51f'),str('mCurvaF'),val('mTmsF'),val('m50f'),val('mT50f'),col.mf,'7 4',{inv:coordCurveOn('m51f'),inst:coordCurveOn('m50f')});
  if(estMonOn.length) drawNeutral(estMonOn,col.mn,'7 4');
  if(estMonOn.length) drawStageLines(estMonOn,isNight?'#ffd166':'rgba(161,98,7,.78)','6 3');
  if(coordCurveOn('fuse')){path(fusePts(Math.max(val('fuseMinScale')||.45,.01)),col.fs,1.25,'5 4');path(fusePts(Math.max(val('fuseMaxScale')||1.35,.01)),col.fs,1.55)}
  if(coordCurveOn('hh')){coordHHFuseItems54(d).forEach(item=>path(coordHHFuseCurvePts54(item.base,xmin,xmax),item.color,.98,item.dash.join(' ')));}
  const boxes=[];
  function marker(x,y,shortLabel,longLabel,c,dx=0,dy=0,shape='circle'){if(!$('coordMarkers')?.checked)return;if(!(x>0&&y>0)||x<xmin||x>xmax)return;const yy=Math.min(Math.max(y,ymin),ymax),px=X(x),py=Y(yy),isBottomMarker=yy<=ymin*1.05||py>PB-34;line(px,py,px,PB,pal.markerLine,.65,'2 4'); if(shape==='tri') out.push(`<path d="M ${px.toFixed(2)} ${(py-4.5).toFixed(2)} L ${(px-4.5).toFixed(2)} ${(py+4.5).toFixed(2)} L ${(px+4.5).toFixed(2)} ${(py+4.5).toFixed(2)} Z" fill="${c}" stroke="${pal.markerStroke}" stroke-width="1"/>`); else out.push(`<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="3.2" fill="${c}" stroke="${pal.markerStroke}" stroke-width="1"/>`); const compactMap={'1':'51N','2':'51F','3':'50N','4':'50F','5':'FTmín','6':'FTmáx','7':'Inr','8':'NANSI','9':'ANSI','10':'Icc3F','11':'Icc2F','12':'Icc2F-T','M50F':'MF','M50N':'MN'}; const compactLabel=compactMap[String(shortLabel)]||String(longLabel||shortLabel).replace('M51NS','M-51NS').replace('M50NS','M-50NS').replace('51NS','51NS').replace('50NS','50NS'); const label=mode==='technical'?longLabel:compactLabel; const tw=Math.max(18, label.length*4.7+10), th=15, gap=3; let tx=Math.min(Math.max(px+dx,PL+tw/2+2),PR-tw/2-2), ty=py-7+dy; let rect={x1:tx-tw/2,x2:tx+tw/2,y1:ty-12,y2:ty-12+th}; const overlap=(a,b)=>a.x1<b.x2+gap&&a.x2>b.x1-gap&&a.y1<b.y2+gap&&a.y2>b.y1-gap; let tries=0; if(isBottomMarker){const candidates=[];for(let lane=0;lane<8;lane++){const laneY=PB-11-lane*15;[0,-34,34,-68,68,-102,102].forEach(shift=>candidates.push({tx:px+dx+shift,ty:laneY}))}for(const cand of candidates){tx=Math.min(Math.max(cand.tx,PL+tw/2+2),PR-tw/2-2);ty=cand.ty;rect={x1:tx-tw/2,x2:tx+tw/2,y1:ty-12,y2:ty-12+th};if(!boxes.some(b=>overlap(rect,b)))break;}}else{while(boxes.some(b=>overlap(rect,b))&&tries<16){tries++; ty-=17; if(ty<PT+18){ty=py+22+(tries%4)*17;} tx=Math.min(Math.max(px+dx+((tries%2)?18:-18),PL+tw/2+2),PR-tw/2-2); rect={x1:tx-tw/2,x2:tx+tw/2,y1:ty-12,y2:ty-12+th};}} boxes.push(rect); if(!isBottomMarker&&(Math.abs(tx-px)>2||Math.abs(ty-(py-7))>2)) line(px,py,tx,ty-7,pal.markerLine,.55,'2 3'); out.push(`<rect x="${rect.x1.toFixed(2)}" y="${rect.y1.toFixed(2)}" width="${tw.toFixed(2)}" height="${th}" rx="4" fill="${pal.tagFill}" stroke="${pal.tagStroke}" stroke-width=".55"/>`); text(label,tx,ty,{anchor:'middle',size:8.4,weight:400,color:pal.tagText});}
  const svgCoordRefs=buildCoordReferenceItems54(d,coordCurveOn);
  svgCoordRefs.forEach(m=>marker(m.x,m.y,m.label,m.tag,m.color,m.dx||0,m.dy||0,m.shape||'circle'));
  const fy=PB+48; line(PL,fy-12,PR,fy-12,pal.legendLine,.8); text('Curvas',PL+10,fy,{size:9.6,weight:600,color:pal.legendText});
  const svgItems=[];
  if(coordCurveOn('c51f')||coordCurveOn('c50f')) svgItems.push(['Relé cliente fase',col.cf,'']);
  if(coordCurveOn('c51n')||coordCurveOn('c50n')) svgItems.push(['Relé cliente neutro composto',col.cn,'']);
  if(coordCurveOn('c51ns')||coordCurveOn('c50ns')) svgItems.push(['Estágios 51NS/51GS cliente',isNight?'#bc8cff':'rgba(126,34,206,.82)','2 3']);
  if(coordCurveOn('m51f')||coordCurveOn('m50f')) svgItems.push(['Relé montante fase',col.mf,'7 4']);
  if(coordCurveOn('m51n')||coordCurveOn('m50n')) svgItems.push(['Relé montante neutro composto',col.mn,'7 4']);
  if(coordCurveOn('m51ns')||coordCurveOn('m50ns')) svgItems.push(['Estágios 51NS/51GS montante',isNight?'#ffd166':'rgba(161,98,7,.78)','6 3']);
  if(coordCurveOn('fuse'))svgItems.push([fuseLabelCoordV511()+' mín.',col.fs,'5 4'],[fuseLabelCoordV511()+' máx.',col.fs,'']);
  if(coordCurveOn('hh'))coordHHFuseItems54(d).forEach(item=>svgItems.push([item.label,item.color,item.dash.join(' ')]));
  svgItems.forEach((it,i)=>{const x=PL+10,y=fy+17+i*13.2;line(x,y,x+22,y,it[1],1.35,it[2]);text(it[0],x+29,y+3.3,{size:8.4,color:pal.legendText})});
  const svgRefX=PL+242;
  text('Referências principais',svgRefX,fy,{size:9.6,weight:600,color:pal.legendText});
  const trimSvg=(s,n)=>String(s||'').length>n?String(s).slice(0,n-1).trim()+'…':String(s||'');
  const svgRefs=svgCoordRefs.map(m=>`(${m.n}) ${trimSvg(m.desc,14)} = ${trimSvg(fmt(Number(m.value),1,'A')+(m.extra||''),14)}`);
  const svgColW=150, svgAvailCols=Math.max(1,Math.floor((PR-svgRefX-4)/svgColW)), svgMaxPerCol=Math.max(5,Math.ceil(svgRefs.length/svgAvailCols));
  svgRefs.forEach((r,i)=>text(r,svgRefX+Math.floor(i/svgMaxPerCol)*svgColW,fy+15+(i%svgMaxPerCol)*10.8,{size:7.2,color:pal.legendText}));
  text('Nota: SVG vetorial usa a mesma escala log-log e os mesmos dados do canvas. Validar com curvas oficiais, relé e concessionária.',PL,H-14,{size:8,color:pal.note});
  out.push('</svg>');
  return out.join('');
}
function exportarSVGCoordenograma54(){
  const d=calcData(false); drawChart(d);
  const blob=new Blob([gerarCoordenogramaSVG54(d)],{type:'image/svg+xml;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='coordenograma_relaytester.svg'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function exportarPNGCoordenogramaClassicoHD(d=calcData(false)){
  const canvas=$('coord');
  if(!canvas)return;
  const geom=window.__flCoordGeom||{};
  const cssW=Number(geom.W)||Number.parseFloat(canvas.style.width)||canvas.clientWidth;
  const cssH=Number(geom.H)||Number.parseFloat(canvas.style.height)||canvas.clientHeight;
  const plotBefore=[geom.plotLeft,geom.plotRight,geom.plotTop,geom.plotBottom].join(',');
  drawChart(d,{cssWidth:cssW,cssHeight:cssH,pixelRatio:4});
  canvas.dataset.lastPngResolution=canvas.width+' x '+canvas.height+' px';
  canvas.dataset.lastPngPlotGeometry=plotBefore;
  const a=document.createElement('a');
  a.download='coordenograma_tela_HD.png';
  a.href=canvas.toDataURL('image/png');
  a.click();
  drawChart(d);
}
// Modelo de conferência v6.4.9 R13: descreve o que deve existir em tela, PNG, SVG e relatório.
function buildCoordRenderModel(d=calcData(false)){
  const isOn=id=>!!$(id)?.checked;
  const curveOn=k=>document.querySelector(`[data-coord-curve="${k}"]`)?.checked!==false;
  const pos=v=>Number.isFinite(Number(v))&&Number(v)>0;
  const add=(arr,item)=>{arr.push(Object.assign({active:true,required:true},item));};
  const curves=[],markers=[],references=[],legends=[];
  add(curves,{id:'cliente_51f_50f',grupo:'Curvas',label:'Relé cliente fase',active:pos(d.p51)||pos(d.p50),svgToken:'Relé cliente fase'});
  add(curves,{id:'cliente_neutro',grupo:'Curvas',label:'Relé cliente neutro composto',active:pos(d.p51n)||pos(d.p50n)||pos(d.p51ns)||pos(d.p51gs)||pos(val('p50ns')),svgToken:'Relé cliente neutro'});
  add(curves,{id:'cliente_51ns_51gs_estagios',grupo:'Curvas',label:'Estágios 51NS/51GS cliente',active:curveOn('c51ns')&&(pos(d.p51ns)||pos(d.p51gs)),svgToken:'Estágios 51NS/51GS cliente'});
  add(curves,{id:'montante_51f_50f',grupo:'Curvas',label:'Relé montante fase',active:pos(val('m51f'))||pos(val('m50f')),svgToken:'Relé montante fase'});
  add(curves,{id:'montante_neutro',grupo:'Curvas',label:'Relé montante neutro composto',active:pos(val('m51n'))||pos(val('m50n'))||pos(val('m51ns'))||pos(val('m51gs'))||pos(val('m50ns')),svgToken:'Relé montante neutro'});
  add(curves,{id:'montante_51ns_51gs_estagios',grupo:'Curvas',label:'Estágios 51NS/51GS montante',active:curveOn('m51ns')&&(pos(val('m51ns'))||pos(val('m51gs'))),svgToken:'Estágios 51NS/51GS montante'});
  add(curves,{id:'cliente_50ns',grupo:'Curvas',label:'50NS cliente',active:curveOn('c50ns')&&pos(val('p50ns')),svgToken:'50NS cliente'});
  add(curves,{id:'montante_50ns',grupo:'Curvas',label:'50NS montante',active:curveOn('m50ns')&&pos(val('m50ns')),svgToken:'50NS montante'});
  add(curves,{id:'fusivel_montante',grupo:'Curvas',label:fuseLabelCoordV511(),active:curveOn('fuse')&&pos(fuseBaseCoordV511()),svgToken:fuseLabelCoordV511()});
  coordHHFuseItems54(d).forEach((h,i)=>add(curves,{id:`fusivel_hh_${i+1}`,grupo:'Curvas',label:h.label,active:curveOn('hh')&&pos(h.base),svgToken:h.label}));
  [
    ['icc3f','Icc 3F',val('icc3f'),'Icc 3F'],
    ['icc2f','Icc 2F',val('icc2f'),'Icc 2F'],
    ['icc2ft','Icc 2F-T',val('icc2ft'),'Icc 2F-T'],
    ['iccftmax','FT máx.',val('iccftmax'),'FT máx.'],
    ['iccftmin','FT mín.',val('iccftmin'),'FT mín.'],
    ['inrush','Inrush',val('inrush'),'Inrush'],
    ['partida_51','Partida 51',d.p51,'Partida 51'],
    ['partida_51n','Partida 51N',d.p51n,'Partida 51N'],
    ['partida_50','Partida 50',d.p50,'Partida 50'],
    ['partida_50n','Partida 50N',d.p50n,'Partida 50N'],
    ['montante_50f','50F montante',val('m50f'),'M50F'],
    ['montante_50n','50N montante',val('m50n'),'M50N'],
    ['cliente_51ns','51NS cliente',d.p51ns,'51NS'],
    ['cliente_51gs','51GS cliente',d.p51gs,'51GS'],
    ['cliente_50ns','50NS cliente',val('p50ns'),'50NS'],
    ['montante_51ns','51NS montante',val('m51ns'),'M51NS'],
    ['montante_51gs','51GS montante',val('m51gs'),'M51GS'],
    ['montante_50ns','50NS montante',val('m50ns'),'M50NS']
  ].forEach(([id,label,value,token])=>add(markers,{id,grupo:'Marcadores',label,active:isOn('coordMarkers')&&pos(value),svgToken:token}));
  coordAnsiMarkersV54(d).forEach((m,i)=>add(markers,{id:`ansi_nansi_${i+1}`,grupo:'Marcadores',label:m.name,active:isOn('coordMarkers')&&pos(m.x),svgToken:m.name}));
  add(references,{id:'legenda_curvas',grupo:'Legendas',label:'Legenda das curvas',active:isOn('coordCurveLegend'),svgToken:'Curvas'});
  add(references,{id:'legenda_referencias',grupo:'Legendas',label:'Referências principais',active:isOn('coordRefLegend'),svgToken:'Referências principais'});
  add(legends,{id:'tema',grupo:'Configuração',label:`Tema ${str('coordTheme')||'white'}`,active:true});
  add(legends,{id:'marcadores_modo',grupo:'Configuração',label:`Marcadores ${str('coordMarkerMode')||'technical'}`,active:true});
  const elements=[...curves,...markers,...references,...legends].map(x=>Object.assign({},x,{active:!!x.active}));
  return {
    version:FL_APP_VERSION,
    generatedAt:new Date().toISOString(),
    title:str('coordTitle')||`Coordenograma — Coordenação de Proteção`,
    theme:str('coordTheme')||'white',
    markerMode:str('coordMarkerMode')||'technical',
    ansiMode:str('coordAnsiMode')||'todos',
    scale:{xMin:val('coordXMin'),xMax:val('coordXMax'),yMin:val('coordYMin'),yMax:val('coordYMax')},
    elements,
    activeElements:elements.filter(x=>x.active)
  };
}
function validateRenderConsistency(d=calcData(false),opts={}){
  const model=buildCoordRenderModel(d);
  const result={version:FL_APP_VERSION,generatedAt:new Date().toISOString(),status:'OK',model,checks:[],items:[],missing:[]};
  const add=(target,ok,evidence,recommendation='')=>{result.checks.push({target,ok:!!ok,evidence:evidence||'-',recommendation:recommendation||'-'}); if(!ok)result.missing.push({target,evidence,recommendation});};
  let png='',svg='';
  let canvasOk=false,pngOk=false,svgOk=false,reportOk=false,svgLower='';
  try{
    if(!opts.skipRedraw) drawChart(d);
    const canvas=$('coord');
    png=canvas?.toDataURL('image/png')||'';
    canvasOk=!!canvas&&canvas.width>0&&canvas.height>0;
    pngOk=png.length>1200;
    add('Tela/Canvas',canvasOk,canvas?`${canvas.width}x${canvas.height}`:'canvas indisponível','Gerar coordenograma antes da emissão.');
    add('PNG',pngOk,`PNG dataURL ${png.length} caracteres`,'Regerar PNG a partir do canvas ativo.');
  }catch(e){add('Tela/PNG',false,e.message||String(e),'Revisar erro de renderização do canvas.');}
  try{
    svg=gerarCoordenogramaSVG54(d);
    svgLower=svg.toLowerCase();
    const pathCount=(svg.match(/<path\b/g)||[]).length;
    const activeCurves=model.activeElements.filter(x=>x.grupo==='Curvas').length;
    svgOk=svg.includes('<svg')&&pathCount>=Math.max(1,activeCurves);
    add('SVG',svgOk,`paths ${pathCount}; curvas ativas ${activeCurves}`,'Revisar exportação SVG para conter as curvas ativas.');
    model.activeElements.filter(x=>x.svgToken&&['Curvas','Legendas'].includes(x.grupo)).forEach(x=>{
      add(`SVG:${x.id}`,svgLower.includes(String(x.svgToken).toLowerCase()),`token "${x.svgToken}"`,'Garantir que legenda/elemento ativo esteja identificado no SVG.');
    });
  }catch(e){add('SVG',false,e.message||String(e),'Revisar geração vetorial.');}
  const reportEl=opts.reportElement||$('report');
  const reportTxt=reportEl?.textContent||'';
  const reportHasImage=!!reportEl?.querySelector?.('.afyaCoord,.coordImg,img[alt*="Coordenograma"]');
  reportOk=reportHasImage||reportTxt.includes('Coordenograma');
  add('Relatório HTML',reportOk,reportHasImage?'Imagem do coordenograma incorporada':'Texto/placeholder do coordenograma localizado','Gerar relatório após gerar o coordenograma.');
  add('Modelo ativo',model.activeElements.length>0,`${model.activeElements.length} elementos ativos no renderModel`,'Parametrizar ao menos uma curva ou marcador técnico.');
  model.activeElements.forEach(el=>{
    const token=String(el.svgToken||el.label||'').toLowerCase();
    const svgItemOk=el.grupo==='Configuração' ? true : (!token || svgLower.includes(token) || svgOk);
    const item={id:el.id,grupo:el.grupo,label:el.label,targets:{canvas:canvasOk,png:pngOk,svg:svgItemOk,relatorio:reportOk}};
    item.ok=Object.values(item.targets).every(Boolean);
    result.items.push(item);
    if(!item.ok) result.missing.push({target:`Elemento:${el.id}`,evidence:`${el.label} ausente em ${Object.entries(item.targets).filter(([,ok])=>!ok).map(([k])=>k).join(', ')}`,recommendation:'Conferir fidelidade do elemento ativo entre tela, PNG, SVG e relatório.'});
  });
  if(result.missing.length) result.status=result.missing.some(x=>/Tela|PNG|SVG|Relatório/.test(x.target))?'REVISAR':'ATENÇÃO';
  window.__lastCoordRenderModel=model;
  window.__lastRenderConsistency=result;
  return result;
}
function renderCoordDiagnóstico33(d){
  const box=$('coordAnalise'); if(!box)return;
  const curvas=[
    ['Cliente fase',str('curva51')],['Cliente neutro 51N',str('curva51n')],['Cliente 51NS',str('curva51ns')],['Cliente 51GS',str('curva51gs')],
    ['Montante fase',str('mCurvaF')],['Montante neutro 51N',str('mCurvaN')],['Montante 51NS',str('mCurva51ns')],['Montante 51GS',str('mCurva51gs')]
  ];
  const modoAnsi=str('coordAnsiMode')||'todos';
  const multi=d.multi||calcTrafosV507();
  let ansiNota='<div class="divider">ANSI/NANSI no coordenograma</div><div class="curveMemo">';
  if(multi&&multi.lista?.length){
    const txtModo={adotada:'Referência adotada no estudo',todos:'Todos os transformadores ativos',maior:'Maior transformador',menor:'Menor transformador',total:'Equivalente total',selecionado:'Transformador selecionado'}[modoAnsi]||modoAnsi;
    ansiNota += '<div><b>Modo exibido</b><br>'+txtModo+'</div>';
    ansiNota += '<div><b>Referência atual</b><br>'+((modoAnsi==='todos')?(multi.ativos+' transformadores'):(modoAnsi==='total'?'TOTAL':(modoAnsi==='selecionado'?str('ansiRefTag'):multi.refTag)))+'</div>';
    ansiNota += '<div><b>Observação</b><br>Use “Todos” para comparar limites individuais; use “Menor” para verificação conservadora.</div>';
  } else {
    ansiNota += '<div><b>Referência</b><br>ANSI/NANSI principal do estudo</div>';
  }
  ansiNota+='</div>';
  const fuseNota='<div class="divider">Fusível/religador montante</div><div class="curveMemo"><div><b>Curva exibida</b><br>'+fuseLabelCoordV511()+'</div><div><b>Critério</b><br>'+str('fuseAutoCrit')+'</div><div><b>Observação</b><br>Curva aproximada para visualização; validar com curva oficial do fabricante/concessionária.</div></div>';
  box.innerHTML=renderDiagnósticoTecnico360(d)+renderDiagnosticoAvancado54(d)+ansiNota+fuseNota+'<div class="divider">Curvas utilizadas no coordenograma</div><div class="curveMemo">'+curvas.map(c=>'<div><b>'+c[0]+'</b><br>'+curvaNome360(c[1])+'</div>').join('')+'</div>';
}
function renderFidelityPanel(d){
  const box=$('fidelityBox'); if(!box)return null;
  const r=validateRenderConsistency(d,{skipRedraw:true,reportElement:$('report')});
  const okItems=(r.items||[]).filter(x=>x.ok).length;
  const miss=(r.items||[]).filter(x=>!x.ok);
  const cls=r.status==='OK'?'ok':(r.status==='REVISAR'?'bad':'warn');
  const targetText=item=>Object.entries(item.targets||{}).map(([k,v])=>`${k}:${v?'OK':'--'}`).join(' ');
  const details=(miss.length?miss:(r.items||[]).slice(0,8)).map(x=>`<div class="fidelityItem"><span>${auditHtml(x.label||x.id)}</span><span class="fidelityTargets">${auditHtml(targetText(x))}</span></div>`).join('');
  box.className=`fidelityPanel ${cls}`;
  box.innerHTML=`<div class="fidelityHead"><b>Fidelidade gráfica</b><span class="fidelityBadge">${auditHtml(r.status)}</span></div><div class="fidelityGrid"><div class="fidelityKpi"><b>Ativos</b><span>${r.model.activeElements.length}</span></div><div class="fidelityKpi"><b>OK</b><span>${okItems}</span></div><div class="fidelityKpi"><b>Revisar</b><span>${miss.length}</span></div><div class="fidelityKpi"><b>Checks</b><span>${r.checks.length}</span></div></div><details><summary>Ver matriz de destinos</summary><div class="fidelityList">${details||'<div class="fidelityItem"><span>Sem divergências</span><span class="fidelityTargets">OK</span></div>'}</div></details>`;
  return r;
}
function diagnosticoRelatorio360(d){
  const diag=diagnosticoTecnico360(d);
  const erros=(diag.erros||[]).map(x=>x.msg||String(x));
  const avisos=(diag.msgs||[]).filter(x=>x.t==='warn'||x.t==='bad').map(x=>x.m||String(x));
  return {
    erros: erros.length?erros:['Sem erros criticos informados pelo diagnostico automatico.'],
    avisos: avisos.length?avisos:['Sem avisos relevantes.']
  };
}
function auditHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function auditSeverityRank(sev){return {'OK':0,'Informação':1,'Atenção':2,'Erro crítico':3}[sev]??1;}
function auditTransfer51to50({label,pickup51,curve51,tms51,pickup50,time50}){
  const p51=Number(pickup51), p50=Number(pickup50), t50=coordInstantDelay360(Number(time50));
  const invalidBase=!(Number.isFinite(p51)&&p51>0&&Number.isFinite(p50)&&p50>0&&Number.isFinite(t50)&&t50>=0);
  if(invalidBase){
    return {
      label,status:'REVISAR',ok:false,critical:true,t51At50:NaN,time50:t50,
      evidence:'Dados insuficientes para auditar a transferência 51→50.',
      recommendation:'Informar pickup 51, pickup 50 e tempo definido da 50 para validar a transferência.'
    };
  }
  if(p50<=p51){
    return {
      label,status:'CRÍTICO',ok:false,critical:true,t51At50:NaN,time50:t50,
      evidence:`pickup50 ${fmt(p50,3,'A')} não está acima do pickup51 ${fmt(p51,3,'A')}.`,
      recommendation:'A função 50 deve iniciar em corrente superior à função 51 correspondente; revisar pickups.'
    };
  }
  const t51At50=tTCC(curve51,p50/p51,Number(tms51));
  if(!(Number.isFinite(t51At50)&&t51At50>0)){
    return {
      label,status:'REVISAR',ok:false,critical:true,t51At50,time50:t50,
      evidence:`t51@50 inválido para ${label}; M=${fmt(p50/p51,4,'')}.`,
      recommendation:'Revisar curva, TMS/dial e pickups da função 51.'
    };
  }
  const ok=t51At50>=t50;
  return {
    label,status:ok?'OK':'CRÍTICO',ok,critical:!ok,t51At50,time50:t50,
    evidence:`t51@pickup50 ${fmt(t51At50,4,'s')} | t50 ${fmt(t50,4,'s')} | pickup51 ${fmt(p51,2,'A')} | pickup50 ${fmt(p50,2,'A')}`,
    recommendation:ok?'Transferência 51→50 coerente.':'Transferência 51→50 incoerente: a função 51 está atuando mais rápido que a função 50 no ponto de partida da 50. Revisar curva, TMS, pickup ou tempo definido da função 50.'
  };
}
// Converte a lista de verificações técnicas em um status objetivo para emissão do estudo.
function getStudyEmissionStatus(auditResults){
  const items=Array.isArray(auditResults?.items)?auditResults.items:[];
  const counts={ok:0,info:0,warn:0,error:0,total:items.length};
  items.forEach(x=>{const s=x.severidade||''; if(s==='Erro crítico')counts.error++; else if(s==='Atenção')counts.warn++; else if(s==='OK')counts.ok++; else counts.info++;});
  const hasCritical=counts.error>0;
  const hasWarn=counts.warn>0;
  const hasNoCurve=items.some(x=>/Coordenograma sem curvas principais|função ativa sem plotagem|ausente no coordenograma/i.test(x.item+' '+x.resultado+' '+x.evidencia));
  const hasMathError=items.some(x=>/NaN|infinita|inválid|inval|erro matemático|TC inválido|RTC inválido/i.test(x.resultado+' '+x.evidencia));
  let status='APROVADO PARA EMISSÃO', classe='good';
  if(hasCritical || hasNoCurve || hasMathError){status='INCONSISTENTE — NÃO EMITIR'; classe='bad';}
  else if(hasWarn){status='REVISAR ANTES DE EMITIR'; classe='warn';}
  else if(counts.info>0){status='APROVADO COM RESSALVAS'; classe='warn';}
  const motivos=items.filter(x=>x.severidade==='Erro crítico'||x.severidade==='Atenção'||x.severidade==='Informação').map(x=>`${x.grupo}: ${x.item} — ${x.resultado}`);
  const recomendacoes=[...new Set(items.filter(x=>x.recomendacao && x.severidade!=='OK').map(x=>x.recomendacao))];
  return {status,classe,counts,motivos,recomendacoes};
}
// Auditoria central v6.4.9 R13: consolida dados elétricos, TC/RTC, funções de proteção e critérios críticos.
function executarAuditoriaTecnica(d=calcData(false)){
  const items=[];
  const add=(grupo,item,pass,evidencia,recomendacao='',warn=false)=>{
    let severidade=pass?'OK':(warn?'Atenção':'Erro crítico');
    let resultado=pass?'OK':(warn?'Atenção':'Erro');
    items.push({grupo,item,resultado,severidade,evidencia:evidencia||'-',recomendacao:recomendacao||'-'});
  };
  const info=(grupo,item,evidencia,recomendacao='Validar tecnicamente antes da emissão final.')=>items.push({grupo,item,resultado:'Informação',severidade:'Informação',evidencia:evidencia||'-',recomendacao});
  const finite=v=>Number.isFinite(Number(v));
  const pos=v=>finite(v)&&Number(v)>0;
  const near=(a,b,lim=.01)=>pos(a)&&pos(b)&&Math.abs(Number(a)-Number(b))/Math.max(Math.abs(Number(b)),.000001)<=lim;
  const curveOk=c=>!!String(c||'').trim();
  const isTD=c=>normCurve360(c)==='TD';
  const conv=(grupo,nome,prim,sec)=>{
    if(!(pos(prim)||pos(sec))) return;
    const expected=Number(prim)/d.rtc;
    add(grupo,`${nome} - conversão TC`,pos(d.rtc)&&near(expected,sec,.01),`${fmt(prim,3,'A prim.')} / RTC ${fmt(d.rtc,3,'')} = ${fmt(expected,4,'A sec.')} | informado/calculado ${fmt(sec,4,'A sec.')}`,'Corrigir RTC ou pickup primário/secundário; divergência máxima adotada: 1%.',true);
  };

  add('Dados elétricos','Potência total dos transformadores ativos',pos(d.kva),fmt(d.kva,2,'kVA'),'Informar potência válida do transformador ou dos transformadores ativos.');
  add('Dados elétricos','Tensão primária',pos(d.kv),fmt(d.kv,3,'kV'),'Informar tensão primária válida.');
  add('Dados elétricos','Tensão secundária',pos(d.vbt),fmt(d.vbt,1,'V'),'Informar tensão secundária válida.');
  add('Dados elétricos','Corrente nominal AT',pos(d.inAT),fmt(d.inAT,3,'A'),'Revisar potência e tensão primária.');
  add('Dados elétricos','Corrente nominal BT',pos(d.inBT),fmt(d.inBT,3,'A'),'Revisar potência e tensão secundária.');
  add('Dados elétricos','Corrente de demanda AT',pos(d.iDem),fmt(d.iDem,3,'A'),'Revisar demanda, tensão e fator de potência.',true);
  add('Dados elétricos','Corrente de inrush/magnetização adotada',pos(val('inrush')),fmt(val('inrush'),3,'A'),'Revisar fator/metodologia de inrush.');
  add('Dados elétricos','Corrente ANSI',pos(val('ansi')),fmt(val('ansi'),3,'A'),'Revisar impedância do transformador e referência ANSI.');
  add('Dados elétricos','Corrente NANSI',pos(val('nansi')),fmt(val('nansi'),3,'A'),'Revisar ligação do transformador e referência NANSI.');
  add('Dados elétricos','Corrente de curto-circuito de fase adotada',pos(d.icc51),fmt(d.icc51,3,'A'),'Informar curto-circuito válido para a curva 51.');
  add('Dados elétricos','Corrente de curto-circuito terra adotada',pos(d.iccTerra),fmt(d.iccTerra,3,'A'),'Informar curto fase-terra válido para funções 51N/50N/51NS.',true);
  if(d.multi?.ativos>1) info('Transformador',`Múltiplos transformadores ativos (${d.multi.ativos})`,`Total ${fmt(d.multi.kvaTotal,1,'kVA')}; inrush ${fmt(d.multi.inrushTotal,1,'A')}; ${d.multi.metodoTxt}`,'Conferir se o método de associação representa a energização real da instalação.');

  add('TC/RTC','TC primário informado',pos(d.tcP),fmt(d.tcP,2,'A'),'Informar primário do TC.');
  add('TC/RTC','TC secundário informado',pos(d.tcS),fmt(d.tcS,2,'A'),'Informar secundário do TC.');
  add('TC/RTC','RTC calculado',pos(d.rtc),fmt(d.rtc,4,''),'Corrigir TC primário/secundário.');
  add('TC/RTC','Burden e ALF efetivo preliminar',!!d.tcOk,`ALFef ${fmt(d.alfEf,2,'')} | Isec falta ${fmt(d.iSecFalta,2,'A')}`,'Validar TC com dados oficiais de classe, carga e saturação.',true);
  conv('TC/RTC','51F cliente',d.p51,d.s51); conv('TC/RTC','50F cliente',d.p50,d.s50); conv('TC/RTC','51N cliente',d.p51n,d.s51n); conv('TC/RTC','50N cliente',d.p50n,d.s50n); conv('TC/RTC','51NS cliente',d.p51ns,d.s51ns); conv('TC/RTC','51GS cliente',d.p51gs,d.s51gs);

  const inverseCurves=['NI','MI','VI','EI','LTI','C1','C2','C3','C4','C5','U1','U2','U3','U4','U5'];
  const auditFunc=({grupo,fn,pick,sec,curva,tempo,tms,instant=false,required=false,plot=true})=>{
    const active=pos(pick);
    if(!active && !required){info(grupo,`${fn} desabilitada ou não parametrizada`,'Pickup zerado/ausente.','Manter desabilitada apenas quando houver decisão técnica ou não aplicabilidade.');return;}
    add(grupo,`${fn} pickup válido`,active,fmt(pick,4,'A prim.'),`Informar pickup válido para ${fn}.`);
    conv(grupo,fn,pick,sec);
    if(instant){add(grupo,`${fn} tempo definido válido`,pos(tempo)||tempo===0,fmt(tempo,3,'s'),`Informar tempo definido válido para ${fn}.`,true);}
    else{
      add(grupo,`${fn} curva válida`,curveOk(curva),String(curva||'-'),`Selecionar curva válida para ${fn}.`);
      if(isTD(curva)) add(grupo,`${fn} tempo definido válido`,pos(tempo),fmt(tempo,3,'s'),`Informar tempo definido válido para ${fn}.`);
      else add(grupo,`${fn} TMS/dial válido`,pos(tms??tempo),fmt(tms??tempo,4,''),`Informar TMS/dial válido para ${fn}.`);
    }
    add(grupo,`${fn} presente no coordenograma quando ativa`,!!plot,plot?'Ativa no modelo gráfico':'Sem evidência de plotagem','Garantir que função ativa apareça em tela, PNG, SVG e relatório.',true);
  };
  auditFunc({grupo:'Proteção cliente',fn:'51F cliente',pick:d.p51,sec:d.s51,curva:str('curva51'),tms:val('tms51'),plot:pos(d.p51)});
  auditFunc({grupo:'Proteção cliente',fn:'50F cliente',pick:d.p50,sec:d.s50,tempo:val('t50'),instant:true,plot:pos(d.p50)});
  auditFunc({grupo:'Proteção cliente',fn:'51N cliente',pick:d.p51n,sec:d.s51n,curva:str('curva51n'),tms:val('tms51n'),plot:pos(d.p51n)});
  auditFunc({grupo:'Proteção cliente',fn:'50N cliente',pick:d.p50n,sec:d.s50n,tempo:val('t50n'),instant:true,plot:pos(d.p50n)});
  auditFunc({grupo:'Proteção cliente',fn:'51NS cliente',pick:d.p51ns,sec:d.s51ns,curva:str('curva51ns'),tempo:val('t51ns'),tms:val('t51ns'),plot:pos(d.p51ns)});
  auditFunc({grupo:'Proteção cliente',fn:'51GS cliente',pick:d.p51gs,sec:d.s51gs,curva:str('curva51gs'),tempo:val('t51gs'),tms:val('t51gs'),plot:pos(d.p51gs)});
  auditFunc({grupo:'Proteção montante',fn:'51F montante',pick:val('m51f'),sec:NaN,curva:str('mCurvaF'),tms:val('mTmsF'),plot:pos(val('m51f'))});
  auditFunc({grupo:'Proteção montante',fn:'50F montante',pick:val('m50f'),sec:NaN,tempo:val('mT50f'),instant:true,plot:pos(val('m50f'))});
  auditFunc({grupo:'Proteção montante',fn:'51N montante',pick:val('m51n'),sec:NaN,curva:str('mCurvaN'),tms:val('mTmsN'),plot:pos(val('m51n'))});
  auditFunc({grupo:'Proteção montante',fn:'50N montante',pick:val('m50n'),sec:NaN,tempo:val('mT50n'),instant:true,plot:pos(val('m50n'))});
  auditFunc({grupo:'Proteção montante',fn:'51NS montante',pick:val('m51ns'),sec:NaN,curva:str('mCurva51ns'),tempo:val('mT51ns'),tms:val('mT51ns'),plot:pos(val('m51ns'))});
  auditFunc({grupo:'Proteção montante',fn:'51GS montante',pick:val('m51gs'),sec:NaN,curva:str('mCurva51gs'),tempo:val('mT51gs'),tms:val('mT51gs'),plot:pos(val('m51gs'))});

  info('51NS/51GS','Funções sensíveis independentes','51NS e 51GS são tratadas como estágios próprios e não alteram automaticamente a 51N.','Manter 51N, 51NS e 51GS com critérios e justificativas separados.');
  add('51NS/51GS','51GS independente da 51NS',!(pos(d.p51gs)&&pos(d.p51ns)&&Math.abs(d.p51gs-d.p51ns)<0.0001&&String($('p51gs')?.dataset.state||'')==='auto'),`51NS ${fmt(d.p51ns,3,'A')} | 51GS ${fmt(d.p51gs,3,'A')} | origem 51GS ${$('p51gs')?.dataset.state||'operador'}`,'Não espelhar 51GS automaticamente a partir da 51NS; configurar somente quando aplicável.',true);
  add('Seletividade','50F acima do inrush usado na função',d.p50>d.inrush50F,`50F ${fmt(d.p50,2,'A')} | inrush 50F ${fmt(d.inrush50F,2,'A')}`,'Elevar 50F, revisar margem ou aplicar bloqueio/filosofia específica para energização.',true);
  [
    auditTransfer51to50({label:'51F cliente × 50F cliente',pickup51:d.p51,curve51:str('curva51'),tms51:val('tms51'),pickup50:d.p50,time50:val('t50')}),
    auditTransfer51to50({label:'51N cliente × 50N cliente',pickup51:d.p51n,curve51:str('curva51n'),tms51:val('tms51n'),pickup50:d.p50n,time50:val('t50n')}),
    auditTransfer51to50({label:'51F montante × 50F montante',pickup51:val('m51f'),curve51:str('mCurvaF'),tms51:val('mTmsF'),pickup50:val('m50f'),time50:val('mT50f')}),
    auditTransfer51to50({label:'51N montante × 50N montante',pickup51:val('m51n'),curve51:str('mCurvaN'),tms51:val('mTmsN'),pickup50:val('m50n'),time50:val('mT50n')})
  ].forEach(r=>{
    add('Transferência 51→50',r.label,r.ok,r.evidence,r.recommendation,!r.critical);
  });
  add('Seletividade','50N coerente com 51N',d.p50n>d.p51n,`50N ${fmt(d.p50n,2,'A')} | 51N ${fmt(d.p51n,2,'A')}`,'Revisar relação entre instantânea e temporizada de neutro.',true);
  if(nsGsSobreposto51N360(d.p51n,d.p51ns)||nsGsSobreposto51N360(d.p51n,d.p51gs)) info('51NS/51GS','51NS/51GS próxima ou sobreposta à 51N',`51N ${fmt(d.p51n,2,'A')} | 51NS ${fmt(d.p51ns,2,'A')} | 51GS ${fmt(d.p51gs,2,'A')}`,'51NS/51GS encontra-se sobreposta ou próxima da 51N. Verificar coordenação e seletividade.');
  if(!pos(d.p51ns)&&!pos(d.p51gs)){
    const just=String(str('just51ns')||'').trim();
    add('51NS/51GS','Justificativa técnica para terra sensível desabilitada',just.length>=12,just||'Não informada','Registrar justificativa técnica quando a concessionária ou filosofia do relé exigir terra sensível.',true);
  }
  if(pos(fuseBaseCoordV511())) info('Curvas aproximadas','Fusível/religador montante aproximado',fuseLabelCoordV511(),'Curva aproximada para visualização. Validar com a curva oficial do fabricante/concessionária.');
  ['curva51','curva51n','curva51ns','curva51gs','mCurvaF','mCurvaN','mCurva51ns','mCurva51gs'].forEach(id=>{const c=str(id); if(/^U[1-5]$/.test(c)) info('Curvas SEL',`${id} usa curva SEL ${c}`,curvaNome360(c),'Confirmar constantes e nomenclatura no manual oficial do fabricante.');});
  add('Coordenograma','Coordenograma possui curvas principais',pos(d.p51)||pos(d.p50)||pos(d.p51n)||pos(d.p50n),'Funções principais cliente avaliadas','Parametrizar pelo menos uma função principal para emissão.');
  add('Coordenograma','Escalas X/Y válidas',val('coordXMax')>val('coordXMin')&&val('coordYMax')>val('coordYMin'),`X ${val('coordXMin')}..${val('coordXMax')} | Y ${val('coordYMin')}..${val('coordYMax')}`,'Corrigir escalas do coordenograma.');
  try{
    const fidelity=validateRenderConsistency(d,{skipRedraw:true});
    info('Fidelidade gráfica','Modelo de conferência criado',`${fidelity.model.activeElements.length} elementos ativos mapeados em buildCoordRenderModel().`,'Usar este modelo como base antes de migrar canvas/SVG para renderização única.');
    fidelity.checks.forEach(ch=>{
      add('Fidelidade gráfica',ch.target,ch.ok,ch.evidence,ch.recommendation,ch.target!=='Tela/Canvas'&&ch.target!=='PNG'&&ch.target!=='SVG');
    });
  }catch(e){
    add('Fidelidade gráfica','Validação de renderização',false,e.message||String(e),'Revisar validateRenderConsistency() antes da emissão.',true);
  }

  const status=getStudyEmissionStatus({items});
  const score=Math.max(0,Math.min(100,100-status.counts.error*22-status.counts.warn*7-status.counts.info*2));
  const pendencias=status.motivos||[];
  const recomendacao=(status.recomendacoes&&status.recomendacoes.length)?status.recomendacoes.join(' '):'Manter revisão técnica final com dados oficiais antes da emissão.';
  const montanteOk=['m51f','m50f','m51n','m50n'].every(id=>pos(val(id)));
  const coordOk=val('coordXMax')>val('coordXMin')&&val('coordYMax')>val('coordYMin')&&(pos(d.p51)||pos(d.p50)||pos(d.p51n)||pos(d.p50n));
  return {version:FL_APP_VERSION,generatedAt:new Date().toISOString(),items,status,nivel:status.status,classe:status.classe,score,pendencias,recomendacao,montanteOk,tcOk:!!d.tcOk,coordOk};
}
function auditoriaPreEmissaoV53(d){return executarAuditoriaTecnica(d);}
function renderAuditBox(d){
  const audit=executarAuditoriaTecnica(d);
  const s=audit.status;
  const cls=s.classe==='bad'?'bad':(s.classe==='warn'?'warn':'ok');
  const compactMotivos=(s.motivos||[]).slice(0,3).map(auditHtml).join(' | ')||'Sem ressalvas relevantes na leitura resumida.';
  const compactRecs=(s.recomendacoes||[]).slice(0,2).map(auditHtml).join(' | ')||'Manter validação técnica final com dados oficiais.';
  const detailRows=(audit.items||[]).filter(x=>x.severidade!=='OK').slice(0,12).map(x=>`<tr><td>${auditHtml(x.grupo)}</td><td>${auditHtml(x.item)}</td><td>${auditHtml(x.resultado)}</td><td>${auditHtml(x.severidade)}</td><td>${auditHtml(x.evidencia)}</td><td>${auditHtml(x.recomendacao)}</td></tr>`).join('')||`<tr><td>Auditoria</td><td>Resumo</td><td>OK</td><td>OK</td><td>Sem alertas relevantes</td><td>Manter conferência final</td></tr>`;
  if($('auditBox')) $('auditBox').innerHTML=`<div class="auditCompact ${cls}"><div><div class="auditStatusTitle">Status Técnico do Estudo</div><div class="auditStatusValue">${auditHtml(s.status)}</div></div><div class="auditKpis"><div class="auditKpi"><b>OK</b><span>${s.counts.ok}</span></div><div class="auditKpi"><b>Info</b><span>${s.counts.info}</span></div><div class="auditKpi"><b>Alertas</b><span>${s.counts.warn}</span></div><div class="auditKpi"><b>Erros</b><span>${s.counts.error}</span></div></div><div class="auditMiniText"><span><b>Motivos:</b> ${compactMotivos}</span><span><b>Recomendação:</b> ${compactRecs}</span></div><details class="auditDetails"><summary>Ver detalhes da auditoria pré-emissão</summary><div class="tableWrap auditMiniTable"><table><thead><tr><th>Grupo</th><th>Item verificado</th><th>Resultado</th><th>Severidade</th><th>Evidência</th><th>Recomendação</th></tr></thead><tbody>${detailRows}</tbody></table></div></details></div>`;
  return audit;
}function renderReport(d){
  const logo=$('logoFile')?.dataset.logoData?`<img src="${$('logoFile').dataset.logoData}" style="max-height:52px;max-width:176px;object-fit:contain;margin-bottom:6px">`:'';
  let coordImg='';
  let coordSvg='';
  try{ drawChart(d); coordImg=$('coord')?.toDataURL('image/png')||''; coordSvg=gerarCoordenogramaSVG54(d); }catch(e){ console.warn('Failed to render coordenogram image/SVG:', e); coordImg=''; coordSvg=''; }
  const devNote=$('devAssinatura')?.checked?'<p class="small">Software desenvolvido por Relaytester - Especialista em Prote&ccedil;&atilde;o de Sistemas El&eacute;tricos de Pot&ecirc;ncia.</p>':'';
  const diag=diagnosticoRelatorio360(d);
  const audit=renderAuditBox(d);
  const erros=(diag.erros||[]).map(x=>`<li>${x}</li>`).join('')||'<li>Sem erros cr&iacute;ticos informados pelo diagn&oacute;stico autom&aacute;tico.</li>';
  const avisos=(diag.avisos||[]).map(x=>`<li>${x}</li>`).join('')||'<li>Sem avisos relevantes.</li>';
  const pendencias=(audit.pendencias||[]).map(x=>`<li>${x}</li>`).join('')||'<li>Sem pend&ecirc;ncias formais identificadas pela auditoria autom&aacute;tica.</li>';
  const trafos=(d.multi?.lista||[]).map(t=>row(t.tag||'-',t.tipo||'-',fmt(t.kva,0,'kVA'),fmt(t.inAT,2,'A'),fmt(t.inrush,1,'A'),fmt(t.ansi,1,'A'),fmt(t.nansi,1,'A'),t.hhMode&&t.hhMode!=='sem'?`${t.hhMode} / ${fmt(Number(t.hhFuse)||0,1,'A')}`:'Sem HH')).join('');
  const paramRows=[
    row('51 fase',fmt(d.p51,2,'A'),fmt(d.s51,3,'A'),curvaNome(str('curva51'))+' / '+fmt(val('tms51'),2,''),'Temporizada de fase'),
    row('50 fase',fmt(d.p50,1,'A'),fmt(d.s50,2,'A'),fmt(val('t50'),2,'s'),'Instant&acirc;nea de fase / inrush'),
    row('51N',fmt(d.p51n,2,'A'),fmt(d.s51n,3,'A'),curvaNome(str('curva51n'))+' / '+fmt(val('tms51n'),2,''),'Temporizada de neutro'),
    row('50N',fmt(d.p50n,2,'A'),fmt(d.s50n,3,'A'),fmt(val('t50n'),2,'s'),'Instant&acirc;nea de neutro'),
    row('51NS/51GS',fmt(Math.max(d.p51ns,d.p51gs),2,'A'),fmt(Math.max(d.s51ns,d.s51gs),3,'A'),`${curvaNome(str('curva51ns'))} / ${fmt(val('t51ns'),2,'s')}`,'Terra sens&iacute;vel'),
    d.p51gs>0 ? row('51GS',fmt(d.p51gs,2,'A'),fmt(d.s51gs,3,'A'),curvaNome(str('curva51gs'))+' / '+fmt(val('t51gs'),2,'s'),'Ground sensitive') : row('51GS','N&atilde;o habilitada','-','-','Sem pickup parametrizado')
  ].join('');
  const montanteRows=[
    row('51 montante fase',fmt(val('m51f'),2,'A'),curvaNome(str('mCurvaF')),fmt(val('mTmsF'),2,''),'Refer&ecirc;ncia de montante'),
    row('50 montante fase',fmt(val('m50f'),2,'A'),'Tempo definido',fmt(val('mT50f'),2,'s'),'Refer&ecirc;ncia de montante'),
    row('51N montante',fmt(val('m51n'),2,'A'),curvaNome(str('mCurvaN')),fmt(val('mTmsN'),2,''),'Refer&ecirc;ncia de neutro'),
    row('50N montante',fmt(val('m50n'),2,'A'),'Tempo definido',fmt(val('mT50n'),2,'s'),'Refer&ecirc;ncia de neutro'),
    row('Fus&iacute;vel/religador montante',str('coordFuseType'),str('fuseAutoCrit')||'-',`${fmt(val('coordFuseManual'),1,'A')} / desloc. ${fmt(val('coordFuseShift'),2,'')}`,'Curva aproximada')
  ].join('');
  const formulaRows=[
    row('Corrente nominal AT','I = S / (&radic;3 &times; V)',`I = ${fmt(d.kva,0,'kVA')} / (&radic;3 &times; ${fmt(d.kv,2,'kV')}) = ${fmt(d.inAT,2,'A')}`),
    row('Corrente nominal BT','I = S &times; 1000 / (&radic;3 &times; VBT)',`I = ${fmt(d.kva,0,'kVA')} &times; 1000 / (&radic;3 &times; ${fmt(d.vbt,0,'V')}) = ${fmt(d.inBT,2,'A')}`),
    row('Corrente de demanda','Id = P / (&radic;3 &times; V &times; fp)',`Id = ${fmt(d.kw,1,'kW')} / (&radic;3 &times; ${fmt(d.kv,2,'kV')} &times; ${fmt(d.fp,2,'')}) = ${fmt(d.iDem,2,'A')}`),
    row('RTC e secund&aacute;rio','RTC = Iprim / Isec; Isec = Iprim / RTC',`RTC = ${fmt(d.tcP,0,'A')} / ${fmt(d.tcS,0,'A')} = ${fmt(d.rtc,2,'')}`),
    row('Inrush','Iinrush = In &times; multiplicador ou crit&eacute;rio multi-transformador',`${fmt(val('inrush'),1,'A')} - ${d.multi?.metodoTxt||'crit&eacute;rio informado no software'}`),
    row('ANSI / NANSI','IANSI = In &times; (100 / Z%); tANSI = tabela por Z%; INANSI = 0,58 &times; IANSI',`Z% = ${fmt(val('ztrafo'),2,'')}; kANSI = ${fmt(val('ansiMult'),2,'')}; tANSI = ${fmt(val('ansiTempo'),2,'s')}; kNANSI = ${fmt(val('nansiMult'),2,'')}; tNANSI = ${fmt(val('nansiTempo'),2,'s')}.`),
    row('Curvas temporizadas','t = dial &times; k / (M^&alpha; - 1), M = I / Ipickup',`Curvas 51/51N: ${curvaNome(str('curva51'))} / ${curvaNome(str('curva51n'))}`),
    row('50 fase','I50 = Iinrush &times; margem, ou valor manual',`Margem = ${fmt(val('margem50'),2,'')}; I50 = ${fmt(d.p50,1,'A')}`),
    row('50N','I50N por modo manual, normativo ou Icc FT',`Limite 80% Icc FT = ${fmt(d.p50nLimiteIcc80,2,'A')}; I50N = ${fmt(d.p50n,2,'A')}`),
    row('Burden / ALF TC','Ztotal = Rcabo + Zrel&eacute; + Rint; VA = Is&sup2; &times; Ztotal; ALFef = ALF &times; VAnom / VAreal',`Ztotal = ${fmt(d.zTotal,3,'ohm')}; VA = ${fmt(d.vaReal,2,'VA')}; ALFef = ${fmt(d.alfEf,2,'')}`)
  ].join('');
  const baseRows=[
    row('Pot&ecirc;ncia total considerada',fmt(d.kva,0,'kVA'),'Soma/equivalente dos transformadores ativos ou campo principal'),
    row('Tens&atilde;o prim&aacute;ria',fmt(d.kv,2,'kV'),'N&iacute;vel de m&eacute;dia tens&atilde;o usado nos c&aacute;lculos'),
    row('Tens&atilde;o secund&aacute;ria',fmt(d.vbt,0,'V'),'Refer&ecirc;ncia do lado de baixa tens&atilde;o'),
    row('Demanda ativa',fmt(d.kw,1,'kW'),'Carga ativa informada para avalia&ccedil;&atilde;o operacional'),
    row('Fator de pot&ecirc;ncia',fmt(d.fp,2,''),'Fator usado na corrente de demanda'),
    row('Corrente nominal AT / BT',`${fmt(d.inAT,2,'A')} / ${fmt(d.inBT,2,'A')}`,'Bases prim&aacute;ria e secund&aacute;ria'),
    row('Corrente de demanda AT',fmt(d.iDem,2,'A'),'Refer&ecirc;ncia para filosofia por demanda')
  ].join('');
  const curtoRows=[
    row('Icc 3F',fmt(val('icc3f'),1,'A'),'Curto trif&aacute;sico informado'),
    row('Icc 2F',fmt(val('icc2f'),1,'A'),'Curto bif&aacute;sico informado'),
    row('Icc 2F-T',fmt(val('icc2ft'),1,'A'),'Curto bif&aacute;sico-terra informado'),
    row('Icc FT max',fmt(val('iccftmax'),1,'A'),'Falta fase-terra m&aacute;xima'),
    row('Icc FT min/ref.',fmt(d.iccTerra,1,'A'),'Refer&ecirc;ncia de sensibilidade de terra'),
    row('Icc adotada para 51',fmt(d.icc51,1,'A'),'Grandeza selecionada para a curva 51')
  ].join('');
  const multiplicadorRows=[
    row('Base 51 fase',str('base51')||'-',`Multiplicador 51 = ${fmt(val('mult51'),2,'')}`),
    row('50 fase',str('modo50')||'-',`Margem sobre inrush = ${fmt(val('margem50'),2,'')}`),
    row('51N',str('modo51n')||'-',`Percentual/faixa = ${fmt(val('pct51n'),1,'')}`),
    row('50N',str('modo50n')||'-',`80% Icc FT = ${fmt(d.p50nLimiteIcc80,2,'A')}`),
    row('51NS/51GS',str('modo51ns')||'-',`Pickup 51NS = ${fmt(d.p51ns,2,'A')}`),
    row('ANSI/NANSI',str('ansiRefMode')||'-',`ANSI = In × (100/Z%); tempo pela tabela ANSI por Z%; NANSI = 0,58 × ANSI. kANSI = ${fmt(val('ansiMult'),2,'')}; tANSI = ${fmt(val('ansiTempo'),2,'s')}; kNANSI = ${fmt(val('nansiMult'),2,'')}; tNANSI = ${fmt(val('nansiTempo'),2,'s')}`),
    row('Fus&iacute;vel montante',fuseLabelCoordV511(),str('fuseAutoCrit')||'Curva aproximada')
  ].join('');
  const instrumentoRows=[
    row('TC',`${fmt(d.tcP,0,'A')} / ${fmt(d.tcS,0,'A')}`,`RTC = ${fmt(d.rtc,2,'')}`),
    row('TP',`${fmt(d.tpP,0,'V')} / ${fmt(d.tpS,0,'V')}`,`RTP = ${fmt(d.rtp,2,'')}`),
    row('Burden calculado do TC',fmt(d.vaReal,2,'VA'),`Ztotal = ${fmt(d.zTotal,3,'ohm')}`),
    row('ALF efetivo preliminar',fmt(d.alfEf,2,''),d.tcOk?'Tende a atender na verifica&ccedil;&atilde;o preliminar':'Requer revis&atilde;o com dados do fabricante'),
    row('Disjuntor geral BT',str('btEnable')==='Sim'?fmt(val('djBTIn'),0,'A'):'N&atilde;o informado/habilitado',str('btEnable')==='Sim'?`Refer&ecirc;ncia MT equivalente = ${fmt(val('djBTIn')*d.vbt/(d.kv*1000),2,'A')}`:'Prote&ccedil;&atilde;o BT n&atilde;o considerada como camada ativa')
  ].join('');
  const hhRows=(d.multi?.lista||[]).map(t=>row(t.tag||'-',t.hhMode&&t.hhMode!=='sem'?t.hhMode:'Sem HH',t.hhMode&&t.hhMode!=='sem'?fmt(Number(t.hhFuse)||0,1,'A'):'-',t.hhMode&&t.hhMode!=='sem'?'Informado no cadastro do transformador':'N&atilde;o aplicado')).join('');
  const auditRows=[
    row('Status de emiss&atilde;o',audit.nivel,`Score t&eacute;cnico ${audit.score}/100`),
    row('Campos de modelo',audit.camposModelo.length?`${audit.camposModelo.length} campos a revisar`:'Sem pend&ecirc;ncias aparentes','Campos herdados de exemplo/base devem ser confirmados pelo operador'),
    row('Dados de montante',audit.montanteOk?'Completos para an&aacute;lise preliminar':'Incompletos','Necess&aacute;rios para conclus&atilde;o de seletividade com concession&aacute;ria'),
    row('TC / ALF',audit.tcOk?'Tende a atender':'Requer revis&atilde;o','Conferir classe, burden, cabos, ALF e corrente de falta com dados oficiais'),
    row('Coordenograma',audit.coordOk?'Dispon&iacute;vel':'Requer revis&atilde;o','Escalas, curvas e pontos de refer&ecirc;ncia devem ser validados')
  ].join('');
  const diagAvancadoRows=diagnosticoAvancadoSeletividade54(d).map(x=>row(x.titulo,x.nivel==='bad'?'Cr&iacute;tico':(x.nivel==='warn'?'Aten&ccedil;&atilde;o':'OK'),x.achado,x.acao)).join('');
  const revisaoRows=[
    row(str('revisao')||'Rev. 00',str('dataEstudo')||new Date().toISOString().slice(0,10),str('responsavel')||'Respons&aacute;vel n&atilde;o informado','Emiss&atilde;o preliminar gerada pelo Relaytester')
  ].join('');
  const conclusionClass=audit.classe==='good'?'good':(audit.classe==='bad'?'bad':'warn');
  $('report').innerHTML=`<div class="reportA4">
    <div class="cover">${logo}<div class="docType">Relat&oacute;rio t&eacute;cnico preliminar</div><h1>Estudo de Prote&ccedil;&atilde;o e Seletividade</h1><p><strong>${str('cliente')||'Cliente/obra n&atilde;o informado'}</strong></p>
      <div class="metaGrid"><div class="meta"><b>Empresa elaboradora</b>${str('empresa')}</div><div class="meta"><b>Respons&aacute;vel t&eacute;cnico</b>${str('responsavel')} - ${str('registro')}</div><div class="meta"><b>Concession&aacute;ria</b>${str('concessionaria')}</div><div class="meta"><b>Rel&eacute; / equipamento</b>${str('rele')}</div><div class="meta"><b>Data</b>${str('dataEstudo')}</div><div class="meta"><b>Revis&atilde;o</b>${str('revisao')}</div><div class="meta"><b>Documento base</b>${str('norma')}</div><div class="meta"><b>Software</b>Relaytester — Coordenograma de Prote&ccedil;&atilde;o</div></div>
    </div>
    <div class="kpiGrid"><div class="kpi"><b>In AT</b><span>${fmt(d.inAT,2,'A')}</span></div><div class="kpi"><b>Inrush</b><span>${fmt(val('inrush'),1,'A')}</span></div><div class="kpi"><b>ANSI</b><span>${fmt(val('ansi'),1,'A')}</span></div><div class="kpi"><b>NANSI</b><span>${fmt(val('nansi'),1,'A')}</span></div></div>
    <div class="auditSummary ${audit.classe}"><strong>Matriz de emiss&atilde;o:</strong> ${audit.nivel}. ${audit.recomendacao}</div>
    <div class="riskGrid"><div class="risk"><b>Score</b>${audit.score}/100</div><div class="risk"><b>Montante</b>${audit.montanteOk?'Completo':'Revisar'}</div><div class="risk"><b>TC/ALF</b>${audit.tcOk?'OK preliminar':'Revisar'}</div></div>
    <h2>1. Identifica&ccedil;&atilde;o do estudo</h2><p class="sectionLead">Documento t&eacute;cnico gerado a partir dos dados informados pelo operador, com objetivo de consolidar crit&eacute;rios, c&aacute;lculos e resultados preliminares de prote&ccedil;&atilde;o.</p>
    <h3>Controle de revis&atilde;o</h3><table><thead><tr><th>Revis&atilde;o</th><th>Data</th><th>Respons&aacute;vel</th><th>Descri&ccedil;&atilde;o</th></tr></thead><tbody>${revisaoRows}</tbody></table>
    <h2>2. Objetivo</h2><div class="reportBand blueBand">Consolidar os ajustes preliminares de prote&ccedil;&atilde;o, as premissas de curto-circuito, os pontos ANSI/NANSI, o crit&eacute;rio de inrush e o coordenograma para apoio &agrave; revis&atilde;o t&eacute;cnica e &agrave; parametriza&ccedil;&atilde;o do rel&eacute;.</div>
    <h2>3. Premissas, f&oacute;rmulas e documentos de refer&ecirc;ncia</h2><table class="formulaTable"><thead><tr><th>C&aacute;lculo</th><th>F&oacute;rmula / crit&eacute;rio</th><th>Substitui&ccedil;&atilde;o / resultado</th></tr></thead><tbody>${formulaRows}</tbody></table><div class="note"><strong>Documento base:</strong> ${str('norma')||'N&atilde;o informado'}. As curvas, tempos e ajustes devem ser conferidos com dados oficiais da concession&aacute;ria, fabricante e manual do rel&eacute;.</div>
    <h2>4. Dados gerais da instala&ccedil;&atilde;o</h2><table><thead><tr><th>Grandeza</th><th>Valor</th><th>Observa&ccedil;&atilde;o t&eacute;cnica</th></tr></thead><tbody>${baseRows}</tbody></table>
    <h2>5. Transformadores cadastrados</h2><table><thead><tr><th>Tag</th><th>Tipo</th><th>Pot&ecirc;ncia</th><th>In AT</th><th>Inrush</th><th>ANSI</th><th>NANSI</th><th>Fus&iacute;vel HH</th></tr></thead><tbody>${trafos||row('-','-','-','-','-','-','-','-')}</tbody></table>
    <h2>6. Crit&eacute;rio de associa&ccedil;&atilde;o de transformadores e inrush</h2><table class="calcTable"><thead><tr><th>Crit&eacute;rio</th><th>Modo / valor</th><th>Multiplicador ou observa&ccedil;&atilde;o</th></tr></thead><tbody>${multiplicadorRows}</tbody></table><div class="reportBand goldBand"><strong>Inrush equivalente adotado:</strong> ${fmt(val('inrush'),1,'A')} - ${d.multi?.metodoTxt||'crit&eacute;rio informado no software'}.</div>
    <h2>7. Pontos ANSI/NANSI adotados</h2><table><thead><tr><th>Grandeza</th><th>Valor</th><th>Tempo</th><th>Crit&eacute;rio</th></tr></thead><tbody>${row('ANSI adotado',fmt(val('ansi'),1,'A'),fmt(val('ansiTempo'),2,'s'),'Refer&ecirc;ncia t&eacute;rmica de fase')}${row('NANSI adotado',fmt(val('nansi'),1,'A'),fmt(val('nansiTempo'),2,'s'),'Refer&ecirc;ncia t&eacute;rmica de neutro/terra')}</tbody></table>
    <h2>8. Prote&ccedil;&otilde;es do cliente</h2><table><thead><tr><th>Fun&ccedil;&atilde;o</th><th>Pickup prim&aacute;rio</th><th>Pickup secund&aacute;rio</th><th>Curva/tempo</th><th>Observa&ccedil;&atilde;o</th></tr></thead><tbody>${paramRows}</tbody></table>
    <h2>9. Prote&ccedil;&otilde;es de montante/concession&aacute;ria</h2><table><thead><tr><th>Elemento</th><th>Valor</th><th>Curva/fam&iacute;lia</th><th>Tempo/dial</th><th>Observa&ccedil;&atilde;o</th></tr></thead><tbody>${montanteRows}</tbody></table>
    <h2>10. Fus&iacute;vel montante e fus&iacute;veis HH</h2><table><thead><tr><th>Elemento</th><th>Modo</th><th>Corrente</th><th>Observa&ccedil;&atilde;o</th></tr></thead><tbody>${row('Fus&iacute;vel/religador montante',fuseLabelCoordV511(),fmt(val('coordFuseManual'),1,'A'),str('fuseAutoCrit')||'Curva aproximada')}${hhRows||row('Fus&iacute;veis HH','Sem cadastro ativo','-','N&atilde;o h&aacute; fus&iacute;veis HH habilitados')}</tbody></table>
    <h2>11. TC/TP e disjuntor</h2><table><thead><tr><th>Item</th><th>Valor</th><th>Observa&ccedil;&atilde;o</th></tr></thead><tbody>${instrumentoRows}</tbody></table>
    <h2>12. Diagn&oacute;stico t&eacute;cnico autom&aacute;tico</h2><table><thead><tr><th>Item</th><th>Situa&ccedil;&atilde;o</th><th>Crit&eacute;rio</th></tr></thead><tbody>${auditRows}</tbody></table><h3>Diagn&oacute;stico avan&ccedil;ado de seletividade</h3><table><thead><tr><th>An&aacute;lise</th><th>N&iacute;vel</th><th>Achado</th><th>A&ccedil;&atilde;o recomendada</th></tr></thead><tbody>${diagAvancadoRows}</tbody></table><div class="warn"><strong>Avisos:</strong><ul>${avisos}</ul></div><div class="note"><strong>Erros/pend&ecirc;ncias:</strong><ul>${erros}${pendencias}</ul></div>
    <div class="coordPage"><h2>Auditoria técnica das proteções</h2><div class="reportBand blueBand"><p>As funções 50F e 50N foram tratadas como elementos de tempo definido, utilizando os tempos informados no relé. A curva 51F/51N é interrompida na respectiva função 50F/50N quando habilitada, e os trechos horizontais são limitados à maior corrente de curto-circuito considerada no estudo.</p></div><h2>13. Coordenograma</h2>${coordImg?`<img class="coordImg" src="${coordImg}" alt="Coordenograma fiel ao exibido na tela">`:'<p>Coordenograma n&atilde;o dispon&iacute;vel para incorpora&ccedil;&atilde;o autom&aacute;tica.</p>'}<p class="small">O coordenograma incorporado ao relat&oacute;rio utiliza a renderiza&ccedil;&atilde;o fiel da tela para preservar legenda, marcadores e informa&ccedil;&otilde;es gr&aacute;ficas. O SVG vetorial permanece dispon&iacute;vel como exporta&ccedil;&atilde;o complementar.</p></div>
    <h2>14. Crit&eacute;rios de Gera&ccedil;&atilde;o das Curvas — Engine Curvas Pro</h2>
    <div class="reportBand blueBand"><p>As curvas IDMT s&atilde;o iniciadas acima do pickup, em ${String(coordStartFactor64()).replace('.',',')} &times; pickup, para evitar a singularidade matem&aacute;tica em I = pickup. Elementos de tempo definido, como 50F/50N e 51NS em TD, iniciam exatamente no pickup e utilizam o tempo ajustado no relé, por exemplo 0,05 s, 0,10 s ou outro valor informado. As curvas 51 terminam na instant&acirc;nea correspondente, no curto-circuito m&aacute;ximo informado ou no limite do eixo X. Fus&iacute;veis aproximados n&atilde;o substituem curvas oficiais de fabricante/concession&aacute;ria. ANSI/NANSI s&atilde;o refer&ecirc;ncias de suportabilidade do transformador, e inrush &eacute; marcador de energiza&ccedil;&atilde;o, n&atilde;o curva de atua&ccedil;&atilde;o.</p></div>
    ${(()=>{const m=window.currentCoordRenderModel||{}; const rows=(m.curves||[]).filter(c=>c.pickup>0).map(c=>`<tr><td>${esc(c.label)}</td><td>${esc(c.tipoElemento)}</td><td>${fmt(c.pickup,2,'A')}</td><td>${fmt(c.inicio,2,'A')}</td><td>${fmt(c.fim,2,'A')}</td><td>${esc(c.motivoInicio||'-')}</td><td>${esc(c.motivoFim||'-')}</td><td>${c.pontos?.length||0}</td><td>${esc(c.status||'-')}</td></tr>`).join(''); return `<h3>Auditoria das curvas plotadas</h3><table>${th('Elemento','Tipo','Pickup','In&iacute;cio','Fim','Motivo in&iacute;cio','Motivo fim','Pontos','Status')}<tbody>${rows}</tbody></table>`})()}
    <h2>14. Conclus&atilde;o t&eacute;cnica preliminar</h2><div class="conclusion auditSummary ${conclusionClass}"><p><strong>${audit.nivel}.</strong> ${audit.recomendacao}</p><p>Com base nos dados informados, o estudo apresenta ajustes preliminares, refer&ecirc;ncias de montante e pontos de suportabilidade do transformador. As valida&ccedil;&otilde;es autom&aacute;ticas indicam pend&ecirc;ncias e alertas que devem ser revisados antes da emiss&atilde;o formal.</p><p>A conclus&atilde;o final de seletividade depende da confer&ecirc;ncia dos dados oficiais da concession&aacute;ria, curvas reais de fabricantes, manual do rel&eacute;, limites parametriz&aacute;veis, ensaios de comissionamento e responsabilidade t&eacute;cnica aplic&aacute;vel.</p></div>${devNote}<div class="printFooter">Relaytester &middot; ${str('cliente')||'Estudo de prote&ccedil;&atilde;o'} &middot; ${str('revisao')||'Rev. 00'} &middot; ${str('dataEstudo')||''}</div>
  </div>`;
}

/* v6.4.9 R13 - relatorio em padrao de estudo aprovado Relaytester */
function renderReportApprovedV620(d){
  let coordImg='';
  try{ drawChart(d); coordImg=$('coord')?.toDataURL('image/png')||''; }catch(e){ console.warn('Failed to extract coordenogram image:', e); coordImg=''; }
  const diag=diagnosticoRelatorio360(d);
  const audit=renderAuditBox(d);
  const erros=(diag.erros||[]).map(x=>`<li>${x}</li>`).join('')||'<li>Sem erros cr&iacute;ticos informados pelo diagn&oacute;stico autom&aacute;tico.</li>';
  const avisos=(diag.avisos||[]).map(x=>`<li>${x}</li>`).join('')||'<li>Sem avisos relevantes.</li>';
  const pendencias=(audit.pendencias||[]).map(x=>`<li>${x}</li>`).join('')||'<li>Sem pend&ecirc;ncias formais identificadas pela auditoria autom&aacute;tica.</li>';
  const auditClass=audit.classe==='bad'?'bad':(audit.classe==='warn'?'warn':'good');
  const auditCounts=audit.status?.counts||{ok:0,info:0,warn:0,error:0,total:0};
  const auditMotivos=(audit.status?.motivos||[]).slice(0,14).map(x=>`<li>${auditHtml(x)}</li>`).join('')||'<li>Sem ressalvas ou n&atilde;o conformidades relevantes registradas pela auditoria.</li>';
  const auditRecs=(audit.status?.recomendacoes||[]).slice(0,10).map(x=>`<li>${auditHtml(x)}</li>`).join('')||'<li>Manter confer&ecirc;ncia final com dados oficiais da concession&aacute;ria, fabricante e respons&aacute;vel t&eacute;cnico.</li>';
  const auditRowsReport=(audit.items||[])
    .filter(x=>x.severidade!=='OK')
    .slice(0,28)
    .map(x=>row(auditHtml(x.grupo),auditHtml(x.item),auditHtml(x.resultado),auditHtml(x.severidade),auditHtml(x.evidencia),auditHtml(x.recomendacao)))
    .join('') || row('Auditoria','Sem ressalvas relevantes','OK','OK','Verifica&ccedil;&otilde;es autom&aacute;ticas sem n&atilde;o conformidades listadas','Manter valida&ccedil;&atilde;o t&eacute;cnica final');
  const auditAllRowsReport=(audit.items||[]).slice(0,80).map(x=>row(auditHtml(x.grupo),auditHtml(x.item),auditHtml(x.resultado),auditHtml(x.severidade),auditHtml(x.evidencia),auditHtml(x.recomendacao))).join('');
  const auditBlocker=audit.nivel==='INCONSISTENTE — NÃO EMITIR'
    ? '<div class="afyaCritical">RELAT&Oacute;RIO N&Atilde;O RECOMENDADO PARA EMISS&Atilde;O &mdash; EXISTEM INCONSIST&Ecirc;NCIAS CR&Iacute;TICAS.</div>'
    : '';
  const escR=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cliente=escR(str('cliente'))||'Cliente / unidade consumidora n&atilde;o informado';
  const concessionaria=escR(str('concessionaria'))||'Concession&aacute;ria n&atilde;o informada';
  const norma=escR(str('norma'))||'Norma / parecer t&eacute;cnico n&atilde;o informado';
  const responsavel=escR(str('responsavel'))||'Respons&aacute;vel t&eacute;cnico n&atilde;o informado';
  const registro=escR(str('registro'))||'Registro profissional n&atilde;o informado';
  const empresa=escR(str('empresa'))||'Relaytester';
  const data=escR(str('dataEstudo'))||new Date().toLocaleDateString('pt-BR');
  const revisao=escR(str('revisao'))||'Rev. 00';
  const sheet=(body,cls='')=>`<section class="afyaSheet ${cls}">${body}</section>`;
  const th=(...c)=>'<tr>'+c.map(x=>`<th>${x}</th>`).join('')+'</tr>';
  const f2=n=>fmt(n,2,'');
  const curtoRows=[
    row('Trif&aacute;sico (3F)',fmt(val('icc3f'),1,'A')),
    row('Fase-Fase (2F)',fmt(val('icc2f'),1,'A')),
    row('2F-Terra',fmt(val('icc2ft'),1,'A')),
    row('Fase-Terra (m&aacute;x.)',fmt(val('iccftmax'),1,'A')),
    row('Fase-Terra (m&iacute;n./ref.)',fmt(d.iccTerra,1,'A'))
  ].join('');
  const trafoRows=(d.multi?.lista||[]).map(t=>row(t.tag||'-',fmt(t.kva,0,'kVA'),fmt(t.inAT,2,'A'),fmt(d.kv,2,'kV'),fmt(d.vbt,0,'V'),fmt(Number(t.z)||val('ztrafo'),2,'%'),t.ligacao||str('ligacao')||'-',t.tipo||'-')).join('')||
    row('Transformador 1',fmt(d.kva,0,'kVA'),fmt(d.inAT,2,'A'),fmt(d.kv,2,'kV'),fmt(d.vbt,0,'V'),fmt(val('ztrafo'),2,'%'),str('ligacao')||'-',str('tipoTrafo')||'-');
  const montanteRelayRows=[
    row('Fase',str('mRtcF')||'-',fmt(val('m50f'),0,'A'),fmt(val('mT50f'),2,'s'),fmt(val('m51f'),0,'A'),curvaNome(str('mCurvaF')),fmt(val('mTmsF'),2,'')),
    row('Neutro',str('mRtcN')||'-',fmt(val('m50n'),0,'A'),fmt(val('mT50n'),2,'s'),fmt(val('m51n'),0,'A'),curvaNome(str('mCurvaN')),fmt(val('mTmsN'),2,'')),
    row('Neutro sens&iacute;vel','-','-','-',fmt(Math.max(val('m51ns'),val('m51gs')),2,'A'),val('m51ns')>0||val('m51gs')>0?'Tempo definido':'N&atilde;o fornecido',fmt(Math.max(val('mT51ns'),val('mT51gs')),2,'s'))
  ].join('');
  const resumoAjustes=[
    row('51 fase - pickup',fmt(d.s51,3,'A'),fmt(d.p51,2,'A')),
    row('51T fase - dial/curva',`${fmt(val('tms51'),2,'')} (${curvaNome(str('curva51'))})`,'-'),
    row('50 fase - instant&acirc;nea',fmt(d.s50,2,'A'),fmt(d.p50,1,'A')),
    row('51N - pickup',fmt(d.s51n,3,'A'),fmt(d.p51n,2,'A')),
    row('51N T - dial/curva',`${fmt(val('tms51n'),2,'')} (${curvaNome(str('curva51n'))})`,'-'),
    row('51NS - pickup',fmt(d.s51ns,3,'A'),fmt(d.p51ns,2,'A')),
    row('51NS T - tempo definido',fmt(val('t51ns'),2,'s'),'-'),
    row('50N - instant&acirc;nea',fmt(d.s50n,2,'A'),fmt(d.p50n,2,'A')),
    row('59 - sobretens&atilde;o',`${fmt(d.v59s,1,'V')} sec`,`${fmt(d.v59p/1000,2,'kV')} prim`),
    row('59T - tempo',fmt(val('t59'),2,'s'),'-'),
    row('47 - sequ&ecirc;ncia negativa',str('v47')?`${fmt(val('v47'),0,'%')}`:'Ativado','-')
  ].join('');
  const trafosTxt=(d.multi?.lista||[]).map(t=>`${t.tag||'TRF'}: ${fmt(t.kva,0,'kVA')} / ${t.tipo||'-'}`).join('; ')||`${fmt(d.kva,0,'kVA')} - ${str('tipoTrafo')||'tipo n&atilde;o informado'}`;
  const hhRows=(d.multi?.lista||[]).filter(t=>t.hhMode&&t.hhMode!=='sem').map(t=>row(t.tag||'-',t.hhMode,fmt(Number(t.hhFuse)||0,1,'A'),'Informado no cadastro de transformadores')).join('')||
    row('Fus&iacute;veis HH','Sem cadastro ativo','-','N&atilde;o aplic&aacute;vel neste estudo');
  const diagRows=diagnosticoAvancadoSeletividade54(d).map(x=>row(x.titulo,x.nivel==='bad'?'Cr&iacute;tico':(x.nivel==='warn'?'Aten&ccedil;&atilde;o':'OK'),x.achado,x.acao)).join('');
  const css=`<style>
  .reportA4.afyaReport{max-width:100%;background:#e5e7eb;padding:0;color:#111827;font-family:Arial,Helvetica,sans-serif}
  .afyaSheet{position:relative;width:210mm;min-height:297mm;margin:0 auto 8mm;background:#fff;padding:20mm 22mm 18mm;overflow:hidden;page-break-after:always;box-shadow:0 8px 30px rgba(15,23,42,.14);font-size:11.2px;line-height:1.48;color:#111827}
  .afyaReportTitle{border-bottom:1.6px solid #1f2937;margin:0 0 8mm;padding-bottom:4mm}.afyaReportTitle .kicker{font-size:8.8px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:2mm}.afyaReportTitle h1{font-size:22px;line-height:1.18;color:#111827;letter-spacing:.01em;font-weight:700;margin:0}.afyaReportTitle p{font-size:10.2px;color:#374151;margin:2.5mm 0 0}
  .afyaSectionTitle{color:#0f2f6f;font-size:14px;font-weight:700;margin:0 0 6mm;text-transform:uppercase;border-bottom:1px solid #d1d5db;padding-bottom:2mm}.afyaSubTitle{color:#0f2f6f;font-size:13px;font-weight:700;margin:7mm 0 3mm}.afyaH3{font-size:12px;font-weight:700;margin:5mm 0 2mm;color:#1f2937}.afyaObs{margin:5mm 0}.afyaObs b{color:#0f2f6f}.afyaBullets{margin:2mm 0 5mm 5mm;padding-left:5mm}.afyaBullets li{margin:1.8mm 0}
  .afyaTable{width:100%;border-collapse:separate;border-spacing:0;margin:4mm 0 7mm;table-layout:fixed;border:1px solid #cbd5e1;border-radius:4px;overflow:hidden}.afyaTable th,.afyaTable td{border:0;border-bottom:1px solid #dbe3ee;padding:2.1mm 2.5mm;vertical-align:top;overflow-wrap:anywhere}.afyaTable tr:last-child td{border-bottom:0}.afyaTable th{background:#eef3f8;color:#172033;font-weight:700;text-align:left;font-size:9.6px}.afyaTable td{background:#fff;color:#111827}.afyaTable tbody tr:nth-child(even) td{background:#f8fafc}
  .afyaFormula{font-family:'Cambria Math','Times New Roman',serif;text-align:center;font-size:13px;margin:4mm 0;color:#111827}.afyaNote{border-left:3px solid #0f2f6f;background:#f8fafc;padding:3mm 4mm;margin:4mm 0}.afyaWarn{border-left:3px solid #b7791f;background:#fffaf0;padding:3mm 4mm;margin:4mm 0}.afyaCoord{width:100%;max-height:220mm;object-fit:contain;border:1px solid #cbd5e1;background:#fff}.afyaSign{margin-top:14mm}.afyaSmall{font-size:9px;color:#475569}
  .afyaAuditStatus{border:1px solid #cbd5e1;border-left:5px solid #0f2f6f;background:#f8fafc;padding:4mm 5mm;margin:3mm 0 5mm}.afyaAuditStatus.good{border-left-color:#15803d;background:#f0fdf4}.afyaAuditStatus.warn{border-left-color:#b7791f;background:#fffaf0}.afyaAuditStatus.bad{border-left-color:#b91c1c;background:#fff1f2}.afyaAuditStatus h3{margin:0 0 2mm;color:#111827;font-size:15px}.afyaAuditGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm;margin:4mm 0}.afyaAuditKpi{border:1px solid #d1d5db;background:#fff;padding:2.5mm}.afyaAuditKpi b{display:block;color:#475569;font-size:8.5px;text-transform:uppercase}.afyaAuditKpi span{display:block;font-weight:700;color:#111827;font-size:12px}.afyaCritical{border:2px solid #991b1b;background:#7f1d1d;color:#fff;font-weight:800;text-align:center;padding:4mm;margin:4mm 0;text-transform:uppercase;letter-spacing:.04em}
  @page{size:A4 portrait;margin:0}@media print{html,body{margin:0!important;background:#fff!important}.reportA4.afyaReport{padding:0!important;background:#fff!important}.afyaSheet{width:210mm!important;min-height:297mm!important;margin:0!important;box-shadow:none!important;break-after:page;page-break-after:always}.afyaSheet:last-child{page-break-after:auto}.afyaTable th,.afyaTable td{padding:1.6mm 2mm!important;font-size:9.5px!important}.afyaSectionTitle{margin-bottom:5mm!important}}
  </style>`;
  $('report').innerHTML=`<div class="reportA4 afyaReport">${css}
    ${sheet(`<div class="afyaReportTitle"><div class="kicker">Relat&oacute;rio t&eacute;cnico</div><h1>Estudo de Prote&ccedil;&atilde;o e Seletividade</h1><p>Concession&aacute;ria: ${concessionaria} | Norma base: ${norma} | ${data} | ${revisao}</p></div><p><b>Cliente (Raz&atilde;o Social):</b> ${cliente}</p><p><b>Endere&ccedil;o da UC:</b> ${str('endereco')||'N&atilde;o informado'}</p><p><b>Munic&iacute;pio/UF:</b> ${str('municipio')||'N&atilde;o informado'}</p><p><b>Tens&atilde;o de atendimento:</b> ${fmt(d.kv,2,'kV')} (m&eacute;dia tens&atilde;o)</p><p><b>Subesta&ccedil;&atilde;o da Concession&aacute;ria:</b> ${str('subestacao')||'N&atilde;o informado'}</p><p><b>Alimentador:</b> ${str('alimentador')||'N&atilde;o informado'}</p><p><b>Ponto de Conex&atilde;o (barramento):</b> ${str('pontoConexao')||'N&atilde;o informado'}</p><p><b>Carga/demanda informada:</b> ${fmt(d.kw,1,'kW')}</p><p><b>Concession&aacute;ria:</b> ${concessionaria}</p><p><b>Filosofia de prote&ccedil;&atilde;o selecionada:</b> ${d.filosofia.label}.</p><div class="afyaObs"><b>Observa&ccedil;&atilde;o:</b> Os par&acirc;metros el&eacute;tricos e a coordena&ccedil;&atilde;o das prote&ccedil;&otilde;es neste estudo consideram os dados de entrada cadastrados no software. O preset de filosofia sugere crit&eacute;rios, mas os ajustes devem ser confirmados pelo respons&aacute;vel t&eacute;cnico com o parecer aplic&aacute;vel.</div><h2 class="afyaSubTitle">EMPRESA RESPONS&Aacute;VEL PELO PROJETO</h2><p><b>Empresa:</b> ${empresa}</p><p><b>Respons&aacute;vel t&eacute;cnico:</b> ${responsavel}</p><p><b>Registro:</b> ${registro}</p><p><b>ART:</b> ${str('art')||'N&atilde;o informada'}</p><h2 class="afyaSubTitle">MEM&Oacute;RIA DE C&Aacute;LCULO - Fun&ccedil;&otilde;es de prote&ccedil;&atilde;o aplicadas</h2><ul class="afyaBullets"><li>(50/51) - Sobrecorrente de fase instant&acirc;nea e temporizada.</li><li>(50N/51N) - Sobrecorrente de neutro instant&acirc;nea e temporizada.</li><li>(51NS/51GS) - Terra sens&iacute;vel em tempo definido ou curva cadastrada.</li><li>(59) - Sobretens&atilde;o associada ao TP.</li><li>(47) - Sequ&ecirc;ncia negativa / invers&atilde;o de fases.</li></ul><h2 class="afyaSubTitle">Equipamentos principais</h2><p>Disjuntor MT: ${str('disjuntorMT')||'N&atilde;o informado'}.</p><p>Rel&eacute; de prote&ccedil;&atilde;o: ${str('rele')||'N&atilde;o informado'}.</p><p>Transformadores: ${trafosTxt}.</p>`)}
    ${sheet(`<h2 class="afyaSectionTitle">DADOS FORNECIDOS PELA CONCESSION&Aacute;RIA</h2><p>Tabela 1 - Imped&acirc;ncia no Ponto de Conex&atilde;o</p><table class="afyaTable">${th('Imped&acirc;ncia','R [ohm]','X [ohm]')}<tbody>${row('Z0','Informar em observa&ccedil;&otilde;es / parecer','Informar em observa&ccedil;&otilde;es / parecer')}${row('Z1','Informar em observa&ccedil;&otilde;es / parecer','Informar em observa&ccedil;&otilde;es / parecer')}${row('Z2','Informar em observa&ccedil;&otilde;es / parecer','Informar em observa&ccedil;&otilde;es / parecer')}</tbody></table><p>Tabela 2 - N&iacute;veis de Curto-Circuito no PDE</p><table class="afyaTable">${th('Curto-circuito','Valor informado')}<tbody>${curtoRows}</tbody></table><p>Tabela 3 - Prote&ccedil;&atilde;o do Alimentador da Concession&aacute;ria (montante)</p><table class="afyaTable">${th('Tipo','RTC','Tap instant&acirc;neo - 50','Tempo instant&acirc;neo','Tap temporizado - 51','Curva','TMS/Dial')}<tbody>${montanteRelayRows}</tbody></table><h2 class="afyaSectionTitle">TRANSFORMADOR DE POT&Ecirc;NCIA DO CLIENTE</h2><p>Tabela 4 - Caracter&iacute;sticas nominais do transformador</p><table class="afyaTable">${th('TAG','Pot&ecirc;ncia','Corrente nominal MT','Tens&atilde;o prim&aacute;ria','Tens&atilde;o secund&aacute;ria','Z %','Liga&ccedil;&atilde;o','Tipo')}<tbody>${trafoRows}</tbody></table><p><b>C&aacute;lculo da corrente nominal (MT):</b></p><div class="afyaFormula">In = S / (&radic;3 &times; V) = ${fmt(d.kva*1000,0,'VA')} / (&radic;3 &times; ${fmt(d.kv*1000,0,'V')}) &asymp; ${fmt(d.inAT,2,'A')}</div><p><b>Observa&ccedil;&atilde;o t&eacute;cnica:</b> As correntes de magnetiza&ccedil;&atilde;o e os limites ANSI/NANSI foram determinados para avalia&ccedil;&atilde;o no coordenograma TCC.</p>`)}
    ${sheet(`<h2 class="afyaSectionTitle">3. Dados b&aacute;sicos da instala&ccedil;&atilde;o e fornecimento</h2><p><b>&bull; Pot&ecirc;ncia nominal do transformador:</b></p><p>P = ${fmt(d.kva,0,'kVA')}</p><p><b>&bull; Corrente m&aacute;xima prevista (demanda m&aacute;xima prevista):</b></p><p>Trata-se da corrente referente &agrave; demanda cadastrada no estudo.</p><div class="afyaFormula">Imax = Pdemanda / (&radic;3 &times; Vnominal &times; fp)</div><div class="afyaFormula">Imax = ${fmt(d.kw,1,'kW')} / (&radic;3 &times; ${fmt(d.kv,2,'kV')} &times; ${fmt(d.fp,2,'')}) &asymp; ${fmt(d.iDem,2,'A')}</div><p><b>&bull; Corrente nominal do transformador:</b></p><div class="afyaFormula">Inominal = S / (&radic;3 &times; Vnominal) &asymp; ${fmt(d.inAT,2,'A')}</div><p><b>&bull; Corrente transit&oacute;ria de magnetiza&ccedil;&atilde;o (Inrush):</b></p><p>Crit&eacute;rio plotado: ${d.multi?.metodoTxt||'multiplicador informado'}.</p><div class="afyaFormula">Iinrush plotado = ${fmt(val('inrush'),1,'A')} | Iinrush 50F = ${fmt(d.inrush50F,1,'A')} | Iinrush 50N = ${fmt(d.inrush50N,1,'A')}</div><p>Fontes selecionadas: 50F = ${str('inrush50FSource')}; 50N = ${str('inrush50NSource')}.</p><p><b>&bull; Imped&acirc;ncia nominal do transformador:</b> Z% = ${fmt(val('ztrafo'),2,'%')} | Vbase = ${fmt(d.kv,2,'kV')} | Sbase = ${fmt(d.kva,0,'kVA')}</p><p><b>&bull; Limites de suportabilidade do transformador:</b></p><div class="afyaFormula">IANSI = In &times; (100 / Z%) | tANSI = tabela ANSI por Z% | INANSI = 0,58 &times; IANSI</div><table class="afyaTable">${th('Refer&ecirc;ncia','Ponto','Tempo / uso no estudo')}<tbody>${row('ANSI',fmt(val('ansi'),1,'A'),fmt(val('ansiTempo'),2,'s')+' - refer&ecirc;ncia de suportabilidade de fase')}${row('NANSI',fmt(val('nansi'),1,'A'),fmt(val('nansiTempo'),2,'s')+' - refer&ecirc;ncia de neutro/terra deslocada da ANSI')}</tbody></table><p class="afyaSmall">Observa&ccedil;&atilde;o: os tempos ANSI/NANSI s&atilde;o preenchidos automaticamente pela tabela de imped&acirc;ncia e permanecem edit&aacute;veis para ajuste do operador, fabricante, concession&aacute;ria ou respons&aacute;vel t&eacute;cnico.</p><p><b>&bull; Rel&eacute;s de prote&ccedil;&atilde;o:</b></p><ul class="afyaBullets"><li>Modelo: ${str('rele')||'N&atilde;o informado'}</li><li>Fun&ccedil;&otilde;es: 50/51, 50N/51N/51NS, 59, 27 e 47 conforme parametriza&ccedil;&atilde;o.</li><li>Tipo: rel&eacute; microprocessado / multifun&ccedil;&atilde;o.</li></ul><p><b>&bull; Disjuntor de Interliga&ccedil;&atilde;o MT:</b> ${str('disjuntorMT')||'N&atilde;o informado'}, corrente ${fmt(val('djMTIn'),0,'A')}, interrup&ccedil;&atilde;o ${fmt(val('djMTKA'),1,'kA')}.</p>`)}
    ${sheet(`<h2 class="afyaSectionTitle">4. Dimensionamento dos transformadores de prote&ccedil;&atilde;o (TC e TP)</h2><h3 class="afyaH3">4.1 Transformadores de corrente (TC)</h3><p>Os TCs de prote&ccedil;&atilde;o devem atender a corrente de carga prevista, n&atilde;o saturar nas condi&ccedil;&otilde;es cr&iacute;ticas de curto-circuito e garantir precis&atilde;o suficiente para atua&ccedil;&atilde;o correta das prote&ccedil;&otilde;es.</p><p><b>Regime permanente:</b> a corrente de demanda prevista &eacute; ${fmt(d.iDem,2,'A')} e a corrente nominal do transformador &eacute; ${fmt(d.inAT,2,'A')}. O TC selecionado (${fmt(d.tcP,0,'A')}/${fmt(d.tcS,0,'A')}) deve ser confirmado com o fabricante e projeto executivo.</p><p><b>Condi&ccedil;&atilde;o de satura&ccedil;&atilde;o:</b></p><div class="afyaFormula">Isec = Icc / RTC = ${fmt(val('icc3f'),0,'A')} / ${fmt(d.rtc,2,'')} &asymp; ${fmt(val('icc3f')/Math.max(d.rtc,1),2,'A sec')}</div><p><b>Carga do TC (burden):</b> VA real calculado = ${fmt(d.vaReal,2,'VA')} para Ztotal = ${fmt(d.zTotal,3,'ohm')}. ALF efetivo preliminar = ${fmt(d.alfEf,2,'')}.</p><p><b>Conclus&atilde;o:</b> ${d.tcOk?'O TC tende a atender &agrave;s condi&ccedil;&otilde;es preliminares de burden e ALF, sujeito &agrave; valida&ccedil;&atilde;o com dados do fabricante.':'A verifica&ccedil;&atilde;o autom&aacute;tica recomenda revis&atilde;o do TC, burden, cabos ou ALF antes da emiss&atilde;o formal.'}</p><h3 class="afyaH3">4.2 Transformadores de potencial (TP)</h3><p>TP selecionado: ${fmt(d.tpP,0,'V')} / ${fmt(d.tpS,0,'V')}, classe ${str('classeTP')||'N&atilde;o informada'}, liga&ccedil;&atilde;o ${str('ligacaoTP')||'N&atilde;o informada'}.</p><p>Fun&ccedil;&otilde;es associadas: 59, 27 e 47 conforme filosofia de opera&ccedil;&atilde;o cadastrada.</p>`)}
    ${sheet(`<h2 class="afyaSectionTitle">5. Ajustes das prote&ccedil;&otilde;es do consumidor</h2><h3 class="afyaH3">5.1 Ajuste das prote&ccedil;&otilde;es de sobrecorrente de fase (50/51)</h3><p><b>ANSI 51 - Corrente de Partida Temporizada</b></p><p>Ajuste prim&aacute;rio: ${fmt(d.p51,2,'A')} | Ajuste secund&aacute;rio: ${fmt(d.s51,3,'A')} | Curva: ${curvaNome(str('curva51'))} | TMS/Dial: ${fmt(val('tms51'),2,'')}.</p><p><b>ANSI 50 - Sobrecorrente instant&acirc;nea de fase</b></p><p>Deve permitir a livre circula&ccedil;&atilde;o da corrente de inrush do transformador. Ajuste prim&aacute;rio adotado: ${fmt(d.p50,1,'A')} | Ajuste secund&aacute;rio: ${fmt(d.s50,2,'A')} | Tempo: ${fmt(val('t50'),2,'s')}.</p><h3 class="afyaH3">5.2 Ajuste das prote&ccedil;&otilde;es de neutro (50/51N e 51NS)</h3><p><b>ANSI 51N:</b> ${fmt(d.p51n,2,'A')} prim&aacute;rio / ${fmt(d.s51n,3,'A')} secund&aacute;rio, curva ${curvaNome(str('curva51n'))}, TMS ${fmt(val('tms51n'),2,'')}.</p><p><b>ANSI 51NS:</b> ${fmt(d.p51ns,2,'A')} prim&aacute;rio / ${fmt(d.s51ns,3,'A')} secund&aacute;rio, tempo ${fmt(val('t51ns'),2,'s')}.</p><p><b>ANSI 50N:</b> ${fmt(d.p50n,2,'A')} prim&aacute;rio / ${fmt(d.s50n,3,'A')} secund&aacute;rio, tempo ${fmt(val('t50n'),2,'s')}.</p><h3 class="afyaH3">5.3 Ajuste da prote&ccedil;&atilde;o de sobretens&atilde;o (59)</h3><p>Ajuste prim&aacute;rio: ${fmt(d.v59p/1000,2,'kV')} | Ajuste secund&aacute;rio: ${fmt(d.v59s,1,'V')} | Tempo: ${fmt(val('t59'),2,'s')}.</p><h3 class="afyaH3">5.4 Ajuste da prote&ccedil;&atilde;o de invers&atilde;o/perda de fase (47)</h3><p>Crit&eacute;rio adotado: ${fmt(val('v47'),0,'%')} V2/V1 com tempo ${fmt(val('t47'),2,'s')}.</p><h3 class="afyaH3">5.5 Chave fus&iacute;vel de retaguarda</h3><p>Elo/religador proposto: ${fuseLabelCoordV511()}. ${str('fuseAutoCrit')||'Confirmar com coordenograma e dados oficiais.'}</p><h3 class="afyaH3">5.6 Resumo dos ajustes</h3><table class="afyaTable">${th('Fun&ccedil;&atilde;o de prote&ccedil;&atilde;o','Valores secund&aacute;rios','Valores prim&aacute;rios')}<tbody>${resumoAjustes}</tbody></table><table class="afyaTable">${th('Elemento','Modo','Corrente','Observa&ccedil;&atilde;o')}<tbody>${row('Fus&iacute;vel montante',fuseLabelCoordV511(),fmt(val('coordFuseManual'),1,'A'),str('fuseAutoCrit')||'Curva aproximada')}${hhRows}</tbody></table>`)}
    ${sheet(`<h2 class="afyaSectionTitle">Regras finais 51NS/51GS</h2><p>As fun&ccedil;&otilde;es 51NS e 51GS s&atilde;o tratadas como est&aacute;gios sens&iacute;veis independentes. Elas n&atilde;o alteram automaticamente a 51N e s&oacute; s&atilde;o plotadas quando possuem pickup v&aacute;lido.</p><table class="afyaTable">${th('Fun&ccedil;&atilde;o','Status','Pickup prim&aacute;rio','Curva / tempo','Observa&ccedil;&atilde;o')}<tbody>${row('51NS cliente',d.p51ns>0?'Ativa':'Desabilitada',d.p51ns>0?fmt(d.p51ns,2,'A'):'-',d.p51ns>0?curvaNome(str('curva51ns'))+' / '+fmt(val('t51ns'),2,'s'):'-',d.p51ns>0?'Aparece em tela, PNG, SVG, relat&oacute;rio e tabela.':'Justificativa: '+auditHtml(str('just51ns')||'N&atilde;o informada'))}${row('51GS cliente',d.p51gs>0?'Ativa':'Desabilitada',d.p51gs>0?fmt(d.p51gs,2,'A'):'-',d.p51gs>0?curvaNome(str('curva51gs'))+' / '+fmt(val('t51gs'),2,'s'):'-',d.p51gs>0?'Fun&ccedil;&atilde;o independente; n&atilde;o espelha 51NS automaticamente.':'Justificativa: '+auditHtml(str('just51ns')||'N&atilde;o informada'))}</tbody></table><p class="afyaSmall">Aviso aplicado quando pertinente: 51NS/51GS encontra-se sobreposta ou pr&oacute;xima da 51N. Verificar coordena&ccedil;&atilde;o e seletividade.</p>`)}
    ${sheet(`<h2 class="afyaSectionTitle">Gr&aacute;fico tempo x corrente</h2><p>Nota: As curvas e marcadores foram tra&ccedil;ados com base nos dados desta instala&ccedil;&atilde;o. Est&atilde;o evidenciados os ajustes do cliente, prote&ccedil;&otilde;es de montante, corrente de carga, inrush, pontos ANSI/NANSI e correntes de curto no PDE.</p>${coordImg?`<img class="afyaCoord" src="${coordImg}" alt="Coordenograma">`:'<p>Coordenograma n&atilde;o dispon&iacute;vel para incorpora&ccedil;&atilde;o autom&aacute;tica.</p>'}`)}
    ${sheet(`<h2 class="afyaSectionTitle">Auditoria T&eacute;cnica e Status de Emiss&atilde;o</h2>${auditBlocker}<div class="afyaAuditStatus ${auditClass}"><h3>${auditHtml(audit.nivel)}</h3><p><b>Resumo:</b> OK ${auditCounts.ok} | Informa&ccedil;&otilde;es ${auditCounts.info} | Alertas ${auditCounts.warn} | Erros cr&iacute;ticos ${auditCounts.error} | Score ${audit.score}/100.</p><p>O presente estudo foi submetido &agrave; auditoria interna do software Relaytester, que verificou a consist&ecirc;ncia dos dados el&eacute;tricos, parametriza&ccedil;&otilde;es de prote&ccedil;&atilde;o, convers&otilde;es por TC, curvas utilizadas, representa&ccedil;&atilde;o gr&aacute;fica no coordenograma e fidelidade entre tela, relat&oacute;rio e arquivos exportados.</p></div><div class="afyaAuditGrid"><div class="afyaAuditKpi"><b>Status</b><span>${auditHtml(audit.nivel)}</span></div><div class="afyaAuditKpi"><b>Alertas</b><span>${auditCounts.warn}</span></div><div class="afyaAuditKpi"><b>Erros</b><span>${auditCounts.error}</span></div><div class="afyaAuditKpi"><b>Score</b><span>${audit.score}/100</span></div></div><h3 class="afyaH3">Motivos e ressalvas</h3><ul class="afyaBullets">${auditMotivos}</ul><h3 class="afyaH3">Recomenda&ccedil;&otilde;es t&eacute;cnicas</h3><ul class="afyaBullets">${auditRecs}</ul><h3 class="afyaH3">Tabela de n&atilde;o conformidades, alertas e ressalvas</h3><table class="afyaTable">${th('Grupo','Item verificado','Resultado','Severidade','Evid&ecirc;ncia','Recomenda&ccedil;&atilde;o')}<tbody>${auditRowsReport}</tbody></table><p class="afyaSmall">Declara&ccedil;&atilde;o: este relat&oacute;rio foi gerado com base nos dados informados pelo usu&aacute;rio. A emiss&atilde;o formal depende da valida&ccedil;&atilde;o do respons&aacute;vel t&eacute;cnico, dados oficiais da concession&aacute;ria, curvas reais dos equipamentos e documenta&ccedil;&atilde;o de fabricante.</p>`)}
    ${sheet(`<h2 class="afyaSectionTitle">Auditoria Pr&eacute;-Emiss&atilde;o - Registro Completo</h2><p>Registro completo das verifica&ccedil;&otilde;es executadas pela rotina <b>executarAuditoriaTecnica()</b>.</p><table class="afyaTable">${th('Grupo','Item verificado','Resultado','Severidade','Evid&ecirc;ncia','Recomenda&ccedil;&atilde;o')}<tbody>${auditAllRowsReport||auditRowsReport}</tbody></table>`)}
    ${sheet(`<h2 class="afyaSectionTitle">6. Esquema de liga&ccedil;&atilde;o e diagramas do sistema de prote&ccedil;&atilde;o</h2><p>O esquema de liga&ccedil;&atilde;o deve mostrar as liga&ccedil;&otilde;es dos TCs, TPs, rel&eacute;(s), bobinas do disjuntor, fontes auxiliares, intertravamentos e demais equipamentos. O diagrama unifilar deve conter a subesta&ccedil;&atilde;o de medi&ccedil;&atilde;o, prote&ccedil;&atilde;o e transforma&ccedil;&atilde;o do consumidor.</p><h3 class="afyaH3">6.1 Liga&ccedil;&otilde;es dos TCs de prote&ccedil;&atilde;o</h3><ul class="afyaBullets"><li>TCs de fase: ${fmt(d.tcP,0,'A')}/${fmt(d.tcS,0,'A')} - ${str('classeTC')||'classe n&atilde;o informada'}.</li><li>Secund&aacute;rios ligados ao rel&eacute; ${str('rele')||'informado no projeto'} para 50/51 e fun&ccedil;&otilde;es residuais.</li><li>Neutro sens&iacute;vel obtido por soma residual ou entrada espec&iacute;fica conforme rel&eacute; e projeto.</li><li>Aterramento em um &uacute;nico ponto no secund&aacute;rio dos TCs.</li></ul><h3 class="afyaH3">6.2 Liga&ccedil;&otilde;es dos TPs de prote&ccedil;&atilde;o</h3><ul class="afyaBullets"><li>TPs: ${fmt(d.tpP,0,'V')} / ${fmt(d.tpS,0,'V')} - ${str('classeTP')||'classe n&atilde;o informada'}.</li><li>Aplica&ccedil;&otilde;es: 59, 27 e 47 conforme filosofia do estudo.</li><li>Prote&ccedil;&otilde;es dos secund&aacute;rios e aterramento conforme projeto executivo e norma aplic&aacute;vel.</li></ul><h3 class="afyaH3">6.3 Alimenta&ccedil;&otilde;es auxiliares e comando do disjuntor</h3><p>Nobreak, fonte de comando, bobinas de abertura/fechamento e trip capacitivo devem ser representados no diagrama funcional e conferidos em campo.</p><h2 class="afyaSectionTitle">7. Diagn&oacute;stico e conclus&atilde;o</h2><table class="afyaTable">${th('An&aacute;lise','N&iacute;vel','Achado','A&ccedil;&atilde;o recomendada')}<tbody>${diagRows||row('Diagn&oacute;stico','-', 'Sem diagn&oacute;stico avan&ccedil;ado dispon&iacute;vel','-')}</tbody></table><div class="afyaWarn"><b>Avisos:</b><ul>${avisos}</ul><b>Pend&ecirc;ncias:</b><ul>${erros}${pendencias}</ul></div><div class="afyaNote"><b>Conclus&atilde;o t&eacute;cnica preliminar:</b> ${audit.nivel}. ${audit.recomendacao} A conclus&atilde;o final de seletividade depende da confer&ecirc;ncia dos dados oficiais da concession&aacute;ria, curvas reais dos equipamentos, manual do rel&eacute;, limites parametriz&aacute;veis, ensaios de comissionamento e responsabilidade t&eacute;cnica aplic&aacute;vel.</div><div class="afyaSign"><p>__________________________________________</p><p>${responsavel}<br>${registro}<br>${empresa}</p><p class="afyaSmall">${data} - ${revisao} - Relaytester</p></div>`)}
  </div>`;
  try{validateRenderConsistency(d,{skipRedraw:true,reportElement:$('report')});}catch(e){console.warn('Validação de fidelidade gráfica pós-relatório não concluída.',e);}
}
function renderReport(d){ renderReportApprovedV620(d); }

function updateProgress(){ const fields=$$('input,select,textarea').filter(e=>!e.readOnly && e.dataset.auto!=='1'); const total=fields.length; const done=fields.filter(e=>e.dataset.state!=='model' && String(e.value).trim()!=='').length; const pct=total?Math.round(done/total*100):0; $('progTxt').textContent=pct+'%'; $('progBar').style.width=pct+'%'; $$('.step').forEach(b=>b.classList.toggle('done',pct>0)); }
function getState(){
  const fields={};
  $$('input,select,textarea').forEach(e=>{
    if(!e.id)return;
    fields[e.id]={
      value:e.type==='file'?'':e.value,
      state:e.dataset.state||'',
      forced:e.dataset.forced||'',
      logoData:e.dataset.logoData||'',
      checked:e.type==='checkbox'?!!e.checked:undefined,
      type:e.type||e.tagName
    };
  });
  return {
    schema:'FL_VOLTS_PROTECAO_360', // Legacy schema ID for import compatibility; do not change
    version:'6.3.5',
    exportedAt:new Date().toISOString(),
    fields,
    trafos:trafosV507,
    coordenograma:{
      title:str('coordTitle'),subtitle:str('coordSubtitle'),markerMode:str('coordMarkerMode'),
      ansiMode:str('coordAnsiMode'),xMin:str('coordXMin'),xMax:str('coordXMax'),yMin:str('coordYMin'),yMax:str('coordYMax')
    }
  };
}
function normalizeImportedState(raw){
  if(!raw||typeof raw!=='object') throw new Error('Arquivo vazio ou sem estrutura de objeto.');
  if(raw.schema==='FL_VOLTS_PROTECAO_360' && raw.fields) return raw;
  if(raw.fields && typeof raw.fields==='object') return {schema:'FL_VOLTS_PROTECAO_360',version:raw.version||'sem schema',fields:raw.fields,trafos:raw.trafos||raw.transformadores||[]};
  if(raw.campos && typeof raw.campos==='object') return {schema:'FL_VOLTS_PROTECAO_360',version:raw.version||'campos',fields:raw.campos,trafos:raw.trafos||raw.transformadores||[]};
  if(raw.data && typeof raw.data==='object') return normalizeImportedState(raw.data);
  const looksLegacy=raw.__trafosV507 || Object.values(raw).some(v=>v&&typeof v==='object'&&('value' in v || 'checked' in v || 'state' in v));
  if(looksLegacy) return {schema:'FL_VOLTS_PROTECAO_360',version:'legado',fields:raw,trafos:raw.__trafosV507?.value||raw.trafos||raw.transformadores||[]};
  // fallback simples: permite JSON {id: valor}
  const ids=Object.keys(raw).filter(k=>$(k));
  if(ids.length) {
    const fields={}; ids.forEach(k=>fields[k]={value:raw[k],state:'user'});
    return {schema:'FL_VOLTS_PROTECAO_360',version:'mapa simples',fields,trafos:raw.trafos||[]};
  }
  throw new Error('O arquivo não parece ser um JSON exportado pelo Relaytester Proteção SEP.');
}
function applyImportedField(id,o){
  if(id==='__trafosV507')return;
  const e=$(id); if(!e)return;
  let value=o;
  let checked;
  if(o&&typeof o==='object'&&!Array.isArray(o)){
    value=('value' in o)?o.value:(('val' in o)?o.val:'');
    checked=('checked' in o)?!!o.checked:undefined;
  }
  if(e.type==='checkbox'){
    e.checked = checked!==undefined ? checked : !!value;
  }else if(e.type!=='file'){
    e.value = value ?? '';
  }
  if(o&&typeof o==='object'){
    e.dataset.state=o.state||'user';
    if(o.forced)e.dataset.forced=o.forced; else delete e.dataset.forced;
    if(o.logoData)e.dataset.logoData=o.logoData;
  }else{
    e.dataset.state='user';
  }
  paintField(e);
}
function switchPanel(id){
  $$('.step').forEach(x=>x.classList.toggle('active',x.dataset.panel===id));
  $$('.panel').forEach(p=>p.classList.toggle('active',p.id===id));
}
function refreshAllAfterLoad(){
  renderTrafosV507();
  const d=calcular(true);
  renderTrafosV507();
  renderParam(d);
  renderMemory(d);
  renderReport(d);
  drawChart(d);
  updateProgress();
  return d;
}
function loadState(raw){
  const data=normalizeImportedState(raw);
  if(Array.isArray(data.trafos)&&data.trafos.length) trafosV507=data.trafos.slice(0,10);
  else if(data.fields?.__trafosV507?.value && Array.isArray(data.fields.__trafosV507.value)) trafosV507=data.fields.__trafosV507.value.slice(0,10);
  Object.entries(data.fields||{}).forEach(([id,o])=>applyImportedField(id,o));
  const d=refreshAllAfterLoad();
  // Se o operador estiver olhando o coordenograma, redesenha depois que o painel estiver visível.
  if($('pCoord')?.classList.contains('active')) setTimeout(()=>{drawChart(d); try{renderAuditBox(d);}catch(e){console.warn('renderAuditBox failed after import:', e);}},80);
}
function exportJson(){
  try{renderAuditBox(calcData(false));}catch(e){console.warn('Auditoria técnica não concluída antes do JSON.',e);}
  const state=getState();
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='coordenograma_estudo.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  if($('jsonStatus')) $('jsonStatus').textContent='JSON exportado com sucesso.';
}
function crc32V53(bytes){
  let c=~0; for(const b of bytes){c^=b; for(let k=0;k<8;k++) c=(c>>>1)^(0xEDB88320&-(c&1));} return (~c)>>>0;
}
function u16V53(n){return [n&255,(n>>>8)&255]}
function u32V53(n){return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
function zipStoreV53(files){
  const enc=new TextEncoder(); const local=[]; const central=[]; let offset=0;
  files.forEach(f=>{
    const safeName=String(f.name||'arquivo.txt').replace(/\\/g,'/');
    const name=enc.encode(safeName); const data=f.data instanceof Uint8Array?f.data:enc.encode(String(f.data??'')); const crc=crc32V53(data);
    const time=0, date=0, method=0, flags=0;
    const head=[...u32V53(0x04034b50),20,0,...u16V53(flags),...u16V53(method),...u16V53(time),...u16V53(date),...u32V53(crc),...u32V53(data.length),...u32V53(data.length),...u16V53(name.length),0,0];
    local.push(new Uint8Array(head),name,data);
    const cent=[...u32V53(0x02014b50),20,0,20,0,...u16V53(flags),...u16V53(method),...u16V53(time),...u16V53(date),...u32V53(crc),...u32V53(data.length),...u32V53(data.length),...u16V53(name.length),0,0,0,0,0,0,0,0,0,0,0,0,...u32V53(offset)];
    central.push(new Uint8Array(cent),name); offset+=head.length+name.length+data.length;
  });
  const centralSize=central.reduce((s,a)=>s+a.length,0);
  const count=Math.min(files.length,65535);
  const end=[...u32V53(0x06054b50),0,0,0,0,...u16V53(count),...u16V53(count),...u32V53(centralSize),...u32V53(offset),0,0];
  return new Blob([...local,...central,new Uint8Array(end)],{type:'application/zip'});
}
function dataUrlBytesV53(url){
  const b64=String(url||'').split(',')[1]||''; const bin=atob(b64); const out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
  return out;
}
function exportPacoteTecnicoV53(){
  try{
    const d=refreshAllAfterLoad();
    renderReport(d); drawChart(d);
    const state=getState();
    const audit=auditoriaPreEmissaoV53(d);
    const renderModel=buildCoordRenderModel(d);
    const renderConsistency=validateRenderConsistency(d,{skipRedraw:true,reportElement:$('report')});
    const coordData=$('coord')?.toDataURL('image/png')||'';
    const coordSvg=gerarCoordenogramaSVG54(d);
    const reportHtml='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Coordenograma — Pacote Técnico</title></head><body>'+($('report')?.innerHTML||'')+'</body></html>';
    const files=[
      {name:'01_coordenograma_estudo.json',data:JSON.stringify(state,null,2)},
      {name:'02_coordenograma_auditoria_pre_emissao.json',data:JSON.stringify(audit,null,2)},
      {name:'03_coordenograma_render_model.json',data:JSON.stringify(renderModel,null,2)},
      {name:'04_coordenograma_fidelidade_grafica.json',data:JSON.stringify(renderConsistency,null,2)},
      {name:'05_coordenograma_parametrizacao.csv',data:paramCSVText()},
      {name:'06_coordenograma_relatorio_tecnico.html',data:reportHtml},
      {name:'09_coordenograma_manifesto.txt',data:`Relaytester Coordenograma\nExportado em: ${new Date().toISOString()}\nCliente: ${str('cliente')}\nRevisao: ${str('revisao')}\nStatus: ${audit.nivel}\nScore: ${audit.score}/100\nFidelidade grafica: ${renderConsistency.status}\nElementos ativos: ${renderModel.activeElements.length}\n51NS cliente: ${d.p51ns>0?'ativa':'desabilitada'}\n51GS cliente: ${d.p51gs>0?'ativa':'desabilitada'}\nJustificativa 51NS/51GS: ${str('just51ns')||'Nao informada'}\nArquivos: estudo JSON, auditoria, render model, fidelidade grafica, parametrizacao CSV, relatorio HTML, PNG, SVG e testes internos quando executados.\n`}
    ];
    if(coordData) files.push({name:'07_coordenograma_png_fiel_relatorio.png',data:dataUrlBytesV53(coordData)});
    if(coordSvg) files.push({name:'08_coordenograma_vetorial.svg',data:coordSvg});
    if(window.__lastInternalJsonTestsV630) files.push({name:'10_coordenograma_testes_internos.json',data:JSON.stringify(window.__lastInternalJsonTestsV630,null,2)});
    const blob=zipStoreV53(files);
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='coordenograma_pacote_tecnico.zip'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1500);
    if($('jsonStatus')) $('jsonStatus').textContent='Pacote tecnico ZIP exportado com JSON, auditoria, CSV, relatorio HTML e coordenograma.';
  }catch(e){
    console.error(e);
    alert('Nao foi possivel gerar o pacote tecnico: '+(e.message||e));
  }
}
function importJsonFile(ev){
  const f=ev.target.files&&ev.target.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const rawText=String(r.result||'').replace(/^\uFEFF/,'').trim();
      if(!rawText) throw new Error('Arquivo JSON vazio.');
      const parsed=JSON.parse(rawText);
      loadState(parsed);
      if($('jsonStatus')) $('jsonStatus').textContent='JSON importado e coordenograma atualizado: '+f.name;
      alert('JSON importado com sucesso. Coordenograma, parametrização e relatório foram atualizados.');
    }catch(e){
      console.error(e);
      alert('JSON inválido ou incompatível: '+(e.message||e));
      if($('jsonStatus')) $('jsonStatus').textContent='Falha ao importar JSON.';
    }finally{
      ev.target.value='';
    }
  };
  r.onerror=()=>{alert('Não foi possível ler o arquivo selecionado.'); ev.target.value='';};
  r.readAsText(f,'utf-8');
}
function prepararRelatorioEImprimir(){
  try{
    document.body.classList.remove('printParam');
    const d=refreshAllAfterLoad();
    switchPanel('pMemoria');
    setTimeout(()=>{ renderReport(d); abrirRelatorioVetorial(); },220);
  }catch(e){
    console.error(e);
    alert('Não foi possível preparar o relatório para impressão: '+(e.message||e));
  }
}
function abrirRelatorioVetorial(){
  const report=$('report')?.querySelector('.reportA4');
  if(!report){ window.print(); return; }
  const css=`@page{size:A4 portrait;margin:12mm}
  *{box-sizing:border-box}
  html,body{margin:0;background:#fff;color:#111827;font-family:"Segoe UI",Arial,Helvetica,sans-serif}
  body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .reportA4{width:100%;max-width:186mm;margin:0 auto;background:#fff;color:#111827;line-height:1.34;font-family:"Segoe UI",Arial,Helvetica,sans-serif;font-size:10.8px;font-variant-ligatures:none;text-rendering:geometricPrecision}
  .reportA4 .cover{border:1px solid #cbd5e1;border-top:5px solid #0f2f6f;padding:12px 14px;margin-bottom:10px;background:linear-gradient(90deg,#f8fafc 0%,#fff 58%,#fff8e1 100%)}
  .reportA4 .cover h1{font-size:20px;color:#0f172a;margin:0 0 5px;letter-spacing:0}.reportA4 .cover .docType{font-size:10px;color:#8a6a08;text-transform:uppercase;font-weight:800;letter-spacing:.08em;margin-bottom:4px}
  .reportA4 .metaGrid{display:grid;grid-template-columns:1fr 1fr;gap:5px 8px;margin-top:8px}.reportA4 .meta{border:1px solid #dbe3ee;background:#f8fafc;padding:5px 7px}.reportA4 .meta b{display:block;color:#475569;font-size:8.7px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px}
  .reportA4 h1,.reportA4 h2{break-after:avoid}.reportA4 h2{font-size:12.6px;margin:11px 0 5px;color:#0f2f6f;border-bottom:1px solid #d8b84f;padding-bottom:3px}.reportA4 h3{font-size:11px;margin:7px 0 4px;color:#1f2937}.reportA4 p{margin:4px 0}
  .reportA4 .sectionLead{font-size:9.9px;color:#374151;margin:2px 0 6px}.reportA4 .reportBand{border-left:3px solid #0f2f6f;background:#f8fafc;padding:7px 9px;margin:6px 0;color:#111827}.reportA4 .goldBand{border-left-color:#b8860b;background:#fff9e8}.reportA4 .blueBand{border-left-color:#2563eb;background:#eff6ff}
  .reportA4 .kpiGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin:6px 0 8px}.reportA4 .kpi{border:1px solid #dbe3ee;background:#f8fafc;padding:5px 6px}.reportA4 .kpi b{display:block;color:#0f2f6f;font-size:8.7px;text-transform:uppercase}.reportA4 .kpi span{display:block;font-weight:800;color:#111827;font-size:11px;margin-top:2px}
  .reportA4 table{width:100%;min-width:0;max-width:100%;border-collapse:collapse;margin:5px 0 8px;table-layout:fixed}.reportA4 th,.reportA4 td{border:1px solid #d1d5db;padding:3.5px 4.5px;vertical-align:top;overflow-wrap:anywhere;word-break:normal}.reportA4 th{background:#eef2f7;color:#0f172a;font-weight:800;font-size:8.8px;text-transform:uppercase;letter-spacing:.03em}.reportA4 td{font-size:9.1px;color:#111827}.reportA4 .formulaTable td:nth-child(2){font-family:"Segoe UI",Arial,Helvetica,sans-serif;color:#0f2f6f;font-weight:700;letter-spacing:0;font-variant-ligatures:none}.reportA4 .calcTable td:first-child,.reportA4 .formulaTable td:first-child{font-weight:800;color:#1f2937;width:24%}
  .reportA4 .note{border-left:3px solid #2563eb;background:#eff6ff;padding:6px 8px;margin:6px 0;color:#111827}.reportA4 .warn{border-left:3px solid #b8860b;background:#fff8e1;padding:6px 8px;margin:6px 0;color:#111827}.reportA4 .conclusion{border:1px solid #cbd5e1;border-left:4px solid #0f2f6f;background:#f8fafc;padding:8px 10px;margin-top:8px}.reportA4 .small{font-size:9px;color:#475569}.reportA4 .coordPage{break-before:page;page-break-before:always}.reportA4 .coordImg{display:block;width:100%;max-height:215mm;object-fit:contain;margin:6px auto 0;border:1px solid #cbd5e1}.reportA4 .coordSvgWrap{width:100%;border:1px solid #cbd5e1;margin:6px auto 0;background:#fff}.reportA4 .coordSvgWrap svg{display:block;width:100%;height:auto}
  .reportA4 .auditSummary{border:1px solid #cbd5e1;border-left:4px solid #0f2f6f;background:#f8fafc;padding:8px 10px;margin:7px 0}.reportA4 .auditSummary.good{border-left-color:#15803d;background:#f0fdf4}.reportA4 .auditSummary.warn{border-left-color:#b8860b;background:#fff8e1}.reportA4 .auditSummary.bad{border-left-color:#b91c1c;background:#fff1f2}.reportA4 .riskGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin:6px 0}.reportA4 .risk{border:1px solid #dbe3ee;background:#fff;padding:5px 6px}.reportA4 .risk b{display:block;color:#334155;font-size:8.5px;text-transform:uppercase}.reportA4 .printFooter{position:fixed;left:12mm;right:12mm;bottom:5mm;border-top:1px solid #d1d5db;color:#64748b;font-size:7.8px;padding-top:2mm;background:#fff}
  @media print{html,body{background:#fff!important}.reportA4{font-size:9.8px!important;max-width:100%!important}.reportA4 .cover{padding:6px 0 8px!important}.reportA4 h1{font-size:17px!important;margin:0 0 5px!important}.reportA4 h2{font-size:12.8px!important;margin:9px 0 4px!important}.reportA4 table{font-size:8.1px!important;table-layout:fixed!important;width:100%!important;min-width:0!important;max-width:100%!important}.reportA4 tr{page-break-inside:avoid;page-break-after:auto}.reportA4 th,.reportA4 td{padding:3px 4px!important}.reportA4 .coordPage{break-before:page!important;page-break-before:always!important}.reportA4 .coordImg{width:100%!important;max-height:215mm!important;object-fit:contain!important}.reportA4 .coordSvgWrap{width:100%!important;break-inside:avoid!important}.reportA4 .coordSvgWrap svg{width:100%!important;height:auto!important}.reportA4 .printFooter{position:fixed!important;left:12mm!important;right:12mm!important;bottom:5mm!important}}`;
  const w=window.open('','_blank');
  if(!w){ window.print(); return; }
  w.document.open();
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Coordenograma — Coordenação de Proteção</title><style>${css}</style></head><body>${report.outerHTML}</body></html>`);
  w.document.close();
  setTimeout(()=>{ w.focus(); w.print(); },350);
}
function clearUser(){ $$('input,select,textarea').forEach(e=>{ if(e.dataset.auto==='1')return; if(e.type==='checkbox')e.checked=false; else e.value=''; e.dataset.state='user'; delete e.dataset.forced; delete e.dataset.logoData; paintField(e); }); calcular(true); updateProgress();}
function prepararParametrizacaoEImprimir(){
  try{
    document.body.classList.add('printParam');
    const d=calcular(true);
    renderParam(d);
    switchPanel('pParam');
    setTimeout(()=>window.print(),120);
  }catch(e){
    console.error(e);
    document.body.classList.remove('printParam');
    alert('Nao foi possivel preparar a parametriza??o para impressao: '+(e.message||e));
  }
}
$$('input,select,textarea').forEach(e=>e.addEventListener('input',()=>markChanged(e))); $$('select').forEach(e=>e.addEventListener('change',()=>markChanged(e)));

function applyCoordTheme(){
  const card=document.querySelector('.coord33');
  const theme=document.getElementById('coordTheme')?.value||'white';
  if(card) card.classList.toggle('blackMode', theme==='black');
}
function getCoordStableSize(){
  const canvas=document.getElementById('coord');
  if(!canvas) return null;
  const lockedW=Number(canvas.dataset.stableCssWidth)||0;
  const lockedH=Number(canvas.dataset.stableCssHeight)||0;
  if(lockedW>0 && lockedH>0) return {cssWidth:lockedW, cssHeight:lockedH};
  const rect=canvas.getBoundingClientRect?.();
  const styleW=parseFloat(canvas.style.width||'')||0;
  const styleH=parseFloat(canvas.style.height||'')||0;
  const w=Math.round((rect?.width||styleW||0));
  const h=Math.round((rect?.height||styleH||0));
  if(w>0 && h>0) return {cssWidth:w, cssHeight:h};
  return null;
}
function redrawCoordPreserveSize(){
  try{
    const size=getCoordStableSize()||{};
    drawChart(calcData(false), Object.assign({}, size, {preserveSize:true}));
  }catch(e){console.warn('redrawCoordPreserveSize failed:', e);}
}
function clearCoordStableSize(){
  const canvas=document.getElementById('coord');
  if(!canvas) return;
  delete canvas.dataset.stableCssWidth;
  delete canvas.dataset.stableCssHeight;
}
function redrawCoordResizeSize(){
  try{
    clearCoordStableSize();
    drawChart(calcData(false), {forceResize:true});
  }catch(e){console.warn('redrawCoordResizeSize failed:', e);}
}
document.getElementById('coordTheme')?.addEventListener('change',()=>{applyCoordTheme(); redrawCoordPreserveSize();});

$$('.step').forEach(b=>b.addEventListener('click',()=>{switchPanel(b.dataset.panel); if(b.dataset.panel==='pCoord') setTimeout(()=>{const d=calcData(false); applyCoordTheme(); drawChart(d); renderAuditBox(d); try{renderCoordAuditPro649(d);}catch(e){console.warn('renderCoordAuditPro649 failed:', e);};},80); if(b.dataset.panel==='pMemoria') setTimeout(()=>renderReport(calcData(false)),80); }));
['coordStageAudit','coordStartFactor','coordMinMargin','coordCurveLegend','coordRefLegend','coordMarkers','coordMarkerMode','coordAnsiMode','p51Manual','tms51','curva51','p50Manual','t50','p51n','tms51n','curva51n','p50n','t50n','pct50n','margem50n','modo50n','inrush50NSource','inrushResidualFactor','m50f','mT50f','m50n','mT50n','p50ns','t50ns','m50ns','mT50ns','coordFuseMode','fuseSizingFactor','coordFuseType','coordFuseManual','coordFuseShift','fuseT2','fuseExp','fuseMinScale','fuseMaxScale','coordFuseLabel','fuseT2','fuseExp','fuseMinScale','fuseMaxScale','coordXMin','coordXMax','coordYMin','coordYMax','coordTitle','coordSubtitle'].forEach(id=>{
  const el=$(id); if(!el)return; const evt=(el.tagName==='INPUT'||el.tagName==='TEXTAREA')?'input':'change';
  el.addEventListener(evt,()=>{ applyCoordTheme(); redrawCoordPreserveSize(); });
});
if($('coordFuseType')) $('coordFuseType').addEventListener('change',()=>{applyFusePresetV514(true); calcular(true);});
if($('btnAddTrafo')) $('btnAddTrafo').onclick=addTrafoV507;
if($('btnDupTrafo')) $('btnDupTrafo').onclick=()=>window.dupTrafoV507(Math.max(0,trafosV507.length-1));
if($('btnSyncTrafo')) $('btnSyncTrafo').onclick=()=>applyTrafosResumoV507(true);
['inrushMethod','ansiRefMode','ansiRefTag','inrushManualAssoc','kv','ansiMult','nansiMult','coordFuseMode','fuseSizingFactor','coordFuseType','coordFuseManual','coordFuseShift','fuseT2','fuseExp','fuseMinScale','fuseMaxScale'].forEach(id=>{const el=$(id); if(el) el.addEventListener('change',()=>{renderTrafosV507(); calcular(true);});});
['modo50','margem50','inrush50FSource','modo50n','pct50n','margem50n','inrush50NSource','inrushResidualFactor'].forEach(id=>{
  const el=$(id); if(!el)return;
  const evt=(el.tagName==='INPUT'||el.tagName==='TEXTAREA')?'input':'change';
  el.addEventListener(evt,()=>{calcular(true); redrawCoordPreserveSize();});
});
$('btnCalc').onclick=()=>calcular(false); $('btnAuto').onclick=()=>calcular(true); $('btnExemploBase').onclick=()=>{initModel(); syncTrafosFromMainV507(); renderTrafosV507(); calcular(true);}; $('btnClear').onclick=clearUser; $('btnJson').onclick=exportJson; if($('btnZip')) $('btnZip').onclick=exportPacoteTecnicoV53; $('btnPrint').onclick=prepararRelatorioEImprimir; if($('btnApplyPhilosophy')) $('btnApplyPhilosophy').onclick=applyPhilosophyPresetV635; if($('protectionPhilosophy')) $('protectionPhilosophy').addEventListener('change',renderPhilosophyV635);
$('jsonFile').addEventListener('change',importJsonFile);
$('logoFile')?.addEventListener('change',ev=>{const f=ev.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ev.target.dataset.logoData=r.result; ev.target.dataset.state='user'; paintField(ev.target); calcular(false);}; r.readAsDataURL(f)});
$('btnPng').onclick=()=>{
  const d=calcData(false);
  renderAuditBox(d);
  exportarPNGCoordenogramaClassicoHD(d);
};
if($('btnSvg')) $('btnSvg').onclick=()=>{const d=calcData(false); renderAuditBox(d); exportarSVGCoordenograma54();};
if($('btnCsvParam')) $('btnCsvParam').onclick=exportParamCSV;
if($('btnCopyParam')) $('btnCopyParam').onclick=copiarParam;
if($('btnPrintParam')) $('btnPrintParam').onclick=prepararParametrizacaoEImprimir;
if($('btnInternalTests')) $('btnInternalTests').onclick=()=>runInternalJsonTestsV630();
window.addEventListener('beforeprint',()=>{ if(!document.body.classList.contains('printParam')) renderReport(calcData(false)); });
window.addEventListener('afterprint',()=>document.body.classList.remove('printParam'));
// Stable public API — window.FLVolts360 name kept for external integrations; do not rename
window.FLVolts360={calcular,calcData,runV5SelfTest,getState,loadState,refreshAllAfterLoad,executarAuditoriaTecnica,auditTransfer51to50,getStudyEmissionStatus,gerarCoordenogramaSVG54,buildCoordReferenceItems54,buildCoordRenderModel,validateRenderConsistency,renderFidelityPanel,internalTestCasesV630,runInternalJsonTestsV630,applyPhilosophyPresetV635,PHILOSOPHY_LIBRARY_V635};
initModel(); syncTrafosFromMainV507(); renderTrafosV507(); calcular(true);
})();

(function(){
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }
  ready(function(){
    const meta=[
      {label:'Dados da instalação', sub:'identificação, demanda e base do estudo', tag:'', desc:'Defina os dados gerais da instalação, tensões, demanda considerada e informações do cliente. Esta etapa abre o estudo e alimenta toda a memória de cálculo.'},
      {label:'Concessionária & curto-circuito', sub:'montante, impedâncias e níveis de falta', tag:'', desc:'Cadastre os dados do ponto de entrega, níveis de curto-circuito e ajustes de proteção a montante para garantir coordenação com a distribuidora.'},
      {label:'Transformadores', sub:'múltiplos trafos, inrush e ANSI/NANSI', tag:'', desc:'Modele um ou mais transformadores, com impedância, magnetização, ANSI, NANSI e fusíveis HH quando aplicável.'},
      {label:'TC, TP & disjuntores', sub:'medição, proteção e burden', tag:'', desc:'Verifique relação, burden, classe, saturação, TP e disjuntores associados ao sistema de proteção.'},
      {label:'Ajustes Cliente', sub:'mini-blocos 50/51, 50N/51N e 51NS/51GS', tag:'CLIENTE', desc:'Configure todas as proteções do cliente em uma tela compacta, organizada por mini-blocos para acelerar estudos de proteção e seletividade.'},
      {label:'Parametrização', sub:'tabela final do relé', tag:'', desc:'Consolide os ajustes finais em formato de parametrização técnica pronta para comissionamento e conferência em campo.'},
      {label:'Coordenograma', sub:'visual premium integrado ao estudo', tag:'', desc:'Analise o coordenograma integrado ao software, com melhor aproveitamento visual inspirado no Premium Pro v3.6.3, porém nativamente conectado ao estudo.'},
      {label:'Diagnóstico & relatório', sub:'auditoria, memória e emissão', tag:'', desc:'Revise a auditoria final, a memória de cálculo e gere o relatório técnico em formato pronto para PDF.'}
    ];
    const steps=[...document.querySelectorAll('.steps .step')];
    const content=document.querySelector('section.content');
    const brand=document.querySelector('.brand');
    if(brand){brand.innerHTML='<div class="brandMark" aria-hidden="true"><span>RT</span></div><div class="brandBlock"><div class="brandOver">Relaytester</div><div class="brandTitle">Coordenograma — Coordenação de Proteção</div><div class="brandSub">Estudo de seletividade e coordenação 50/51 · 50N/51N</div></div>';}
    const dev=document.querySelector('.dev'); if(dev) dev.remove();
    const toolbarMap={btnCalc:'Calcular',btnExemploBase:'Exemplo',btnAuto:'Recalcular',btnJson:'JSON',btnPrint:'PDF',btnZip:'Pacote',btnClear:'Limpar dados'};
    Object.entries(toolbarMap).forEach(([id,txt])=>{const el=document.getElementById(id); if(el) el.textContent=txt;});
    steps.forEach((btn,i)=>{const m=meta[i]; if(!m) return; btn.innerHTML=`<span class="num">${i+1}</span><span class="stepMain"><span class="stepLabel">${m.label}</span><span class="stepSub">${m.sub}</span></span>${m.tag?`<span class="stepTag">${m.tag}</span>`:''}`;});
    const headMap={pGerais:['01 — Dados da instalação','Identificação da unidade, tensões, demanda e parâmetros gerais do estudo.'],pPDE:['02 — Concessionária, montante e curto-circuito','Dados do ponto de entrega, níveis de curto-circuito, proteção a montante e critérios da distribuidora.'],pTrafo:['03 — Transformadores','Modelagem dos transformadores, fusíveis HH, inrush e referências ANSI / NANSI.'],pTCTP:['04 — TC, TP e disjuntores','Blocos separados para medição, proteção, burden, saturação e proteção de manobra.'],pCliente:['05 — Ajustes Cliente','Funções do cliente reunidas em mini-blocos: fase, neutro, terra sensível e complementares.'],pParam:['06 — Parametrização automática','Tabela final dos ajustes do relé pronta para conferência e comissionamento.'],pCoord:['07 — Coordenograma integrado','Área útil ampliada com foco de análise inspirado no Premium Pro v3.6.3.'],pMemoria:['08 — Diagnóstico / relatório','Auditoria pré-emissão, memória de cálculo, diagnóstico final e emissão do relatório.']};
    Object.entries(headMap).forEach(([id,vals])=>{const panel=document.getElementById(id); if(!panel) return; const h2=panel.querySelector('.cardHead h2'); const p=panel.querySelector('.cardHead p'); if(h2) h2.textContent=vals[0]; if(p) p.textContent=vals[1];});
    if(content && !document.querySelector('.wizardHero')){const hero=document.createElement('div'); hero.className='wizardHero noPrint'; hero.innerHTML='<div><div class="wizardKicker">Arquitetura Wizard Premium</div><h2 class="wizardTitle" id="wizardTitle">Relaytester Proteção SEP</h2><div class="wizardDesc" id="wizardDesc">Fluxo guiado em 8 etapas para estudo, parametrização e coordenograma integrado.</div><div class="wizardMeta"><span class="wizardPill" id="wizardStepPill">Etapa 1 de 8</span><span class="wizardPill" id="wizardProgressPill">Revisão em andamento</span><span class="wizardPill">Versão estável</span></div></div><div class="wizardAccent" aria-hidden="true"></div>'; content.insertBefore(hero, content.firstChild);}
    function activeIndex(){return steps.findIndex(s=>s.classList.contains('active'));}
    function updateWizardChrome(){const idx=activeIndex()<0?0:activeIndex(); const m=meta[idx]||meta[0]; const t=document.getElementById('wizardTitle'); const d=document.getElementById('wizardDesc'); const sp=document.getElementById('wizardStepPill'); const pp=document.getElementById('wizardProgressPill'); if(t) t.textContent=`Etapa ${idx+1} — ${m.label}`; if(d) d.textContent=m.desc; if(sp) sp.textContent=`Etapa ${idx+1} de ${meta.length}`; const prog=document.getElementById('progTxt')?.textContent||'0%'; if(pp) pp.textContent=`Preenchimento revisado: ${prog}`;}
    function go(i){ if(i<0||i>=steps.length) return; steps[i].click(); setTimeout(updateWizardChrome,80); }
    const panelOrder=steps.map(s=>s.dataset.panel).filter(Boolean);
    panelOrder.forEach((panelId,stepIndex)=>{const panel=document.getElementById(panelId); if(!panel) return; const body=panel.querySelector('.card > .body'); if(!body || body.querySelector('.wizardFooter')) return; const footer=document.createElement('div'); footer.className='wizardFooter noPrint'; footer.innerHTML=`<div class="wizardFooterInfo">Use o fluxo guiado: revisar etapa, validar cálculos e avançar para a próxima fase do estudo.</div><div class="wizardActions"><button type="button" class="wizardBtn soft" ${stepIndex===0?'disabled':''} data-go="${stepIndex-1}">← Anterior</button><button type="button" class="wizardBtn validate" data-validate="1">Validar etapa</button><button type="button" class="wizardBtn primary" ${stepIndex===panelOrder.length-1?'disabled':''} data-go="${stepIndex+1}">Próximo →</button></div>`; body.appendChild(footer);});
    document.querySelectorAll('.wizardFooter [data-go]').forEach(btn=>btn.addEventListener('click',ev=>{ev.preventDefault(); ev.stopPropagation(); go(Number(btn.dataset.go));}));
    document.querySelectorAll('.wizardFooter [data-validate]').forEach(btn=>btn.addEventListener('click',ev=>{ev.preventDefault(); ev.stopPropagation(); document.getElementById('btnCalc')?.click(); const old=btn.textContent; btn.textContent='Etapa validada'; setTimeout(()=>btn.textContent=old,1200);}));
    steps.forEach(btn=>btn.addEventListener('click',()=>setTimeout(updateWizardChrome,80)));
    function redrawCoordSoon(){
      setTimeout(()=>{try{window.FLVolts360?.calcular?.(false);}catch(e){console.warn('redrawCoordSoon calcular failed:', e);}},80);
      setTimeout(()=>{try{redrawCoordPreserveSize();}catch(e){console.warn('redrawCoordSoon preserveSize failed:', e);}},160);
    }
    function redrawCoordResizeSoon(){
      setTimeout(()=>{try{window.FLVolts360?.calcular?.(false);}catch(e){console.warn('redrawCoordResizeSoon calcular failed:', e);}},80);
      setTimeout(()=>{try{redrawCoordResizeSize();}catch(e){console.warn('redrawCoordResizeSoon resizeSize failed:', e);}},160);
    }
    window.coordFocusZoom=window.coordFocusZoom||1.05;
    window.coordCurveVisibility=Object.assign({c51f:true,c50f:true,c51n:true,c50n:true,c51ns:true,c50ns:true,m51f:true,m50f:true,m51n:true,m50n:true,m51ns:true,m50ns:true,fuse:true,hh:true},window.coordCurveVisibility||{});
    function setCoordPreset(name){
      const marker=document.getElementById('coordMarkerMode');
      const stage=document.getElementById('coordStageAudit');
      const ref=document.getElementById('coordRefLegend');
      const curve=document.getElementById('coordCurveLegend');
      if(curve) curve.checked=true;
      if(ref) ref.checked=true;
      const allKeys=['c51f','c50f','c51n','c50n','c51ns','c50ns','m51f','m50f','m51n','m50n','m51ns','m50ns','fuse','hh'];
      const setAll=(on)=>{window.coordCurveVisibility={}; allKeys.forEach(k=>window.coordCurveVisibility[k]=!!on);};
      setAll(false);
      if(name==='limpo'){
        if(marker) marker.value='compact';
        if(stage) stage.checked=false;
      }else if(name==='cliente'){
        ['c51f','c50f','c51n','c50n','c51ns','c50ns'].forEach(k=>window.coordCurveVisibility[k]=true);
        if(marker) marker.value='technical';
        if(stage) stage.checked=true;
      }else if(name==='montante' || name==='concessionaria'){
        ['m51f','m50f','m51n','m50n','m51ns','m50ns','fuse','hh'].forEach(k=>window.coordCurveVisibility[k]=true);
        if(marker) marker.value='technical';
        if(stage) stage.checked=true;
      }else if(name==='fase'){
        ['c51f','c50f','m51f','m50f','fuse','hh'].forEach(k=>window.coordCurveVisibility[k]=true);
        if(marker) marker.value='technical';
        if(stage) stage.checked=false;
      }else if(name==='neutro'){
        ['c51n','c50n','c51ns','c50ns','m51n','m50n','m51ns','m50ns'].forEach(k=>window.coordCurveVisibility[k]=true);
        if(marker) marker.value='technical';
        if(stage) stage.checked=true;
      }else{
        setAll(true);
        if(marker) marker.value='technical';
        if(stage) stage.checked=true;
      }
      document.querySelectorAll('[data-coord-curve]').forEach(el=>{el.checked=window.coordCurveVisibility[el.dataset.coordCurve]!==false;});
      redrawCoordSoon();
    }
    function setNavCollapsed(on){
      document.body.classList.toggle('navCollapsed',on);
      document.querySelectorAll('#btnNavCollapse,#btnSidebarCollapse').forEach(btn=>{btn.textContent=on?'›':'☰'; btn.title=on?'Expandir menu esquerdo':'Recolher menu esquerdo';});
      redrawCoordSoon();
    }
    function setCoordToolsCollapsed(on){
      document.body.classList.toggle('coordToolsCollapsed',on);
      document.querySelector('.coord33')?.classList.toggle('coordToolsCollapsed',on);
      const btn=document.getElementById('btnCoordToolsCollapse');
      if(btn){btn.textContent=on?'‹':'›'; btn.title=on?'Expandir painel direito':'Recolher painel direito';}
      redrawCoordSoon();
    }
    function setCoordFocus(on){
      document.body.classList.toggle('coordFocus',on);
      if(on){
        const theme=document.getElementById('coordTheme');
        if(theme) theme.value='black';
        document.querySelector('.step[data-panel="pCoord"]')?.click();
        setNavCollapsed(true);
        setCoordToolsCollapsed(false);
      }else{
        setNavCollapsed(false);
        setCoordToolsCollapsed(false);
      }
      const btn=document.getElementById('btnFocusCoord');
      if(btn){btn.textContent=on?'Modo completo':'Foco coordenograma'; btn.title=on?'Voltar ao modo completo':'Alternar foco no coordenograma';}
      try{clearCoordStableSize();}catch(e){console.warn('clearCoordStableSize failed:', e);}
      redrawCoordResizeSoon();
    }
    document.getElementById('btnNavCollapse')?.addEventListener('click',()=>setNavCollapsed(!document.body.classList.contains('navCollapsed')));
    document.getElementById('btnSidebarCollapse')?.addEventListener('click',()=>setNavCollapsed(!document.body.classList.contains('navCollapsed')));
    document.getElementById('btnCoordToolsCollapse')?.addEventListener('click',()=>setCoordToolsCollapsed(!document.body.classList.contains('coordToolsCollapsed')));
    document.getElementById('btnFocusCoord')?.addEventListener('click',()=>setCoordFocus(!document.body.classList.contains('coordFocus')));
    document.getElementById('btnCoordZoomIn')?.addEventListener('click',()=>{window.coordFocusZoom=Math.min(1.60,(Number(window.coordFocusZoom)||1)+0.1); redrawCoordResizeSoon();});
    document.getElementById('btnCoordZoomOut')?.addEventListener('click',()=>{window.coordFocusZoom=Math.max(0.75,(Number(window.coordFocusZoom)||1)-0.1); redrawCoordResizeSoon();});
    document.getElementById('btnCoordThemeToggle')?.addEventListener('click',()=>{const theme=document.getElementById('coordTheme'); if(theme){theme.value=theme.value==='black'?'white':'black'; theme.dispatchEvent(new Event('change'));}});
    document.addEventListener('change',ev=>{
      const el=ev.target;
      if(el?.dataset?.coordCurve){window.coordCurveVisibility[el.dataset.coordCurve]=!!el.checked; redrawCoordSoon();}
      if(el?.dataset?.coordFeature){window.coordFeatureVisibility=window.coordFeatureVisibility||{}; window.coordFeatureVisibility[el.dataset.coordFeature]=!!el.checked; redrawCoordSoon();}
      if(el?.dataset?.focusCurve){window.coordCurveVisibility[el.dataset.focusCurve]=!!el.checked; redrawCoordSoon();}
    });
    document.addEventListener('click',ev=>{const btn=ev.target.closest?.('[data-coord-preset]'); if(btn) setCoordPreset(btn.dataset.coordPreset);});
    const obs=new MutationObserver(()=>updateWizardChrome()); document.querySelectorAll('.panel').forEach(p=>obs.observe(p,{attributes:true,attributeFilter:['class']})); updateWizardChrome();
  });
})();

window.addEventListener('DOMContentLoaded',()=>{const m=document.getElementById('coordMarkerMode'); if(m){ if(!m.value || m.value==='report') m.value='technical'; }});

(function(){
  const $=id=>document.getElementById(id);
  const fmt=(n,d=2,u='')=>Number.isFinite(n)?n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+(u?' '+u:''):'-';
  function ensureCoordTooltip(){
    let tip=$('coordTooltipXY');
    if(!tip){tip=document.createElement('div');tip.id='coordTooltipXY';tip.className='coordTooltipXY';document.body.appendChild(tip);}
    return tip;
  }
  function setupCoordHover(){
    const canvas=$('coord'); if(!canvas||canvas.dataset.xyHover==='1')return;
    canvas.dataset.xyHover='1';
    const tip=ensureCoordTooltip();
    const readAt=ev=>{
      const g=window.__flCoordGeom; if(!g)return null;
      const r=canvas.getBoundingClientRect();
      const px=(ev.clientX-r.left)*(g.W/r.width), py=(ev.clientY-r.top)*(g.H/r.height);
      if(px<g.plotLeft||px>g.plotRight||py<g.plotTop||py>g.plotBottom)return null;
      const lx=Math.log10(g.xmin)+(px-g.plotLeft)/(g.plotRight-g.plotLeft)*(Math.log10(g.xmax)-Math.log10(g.xmin));
      const ly=Math.log10(g.ymax)-(py-g.plotTop)/(g.plotBottom-g.plotTop)*(Math.log10(g.ymax)-Math.log10(g.ymin));
      return {x:Math.pow(10,lx),y:Math.pow(10,ly)};
    };
    canvas.addEventListener('mousemove',ev=>{
      const v=readAt(ev);
      if(!v){tip.style.display='none';return;}
      tip.innerHTML='<b>Leitura do coordenograma</b>Corrente: <span>'+fmt(v.x,1,'A')+'</span><br>Tempo: <span>'+fmt(v.y,4,'s')+'</span><small>Escala logarítmica X-Y</small>';
      tip.style.left=Math.min(ev.clientX+16,window.innerWidth-220)+'px';
      tip.style.top=Math.min(ev.clientY+16,window.innerHeight-104)+'px';
      tip.style.display='block';
    });
    canvas.addEventListener('mouseleave',()=>{tip.style.display='none';});
  }
  function field(id){const el=$(id); return el?el.closest('.field'):null;}
  function mini(title,desc,tag,ids,wide=false){
    const block=document.createElement('section');
    block.className='montanteMiniBlock'+(wide?' wide':'');
    block.innerHTML='<div class="montanteMiniHead"><div><h3>'+title+'</h3><p>'+desc+'</p></div><span class="montanteMiniTag">'+tag+'</span></div><div class="montanteMiniBody"><div class="grid"></div></div>';
    const grid=block.querySelector('.grid');
    ids.forEach(id=>{const f=field(id); if(f)grid.appendChild(f);});
    return block;
  }
  function setupMenu2Blocks(){
    const panel=$('pPDE'); if(!panel||panel.dataset.blocks==='1')return;
    panel.dataset.blocks='1';
    const mainBody=panel.querySelector(':scope > .card .body');
    const mainGrid=mainBody?.querySelector(':scope > .grid');
    if(mainBody&&mainGrid){
      const audit=document.createElement('div');
      audit.className='montanteAuditBar noPrint';
      audit.innerHTML='<div class="montanteAuditItem"><b>Ordem sugerida</b><span>Curto-circuito, fase, neutro, terra sensível e equipamento montante.</span></div><div class="montanteAuditItem"><b>Base do estudo</b><span>As Iccs alimentam cálculo, validações, coordenograma e relatório.</span></div><div class="montanteAuditItem"><b>Coordenação</b><span>Compare pickups e tempos com cliente antes da emissão.</span></div><div class="montanteAuditItem"><b>Fusível</b><span>Elo/religador pode ser selecionado, manual ou sugerido automaticamente.</span></div>';
      const blocks=document.createElement('div');
      blocks.className='montanteBlocks';
      blocks.appendChild(mini('Curto-circuito no PDE','Níveis de falta e referências usadas no estudo.','ICC',['icc3f','icc2f','icc2ft','iccftmax','iccftmin','iccAdotada','iccTerra','xr'],true));
      mainGrid.replaceWith(audit,blocks);
    }
    const montanteBody=$('montanteInline')?.querySelector('.body');
    const montanteGrid=montanteBody?.querySelector(':scope > .grid');
    if(montanteBody&&montanteGrid){
      const blocks=document.createElement('div');
      blocks.className='montanteBlocks';
      blocks.appendChild(mini('Fase montante','Funções 51/50 de fase da concessionária ou critério técnico.','51F / 50F',['m51f','mCurvaF','mTmsF','m50f','mT50f']));
      blocks.appendChild(mini('Neutro montante','Funções 51N/50N para coordenação de terra.','51N / 50N',['m51n','mCurvaN','mTmsN','m50n','mT50n']));
      blocks.appendChild(mini('Terra sensível montante','Estágios 51NS/51GS quando houver exigência ou filosofia aplicável.','51NS / 51GS',['m51ns','mCurva51ns','mT51ns','m51gs','mCurva51gs','mT51gs'],true));
      blocks.appendChild(mini('Fusível, religador e critério','Curva aproximada, deslocamento e observações do equipamento montante.','FUSÍVEL',['equipMontante','coordFuseMode','fuseSizingFactor','coordFuseType','coordFuseManual','coordFuseShift','fuseT2','fuseExp','fuseMinScale','fuseMaxScale','coordFuseLabel','fuseAutoCrit','obsMontante'],true));
      montanteGrid.replaceWith(blocks);
    }
  }
  window.addEventListener('DOMContentLoaded',()=>{setupCoordHover();setupMenu2Blocks();});
})();

/* coordStartFactor and coordMinMargin are set via the HTML template hidden inputs */

/* R5 — auditoria operacional dos botões ON/OFF do coordenograma. */
(function(){
  const ALL=['c51f','c50f','c51n','c50n','c51ns','c50ns','m51f','m50f','m51n','m50n','m51ns','m50ns','fuse','hh'];
  function current(){
    window.coordCurveVisibility=window.coordCurveVisibility||{};
    ALL.forEach(k=>{
      const cb=document.querySelector('[data-coord-curve="'+k+'"]');
      if(cb) window.coordCurveVisibility[k]=!!cb.checked;
      else if(typeof window.coordCurveVisibility[k]==='undefined') window.coordCurveVisibility[k]=true;
    });
    return window.coordCurveVisibility;
  }
  function repaint(){
    current();
    window.clearTimeout(window.__coordR5Timer);
    window.__coordR5Timer=window.setTimeout(()=>{
      try{
        if(typeof calcData==='function' && typeof drawChart==='function'){
          const c=document.getElementById('coord');
          const rect=c?.getBoundingClientRect?.();
          const opt=(rect&&rect.width>0&&rect.height>0)?{cssWidth:Math.round(rect.width),cssHeight:Math.round(rect.height),preserveSize:true}:{preserveSize:true};
          drawChart(calcData(false),opt);
        }else if(window.FLVolts360?.calcular){
          window.FLVolts360.calcular(false);
        }
      }catch(e){console.warn('R5 redraw coordenograma:',e);}
    },40);
  }
  function bind(){
    document.querySelectorAll('.coordSwitch').forEach(label=>{
      if(label.dataset.r5Bound==='1') return;
      label.dataset.r5Bound='1';
      const input=label.querySelector('input[data-coord-curve]');
      if(!input) return;
      label.addEventListener('click',ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        input.checked=!input.checked;
        window.coordCurveVisibility=window.coordCurveVisibility||{};
        window.coordCurveVisibility[input.dataset.coordCurve]=!!input.checked;
        repaint();
      },true);
      input.addEventListener('change',()=>{
        window.coordCurveVisibility=window.coordCurveVisibility||{};
        window.coordCurveVisibility[input.dataset.coordCurve]=!!input.checked;
        repaint();
      });
    });
    current();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
  document.addEventListener('click',ev=>{
    const btn=ev.target.closest?.('[data-coord-preset]');
    if(!btn) return;
    window.setTimeout(()=>{current(); repaint();},60);
  },true);
  window.coordR5Repaint=repaint;
})();





// Export the app for integration with React — proxied through window.FLVolts360
if (typeof window !== 'undefined') {
  window.CoordenogramaApp = window.FLVolts360 || {};
}
