# Análise Completa: Ferramenta OLD (React) vs NEW (Refactored HTML)

**Data**: 2026-06-05  
**Status**: Análise Honesta das Lacunas  

---

## 1. ESTRUTURA GERAL

### Ferramenta OLD (React)
- **App.jsx**: 506 linhas (núcleo)
- **CampoPage.jsx**: ~400 linhas (simulador elétrico)
- **PainelPage.jsx**: ~300 linhas (painel do disjuntor)
- **SettingsPanel.jsx**: ~250 linhas (configurações de proteção)
- **protection.js**: ~500 linhas (lógica de proteção)
- **defaults.js**: ~200 linhas (configurações padrão)
- **comtrade.js**: ~100 linhas (exportação COMTRADE)
- **Múltiplas páginas**: RelePage, TestsPage, SimuladorNRPage, CoordenogramaPage
- **Hooks customizados**: useSimulation, use27Monitor, useTranslation
- **Contextos**: HelpProvider, LanguageProvider, ArtifactBusProvider
- **Componentes lazy-loaded**: HelpModal, Tutorial, FaultCalculator, PhasorDiagram, WaveformDisplay, AnalyticsDashboard

**Total estimado**: ~3000+ linhas de JavaScript + React

### Ferramenta NEW (Refactored HTML)
- **powerflow-refactored.html**: 1544 linhas (tudo em um arquivo)
- Sem separação de componentes
- Sem hooks
- Sem contextos
- Sem modularidade

---

## 2. O QUE EXISTE NA FERRAMENTA OLD

### A. Simulação Elétrica (CAMPO Tab)
✅ **Existe na OLD**:
- Simulador de bancada com suitcase de teste
- Chave de aferição (10 polos)
- Terminal block (16 bornes)
- Conexões elétricas com validação
- Gráfico Union-Find para determinar conectividade elétrica
- Cálculo de leituras de relé baseado na conectividade
- Detecção de viagem no disjuntor

❌ **NÃO existe na NEW**:
- Nenhuma simulação elétrica
- Sem validação de conexões
- Sem gráfico de conectividade
- Sem integração com o solver

### B. Proteção de Relé (RELAY Tab)
✅ **Existe na OLD**:
- 10+ funções de proteção (50, 51, 50N, 51N, 67, 67N, 27, 59, 47, 79, 81U, 81O, 32)
- Curvas de tempo-sobrecorrente (IEC, ANSI, IEEE, DT)
- Configuração de pickup, time dial, reset
- Editação em tempo real das configurações
- Cálculo de tempo de viagem previsto
- Simulação de viagem com evento log
- Histórico de viagens com timestamps
- Integração com CB (disjuntor)

❌ **NÃO existe na NEW**:
- Apenas UI para 50, 51, 27, 59
- Sem lógica de cálculo de viagem
- Sem curvas de tempo-sobrecorrente
- Sem histórico de viagens
- Sem integração com CB

### C. Painel do Disjuntor (PAINEL Tab)
✅ **Existe na OLD**:
- Diagrama unifilar com disjuntor
- Diagram de comando (ladder)
- Estados do disjuntor (aberto, fechado, latch)
- Comando de fechamento via botão
- Indicadores de estado (LED)
- Integração com proteção de relé

❌ **NÃO existe na NEW**:
- Nenhuma visualização de painel
- Sem diagram unifilar
- Sem controles de CB
- Sem integração com lógica de proteção

### D. Solver Newton-Raphson (SIMULADOR NR Tab)
✅ **Existe na OLD**:
- Toggle OLD vs NEW (duas versões)
- Solver completo em JavaScript
- Visualização de diagrama unifilar
- Tabelas de resultados (buses, geradores, cargas, fluxo)
- Cenários pré-definidos (3-Ph, L-G, L-L, inrush, etc.)
- Importação/exportação JSON
- Controles de tap transformador
- Diagnósticos de convergência

✅ **TAMBÉM existe na NEW** (Phases 9-13):
- Solver Newton-Raphson
- Scenarios carregados
- Equipmento editor
- Controles de propriedades
- Resultados de convergência

### E. Outros Recursos
✅ **Existe na OLD**:
- Help modal (6 tópicos)
- Tutorial interativo (6 passos)
- Selector de idioma (PT/EN/ES)
- Waveform display (forma de onda trifásica)
- Phasor diagram (diagrama fasorial)
- Fault calculator (calculador de falta)
- Scenario builder visual
- Analytics dashboard
- Multi-página (Relay, Campo, Painel, Tests, Simulador, etc.)
- Sistema de eventos com timeline
- COMTRADE export

❌ **NÃO existe na NEW**:
- Help modal (básico)
- Sem tutorial
- Sem multi-idioma
- Sem waveform display
- Sem phasor diagram
- Sem fault calculator
- Sem scenario builder visual
- Sem analytics
- Sem evento log/timeline
- Sem COMTRADE (básico)

