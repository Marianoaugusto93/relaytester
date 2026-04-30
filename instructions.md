# RelayLab 360 — Plano de Implementação

> **Para o Claude que retomar este trabalho:** leia este arquivo inteiro antes de tocar em qualquer código.
> O projeto está em `C:\Users\augus\Documentos\claude\relaytester\`. Rode `npm run dev` para iniciar.
> Arquitetura atual: App.jsx (~410 lin) + RelayDisplay.jsx + SettingsPanel.jsx + use27Monitor.js + useSimulation.js + protection.js + defaults.js + appStyles.js

---

## Estado atual do código (referência rápida)

| Arquivo | Função |
|---|---|
| `src/App.jsx` | Raiz: todo o estado global, hooks, JSX principal |
| `src/RelayDisplay.jsx` | Painel direito do relé: LCD, abas MENS/PROT/LÓGICA/EVENTOS |
| `src/SettingsPanel.jsx` | Painel central: sys/relay/output/input |
| `src/use27Monitor.js` | Hook: timer idle 27 (sem injeção) |
| `src/useSimulation.js` | Hook: loop de simulação com acumulador |
| `src/protection.js` | Funções puras: cálculo de trip, avaliação de stages |
| `src/appStyles.js` | Todo o CSS (template-literal, sem framework) |
| `src/defaults.js` | Constantes: protOrder, ledCols, biRows, etc. |
| `src/CampoPage.jsx` | Aba Campo: fiação física + Union-Find |
| `src/PainelPage.jsx` | Aba Painel: disjuntor + diagrama ladder |
| `src/PhasorDiagram.jsx` | Modal do diagrama fasorial |
| `src/FaultCalculator.jsx` | Modal do calculador de falta |

### Variáveis CSS relevantes (em `appStyles.js`, linha 3)
```
--orange: #f97316       --orange-dim: rgba(249,115,22,.12)
--red: #f87171          --red-dim: rgba(248,113,113,.1)
--green: #4ade80        --green-dim: rgba(74,222,128,.12)
--cyan: #0ea5e9         --cyan-dim: rgba(14,165,233,.1)
--card: #181b22         --card2: #1e2129   --card3: #252830
--bdr: rgba(255,255,255,.06)
```

### Estado de trip em App.jsx
- `isTripped` (bool): relé atuou — qualquer proteção
- `maletaTripped` (bool): trip confirmado pela maleta (abertura do disjuntor detectada)
- `trippedStageIds` (string[]): ex. `["51-1", "50N-2"]`
- `faultRecord` (object | null): `{ stages, timestamp, currents, voltages }`
- `tripHistory` (array, max 5): registros completos para COMTRADE
- `ss` (string): `"idle"` | `"running"`
- Botão Inject: `<button onClick={runSim}>` — App.jsx linha 322

---

## Features a implementar

---

### Feature 1 — Tooltips de Componentes Simétricas

**Status: NÃO IMPLEMENTADO**

**Objetivo:** No painel MENSURACAO do RelayDisplay, ao passar o mouse sobre as linhas de `3I₀` e `3V₀`, mostrar um tooltip com a decomposição completa em componentes simétricas (I₀, I₁, I₂ / V₀, V₁, V₂).

**Contexto do código:**
- A lógica de cálculo das componentes **já existe** em `RelayDisplay.jsx` dentro de `renderMensuracaoTab()` (linhas 27–38):
  - `i1mag` = componente positiva de corrente
  - `i2lcd` = componente negativa de corrente (prop vinda de App.jsx via `calcI2`)
  - `v2mag`, `v2ang` = componente negativa de tensão
  - `i0` e `v0` são props diretas (3I₀/3, 3V₀/3)
- As linhas que mostram `3I₀` estão na aba "corr" (linhas 52–53) e na aba "tens" (linha 73)

**Implementação:**

1. Adicionar estado local em `RelayDisplay.jsx`:
   ```js
   const [tooltip, setTooltip] = useState(null); // {x,y,lines:[]}
   ```

2. Criar componente Tooltip inline no JSX:
   ```jsx
   {tooltip && (
     <div style={{position:'fixed',left:tooltip.x,top:tooltip.y,zIndex:9999,
       background:'var(--card)',border:'1px solid rgba(249,115,22,.3)',
       borderRadius:8,padding:'8px 12px',fontSize:9,fontFamily:'var(--fm)',
       color:'var(--tx)',boxShadow:'0 8px 24px rgba(0,0,0,.5)',pointerEvents:'none',
       minWidth:180}}>
       {tooltip.lines.map((l,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',gap:16,padding:'2px 0'}}>
         <span style={{color:'var(--tx3)'}}>{l.label}</span>
         <span style={{color:'var(--orange)'}}>{l.value}</span>
       </div>)}
     </div>
   )}
   ```

3. Nas linhas que renderizam `3I₀` (aba corr) e `3V₀` (aba tens), adicionar:
   ```jsx
   <div className="rp-row" style={{cursor:'help'}}
     onMouseEnter={e=>{
       const rect=e.currentTarget.getBoundingClientRect();
       setTooltip({
         x: rect.right+8, y: rect.top-4,
         lines:[
           {label:'I₀ (seq. zero)',  value:`${(i0.mag/3).toFixed(3)} A ∠${i0.ang.toFixed(1)}°`},
           {label:'I₁ (seq. pos.)',  value:`${i1mag.toFixed(3)} A`},
           {label:'I₂ (seq. neg.)',  value:`${i2lcd.mag.toFixed(3)} A ∠${i2lcd.ang.toFixed(1)}°`},
           {label:'I₂/I₁',          value: i1mag>0.01?`${(i2lcd.mag/i1mag*100).toFixed(1)}%`:'—'},
         ]
       });
     }}
     onMouseLeave={()=>setTooltip(null)}>
     ...conteúdo existente...
   </div>
   ```
   Analogamente para `3V₀` com V₀, V₁, V₂.

4. Para calcular V₁ (já que V₂ existe mas V₁ não está exposto), adicionar dentro de `renderMensuracaoTab`:
   ```js
   const v1re=(VaR.re+(a1r*VbR.re-a1i*VbR.im)+(a2r*VcR.re-a2i*VcR.im))/3;
   const v1im=(VaR.im+(a1r*VbR.im+a1i*VbR.re)+(a2r*VcR.im+a2i*VcR.re))/3;
   const v1mag=injecting?Math.sqrt(v1re*v1re+v1im*v1im):0;
   ```

5. Adicionar `import {useState} from "react"` no topo de `RelayDisplay.jsx`.

**Arquivos:** `src/RelayDisplay.jsx` apenas.

---

### Feature 2 — Painéis Flutuantes / Desencaixáveis

**Status: PARCIALMENTE IMPLEMENTADO**
- `PhasorDiagram` já abre como modal (estado `phasorDiagOpen` em App.jsx)
- `TimeCurrentCurve` (TCC — gráfico log-log de curva inversa) **não existe ainda**
- Janela pop-out separada do navegador: **não implementado**

**Objetivo:** Adicionar botão "Pop-out" no PhasorDiagram e criar o componente TCC. Ambos devem poder abrir em janela separada.

#### Sub-feature 2a: Pop-out do PhasorDiagram

Em `PhasorDiagram.jsx`, no canto superior direito do modal, adicionar:
```jsx
<button onClick={()=>{
  const w=window.open('','_blank','width=900,height=700');
  // renderizar via portal ou usar URL hash
  // Alternativa simples: copiar SVG para clipboard ou usar portal do React
}} title="Pop-out">⬡</button>
```

**Abordagem recomendada (sem backend):** usar `window.open` + `ReactDOM.createPortal` para o novo contexto de janela. Isso requer passar o `document` da nova janela para o portal. Alternativa mais simples: expandir o modal para 90vw × 90vh quando em "fullscreen mode".

#### Sub-feature 2b: Componente TimeCurrentCurve (TCC)

**Este é o maior trabalho.** Criar `src/TimeCurrentCurve.jsx` — gráfico log-log SVG da curva tempo-corrente.

**Interface:**
```jsx
<TimeCurrentCurve
  relayProt={relayProt}   // configurações ativas no relé
  rtc={rtc}               // relação TC para conversão primário/secundário
  injPoint={injecting ? {I: ci.Ia.mag} : null}  // ponto de operação atual
  onClose={()=>setTccOpen(false)}
/>
```

**Lógica de renderização:**
- Eixo X: corrente em múltiplos de Inom (0.1× a 100×), escala log
- Eixo Y: tempo (0.01s a 100s), escala log
- Para cada stage de 51/51N/67/67N habilitado: plotar curva usando `calcTripTime(fid, stage, I)` de `protection.js` para I em [pickup..20×pickup]
- Para 50/50N: linha vertical no pickup com tempo horizontal
- Ponto de operação (cruz/diamond): `injPoint.I` no eixo X, com `calcTripTimeReal` no Y
- SVG puro (sem biblioteca de gráfico), viewBox dinâmico

**Estado em App.jsx a adicionar:**
```js
const [tccOpen, setTccOpen] = useState(false);
```

**Botão para abrir:**
```jsx
<button className="pd-open-btn" onClick={()=>setTccOpen(true)}>⚡ Time-Current Curve</button>
```

**Arquivos:** criar `src/TimeCurrentCurve.jsx`, adicionar import e estado em `src/App.jsx`.

---

### Feature 3 — Feedback Visual de Atuação (Trip Latching)

**Status: IMPLEMENTADO ✓** *(sessão 2026-04-29)*

O que foi feito:
- `appStyles.js`: adicionadas classes `.relay-shell.tripped` e `@keyframes trip-pulse` — glow laranja pulsante de 1.2s na borda do painel do relé
- `appStyles.js`: adicionado `.ctrl-big:disabled { opacity:.35; cursor:not-allowed }` 
- `App.jsx` linha 341: `relay-shell` recebe classe `tripped` condicionalmente via `isTripped`
- `App.jsx` linha 322: botão Inject recebe `disabled={isTripped}` e `title` explicativo

---

### Feature 4 — Exportação PDF (Certificado de Ensaio)

**Status: NÃO IMPLEMENTADO**
- Só existe exportação COMTRADE (ZIP com .cfg/.dat/.hdr)
- Não há `jsPDF` nem `@react-pdf/renderer` instalado

**Objetivo:** Gerar PDF "Certificado de Ensaio Secundário" com dados do tripHistory[selecionado].

**Escolha de biblioteca:** usar `jsPDF` (mais simples, sem componentes React):
```bash
npm install jspdf
```

**Criar `src/generateReport.js`** (função pura):
```js
import jsPDF from 'jspdf';

export function generateCertificate(record, sys, rtc, rtp) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  // Cabeçalho
  doc.setFont('helvetica','bold');
  doc.setFontSize(16);
  doc.text('RelayLab 360 — Certificado de Ensaio Secundário', 20, 20);
  // Metadados
  doc.setFontSize(10);
  doc.text(`Data/Hora: ${record.timestamp}`, 20, 32);
  doc.text(`TC: ${sys.tc.priA}/${sys.tc.secA} A  (RTC = ${rtc.toFixed(2)})`, 20, 38);
  doc.text(`TP: ${sys.tp.priV}/${sys.tp.secV} V  (RTP = ${rtp.toFixed(2)})`, 20, 44);
  // Stages atuados
  doc.setFont('helvetica','bold');
  doc.text('Stages atuados:', 20, 56);
  record.stages.forEach((s,i) => {
    doc.setFont('helvetica','normal');
    doc.text(`  ${s.stage}  —  tempo: ${s.time?.toFixed(3) ?? '—'} s`, 20, 64 + i*7);
  });
  // Correntes/Tensões de falta
  // ... (construir tabela com correntes e tensões do record.fault)
  return doc;
}
```

**Em App.jsx**, no modal de Fault Records (linha ~388), adicionar botão "PDF" ao lado de "Download":
```jsx
import { generateCertificate } from './generateReport.js';
// ...
<button className="wf-btn" onClick={()=>{
  if(wfSelected===null) return;
  const rec = tripHistory[wfSelected];
  const doc = generateCertificate(rec, sys, rtc, rtp);
  doc.save(`certificado_${rec.timestamp.replace(/[:/]/g,'-')}.pdf`);
}}>PDF</button>
```

**Estrutura do PDF (seções):**
1. Cabeçalho: logo textual + título + data/hora
2. Sistema: TC, TP, RTC, RTP
3. Resultado do Ensaio: stage, tempo esperado vs. real, desvio %
   - Para calcular tempo esperado: usar `calcTripTimeReal(fid, stage, I)` de `protection.js`
   - Desvio: `(real - esperado) / esperado * 100`
4. Fasores de falta: tabela Ia/Ib/Ic/Va/Vb/Vc (secundário e primário)
5. Fasores de pré-falta (se `record.prefault.enabled`)
6. Rodapé: "Gerado por RelayLab 360 · augustocesar.mariano@gmail.com"

**Arquivos:** `npm install jspdf`, criar `src/generateReport.js`, modificar `src/App.jsx` (import + botão no modal).

---

## Ordem de implementação sugerida

| Prioridade | Feature | Esforço | Arquivos tocados |
|---|---|---|---|
| ~~1~~ | ~~**Feature 3** — Trip Latching visual + bloqueio Inject~~ | ~~Pequeno~~ | ~~App.jsx, appStyles.js~~ **FEITO** |
| 1 | **Feature 1** — Tooltips componentes simétricas | Médio (~30 min) | RelayDisplay.jsx |
| 2 | **Feature 4** — PDF Certificado | Médio (~1h) | generateReport.js (novo), App.jsx |
| 3 | **Feature 2b** — TCC chart | Grande (~2h) | TimeCurrentCurve.jsx (novo), App.jsx |
| 4 | **Feature 2a** — Pop-out PhasorDiagram | Pequeno (~20 min) | PhasorDiagram.jsx |

## Checklist de implementação

- [x] Feature 3a: `.relay-shell.tripped` CSS + classe condicional no JSX *(feito)*
- [x] Feature 3b: `disabled={isTripped}` no botão Inject + CSS `:disabled` *(feito)*
- [ ] Feature 1: `useState` + tooltip inline em RelayDisplay.jsx
- [ ] Feature 1: hover em 3I₀ (aba corr) com I₀/I₁/I₂
- [ ] Feature 1: hover em 3V₀ (aba tens) com V₀/V₁/V₂
- [ ] Feature 4: `npm install jspdf`
- [ ] Feature 4: criar `src/generateReport.js`
- [ ] Feature 4: botão PDF no modal de Fault Records em App.jsx
- [ ] Feature 2b: criar `src/TimeCurrentCurve.jsx` com SVG log-log
- [ ] Feature 2b: estado `tccOpen` e botão em App.jsx
- [ ] Feature 2a: botão pop-out fullscreen no PhasorDiagram.jsx

## Notas de implementação

- **Não usar bibliotecas de gráficos externas** (Chart.js, Recharts) para o TCC — o projeto usa SVG puro para tudo. Usar `Math.log10` para escala log e mapear para coordenadas SVG.
- **CSS template-literal** em `appStyles.js`: toda adição de CSS vai no final da string S existente, antes do backtick de fechamento.
- **Sem TypeScript, sem testes** — o projeto usa JSX puro com Vite.
- A função `calcTripTime(fid, stage, I)` em `protection.js` retorna tempo em segundos para um dado múltiplo de corrente. Usar para plotar curva TCC.
- O `faultRecord` salvo tem a estrutura: `{stages:[{stage,time}], timestamp, currents:{Ia,Ib,Ic}, voltages:{Va,Vb,Vc}}`.
