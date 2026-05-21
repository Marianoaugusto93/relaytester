# ROTEIRO_TESTE - Plano de Teste Manual para Phase 9

**Data**: 2026-05-18  
**Projeto**: RelaytTester (Simulador de Relé de Proteção)  
**Versão**: Phase 9 (Manual Browser Testing)  
**Tempo Estimado**: 2-3 horas

---

## Pré-Requisitos

### Setup Inicial (5 minutos)

```powershell
# No terminal (Windows):
cd C:\Users\augus\Documentos\claude\relaytester
npm run dev
# Aguarde: "Local: http://localhost:5173"

# No navegador Chrome:
1. Abrir http://localhost:5173
2. Aguardar carregamento (< 2s)
3. Pressionar F12 (DevTools)
4. Aba "Application" → "Storage" → "Local Storage"
5. Clicar "Clear All" (limpar localStorage)
6. Fechar DevTools (pressionar F12 novamente)
7. Recarregar página (F5)
8. Verificar Console: 0 erros visíveis
```

### Verificação de Pré-Requisito

- [ ] Dev server rodando em http://localhost:5173
- [ ] Chrome aberto, localStorage limpo
- [ ] Aplicação carregada, RELAY tab visível por padrão
- [ ] Console mostra "Building..." completado

---

## SEÇÃO A: Cenários Educacionais (7 Testes × 5 min = 35 minutos)

Cada cenário educacional segue o mesmo fluxo:

### Teste Padrão por Cenário

#### Passo 1: Carregar Cenário (1 min)
1. Na aba RELAY, scroll na sidebar esquerda ("Left Sidebar")
2. Localizar botão do cenário (ex: "3-Ph Fault")
3. Clicar no botão
4. **Verificar**:
   - [ ] Injection Band (topo) se popula com valores de phasors
   - [ ] Corrente (CURRENT): 3 valores (Ia, Ib, Ic) aparecem
   - [ ] Exemplo esperado para 3-Ph: Ia=5.0, Ib=5.0, Ic=5.0 (±5%)
   - [ ] SettingsPanel direita atualiza com proteções (check one: ex, "50-1" deve estar selecionado)
   - [ ] Console: 0 erros

#### Passo 2: Injetar e Verificar Trip (3 min)
1. Clicar botão [▶ Injetar] (verde, canto inferior)
2. **Observar**:
   - [ ] Status muda para "● Injeção" (ponto animado em vermelho)
   - [ ] TRIP timer inicia contagem (0.000s → 0.050s → ...)
   - [ ] Phasor values permanecem constantes na Injection Band
3. Aguardar até 5 segundos
4. **Verificar trip**:
   - [ ] TRIP timer para de contar (ex: "TRIP timer 0.050s")
   - [ ] Status volta para "● Parado"
   - [ ] **Comparar com valor esperado** (vide tabela abaixo)
   - [ ] Tolerância: ±10% do tempo esperado
5. Clicar [↺ Reset Fault] (neutro)
6. **Verificar reset**:
   - [ ] TRIP timer retorna para 0.000s
   - [ ] Status mostra "● Parado"
   - [ ] Pronto para próxima injeção

#### Passo 3: Exportar COMTRADE (1 min)
1. Clicar [⚡ Calculador] (laranja, canto inferior direito)
2. **Modal "Fault Calculator" abre**
3. Scroll para "Export COMTRADE"
4. Clicar botão "Export COMTRADE" (verde)
5. **Verificar download**:
   - [ ] Browser baixa arquivo ZIP
   - [ ] Nome similar: `relayed_trip_TIMESTAMP.zip`
6. Extrair ZIP localmente
7. **Verificar conteúdo**:
   - [ ] Arquivo `.cfg` existe (configuração)
   - [ ] Arquivo `.dat` existe (dados analógicos e digitais)
   - [ ] Arquivo `.hdr` existe (header/metadados)
