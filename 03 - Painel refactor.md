# PR 3/3 — RelayLab 360 · PAINEL

Refactor de layout da aba **Painel** (`PainelPage.jsx` e componentes ligados).
Mantém paleta e tipografia. Não trocar libs. Apenas redistribuir e simplificar.

---

## Problemas observados

- Card "Disjuntor" tem 6 sub-elementos competindo (SIEMENS / SION / 3 indicadores circulares MOLA/TRIP/POS / texto técnico / botões O e I) sem hierarquia.
- Botão `I` (fechar) sem label visível.
- Diagrama de comando usa siglas crípticas (BCS, LM, BL, BAD, BA1, BB, GL, AP, BD1, GT2, K) sem legenda.
- "RELÉ" é retângulo tracejado vazio no meio do diagrama.
- KPI strip do rodapé só tem 3 colunas — espaço sub-utilizado.

## Mudanças

### 3.1 Card Disjuntor reestruturado — 260 px

Três zonas verticais bem definidas:

**Topo (visual)**
- Apenas o desenho do disjuntor (SVG atual) + tag SIEMENS SION embaixo.
- Remover o bloco preto separado.

**Meio (indicadores)**
- 3 pílulas horizontais largura total, altura 28 px:
  - `MOLA · Carregada` (âmbar, dot brilhante)
  - `TRIP · Não acionado` (cinza)
  - `POSIÇÃO · Aberto` (laranja/âmbar conforme estado)
- Pílulas com `rgba .08` da cor do estado.

**Rodapé (ações)**
- 2 botões largos lado a lado:
  - `O · ABRIR` (vermelho)
  - `I · FECHAR` (verde)
- Largura igual; ambos com label visível.
- Remover o `I FECHAR` separado no rodapé inferior — duplica essa ação.

**Caption**
- Bloco de texto técnico (`In = 400A, Vn = 12kV...`) vira botão `ⓘ Especificações` que abre popover. Libera 60 px de altura.

### 3.2 Diagrama de Comando

- Adicionar **legenda lateral** (card 200 px à direita do diagrama) listando cada sigla:
  ```
  BCS · Bloqueio fechamento
  LM  · Lâmpada mola
  BL  · Bobina liga
  BAD · Bot. abrir disj.
  BA1 · Bot. abrir 1
  BB  · Bloqueio
  GL  · Sinalização luminosa
  AP  · Anti-pumping
  BD1 · Bot. desliga 1
  GT2 · Disparo térmico
  K   · Contator aux.
  ```
  Componentes ativos têm sigla em laranja na legenda.

- **Preencher o retângulo "RELÉ" vazio** com a entrada/saída real: `BO1 · TRIP` ↔ `BI1 · 52b` ↔ `BOB. TC`.

- Mover texto `Diagrama de Comando · Disjuntor BAY-01 · IEC 60617` para fora do SVG, como caption do card em `var(--tx3)`.

- Tabs `Comando / Unifilar / Forma de Onda` mover de cima do diagrama para barra de segmento (radio-group) menor, alinhada à direita do header `DIAGRAMAS`. Ganha ~30 px de altura útil.

### 3.3 KPI strip — expandir de 3 para 8 colunas

Grid igual, gap 1px:

| Estado | Mola | Operações | Último Trip | Causa | Comando por | 79 shots | Bay |
|---|---|---|---|---|---|---|---|
| Aberto (âmbar) | Carregada (âmbar) | 26 (mono) | há 4 min (mono) | 51-2 (vermelho) | Relé · BO1 (mono) | 0/3 (mono) | BAY-01 (ciano) |

- Cada célula `padding: 9px 12px`, label 8.5 px JetBrains Mono `--tx3`, valor 15 px Rajdhani 700.
- Cores semânticas: verde = OK/fechado, âmbar = atenção, vermelho = falta/aberto crítico, mono = numérico neutro, ciano = identificador.

## Critérios de aceite

- Disjuntor com 3 zonas claras (visual / indicadores / ações). Botão `I` com label `FECHAR` visível.
- Legenda de siglas presente; nenhum elemento do diagrama sem explicação.
- Retângulo "RELÉ" preenchido com BO1/BI1/Bobina TC.
- KPI strip preenche 100% da largura útil; nenhuma célula vazia.

## Referência visual

Ver `Mock - RelayLab 360 redesigned.html` (aba Painel).
Ver `Diff - RelayLab 360 refactor.html` (para validar diferenças esperadas)