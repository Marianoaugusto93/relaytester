export const LEVERS = [
  { id: 'FA', tag: 'A',  kind: 'I', phase: 'A', poles: 2, state: 'closed' },
  { id: 'FB', tag: 'B',  kind: 'I', phase: 'B', poles: 2, state: 'closed' },
  { id: 'FC', tag: 'C',  kind: 'I', phase: 'C', poles: 2, state: 'closed' },
  { id: 'Va', tag: 'Va', kind: 'V', phase: 'V', poles: 1, state: 'closed' },
  { id: 'Vb', tag: 'Vb', kind: 'V', phase: 'V', poles: 1, state: 'closed' },
  { id: 'Vc', tag: 'Vc', kind: 'V', phase: 'V', poles: 1, state: 'closed' },
  { id: 'N',  tag: 'N',  kind: 'V', phase: 'N', poles: 1, state: 'closed' },
];

export const BORNES = [
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

export const MALETA_PORTS = [
  // Analog — Currents
  { id: 'I1+', section: 'analog', subsection: 'currents', color: 'phaseA', label: 'I1+' },
  { id: 'I1-', section: 'analog', subsection: 'currents', color: 'black',  label: 'I1-' },
  { id: 'I2+', section: 'analog', subsection: 'currents', color: 'phaseB', label: 'I2+' },
  { id: 'I2-', section: 'analog', subsection: 'currents', color: 'black',  label: 'I2-' },
  { id: 'I3+', section: 'analog', subsection: 'currents', color: 'phaseC', label: 'I3+' },
  { id: 'I3-', section: 'analog', subsection: 'currents', color: 'black',  label: 'I3-' },
  // Analog — Voltages
  { id: 'V1',  section: 'analog', subsection: 'voltages', color: 'phaseV', label: 'V1' },
  { id: 'V1-', section: 'analog', subsection: 'voltages', color: 'black',  label: 'V1-' },
  { id: 'V2',  section: 'analog', subsection: 'voltages', color: 'phaseV', label: 'V2' },
  { id: 'V2-', section: 'analog', subsection: 'voltages', color: 'black',  label: 'V2-' },
  { id: 'V3',  section: 'analog', subsection: 'voltages', color: 'phaseV', label: 'V3' },
  { id: 'V3-', section: 'analog', subsection: 'voltages', color: 'black',  label: 'V3-' },
  // Binary — BO
  { id: 'BO1',  section: 'binary', subsection: 'BO', color: 'phaseBI', label: 'BO1' },
  { id: 'BO1-', section: 'binary', subsection: 'BO', color: 'black',   label: 'BO1-' },
  { id: 'BO2',  section: 'binary', subsection: 'BO', color: 'phaseBI', label: 'BO2' },
  { id: 'BO2-', section: 'binary', subsection: 'BO', color: 'black',   label: 'BO2-' },
  // Binary — BI
  { id: 'BI1',  section: 'binary', subsection: 'BI', color: 'phaseBI', label: 'BI1' },
  { id: 'BI1-', section: 'binary', subsection: 'BI', color: 'black',   label: 'BI1-' },
  { id: 'BI2',  section: 'binary', subsection: 'BI', color: 'phaseBI', label: 'BI2' },
  { id: 'BI2-', section: 'binary', subsection: 'BI', color: 'black',   label: 'BI2-' },
];

export const CABLES = [
  // ANALOG — RÉGUA → CHAVE (campo)
  { from: 'TB1-b', to: 'FA-Lt-field', phase: 'A', kind: 'main', circuit: 'IA' },
  { from: 'TB2-b', to: 'FA-Lb-field', phase: 'A', kind: 'main', circuit: 'IA' },
  { from: 'TB3-b', to: 'FB-Lt-field', phase: 'B', kind: 'main', circuit: 'IB' },
  { from: 'TB4-b', to: 'FB-Lb-field', phase: 'B', kind: 'main', circuit: 'IB' },
  { from: 'TB5-b', to: 'FC-Lt-field', phase: 'C', kind: 'main', circuit: 'IC' },
  { from: 'TB6-b', to: 'FC-Lb-field', phase: 'C', kind: 'main', circuit: 'IC' },
  { from: 'TB7-b', to: 'Va-L-field',  phase: 'V', kind: 'main', circuit: 'VA' },
  { from: 'TB8-b', to: 'Vb-L-field',  phase: 'V', kind: 'main', circuit: 'VB' },
  { from: 'TB9-b', to: 'Vc-L-field',  phase: 'V', kind: 'main', circuit: 'VC' },
  // BINÁRIOS
  { from: 'BO1', to: 'TB10-b', phase: 'BI', kind: 'binary', circuit: 'BO1' },
  { from: 'BO2', to: 'TB11-b', phase: 'BI', kind: 'binary', circuit: 'BO2' },
  { from: 'BI1', to: 'TB13-b', phase: 'BI', kind: 'binary', circuit: 'BI1' },
  { from: 'BI2', to: 'TB14-b', phase: 'BI', kind: 'binary', circuit: 'BI2' },
  // TEST — MALETA → PLUG
  { from: 'I1+', to: 'FA-plug', phase: 'A', kind: 'test', circuit: 'IA', chave: 'FA' },
  { from: 'I2+', to: 'FB-plug', phase: 'B', kind: 'test', circuit: 'IB', chave: 'FB' },
  { from: 'I3+', to: 'FC-plug', phase: 'C', kind: 'test', circuit: 'IC', chave: 'FC' },
  { from: 'V1',  to: 'Va-plug', phase: 'V', kind: 'test', circuit: 'VA', chave: 'Va' },
  { from: 'V2',  to: 'Vb-plug', phase: 'V', kind: 'test', circuit: 'VB', chave: 'Vb' },
  { from: 'V3',  to: 'Vc-plug', phase: 'V', kind: 'test', circuit: 'VC', chave: 'Vc' },
];
