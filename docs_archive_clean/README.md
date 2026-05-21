# RelayLab 360

**INTEGRAL PROTECTION ENGINEERING PLATFORM** — plataforma web para treinamento e comissionamento de relés de proteção em subestações. Simula injeção trifásica de correntes e tensões, avalia atuação de funções ANSI/IEC, exibe circuito de comando animado e gera arquivos COMTRADE.

**Deploy:** [relaytester.augustocesar-mariano.workers.dev](https://relaytester.augustocesar-mariano.workers.dev/)  
**Repositório:** [github.com/Marianoaugusto93/relaytester](https://github.com/Marianoaugusto93/relaytester)  
**Stack:** React 18 · Vite 6 · Web Audio API · JSZip · Cloudflare Pages

---

## Funcionalidades — v2.1.0

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

#### ReGrid Pro 1000 — IED Virtual
Painel de controle de software integrado à interface, substituindo a emulação de hardware.

- **Aba MENS.** — Correntes e tensões secundárias (Ia/Ib/Ic/Va/Vb/Vc/3I₀/3V₀) em tempo real, frequência, relações TC/TP. Valores em Electric Cyan `#0EA5E9`.
- **Aba PROT.** — Status de todas as funções ANSI habilitadas (EN / OFF / TRIP) com dot colorido por estado.
- **Aba LÓGICA** — 8 LEDs de saída mapeáveis pela Output Matrix com estado atual.
- **Aba EVENTOS** — Log cronológico dos últimos 10 eventos de simulação e trip.
- Botões **RESET / 0 (Abrir) / I (Fechar)** no frontal do IED.
- Banner de status **SISTEMA OK / TRIP ATUADO** com identificação do estágio que atuou.

#### Matrizes de Saída/Entrada
- **Output Matrix** — 6 BO × 6 LED; mapeia estágios de proteção, CB status e CB commands para saídas físicas.
- **Input Matrix** — CB_Opened/CB_Closed × 6 BI; para de timer quando disjuntor confirma abertura.

#### Presets de Teste (11 configurações prontas)
51/50 Fase, 51N/50N Neutro, 50/51/50N/51N completo, 67 Direcional, 67N Neutro, 27/59 Tensão, 47 Seq.V, 46 Seq.I, 81U Freq, 32R Pot.Rev., 79+51/50 Auto-reclose.

### Página PAINEL
Simulação do circuito de comando do disjuntor.

- **SVG do Disjuntor Siemens SION** responsivo com estados: aberto, fechando, fechado, abrindo, disparando.
- **Status Indicators** — exibe POSIÇÃO (aberto/fechado), MOLA (carregada/carregando) e barra de carga progressiva com percentual.
- **Diagrama de Comando Ladder animado** — BCS, LM, BL, BO2, BO1, BD, CL, OP, BI1, BI2, K, M, BF, AB, BA, BM com iluminação de contatos em tempo real.
  - ✨ **Melhorias v2.1**: cores mais luminosas, glows dinâmicos em elementos ativos, tipografia em Rajdhani/JetBrains Mono, melhor contraste
- **Diagrama Unifilar** — fonte → TC/TP → disjuntor → carga com correntes e tensões primárias animadas.
  - ✨ **Melhorias v2.1**: fundo cinzento padrão (var(--card)), linhas em branco para melhor contraste, grid sutil
- **Mola de Fechamento** — carregamento progressivo (~5 s), bloqueio de fechamento sem mola pronta.
- **Sonoplastia** — abertura, fechamento e carregamento de mola via Web Audio API (zero latência).
- **Contador de Operações** por sessão.

---

## Melhorias Visuais — v2.1.0

### Diagrama de Comando (Ladder)
- ✅ Barramentos e fios com maior luminosidade e contraste (`#e2e8f0`, `#cbd5e1`)
- ✅ Contatos com glows dinâmicos ao ativar (orange/red drop-shadow)
- ✅ Bobinas circulares e quadradas com melhor destaque (stroke duplo, r=15)
- ✅ Indicadores com tamanho aumentado e melhor feedback visual
- ✅ Tipografia padronizada: **Rajdhani** para labels, **JetBrains Mono** para valores
- ✅ Fundo com padrão grid sutil e profundidade

### Diagrama Unifilar
- ✅ Fundo cinzento padrão do projeto (`var(--card)`)
- ✅ Linhas do unifilar em branco (`#e2e8f0` / `#cbd5e1`) — visibilidade máxima
- ✅ Caixas de valores (LBox) com dimensões maiores, bordas nítidas, cores dinâmicas
- ✅ Posicionamento vertical ajustado para evitar sobreposição
- ✅ Tipografia: Rajdhani (interface), JetBrains Mono (dados)

### Painel do Disjuntor
- ✅ Status Indicators abaixo do SVG: POSIÇÃO, MOLA, CARGA (%)
- ✅ Barra de carregamento com gradiente laranja→amarelo
- ✅ Cores dinâmicas: verde (ativo), âmbar (transitório)
- ✅ Integração com design system (variáveis CSS)

---

## Identidade Visual — Design System

| Token | Valor | Uso |
|-------|-------|-----|
| `--orange` | `#F97316` | PRIMARY BRAND — logo, nav ativo, botão Injetar, CTAs |
| `--cyan` | `#0EA5E9` | TECHNICAL ACCENT — medições, fasores, valores de entrada |
| `--green` | `#4ADE80` | ESTADO — disjuntor fechado, sistema energizado |
| `--red` | `#F87171` | ESTADO — trip atuado, fault |
| `--amber` | `#FBBF24` | ESTADO — mola carregando, transitório |
| `--bg` | `#0E1015` | Carbon Black — fundo principal |
| `--card` | `#181B22` | Card background |

**Tipografia:** Rajdhani (interface/títulos) · JetBrains Mono (dados/valores) · Inter (body)

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
├── favicon.svg       # Ícone SVG — lente da proteção (anel laranja + onda senoidal)
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
- Conta GitHub com acesso ao repositório `Marianoaugusto93/relaytester`
- Conta Cloudflare com o projeto Pages já configurado

### 1. Desenvolvimento local

```bash
git clone https://github.com/Marianoaugusto93/relaytester.git
cd relaytester
npm install
npm run dev        # http://localhost:5173
npm run build      # gera /dist  (verifica erros antes do push)
npm run preview    # serve /dist localmente
```

### 2. Fazer o deploy (fluxo completo)

```bash
# 1. Verifique o estado atual
git status

# 2. Adicione os arquivos modificados
git add src/ README.md funcoes.md

# 3. Commit com mensagem descritiva
git commit -m "feat: v2.1.0 — melhorias visuais (diagrama comando/unifilar), status indicators disjuntor"

# 4. Push para o repositório (dispara deploy automático no Cloudflare)
git push origin master
```

O Cloudflare Pages detecta o push e executa automaticamente:
```
npm run build   →   /dist   →   deploy em ~60 s
```

Acompanhe em: **dash.cloudflare.com → Workers & Pages → relaytester → Deployments**

### 3. Verificar o deploy

Após o Cloudflare marcar o deployment como **Success**, acesse:

```
https://relaytester.augustocesar-mariano.workers.dev/
```

e confirme:
- [x] Título da aba: `RelayLab 360`
- [x] Topbar: logo SVG + "RelayLab 360"
- [x] Nav pills com cor laranja ao ativar
- [x] Aba Relé → coluna direita mostra "ReGrid Pro 1000" com abas MENS./PROT./LÓGICA/EVENTOS
- [x] Medições em cyan, estados do disjuntor em verde/vermelho
- [x] **v2.1.0**: Diagrama de comando com cores luminosas e glows
- [x] **v2.1.0**: Diagrama unifilar com linhas brancas e fundo padrão
- [x] **v2.1.0**: Status indicators (Posição, Mola, Carga %) abaixo do disjuntor

### Configuração do Cloudflare Pages (primeira vez)

Se precisar reconfigurar o projeto do zero:

1. **dash.cloudflare.com** → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Autorize o GitHub e selecione `Marianoaugusto93/relaytester`
3. Configure o build:

| Campo | Valor |
|-------|-------|
| Framework preset | `Vite` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `20` |
| Root directory | `/` |

4. **Save and Deploy** — o primeiro build leva ~1 min.

**Variáveis de ambiente:** nenhuma necessária.

**Roteamento SPA:** adicione o arquivo `public/_redirects` com o conteúdo `/* /index.html 200` para evitar 404 em refresh.

---

## Desenvolvimento local

```bash
npm run dev      # Servidor de desenvolvimento com HMR (hot reload)
npm run build    # Build de produção → /dist
npm run preview  # Serve o /dist localmente (valida antes do deploy)
```

**Sem TypeScript, sem framework de testes, sem linter configurado** — contribuições devem manter o estilo JSX inline existente. CSS como template literals por componente (`campoCSS`, `S`). Sem dependências externas além de `react`, `react-dom` e `jszip`.

---

## Changelog

### v2.1.0 (2026-04-30)
**Melhorias Visuais & UX**
- ✨ Status Indicators no painel do disjuntor: POSIÇÃO, MOLA, CARGA (%)
- ✨ Diagrama de Comando (Ladder) com cores luminosas e glows dinâmicos
- ✨ Diagrama Unifilar com linhas brancas e melhor contraste
- ✨ Tipografia padronizada (Rajdhani + JetBrains Mono)
- 📚 Guia de próximas funcionalidades (`funcoes.md`)
- 🎨 Design System completo: paleta orange/cyan/green/red/amber + variables CSS

### v2.0.0 (2026-04-20)
- 🎨 Rebranding: RelayLab 360 (era "Relay Tester Pro")
- 🎨 ReGrid Pro 1000: IED virtual com abas MENS/PROT/LÓGICA/EVENTOS
- ✅ 12 funções de proteção ANSI/IEC implementadas (50/51/67/27/59/47/46/81/32/79)
- ✅ Matrizes de Saída/Entrada mapeáveis
- ✅ COMTRADE IEEE C37.111-1999 export
- ✅ Simulador elétrico (Union-Find) com detecção de trip via BO→BI

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
- [ ] **Coordenograma TCC** — curvas de tempo-corrente sobrepostas em escala log-log; exportação SVG/PNG
- [ ] **Cálculo de seletividade** — margem de tempo automática entre estágios coordenados
- [ ] **Harmônicas** — injeção de 2ª/3ª/5ª/7ª harmônicas nos fasores
- [ ] **Cálculo de curto-circuito completo** — modelo de rede com impedância Z1/Z2/Z0

### Exportação e relatórios
- [ ] **Relatório PDF** — sumário do ensaio: configurações, resultados, fasores, diagrama unifilar
- [ ] **COMTRADE v2013** — suporte ao formato IEEE C37.111-2013
- [ ] **Planilha de resultados** — exportação CSV/XLSX com tempo teórico × simulado × erro

### UX e plataforma
- [ ] **Banco de relés** — presets de nameplate reais: SIEMENS 7SJ85, SEL-751A, GE T35, ABB REF 615
- [ ] **Modo guiado** — roteiro de ensaio passo a passo com checklist e validação automática
- [ ] **Responsividade mobile** — layout adaptado para tablets de campo
- [ ] **Modo turma** — sessões compartilhadas via Cloudflare D1 + Workers

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
