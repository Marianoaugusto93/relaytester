export default function SimuladorNRPage() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      overflow: 'hidden'
    }}>
      <iframe
        src="/newton-rapson/powerflow.html"
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'var(--bg)'
        }}
        title="Newton-Raphson Power Flow Simulator"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    </div>
  );
}
