# RelayLab 360 — Guia de Funções a Implementar

**Última atualização:** Abril 2026  
**Status Atual:** v2.0.0 com rebranding completo

---

## 📊 Funções de Proteção Implementadas

| Função | Status | Estágios | Curvas Inversa |
|--------|--------|----------|----------------|
| **50** — Sobrecorrente Instantânea (Fase) | ✅ | 4 | — |
| **51** — Sobrecorrente Temporizada (Fase) | ✅ | 4 | 18 curvas IEC/US/IEEE/ANSI |
| **50N** — Sobrecorrente Instantânea (Neutro) | ✅ | 4 | — |
| **51N** — Sobrecorrente Temporizada (Neutro) | ✅ | 4 | 18 curvas |
| **67** — Direcional (Fase) | ✅ | 4 | MTA, polarização |
| **67N** — Direcional (Neutro) | ✅ | 4 | −V₀, V₀ |
| **27/59** — Sub/Sobretensão | ✅ | 3+3 | Histerese + Low-V block |
| **47** — Tensão de Sequência Negativa | ✅ | 2 | — |
| **46** — Corrente de Sequência Negativa | ✅ | 4 | — |
| **81** — Sub/Sobrefrequência | ✅ | 3+3 | — |
| **32** — Potência Direcional/Reversa | ✅ | 2+2 | — |
| **79** — Religamento Automático | ✅ | — | Shots, dead time, reclaim |

---

## 🎯 PRÓXIMAS FUNÇÕES (Por Prioridade)

### **TIER 1 — MVP (Essencial para Subestações Médias)**

#### **49 — Proteção Térmica** 
**Propósito:** Simular aquecimento progressivo de transformadores/motores via I²t acumulador  
**Por que:** Função muito comum em TCs de potência (subestações, geradores)  
**Complexidade:** 🟡 Média

**O que implementar:**
```javascript
// Estado por estágio
49_stages: [
  { label: "49-1 Alarme", enabled, pickup_time_const, trip_curve, alarm_threshold },
  { label: "49-2 Trip Térmico", enabled, trip_time_const, cooling_rate, max_temp }
]

// Motor de cálculo
evaluateProtection_49(currents, settings, stage) {
  // I²t = ∑ I² × Δt (acumula quadrado da corrente)
  // Quando I²t > pickup, começa conta de tempo com cooling exponencial
  // trips quando thermal capacity atinge limite
}
```

**Entrada / Output Matrix:**
- BI: ativação via simulação
- BO: alarme (LED1), trip (LED2)

**Testes recomendados:**
- Sobrecarga constante: trip em tempo previsível
- Sobrecarga intermitente: cooling e reacumulação
- Transição de alarme → trip

---

#### **86 — Lockout / Relé de Bloqueio**
**Propósito:** Latch de trip supervisionado — impede re-fecha até reset manual  
**Por que:** Segurança — evita religamentos automáticos após falhas críticas  
**Complexidade:** 🟢 Baixa

**O que implementar:**
```javascript
// Lógica simples
86_state: {
  tripped: false,  // SET por qualquer proteção configurada
  latched: true,   // RESET apenas por comando manual (botão RESET no painel)
  flags: { reset_pending: false, supervision_lost: false }
}

// Na Output Matrix:
// 86 input: OR de (50 trip OR 51 trip OR 67 trip ...) selecionáveis
// 86 output: bloqueia 79 (auto-reclose) enquanto latched
// Botão RESET no PainelPage clears o latch
```

**Integração:**
- Modifica lógica de `79` (religamento) — nega se `86.latched === true`
- Novo botão "RESET LOCKOUT" no painel do IED

---

### **TIER 2 — Proteção de Distância e Transformador**

#### **21 — Proteção de Distância**
**Propósito:** Relé de distância com 3 zonas — baseado em impedância de linha  
**Por que:** Essencial em proteção de linhas de transmissão (SABE/EPC nacional)  
**Complexidade:** 🔴 Alta

