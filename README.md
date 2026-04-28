# Relay Tester Pro

**Advanced Protection System Simulator** — ferramenta web para ensaio e verificação de relés de proteção em subestações. Simula injeção de correntes/tensões, avalia atuação de funções de proteção e gera relatórios COMTRADE compatíveis com IEC 60255.

**Deploy:** [relaytester-pro.pages.dev](https://relaytester-pro.pages.dev)  
**Stack:** React 18 · Vite 6 · JSZip · Cloudflare Pages

---

## Funcionalidades Atuais (v1.1)

### Página CAMPO
Interface de cabeamento da maleta de testes:

- **Chave de Aferição** — simulação da chave de corrente com 10 pólos (ia1/ia2, ib1/ib2, ic1/ic2, va, vb, vc, terra). Posição FECHADA (UP): corrente flui A→S1, T→S2. Posição CURTO (DOWN): S1↔S2 em curto, circuito de corrente protegido.
- **Régua de Bornes** — 12 módulos independentes com terminais top/bottom, suporte a anilhas identificadas (BO3-BO6, BI3-BI6).
- **Maleta de Teste** — conectores de saída analógica de corrente (AO-I1, I2, I3) e tensão (AO-V1, V2, V3) e digitais (BO1-BO4, BI1-BI4).
- **Grafo Elétrico em Tempo Real** — algoritmo BFS calcula quais terminais da maleta estão eletricamente conectados aos sensores do relé, dado o estado dos cabos e da chave. Detecta curto-circuito de TC.
- **Leitura Real do Relé** — correntes e tensões injetadas são filtradas pela topologia elétrica. Se nenhum cabo conectar a maleta ao relé, o relé vê zero.

### Página RELÉ
Configuração completa e simulação de atuação:

#### Parâmetros de Sistema
- **TP** — tensão primária/secundária, conexão (estrela/delta)
- **TC** — corrente primária/secundária; cálculo automático de CTR
- **Fasores de Pré-falta** — Ia, Ib, Ic (mag/ângulo) e Va, Vb, Vc. Modo balanceado 3φ ou manual.
- **Fasores de Falta** — mesmo esquema; toggle Pre-Fault/Fault no painel.
- **Base de ajuste** — primário, secundário ou múltiplo de TC/TP

#### Funções de Proteção (ANSI/IEEE)
| Função | Descrição | Norma |
|--------|-----------|-------|
| **51** | Sobrecorrente Temporizada de Fase | IEC 60255-151 |
| **50** | Sobrecorrente Instantânea de Fase | IEC 60255-151 |
| **51N** | Sobrecorrente Temporizada de Neutro | IEC 60255-151 |
| **50N** | Sobrecorrente Instantânea de Neutro | IEC 60255-151 |
| **67** | Direcional de Fase | IEC 60255-151 |
| **67N** | Direcional de Neutro | IEC 60255-151 |
| **27/59** | Sub/Sobretensão com histerese, seleção φ-N/φ-φ, bloqueio por baixa tensão | IEC 60255 |
| **47** | Sequência Negativa de Tensão | ANSI C37.102 |

Cada função suporta até **4 estágios** independentes com enable/disable por estágio.

#### Curvas de Tempo Inverso (51/51N/67/67N)
18 curvas disponíveis:
- IEC: Standard Inverse, Very Inverse, Extremely Inverse, Long-Time Inverse, Short-Time Inverse
- US: Moderately Inverse, Inverse, Very Inverse, Extremely Inverse, Short-Time Inverse
- IEEE/ANSI: Moderately/Very/Extremely Inverse (IEEE e ANSI flavors)
- Tempo Definido

#### Motor de Proteção
- **Tolerância 50/50N**: erro absoluto ±20 ms ou relativo ±5% (o maior). Tempo básico 30 ms quando ajuste = 0. Distribuição uniforme dentro da banda.
- **Simulação determinística**: exibe tempo teórico, banda ±Δt, resultado simulado, erro percentual e status PASS/FAIL.
- **Display de Relé** — 9 páginas: I secundária, I primária, I múltiplo TC, V secundária, V primária, V múltiplo TP, P secundária, P primária, Fault Record.

#### Matriz de Saída/Entrada
- **Output Matrix** (6 BO × 6 LED) — mapeamento de funções de proteção para saídas binárias e LEDs
- **Input Matrix** (6 BI × funções) — mapeamento de entradas binárias para bloqueios/habilitações

#### Exportação
- **COMTRADE** — gera arquivo `.cfg` + `.dat` (IEC 60255-24) com os fasores configurados
- **ZIP** — compacta ambos os arquivos para download único
- **Dump de Estado** — exporta JSON com toda a configuração do relé

---

## Arquitetura

```
src/
├── main.jsx          # Entry point React 18
├── App.jsx           # Shell principal, state global, motor de proteção
│   ├── page 0        # CAMPO — renderiza CampoPage
│   └── page 1        # RELÉ  — configuração inline
├── CampoPage.jsx     # Chave, régua de bornes, maleta, grafo elétrico
│   ├── buildElectricalGraph()     # Constrói grafo de adjacência dos terminais
│   ├── computeRelayReadings()     # BFS: determina o que o relé vê
│   └── checkMaletaTripDetection() # Detecta trip da maleta via BO
└── comtrade.js       # Gerador COMTRADE (IEC 60255-24)

public/
├── favicon.svg
└── _redirects        # Cloudflare Pages SPA routing
```

**Fluxo de dados:**

```
Fasores (App) → CampoPage (grafo elétrico) → relayReadings → Motor de Proteção → Resultados
                     ↑
          Estado da chave + cabos conectados
```

---

## Deploy — Cloudflare Pages

### Configurações do Projeto

| Campo | Valor |
|-------|-------|
| Framework preset | None (manual) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `20` |
| Root directory | `/` (raiz do repo) |

### Variáveis de Ambiente
Nenhuma variável de ambiente necessária atualmente.

### Roteamento SPA
O arquivo `public/_redirects` contém:
```
/* /index.html 200
```
Isso garante que deep links e refresh de página funcionem corretamente no Cloudflare Pages.

### Build Local
```bash
npm install
npm run build    # gera /dist
npm run preview  # serve /dist localmente
```

---

## Roadmap

### v1.2 — Página PAINEL (Sessão 2)
- [ ] **Disjuntor Siemens SION** — renderização SVG responsiva com estados: Aberto / Fechado / Rearme
- [ ] **Diagrama de Comando** — esquema ladder animado (BIS, LM, BL, BO2, BO1, BD, CL, OP, BI1, BI2, K, M, BF, AB, BA, BM)
- [ ] **State machine** do disjuntor: `open | closing | closed | opening | tripped`
- [ ] **Indicadores de estado**: ESTADO (Aberto/Fechado), MOLA (Carregada/Carregando), OPERAÇÕES (contador)
- [ ] **Botões de comando**: `[I Fechar]` e `[0 Abrir]` com lógica de intertravamento

### v1.3 — Interlocking PAINEL ↔ RELÉ ↔ CAMPO (Sessão 3)
- [ ] **Trip via BO1** → abre disjuntor automaticamente (CL energizado)
- [ ] **52a/52b contacts** → alimentam BI1/BI2 do relé (estado real do disjuntor)
- [ ] **Spring motor** → lógica de carregamento da mola pós-operação (~5 s simulado)
- [ ] **Bloqueio de fechamento** sem mola carregada (intertravamento mecânico)
- [ ] **Contador de operações** persistente na sessão

### v1.4 — Diagrama Unifilar Responsivo (Sessão 4)
- [ ] SVG do unifilar simplificado: fonte → TP/TC → disjuntor → carga
- [ ] Animação de corrente ativa (partículas no condutor) quando circuito fechado
- [ ] Indicadores de tensão e corrente inline no diagrama
- [ ] Responsividade mobile-first para uso em campo com tablet/smartphone

### v2.0 — Features Avançadas (Backlog)
- [ ] **Persistência** — salvar/carregar configuração completa em JSON (localStorage + File API)
- [ ] **Múltiplos relés** — configurar proteção principal e backup
- [ ] **Coordenograma TCC** — curvas de tempo-corrente em log-log (Recharts)
- [ ] **Cálculo de coordenação** — margem de seletividade automática entre estágios
- [ ] **Exportação de relatório** — PDF com configurações, resultados e diagrama unifilar (jsPDF)
- [ ] **Banco de relés** — presets com nameplate values reais (SIEMENS 7SJ, SEL-751, GE T35, ABB REF 615)
- [ ] **Harmônicas** — injeção de componentes harmônicas nos fasores (análise 2ª/3ª/5ª/7ª)
- [ ] **Modo turma** — múltiplos usuários simultâneos via Cloudflare D1 + Workers

---

## Normas Referenciadas

- **IEC 60255-151** — Curvas de tempo inverso para relés de sobrecorrente
- **IEC 60255-24** — COMTRADE (Common Format for Transient Data Exchange)
- **IEC 60255-127** — Medição de grandezas analógicas
- **ANSI/IEEE C37.102** — Guia de proteção de geradores síncronos
- **IEEE 1584-2018** — Cálculo de arco elétrico (referência futura)
- **NBR IEC 60255** — Versão ABNT das normas de relés de proteção

---

## Desenvolvimento

```bash
git clone <repo>
cd relaytester_pro
npm install
npm run dev      # dev server em http://localhost:5173
```

**Contribuição:** Issues e PRs bem-vindos. Mantenha o formato de código existente (JSX inline, CSS-in-JS via `<style>` tags, sem TypeScript por enquanto).
