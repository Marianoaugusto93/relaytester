# PR 4 — Relay Tester · Test Planner (aba TESTES)

Implementação de uma **nova aba `Testes`** na plataforma, à direita de `Painel` no `nav-pills`. Mantém a paleta atual (`#0E1015` / `#F97316` / `#0EA5E9`), tipografia Rajdhani + JetBrains Mono, cantos arredondados e divisórias finas. Reutiliza o `useSimulation`, `protection.js`, `comtrade.js` e o pipeline de injeção existentes — **não duplica lógica de proteção**, apenas orquestra ensaios em cima dela.

Referência visual: **`Mock - Testes (Test Planner).html`**.

---

## Objetivo

Permitir ao usuário **planejar, executar e documentar campanhas de ensaio** sobre as funções de proteção do relé simulado, gerando automaticamente:

- Lista de pontos de teste (com cálculo de tempo esperado pelo modelo de curva).
- Gráficos planejados (t × I, t × M, Z-plane, f × t conforme função).
- Execução automatizada ponto a ponto com captura de tempo medido e estado de BOs.
- Relatório com aprovação/reprovação, desvios, curva ajustada e exportação PDF/CSV/JSON.

---

## Estrutura de arquivos

```
src/
  TestsPage.jsx                  ← container da aba, gerencia 3 modos (plan/run/report)
  tests/
    TestPlanner.jsx              ← modo PLANO (canvas + tabela + form)
    TestRunner.jsx               ← modo EXECUÇÃO (live view + tabela parcial)
    TestReport.jsx               ← modo RELATÓRIO (KPIs + curva ajustada + tabela final)
    PointGenerator.js            ← gera pontos por função (lógica pura)
    CurveModel.js                ← cálculos teóricos (IEC VI/EI/NI/LTI, ANSI, definida)
    TestRunnerEngine.js          ← orquestra injeções sequenciais via useSimulation
    PassFailEvaluator.js         ← compara medido × esperado com tolerâncias
    ReportExporter.js            ← PDF (canvas → png → jsPDF), CSV, JSON
    TestChart.jsx                ← SVG reutilizável (t×I, t×M, Z, f×t)
    testDefaults.js              ← tolerâncias padrão IEC/ANSI por função
```

**Adicionar em `App.jsx`:**
```js
import TestsPage from "./TestsPage.jsx";
// …
<button className={`np ${page===4?"on":""}`} onClick={()=>setPage(4)}>Testes</button>
// …
{page===4 && <TestsPage prot={prot} relayProt={relayProt} sys={sys} rtc={rtc} rtp={rtp}
                        runSim={runSim} stopSim={stopSim} setP={setP} setPf={setPf}
                        setEvts={setEvts} setTripHistory={setTripHistory}/>}
```

---

## Modelo de dados

```ts
// Campanha = pasta de ensaios
type Campaign = {
  id: string;
  name: string;            // "Comissionamento Bay-01"
  relay: string;           // "REGRID PRO 1000"
  bay: string;             // "BAY-01"
  createdAt: number;
  tests: Test[];
};

// Test = um ensaio sobre uma função
type Test = {
  id: string;
  function: '51'|'50'|'51N'|'50N'|'67'|'67N'|'27'|'59'|'47'|'46'|'81U'|'81O'|'32R'|'32F'|'79'|'21';
  stageId: string;         // '51-1', '51-2', etc.
  type: 'curve'|'pickup'|'dropout'|'definite'|'multipoint'|'search';
  plan: PlanConfig;        // parametriza a geração
  points: TestPoint[];     // pontos efetivamente gerados
  results?: TestResult[];  // 1:1 com points após execução
  status: 'draft'|'ready'|'running'|'done'|'fail';
};

type PlanConfig = {
  minMult: number;         // 1.5 ×Ipk
  maxMult: number;         // 15 ×Ipk
  nPoints: number;         // 7
  spacing: 'log'|'linear';
  includePickup: boolean;  // gera 2 probes de rampa ↑↓
  pickupRange: [number,number]; // [0.95, 1.10]
  prefaultMult: number;    // 1.0 ×Ipk
  prefaultDur: number;     // 0.2 s
  tolPctTime: number;      // ±5%
  tolPctI:    number;      // ±3%
  tolAbsTime: number;      // ±25 ms
  customPoints?: TestPoint[]; // adicionados manualmente
};

type TestPoint = {
  id: string;              // 'P1','Pk1'
  kind: 'curve'|'pickup-up'|'pickup-down'|'definite';
  IxIpk?: number;          // 5.0
  Iamps?: number;          // 25.0 (secundário)
  tExpected?: number;      // 0.291 s — calculado por CurveModel
  rampFrom?: number; rampTo?: number; rampStep?: number; rampDwell?: number;
  prefaultI?: number; prefaultDur?: number;
  expectedBO?: string;     // 'BO1' — saída que deve operar
};

type TestResult = {
  pointId: string;
  tMeasured?: number;
  IpickupMeasured?: number;
  boEventTime?: number;
  resetTime?: number;
  deltaPct?: number;       // desvio em % do esperado
  pass: boolean;
  failReason?: string;
};
```

