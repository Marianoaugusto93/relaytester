# Análise: Coordenograma FL Volts Proteção SEP v6.4.9 R13

## Resumo Executivo
Arquivo HTML single-page application (SPA) que implementa um **coordenograma de proteção de sistemas elétricos** com cálculos avançados, análise técnica integrada e geração de relatórios.

**Tamanho**: ~3.6k linhas | **Complexidade**: Alta | **Integrabilidade**: Média-Alta

---

## 📋 Estrutura do Arquivo Original

### 1. **CSS Inline** (linhas 7-327)
- **Tamanho**: ~320 linhas de CSS
- **Paleta Atual**: 
  - Background: `#070b12` / `#050913`
  - Accent: `#38bdf8` (cyan)
  - Orange: `#fb923c`
  - Text: `#f7fafc`
  - Secundária: Ouro `#D6A936`, Azul `#2F6FDB`

**Observação**: Paleta **parcialmente compatível** com projeto Relaytester. Accent cyan é idêntico.

### 2. **HTML Structure** (linhas 329-3335)
Multi-etapas com 8 seções principais:
1. **Dados da instalação** - Informações gerais
2. **Concessionária & curto-circuito** - Parâmetros de montante
3. **Transformadores** - Modelagem de trafos
4. **TC, TP & disjuntores** - Medição e proteção
5. **Ajustes Cliente** - Mini-blocos 50/51, 50N/51N, 51NS/51GS
6. **Parametrização** - Tabela final do relé
7. **Coordenograma** - Visualização gráfica
8. **Diagnóstico & Relatório** - Auditoria e emissão

**Componentes chave**:
- Sidebar com progresso (step-by-step wizard)
- Toolbar com ações (Calcular, Importar JSON, PDF, Pacote)
- Content area com formulários dinâmicos
- Canvas para coordenograma (renderização gráfica)

### 3. **JavaScript** (linhas 3335-3602)
3 scripts principais:
- **Script 1** (linhas ~600-3335): Core logic
  - Funções: `calcular()`, `calcData()`, `drawChart()`, `renderReport()`
  - Export/Import: `exportJson()`, `importJsonFile()`
  - Manipulação de fields: `paintField()`, `markChanged()`
  - Setup coordenograma: `setupCoordHover()`, `setupMenu2Blocks()`
  - Trafos: `addTrafoV507()`, `setTrafoV507()`, `dupTrafoV507()`, `delTrafoV507()`

- **Script 2** (linhas 3338-3602): Coordenograma R5 Audit
  - Event listeners para toggles (ON/OFF das curvas)
  - Repaint callbacks para redraw do gráfico
  - Visibilidade de curvas: `window.coordCurveVisibility`

---

## 🎨 Adaptações CSS Necessárias

| Elemento | Cor Atual | Sugestão Relaytester | Status |
|----------|-----------|----------------------|--------|
| Background | `#070b12` | Manter `#0e1015` (project var) | ✓ Compatível |
| Accent Primary | `#38bdf8` (cyan) | Manter `--accent` | ✓ Idêntico |
| Accent Secondary | `#2F6FDB` (azul) | Considerar `--accent2` | ⚠️ Similar |
| Orange | `#fb923c` | Manter `--orange` | ✓ Compatível |
| Gold | `#D6A936` | Substituir por `--orange` | 🔄 Refactor |
| Success | `#22c55e` | Manter `--green` | ✓ Compatível |
| Danger | `#ff5b63` | Manter `--red` | ✓ Compatível |

**Ação**: Substituir referências a `#D6A936` e `#d8b84f` (gold) por `var(--orange)` do projeto.

---

## 🏷️ Referências do Autor

**Encontradas**:
1. Linha 335: `<div class="dev">Eng. Eletricista Fagner Luiz</div>`
2. Linha 333: `<div class="brandBlock"><div class="brandOver">FL Volts Engenharia</div>`
3. Título: `FL Volts Proteção SEP v6.4.9 R13`
4. Meta titles em reportes e headers

