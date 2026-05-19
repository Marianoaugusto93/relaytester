# Handoff — RelayLab · Painel FIELD v4

## 1. Visão Geral

Este pacote contém o design da reformulação do painel **FIELD** do RelayLab — a tela
principal de simulação de comissionamento de relés de proteção. O usuário conecta
visualmente os três equipamentos físicos envolvidos num teste de relé:

- **Régua de bornes** (terminal block do painel da subestação)
- **Chave de aferição** (chave faca FT-1 / FT-14 para isolar TC/TP)
- **Maleta de teste** (test set portátil, ex.: Omicron CMC, ISA DRTS)

E observa as ligações elétricas que isso forma, com feedback visual quando
a chave de aferição é manobrada.

> **Status do design:** alta fidelidade (hi-fi). Cores, espaçamentos, tipografia,
> proporções e comportamento estão prontos para implementação 1:1.

## 2. Sobre os arquivos deste pacote

Os arquivos HTML aqui são **referências de design** — protótipos navegáveis
mostrando look-and-feel e comportamento pretendidos, **não código de produção
para copiar diretamente**. A tarefa do desenvolvedor é **recriar esses designs
no ambiente do codebase existente** (React, Vue, etc.) usando os padrões e
bibliotecas já estabelecidos. Se ainda não houver framework definido, escolha
o mais adequado (recomendação: React + TypeScript + Vite, e SVG inline para a
camada de cabos).

A lógica interna dos arquivos HTML (cálculo de paths Bézier dos cabos,
ordenação por flex order, animação da faca via SVG rotate) **deve ser
preservada conceitualmente** mas reestruturada em componentes idiomáticos
do framework escolhido.

## 3. Arquitetura visual

A tela é composta por:

```
┌──────────────────────────────────────────────────────────┐
│  Header: título · modo (Operação/Teste/Mista)            │
├──────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐            │
│  │  Stage (palco principal)                 │            │
│  │  ┌─────────────────────────────────┐     │  ┌──────┐  │
│  │  │  RÉGUA DE BORNES (1—16)         │     │  │      │  │
│  │  ├─────────────────────────────────┤     │  │ side │  │
│  │  │  CHAVE DE AFERIÇÃO (7 alavancas)│     │  │ notes│  │
│  │  ├─────────────────────────────────┤     │  │      │  │
│  │  │  MALETA DE TESTE                │     │  └──────┘  │
│  │  └─────────────────────────────────┘     │            │
│  │  + SVG cables layer (overlay)            │            │
│  └──────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────┘
```

Layout em grid de 2 colunas: `1fr` para o stage e `320px` para o painel
lateral de notas. Side panel é informativo e pode ficar atrás de um menu/aba
na implementação real (não é parte central da UI).

## 4. Equipamentos

### 4.1. Régua de Bornes

Strip horizontal com **16 terminais** numerados (1–16). Cada terminal é um
bloco metálico cinza-prateado com:
- Parafuso superior (círculo escuro com chanfro diagonal)
- Número grande centralizado (font: ui-monospace, 13px, peso 700, cor `#1f2937`)
- Parafuso inferior
- **Etiqueta amarela** acima do parafuso superior — replica as
  identificações manuscritas/datilografadas reais (font 8px, fundo
  `#fde68a`, borda `#b45309`, rotação −2°, sombra).

Cada terminal tem uma **fase** associada que se reflete numa borda colorida
sutil (`inset 0 0 0 2px rgba(<color>, 0.4)`):

| Borne | Tag      | Fase | Cor da borda           |
|-------|----------|------|------------------------|
| 1     | TCa-S1   | A    | amarelo `#eab308`      |
| 2     | TCa-S2   | A    | amarelo                |
| 3     | TCb-S1   | B    | vermelho `#ef4444`     |
| 4     | TCb-S2   | B    | vermelho               |
| 5     | TCc-S1   | C    | branco `#cbd5e1`       |
| 6     | TCc-S2   | C    | branco                 |
| 7     | TPa      | V    | azul `#3b82f6`         |
| 8     | TPb      | V    | azul                   |
| 9     | TPc      | V    | azul                   |
| 10    | 52a      | BI   | ciano `#06b6d4`        |
| 11    | 52b      | BI   | ciano                  |
| 12    | FC       | BI   | ciano                  |
| 13    | TC       | BI   | ciano                  |
| 14    | BO-RT    | BI   | ciano                  |
| 15    | BO-AL    | BI   | ciano                  |
| 16    | GND      | —    | sem borda              |