8. Abrir `.cfg` em editor de texto
9. **Verificar seção de canais** (deve ter 8 canais analógicos):
   ```
   [Analog Channels]
   1,IA,,A,1.0,0.0,,
   2,IB,,A,1.0,0.0,,
   3,IC,,A,1.0,0.0,,
   4,IGS,,A,1.0,0.0,,
   5,VA,,V,1.0,0.0,,
   6,VB,,V,1.0,0.0,,
   7,VC,,V,1.0,0.0,,
   8,VN,,V,1.0,0.0,,
   ```
   - [ ] Todos 8 canais presentes
10. Fechar modal (ESC ou X)
11. **Verificar estado da app**: Nenhuma mudança visual após modal fechar

---

### Tabela de Cenários Esperados

| # | Cenário | Ia (Exp) | Ib (Exp) | Ic (Exp) | Va (Exp) | Func Esperada | Tempo Esperado | Tol (IEC Jitter) |
|---|---------|----------|----------|----------|----------|---------------|----------------|----------|
| 1 | 3-Ph Fault | 5.0A | 5.0A | 5.0A | 66.0V | 50-1 | 0.050s | 0.030–0.070s¹ |
| 2 | L-G Fault | 3.5A | 0.3A | 0.3A | 50.0V | 50N-1 | 0.050s | 0.030–0.070s¹ |
| 3 | L-L Fault | 4.0A | 4.0A | 0.2A | 55.0V | 50-1 | 0.050s | 0.030–0.070s¹ |
| 4 | Inrush | 4.0A | 4.0A | 4.0A | 66.0V | 51-1 | 1.089s | 0.980–1.198s² |
| 5 | Undervolt | 1.0A | 1.0A | 1.0A | 46.5V | 27-1 | 1.000s | 0.900–1.100s |
| 6 | Underfreq | 1.5A | 1.5A | 1.5A | 66.4V | 81U-1 | 1.000s | 0.900–1.100s |
| 7 | Directional | 3.0A | 0.5A | 0.5A | 40.0V | 67-1 | 0.300s | 0.270–0.330s |

**Legenda**:
- Exp = Valores esperados (±5% tolerância na leitura)
- Func = Função de proteção esperada que dispara
- Tempo = Tempo esperado até trip
- Tol = Faixa de tolerância
  - ¹ Funções 50/50N (instantâneas) usam jitter IEC ±20ms absolute (não ±10% relativo)
  - ² Função 51 (inrush) timeDial=0.089 (IEC Very Inverse): t = 0.089 × 13.5 / (M-1) ≈ 1.089s @ M=2

---

### Checklist: Cenários Educacionais

- [ ] **Cenário 1 (3-Ph)**: Phasors ✓ | Trip ✓ | COMTRADE ✓
- [ ] **Cenário 2 (L-G)**: Phasors ✓ | Trip ✓ | COMTRADE ✓
- [ ] **Cenário 3 (L-L)**: Phasors ✓ | Trip ✓ | COMTRADE ✓
- [ ] **Cenário 4 (Inrush)**: Phasors ✓ | Trip ✓ | COMTRADE ✓
- [ ] **Cenário 5 (Undervolt)**: Phasors ✓ | Trip ✓ | COMTRADE ✓
- [ ] **Cenário 6 (Underfreq)**: Phasors ✓ | Trip ✓ | COMTRADE ✓
- [ ] **Cenário 7 (Directional)**: Phasors ✓ | Trip ✓ | COMTRADE ✓

**Tempo Decorrido**: ___ min / 35 min

---

## SEÇÃO B: Teste de Regressão - Phase 6-8 (20 minutos)

### B.1: Waveform Display (5 min)

1. Na aba RELAY, topbar
2. Clicar ícone 📊 (Waveform button)
3. **Modal abre**: "Live Waveform"
   - [ ] Header "Live Waveform" visível
   - [ ] Canvas com 3 sinusoides (3 fases) visível
   - [ ] Legenda: IA (vermelho), IB (verde), IC (azul)
4. Clicar [▶ Injetar] novamente
5. **Observar durante injeção**:
   - [ ] Waveform se move em tempo real (sinusoides avançam)
   - [ ] Escala de tempo no eixo X muda conforme progride
