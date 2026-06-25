# Handoff — Simulador de Manobras & Falhas em Subestações

Documento de transferência para continuidade do desenvolvimento no **Claude Code**.
Cobre arquitetura, estado atual, modelo de dados, validação, publicação e próximos passos.

> **Fonte única de verdade (2026-06-23):** `public/simulador-manobras.html`. Edite **apenas** esse arquivo
> — ele é servido via iframe por `src/SimuladorManobrasPage.jsx` (aba "🔀 Manobras"). A antiga cópia
> fonte foi arquivada em `archive/simulador-manobras-source/`. Este `handoff.md` permanece como referência.

> **Entregável atual:** `public/simulador-manobras.html` — arquivo único, 100% client-side.

---

## 1. Visão geral

Plataforma web de treinamento de operadores de subestação. Permite:

- Visualizar um **unifilar interativo** com energização em tempo real.
- Executar **manobras** (abrir/fechar disjuntores e seccionadoras, aterrar).
- Sofrer **intertravamentos** que recusam manobras inseguras.
- **Injetar faltas 3φ** e observar a atuação coordenada da proteção (50/51, 87T, 87B, 50BF).
- **Treinar por cenários** com objetivo, avaliação e pontuação.
- Alternar entre **várias subestações** (arquitetura dirigida por dados).

Objetivo de implantação: página web estática para alunos estudarem em casa, sem backend.

---

## 2. Tecnologias

| Camada | Tecnologia | Observações |
|--------|-----------|-------------|
| Runtime | HTML + CSS + **JavaScript vanilla** | Sem framework, sem build |
| Gráfico | **SVG** desenhado dinamicamente via DOM | `viewBox 1120×760`, escalável |
| Persistência | **localStorage** (`try/catch`) | Pontuação por SE; funciona quando hospedado/aberto localmente, não em iframe sandbox |
| Distribuição | Arquivo único `.html` | Hospedagem estática trivial |

**Ferramentas de validação usadas no desenvolvimento** (não embarcadas no produto):

- **Node.js** — checagem de sintaxe (`new Function(...)`).
- **jsdom** — executa o script e materializa o SVG fora do navegador.
- **@resvg/resvg-js** — rasteriza o SVG gerado em PNG para inspeção visual.

Instalação dessas dependências no ambiente de dev:

```bash
npm install jsdom @resvg/resvg-js
```

---

## 3. Arquitetura (dirigida por dados)

O sistema é **totalmente data-driven**: cada subestação é um objeto JSON autocontido em `SUBSTATIONS`. O **motor** e o **renderizador são genéricos** e leem da SE ativa (`S`). Trocar ou adicionar SE não exige tocar a lógica.

```
┌─────────────────────────────────────────────────────────────┐
│  SUBSTATIONS = { A:{...}, B:{...}, C:{...} }                  │
│  (cada SE: nodes, edges, sources, feeders, prot, zones,       │
│   scenarios + coordenadas de desenho)                         │
└───────────────┬─────────────────────────────────────────────┘
                │  loadSub(id) → S = SUBSTATIONS[id]
                ▼
┌──────────────────────────┐   ┌───────────────────────────────┐
│ MOTOR (genérico, lê S)    │   │ RENDERIZADOR (genérico, lê S) │
│ • computeEnergization()   │   │ • render() desenha de coords  │
│ • electricalSolve()       │──▶│ • anchor()/segLine()          │
│ • canOperate()            │   │ • barras/trafos/fontes/cargas │
│ • resolveFault()          │   │ • medições, marcador de falta │
│ • avaliador de cenário    │   └───────────────────────────────┘
└──────────────────────────┘
```

**Estado global ativo** (variáveis no escopo do script):

