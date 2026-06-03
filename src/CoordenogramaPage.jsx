export default function CoordenogramaPage() {
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
        src="/coordenograma/index.html"
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'var(--bg)'
        }}
        title="Coordenograma — Coordenação de Proteção"
      />
    </div>
  );
}