Persistir em `localStorage` sob `relayTester.campaigns` (array). Auto-save a cada mudança debounce 500 ms.

---

## Geração de pontos (PointGenerator.js)

**API:**
```js
generatePoints(fn, stage, plan) → TestPoint[]
```

### Função 51 / 51N (curva inversa)

- Para `spacing='log'`, distribuir `nPoints` entre `minMult` e `maxMult` em escala logarítmica:
  ```js
  const factors = logspace(minMult, maxMult, nPoints);
  ```
- Para cada fator `m`: `Iamps = m * stage.pickup`, `tExpected = CurveModel.iec(curve, m, TD)`.
- Se `includePickup`: adicionar 2 probes:
  ```js
  {kind:'pickup-up',   rampFrom: pickupRange[0]*Ipk, rampTo: pickupRange[1]*Ipk, rampStep: 0.01*Ipk, rampDwell: 0.1}
  {kind:'pickup-down', rampFrom: pickupRange[1]*Ipk, rampTo: pickupRange[0]*Ipk, rampStep: 0.01*Ipk, rampDwell: 0.1}
  ```

### Função 50 / 50N (instantânea)

- Tipo `definite`. 3 pontos default: 1.5× / 2× / 5× do pickup. `tExpected = stage.timeOp`.

### Função 67 / 67N (direcional)

- Mesma curva da 51, **mais** varredura angular: 5 pontos a 5×Ipk variando ângulo de −180° a +180° em torno do MTA. `expected = trip se |Δang−MTA| < 90°`.

### Função 27 / 59 (tensão)

- Tipo `definite`. Pontos: 0.5× / 0.7× / 0.9× / 1.1× pickup. `tExpected = stage.timeOp`.

### Função 81U / 81O (frequência)

- Pontos em Hz: pickup ± {0.2, 0.5, 1.0} Hz. Eixo do gráfico = `f × t`.

### Função 32 (potência reversa)

- 4 pontos cobrindo ±10%, ±50%, ±100%, ±200% do pickup em W.

### Função 79 (religamento)

- Não gera curva. Gera "cenário de sequência": falta permanente → trip → dead time → reclose → falta → ... até atingir lockout. Mede dead time e reclaim time.

### Função 46 (seq. negativa)

- Mesma lógica de 51, mas I = `I2`. Gera I_abc desbalanceadas que resultam no `I2` desejado.

---

## CurveModel.js — fórmulas

```js
const K_TABLE = {
  'IEC-Standard':       { k: 0.14,  a: 0.02 },
  'IEC-Very-Inverse':   { k: 13.5,  a: 1.0  },
  'IEC-Extremely-Inv':  { k: 80.0,  a: 2.0  },
  'IEC-Long-Time-Inv':  { k: 120,   a: 1.0  },
  'ANSI-Moderate':      { k: 0.0515, a: 0.02, c: 0.114 },
  'ANSI-Very-Inverse':  { k: 19.61, a: 2.0,  c: 0.491  },
  'ANSI-Extremely-Inv': { k: 28.2,  a: 2.0,  c: 0.1217 },
};

function iec(curve, M, TD) {
  const { k, a } = K_TABLE[curve];
  if (M <= 1) return Infinity;
  return TD * k / (Math.pow(M, a) - 1);
}
function ansi(curve, M, TD) {
  const { k, a, c } = K_TABLE[curve];
  if (M <= 1) return Infinity;
  return TD * (k / (Math.pow(M, a) - 1) + c);
}
```