- `S` — subestação ativa (objeto).
- `NORMAL` — snapshot dos estados iniciais dos ramos (para "Estado normal").
- `syncedG` — `{ djId: bool }` sincronismo verificado por disjuntor de máquina.
- `selected` — id do equipamento selecionado.
- `activeFault` — `{ at, kind, If, kV }` ou `null`.
- `SOL` — resultado do último solver (`busScc`, `busV`, `branchI`, `zthAt`, `parentEdge`).
- `currentScenario`, `scenManeuvers`, `scenViolations`, `scenCatastrophic`, `scenDone`, `scenScore`.
- `activeSub` — id da SE ativa (usado na chave de persistência).

---

## 4. Estrutura do arquivo (seções do `<script>`)

Ordem dentro do `simulador-manobras.html`:

1. **CSS** (`:root` com paleta, layout grid, painéis, SOE).
2. **HTML** — header (seletor de SE), `<svg id="sld">`, aside (cenário, painel de equipamento, toolbar, SOE).
3. **Paleta de tensão** — `VCOL`, `vcol()`, `voltColor()`, `stateColor()`.
4. **`SUBSTATIONS`** — registro das 3 SEs (A, B, C).
5. **Estado ativo** — `S`, `NORMAL`, `syncedG`, etc.
6. **Motor de energização** — `conducts`, `groundedNodes`, `srcNodes`, `computeEnergization`.
7. **Solver elétrico** — complexos (`cx/cadd/cmul/cdiv/cabs/cinv`), `cMatInv`, `ibase`, `feederZpu`, `trZpu`, `electricalSolve`.
8. **Intertravamento** — `canOperate`.
9. **Proteção** — `CURVES`, `opTime`, `breakersOnBus`, `pathBreakers`, `resolveFault`, `clearFault`.
10. **Renderizador** — `svgEl`, `anchor`, `ptToward`, `render`, `renderLegend`.
11. **HMI** — `select`, `renderPanel`, `operate`, `doFaultSequence`, `applyFault`, `removeFault`, `log`, handlers de toolbar.
12. **Cenários/avaliador/persistência** — `resetNormal`, `loadScenario`, `checkObjective`, `finishScenario`, `updateScenBar`, `loadScores/saveScore`.
13. **Loader de SE + init** — `loadSub`, `initSub` (IIFE que carrega `"A"` por padrão).

---

## 5. Modelo de dados — esquema de uma subestação