6. Clicar [■ Parar]
7. **Waveform congela**:
   - [ ] Oscilação para
   - [ ] Marcador de trip aparece (linha vertical vermelha?)
8. **Controles**:
   - [ ] Botão [▶ Play]: sinusoides resumem em tempo real
   - [ ] Botão [⏸ Pause]: sinusoides pausam, podem resumir
   - [ ] Speed selector (0.25×, 1×, 4×): waveform velocidade muda
   - [ ] Zoom selector (20ms, 100ms, 500ms): eixo X muda escala
9. Clicar [↓ Export PNG]
   - [ ] PNG file baixa (nome similar: `waveform_TIMESTAMP.png`)
10. Fechar modal (ESC ou X)

**Checklist**:
- [ ] Modal abre/fecha sem erros
- [ ] Sinusoides renderizam durante injeção
- [ ] Controles Play/Pause/Speed/Zoom funcionam
- [ ] PNG export funciona
- [ ] Console: 0 erros

---

### B.2: Language Selector (3 min)

1. Topbar, lado direito
2. Clicar dropdown "Português" (ou PT flag)
3. **Menu abre** com opções:
   - [ ] Português
   - [ ] English
   - [ ] Español
4. Clicar "English"
5. **Verificar mudanças visuais**:
   - [ ] SettingsPanel labels mudam para EN:
     - "Current Injection" em vez de "Injeção de Corrente"
     - "Voltage Injection" em vez de "Injeção de Tensão"
     - Botões: "Load Scenario", "Save", etc. em EN
   - [ ] Injection Band labels: "MAG" permanece, "ÂNG" → "ANGLE"
   - [ ] Scenario buttons: "3-Ph Fault" (já em EN)
   - [ ] Measures Panel tabs: "Measurements" (em vez de abreviação)
6. Clicar novamente → "Español"
7. **Verificar**: UI muda para ES (títulos em espanhol)
8. Clicar novamente → "Português"
9. **Verificar**: UI volta para PT
10. Abrir F12 Console durante testes de language
    - [ ] 0 erros em todas as mudanças

**Checklist**:
- [ ] Dropdown abre/fecha
- [ ] 3 idiomas disponíveis (PT, EN, ES)
- [ ] Switching não causa erros
- [ ] UI text updates corretamente
- [ ] Console: 0 erros

---

### B.3: Help Modal (3 min)

1. Topbar, lado esquerdo
2. Clicar ícone (?) — Help button
3. **Modal "Help" abre**
   - [ ] Título "Help" visível
   - [ ] 6 abas/botões aparecem:
     - [ ] Getting Started
     - [ ] Wiring Basics
     - [ ] Phasors 101
     - [ ] Protection Settings
     - [ ] Relay Outputs
     - [ ] COMTRADE Export
4. Clicar cada aba e **verificar conteúdo**:
   - [ ] Cada aba tem texto descritivo
   - [ ] Sem erros de renderização
   - [ ] Texto legível (fonte e cores OK)
5. Fechar modal (ESC, botão X, ou clique fora)
   - [ ] Modal desaparece
   - [ ] App permanece em estado anterior
6. Reabrir help (?) — **verificar que reabre sem erros**
7. Pressionar ESC (dentro do modal)
   - [ ] Confirm dialog: "Descartar ajuda?" / "Discard help?"
   - [ ] Clicar "Cancel" — modal permanece
   - [ ] Pressionar ESC novamente
   - [ ] Clicar "Yes" / "Confirm" — modal fecha
8. Console durante toda sequência:
   - [ ] 0 erros

**Checklist**:
- [ ] Modal abre/fecha sem erros
- [ ] 6 tópicos presentes
- [ ] Conteúdo legível em todos tópicos
- [ ] Confirm dialog funciona
- [ ] Console: 0 erros

---

### B.4: Tutorial Onboarding (3 min)

