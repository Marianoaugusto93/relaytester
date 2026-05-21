import { useState } from "react";
import { loadCustomPresets, saveCustomPreset, deleteCustomPreset } from "./routing.js";
import SavePresetModal from "./SavePresetModal.jsx";

export default function CampoPresets({ presets, onLoadPreset, cables, switchSt }) {
  const [customPresets, setCustomPresets] = useState(loadCustomPresets());
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleSavePreset = (name, description, tags) => {
    const result = saveCustomPreset(name, description, cables, switchSt, tags);
    if (result.success) {
      setCustomPresets(loadCustomPresets());
      setShowSaveModal(false);
    }
    return result;
  };

  const handleDeleteCustom = (presetId) => {
    if (window.confirm('Deletar este preset?')) {
      deleteCustomPreset(presetId);
      setCustomPresets(loadCustomPresets());
    }
  };

  const allPresets = [
    ...presets,
    ...customPresets.map(p => ({
      ...p,
      label: p.name,
      desc: p.description,
      isCustom: true,
    }))
  ];

  return (
    <div className="cam-card">
      <div className="cam-card-title">📋 Predefinições</div>
      <div className="cam-presets">
        {allPresets.map(p => (
          <div key={p.id} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              className="cam-preset-item"
              onClick={() => onLoadPreset(p.id)}
              title={p.desc || ''}
              style={{ flex: 1 }}
            >
              {p.label}
              {p.isCustom && ' ★'}
            </button>
            {p.isCustom && (
              <button
                onClick={() => handleDeleteCustom(p.id)}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  background: '#4B5563',
                  border: '1px solid #666',
                  color: '#ccc',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
                title="Deletar preset customizado"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => setShowSaveModal(true)}
        style={{
          width: '100%',
          marginTop: '8px',
          padding: '8px',
          background: '#7C3AED',
          border: '1px solid #9F7AEA',
          color: '#fff',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '600',
        }}
      >
        + Salvar como Preset
      </button>
      {showSaveModal && (
        <SavePresetModal
          onSave={handleSavePreset}
          onCancel={() => setShowSaveModal(false)}
          cables={cables}
        />
      )}
    </div>
  );
}