Strip envolto em um "device chassis" com:
- 4 parafusos nos cantos (gradiente radial cinza `#6b7587 → #2a3144`)
- Título flutuante acima ("Régua de Bornes · TB1—TB16")
- Background gradient `linear-gradient(180deg, #1d2438, #161c2e)`
- Border `1px solid #2c3856`, radius 10px

### 4.2. Chave de Aferição

Rack horizontal de **7 alavancas** verticais (cam-action), centralizado:

| ID  | Tag | Tipo     | Polos | Borda topo |
|-----|-----|----------|-------|------------|
| FA  | A   | Corrente | 2     | amarelo    |
| FB  | B   | Corrente | 2     | vermelho   |
| FC  | C   | Corrente | 2     | branco     |
| Va  | Va  | Tensão   | 1     | azul       |
| Vb  | Vb  | Tensão   | 1     | azul       |
| Vc  | Vc  | Tensão   | 1     | azul       |
| N   | N   | Tensão   | 1     | verde      |

**Anatomia de uma alavanca** (de cima para baixo):

1. **Tag amarela** (mesmo estilo do borne) com a letra da fase
2. **Knife area** — quadrado 70×70px com fundo escuro contendo a chave faca SVG:
   - Pivô fixo à direita (cx=56)
   - Lâmina horizontal (line)
   - Knob/handle laranja na ponta esquerda (cam handle)
   - **Quando fechada:** `transform: rotate(0)` (lâmina horizontal, conectada)
   - **Quando aberta:** `transform: rotate(28 56 y)` (gira **+28° para CIMA**,
     desconectando)
   - 2 lâminas para correntes (2 polos), 1 lâmina para tensões
3. **Short-bar overlay** (apenas chaves de corrente, visível quando aberta):
   - Posição absoluta dentro da knife-area, lado esquerdo
   - Borda tracejada `2px dashed #98a2b8`
   - Label "CURTO" à esquerda (tooltip educacional)
   - Representa o curto-circuito automático do secundário do TC
4. **Terminais** — círculos metálicos (radial gradient `#6b7280 → #1f2937`,
   border `1.5px var(--good)` quando energizado, `rgba(239,68,68,0.5)` quando
   aberto). 2 terminais para correntes, 1 para tensões.
5. **State label** — texto "↓ FECHADA" (verde) ou "↑ ABERTA" (vermelho),
   font ui-monospace 9px, peso 700.
6. **Plug ◇ MALETA** — retângulo 60×16px na base da alavanca, fundo
   gradient escuro, borda ciano sutil em estado fechado. Quando aberta:
   borda laranja `#f59e0b`, fundo `rgba(245,158,11,0.25)`, glow externo
   `0 0 8px rgba(245,158,11,0.4)`. **Representa onde a maleta pluga.**

**Width da alavanca:** `clamp(64px, 9vw, 78px)` (responsivo).
**Gap entre alavancas:** 10px.
**Flex-wrap:** ativo (graceful degradation em viewports estreitos).

### 4.3. Maleta de Teste

Dois painéis lado a lado (`grid-template-columns: 1fr 1fr; gap: 18px`):

**Painel esquerdo — Saídas Analógicas:**
6 grupos de plugs banana (I1, I2, I3, V1, V2, V3). Cada grupo é um par de plugs
(positivo + negativo) com label superior.

- I1+: amarelo (fase A) · I1-: preto
- I2+: vermelho (fase B) · I2-: preto
- I3+: branco (fase C) · I3-: preto
- V1: azul · V1-: preto
- V2: azul · V2-: preto
- V3: azul · V3-: preto

**Painel direito — Comando & Controle:**
4 grupos de plugs (BO1, BO2, BI1, BI2). Plugs positivos ciano,
negativos pretos.

