# Análise Corrigida: Newton-Raphson OLD vs NEW (Apenas o Módulo)

**Data**: 2026-06-05  
**Scope**: Comparação APENAS do módulo Newton-Raphson  
**OLD file**: `public/newton-rapson/powerflow.html` (7616 linhas)  
**NEW file**: `public/newton-rapson/powerflow-refactored.html` (1709 linhas)

---

## 1. VISÃO GERAL

### Ferramenta OLD (powerflow.html)
- **Tamanho**: 7616 linhas
- **Tipo**: Standalone HTML monolítico com toda a lógica integrada
- **Foco**: Editor de diagrama unifilar completo + solver Newton-Raphson
- **UI**: Rich — toolbar com 10+ tools, múltiplas tabelas, fullscreen support
- **Estado**: Versão original, production-ready

### Ferramenta NEW (powerflow-refactored.html)
- **Tamanho**: 1709 linhas (refatorado em Phases 9-13)
- **Tipo**: HTML modular com imports de módulos JS externos
- **Foco**: Solver + controles básicos + resultados
- **UI**: Minimal — modais, controles simples, tabelas básicas
- **Estado**: Versão refatorada, MVP focused

---

## 2. FEATURES PRESENTES NA OLD

### A. Diagram Editing Tools (Rich SVG Editor)
✅ **Existe na OLD**:
- **10+ Toolbar Tools**:
  - Select / move (arraste elementos)
  - Pan (navegação no canvas)
  - Add Bus (criar novos nós)
  - Add Generator (adicionar geradores)
  - Add Line (linhas de transmissão)
  - Add Transformer (transformadores)
  - Add Phase-Shifting Transformer (PST)
  - Add Load (cargas)
  - Add Shunt Capacitor
  - Add Shunt Reactor
  - Delete (modo delete com visual feedback)
- **Label Management** (Toggle panel com checkboxes):
  - Show/Hide bus names
  - Show/Hide voltage & angle
  - Show/Hide generator output
  - Show/Hide load values
  - Show/Hide shunt caps
  - Show/Hide shunt reactors
  - Show/Hide branch names
  - Show/Hide impedances
  - Show/Hide P/Q flow
  - Show/Hide current (A)
  - Show/Hide loading (%)
  - Show/Hide transformer kV
  - "Show All" / "Hide All" buttons
- **Fullscreen Support**:
  - Modo fullscreen para apresentações
  - Toolbar flutuante em fullscreen
  - Display mode controls access
- **Zoom Controls** (View):
  - Zoom in / Zoom out
  - Fit to content
  - Reset view
  - Zoom percentage display
- **Cursor Modes** (edit responsively):
  - cursor-add (crosshair quando adicionando elementos)
  - cursor-delete (not-allowed quando deletando)
  - cursor-pan (grab hand)
  - Visual feedback on hover

❌ **NÃO existe na NEW**:
- Nenhum editor de diagrama
- Sem toolbar tools
- Sem capacidade de adicionar/deletar elementos via UI
- Sem label toggle panel
- Sem fullscreen support
- Sem zoom controls
- Sem cursor modes interativos

### B. Equipment/Network Management
✅ **Existe na OLD**:
- **Model Management**:
  - Editar nome do modelo (modelo name input)
  - New model button
  - Load demo models (8-bus, 40-bus)
  - Save JSON (exportar rede completa)
  - Load JSON (importar rede)
  - Share link (URL compartilhável com estado codificado)
  - Reset labels button
- **Detailed Generators Table**:
  - Generator name, bus, type selector
  - P gen (MW) — input
  - Q gen (MVAR) — input
  - V setpoint (pu) — input
  - P min/max (MW) — inputs
  - Q min/max (MVAR) — inputs
  - Zgen r (pu) — generator series resistance input
  - Zgen x (pu) — generator series reactance input
  - In Service — checkbox (disabled para slack)
  - Type control: Select Slack / PV / PQ
  - Readonly fields com tooltips informativos
  - Editáveis em tempo real com solver integration
- **Detailed Loads Table**:
  - Bus, voltage
  - P load (MW) — input
  - Q load (MVAR) — input
  - Load model selector: Constant Power vs Constant Z
  - In Service — checkbox
- **Shunt Compensation Table**:
  - Bus, base kV (com tooltip sobre rebasing de impedâncias)
  - Cap (MVAR injected) — input
  - Cap model (const MVAR vs const Z)
  - Cap in service — checkbox (disabled se não houver cap)
  - Reactor (MVAR absorbed) — input
  - Reactor model
  - Reactor in service — checkbox

❌ **NÃO existe na NEW**:
- Sem New model / Load demo
- Sem Save JSON / Load JSON completo
- Sem Share link
- Sem model name editor
- Sem Zgen editor
- Sem load model selector
- Sem shunt compensation table
- Sem base kV editor
- Sem in-service toggles para equipamento

