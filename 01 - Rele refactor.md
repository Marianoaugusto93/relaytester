# PR 2/3 — RelayLab 360 · RELÉ

Refactor de layout da aba **Relé** (`PainelPage.jsx` / `RelePage.jsx` e componentes ligados).
Mantém paleta e tipografia. Não trocar libs. Apenas redistribuir e simplificar.

---

## Problemas observados

- 3 áreas competindo pela mesma ação (sidebar esquerda CURRENT/VOLTAGE INJECTION, área central CONTROLS+INJETAR, sidebar direita REGRID PRO).
- Sidebar direita repete Ia/Ib/Ic em Secundária + Primária + Múltiplo TC — colunas redundantes.
- Cards "Event Recorder" e "Diagnostics" ocupam metade da tela vazios.
- Botão "Calculador de Falta" lavanda quebra a paleta.
- 8 botões-ícone no rodapé direito (Send/Get Settings, Live/Get Waveform, Open/Save File, Snapshot, Dump State) sem hierarquia.

## Mudanças

### 2.1 Topo unificado de injeção

Mover `CURRENT INJECTION`, `VOLTAGE INJECTION` e `FREQUENCY` da sidebar esquerda para uma **faixa horizontal acima das tabs**, em 3 colunas iguais.

Cada coluna:
- Header com título + toggle segmentado `Manual / 3φ Eq.` à direita.
- Grid 3×2 com `MAG` (3 fases) na primeira linha, `ÂNG` (3 fases) na segunda.
- Frequência: `Freq · df/dt · Rampa · Pré-falta · Falta · Pós`.

Libera a coluna esquerda inteira.

### 2.2 Sidebar esquerda vira "Cenários" — 240 px

Único card vertical:
- Toggle `Pré-falta / Falta` (já existe).
- Lista de cenários educacionais em **linhas verticais** com nome + descrição curta (1 linha) — não em chips horizontais como hoje. Cenários: 3-Ph, L-G, L-L, Inrush, Subtensão 27, Subfreq 81U, 67 Direcional.
- Rodapé: `+ Novo cenário` e `Carregar .json`.
- Botão `Calculador de Falta` reestilizado como `btn primary` laranja outline, **fora da sidebar** (vai pra rodapé — ver 2.5).

### 2.3 Área central

- Manter tabs `System Parameters / Relay Settings / Output Matrix / Input Matrix`.
- Em Relay Settings: a sub-tab atual ("51", "50", "51N"...) vira **sidebar interna esquerda de 110 px** com a lista vertical de funções; o form ocupa o resto. Cada função mostra código + sublabel (`51 Sobrec. T`).
- Card `Controls` colapsa para barra fina **fixa no rodapé** (ver 2.5).
- Cards `EVENT RECORDER` e `DIAGNOSTICS`: esconder quando vazios. Quando vazios, substituir por placeholder em 1 linha (`Sem eventos · aguardando injeção`).
- Pré-visualização da curva de proteção vira card no rodapé do form.

### 2.4 Sidebar direita REGRID — 280 px

- Tabs internas: `Medidas · Proteções · Lógica · Eventos`. Remover redundância.
- Tabela de medidas: **uma coluna só por padrão** (Secundária). Botão `≡ Primária` no header da seção revela 2ª coluna. Hoje as 3 vistas (Sec, Prim, Múltiplo TC) ficam empilhadas e somam ~12 linhas para 3 valores.
- Seções: `CORR` / `TENS` / `POT`.
- Os 8 botões inferiores: agrupar 2×4 em **2 grupos visuais** com label `AJUSTES` (Send · Get · Open · Save) e `OPERAÇÃO` (Live · Capture · Snap · Dump). Reduzir altura de ~64 px para ~52 px.

### 2.5 Controls bar — fixa no rodapé

Barra horizontal fina abaixo do conteúdo principal:

```
[▶ Injetar] [■ Parar] [↺ Reset Fault]   ● status · TRIP timer 0.000s        [⚡ Calculador de Falta]
```

- 3 botões à esquerda (verde, vermelho, neutro).
- Status com dot animado quando rodando.
- `Calculador de Falta` à direita, em laranja outline (`--orange-dim`, não lavanda).

## Critérios de aceite

- Faixa de injeção + tabs + form cabem **sem scroll vertical em 1080 px**.
- Nenhum card vazio ocupa quadrante visual.
- Nenhum botão lavanda. Calculador agora é laranja outline.
- Botões de ajuste/operação agrupados visualmente com labels.

## Referência visual

Ver `Mock - RelayLab 360 redesigned.html` (aba Relé).
Ver `Diff - RelayLab 360 refactor.html` (para validar diferenças esperadas)