**Plug banana** (`<div class="plug">`):
- 22×22px, radial gradient para 3D effect
- Box shadow inset (`inset 0 -3px 4px rgba(0,0,0,0.4)`) para profundidade
- Furo central escuro (`inset 5px, background rgba(0,0,0,0.6)`)
- `data-port="<id>"` para identificação

## 5. Camada de Cabos

Sobreposto a todos os 3 devices, um `<svg>` em `position: absolute; inset: 0;
z-index: 6`. As paths são calculadas dinamicamente do DOM.

### 5.1. Coleção de cabos

19 cabos no total (`CABLES` em JS), divididos em 3 categorias:

**Cabos analógicos principais (9 cabos) — RÉGUA → CHAVE (lado campo):**
```js
{ from: 'TB1-b', to: 'FA-Lt-field', phase: 'A', kind: 'main', circuit: 'IA' }
// TB1 a TB6 → FA/FB/FC (correntes, 2 cabos por fase)
// TB7 a TB9 → Va/Vb/Vc (tensões, 1 cabo por fase)
```

**Cabos binários (4 cabos) — MALETA ↔ RÉGUA:**
```js
{ from: 'BO1', to: 'TB10-b', phase: 'BI', kind: 'binary', circuit: 'BO1' }
// BO1→TB10, BO2→TB11, BI1→TB13, BI2→TB14
```
Estilo: `stroke-dasharray: 5 3` (pontilhado).