**O que implementar:**
```javascript
// Impedância por fase
Z_phase = V / I  (mag + ângulo)

// 3 zonas de cobertura:
21_stages: [
  { zone: "Z1", reach: 80%, time_delay: 0,   char: "mho" },      // Instantânea
  { zone: "Z2", reach: 120%, time_delay: 0.3, char: "mho" },     // 300 ms
  { zone: "Z3", reach: 150%, time_delay: 1.0, char: "mho" },     // 1 s
  { zone: "Z4", reach: 250%, time_delay: 2.0, char: "quadril" }  // Reversa
]

// Características disponíveis:
// - Mho (círculo): polarização com tensão de sequência positiva
// - Quadrilateral: cobertura retangular (melhor para linhas muito longas)
// - Memória de tensão: mantém V quando falha para direcionalidade
```

**Entrada/Saída:**
- Requer **TP** e **TC** com relação correta (não-inversor)
- BO: trip por zona
- BI: bloqueio por perda de tensão

**Testes recomendados:**
- Curto-circuito AT (50 km): deve atuar Z1
- Curto AT fim de linha (120 km): deve atuar Z2
- Curto reverso (retaguarda): deve não atuar

---

#### **87T — Diferencial de Transformador**
**Propósito:** Proteção contra curtos internos via correntes diferencial estabilizada  
**Por que:** Proteção mais sensível para transformadores (não sofre sensibilidade com distância)  
**Complexidade:** 🔴 Alta

**O que implementar:**
```javascript
// Corrente diferencial = |I_primário/n − I_secundário|
// (n = relação de transformação TC)

// Estágio instantâneo
I_diff > pickup  →  trip imediato

// Estágio temporizado (bloqueia inrush de magnetização com 2ª harmônica)
if (contains_2nd_harmonic) {
  block = true  // Não viaja em energização
}

// Curva de estabilização
if (I_diff / I_biased > knee_point) {
  slope_offset = 0.3  // 30% — insensível a pequenas diferenças
}
```

**Entrada/Saída:**
- TC duplo (primário e secundário do transformador)
- BO: trip diferencial
- BI: bloqueio por alta corrente harmônica

---

### **TIER 3 — Funções Adicionais e Análise**

#### **24 — Sobreexcitação (V/Hz)**
**Propósito:** Proteção contra magnetização excessiva (fluxo de núcleo)  
**Por que:** Relevante para geradores durante partida ou falha de carga  
**Complexidade:** 🟡 Média

```javascript
// Razão V/f - indicador de fluxo
V_f_ratio = V_nominal / f

// Estágios
24_stages: [
  { name: "24-1 Alarme", V_f_threshold: 1.1, time_delay: 10 },
  { name: "24-2 Trip", V_f_threshold: 1.2, time_delay: 2 }
]
```

---

#### **25 — Sincronismo / Fechamento Síncrono**
**Propósito:** Permite fechamento seguro apenas quando gerador/barra estão em fase  
**Por que:** Evita transientes destrutivos ao conectar fontes  
**Complexidade:** 🟡 Média

```javascript
// Janela de sincronismo
V_diff < 10% && f_diff < 0.5 Hz && θ_diff < 20° → permite fechar
```

---

---

## 📈 MELHORIAS DE SIMULAÇÃO

### **Coordenograma TCC (Time-Current Curve)**
**Status:** Pré-planejado  
**Propósito:** Visualizar múltiplas curvas de proteção sobrepostas em gráfico log-log  
**Benefício:** Validar seletividade visual — identificar gaps de cobertura

**O que implementar:**
```javascript
// Renderizar no PainelPage ou em nova aba
<CoordinogramChart
  stages={[51_stage_1, 51_stage_2, 50, 51N, 50N]}
  frequency={60}
  timeRange={[0.01, 1000]}  // ms
  currentRange={[0.1, 10000]}  // A primário
  theme="dark"
/>

// Exportar como SVG/PNG para relatório
```