### C. Advanced Visualization & Display Modes
✅ **Existe na OLD**:
- **SVG Diagram Renderização**:
  - Buses como retângulos coloridos (por tipo: slack=verde, PV=verde, PQ=cinza)
  - Geradores como círculos com 'G' label
  - Cargas como triângulos com 'L' label
  - Shunt caps com símbolo de capacitor
  - Shunt reactors com símbolo de bobina
  - Branches como linhas com transformadores representados
  - Phase-shifting transformer (PST) com φ (phi) symbol
  - Animação de setas de fluxo de potência (animated arrows)
  - Color heatmap (verde=low, amarelo=medium, vermelho=high)
- **Display Mode Radio Buttons**:
  - P, Q flow (MW, MVAR) — default
  - Current (A)
  - Loading (% of rating)
  - Voltage heatmap (cor dos nós por magnitude de tensão)
  - Angle heatmap (cor dos nós por ângulo)
- **Drag Labels**: 
  - Todos os labels (bus names, voltages, flows) são draggable
  - Posição salva no modelo

❌ **NÃO existe na NEW**:
- Sem diagram tools avançados
- Sem display mode selector
- Sem heatmap by voltage/angle
- Sem label repositioning
- Sem animation customization

### D. Advanced Network Tables
✅ **Existe na OLD**:
- **Generators Table** (mencionado acima):
  - 13 colunas com full editing capability
  - Tooltips informativos para cada campo
  - Type selector com autoconfiguration (slack demote PV)
  - Readonly fields para computed values
- **Loads Table**:
  - Constant power vs constant impedance model selection
  - Full editing capability
- **Shunt Compensation Table**:
  - Capacitors and reactors
  - Model selection
  - Base kV management
  - Full editing capability
- **Branches Table** (não mostrado acima, mas existe):
  - Transformers com impedances
  - Transmission lines
  - PST with phase shift
  - All parameters editable

❌ **NÃO existe na NEW**:
- Tabelas muito simplificadas
- Sem model selection
- Sem Zgen editing
- Sem base kV management
- Sem PST support
- Sem shunt equipment editing

### E. Solver & Results
✅ **Existe na OLD**:
- Newton-Raphson solver (implementado internamente)
- Convergence detection (iterações até convergência)
- Convergence diagnostics (detalhado, com diag-blocks)
- Results em time real quando solver converge
- Auto-solve quando parâmetros mudam
- Error handling com mensagens úteis

✅ **TAMBÉM existe na NEW**:
- Newton-Raphson solver (importado de modules externos)
- Convergence diagnostics
- Results display
- Auto-solve capability

### F. UI/UX Polish
✅ **Existe na OLD**:
- Complex CSS com suporte a fullscreen
- Responsive layout (1400px max-width)
- Clean Apple-style design
- Keyboard shortcuts implícitas (zoom, pan, etc.)
- Tooltips informativos em quase todos os campos
- Status messages (ok/bad status)
- Visual feedback para editing

✅ **Parcialmente na NEW**:
- Basic CSS
- Modal dialogs
- Help system (básico)
- Status messages

---

## 3. FEATURES NA NEW MAS NÃO NA OLD

### A. Modular Architecture
✅ **Existe na NEW**:
- Imports from external modules:
  - `/src/simulators/powerflow/core/solver.js` — solver code
  - `/src/simulators/powerflow/core/controls.js` — UI controls
  - `/src/simulators/powerflow/core/diagnostics.js` — convergence diagnostics
  - `/src/simulators/powerflow/core/persistence.js` — save/load logic
  - `/src/simulators/powerflow/core/heatmap.js` — color utilities
- Clean separation of concerns
- Reusable modules

❌ **NÃO existe na OLD**:
- Tudo monolítico em um único arquivo
- Sem modularização

### B. Help System
✅ **Existe na NEW**:
- Help modal com 5 seções:
  - Getting Started
  - Scenarios
  - Controls & Actions
  - Result Tables
  - Tips
- Close button e ESC to dismiss
- Basic documentation

❌ **NÃO existe na OLD**:
- Sem help modal integrado
- Sem documentação em-app

### C. Scenario Management (Simplified)
✅ **Existe na NEW**:
- Scenario dropdown selector
- IEEE test systems:
  - IEEE 5-Bus System
  - IEEE 14-Bus System
- Educational scenarios (mencionadas no selector)
- Auto-load scenario feature
- Load Network from JSON file

❌ **NÃO existe na OLD**:
- Sem scenario manager UI
- Sem IEEE scenarios pré-carregados
- Sem file upload para network