```js
SUBSTATIONS.X = {
  name: "Texto no seletor",
  subtitle: "Subtítulo no cabeçalho",
  baseMVA: 100,                 // base do sistema em pu
  voltages: [230, 69, 13.8],    // níveis (para a legenda)

  nodes: {
    // ponto elétrico (terminal) ou barra
    ID: { kind:"point", x, y, kV },
    ID: { kind:"bus",   x, y, x2, kV, label:"BARRA ..." }, // barra: segmento x..x2
  },

  edges: {
    // disjuntor
    DJ: { type:"breaker", a:"NoA", b:"NoB", state:"closed|open",
          kV, label, x, y,                 // x,y = posição do símbolo
          sync:true },                     // (opcional) exige sincronismo p/ fechar em barra viva
    // seccionadora
    SC: { type:"disconnector", a, b, state, series:"DJx", kV, label, x, y },
    // transformador (a = lado de cima/HV, b = lado de baixo/LV)
    // `vector` define o modelo de sequência-zero: "Dyn" (delta AT / estrela-aterr. BT),
    // "YNd" (estrela-aterr. AT / delta BT), "YNyn" (ambos aterr.: série), "Dd"/"Yy" (bloqueia).
    TR: { type:"transformer", a, b, kV, kVsec, mva, Zpct, XR, vector:"Dyn",
          label, ratio:"138/13,8", x, y },
    // lâmina de terra (um terminal → nó aterrado)
    GND:{ type:"ground", node:"NoX", state:"open", kV, label, x, y, side:1|-1 },
  },

  sources: {
    // rede (grid): símbolo de seta; impedância por Scc/XR
    // seq-zero: grid aterrado por padrão (grnd!==false); Z0 = x0x1·Z1 (def. x0x1=1).
    LT: { node:"NoLT", kV, Scc_MVA, XR, type:"grid", x0x1:1, label, x, y },
    // gerador: símbolo de círculo; impedância por Xd"/MVA
    // seq-negativa: máquina usa Xd2 (≈(Xd″+Xq″)/2; def. = Xdpp se omitido); XR2 opcional (def. XR).
    // seq-zero: gerador NÃO aterrado por padrão (grnd:true p/ contribuir; Zg p/ aterr. por impedância).
    G:  { node:"NoG", kV, MVA, Xdpp, Xd2, XR, type:"gen", grnd:false, label, x, y },
  },

  prot: {
    // fase: p51 {pickup,curve,TMS}, p50 {pickup,t}
    // neutro (3I0): p51n {pickup,curve,TMS}, p50n {pickup,t} — só atuam no lado aterrado
    // religamento: p79 {dead:[t1,t2,...]} — tempos mortos por tentativa; nº de tiros = dead.length
    DJ: { p51:{...}, p50:{...}, p51n:{...}, p50n:{...}, p79:{dead:[0.5,3.0]} },
  },

  feeders: {
    // carga + linha. Desenhada como triângulo no nó.
    // ATENÇÃO: reatância de linha é `xl` (Ω/km) — `x`/`y` são as coordenadas de
    // desenho. Não use `x` para reatância (colide com a coordenada e é sobrescrito).
    AL: { node:"NoAL", P, Q, r, xl, km, kV, x0x1:3, label, x, y },
  },

  prot: {
    // ajustes de sobrecorrente por disjuntor (A primários, no nível do equip.)
    DJ: { p51:{ pickup, curve:"IEC-VI", TMS }, p50:{ pickup, t } },
  },

  zones: {
    // diferenciais por topologia
    TR:  { type:"87T", t:0.04, trips:["DJxH","DJxL"] }, // dispara fronteiras
    BUS: { type:"87B", t:0.05, bus:"NoBus" },           // dispara todos da barra
  },

  scenarios: {
    ID: { title, desc, optimal, hint,
          setup:    ()=>{ resetNormal(); /* mutações de S.edges */ },
          objective:()=> /* bool: condição de conclusão */ },
  }
};
```

**Convenções importantes:**

- **Transformador:** `a` é desenhado **acima** (anel cor de `a.kV`), `b` **abaixo** (anel cor de `b.kV`). Mantenha o HV como `a`.
- **`series`** numa seccionadora: id do disjuntor que precisa estar **aberto** para a SC manobrar (regra "não manobra sob carga").
- **`sync:true`** num disjuntor: fechar em barra energizada exige `syncedG[id]===true` (botão "Sincronizar" no painel). Em barra morta (blackstart) fecha livre.
- **Coordenadas:** `viewBox` é `1120×760`. Barras horizontais (`x..x2`), bays verticais. O renderizador conecta cada ramo ancorando na barra no `x` do dispositivo.

---

## 6. Motor — como funciona

### 6.1 Energização (`computeEnergization`)
BFS a partir dos nós-fonte através de ramos que **conduzem** (`conducts`): disjuntor/seccionadora fechados, transformador sempre, lâmina de terra nunca. Retorna `{nodes:Set, edges:Set}`. Recalculado a cada manobra → recoloração.

### 6.2 Solver elétrico (`electricalSolve`) — base 100 MVA
Modelo **híbrido** (lógico + valores aproximados):

- **Curto-circuito 3φ:** união de nós por chaves fechadas em **supernós** (union-find, impedância zero). Monta **Ybus** entre supernós energizados (fontes como shunt `1/Zs`, trafos como série `1/Zt`), inverte para **Zbus** e calcula `Icc = V/|Zth|·Ibase`. Funciona para topologia radial **e** malhada (interligações fechadas).
- **Fluxo de carga radial:** varredura da árvore (BFS) das fontes; corrente de cada ramo = somatório fasorial das cargas a jusante / (√3·V). Tensão por queda série acumulada (`ΔV ≈ (P·R + Q·X)/V`).
- Retorna `busScc`, `busV`, `branchI` (A, S, P, Q), `zthAt(node)` e `parentEdge`.

