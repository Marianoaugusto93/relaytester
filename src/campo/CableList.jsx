export default function CableList({ cables, expanded, onRemove, onClearAll, onToggle }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onToggle();
      e.preventDefault();
    }
  };
  return (
    <div className="cam-card">
      <div className="cam-cable-list">
        <div className="cam-cable-accordion-header" onClick={onToggle} role="button" tabIndex={0} onKeyDown={handleKeyDown} aria-expanded={expanded} aria-label="Cabos accordion">
          <span>{expanded ? '▼' : '▶'}</span>
          <span>Cabos ({cables.length})</span>
        </div>
        {expanded && (
          <div>
            {cables.map((c, i) => (
              <div key={i} className="cam-cable-item">
                <span className="cam-cable-item-label">
                  {c.from} → {c.to}
                </span>
                <button
                  className="cam-cable-remove"
                  onClick={() => onRemove(i)}
                  title="Remover"
                >
                  ×
                </button>
              </div>
            ))}
            {cables.length > 0 && (
              <button
                className="conn-b"
                onClick={onClearAll}
                style={{ marginTop: '8px' }}
              >
                Limpar cabos
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