**Regras de seletividade:**
- Próximo estágio deve ter tempo ≥ estágio anterior + 0.2s (margem de 200 ms)
- Código de cores por função (50=vermelho, 51=laranja, 67=cyan, 27=azul)

---

### **Harmônicas — Injeção de 2ª/3ª/5ª/7ª**
**Status:** Research  
**Propósito:** Simular deformação de onda senoidal para teste de bloqueio inrush  
**Benefício:** Validação mais realista de diferencial (87T) e esquemas com filtro harmônico

**O que implementar:**
```javascript
// Componentes Fourier na injeção
Ia_total = A₁ sin(ωt) + A₂ sin(2ωt) + A₅ sin(5ωt) + ...

// Sliders no painel de injeção
<HarmonicsPanel>
  <Slider label="2ª Harmônica (%)" min={0} max={30} value={0} />
  <Slider label="5ª Harmônica (%)" min={0} max={20} value={0} />
</HarmonicsPanel>

// Detectar via FFT
I2_component = FFT(samples)[2]
blockInrush = I2_component > 0.15 * I1_component
```

---

### **Cálculo de Curto-Circuito Simplificado**
**Status:** Research  
**Propósito:** Calcular automaticamente fasores de falta dado impedância de rede  
**Benefício:** Menos retrabalho manual de cálculo

```javascript
// Já existe FaultCalculator — expandir com modelo de rede
<FaultCalculatorAdvanced
  faultType="AG"
  Z1_network={0.02}    // pu em 100 MVA
  Z0_network={0.005}
  Rf={10}              // Ω (resistência de arco)
  V_pre={1.0}          // pu pré-falta
  →  retorna {Ia, Ib, Ic, I0} magnitude
/>
```

---

---

## 🎨 MELHORIAS DE UX / PLATAFORMA

### **Banco de Relés Reais**
**Status:** Planejado  
**Propósito:** Presets de nameplate de relés comerciais  
**Benefício:** Acelerar ensaios em laboratório — carregar curvas reais do fabricante

**Relés sugeridos:**
```javascript
RELAY_PRESETS = {
  "SIEMENS 7SJ85": {
    datasheet_url: "https://...",
    protection_functions: [50, 51, 67, 27, 79],
    default_settings: { ... },
    curve_map: { 51: "SIEMENS SJ-TYPE" }
  },
  "SEL-751A": { ... },
  "GE T35": { ... },
  "ABB REF 615": { ... }
}

// UI: dropdown + importar settings
<SelectRelayPreset onChange={importPreset} />
```

---

### **Modo Guiado — Roteiro de Ensaio**
**Status:** Research  
**Propósito:** Sequência passo-a-passo com checklist automático  
**Benefício:** Treinamento padronizado

**Fluxo exemplo — Ensaio 51/50 Fase:**
```
1️⃣ Configurar picks: 51 = 1.5×In, 50 = 5×In
   ✓ Validação automática
2️⃣ Injetar 1.2×In em 51 - verificar trip em ~10s
   ✓ Se tempo 9-11s: PASS
3️⃣ Injetar 6×In em 50 - verificar trip em <500ms
   ✓ Se tempo <500ms: PASS
4️⃣ Relatório gerado automaticamente
```

---

### **Responsividade Mobile / Tablets**
**Status:** Planejado  
**Propósito:** Interface adaptada para tablets de campo (landscape)  
**Benefício:** Facilitar ensaios em subestações

**Mudanças:**
- Grid 3 colunas → 1.5 (CampoPage reduzida, PainelPage full)
- Botões maiores (touch-friendly)
- Rolagem horizontal em tabelas

---

### **Modo Turma — Sessões Compartilhadas**
**Status:** Planejado  
**Propósito:** Professor cria sala, alunos entram com código, veem simulação em tempo real  
**Benefício:** Ensino à distância