1. **Abrir aba anônima/privada do Chrome**:
   - `Ctrl+Shift+N` (nova aba privada)
   - Digitar http://localhost:5173
   - Aguardar app carregar
2. **Tutorial deve auto-iniciar após ~2s**:
   - [ ] Overlay semi-transparente aparece
   - [ ] Elemento destacado (clip-path brilho)
   - [ ] Caixa de texto com instrução (ex: "Selecione um cenário")
   - [ ] Botões: [← Anterior] [Próximo →] [Pular]
3. **Navegar tutorial**:
   - [ ] Clique [Próximo →] 6 vezes (6 steps total)
   - [ ] Cada step mostra novo elemento destacado
   - [ ] Instrução muda conforme progride
   - [ ] Step 6 é final (botão muda para "Fechar" ou similar)
4. Clicar [Fechar] ou [Pular]
   - [ ] Modal desaparece
   - [ ] App volta a funcionar normalmente
5. Recarregar página (F5)
   - [ ] Tutorial **NÃO** reinicia (localStorage)
   - [ ] App carrega normalmente
6. Abrir aba privada **outra vez** (nova localStorage)
   - [ ] Tutorial reinicia ✓
7. Console durante tutorial:
   - [ ] 0 erros

**Checklist**:
- [ ] Tutorial auto-inicia em nova aba privada
- [ ] 6 steps navegáveis
- [ ] Clip-path highlighting funciona
- [ ] localStorage persistence funciona (F5 não reinicia)
- [ ] Console: 0 erros

---

### B.5: Custom Scenarios (3 min)

1. Na aba RELAY, SettingsPanel (direita)
2. Scroll até "My Scenarios" section
3. **Form visível**:
   - [ ] Campo "Scenario Name" (input text)
   - [ ] Campo "Description" (textarea)
   - [ ] Botão "Save Scenario" (azul/verde)
4. **Criar scenario**:
   - Nome: "Test Custom 1"
   - Descrição: "My custom test scenario"
   - Clicar "Save Scenario"
5. **Verificar em "My Scenarios" list**:
   - [ ] "Test Custom 1" aparece na lista
   - [ ] Buttons: [Carregar] [Editar] [Deletar] [Exportar]
6. Clicar [Carregar]
   - [ ] Settings carregam
   - [ ] Pronto para injetar
7. Clicar [Editar]
   - [ ] Form se popula com valores
   - [ ] Modificar descrição: "Modified"
   - [ ] Clicar "Save Scenario"
   - [ ] Descrição muda na lista
8. Clicar [Exportar]
   - [ ] Arquivo JSON baixa (nome: `scenario_Test_Custom_1.json`)
9. Clicar [Deletar]
   - [ ] Confirm dialog aparece
   - [ ] Clicar "Yes"
   - [ ] Scenario desaparece da lista
10. Recarregar página (F5)
    - [ ] Scenarios persistem (localStorage)
11. Console durante CRUD:
    - [ ] 0 erros

**Checklist**:
- [ ] Form renders sem erros
- [ ] Create funciona
- [ ] Load funciona
- [ ] Edit funciona
- [ ] Delete funciona
- [ ] Export funciona
- [ ] localStorage persistence funciona
- [ ] Console: 0 erros

**Tempo para Seção B**: ___ min / 20 min

---

## SEÇÃO C: Testes de Caso Extremo (10 minutos)

### C.1: Injeção Longa (5 min)

1. Carregar um cenário (ex: 3-Ph Fault)
2. Clicar [▶ Injetar]
3. **Deixar rodando por 60 segundos**
4. **Monitorar**:
   - [ ] Counter continua incrementando normalmente
   - [ ] Sem travamentos ou saltos (como "0.050s" → "0.000s")
   - [ ] Status permanece "● Injeção"
5. F12 → Performance → Memory:
   - [ ] Memória não cresce indefinidamente (< 50MB increase)
6. Clicar [■ Parar]
   - [ ] Para imediatamente
7. Clicar [↺ Reset]
   - [ ] Retorna a 0.000s

