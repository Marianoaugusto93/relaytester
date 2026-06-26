# Plano Realista de Migração: Opção C (Híbrida)

**Objetivo**: Alcançar 80% de feature parity com a OLD em 6-8 semanas  
**Escopo**: 120-150 horas de desenvolvimento  
**Prioridade**: Funcionalidades críticas primeiro  

---

## FASE 1: MULTI-PÁGINA (2 semanas - 40h)

### Objetivo
Transformar single-page em multi-página (RELAY → CAMPO → PAINEL → SIMULADOR)

### Tarefas
- [ ] Implementar navegação entre tabs (sem React router, vanilla JS)
- [ ] Estruturar pages:
  - `relay-page.html` - Proteção de relé
  - `campo-page.html` - Simulação elétrica
  - `painel-page.html` - Painel do disjuntor
  - `simulador-page.html` - Newton-Raphson (atual)
- [ ] Compartilhar state entre páginas (IndexedDB ou window.appState)
- [ ] Navegação com botões e menu

### Resultado
- Versão funcional com 4 páginas
- State persistido entre navegação
- Estrutura pronta para implementação de cada página

---

## FASE 2: SIMULAÇÃO ELÉTRICA - CAMPO (3 semanas - 50h)

### Objetivo
Implementar simulação de bancada com validação de conexões

### Tarefas

#### 2.1: Interface da Bancada (20h)
- [ ] Desenhar componentes:
  - RÉGUA DE BORNES (16 terminais)
  - MALETA DE TESTE (4 saídas: I1, V1, BI1, BO1)
  - CHAVE DE AFERIÇÃO (10 polos)
- [ ] Inputs para conexões (drag-drop ou text inputs)
- [ ] Validação de conexões:
  - Evitar corrente em tensão
  - Evitar curto-circuito
  - Evitar conexões inválidas

#### 2.2: Gráfico Union-Find (15h)
- [ ] Implementar buildElectricalGraph() (copiado de CampoPage.jsx)
- [ ] Determinar conectividade elétrica
- [ ] Calcular relações de nós

#### 2.3: Integração Relay-Campo (15h)
- [ ] computeRelayReadings() - cálculo de leituras baseado em topologia
- [ ] Mapear conexões → leituras de relé
- [ ] Validar detecção de viagem no CB

### Resultado
- CAMPO completamente funcional
- Validação elétrica de conexões
- Integração com lógica de relé

---

## FASE 3: LÓGICA DE PROTEÇÃO REAL (3 semanas - 60h)

### Objetivo
Implementar cálculo real de proteção com curvas e histórico

### Tarefas

#### 3.1: Curvas IEC/ANSI (25h)
- [ ] Copiar curves.js da OLD
- [ ] Implementar curvas:
  - IEC (Standard, Very Inverse, Extremely Inverse)
  - ANSI (Std, Very, Extremely)
  - IEEE (Std, Very, Extremely)
  - Definite-Time (tempo fixo)
- [ ] Funções de cálculo de tempo de viagem

#### 3.2: Cálculo de Viagem (20h)
- [ ] Função evaluateTrip(Ia, Ib, Ic, Va, Vb, Vc, protSettings)
- [ ] Para cada função (50, 51, 50N, 51N, 67, 67N, 27, 59):
  - Comparar leitura vs pickup
  - Se pickup atingido → calcular tempo de viagem
  - Se tempo de viagem atingido → TRIP
- [ ] Detecção de viagem no CB

#### 3.3: Histórico de Viagens (15h)
- [ ] Armazenar cada viagem com:
  - Função (50, 51, etc.)
  - Timestamp
  - Valores de leitura (Ia, Ib, Ic, Va, Vb, Vc)
  - Tempo de viagem calculado
  - Curva utilizada
- [ ] Exibir histórico em timeline
- [ ] Exportar para CSV

### Resultado
- Proteção funcional com curvas reais
- Cálculo preciso de tempo de viagem
- Histórico rastreável

---

## FASE 4: PAINEL DO DISJUNTOR (2 semanas - 30h)

### Objetivo
Visualizar e controlar painel com diagram unifilar

### Tarefas
- [ ] Desenhar diagram unifilar simplificado
- [ ] Estados do CB: aberto, fechado, latch
- [ ] Indicadores de status (LEDs)
- [ ] Botão de comando de fechamento
- [ ] Integração com lógica de proteção:
  - Proteção ativa → abre CB
  - Botão → fecha CB
  - CB aberto e viagem → latch ativo

