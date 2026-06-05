/**
 * Newton-Raphson Power Flow Simulator - React Embedded Component
 *
 * Wraps the standalone HTML simulator in an iframe with React-friendly API.
 * Communicates via postMessage bridge protocol.
 *
 * Phase 4: postMessage bridge integration for React containers.
 * Phase 5: Extract controls UI into React sub-components.
 * Phase 6: Complete cutover to React-based solver.
 */

import React, { useEffect, useRef, useState } from 'react';
import { SolverBridgeClient } from './core/bridge.js';

/**
 * Embedded Newton-Raphson Simulator Component
 *
 * Props:
 * - network: {buses, branches} - Initial network state
 * - version: 'old' | 'new' - Which solver version to use
 * - onSolveComplete: callback when solve finishes
 * - style: CSS style object for iframe container
 */
export default function PowerFlowEmbedded({
  network,
  version = 'new',
  onSolveComplete,
  style,
}) {
  const iframeRef = useRef(null);
  const [bridge, setBridge] = useState(null);
  const [solving, setSolving] = useState(false);
  const [error, setError] = useState(null);

  // Initialize bridge when iframe loads
  useEffect(() => {
    if (!iframeRef.current) return;

    const onLoad = () => {
      try {
        const iframeWindow = iframeRef.current.contentWindow;
        const newBridge = new SolverBridgeClient(iframeWindow);
        setBridge(newBridge);
      } catch (err) {
        setError(`Bridge initialization failed: ${err.message}`);
      }
    };

    const iframe = iframeRef.current;
    iframe.addEventListener('load', onLoad);

    // In case iframe is already loaded
    if (iframe.contentWindow && iframe.contentWindow.document.readyState === 'complete') {
      onLoad();
    }

    return () => iframe.removeEventListener('load', onLoad);
  }, []);

  /**
   * Solve the network using the bridge.
   */
  const handleSolve = async () => {
    if (!bridge || !network) return;

    setSolving(true);
    setError(null);

    try {
      const result = await bridge.solve(network);
      onSolveComplete?.(result);
    } catch (err) {
      setError(`Solve failed: ${err.message}`);
    } finally {
      setSolving(false);
    }
  };

  /**
   * Export network as JSON.
   */
  const handleExport = async () => {
    if (!bridge || !network) return;

    try {
      const json = await bridge.serialize(network);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `network-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Export failed: ${err.message}`);
    }
  };

  const iframeUrl = version === 'old'
    ? '/newton-rapson/powerflow.html?mode=legacy'
    : '/newton-rapson/powerflow.html?mode=refactored';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', ...style }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleSolve}
          disabled={!bridge || solving}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0071e3',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: bridge && !solving ? 'pointer' : 'not-allowed',
            opacity: bridge && !solving ? 1 : 0.5,
          }}
        >
          {solving ? 'Solving...' : 'Solve Network'}
        </button>
        <button
          onClick={handleExport}
          disabled={!bridge || !network}
          style={{
            padding: '8px 16px',
            backgroundColor: '#fff',
            border: '1px solid #d2d2d7',
            borderRadius: '6px',
            cursor: bridge && network ? 'pointer' : 'not-allowed',
            opacity: bridge && network ? 1 : 0.5,
          }}
        >
          Export JSON
        </button>
        <span style={{ fontSize: '12px', color: '#999', alignSelf: 'center' }}>
          {version === 'old' ? '🔴 Legacy Solver' : '🟢 Refactored Solver'}
        </span>
      </div>

      {error && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#fcebec',
            color: '#8b1a1f',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={iframeUrl}
        title="Newton-Raphson Power Flow Simulator"
        style={{
          border: '1px solid #d2d2d7',
          borderRadius: '8px',
          width: '100%',
          height: '600px',
          backgroundColor: '#f5f5f7',
        }}
      />

      <div style={{ fontSize: '11px', color: '#999', textAlign: 'center' }}>
        {version === 'new'
          ? 'Using extracted modular solver (Phase 2-4)'
          : 'Using legacy monolithic solver (baseline)'}
      </div>
    </div>
  );
}
