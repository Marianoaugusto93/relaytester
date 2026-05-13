// Manhattan routing utilities for Campo refactor

const LANE_Y_MAP = {
  'A': 60,
  'B': 90,
  'C': 120,
  'gnd': 150,
  'cmd': 180
};

export function laneY(phase) {
  return LANE_Y_MAP[phase] || 180;
}

export function buildManhattanPath(p1, p2, phase) {
  const ly = laneY(phase);
  return `M ${p1.x} ${p1.y} L ${p1.x} ${ly} L ${p2.x} ${ly} L ${p2.x} ${p2.y}`;
}

export function suggestDestinations(srcTerminal, fieldState) {
  const dests = new Set();
  if (srcTerminal?.includes('i1')) {
    dests.add('ia1_top');
    dests.add('ia1_bot');
  }
  if (srcTerminal?.includes('i2')) {
    dests.add('ib1_top');
    dests.add('ib1_bot');
  }
  if (srcTerminal?.includes('i3')) {
    dests.add('ic1_top');
    dests.add('ic1_bot');
  }
  return dests;
}

export function validateCircuit(cables, fieldState) {
  const status = new Map();
  status.set('Fase A', cables.some(c => c.from?.includes('i1')) ? 'OK' : 'WARN');
  status.set('Fase B', cables.some(c => c.from?.includes('i2')) ? 'OK' : 'WARN');
  status.set('Fase C', cables.some(c => c.from?.includes('i3')) ? 'OK' : 'WARN');
  status.set('Tensão', cables.some(c => c.from?.includes('v')) ? 'OK' : 'WARN');
  status.set('Trip Coil', cables.length > 3 ? 'OK' : 'WARN');
  return status;
}

export function computeTerminalPosition(terminalId) {
  const xMap = {
    'i1_pos': 50, 'i1_neg': 70, 'i2_pos': 100, 'i2_neg': 120, 'i3_pos': 150, 'i3_neg': 170,
    'ia1_top': 50, 'ia1_bot': 70, 'ib1_top': 100, 'ib1_bot': 120, 'ic1_top': 150, 'ic1_bot': 170,
  };
  const yMap = {
    'i1_pos': 30, 'i1_neg': 30, 'i2_pos': 30, 'i2_neg': 30, 'i3_pos': 30, 'i3_neg': 30,
    'ia1_top': 450, 'ia1_bot': 470, 'ib1_top': 450, 'ib1_bot': 470, 'ic1_top': 450, 'ic1_bot': 470,
  };
  return { x: xMap[terminalId] || 100, y: yMap[terminalId] || 100 };
}