**Impedâncias (pu na base):**
- Rede: `Zs = (Sbase/Scc) ∠ atan(XR)`.
- Trafo: `Zt = (Zpct/100)·(Sbase/mva) ∠ atan(XR)`.
- Gerador: `Zg = Xdpp·(Sbase/MVA) ∠ atan(XR)`.
- Linha de alimentador: `Z = (r+jx)·km / Zbase`, `Zbase = kV²/Sbase`.

### 6.3 Intertravamento (`canOperate`)
Retorna `{ok, reason}`. Regras:
1. Seccionadora só manobra com o disjuntor `series` aberto.
2. Lâmina de terra só fecha em trecho desenergizado.
3. Disjuntor não fecha se energizaria um nó com terra aplicada.
4. Disjuntor de máquina (`sync`) não fecha em barra viva sem sincronismo verificado.

### 6.4 Proteção (`resolveFault`)
- Calcula `If` no ponto (barra: `Zth`; alimentador: `Zth + Zlinha`; trafo: lado LV).
- Monta operações candidatas: **zona** (87T/87B por pertencimento) + **50/51** nos disjuntores do **caminho radial** (corrente referida ao nível de cada equipamento).
- Ordena por tempo (curva IEC/IEEE), dispara a mais rápida; se o disjuntor **recusa** (`failed`), aplica **50BF** (retaguarda em `t + 200 ms`).
- Marca disjuntores como `tripped`; registra a sequência cronometrada no SOE.
- **Religamento sobre falta:** fechar disjuntor sobre o defeito reativa a proteção (e zera o cenário, se ativo).

### 6.5 Avaliador (cenários)
`Score = max(0, 100·[objetivo] − 15·violações + bônus_eficiência)`, bônus ≤ 10 (manobras ≤ ótimo). **Falha grave** (religamento sobre falta) → 0. Persistido por SE em `localStorage["sim_scores_"+activeSub]`.

---

## 7. Subestações criadas

### SE-A — 138/13,8 kV (rebaixadora, barra seccionada)
- Dupla entrada 138 kV (LT1/LT2), barra 138 seccionada com interligação.
- 2 trafos 25 MVA (10,5%, X/R 20) → 2 barras 13,8 kV seccionadas.
- 4 alimentadores, 1 gerador (15 MVA, Xd″ 0,18).
- **Validado:** Icc 138 = **6,28 kA** (1500 MVA); Icc 13,8 = **8,6 kA**; trafo 333 A (LV)/33 A (HV); AL-01 185 A.

### SE-B — 230/69/13,8 kV (três níveis + linhas paralelas)
- **2 LTs 230 kV em paralelo** → barra 230 kV.
- Autotransformador 230/69 (100 MVA, 12%) → barra 69 kV.
- Barra 69 kV: 1 linha de 69 kV (saída) + trafo 69/13,8 (25 MVA) → barra 13,8 kV com 2 alimentadores.
- Rede 230 kV: 8000 MVA, X/R 12.

### SE-C — Usina (4 máquinas)
- **4 geradores** 20 MVA (Xd″ 0,20) → barra de geração 13,8 kV.
- Trafo elevador 13,8/138 (80 MVA, 12%) → barra 138 kV → LT ao sistema (5000 MVA).
- Serviço auxiliar (carga 13,8 kV).
- Demonstra paralelismo de máquinas e blackstart.

---

## 8. Cenários implementados

