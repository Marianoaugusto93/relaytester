import { useState } from "react";

export default function SavePresetModal({ onSave, onCancel, cables }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Nome do preset é obrigatório");
      return;
    }
    setLoading(true);
    setError("");

    const tagArray = tags
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const result = onSave(name, description, tagArray);
    if (result.success) {
      setName("");
      setDescription("");
      setTags("");
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000,
    }}>
      <div style={{
        background: "#1a1d24",
        border: "1px solid #333",
        borderRadius: "8px",
        padding: "24px",
        maxWidth: "400px",
        width: "90%",
      }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#fff" }}>Salvar como Preset</h3>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", fontSize: "12px", color: "#aaa", marginBottom: "4px" }}>
            Nome *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Teste 3-Fase"
            style={{
              width: "100%",
              padding: "8px",
              background: "#2a2e36",
              border: "1px solid #444",
              color: "#fff",
              borderRadius: "4px",
              fontSize: "12px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", fontSize: "12px", color: "#aaa", marginBottom: "4px" }}>
            Descrição
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição opcional do preset"
            style={{
              width: "100%",
              padding: "8px",
              background: "#2a2e36",
              border: "1px solid #444",
              color: "#fff",
              borderRadius: "4px",
              fontSize: "12px",
              minHeight: "60px",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", fontSize: "12px", color: "#aaa", marginBottom: "4px" }}>
            Tags (separadas por vírgula)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Ex: Teste, 3-Fase, Critical"
            style={{
              width: "100%",
              padding: "8px",
              background: "#2a2e36",
              border: "1px solid #444",
              color: "#fff",
              borderRadius: "4px",
              fontSize: "12px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <div style={{
            marginBottom: "12px",
            padding: "8px",
            background: "#5D2E2E",
            border: "1px solid #8B4949",
            color: "#ff9999",
            borderRadius: "4px",
            fontSize: "12px",
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: "flex",
          gap: "8px",
          justifyContent: "flex-end",
        }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "8px 16px",
              background: "#4B5563",
              border: "1px solid #666",
              color: "#ccc",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            style={{
              padding: "8px 16px",
              background: loading ? "#5D5D5D" : "#7C3AED",
              border: "1px solid #9F7AEA",
              color: "#fff",
              borderRadius: "4px",
              cursor: (loading || !name.trim()) ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>

        <div style={{
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid #333",
          fontSize: "11px",
          color: "#888",
        }}>
          📦 Preset salvo: {cables?.length || 0} cabos configurados
        </div>
      </div>
    </div>
  );
}
