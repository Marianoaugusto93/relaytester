# Data Model — RelayLab v4

Estruturas de dados completas usadas no design. Copie como ponto de partida
para a implementação.

## Levers (Chave de Aferição)

```ts
type Phase = 'A' | 'B' | 'C' | 'V' | 'N';
type LeverKind = 'I' | 'V';
type LeverState = 'open' | 'closed';

interface Lever {
  id: string;          // 'FA', 'FB', 'FC', 'Va', 'Vb', 'Vc', 'N'
  tag: string;         // 'A', 'B', 'C', 'Va', 'Vb', 'Vc', 'N' — texto na etiqueta amarela
  kind: LeverKind;     // 'I' = corrente (tem curto), 'V' = tensão (sem curto)
  phase: Phase;
  poles: 1 | 2;        // correntes têm 2, tensões têm 1
  state: LeverState;
}

const LEVERS: Lever[] = [
  { id: 'FA', tag: 'A',  kind: 'I', phase: 'A', poles: 2, state: 'closed' },
  { id: 'FB', tag: 'B',  kind: 'I', phase: 'B', poles: 2, state: 'closed' },
  { id: 'FC', tag: 'C',  kind: 'I', phase: 'C', poles: 2, state: 'closed' },
  { id: 'Va', tag: 'Va', kind: 'V', phase: 'V', poles: 1, state: 'closed' },
  { id: 'Vb', tag: 'Vb', kind: 'V', phase: 'V', poles: 1, state: 'closed' },
  { id: 'Vc', tag: 'Vc', kind: 'V', phase: 'V', poles: 1, state: 'closed' },
  { id: 'N',  tag: 'N',  kind: 'V', phase: 'N', poles: 1, state: 'closed' },
];
```

## Bornes (Régua de Bornes)

```ts
type BornePhase = 'A' | 'B' | 'C' | 'V' | 'BI' | '';

interface Borne {
  n: number;           // 1 a 16
  tag: string;         // texto na etiqueta amarela acima
  phase: BornePhase;
}

const BORNES: Borne[] = [
  { n: 1,  tag: 'TCa-S1', phase: 'A' },
  { n: 2,  tag: 'TCa-S2', phase: 'A' },
  { n: 3,  tag: 'TCb-S1', phase: 'B' },
  { n: 4,  tag: 'TCb-S2', phase: 'B' },
  { n: 5,  tag: 'TCc-S1', phase: 'C' },
  { n: 6,  tag: 'TCc-S2', phase: 'C' },
  { n: 7,  tag: 'TPa',    phase: 'V' },
  { n: 8,  tag: 'TPb',    phase: 'V' },
  { n: 9,  tag: 'TPc',    phase: 'V' },
  { n: 10, tag: '52a',    phase: 'BI' },
  { n: 11, tag: '52b',    phase: 'BI' },
  { n: 12, tag: 'FC',     phase: 'BI' },
  { n: 13, tag: 'TC',     phase: 'BI' },
  { n: 14, tag: 'BO-RT',  phase: 'BI' },
  { n: 15, tag: 'BO-AL',  phase: 'BI' },
  { n: 16, tag: 'GND',    phase: '' },
];
```

Cada borne tem 2 anchors (`top` e `bot`) — usado para conectar cabos
entrando por cima ou saindo por baixo.

## Maleta Ports