| SE | ID | Título | Objetivo (resumo) |
|----|----|--------|-------------------|
| A | A1 | Energização de bay | Energizar barra 13,8 A na sequência SC→DJ |
| A | A2 | Isolar e aterrar trafo | DJ-T1 e DJ-BT1 abertos + GND-T1 fechada |
| A | A3 | Transferência de barra | Restabelecer AL-01/02 via interligações |
| A | A4 | Entrada do gerador | Fechar DJ-G com sincronismo verificado |
| A | B7 | Perda de trafo + transferência | Socorrer AL-01/02 pela Seção B, trafo isolado |
| B | PB1 | Saída de uma LT 230 kV | Isolar LT2 (DJ→SC) mantendo a SE viva pela LT1 |
| B | PB2 | Isolar/aterrar autotrafo | DJ-ATH e DJ-ATL abertos + GND-AT fechada |
| C | PC1 | Paralelizar as máquinas | Fechar DJ-G1..4 com sincronismo |
| C | PC2 | Partida em ilha (blackstart) | Energizar barra de geração a partir de G1 |

Todos validados ponta a ponta (100–110/110 quando executados de forma ótima).

---

## 9. Paleta e convenções visuais

| Elemento | Cor |
|----------|-----|
| 230 kV | `#FF7AB6` (rosa) |
| 138 kV | `#FDB805` (âmbar) |
| 69 kV | `#FF9F45` (laranja) |
| 34,5 kV | `#5BD1E0` (ciano) |
| 13,8 kV | `#07B494` (teal) |
| 6,9 kV | `#8FD14F` (verde) |
| Aterrado | `#3DDC97` (menta) |
| Desenergizado | `#717ea8` (ardósia) |
| Trip (disjuntor) | `#ff6b6b` (vermelho) |
| Fundo / painéis | `#0f1830` / `#192443` |

Convenção: **energizado** = cor do nível; **aterrado** = menta; **morto** = ardósia. Disjuntor fechado = caixa preenchida; aberto = caixa vazada; tripado = contorno vermelho com "⚡".

---

## 10. Validação (scripts de dev)

Mantenha estes scripts no repositório para reexecutar no Claude Code.

**Sintaxe:**
```bash
node -e 'const fs=require("fs");let js=fs.readFileSync("simulador-manobras.html","utf8").match(/<script>([\s\S]*?)<\/script>/)[1];
const stub=`const localStorage={getItem:()=>null,setItem(){}};const document={getElementById:()=>({innerHTML:"",value:"A",classList:{add(){},toggle(){}},appendChild(){},addEventListener(){},set onclick(v){},set onchange(v){},set textContent(v){},setAttribute(){},querySelectorAll:()=>[],querySelector:()=>null}),createElementNS:()=>({setAttribute(){},appendChild(){},addEventListener(){},set textContent(v){},set innerHTML(v){}})};`;
try{new Function(stub+js);console.log("sintaxe OK");}catch(e){console.log("ERRO:",e.message);}'
```

**Render (PNG) de uma SE — jsdom + resvg:**
```js
// shot.js  →  node shot.js
const fs=require("fs"); const {JSDOM}=require("jsdom"); const {Resvg}=require("@resvg/resvg-js");
const dom=new JSDOM(fs.readFileSync("simulador-manobras.html","utf8"),{runScripts:"dangerously",pretendToBeVisual:true});
setTimeout(()=>{
  const w=dom.window, d=w.document;
  const sel=d.getElementById("subSel"); sel.value="B"; sel.dispatchEvent(new w.Event("change")); // troca de SE
  const svg=d.getElementById("sld");
  const s=`<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="760" viewBox="0 0 1120 760">${svg.innerHTML}</svg>`;
  fs.writeFileSync("out.png", new Resvg(s,{background:"#0f1830"}).render().asPng());
},350);
```

**Teste funcional (clique simulado):** selecionar `[data-id="..."]`, disparar `click`, acionar botões `cmdClose`/`cmdOpen`/`cmdFault`/`syncTog`, e ler o SOE em `#soe .entry .m`. (Ver exemplos no histórico do projeto.)

> Importante: jsdom não faz layout; só serializa o SVG. O render real de pixels vem do resvg. Filtros SVG com `objectBoundingBox` falham em linhas (bbox de área nula) — por isso o brilho é feito por **camadas** (linha larga translúcida + linha nítida), não por `filter`.

---

## 11. Limitações e simplificações atuais (v2)