**Stack:**
- Cloudflare D1 (SQLite serverless) — armazenar sessions
- Cloudflare Workers — broadcast via WebSocket
- Estado compartilhado: phasors, protections (broadcast a cada 100ms)

**Dados:**
```javascript
// D1 schema
ROOMS table: { room_id, created_by, session_key, created_at, expires_at }
PARTICIPANTS table: { room_id, user_id, role, cursor_mode }
STATE_LOG table: { room_id, timestamp, state_snapshot }
```

---

---

## 🔧 MELHORIAS TÉCNICAS (Refactoring)

### **Separar Protection Engine em módulo**
**Status:** Backlog  
**Por que:** App.jsx ficou grande (~500 linhas)

```javascript
// Novo: src/protectionEngine.js
export class ProtectionEngine {
  evaluate(phasors, settings, rtc, rtp, fieldState) {
    // Lógica compilada de 50/51/67/27/etc.
  }
}

// App.jsx fica 30% menor
import { ProtectionEngine } from "./protectionEngine.js"
const engine = useMemo(() => new ProtectionEngine(), [])
```

---

### **Banco de Dados para Saves (Localstorage + IndexedDB)**
**Status:** Research  
**Propósito:** Histórico de ensaios + sincronização nuvem

```javascript
// IndexedDB schema
db.createObjectStore("saves", { keyPath: "id" })
  .createIndex("timestamp", "timestamp")

// Opção de sync com Workers KV
syncToCloud({ room_id, save_data })  // backup automático
```

---

### **Testes E2E com Playwright**
**Status:** Backlog  
**Por que:** Sem cobertura de teste

```javascript
// tests/protection.spec.js
test('51 dispara em tempo correto', async ({ page }) => {
  await page.goto('/')
  await page.selectOption('[name="curve"]', 'IEC')
  await page.fill('[name="pickup"]', '1.5')
  await page.fill('[name="current"]', '3')
  await page.click('button:has-text("Injetar")')
  
  const tripTime = await page.waitForFunction(
    () => document.querySelector('.trip-indicator')?.textContent
  )
  expect(tripTime).toBeGreaterThan(1.0)  // > 1s
})
```

---

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **Para cada nova função:**

- [ ] Implementar motor de cálculo em `protection.js`
- [ ] Adicionar estado em `App.jsx` (prot.functionName = { stages: [...] })
- [ ] Adicionar ao `defaultProtections` em `defaults.js`
- [ ] Criar painel de settings em `SettingsPanel.jsx`
- [ ] Mapear entrada/saída em Output Matrix
- [ ] Adicionar presets em `TEST_PRESETS`
- [ ] Documentar em README.md — Funcionalidades
- [ ] Testar com 3+ cenários (pickup, curve, tolerância)
- [ ] Exportar COMTRADE com evento de trip

---

## 🎯 ROADMAP TIMELINE

| Q | Funcionalidade | Prioridade | Est. Horas |
|---|---|---|---|
| Q2 2026 | **49** Térmica | 🔴 P0 | 12-16 |
| Q2 2026 | **86** Lockout | 🟡 P1 | 4-6 |
| Q3 2026 | **21** Distância | 🔴 P0 | 20-24 |
| Q3 2026 | **87T** Diferencial | 🔴 P0 | 20-24 |
| Q4 2026 | **Coordenograma TCC** | 🟡 P1 | 16-20 |
| 2027 | **Banco de Relés** | 🟢 P2 | 24-32 |
| 2027 | **Modo Turma** | 🟢 P2 | 40-48 |

---

## 📚 Referências

- **IEC 60255-151** — Curvas inversa para relés de sobrecorrente
- **IEC 60255-127** — Medição de grandezas analógicas
- **ANSI/IEEE C37.102** — Proteção de geradores
- **IEEE Std 1547** — Interconexão de recursos distribuídos (microgrid)
- **NBR IEC 60255** — Versão brasileira de normas de proteção

---

**Última revisão:** Abril 2026 — Agusto César Mariano  
**Contato:** augustocesar.mariano@gmail.com