**Cabos de teste (6 cabos) — MALETA → PLUG da CHAVE:**
```js
{ from: 'I1+', to: 'FA-plug', phase: 'A', kind: 'test', chave: 'FA', circuit: 'IA' }
// I1+→FA-plug, I2+→FB-plug, I3+→FC-plug
// V1→Va-plug, V2→Vb-plug, V3→Vc-plug
```
**Comportamento:** opacidade 0.2 quando a chave está fechada (cabo "guardado
mas não energizado"), opacidade 1.0 + traços animáveis quando aberta.

### 5.2. Algoritmo de roteamento (Bézier draping)

Cabos são `<path>` SVG com curva cúbica que "drapeia" verticalmente como
cabo físico:

```js
function pathCurve(a, b) {
  const dy = b.y - a.y;
  const t = Math.min(90, Math.max(24, Math.abs(dy) * 0.45));
  const sign = Math.sign(dy) || 1;
  const ay = a.y + sign * t;          // exit a in direction of b
  const by = b.y - sign * t;          // enter b from direction of a
  return `M ${a.x} ${a.y} C ${a.x} ${ay}, ${b.x} ${by}, ${b.x} ${b.y}`;
}
```

Pontos de controle ficam **na mesma coluna x** dos endpoints, com offset
vertical proporcional à distância — produz curvas que parecem cabos
pendurados.

### 5.3. Coordenadas dos cabos

Cada cabo conecta dois **conectores** identificados por:
- `data-port="<id>"` em maleta plugs
- `data-connector="<id>"` em borne anchors e lever terminals/plugs

Posições são lidas via `getBoundingClientRect()` relativas ao stage.
**Recalcular em window resize** (com debounce via `requestAnimationFrame`).

**Bootstrap robusto** (não usar rAF sozinho — pode stallar em iframes throttled):
```js
window.addEventListener('load', drawCables);
setTimeout(drawCables, 50);
setTimeout(drawCables, 300);
```

### 5.4. Estilo dos cabos

```css
.cable {
  fill: none; stroke-width: 2.5;
  stroke-linecap: round; stroke-linejoin: round;
  filter: drop-shadow(0 2px 1px rgba(0,0,0,0.5));
  pointer-events: stroke;
  cursor: pointer;
  transition: opacity 0.2s, stroke-width 0.2s;
}
.cable.phaseA  { stroke: #eab308; }
.cable.phaseB  { stroke: #ef4444; }
.cable.phaseC  { stroke: #cbd5e1; }
.cable.phaseV  { stroke: #3b82f6; }
.cable.phaseBI { stroke: #06b6d4; stroke-dasharray: 5 3; stroke-width: 2.2; }
.cable.test    { opacity: 0.2; stroke-dasharray: 3 3; stroke-width: 1.8; }
.cable.test.active { opacity: 1; stroke-dasharray: 4 2; stroke-width: 2.4; }
```

## 6. Interações & Comportamento

### 6.1. Toggle de modo (header)

Segmented control com 3 opções:
- **Operação** — todas as chaves fechadas (estado padrão)
- **Teste (aberta)** — todas as chaves abertas
- **Mista** — FB e Vb abertas, resto fechado

### 6.2. Clique na alavanca

Alterna entre `closed ↔ open`. Side effects:
- Knife rotaciona: `rotate(28 56 y)` ↔ `rotate(0 56 y)` (transição 0.3s
  cubic-bezier)
- Knob handle (cam) rotaciona junto
- Plug box muda cor de neutra para laranja
- Short-bar (só correntes) ganha opacidade 0.85
- State label muda texto e cor
- Terminais perdem borda verde (energizada)
- Cabos `.test` da chave ficam ativos (`active` class)

### 6.3. Hover focus

Ao passar mouse sobre:
- **Um cabo** — destaca todos os cabos do mesmo `data-circuit`, atenua o resto a 12%.
- **Uma alavanca** — destaca cabos cujo `data-chave` corresponde, ou cujo circuit
  bate com o da alavanca.

```css
.stage.focused .cable { opacity: 0.12; }
.stage.focused .cable.focus { opacity: 1; stroke-width: 3.5;
  filter: drop-shadow(0 0 6px currentColor); }
```

### 6.4. Responsividade

- Stage: largura fluida, alavancas têm `width: clamp(64px, 9vw, 78px)`
- Chave-rack tem `flex-wrap: wrap` (graceful degradation)
- Side panel some abaixo de ~900px (não implementado — adicionar em produção)

## 7. State Management (sugestão)

Estados a manter:

```ts
type LeverState = 'open' | 'closed';

interface Lever {
  id: 'FA' | 'FB' | 'FC' | 'Va' | 'Vb' | 'Vc' | 'N';
  tag: string;
  kind: 'I' | 'V';
  phase: 'A' | 'B' | 'C' | 'V' | 'N';
  poles: 1 | 2;
  state: LeverState;
}

interface AppState {
  levers: Record<string, Lever>;
  mode: 'op' | 'test' | 'mix';
  focusedCircuit: string | null;     // hover state
}
```

Em React/Vue: `useState` ou `useReducer` para o array de levers. Mode toggle
recalcula todos os states em batch. Hover state local ao componente que
processa eventos.

## 8. Design Tokens

### Cores (CSS variables — copiar direto)

```css
:root {
  /* Backgrounds */
  --bg: #0a0d14;          /* page background */
  --panel: #0f1320;       /* card background */
  --panel-2: #161c2e;     /* nested panel */
  --panel-3: #1d2438;     /* device chassis top */
  --metal: #2a3147;       /* device chassis bottom */
  --metal-2: #3a4360;     /* metallic accents */

  /* Lines */
  --line: #1f2940;
  --line-2: #2c3856;

  /* Text */
  --ink: #e6ecf5;
  --ink-2: #98a2b8;
  --ink-3: #5a657d;

  /* Accents */
  --accent: #f59e0b;      /* warning, active test */
  --good: #10b981;        /* energized, OK */
  --bad: #ef4444;         /* alarm, open switch */

  /* Phase colors */
  --phaseA: #eab308;      /* yellow */
  --phaseB: #ef4444;      /* red */
  --phaseC: #cbd5e1;      /* white/silver */
  --voltage: #3b82f6;     /* blue */
  --binary: #06b6d4;      /* cyan */

  /* Tag (yellow) */
  --tag-yellow: #fde68a;
  --tag-yellow-stroke: #b45309;
}
```

### Tipografia

- **UI sans:** `-apple-system, "Helvetica Neue", Helvetica, sans-serif`
- **Monospace** (números de bornes, labels técnicos): `ui-monospace, "SF Mono", monospace`
- **Tamanhos:** 8px (tags), 9px (state), 10px (column titles), 11px (chips/buttons), 13px (border numbers), 19px (h1)
- **Pesos:** 600 (UI), 700 (labels), 800 (badges/numbers)
- **Letter-spacing:** 0.5–2.5px em labels uppercase

### Espaçamento

- Border radius: 3px (small), 6px (medium), 10px (devices), 14px (stage)
- Gaps internos: 4px (borne strip), 6–18px (plugs e seções)
- Padding device: 24px 28px 18px

### Sombras

- Device chassis: `0 4px 18px rgba(0,0,0,0.4)` + `inset 0 1px 0 rgba(255,255,255,0.05)`
- Banana plug: `inset 0 -3px 4px rgba(0,0,0,0.4)` + `0 1px 2px rgba(0,0,0,0.5)`
- Cable drop shadow: `drop-shadow(0 2px 1px rgba(0,0,0,0.5))`
- Test plug glow (open): `0 0 8px rgba(245,158,11,0.4)`

## 9. Comportamento técnico do equipamento real

Veja `GLOSSARY.md` para a definição de cada termo (régua de bornes, chave
de aferição, TC, TP, maleta). Resumindo o modelo elétrico:

- **Quando a chave fecha (operação normal):** corrente do TC de campo flui
  para o relé através da chave (lado esquerdo da chave → lâmina → lado direito).
- **Quando a chave abre (teste):**
  1. O lado direito (relé) é **desconectado** do lado esquerdo (campo)
  2. Automaticamente, um **curto-circuito** é aplicado no lado esquerdo (CT secundário)
     para impedir que o TC de campo gere sobretensão perigosa
  3. A maleta é plugada no **TEST PLUG** que internamente alimenta o lado direito (relé)
  4. Sinais binários (comando/controle) **NÃO passam pela chave** — vão direto
     da maleta para o relé via régua de bornes

Esse modelo deve ser preservado fielmente em qualquer simulação de fluxo de
corrente, alarmes ou estados de erro.

## 10. Arquivos neste pacote

| Arquivo                              | Descrição                                   |
|--------------------------------------|---------------------------------------------|
| `README.md`                          | Este documento                              |
| `Proposta v4 Hibrida.html`           | **Design de referência principal** (hi-fi)  |
| `REFERENCE_v3.html`                  | Layout alternativo (maleta no meio)         |
| `REFERENCE_v1_original.png`          | Screenshot do design original (v1)          |
| `GLOSSARY.md`                        | Termos técnicos do domínio                  |
| `DATA_MODEL.md`                      | Estruturas de dados completas               |

## 11. Notas de implementação

- **Não use** o cálculo de Bézier do HTML como produção sem revisar — está
  otimizado para visualização vertical. Para layouts diferentes (horizontal,
  diagonal), recalcule.
- **Performance:** com 19 cabos, redesenhar a cada hover é OK. Com 100+ cabos
  (caso futuro), use `requestAnimationFrame` debounce e considere virtualização.
- **Acessibilidade:** as cores das fases (amarelo/vermelho/branco) podem ser
  confundidas por usuários daltônicos. Mantenha sempre o **tipo de linha**
  (sólida vs tracejada) como reforço, e labels textuais nos cabos para hover.
- **Testes recomendados:** snapshot dos paths SVG, teste de toggle de modo,
  teste de hover focus (querySelector + classList check), teste responsivo
  em viewports 1024/1280/1440/1920.
- **Internacionalização:** todas as strings estão em pt-BR. Não há motivo
  técnico para mudar (domínio é Brasil/normas ABNT), mas mantenha as labels
  fora do código JS para facilitar edição.

## 12. Próximos passos (não inclusos neste handoff)

Features discutidas mas fora do escopo da v4:

- **4º bloco: Relé de Proteção** à direita ou abaixo da maleta
- **Predefinições** (presets de configuração: I Trifásico, V Completo, etc.)
- **Indicadores de status** (LEDs físicos: 52a, 52b, FC, FECHAR CB)
- **Animação de fluxo** (dash-offset rolando nos cabos energizados)
- **Modo edição** (clicar em dois terminais para conectar/desconectar cabo)
- **Export de configuração** (salvar/carregar setups de teste)
