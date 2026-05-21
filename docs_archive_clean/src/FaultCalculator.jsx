import { useState, useMemo } from "react";
import { Tgl, IB } from "./widgets.jsx";

const FC_TYPES=["AG","BG","CG","AB","BC","CA","ABG","BCG","CAG","ABC"];

function calcFaultPhasors({type,Vf,Z1r,Z1i,Z0r,Z0i,Rf}){
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
  let rotI=0,rotV=0;
  if(type==="BG"||type==="BC")rotI=-120,rotV=-120;
  else if(type==="CG"||type==="CA")rotI=120,rotV=120;
  else if(type==="BCG")rotI=-120,rotV=-120;
  else if(type==="CAG")rotI=120,rotV=120;
  const rotC=(c,deg)=>mul(c,polar(1,deg));
  if(rotI!==0){I0c=rotC(I0c,rotI);I1c=rotC(I1c,rotI);I2c=rotC(I2c,rotI);}
  const [Ia,Ib,Ic]=toPhase(I0c,I1c,I2c);
  if(rotV!==0){I0c=rotC(I0c,0)}
  const [Va,Vb,Vc]=seqV(I0c,I1c,I2c);
  const phas=(c)=>({mag:Math.round(mag(c)*1000)/1000,ang:Math.round(ang(c)*10)/10});
  return{currents:{Ia:phas(Ia),Ib:phas(Ib),Ic:phas(Ic)},voltages:{Va:phas(Va),Vb:phas(Vb),Vc:phas(Vc)}};
}

export default function FaultCalculator({sys,onApply,onClose}){
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
