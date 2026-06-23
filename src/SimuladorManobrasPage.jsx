/**
 * SimuladorManobrasPage — embeds the standalone substation switching/fault
 * simulator (single-file vanilla-JS app served from public/) via iframe.
 *
 * Mirrors the SimuladorNRPage pattern: the simulator is self-contained
 * (own SVG engine, state machine, scenarios, localStorage) and is integrated
 * as a top-level platform rather than as an Estudos-hub tool.
 */
export default function SimuladorManobrasPage() {
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
        src="/simulador-manobras.html"
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'var(--bg)'
        }}
        title="Simulador de Manobras & Falhas em Subestações"
      />
    </div>
  );
}
