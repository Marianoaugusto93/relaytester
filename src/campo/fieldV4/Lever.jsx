export default function Lever({
  id, tag, kind, phase, poles, state,
  onToggle, onHover, onLeave
}) {
  const handleClick = () => {
    const newState = state === 'open' ? 'closed' : 'open';
    if (onToggle) onToggle(id, newState);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
      e.preventDefault();
    }
  };

  const isOpen = state === 'open';
  const isCurrent = kind === 'I';

  return (
    <div
      className="lever"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="lever-tag">{tag}</div>

      {/* Knife-area SVG */}
      <div className="knife-area" onClick={handleClick} role="button" tabIndex={0} onKeyDown={handleKeyDown} aria-label={`Lever ${tag} ${isOpen ? 'open' : 'closed'}`}>
        <svg viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg">
          {/* Background */}
          <rect width="70" height="70" fill="transparent" />

          {/* Animated group (rotates) */}
          <g transform={isOpen ? 'rotate(28 56 35)' : 'rotate(0 56 35)'}>
            {/* Lâmina horizontal (line) */}
            <line
              x1="14" y1="35"
              x2="56" y2="35"
              stroke="#000"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Knob/handle (cam) — círculo laranja */}
            <circle cx="8" cy="35" r="5" fill="#f59e0b" />
          </g>

          {/* Pivot point (fixed) */}
          <circle cx="56" cy="35" r="3" fill="#666" />
        </svg>
      </div>

      {/* Short-bar (only for currents, visible when open) */}
      {isCurrent && (
        <div className={`short-bar ${isOpen ? 'active' : ''}`}>
          {isOpen && <div className="short-bar-label">CURTO</div>}
        </div>
      )}

      {/* Terminais */}
      <div className="lever-terminals">
        {Array.from({ length: poles }).map((_, idx) => (
          <div
            key={idx}
            className={`terminal ${isOpen ? 'open' : ''}`}
            data-connector={poles === 2
              ? `${id}-${['Lt', 'Lb'][idx]}-field`
              : `${id}-L-field`}
          />
        ))}
      </div>

      {/* State label */}
      <div className={`lever-state ${isOpen ? 'open' : ''}`}>
        {isOpen ? '↑ ABERTA' : '↓ FECHADA'}
      </div>

      {/* Test plug */}
      <div className={`lever-plug ${isOpen ? 'open' : ''}`} data-port={`${id}-plug`}>
        ◇ MALETA
      </div>
    </div>
  );
}