### D. Protection Settings Panel (NEW)
✅ **Existe na NEW**:
- Relay settings UI (Phase 12):
  - 50/51 Overcurrent:
    - Pickup (A) slider
    - Time Dial slider
  - 27/59 Voltage:
    - 27 Pickup (V) slider
    - 59 Pickup (V) slider
  - Real-time display of selected values
  - Display only (not integrated with solver)

❌ **NÃO existe na OLD**:
- Sem relay settings panel
- Sem protection function controls

### E. Results History (Phase 13)
✅ **Existe na NEW**:
- `solveHistory` array tracking last 20 solves
- Timestamp recording
- Load scaling history

❌ **NÃO existe na OLD**:
- Sem history tracking
- Sem timestamp logging

---

## 4. LACUNAS CRÍTICAS NA NEW

| Recurso | Esforço | Prioridade | Notas |
|---------|---------|------------|-------|
| **Diagram Editor (toolbar)** | 80-100h | 🔴 CRÍTICA | 10+ tools, label management, fullscreen |
| **Equipment CRUD via UI** | 40-60h | 🔴 CRÍTICA | Add/edit/delete buses, branches, generators, loads |
| **Display Mode Selector** | 10-15h | 🟡 IMPORTANTE | P/Q flow, Current, Loading, Voltage heatmap, Angle heatmap |
| **Label Toggle Panel** | 15-20h | 🟡 IMPORTANTE | Show/hide individual labels, Show All / Hide All |
| **Fullscreen Support** | 10-15h | 🟡 IMPORTANTE | Maximize diagram, floating toolbar |
| **Zoom Controls** | 5-10h | 🟡 IMPORTANTE | In/out, fit, reset, zoom % display |
| **Model Management** | 10-15h | 🟡 IMPORTANTE | Save/load models, share link |
| **Demo Models** | 5-10h | 🟡 IMPORTANTE | Pre-configured test networks |
| **Advanced Generator Editing** | 15-20h | 🟡 IMPORTANTE | Zgen r/x, P min/max, Q min/max, type selector |
| **Load Models** | 5-10h | 🟡 IMPORTANTE | Constant P vs Constant Z |
| **Shunt Compensation** | 10-15h | 🟡 IMPORTANTE | Caps and reactors with models |
| **Base kV Management** | 5-10h | 🟡 IMPORTANTE | Rebase impedances when kV changes |
| **Phase-Shifting Transformer** | 10-15h | 🟡 IMPORTANTE | PST with phase shift control |
| **Keyboard Shortcuts** | 5-10h | 🟡 IMPORTANTE | Arrow keys, +/−, 0, F |
| **Tooltips & Help Text** | 10-15h | 🟡 IMPORTANTE | Context-sensitive help on hover |
| **⚠️ SUBTOTAL** | **~270-310h** | | **6-8 semanas** |

---

## 5. REALIDADE ATUAL

### O que a NEW faz bem:
- ✅ Solver Newton-Raphson funciona
- ✅ Importação/exportação de cenários
- ✅ Tabelas de resultados (básicas)
- ✅ Modular e extensível
- ✅ Relativamente compacta (1709 linhas)

### O que a NEW não faz:
- ❌ Diagram editing (add/delete/move elements)
- ❌ Display mode selector (P/Q, Current, Loading, Heatmap)
- ❌ Label management / toggle panel
- ❌ Fullscreen support
- ❌ Zoom controls
- ❌ Advanced model management
- ❌ Equipment CRUD UI
- ❌ Load model selection
- ❌ Shunt equipment support
- ❌ Base kV rebasing
- ❌ PST support
- ❌ Keyboard shortcuts
- ❌ Detailed tooltips

---

## 6. RECOMENDAÇÃO

### Opção A: Completar NEW para Feature Parity com OLD
**Esforço**: 270-310h (6-8 semanas full-time)  
**Resultado**: Ferramenta equivalente à OLD  
**Risco**: Alto (muitas features complexas)  
**Recomendação**: ⚠️ Considerar se vale a pena vs manutenção da OLD

**Fases necessárias**:
1. **Diagram Editor (Tier 1)** — 80-100h
   - Implement toolbar (select, pan, add bus/gen/line/xfmr/pst/load/cap/reactor, delete)
   - Implement label drag & positioning
   - Implement cursor modes
   - Implement keyboard shortcuts (arrow, +/−, 0, F)

2. **Equipment Management (Tier 1)** — 40-60h
   - Equipment modal improvements (add/delete/edit forms)
   - Advanced generator form (Zgen, P min/max, Q min/max)
   - Advanced load form (model selection)
   - Advanced shunt form (caps, reactors, base kV)
   - Advanced branch form (lines, transformers, PST)

3. **Visualization (Tier 1)** — 25-35h
   - Display mode selector (5 modes)
   - Label toggle panel (13 toggles)
   - Heatmap implementation (voltage, angle)