- **Faltas 3φ / 2φ (L-L) / 1φ (L-G) / 2φ-T** via redes de sequência. **Z2 explícito**: rede/trafo/linha
  passivos (Z2 = Z1); **máquinas usam `Xd2`** (≈(Xd″+Xq″)/2, def. Xdpp) e `XR2` opcional — faltas
  desequilibradas perto de geradores ficam ~3-5% menores que com Z2 = Z1.
  **Z0** montado por grupo vetorial dos trafos e aterramento das fontes. Proteção de neutro **50N/51N**
  atua no lado aterrado (delta bloqueia 3I0). Curva real da seq-zero das linhas: `Z0 ≈ x0x1·Z1` (def. 3).
  **Impedância de falta `Zf`** (Ω, resistiva/arco) disponível no painel: 0 = falta sólida; `Zf>0` reduz a
  corrente e atrasa o 51. Modelada como `3·Zf` no ramo de terra para faltas à terra (não distingue
  resistência de arco por fase vs. resistência de aterramento).
- **Fluxo de carga radial aproximado** (somatório a jusante). Em malha (interligações fechadas) o fluxo nas ties é aproximado.
- **Tensões aproximadas** (queda série, sem iteração).
- **87T/87B por zona** (pertencimento topológico), não por cálculo real de corrente diferencial/slope.
- **Sincronismo** é um booleano (sem dinâmica de V/f/ângulo).
- **Religamento automático (79)** nos alimentadores/linhas: tempo morto por tiro, sucesso em falta transitória, bloqueio (86) em falta permanente. Sem reclaim time (rearme automático) — o rearme após 86 é manual. Religamento manual sobre falta também reatua a proteção.
- **Arranjos de barra simples** — sem disjuntor-e-meio nem barra em anel ainda.

---

## 12. Próximos caminhos (roadmap)

**Curto prazo**
- ✅ Faltas **1φ/2φ/2φ-T**: redes de sequência (`Z0`, grupo vetorial dos trafos), proteção de **neutro 50N/51N** (2026-06-23).
- ✅ **79 (religamento)** automático: ciclo de tentativas com tempo morto por tiro, sucesso em falta transitória, **bloqueio (86/lockout)** sobre falta permanente, rearme por fechamento manual (2026-06-23).
- ✅ **`Z2` explícito** (≠ Z1 nas máquinas): geradores usam `Xd2` (def. Xdpp) e `XR2` opcional; rede/trafo/linha permanecem Z2 = Z1 (2026-06-24).
- ✅ **Seletor de impedância de falta `Zf`** (falta resistiva / arco) (2026-06-25):
  - UI: campo `Zf` (Ω, def. 0 = falta sólida) no painel de seleção, abaixo do tipo de falta (`faultPickHTML`/`bindFault`, estado `faultZf`).
  - Motor: `seqCurr(Z1,Z2,Z0,ftype,zf)` soma a impedância de falta — 3φ `Z1+Zf`; 2φ `Z1+Z2+Zf`; 1φ `Z1+Z2+Z0+3·Zf`; 2φ-T `Z0+3·Zf` no ramo de terra. `resolveFault` converte `zfPu = Zf/(kVf²/Sbase)` e encadeia por `doFaultSequence`/`runReclose`/`applyFault` (persistido em `activeFault.zf` p/ religamento).
  - SOE: registra `Zf` aplicado; corrente reduzida e tempo de 51 maior visíveis.
  - Validado (jsdom): `Zf=0` reproduz exatamente os valores atuais; `Zf>0` reduz `If` (3φ/2φ) e `3I0` (1φ/2φ-T) monotonicamente, com 51 mais lento.
- ⏭️ **PRÓXIMO RECOMENDADO — refinos da seq-zero**: tap-ground real dos autotrafos (YNynd com terciário).
- 79 — possíveis evoluções: tempo de religamento (reclaim) com rearme automático, 1º tiro rápido (instantâneo) + tiros lentos, bloqueio de 79 por 50BF/87.
- Exportar **relatório de desempenho** do aluno (CSV/PDF) e SOE.