---

## 3. LACUNAS CRÍTICAS NA NEW

### Tier 1: CRÍTICA (Bloqueia uso)
1. **Sem simulação elétrica (CAMPO)**
   - Sem validação de conexões
   - Sem gráfico de conectividade
   - Sem cálculo de leituras baseado em topologia

2. **Sem proteção de relé real (RELAY)**
   - Sem cálculo de tempo de viagem
   - Sem curvas IEC/ANSI/IEEE
   - Sem histórico de viagens
   - Sem integração com CB

3. **Sem painel do disjuntor (PAINEL)**
   - Sem visualização de diagram unifilar
   - Sem estados e controles de CB

4. **Sem multi-página**
   - Tudo em uma página
   - Sem navegação entre tabs

### Tier 2: IMPORTANTE (Reduz funcionalidade)
5. **Sem help/tutorial**
   - Usuário novo não sabe usar

6. **Sem multi-idioma**
   - Apenas inglês

7. **Sem histórico de eventos/timeline**
   - Sem rastreabilidade de ações

8. **Sem COMTRADE export real**
   - Apenas stub básico

9. **Sem scenario builder visual**
   - Apenas selector

10. **Sem visualizações avançadas**
    - Sem waveform
    - Sem phasor diagram
    - Sem fault calculator

---

## 4. ESTIMATIVA DE ESFORÇO PARA FEATURE PARITY

| Recurso | Esforço | Prioridade |
|---------|---------|------------|
| Multi-página (Relay, Campo, Painel) | 40h | 🔴 CRÍTICA |
| Simulação elétrica (CAMPO) | 30h | 🔴 CRÍTICA |
| Lógica de proteção com curvas | 50h | 🔴 CRÍTICA |
| Painel disjuntor com diagram | 20h | 🔴 CRÍTICA |
| Integração Relay + Campo + Painel | 30h | 🔴 CRÍTICA |
| Help/Tutorial/i18n | 20h | 🟡 IMPORTANTE |
| Histórico de eventos | 10h | 🟡 IMPORTANTE |
| COMTRADE export real | 10h | 🟡 IMPORTANTE |
| Visualizações avançadas | 30h | 🟡 IMPORTANTE |
| **TOTAL** | **~240h** | **10-12 semanas** |

---

## 5. REALIDADE ATUAL

### O que a NEW faz bem:
- ✅ Solver Newton-Raphson funciona
- ✅ Importação/exportação de cenários
- ✅ Tabelas de resultados
- ✅ Animação de fluxo de potência

### O que a NEW não faz:
- ❌ Simulação de falhas com proteção real
- ❌ Validação elétrica de conexões
- ❌ Múltiplas páginas/tabs
- ❌ Lógica de proteção com curvas
- ❌ Integração com o painel do disjuntor
- ❌ Histórico de viagens de relé
- ❌ Help/Tutorial/Documentação
- ❌ Multi-idioma

---

## 6. RECOMENDAÇÃO

### Opção A: Completar a NEW para feature parity
**Esforço**: 240h (10-12 semanas)  
**Resultado**: Funcionalidade idêntica à OLD  
**Risco**: Alto (refactoring massivo)

**Fases necessárias**:
1. Multi-página (React router ou vanilla)
2. CAMPO: Simulação elétrica + validação
3. Integração Relay + Campo + Painel  
4. Proteção com curvas + histórico
5. Help/Tutorial/i18n
6. Visualizações avançadas

### Opção B: Manter NEW como "complemento ao OLD"
**Esforço**: Manutenção mínima  
**Resultado**: Ferramenta especializada apenas em Newton-Raphson  
**Risco**: Baixo, mas não é "migração"

### Opção C: Híbrido
**Esforço**: 120h (6-8 semanas)  
**Resultado**: 80% feature parity  
**Foco**: 
- Multi-página
- CAMPO simplificado
- Proteção com curvas básicas
- Help/Tutorial

---

## 7. PRÓXIMOS PASSOS RECOMENDADOS

1. **Decidir abordagem**: Qual opção? (A, B, ou C)
2. **Se Opção A/C**:
   - Refatorar para multi-página
   - Implementar CAMPO (simulação elétrica)
   - Adicionar lógica de proteção real
   - Integrar components
3. **Se Opção B**:
   - Manter como ferramenta especializada
   - Documentar limitações
   - Focar em qualidade do Newton-Raphson

---

**Conclusão**: A NEW é uma "ferramenta especializada em Newton-Raphson", NÃO uma "migração da OLD". Para true feature parity, são necessários ~240h adicionais, focando em simulação elétrica, multi-página, e proteção real.