Função pura, sem side-effects. Usada tanto pelo gerador quanto pelo desenho da curva no chart.

---

## TestRunnerEngine.js — orquestração

```js
async function runCampaign(test, ctx) {
  for (const pt of test.points) {
    if (ctx.cancelled) break;
    if (ctx.paused) await waitResume();
    await waitInterPoint(ctx.interPointDelay);  // 3 s default

    ctx.onStart(pt);
    const result = await runPoint(pt, ctx);
    ctx.onResult(pt, result);
  }
  ctx.onComplete();
}

async function runPoint(pt, ctx) {
  // 1. Aplicar pre-falta
  ctx.setPhasors(buildPrefaultPhasors(pt, ctx.sys));
  ctx.setPfEnabled(true);
  ctx.setPfDuration(pt.prefaultDur);

  // 2. Aplicar falta
  ctx.setPhasors(buildFaultPhasors(pt, ctx.sys, ctx.fn));

  // 3. Disparar injeção
  const t0 = performance.now();
  return new Promise(resolve => {
    const listener = (event) => {
      if (event.type === 'trip' && event.bo === pt.expectedBO) {
        const tMeasured = (performance.now() - t0)/1000 - pt.prefaultDur;
        const delta = (tMeasured - pt.tExpected) / pt.tExpected;
        const pass = PassFailEvaluator.evaluate(pt, tMeasured, ctx.tolerances);
        ctx.stopSim();
        resolve({ pointId: pt.id, tMeasured, deltaPct: delta*100, pass });
      }
      if (event.type === 'timeout') {
        ctx.stopSim();
        resolve({ pointId: pt.id, pass: false, failReason: 'no-trip' });
      }
    };
    ctx.subscribe(listener);
    ctx.runSim();
  });
}
```

- **Pickup probe (rampa):** loop interno com `setPhasors` em steps de `rampStep` a cada `rampDwell` segundos, escuta primeiro flanco de BO. Retorna `IpickupMeasured`.
- **Auto-pausa entre pontos:** 3 s (configurável). Permite resfriar e ver curva atualizar.
- **Cancel/pause/repeat:** via flags `ctx.cancelled` e `ctx.paused`; UI dispara `engine.cancel()`, `engine.pause()`, `engine.repeatPoint(id)`.

---

## PassFailEvaluator.js

```js
function evaluate(point, measured, tol) {
  if (point.kind === 'curve' || point.kind === 'definite') {
    const dt = Math.abs(measured.tMeasured - point.tExpected);
    const dtPct = dt / point.tExpected;
    return dtPct <= tol.tolPctTime && dt <= (tol.tolAbsTime ?? Infinity);
  }
  if (point.kind.startsWith('pickup-')) {
    const ePct = Math.abs(measured.IpickupMeasured - point.Ipk) / point.Ipk;
    return ePct <= tol.tolPctI;
  }
}
```

Tolerâncias **default por função**, alinhadas com IEC 60255-151 e ANSI C37.112:

```js
testDefaults.js:
{
  '51':  { tolPctTime: 0.05, tolPctI: 0.03, tolAbsTime: 0.025 },
  '50':  { tolPctTime: 0.10, tolPctI: 0.03, tolAbsTime: 0.020 },
  '67':  { tolPctTime: 0.05, tolPctI: 0.03, tolAngleDeg: 3 },
  '27':  { tolPctTime: 0.05, tolPctV: 0.02 },
  '81U': { tolPctTime: 0.05, tolHz: 0.02 },
  // …
}
```

---

## UI — TestsPage.jsx

