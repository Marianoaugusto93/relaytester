# Relay Tester Pro

**Advanced Protection System Simulator** — ferramenta web para treinamento e comissionamento de relés de proteção em subestações. Simula injeção trifásica de correntes e tensões, avalia atuação de funções ANSI/IEC, exibe circuito de comando animado e gera arquivos COMTRADE.

**Deploy:** [relaytester](https://relaytester.augustocesar-mariano.workers.dev/)  
**Stack:** React 18 · Vite 6 · Web Audio API · JSZip · Cloudflare Pages

---

## Funcionalidades — v1.5.0

### Página CAMPO
Simulador de cabeamento físico entre maleta de testes e relé.

- **Chave de Aferição (10 pólos)** — ia1/ia2, ib1/ib2, ic1/ic2, va, vb, vc, terra. Posição UP: corrente passa; DOWN: S1↔S2 em curto (segurança de TC).
- **Régua de Bornes (12 módulos)** — top/bottom internamente ligados, anilhas identificadas.
- **Maleta de Testes** — saídas de corrente (I1–I3), tensão (V1–V3), binários (BO1–BO6, BI1–BI6).
- **Grafo Elétrico em Tempo Real** — Union-Find determina quais terminais compartilham nó elétrico, dado o estado de cabos e chave.
- **Leitura Real do Relé** — fasores são filtrados pela topologia. Sem cabos = relé vê zero.
- **Detecção de Trip via BO→Borne→BI** — rastrea o caminho físico completo até o disjuntor.

### Página RELÉ
Configuração, simulação e análise de atuação.

#### Painel de Injeção (coluna esquerda)
- Fasores de **Pré-falta** e **Falta** independentes (Ia/Ib/Ic/Va/Vb/Vc)
- Modo **3φ Equilibrado** (referência em Ia/Va) e **Manual** por fase
- Seleção de sequência **ABC / ACB**
- **Frequência** do sistema (50/60 Hz) com ajuste fino de 0,1 Hz
- **Calculador de Falta** — calcula fasores de falta por componentes simétricas para AG, BG, CG, AB, BC, CA, ABG, BCG, CAG, ABC com impedâncias Z1/Z0 e resistência de falta configuráveis
- **Diagrama Fasorial** — visualizador SVG com toggles por fasor (Ia/Ib/Ic/Va/Vb/Vc/componentes simétricas/interlineares)

#### Funções de Proteção (ANSI/IEC)

| Função | Descrição | Estágios |
|--------|-----------|----------|
| **50** | Sobrecorrente Instantânea de Fase | 4 |
| **51** | Sobrecorrente Temporizada de Fase | 4 |
| **50N** | Sobrecorrente Instantânea de Neutro (3I₀) | 4 |
| **51N** | Sobrecorrente Temporizada de Neutro | 4 |
| **67** | Direcional de Fase (MTA, pol. quadratura/seq+) | 4 |
| **67N** | Direcional de Neutro (−V₀, V₀) | 4 |
| **27/59** | Sub/Sobretensão — φ-N ou φ-φ, histerese, bloqueio Low-V | 3+3 |
| **47** | Tensão de Sequência Negativa (V₂) | 2 |
| **46** | Sobrecorrente de Sequência Negativa (I₂) | 4 |
| **81** | Sub/Sobrefrequência (81U e 81O) | 3+3 |
| **32** | Potência Direcional/Reversa (32R e 32F) | 2+2 |
| **79** | Religamento Automático — shots, dead time, reclaim time | — |

**18 curvas de tempo inverso** para 51/51N/67/67N: IEC SI/VI/EI/LTI/STI, US CO2/CO8/MI/EI/STI, IEEE MI/VI/EI, ANSI NI/VI/EI + Tempo Definido.

#### Motor de Proteção
- **Modo direto** (sem pré-falta): calcula tempos reais com tolerância por função, exibe diagnósticos por estágio.
- **Modo com pré-falta** (acumulador): integração da fração de operação fase a fase — simula relés com memória de curva inversa.
- **Tolerâncias realistas**: 50/50N ±20 ms ou ±5%; 51/51N ±40 ms ou ±5%.
- **Monitoramento autônomo da 27**: relé detecta subtensão mesmo fora da simulação.

#### Relay Virtual (LCD + LEDs)
- Display LCD com **10 páginas**: I sec., I prim., I múltiplo TC, V sec., V prim., V múltiplo TP, P sec., P prim., Seq./Freq. (I₂, V₂, freq.), Fault Record.
- **8 LEDs** mapeáveis pela Output Matrix.
- Botões **RESET / 0 (Abrir) / I (Fechar)** no frontal do relé.
- Indicador de trip piscante com latch.

#### Matrizes de Saída/Entrada
- **Output Matrix** — 6 BO × 6 LED; mapeia estágios de proteção, CB status e CB commands para saídas físicas.
- **Input Matrix** — CB_Opened/CB_Closed × 6 BI; para de timer quando disjuntor confirma abertura.

#### Presets de Teste (11 configurações prontas)
51/50 Fase, 51N/50N Neutro, 50/51/50N/51N completo, 67 Direcional, 67N Neutro, 27/59 Tensão, 47 Seq.V, 46 Seq.I, 81U Freq, 32R Pot.Rev., 79+51/50 Auto-reclose.

### Página PAINEL
Simulação do circuito de comando do disjuntor.

- **SVG do Disjuntor Siemens SION** responsivo com estados: aberto, fechando, fechado, abrindo, disparando.
- **Diagrama de Comando Ladder animado** — BCS, LM, BL, BO2, BO1, BD, CL, OP, BI1, BI2, K, M, BF, AB, BA, BM com iluminação de contatos em tempo real.
- **Diagrama Unifilar** — fonte → TC/TP → disjuntor → carga com correntes e tensões primárias animadas.
- **Mola de Fechamento** — carregamento progressivo (~5 s), bloqueio de fechamento sem mola pronta.
- **Sonoplastia** — abertura, fechamento e carregamento de mola via Web Audio API (zero latência).
- **Contador de Operações** por sessão.

---

## Arquitetura

```
src/
├── main.jsx          # Ponto de entrada React 18
├── App.jsx           # Estado global, motor de proteção, engine de simulação
├── CampoPage.jsx     # Simulador de cabeamento — Union-Find, grafo elétrico
├── PainelPage.jsx    # Disjuntor, diagrama ladder, unifilar, áudio
└── comtrade.js       # Gerador COMTRADE IEEE C37.111-1999

public/
├── favicon.svg
├── _redirects        # Cloudflare SPA routing
└── sounds/           # abrir.mp3  fechar.mp3  mola.mp3
```

**Fluxo de dados:**
```
App.jsx (phasors + protections + sys)
  ├── CampoPage  →  fieldState (connections, internalConns)
  │                 electricalGraph (Union-Find)
  │                 computeRelayReadings()  →  relayReadings
  │                 checkMaletaTripDetection()
  │
  ├── Protection Engine  →  evalProtectionsDirect() | accumulator
  │                         → trippedStageIds, tripHistory, COMTRADE
  │
  └── PainelPage  →  bkState, springLoaded, tripLatch
                     onBreakerChange() callback  →  ar79 auto-reclose
```

---

## Deploy

### Pré-requisitos
- Node.js 18+
- Conta GitHub
- Conta Cloudflare (plano gratuito suficiente)

### 1. Desenvolvimento local

```bash
git clone https://github.com/SEU_USUARIO/relaytester-pro.git
cd relaytester-pro
npm install
npm run dev        # http://localhost:5173
npm run build      # gera /dist
npm run preview    # serve /dist localmente
```

### 2. Push para GitHub

Se ainda não tiver o remote configurado:

```bash
git remote add origin https://github.com/SEU_USUARIO/relaytester-pro.git
git push -u origin master
```

Ou com o GitHub CLI:

```bash
gh repo create relaytester-pro --public --source=. --push
```

### 3. Deploy no Cloudflare Pages

1. Acesse **dash.cloudflare.com** → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Autorize o acesso ao GitHub e selecione o repositório `relaytester-pro`
3. Configure o build:

| Campo | Valor |
|-------|-------|
| Framework preset | `Vite` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `20` |
| Root directory | `/` |

4. Clique **Save and Deploy** — o primeiro deploy leva ~1 min.

**Variáveis de ambiente:** nenhuma necessária.

**Roteamento SPA:** o arquivo `public/_redirects` contém `/* /index.html 200`, que garante que refresh e deep links não retornem 404.

**Deploys automáticos:** após a configuração inicial, qualquer `git push` para `master` dispara um novo deploy automaticamente.

---

## Roadmap

### Próximas funções de proteção
- [ ] **49** — Proteção Térmica (I²t acumulador, limite de temperatura, cooling)
- [ ] **21** — Distância (zonas Z1/Z2/Z3, características mho/quadrilateral, zona de memória de tensão)
- [ ] **87T / 87L** — Diferencial de Transformador / Linha (corrente de estabilização, bloqueio de inrush 2ª harmônica)
- [ ] **25** — Sincronismo (janela de tensão/frequência/ângulo para fechamento síncrono)
- [ ] **86** — Relé de Bloqueio / Lockout (latch com flag visual, reset manual supervisionado)
- [ ] **24** — Sobreexcitação V/Hz (proteção de transformador e gerador)

### Melhorias de simulação
- [ ] **Coordenograma TCC** — curvas de tempo-corrente sobrepostas em escala log-log (Recharts); exportação SVG/PNG
- [ ] **Cálculo de seletividade** — margem de tempo automática entre estágios coordenados
- [ ] **Harmônicas** — injeção de 2ª/3ª/5ª/7ª harmônicas nos fasores; análise de bloqueio de diferencial
- [ ] **Cálculo de curto-circuito completo** — modelo de rede com impedância de sequência Z1/Z2/Z0 do sistema para todos os tipos de falta

### Exportação e relatórios
- [ ] **Relatório PDF** — sumário do ensaio: configurações, resultados, fasores, diagrama unifilar (jsPDF + html2canvas)
- [ ] **COMTRADE v2013** — suporte ao formato IEEE C37.111-2013 (binário + ASCII)
- [ ] **Planilha de resultados** — exportação CSV/XLSX com tempo teórico × simulado × erro por estágio

### UX e treinamento
- [ ] **Banco de relés** — presets de nameplate reais: SIEMENS 7SJ85, SEL-751A, GE T35, ABB REF 615, Schneider Sepam
- [ ] **Modo guiado** — roteiro de ensaio passo a passo com checklist e validação automática de resultados
- [ ] **Responsividade mobile** — layout adaptado para tablets de campo (modo retrato/paisagem)
- [ ] **Modo turma** — sessões compartilhadas via Cloudflare D1 + Workers para uso em cursos

---

## Normas Referenciadas

| Norma | Assunto |
|-------|---------|
| IEC 60255-151 | Curvas de tempo inverso para relés de sobrecorrente |
| IEC 60255-24 / IEEE C37.111 | COMTRADE — formato de dados transitórios |
| IEC 60255-127 | Medição de grandezas analógicas |
| IEC 61850 | Comunicação em subestações (referência futura) |
| ANSI/IEEE C37.102 | Proteção de geradores síncronos |
| ANSI/IEEE C37.112 | Curvas de tempo inverso (IEEE/ANSI) |
| NBR IEC 60255 | Versão ABNT das normas de relés de proteção |

---

## Desenvolvimento

```bash
npm run dev      # Servidor de desenvolvimento com HMR
npm run build    # Build de produção → /dist
npm run preview  # Serve o /dist localmente (verifica build antes do deploy)
```

**Sem TypeScript, sem framework de testes, sem linter configurado** — contribuições devem manter o estilo JSX inline existente. CSS como template literals por componente (`campoCSS`, `S`). Sem dependências externas além de `react`, `react-dom` e `jszip`.
