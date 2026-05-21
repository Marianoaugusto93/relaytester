import { useMemo } from "react";
import { toRect, mulC, normAng, subC } from "./protection.js";

const COLORS={Ia:"#ff6b6b",Ib:"#51cf66",Ic:"#339af0",Va:"#ff922b",Vb:"#845ef7",Vc:"#20c997",Vab:"#e8590c",Vbc:"#9775fa",Vca:"#38d9a9",I0:"#ff8787",I1:"#69db7c",I2:"#74c0fc",V0:"#ffa94d",V1:"#b197fc",V2:"#63e6be"};
const DASHES={I0:"4,3",I1:"4,3",I2:"4,3",V0:"4,3",V1:"4,3",V2:"4,3",Vab:"6,3",Vbc:"6,3",Vca:"6,3"};

export default function PhasorDiagram({onClose,p,pf,pfMode,setPfMode,phasorVis,setPhasorVis,balI,balV,seqI,seqV,uP,uPf,onBalChangeI,onBalChangeV,onSeqChangeI,onSeqChangeV}){
  const seqComponents=useMemo(()=>{
    const src=pfMode==="prefault"?pf:p;
    const a1=toRect(1,120),a2=toRect(1,240);
    const cI={Ia:toRect(src.currents.Ia.mag,src.currents.Ia.ang),Ib:toRect(src.currents.Ib.mag,src.currents.Ib.ang),Ic:toRect(src.currents.Ic.mag,src.currents.Ic.ang)};
    const cV={Va:toRect(src.voltages.Va.mag,src.voltages.Va.ang),Vb:toRect(src.voltages.Vb.mag,src.voltages.Vb.ang),Vc:toRect(src.voltages.Vc.mag,src.voltages.Vc.ang)};
    const s=(a,b,c)=>({re:(a.re+b.re+c.re)/3,im:(a.im+b.im+c.im)/3});
    const I0=s(cI.Ia,cI.Ib,cI.Ic);
    const I1=s(cI.Ia,mulC(a1,cI.Ib),mulC(a2,cI.Ic));
    const I2=s(cI.Ia,mulC(a2,cI.Ib),mulC(a1,cI.Ic));
    const V0=s(cV.Va,cV.Vb,cV.Vc);
    const V1=s(cV.Va,mulC(a1,cV.Vb),mulC(a2,cV.Vc));
    const V2=s(cV.Va,mulC(a2,cV.Vb),mulC(a1,cV.Vc));
    const tp=z=>({mag:Math.sqrt(z.re*z.re+z.im*z.im),ang:normAng(Math.atan2(z.im,z.re)*180/Math.PI)});
    const Vab=subC(cV.Va,cV.Vb),Vbc=subC(cV.Vb,cV.Vc),Vca=subC(cV.Vc,cV.Va);
    return{I0:tp(I0),I1:tp(I1),I2:tp(I2),V0:tp(V0),V1:tp(V1),V2:tp(V2),Vab:tp(Vab),Vbc:tp(Vbc),Vca:tp(Vca)};
  },[p,pf,pfMode]);

  const src=pfMode==="prefault"?pf:p;
  const allPhasors=[];
  if(phasorVis.Ia)allPhasors.push({id:"Ia",mag:src.currents.Ia.mag,ang:src.currents.Ia.ang,color:COLORS.Ia,type:"I"});
  if(phasorVis.Ib)allPhasors.push({id:"Ib",mag:src.currents.Ib.mag,ang:src.currents.Ib.ang,color:COLORS.Ib,type:"I"});
  if(phasorVis.Ic)allPhasors.push({id:"Ic",mag:src.currents.Ic.mag,ang:src.currents.Ic.ang,color:COLORS.Ic,type:"I"});
  if(phasorVis.Va)allPhasors.push({id:"Va",mag:src.voltages.Va.mag,ang:src.voltages.Va.ang,color:COLORS.Va,type:"V"});
  if(phasorVis.Vb)allPhasors.push({id:"Vb",mag:src.voltages.Vb.mag,ang:src.voltages.Vb.ang,color:COLORS.Vb,type:"V"});
  if(phasorVis.Vc)allPhasors.push({id:"Vc",mag:src.voltages.Vc.mag,ang:src.voltages.Vc.ang,color:COLORS.Vc,type:"V"});
  if(phasorVis.Vab)allPhasors.push({id:"Vab",mag:seqComponents.Vab.mag,ang:seqComponents.Vab.ang,color:COLORS.Vab,type:"V",seq:true});
  if(phasorVis.Vbc)allPhasors.push({id:"Vbc",mag:seqComponents.Vbc.mag,ang:seqComponents.Vbc.ang,color:COLORS.Vbc,type:"V",seq:true});
  if(phasorVis.Vca)allPhasors.push({id:"Vca",mag:seqComponents.Vca.mag,ang:seqComponents.Vca.ang,color:COLORS.Vca,type:"V",seq:true});
  if(phasorVis.I0)allPhasors.push({id:"I0",mag:seqComponents.I0.mag,ang:seqComponents.I0.ang,color:COLORS.I0,type:"I",seq:true});
  if(phasorVis.I1)allPhasors.push({id:"I1",mag:seqComponents.I1.mag,ang:seqComponents.I1.ang,color:COLORS.I1,type:"I",seq:true});
  if(phasorVis.I2)allPhasors.push({id:"I2",mag:seqComponents.I2.mag,ang:seqComponents.I2.ang,color:COLORS.I2,type:"I",seq:true});
  if(phasorVis.V0)allPhasors.push({id:"V0",mag:seqComponents.V0.mag,ang:seqComponents.V0.ang,color:COLORS.V0,type:"V",seq:true});
  if(phasorVis.V1)allPhasors.push({id:"V1",mag:seqComponents.V1.mag,ang:seqComponents.V1.ang,color:COLORS.V1,type:"V",seq:true});
  if(phasorVis.V2)allPhasors.push({id:"V2",mag:seqComponents.V2.mag,ang:seqComponents.V2.ang,color:COLORS.V2,type:"V",seq:true});

  const iPhasors=allPhasors.filter(x=>x.type==="I");
  const vPhasors=allPhasors.filter(x=>x.type==="V");
  const maxI=Math.max(...iPhasors.map(x=>x.mag),0.001);
  const maxV=Math.max(...vPhasors.map(x=>x.mag),0.001);
  const R=170;const cx=220,cy=220;
  let labelIdx=0;
  const arrow=(ph,scale)=>{
    const r=(ph.mag/scale)*R;if(r<1)return null;
    const rad=ph.ang*Math.PI/180;
    const ex=cx+r*Math.cos(rad),ey=cy-r*Math.sin(rad);
    const aLen=Math.min(10,r*0.2);const aAng=0.4;
    const a1x=ex-aLen*Math.cos(rad-aAng),a1y=ey+aLen*Math.sin(rad-aAng);
    const a2x=ex-aLen*Math.cos(rad+aAng),a2y=ey+aLen*Math.sin(rad+aAng);
    const idx=labelIdx++;const perpSign=(idx%2===0?1:-1);const perpOff=5+4*(Math.floor(idx/2)%3);
    const lRad=8;const lx=ex+lRad*Math.cos(rad)+perpSign*perpOff*Math.cos(rad+Math.PI/2);
    const ly=ey-lRad*Math.sin(rad)-perpSign*perpOff*Math.sin(rad+Math.PI/2);
    return(<g key={ph.id}><line x1={cx} y1={cy} x2={ex} y2={ey} stroke={ph.color} strokeWidth={2} strokeDasharray={ph.seq?DASHES[ph.id]:undefined}/><polygon points={`${ex},${ey} ${a1x},${a1y} ${a2x},${a2y}`} fill={ph.color}/><text x={lx} y={ly} fill={ph.color} fontSize={11} fontWeight={700} textAnchor="middle" dominantBaseline="central" fontFamily="var(--fm)">{ph.id}</text></g>);
  };
  const gridCircles=[0.25,0.5,0.75,1].map(f=>f*R);
  const angLines=[0,30,60,90,120,150,180,210,240,270,300,330];

  return(
    <div className="pd-overlay" onClick={onClose}>
      <div className="pd-modal" onClick={e=>e.stopPropagation()}>
        <div className="pd-header">
          <div className="pd-title">Phasor Diagram</div>
          <div className="pd-mode">{pfMode==="prefault"?"PRE-FAULT":"FAULT"}</div>
          <button className="pd-close" onClick={onClose}>✕</button>
        </div>
        <div className="pd-body">
          <div className="pd-chart">
            <svg width={440} height={440} style={{background:"#0e1015",borderRadius:12}}>
              {gridCircles.map((r,i)=><circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={1}/>)}
              {angLines.map(a=>{const rad=a*Math.PI/180;return<line key={a} x1={cx} y1={cy} x2={cx+R*Math.cos(rad)} y2={cy-R*Math.sin(rad)} stroke="rgba(255,255,255,.04)" strokeWidth={1}/>})}
              <line x1={cx-R-15} y1={cy} x2={cx+R+15} y2={cy} stroke="rgba(255,255,255,.1)" strokeWidth={1}/>
              <line x1={cx} y1={cy-R-15} x2={cx} y2={cy+R+15} stroke="rgba(255,255,255,.1)" strokeWidth={1}/>
              <text x={cx+R+8} y={cy-6} fill="rgba(255,255,255,.2)" fontSize={9} fontFamily="var(--fm)">0°</text>
              <text x={cx+4} y={cy-R-8} fill="rgba(255,255,255,.2)" fontSize={9} fontFamily="var(--fm)">90°</text>
              <text x={cx-R-22} y={cy-6} fill="rgba(255,255,255,.2)" fontSize={9} fontFamily="var(--fm)">180°</text>
              <text x={cx+4} y={cy+R+14} fill="rgba(255,255,255,.2)" fontSize={9} fontFamily="var(--fm)">270°</text>
              {vPhasors.map(ph=>arrow(ph,maxV))}
              {iPhasors.map(ph=>arrow(ph,maxI))}
              <text x={8} y={16} fill="rgba(255,255,255,.3)" fontSize={9} fontFamily="var(--fm)">I max: {maxI.toFixed(2)} A</text>
              <text x={8} y={28} fill="rgba(255,255,255,.3)" fontSize={9} fontFamily="var(--fm)">V max: {maxV.toFixed(2)} V</text>
            </svg>
          </div>
          <div className="pd-side">
            <div className="pd-tabs">
              <button className={`nav-pill ${pfMode==="prefault"?"on":""}`} style={{flex:1,fontSize:10}} onClick={()=>setPfMode("prefault")}>Pre-Fault</button>
              <button className={`nav-pill ${pfMode==="fault"?"on":""}`} style={{flex:1,fontSize:10}} onClick={()=>setPfMode("fault")}>Fault</button>
            </div>
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
                  <div className="pd-chk" style={{background:phasorVis[k]?COLORS[k]:"transparent",borderColor:COLORS[k]}} onClick={()=>setPhasorVis(v=>({...v,[k]:!v[k]}))}>{phasorVis[k]?"✓":""}</div>
                  <span className="pd-lbl" style={{color:COLORS[k]}}>{k}{balI==="balanced"?" (ref)":""}</span>
                  <input type="number" className="pd-inp" value={d.mag} onChange={e=>{const v=parseFloat(e.target.value)||0;pfMode==="prefault"?uPf("currents",k,"mag",v):uP("currents",k,"mag",v)}}/>
                  <span className="pd-u">A</span>
                  <input type="number" className="pd-inp pd-ang" value={d.ang} onChange={e=>{const v=parseFloat(e.target.value)||0;pfMode==="prefault"?uPf("currents",k,"ang",v):uP("currents",k,"ang",v)}}/>
                  <span className="pd-u">°</span>
                </div>)})}
              {balI==="balanced"&&["Ib","Ic"].map(k=>{const d=pfMode==="prefault"?pf.currents[k]:p.currents[k];return(
                <div key={k} className="pd-row" style={{opacity:.5}}>
                  <div className="pd-chk" style={{background:phasorVis[k]?COLORS[k]:"transparent",borderColor:COLORS[k]}} onClick={()=>setPhasorVis(v=>({...v,[k]:!v[k]}))}>{phasorVis[k]?"✓":""}</div>
                  <span className="pd-lbl" style={{color:COLORS[k]}}>{k}</span>
                  <span className="pd-val" style={{fontSize:10}}>{d.mag.toFixed(2)}A ∠{d.ang.toFixed(1)}°</span>
                </div>)})}
            </div>
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
                  <div className="pd-chk" style={{background:phasorVis[k]?COLORS[k]:"transparent",borderColor:COLORS[k]}} onClick={()=>setPhasorVis(v=>({...v,[k]:!v[k]}))}>{phasorVis[k]?"✓":""}</div>
                  <span className="pd-lbl" style={{color:COLORS[k]}}>{k}{balV==="balanced"?" (ref)":""}</span>
                  <input type="number" className="pd-inp" value={d.mag} onChange={e=>{const v=parseFloat(e.target.value)||0;pfMode==="prefault"?uPf("voltages",k,"mag",v):uP("voltages",k,"mag",v)}}/>
                  <span className="pd-u">V</span>
                  <input type="number" className="pd-inp pd-ang" value={d.ang} onChange={e=>{const v=parseFloat(e.target.value)||0;pfMode==="prefault"?uPf("voltages",k,"ang",v):uP("voltages",k,"ang",v)}}/>
                  <span className="pd-u">°</span>
                </div>)})}
              {balV==="balanced"&&["Vb","Vc"].map(k=>{const d=pfMode==="prefault"?pf.voltages[k]:p.voltages[k];return(
                <div key={k} className="pd-row" style={{opacity:.5}}>
                  <div className="pd-chk" style={{background:phasorVis[k]?COLORS[k]:"transparent",borderColor:COLORS[k]}} onClick={()=>setPhasorVis(v=>({...v,[k]:!v[k]}))}>{phasorVis[k]?"✓":""}</div>
                  <span className="pd-lbl" style={{color:COLORS[k]}}>{k}</span>
                  <span className="pd-val" style={{fontSize:10}}>{d.mag.toFixed(2)}V ∠{d.ang.toFixed(1)}°</span>
                </div>)})}
            </div>
            <div className="pd-section">
              <div className="pd-sec-title">Line-to-Line Voltages</div>
              {[{k:"Vab",label:"Vab"},{k:"Vbc",label:"Vbc"},{k:"Vca",label:"Vca"}].map(({k,label})=>{
                const d=seqComponents[k];return(
                <div key={k} className="pd-row">
                  <div className="pd-chk" style={{background:phasorVis[k]?COLORS[k]:"transparent",borderColor:COLORS[k]}} onClick={()=>setPhasorVis(v=>({...v,[k]:!v[k]}))}>{phasorVis[k]?"✓":""}</div>
                  <span className="pd-lbl" style={{color:COLORS[k]}}>{label}</span>
                  <span className="pd-val">{d.mag.toFixed(2)} V ∠ {d.ang.toFixed(1)}°</span>
                </div>)})}
            </div>
            <div className="pd-section">
              <div className="pd-sec-title">Sequence Components</div>
              {[{k:"I0",label:"I₀ (Zero)",u:"A"},{k:"I1",label:"I₁ (Pos)",u:"A"},{k:"I2",label:"I₂ (Neg)",u:"A"},{k:"V0",label:"V₀ (Zero)",u:"V"},{k:"V1",label:"V₁ (Pos)",u:"V"},{k:"V2",label:"V₂ (Neg)",u:"V"}].map(({k,label,u})=>{
                const d=seqComponents[k];return(
                <div key={k} className="pd-row">
                  <div className="pd-chk" style={{background:phasorVis[k]?COLORS[k]:"transparent",borderColor:COLORS[k]}} onClick={()=>setPhasorVis(v=>({...v,[k]:!v[k]}))}>{phasorVis[k]?"✓":""}</div>
                  <span className="pd-lbl" style={{color:COLORS[k]}}>{label}</span>
                  <span className="pd-val">{d.mag.toFixed(2)} {u} ∠ {d.ang.toFixed(1)}°</span>
                </div>)})}
            </div>
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
}