Layout: header com **segmented control de 3 modos (Plano / Execução / Relatório)** + status bar inferior fixa de 7 colunas.

### Modo PLANO

**3 colunas (mesmo padrão das outras abas):**

**Esquerda 280 px**
- Card "Campanha" — nome + relé + bay + botões `📂 Abrir` / `+ Novo`.
- Card "Função a testar" — lista vertical de funções com ANSI + nome em PT + ✓ se já tem plano salvo.
- Card "Tipo de ensaio" — 2 segmented controls: linha 1 (Curva / Pickup / Dropout), linha 2 (Tempo Def / Multi-ponto / Busca).

**Centro elástico**
- Card `Curva 51 · Very Inverse · Plano de teste` com tabs `t × I / t × M / Z-plane / f × t`.
- SVG log-log (760×420 viewBox, eixos em pixels: x=50→740, y=20→380). Linhas guias verticais em decades de I/Ipk (1, 2, 5, 10, 20). Horizontais em decades de t (0.05, 0.1, 0.5, 1, 10).
- Plotar curva teórica (cyan 2.2 px), faixa de tolerância ±5% (gradient `#0EA5E9` `.22→.04`), linha vertical do pickup (amarelo tracejado), linha vertical do 50 inst (vermelho tracejado).
- Pontos planejados como círculos laranja 5 px com label `P1`, `P2`... acima.
- Pickup probes como quadrados amarelos no eixo de Ipk.
- Legenda inferior com 5 chips.

