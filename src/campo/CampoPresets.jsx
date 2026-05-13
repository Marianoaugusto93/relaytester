export default function CampoPresets({ presets, onLoadPreset }) {
  return (
    <div className="cam-card">
      <div className="cam-card-title">📋 Predefinições</div>
      <div className="cam-presets">
        {presets.map(p => (
          <button
            key={p.id}
            className="cam-preset-item"
            onClick={() => onLoadPreset(p.id)}
            title={p.desc}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
