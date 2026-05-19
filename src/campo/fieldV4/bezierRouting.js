export function pathCurve(a, b) {
  const dy = b.y - a.y;
  const t = Math.min(90, Math.max(24, Math.abs(dy) * 0.45));
  const sign = Math.sign(dy) || 1;
  const ay = a.y + sign * t;
  const by = b.y - sign * t;
  return `M ${a.x} ${a.y} C ${a.x} ${ay}, ${b.x} ${by}, ${b.x} ${b.y}`;
}
