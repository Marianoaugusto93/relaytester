// ─── Command Diagram Legend — Componente separado ──────────────────────────────
export default function CommandLegend({ bkState, springLoaded, tripLatch }) {
  const closed = bkState === 'closed';

  const LEGEND_ITEMS = [
    { key: 'BCS', desc: 'Comando supervisório', cat: 'entrada' },
    { key: 'LM',  desc: 'Mola carregada', cat: 'feedback' },
    { key: 'GL',  desc: 'Bobina de disparo', cat: 'saida' },
    { key: 'AP',  desc: 'Anti-recuo trip', cat: 'protecao' },
    { key: 'BD1', desc: 'Contato 52a (fechado)', cat: 'feedback' },
    { key: 'GT2', desc: 'Contato 52b (aberto)', cat: 'feedback' },
    { key: 'K',   desc: 'Relé auxiliar', cat: 'comando' },
    { key: 'BM',  desc: 'Motor da mola', cat: 'saida' },
  ];

  const categories = {
    entrada: 'Entradas',
    feedback: 'Feedback',
    protecao: 'Proteção',
    comando: 'Comando',
    saida: 'Saídas'
  };

  const activeKeys = [
    'BCS',
    ...(springLoaded ? ['LM'] : []),
    ...(tripLatch    ? ['GL', 'AP'] : []),
    ...(closed       ? ['BD1'] : ['GT2']),
    'K',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'y auto', padding: '10px 12px' }}>
        {Object.entries(categories).map(([cat, label]) => {
          const items = LEGEND_ITEMS.filter(i => i.cat === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'var(--fh)' }}>
                {label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.map(({ key, desc }) => {
                  const active = activeKeys.includes(key);
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '5px 6px', borderRadius: '4px', background: active ? 'rgba(249,115,22,.08)' : 'transparent', transition: 'all .15s' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? 'var(--orange)' : 'var(--tx4)', flexShrink: 0, marginTop: 3 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: active ? 700 : 600, color: active ? 'var(--orange)' : 'var(--tx)', fontFamily: 'var(--fm)', letterSpacing: '0.3px' }}>
                          {key}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--tx3)', lineHeight: 1.3, marginTop: 1 }}>
                          {desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
