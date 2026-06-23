# Handoff — Simulador de Manobras & Falhas em Subestações

Documento de transferência para continuidade do desenvolvimento no **Claude Code**.
Cobre arquitetura, estado atual, modelo de dados, validação, publicação e próximos passos.

> **Entregável atual:** `simulador-manobras.html` — arquivo único, ~885 linhas, ~63 KB, 100% client-side.

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
    TR: { type:"transformer", a, b, kV, kVsec, mva, Zpct, XR,
          label, ratio:"138/13,8", x, y },
    // lâmina de terra (um terminal → nó aterrado)
    GND:{ type:"ground", node:"NoX", state:"open", kV, label, x, y, side:1|-1 },
  },

  sources: {
    // rede (grid): símbolo de seta; impedância por Scc/XR
    LT: { node:"NoLT", kV, Scc_MVA, XR, type:"grid", label, x, y },
    // gerador: símbolo de círculo; impedância por Xd"/MVA
    G:  { node:"NoG", kV, MVA, Xdpp, XR, type:"gen", label, x, y },
  },

  feeders: {
    // carga + linha (Ω/km). Desenhada como triângulo no nó.
    AL: { node:"NoAL", P, Q, r, x, km, kV, label, x, y },
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

## 11. Limitações e simplificações atuais (v1)

- **Somente falta trifásica** (sequência positiva). Sem `Z0`/`Z2`, sem 1φ/2φ, sem proteção de neutro (50N/51N).
- **Fluxo de carga radial aproximado** (somatório a jusante). Em malha (interligações fechadas) o fluxo nas ties é aproximado.
- **Tensões aproximadas** (queda série, sem iteração).
- **87T/87B por zona** (pertencimento topológico), não por cálculo real de corrente diferencial/slope.
- **Sincronismo** é um booleano (sem dinâmica de V/f/ângulo).
- **Sem religamento automático (79)** — apenas religamento manual sobre falta.
- **Arranjos de barra simples** — sem disjuntor-e-meio nem barra em anel ainda.

---

## 12. Próximos caminhos (roadmap)

**Curto prazo**
- Faltas **1φ/2φ**: redes de sequência (`Z0`, grupo vetorial dos trafos), proteção de **neutro 50N/51N**.
- **79 (religamento)** automático com ciclos e bloqueio sobre falta permanente.
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
