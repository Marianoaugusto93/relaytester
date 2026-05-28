export default function PowerFlowTool() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: '12px'
    }}>
      <div style={{
        padding: '0 16px',
        background: 'var(--card)',
        borderRadius: '12px'
      }}>
        <h2 style={{
          margin: '12px 0 4px 0',
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--tx)'
        }}>
          ⚡ Newton-Raphson Power Flow Simulator
        </h2>
        <p style={{
          margin: '0 0 12px 0',
          fontSize: '13px',
          color: 'var(--tx2)'
        }}>
          Simulador AC interativo de 8 barras — resolve fluxo de potência em tempo real
        </p>
      </div>

      <iframe
        src="/newton-rapson/powerflow.html"
        style={{
          flex: 1,
          width: '100%',
          border: 'none',
          borderRadius: '12px',
          background: 'var(--bg)',
          minHeight: 0
        }}
        title="Newton-Raphson Power Flow Simulator"
      />
    </div>
  );
}