**Checklist**:
- [ ] 60s injeção roda sem travamentos
- [ ] Memória estável (< 50MB delta)
- [ ] Stop/Reset funcionam

---

### C.2: Troca Rápida de Cenários (3 min)

1. Carregar Cenário A (3-Ph)
2. [▶ Injetar] → aguardar trip
3. [■ Parar] → [↺ Reset]
4. Carregar Cenário B (L-G) — **sem recarregar página**
5. [▶ Injetar] → aguardar trip
6. [■ Parar] → [↺ Reset]
7. Carregar Custom Scenario (se houver uma salva)
8. [▶ Injetar] → aguardar trip
9. **Verificar**: Sem erros em nenhuma troca

**Checklist**:
- [ ] Troca A → B → Custom sem erros
- [ ] Console: 0 erros
- [ ] Injeções funcionam em cada cenário

---

### C.3: Persistência após Refresh (2 min)

1. Criar 3 custom scenarios (ex: "Test 1", "Test 2", "Test 3")
2. Verificar se aparecem em "My Scenarios"
3. Recarregar página (F5)
4. **Verificar**: Todos 3 scenarios ainda estão na lista

**Checklist**:
- [ ] localStorage persistence funciona
- [ ] 3 scenarios persistem após F5

**Tempo para Seção C**: ___ min / 10 min

---

## SEÇÃO D: Verificação Final (5 minutos)

1. **Abrir F12 Console** (última vez)
2. **Verificar**:
   - [ ] 0 erros (vermelho)
   - [ ] 0 warnings (amarelo) — ignore deprecation warnings de React
3. **Build size**:
   - [ ] `npm run build` no terminal
   - [ ] Verificar output: `429.02 kB (112.11 kB gzip)` ou menor
4. **Git status**:
   - [ ] `git status` → sem mudanças uncommitted em src/

**Checklist**:
- [ ] Console: 0 erros, 0 warnings
- [ ] Build: sucesso
- [ ] Git: clean

---

## Tabela de Resultados

| Teste | Resultado | Notas |
|-------|-----------|-------|
| Cenário 1 (3-Ph) | PASS / FAIL | Tempo: ___ |
| Cenário 2 (L-G) | PASS / FAIL | Tempo: ___ |
| Cenário 3 (L-L) | PASS / FAIL | Tempo: ___ |
| Cenário 4 (Inrush) | PASS / FAIL | Tempo: ___ |
| Cenário 5 (Undervolt) | PASS / FAIL | Tempo: ___ |
| Cenário 6 (Underfreq) | PASS / FAIL | Tempo: ___ |
| Cenário 7 (Directional) | PASS / FAIL | Tempo: ___ |
| Waveform Display | PASS / FAIL | |
| Language Selector | PASS / FAIL | |
| Help Modal | PASS / FAIL | |
| Tutorial | PASS / FAIL | |
| Custom Scenarios | PASS / FAIL | |
| Long Injection | PASS / FAIL | |
| Scenario Switching | PASS / FAIL | |
| localStorage Persist | PASS / FAIL | |
| Build Size | PASS / FAIL | Size: ___ |
| Console Errors | PASS / FAIL | Count: ___ |

---

## Assinatura

**Testador**: ___________________  
**Data**: 2026-05-18  
**Navegador/Versão**: Chrome 126 (ou ________)  
**Sistema**: Windows 11 (ou ________)  
**Status Final**: ☐ READY FOR PRODUCTION | ☐ BLOCKED

**Se BLOCKED**: Descrever bloqueador abaixo:

```
Bloqueador:
_________________________________________________________________
_________________________________________________________________
Ação: Criar Phase 8.x para fix → Re-testar → Commit separado
```

---

## Notas

- Cada teste leva ~5 min (7 cenários = 35 min)
- Teste de regressão = 20 min (5 features)
- Casos extremos = 10 min
- Verificação final = 5 min
- **Total: ~70 minutos (1h 10min)**
- Prever 2-3 horas com pausas e debug conforme necessário