```ts
type MaletaSection = 'analog' | 'binary';
type MaletaSubsection = 'currents' | 'voltages' | 'BO' | 'BI';
type PlugColor = 'phaseA' | 'phaseB' | 'phaseC' | 'phaseV' | 'phaseBI' | 'black';

interface MaletaPort {
  id: string;           // 'I1+', 'I1-', 'V1', 'BO1', 'BI1', etc.
  section: MaletaSection;
  subsection: MaletaSubsection;
  color: PlugColor;
  label: string;        // texto exibido (geralmente igual ao id)
}

const MALETA_PORTS: MaletaPort[] = [
  // Analog — Correntes
  { id: 'I1+', section: 'analog', subsection: 'currents', color: 'phaseA', label: 'I1+' },
  { id: 'I1-', section: 'analog', subsection: 'currents', color: 'black',  label: 'I1-' },
  { id: 'I2+', section: 'analog', subsection: 'currents', color: 'phaseB', label: 'I2+' },
  { id: 'I2-', section: 'analog', subsection: 'currents', color: 'black',  label: 'I2-' },
  { id: 'I3+', section: 'analog', subsection: 'currents', color: 'phaseC', label: 'I3+' },
  { id: 'I3-', section: 'analog', subsection: 'currents', color: 'black',  label: 'I3-' },
  // Analog — Tensões
  { id: 'V1',  section: 'analog', subsection: 'voltages', color: 'phaseV', label: 'V1' },
  { id: 'V1-', section: 'analog', subsection: 'voltages', color: 'black',  label: 'V1-' },
  { id: 'V2',  section: 'analog', subsection: 'voltages', color: 'phaseV', label: 'V2' },
  { id: 'V2-', section: 'analog', subsection: 'voltages', color: 'black',  label: 'V2-' },
  { id: 'V3',  section: 'analog', subsection: 'voltages', color: 'phaseV', label: 'V3' },
  { id: 'V3-', section: 'analog', subsection: 'voltages', color: 'black',  label: 'V3-' },
  // Binary — BO (Binary Output)
  { id: 'BO1',  section: 'binary', subsection: 'BO', color: 'phaseBI', label: 'BO1' },
  { id: 'BO1-', section: 'binary', subsection: 'BO', color: 'black',   label: 'BO1-' },
  { id: 'BO2',  section: 'binary', subsection: 'BO', color: 'phaseBI', label: 'BO2' },
  { id: 'BO2-', section: 'binary', subsection: 'BO', color: 'black',   label: 'BO2-' },
  // Binary — BI (Binary Input)
  { id: 'BI1',  section: 'binary', subsection: 'BI', color: 'phaseBI', label: 'BI1' },
  { id: 'BI1-', section: 'binary', subsection: 'BI', color: 'black',   label: 'BI1-' },
  { id: 'BI2',  section: 'binary', subsection: 'BI', color: 'phaseBI', label: 'BI2' },
  { id: 'BI2-', section: 'binary', subsection: 'BI', color: 'black',   label: 'BI2-' },
];
```

## Cables