### Resultado
- PAINEL funcional e integrado
- Visualização clara de estados
- Interação realista com proteção

---

## FASE 5: HELP/TUTORIAL/I18N (1 semana - 20h)

### Objetivo
Documentação e multi-idioma básicos

### Tarefas
- [ ] Help modal com 4-6 tópicos:
  - Como usar CAMPO
  - Como configurar proteção
  - Como interpretar resultados
  - FAQ
- [ ] Tutorial interativo (3-4 passos)
- [ ] Suporte para PT/EN (2 idiomas)
- [ ] Selector de idioma

### Resultado
- Usuário novo pode aprender
- Interface em 2 idiomas

---

## FASE 6: INTEGRAÇÃO E TESTES (2 semanas - 40h)

### Objetivo
Tudo funcionando junto, sem bugs críticos

### Tarefas
- [ ] Teste end-to-end:
  - CAMPO: conectar, validar, calcular leituras
  - RELAY: configurar, calcular viagem, registrar histórico
  - PAINEL: visualizar estado, interagir com CB
  - SIMULADOR: carregar cenários, resolver, exportar
- [ ] Teste de integração:
  - Viagem no RELAY abre CB no PAINEL
  - Leituras do CAMPO aparecem no RELAY
  - Histórico de viagens visível
- [ ] Performance:
  - Nenhuma lag na interação
  - Carregamento < 2s
- [ ] Bug fixes

### Resultado
- Sistema integrado e funcional
- 80% feature parity com OLD

---

## FASES OPCIONAIS (Se houver tempo)

### FASE 7A: Visualizações Avançadas (2 semanas - 30h)
- [ ] Waveform display (forma de onda trifásica)
- [ ] Phasor diagram (diagrama fasorial)
- [ ] Fault calculator (calculador de falta)
- [ ] Scenario builder visual

### FASE 7B: Melhorias Newton-Raphson (1 semana - 15h)
- [ ] Mais cenários IEEE (30-bus, 57-bus)
- [ ] Otimizações de performance
- [ ] Gráficos de convergência

---

## CRONOGRAMA RESUMIDO

```
Semana 1-2:   Multi-página + estrutura
Semana 3-5:   CAMPO (simulação elétrica)
Semana 5-7:   RELAY (proteção com curvas)
Semana 7-8:   PAINEL (disjuntor)
Semana 8-9:   Help/Tutorial/i18n
Semana 9-10:  Integração + testes
─────────────────────────────────
Total:        10 semanas = 6-8 de work (120-150h)
```

---

## SUCESSO = QUANDO...

✅ **CAMPO funcional**: 
- Conexões validadas
- Leituras de relé calculadas
- Integrado com RELAY

✅ **RELAY funcional**:
- Curvas reais (IEC/ANSI/IEEE)
- Cálculo de tempo de viagem
- Histórico de viagens

✅ **PAINEL funcional**:
- Diagram unifilar
- Integrado com proteção
- Interativo

✅ **SIMULADOR funcional**:
- Newton-Raphson (já está)
- Cenários carregando (já está)

✅ **80% FEATURE PARITY**:
- OLD faz 100% das funcionalidades
- NEW faz 80% das mesmas funcionalidades
- Diferenças aceitáveis (ex: sem analytics, sem scenario builder visual)

---

## RISCOS E MITIGAÇÃO

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Complexidade de CAMPO | Alto | Copiar código de CampoPage.jsx |
| Curvas de proteção complexas | Alto | Copiar curves.js e protection.js |
| State compartilhado entre páginas | Médio | Usar window.appState + localStorage |
| Browser compatibility | Médio | Testar em Chrome/Firefox/Safari |
| Performance do gráfico Union-Find | Baixo | Cachear cálculos |

---

## DECISÃO NECESSÁRIA

**Antes de começar**: 
Você quer seguir este plano (Opção C - Híbrida)?
- ✅ Sim, aproximar ao máximo (~240h completo)
- ⚠️ Parcial, fazer Phase 1-4 (~120h, 80% parity)
- ❌ Não, manter NEW como especializada em Newton-Raphson

**Escolha**: _______________

