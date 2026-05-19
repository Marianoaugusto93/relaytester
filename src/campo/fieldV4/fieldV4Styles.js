export const fieldV4CSS = `
  .field-page-v4 {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg);
  }

  .field-header-v4 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid var(--line-2);
    gap: 20px;
  }

  .field-header-v4 h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--ink);
  }

  .mode-control {
    display: flex;
    gap: 4px;
    background: var(--panel-2);
    padding: 4px;
    border-radius: 6px;
    border: 1px solid var(--line-2);
  }

  .mode-btn {
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 600;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    background: transparent;
    color: var(--ink-2);
    transition: all 0.2s;
  }

  .mode-btn.active {
    background: var(--accent);
    color: #000;
  }

  .field-main {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 0;
    flex: 1;
    overflow: hidden;
  }

  .field-stage {
    position: relative;
    display: grid;
    grid-template-rows: auto auto auto;
    gap: 12px;
    padding: 24px;
    background: var(--bg);
    border-radius: 14px;
    overflow: hidden;
  }

  .field-stage svg {
    position: absolute;
    inset: 0;
    z-index: 6;
    pointer-events: auto;
  }

  .borne-strip {
    display: flex;
    gap: 4px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .borne {
    position: relative;
    width: 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 4px;
    background: var(--panel-2);
    border: 1px solid var(--line-2);
    border-left: 2px inset rgba(233, 212, 96, 0.4);
    border-radius: 6px;
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
  }

  .borne-number {
    font-weight: 800;
    letter-spacing: 0.5px;
  }

  .borne-tag {
    font-size: 8px;
    background: var(--tag-yellow);
    border: 1px solid var(--tag-yellow-stroke);
    padding: 1px 3px;
    border-radius: 2px;
    transform: rotate(-2deg);
    white-space: nowrap;
    color: #000;
  }

  .screw-top, .screw-bottom {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #6b7587, #2a3144);
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.5), 0 1px 1px rgba(255,255,255,0.1);
  }

  .lever-rack {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .lever {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .lever:hover {
    opacity: 0.8;
  }

  .lever-tag {
    font-size: 8px;
    font-weight: 700;
    background: var(--tag-yellow);
    border: 1px solid var(--tag-yellow-stroke);
    padding: 2px 4px;
    border-radius: 3px;
    transform: rotate(-2deg);
    color: #000;
  }

  .knife-area {
    width: 70px;
    height: 70px;
    background: var(--panel-2);
    border: 1px solid var(--line-2);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .knife-area svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
  }

  .knife-area svg g {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: 56px 35px;
  }

  .short-bar {
    display: none;
    position: absolute;
    left: 8px;
    width: 16px;
    height: 32px;
    border: 2px dashed var(--ink-2);
    border-radius: 2px;
  }

  .short-bar.active {
    display: block;
    opacity: 0.85;
  }

  .short-bar-label {
    font-size: 7px;
    position: absolute;
    left: -20px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--ink-2);
    font-weight: 700;
  }

  .lever-terminals {
    display: flex;
    gap: 6px;
    justify-content: center;
  }

  .terminal {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #6b7280, #1f2937);
    border: 1.5px solid var(--good);
    box-shadow: inset 0 -1px 2px rgba(0,0,0,0.4);
    transition: border-color 0.2s;
  }

  .terminal.open {
    border-color: rgba(239, 68, 68, 0.5);
  }

  .lever-state {
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: var(--good);
    transition: color 0.2s;
  }

  .lever-state.open {
    color: var(--bad);
  }

  .lever-plug {
    width: 60px;
    height: 16px;
    background: linear-gradient(180deg, var(--panel-2), var(--metal));
    border: 2px solid var(--binary);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 7px;
    color: var(--ink-3);
    font-weight: 700;
    letter-spacing: 0.5px;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  }

  .lever-plug.open {
    border-color: var(--accent);
    background: rgba(245, 158, 11, 0.25);
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
  }

  .maleta-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }

  .maleta-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .maleta-group {
    display: flex;
    gap: 6px;
    justify-content: center;
    align-items: center;
  }

  .plug {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.1), rgba(0,0,0,0.3));
    box-shadow: inset 0 -3px 4px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5);
    position: relative;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .plug::before {
    content: '';
    position: absolute;
    inset: 5px;
    background: rgba(0,0,0,0.6);
    border-radius: 50%;
  }

  .plug.phaseA { background: radial-gradient(circle at 35% 35%, #eab308, #b8860b); }
  .plug.phaseB { background: radial-gradient(circle at 35% 35%, #ef4444, #991b1b); }
  .plug.phaseC { background: radial-gradient(circle at 35% 35%, #cbd5e1, #64748b); }
  .plug.phaseV { background: radial-gradient(circle at 35% 35%, #3b82f6, #1e40af); }
  .plug.phaseBI { background: radial-gradient(circle at 35% 35%, #06b6d4, #0369a1); }
  .plug.black { background: radial-gradient(circle at 35% 35%, #4b5563, #1f2937); }

  .plug:hover {
    transform: scale(1.1);
  }

  .plug-label {
    font-size: 9px;
    font-weight: 700;
    color: var(--ink-2);
    margin-top: 4px;
    text-align: center;
  }

  .cable {
    fill: none;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0 2px 1px rgba(0,0,0,0.5));
    pointer-events: stroke;
    cursor: pointer;
    transition: opacity 0.2s, stroke-width 0.2s;
    opacity: 1;
  }

  .cable.phaseA { stroke: var(--phaseA); }
  .cable.phaseB { stroke: var(--phaseB); }
  .cable.phaseC { stroke: var(--phaseC); }
  .cable.phaseV { stroke: var(--voltage); }
  .cable.phaseBI { stroke: var(--binary); stroke-dasharray: 5 3; stroke-width: 2.2; }

  .cable.test { opacity: 0.2; stroke-dasharray: 3 3; stroke-width: 1.8; }
  .cable.test.active { opacity: 1; stroke-dasharray: 4 2; stroke-width: 2.4; }

  svg.focused .cable { opacity: 0.12; }
  svg.focused .cable.focus {
    opacity: 1;
    stroke-width: 3.5;
    filter: drop-shadow(0 0 6px currentColor);
  }

  .field-side-panel {
    background: var(--panel);
    padding: 24px 18px;
    overflow-y: auto;
    border-left: 1px solid var(--line-2);
  }

  .field-side-panel h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
  }

  .field-side-panel p {
    margin: 8px 0;
    font-size: 11px;
    color: var(--ink-2);
    line-height: 1.4;
  }

  .field-side-panel .note {
    color: var(--accent);
    font-weight: 600;
  }

  @media (prefers-reduced-motion: reduce) {
    .knife-area svg g,
    .lever-plug,
    .cable {
      transition: none;
    }
  }

  @media (max-width: 900px) {
    .field-main {
      grid-template-columns: 1fr;
    }
    .field-side-panel {
      display: none;
    }
  }
`;
