export default function FieldSidePanel() {
  return (
    <div className="field-side-panel">
      <h3>V4 Layout Demo</h3>
      <p>Instrucções de Teste (v4.0)</p>
      <p className="note">⚠️ Proteção desabilitada neste modo.</p>
      <p style={{ marginTop: '16px', fontSize: '10px', color: 'var(--ink-3)' }}>
        O Layout V4 é uma visualização interativa dos equipamentos de teste.
        A engine de proteção continua ativa nos modos Clássico e Novo.
      </p>
    </div>
  );
}