4. **Polish (Tier 2)** — 25-35h
   - Fullscreen support
   - Zoom controls
   - Model management (Save/Load/Share)
   - Demo models (8-bus, 40-bus)
   - Tooltips & help text

5. **Testing & Bug Fixes** — 25-35h

**Total**: ~270-310h (~6-8 semanas)

### Opção B: Manter NEW como "Specialized Tool"
**Esforço**: Manutenção mínima (~5h/semana)  
**Resultado**: Ferramenta focada em solver + controles básicos  
**Risco**: Baixo, mas não é "feature parity"  
**Recomendação**: ✅ Mais realista se tempo é limitado

**Scope mantido**:
- Solver Newton-Raphson ✅
- Scenario loading ✅
- Basic equipment editor ✅
- Protection settings (UI only) ✅
- Results tracking ✅

**Scope removido**:
- Diagram editor
- Display modes
- Fullscreen
- Zoom
- Model management
- Advanced equipment editing

### Opção C: Híbrido — Focar em TOP 3 Features
**Esforço**: ~120-150h (3-4 semanas)  
**Resultado**: ~50% feature parity com OLD  
**Recomendação**: ⚠️ Equilíbrio pragmático

**Features prorizadas**:
1. **Diagram Editor (Toolbar)** — 80-100h
   - Tools essenciais: Select, Pan, Add Bus, Add Line, Add Xfmr, Delete
   - Label toggle (basics)
   - Zoom controls

2. **Equipment Management** — 20-30h
   - Equipment modal completo (add/edit/delete)
   - Advanced generator form (Zgen, limits)
   - Advanced load form

3. **Display Modes & Visualization** — 20-30h
   - Display mode selector (P/Q, Current, Loading)
   - Heatmap by voltage

**Result**: Ferramenta muito mais poderosa que NEW, ainda com ~50h de espaço para testes e ajustes.

---

## 7. PRÓXIMOS PASSOS RECOMENDADOS

### Decisão Crítica:
**Qual é o objetivo final?**
- A: Migrar 100% da OLD para NEW (custoso, time-consuming)
- B: Manter NEW como complemento especializado (rápido, risco baixo)
- C: Implementar TOP 3 features para alcançar ~50% parity (pragmático)

**Recomendação**: **Opção C (Híbrido)** — máximo valor com esforço realista

### Se escolher Opção C:
1. **Phase 1 (3 semanas)**: Diagram Editor com toolbar essencial
2. **Phase 2 (1 semana)**: Equipment CRUD completo
3. **Phase 3 (1 semana)**: Display modes + heatmap básico
4. **Phase 4 (1 semana)**: Testes e bug fixes

---

## Apêndice A: Comparativo Detalhado de Cada Feature

| Feature | OLD | NEW | Gap |
|---------|-----|-----|-----|
| Solver Newton-Raphson | ✅ | ✅ | Nenhum |
| SVG Diagram Rendering | ✅ | ✅ | Nenhum (básico) |
| Bus/Generator/Load/Branch Editor (UI) | ✅ Complex | ✅ Basic | Moderado |
| Toolbar com 10+ tools | ✅ | ❌ | Alto |
| Diagram zoom controls | ✅ | ❌ | Moderado |
| Label toggle panel | ✅ | ❌ | Alto |
| Display mode selector | ✅ | ❌ | Alto |
| Fullscreen support | ✅ | ❌ | Moderado |
| Keyboard shortcuts | ✅ | ❌ | Moderado |
| Drag-reposition labels | ✅ | ❌ | Moderado |
| Demo models (8-bus, 40-bus) | ✅ | ❌ | Baixo |
| Save/Load/Share models | ✅ | ⚠️ Partial | Baixo |
| Load model selector (const P vs Z) | ✅ | ❌ | Baixo |
| Shunt equipment management | ✅ | ❌ | Moderado |
| Base kV rebasing | ✅ | ❌ | Baixo |
| PST (Phase-shifting transformer) | ✅ | ❌ | Moderado |
| Zgen (generator impedance) | ✅ | ❌ | Baixo |
| Generator limits (P min/max, Q min/max) | ✅ | ❌ | Baixo |
| Convergence diagnostics | ✅ | ✅ | Nenhum |
| Results history tracking | ❌ | ✅ | Nenhum (NEW feature) |
| Protection settings UI | ❌ | ✅ | Nenhum (NEW feature) |
| Help system | ❌ | ✅ | Nenhum (NEW feature) |
| Modular architecture | ❌ | ✅ | Nenhum (NEW feature) |

---

**Conclusão**: A NEW é uma "ferramenta especializada em Newton-Raphson com controles básicos", NÃO uma "migração da OLD". Para atingir feature parity com a OLD são necessários ~270-310h adicionais focando em diagram editing, equipment management avançado, e visualizações. A Opção C (Híbrida) oferece máximo valor com esforço realista (~150h, 3-4 semanas).