**Ação**: 
- ❌ Remover `<div class="dev">Eng. Eletricista Fagner Luiz</div>`
- 🔄 Renomear marca: `FL Volts Engenharia` → `Relaytester` (ou similar)
- 🔄 Versionar como `v1.0` do módulo integrado

---

## 📦 Refatoração Proposta

### Estrutura de Arquivos
```
src/
├── coordenograma/
│   ├── CoordenogramaPage.jsx        (wrapper React)
│   ├── coordenograma.html           (HTML refatorado - template)
│   ├── coordenograma.css            (CSS extraído e adaptado)
│   ├── coordenograma.js             (JavaScript extraído)
│   ├── README.md                    (documentação)
│   └── example-data.json            (dados de exemplo)
```

### Passos de Refatoração
1. ✅ **Extrair CSS** → Remove inline styles, usa variáveis do projeto
2. ✅ **Extrair JavaScript** → Move lógica para .js externo
3. ✅ **Remover autor** → Limpa referências FL Volts / Fagner Luiz
4. ✅ **Adaptar tema** → CSS vars de paleta Relaytester
5. ✅ **Validação** → Testa funcionalidade principal (cálculos, coordenograma)

---

## ⚙️ Dependências & Funcionalidades Críticas

### Canvas Rendering
- Função `drawChart()` renderiza gráfico do coordenograma
- Usa Canvas API nativo (sem bibliotecas externas)
- Importação: Tela 7 do wizard

### Cálculos Complexos
- Funções: `calcular()`, `calcData()` 
- Domínio: Proteção de sistemas elétricos (IEC/ANSI)
- Interdependências: ~30+ campos relacionados

### Export/Import
- JSON: Export completo do estudo
- ZIP: Pacote técnico (opcional)
- PDF: Relatório rendered dinamicamente
- CSV: Parametrização

### Canvas de Coordenograma
- ID: `#coord`
- Renderização: Dinâmica via `drawChart()`
- Interação: Mouse hover com tooltip XY
- Modo: Light/dark toggle (`coordTheme`)

---

## 🔍 Análise de Integrabilidade

### Pontos Fortes
✅ Standalone (sem dependências externas de npm)  
✅ Modular (8 etapas independentes)  
✅ Export/Import bem definido  
✅ Cálculos determinísticos (bom para testes)  

### Desafios
⚠️ **Muito grande** (~3.6k linhas em um arquivo)  
⚠️ **JavaScript inline** complexo e interdependente  
⚠️ **Canvas rendering** pode ter conflitos com React  
⚠️ **Formulários** com 40+ campos dinâmicos  

### Recomendação de Integração
**Opção 1** (Recomendado): Iframe isolado
- Funciona como "app dentro do app"
- Sem conflitos de JS/CSS
- Simples para integrar
- Menos ideal para UX unificada

**Opção 2**: React Wrapper + Refactoring
- Mais trabalho inicial (~8-12h)
- Melhor integração visual
- Reutilização de componentes
- Facilita testes e manutenção futura

---

## 📊 Estimativa de Esforço

| Tarefa | Tempo | Complexidade |
|--------|-------|--------------|
| Extrair CSS | 30 min | Baixa |
| Extrair JS | 1h | Média |
| Remover autor | 15 min | Baixa |
| Adaptar cores | 45 min | Baixa |
| Validar funcionalidade | 1h | Média |
| **Total** | **~3.5h** | **Média** |

---

## ✅ Próximos Passos

1. **Criar versão refatorada** com CSS/JS separados
2. **Validar** no navegador (funcionalidade principal)
3. **Demonstrar** visualmente para aprovação do usuário
4. **Decidir** integração (Iframe vs React Wrapper)
5. **Implementar** conforme decisão

---

## 📝 Notas Técnicas

- Arquivo original: `FL Volts Proteção SEP v6.4.9 R13 — Layout Didático do Coordenograma.html`
- Encoding: UTF-8
- Linguagem interface: Português (Brasil)
- Compatibilidade: ES6+ JavaScript, Canvas, LocalStorage
- Browser minimum: Chrome 60+, Firefox 55+, Safari 11+

