export default function FieldHeader({ mode, onModeChange }) {
  return (
    <header className="field-header-v4">
      <h1>Painel FIELD v4</h1>
      <div className="mode-control">
        {['op', 'test', 'mix'].map(m => (
          <button
            key={m}
            className={`mode-btn ${mode === m ? 'active' : ''}`}
            onClick={() => onModeChange(m)}
          >
            {m === 'op' ? 'Operação' : m === 'test' ? 'Teste' : 'Mista'}
          </button>
        ))}
      </div>
    </header>
  );
}
