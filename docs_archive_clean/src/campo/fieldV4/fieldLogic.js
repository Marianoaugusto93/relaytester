export function applyMode(levers, mode) {
  return levers.map(l => {
    let newState = 'closed';
    if (mode === 'test') newState = 'open';
    else if (mode === 'mix') newState = (['FB', 'Vb'].includes(l.id) ? 'open' : 'closed');
    return { ...l, state: newState };
  });
}

export function phaseColor(phase) {
  const colors = {
    'A': 'var(--phaseA)', 'B': 'var(--phaseB)', 'C': 'var(--phaseC)',
    'V': 'var(--voltage)', 'BI': 'var(--binary)', '': 'transparent'
  };
  return colors[phase] || 'transparent';
}
