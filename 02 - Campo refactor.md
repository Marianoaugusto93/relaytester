# PR 1/3 — RelayLab 360 · CAMPO

Refactor de layout da aba **Campo** (`CampoPage.jsx` e componentes ligados).
Mantém paleta atual (#0E1015 / #F97316 / #0EA5E9), tipografia (Rajdhani + JetBrains Mono), cantos arredondados e divisórias finas. Não trocar libs nem cores. Apenas redistribuir e simplificar.

Objetivo: **reduzir cliques, eliminar áreas mortas e tornar o estado da bancada legível em uma olhada**.

---

## Problemas observados

- Cabos cruzam o canvas porque maleta e chave estão muito distantes da régua.
- Barra horizontal de "Predefinições" e barra de status 52a/52b/FC/Fechar CB têm texto truncado.
- ~30% da viewport é espaço vazio nas laterais; o tooltip de ajuda flutua solto.
- Não há painel de "Circuitos OK / faltando" — usuário não sabe se montagem está completa.

## Mudanças

### 1.1 Sidebar esquerda fixa — 280 px

Três cards empilhados:

- **Predefinições**: lista vertical (`nome` + contador `n cabos`). Item selecionado em laranja preenchido. Remover a barra horizontal de presets do topo do canvas.
- **Status**: grid 2×2 com pílulas ON/OFF (verde / cinza) para `52a`, `52b`, `FC`, `BL`. Substitui a barra horizontal atual.
- **Circuitos**: validação por linha — Fase A · B · C · Tensão · Trip Coil, cada uma com ✓ verde ou ⚠ vermelho + caminho resumido (ex: `Maleta I1 → IA-S1/S2 → relé`). Computado a partir do array de cabos. Rodapé com `Limpar cabos` e contador total de cabos.

### 1.2 Canvas central

- Aproximar verticalmente: régua de bornes → maleta → chave de aferição, no máximo 80 px entre seções (hoje ~180 px).
- Adicionar **5 canais horizontais coloridos por fase** (A `#FFE033`, B `#E53935`, C `#9E9E9E`, terra `#43A047`, comando `#F97316`) como faixas `rgba .15` onde cabos devem trafegar. Renderizados na barra logo abaixo da régua.
- **Roteamento Manhattan, não Bézier.** Função:
  ```js
  function buildPath(p1, p2, phase){
    const lane = laneY(phase);
    return `M ${p1.x} ${p1.y} L ${p1.x} ${lane} L ${p2.x} ${lane} L ${p2.x} ${p2.y}`;
  }
  ```
- Espessura do cabo: 3 px normal, 5 px hover, dasharray animado quando "sugerido".
- Legenda das fases em chips no topo do canvas.

### 1.3 Conexão por 2 cliques com sugestão de destino

- Ao clicar num terminal, terminais **inválidos** ficam `opacity: .3`; válidos ganham contorno laranja e glow.
- Função `suggestDestinations(srcEndpoint)` retorna `Set` de destinos compatíveis. Critério:
  - Maleta `I*` ↔ chave `I*-S1/S2` da mesma fase
  - Maleta `V*` ↔ chave `V*` / `VN`
  - BO/BI maleta ↔ bornes 9-16 da régua
- `ESC` cancela; clique no canvas vazio também cancela.
- Banner fixo no rodapé do canvas (não tooltip flutuante): `Origem: I1+ · clique no destino sugerido. ESC cancela.` Substitui o tooltip atual.

### 1.4 Régua de bornes

- Bornes de 40→56 px de largura, 70 px de altura.
- Número (1-16) em 12 px bold, sublabel (BO1+, 52a, TC+) em 9 px JetBrains Mono.
- Manter os 3 fundos de grupo (amarelo BO, azul 52, vermelho COIL) e **adicionar etiquetas superiores agrupadas**: `SAÍDAS BINÁRIAS · BO1–BO4` / `STATUS DISJUNTOR · 52a/b` / `BOBINAS · TC/FC`.

### 1.5 Lista de cabos textual (opcional)

Accordion fechado por default no rodapé da sidebar: `I1+ → IA-S1` com `×` para excluir cabo individual. Hoje só dá pra desconectar com duplo-clique no SVG, que é descobertível.

## Critérios de aceite

- Com preset "I+V Completo" em viewport 1920×1080, **nenhum cabo cruza outro fora dos canais de fase**.
- Sidebar fixa em 280 px; canvas elástico (`flex: 1; min-width: 0`).
- Banner de origem ancorado ao canvas, não flutuante.
- Nenhum botão fora da paleta `--orange / --cyan / --green / --red / --amber / tx*`.

## Referência visual

Ver `Mock - RelayLab 360 redesigned.html` (aba Campo).
Ver `Diff - RelayLab 360 refactor.html` (para validar diferenças esperadas)