**Médio prazo**
- Novas **topologias/arranjos**: barra em anel, disjuntor-e-meio, banco de capacitores, reator, motores ≥15 kW.
- Proteções **67 (direcional)**, **21 (distância)** em linhas, **27/59**, **81**.
- **Modo instrutor**: montar cenários, acompanhar turma.
- **Editor de rede** visual para gerar o JSON da SE sem editar código.

**Estrutural (se o projeto crescer)**
- Migrar para **Vite + TypeScript** modular: separar `engine/` (energização, solver, proteção), `render/`, `data/` (cada SE em um `.json`), `ui/`.
- Tipar o schema da SE (interface TS) e validar no carregamento.

---

## 13. Como estender

**Adicionar uma subestação:** copie um bloco `SUBSTATIONS.X = {...}` (ver §5), defina `nodes` com coordenadas, `edges`, `sources`, `feeders`, `prot`, `zones` e `scenarios`. Ela aparece sozinha no seletor (`populateScenSel`/`initSub` iteram o registro).

**Adicionar proteção:** inclua o disjuntor em `prot` com `p51`/`p50`; para diferencial, adicione em `zones` (`87T` com `trips`, ou `87B` com `bus`).

**Adicionar cenário:** entrada em `scenarios` com `setup` (parte de `resetNormal()` e mutações de `S.edges`), `objective` (função booleana usando `energ()`/`S.edges`), `optimal` e `hint`.

**Checklist ao criar SE nova:** validar sintaxe → renderizar PNG (conferir colisões/sobreposição de rótulos; trafo `a` acima) → testar uma falta de barra e um cenário.

---

## 14. Publicação (hospedagem estática)

O produto é **um único `.html`** — sem build. `localStorage` funciona em qualquer origem real (a pontuação persiste por navegador).

**GitHub Pages**
```bash
# renomeie para index.html no repositório
mv simulador-manobras.html index.html
git init && git add index.html && git commit -m "simulador subestações"
git branch -M main && git remote add origin <repo> && git push -u origin main
# Settings → Pages → Branch: main / root → publica em https://<user>.github.io/<repo>/
```

**Netlify / Cloudflare Pages:** arraste o arquivo (ou conecte o repo). Sem comando de build; diretório de publicação = raiz.

**Acesso offline:** o arquivo abre direto no navegador (`file://`) — útil para os alunos. (Alguns navegadores restringem `localStorage` em `file://`; hospedar resolve.)

---

## 15. Fluxo de trabalho no Claude Code

1. Trabalhe direto no `simulador-manobras.html` (autocontido).
2. Após cada mudança: **rode a checagem de sintaxe** (§10) e **renderize** as SEs afetadas.
3. Para mudanças no motor/proteção: rode um **teste funcional** (clique simulado) cobrindo energização, uma falta e um cenário.
4. Versione com git; mantenha `shot.js` / testes na raiz.
5. Se for refatorar para módulos, comece extraindo `SUBSTATIONS` para arquivos `data/*.json` e o motor para `engine/*.js`, mantendo o renderizador como consumidor de `S`.

---

## 16. Estado de validação (última verificação)

- ✅ Sintaxe OK.
- ✅ Render das 3 SEs (A/B/C) sem erros.
- ✅ Curto-circuito e fluxo conferidos com cálculo manual (SE-A).
- ✅ Coordenação: feeder 51 ~288 ms, 87B ~50 ms, 87T ~40 ms, 50BF +200 ms.
- ✅ Cenários A1–B7 (SE-A), PB1/PB2 (SE-B), PC1/PC2 (SE-C) concluídos com pontuação correta.
- ✅ Bloqueios de intertravamento e sincronismo atuando.

---

*Fim do handoff. O sistema está pronto para evolução incremental — a arquitetura dirigida por dados permite crescer em subestações, proteções e cenários sem reescrever o núcleo.*