```ts
type CableKind = 'main' | 'binary' | 'test';
type CablePhase = 'A' | 'B' | 'C' | 'V' | 'BI';

interface Cable {
  from: string;       // connector id (data-port or data-connector)
  to: string;         // connector id
  phase: CablePhase;
  kind: CableKind;
  circuit: string;    // groups related cables (focus hover)
  chave?: string;     // for kind='test', which lever it tests
}

const CABLES: Cable[] = [
  // ANALOG — RÉGUA → CHAVE (campo, terminal de cima)
  { from: 'TB1-b', to: 'FA-Lt-field', phase: 'A', kind: 'main', circuit: 'IA' },
  { from: 'TB2-b', to: 'FA-Lb-field', phase: 'A', kind: 'main', circuit: 'IA' },
  { from: 'TB3-b', to: 'FB-Lt-field', phase: 'B', kind: 'main', circuit: 'IB' },
  { from: 'TB4-b', to: 'FB-Lb-field', phase: 'B', kind: 'main', circuit: 'IB' },
  { from: 'TB5-b', to: 'FC-Lt-field', phase: 'C', kind: 'main', circuit: 'IC' },
  { from: 'TB6-b', to: 'FC-Lb-field', phase: 'C', kind: 'main', circuit: 'IC' },
  { from: 'TB7-b', to: 'Va-L-field',  phase: 'V', kind: 'main', circuit: 'VA' },
  { from: 'TB8-b', to: 'Vb-L-field',  phase: 'V', kind: 'main', circuit: 'VB' },
  { from: 'TB9-b', to: 'Vc-L-field',  phase: 'V', kind: 'main', circuit: 'VC' },

  // BINÁRIOS — MALETA → RÉGUA (não passam pela chave)
  { from: 'BO1', to: 'TB10-b', phase: 'BI', kind: 'binary', circuit: 'BO1' },
  { from: 'BO2', to: 'TB11-b', phase: 'BI', kind: 'binary', circuit: 'BO2' },
  { from: 'BI1', to: 'TB13-b', phase: 'BI', kind: 'binary', circuit: 'BI1' },
  { from: 'BI2', to: 'TB14-b', phase: 'BI', kind: 'binary', circuit: 'BI2' },

  // TESTE — MALETA → PLUG da CHAVE (ativos apenas com chave aberta)
  { from: 'I1+', to: 'FA-plug', phase: 'A', kind: 'test', circuit: 'IA', chave: 'FA' },
  { from: 'I2+', to: 'FB-plug', phase: 'B', kind: 'test', circuit: 'IB', chave: 'FB' },
  { from: 'I3+', to: 'FC-plug', phase: 'C', kind: 'test', circuit: 'IC', chave: 'FC' },
  { from: 'V1',  to: 'Va-plug', phase: 'V', kind: 'test', circuit: 'VA', chave: 'Va' },
  { from: 'V2',  to: 'Vb-plug', phase: 'V', kind: 'test', circuit: 'VB', chave: 'Vb' },
  { from: 'V3',  to: 'Vc-plug', phase: 'V', kind: 'test', circuit: 'VC', chave: 'Vc' },
];
```

## Connector ID Convention

Para os anchors no DOM (usados para roteamento de cabos), a convenção é:

### Régua de Bornes
- `TB<N>-t` — anchor superior do borne N (cabo entrando por cima)
- `TB<N>-b` — anchor inferior do borne N (cabo saindo por baixo)

### Chave de Aferição (alavancas)
- `<LeverId>-plug` — plug ◇ MALETA na base
- Correntes (2 polos):
  - `<LeverId>-Lt-field` — terminal superior, lado campo
  - `<LeverId>-Lt-rele`  — terminal superior, lado relé
  - `<LeverId>-Lb-field` — terminal inferior, lado campo
  - `<LeverId>-Lb-rele`  — terminal inferior, lado relé
- Tensões (1 polo):
  - `<LeverId>-L-field`  — terminal único, lado campo
  - `<LeverId>-L-rele`   — terminal único, lado relé

### Maleta
- ID do plug é o próprio identificador da porta (`I1+`, `V1`, `BO1`, etc.)

## App State (top-level)

```ts
type Mode = 'op' | 'test' | 'mix';

interface AppState {
  levers: Lever[];
  bornes: Borne[];          // read-only após criação
  maletaPorts: MaletaPort[]; // read-only após criação
  cables: Cable[];           // read-only após criação
  mode: Mode;
  focusedCircuit: string | null;
}
```

## Mode Application

Quando o usuário seleciona um modo, todas as alavancas atualizam estado em batch:

```ts
function applyMode(state: AppState, mode: Mode): AppState {
  return {
    ...state,
    mode,
    levers: state.levers.map(l => {
      let newState: LeverState = 'closed';
      if (mode === 'test') newState = 'open';
      else if (mode === 'mix') newState = (l.id === 'FB' || l.id === 'Vb') ? 'open' : 'closed';
      return { ...l, state: newState };
    }),
  };
}
```

## Toggle individual

```ts
function toggleLever(state: AppState, leverId: string): AppState {
  return {
    ...state,
    levers: state.levers.map(l =>
      l.id === leverId
        ? { ...l, state: l.state === 'open' ? 'closed' : 'open' }
        : l
    ),
  };
}
```