- Card "Pontos de teste · gerados automaticamente" com tabela (#, Tipo, I/Ipk, I (A), t esperado, Tolerância, Pré-falta, Status). Header com botões `+ Ponto manual` e `Regenerar`.

**Direita 320 px**
- Card "Parâmetros · 51 · Estágio 1" — espelha o stage selecionado (read-only com link para abrir em Relé).
- Card "Gerador de pontos" — campos: Min ×Ipk, Max ×Ipk, N° pontos, Espaçamento (Log/Linear), Pickup probe, Tolerância. Botão `Regenerar Pontos` primário.
- Card "Progresso" (mostra 0/N quando ainda não rodou).
- Card "Ações" — `▶ Iniciar Campanha` (success grande), Pausar/Parar/Repetir, Exportar PDF/CSV, Salvar campanha.

### Modo EXECUÇÃO

Centro vira `<TestRunner>`:
- Card hero com estado animado: `● INJETANDO FALTA · P4 · I = 25.00 A · t esperado 0.291 s`.
- Tile gigante do tempo decorrido (`0.156 s`, 64 px).
- Barra de progresso 0 → tExpected.
- Mini-tiles: `Iₐ`, `Vₐ`, `Estado BO1`.

Tabela abaixo: **resultados parciais** com pontos já feitos (verde), em curso (amarelo animado), pendentes (cinza). Colunas: #, I, t esperado, t medido, Δ%, Status.

Direita: Card "Progresso" com `3/9 · 44%`, tempo restante estimado, contador Passa/Falha. Card "Ações" com ⏸ Pausar / ■ Parar / ↺ Repetir ponto P4.

### Modo RELATÓRIO

**KPI hero 4 colunas** acima do chart:
- Aprovação (`9/9` verde)
- Desvio médio (Δt%)
- Pickup medido vs esperado
- Duração total e timestamp

Chart igual ao do plano, mas:
- Curva teórica vira tracejada cyan.
- Pontos medidos sólidos verdes com `Δ%` ao lado.
- **Curva ajustada** (best-fit) sobreposta em verde sólido.

Tabela final com 8 colunas: #, I, t esperado, t medido, Δ, Pickup BO1, Reset, Status. Todas as linhas com badge Pass/Fail.

Direita: Card "Sumário" (campanha, função, data, operador). Card "Exportar" com botões grandes:
- `📤 PDF · Relatório completo` (jsPDF, A4, 2-3 páginas, headers/footers com bay e timestamp)
- `📊 CSV · Pontos e medidas`
- `📁 JSON · Campanha completa`
- `🔗 Compartilhar link` (gera URL com `?campaign=<id>` que abre direto na aba Relatório se o JSON estiver no localStorage).

---

## Status bar inferior (7 colunas, fixa)

| Função | Ensaio | Pontos | Concluídos | Em curso | Tempo | Bay |
|---|---|---|---|---|---|---|
| 51 · Estágio 1 (laranja) | Curva + Pickup | 7 + 2 (mono) | 3 (verde) | P4 (âmbar) | 14.3 s est. | BAY-01 (ciano) |

---

## Integração com simulação existente

- **Setar fasores:** usar a mesma assinatura de `setP` (estado) que `Relé` usa. Para construir falta em fase A: `Ia.mag = Iamps · m`, demais fases em `nominal · prefaultMult`.
- **Pré-falta:** ativar via `setPfEnabled(true)` + `setPfDuration(pt.prefaultDur)` + `setPf(...)`.
- **Disparar:** `runSim()`. **Parar:** `stopSim()`.
- **Capturar tempo:** consumir o callback `setEvts` ou um novo `onTrip` do `useSimulation` — adicionar handler que recebe `{stageId, boId, t, faultRecord}`.
- **NÃO criar segunda lógica de proteção.** O Test Runner é só um orquestrador.

Se `useSimulation.js` não emite eventos discretos hoje, adicionar:
```js
// useSimulation.js
const onTripRef = useRef(null);
function setOnTrip(fn) { onTripRef.current = fn; }
// ao detectar trip:
onTripRef.current?.({ stageId, boId, t, faultRecord });
return { runSim, stopSim, stop79, ar79Ref, tr, setOnTrip };
```

---

## Geração do PDF (ReportExporter.js)

- jsPDF (já está no projeto? se não, `npm i jspdf`).
- Página A4 retrato (210 × 297 mm).
- Cabeçalho com logo "RL", nome da campanha, bay, data.
- Página 1: KPIs + gráfico (renderizar `<TestChart>` em canvas off-screen e inserir como PNG, 180 × 100 mm).
- Página 2: tabela completa de pontos (uma linha por ponto).
- Rodapé: "Relay Tester · página X/Y".
- Filename: `relatorio_<campaign>_<function>_<yyyyMMdd-HHmm>.pdf`.

---

## Critérios de aceite

1. Aba **Testes** aparece no `nav-pills`, à direita de Painel.
2. Para a função `51` com `Pickup = 5 A, TD = 0.1, IEC VI`, o plano default gera **7 pontos log-spaced de 1.5× a 15×** + 2 pickup probes.
3. Os `tExpected` calculados batem com a fórmula IEC VI (`13.5 · TD / (M − 1)`) com erro < 0.5%.
4. Ao clicar `▶ Iniciar Campanha`, a aba alterna automaticamente para modo Execução e ponto a ponto roda usando o `useSimulation` existente.
5. Cada ponto avalia Pass/Fail conforme tolerância e atualiza a tabela em tempo real.
6. Ao concluir, modo Relatório abre automaticamente com KPIs, curva ajustada e botões de exportação.
7. PDF exportado abre no Acrobat e mostra o gráfico legível + tabela completa.
8. Campanha é persistida em localStorage e recuperada ao recarregar a página.
9. Nenhum botão ou ícone fora da paleta (`--orange / --cyan / --green / --red / --amber / --violet / tx*`).
10. Layout cabe sem scroll vertical em 1920 × 1080.

---

## Fora de escopo desta PR (backlog)

- Templates de campanha (criar a partir de modelos prontos: "comissionamento padrão", "ensaios periódicos NR-10").
- Comparação de campanhas (run A vs run B do mesmo bay).
- Geração de COMTRADE por ponto.
- Multi-relé / multi-bay numa campanha só.
- Assinatura digital do relatório.

---

## Referência

- Mock: **`Mock - Testes (Test Planner).html`** (3 modos navegáveis pelo segmented control no canto superior direito).
- Cores: ver `:root` em qualquer arquivo HTML da plataforma.
- Tolerâncias: IEC 60255-151 (overcurrent), IEC 60255-127 (voltage), ANSI C37.112 (TCC curves).
