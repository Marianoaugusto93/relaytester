import { useState, useCallback, useEffect, useMemo } from "react";
import {
  suggestDestinations,
  initSwitchState,
  getInternalConnections,
  buildElectricalGraph,
  validateConnection,
  cableColorFor,
  CHAVE_POLES,
  WIRING_PRESETS,
  applyWiringPreset,
  computeCloseCoilWired,
} from "./campo/routing.js";
import CampoLeftSidebar from "./campo/CampoLeftSidebar.jsx";
import CampoCanvas from "./campo/CampoCanvas.jsx";

export default function CampoPageNew({
  onFieldStateChange, bkStatus, onBkCommand, loadWiring, boStatus, biStatus
}) {
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [suggestedDests, setSuggestedDests] = useState(new Set());
  const [cableListExpanded, setCableListExpanded] = useState(false);
  const [cables, setCables] = useState([]);
  const [switchSt, setSwitchSt] = useState(initSwitchState());

  // Derived electrical graph — recomputed only when cables or switch state changes
  const internalConns = useMemo(() => getInternalConnections(switchSt), [switchSt]);
  const electricalGraph = useMemo(
    () => buildElectricalGraph(cables, internalConns),
    [cables, internalConns]
  );

  // Close coil wired = tb_15 ↔ tb_16 reachable via field wiring
  const closeCoilWired = useMemo(
    () => computeCloseCoilWired(electricalGraph),
    [electricalGraph]
  );

  // Derived: always up-to-date fieldState (no stale closure issues)
  const fieldState = {
    connections: cables,
    internalConns,
    switchSt,
    closeCoilWired,
    electricalGraph,
  };

  useEffect(() => {
    // ESC key cancellation
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedOrigin(null);
        setSuggestedDests(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Notify parent whenever cables, switch state, or close coil status changes
  useEffect(() => {
    onFieldStateChange(fieldState);
  // fieldState is rebuilt every render from memoized derivations of cables/switchSt,
  // so the effect captures the latest derived state. onFieldStateChange is stable (useCallback).
  // Dependency is intentionally [cables, switchSt, closeCoilWired] not [fieldState].
  }, [cables, switchSt, closeCoilWired]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore wiring from saved file (loadWiring prop from App.jsx)
  useEffect(() => {
    if (!loadWiring) return;
    if (loadWiring.switchSt) setSwitchSt(loadWiring.switchSt);
    if (loadWiring.connections) {
      setCables(loadWiring.connections.map(c => ({ from: c.from, to: c.to })));
    }
  }, [loadWiring]);

  const handleSwitchToggle = useCallback((poleId) => {
    setSwitchSt(prev => ({ ...prev, [poleId]: prev[poleId] === 'up' ? 'down' : 'up' }));
  }, []);

  const loadPreset = useCallback((presetId) => {
    const preset = WIRING_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const { switchSt: nextSwitchSt, cables: nextCables } = applyWiringPreset(preset);
    setSwitchSt(nextSwitchSt);
    setCables(nextCables);
  }, []);

  const clearCables = useCallback(() => {
    setCables([]);
  }, []);

  const removeCable = useCallback((idx) => {
    setCables(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSelectOrigin = useCallback((termId) => {
    setSelectedOrigin(termId);
    setSuggestedDests(suggestDestinations(termId, fieldState));
  }, [fieldState]);

  const handleSelectDest = useCallback((destId) => {
    if (!selectedOrigin) return;
    const { valid } = validateConnection(selectedOrigin, destId, cables);
    if (valid) {
      setCables(prev => [...prev, { from: selectedOrigin, to: destId }]);
      setSelectedOrigin(null);
      setSuggestedDests(new Set());
    }
  }, [selectedOrigin, cables]);

  const handleCancel = useCallback(() => {
    setSelectedOrigin(null);
    setSuggestedDests(new Set());
  }, []);

  // Normal poles only (terra has no toggle — always connected)
  const normalPoles = CHAVE_POLES.filter(p => p.kind === 'normal');
  const closedCount = normalPoles.filter(p => switchSt[p.id] === 'up').length;

  return (
    <div className="campo-page-new">
      <CampoLeftSidebar
        cables={cables}
        fieldState={fieldState}
        electricalGraph={electricalGraph}
        presets={WIRING_PRESETS}
        onLoadPreset={loadPreset}
        onClearCables={clearCables}
        cableListExpanded={cableListExpanded}
        onToggleCableList={() => setCableListExpanded(prev => !prev)}
        onRemoveCable={removeCable}
        bkStatus={bkStatus}
        boStatus={boStatus}
        biStatus={biStatus}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        {/* Switch panel — schematic-style cards with vertical toggle slider */}
        <div className="switch-panel">
          <div className="switch-panel-header">
            <span className="switch-panel-title">Chave de Aferição</span>
            <span className="switch-panel-count">{closedCount}/{normalPoles.length} fechados</span>
          </div>
          <div className="switch-grid">
            {normalPoles.map(pole => {
              const isUp = switchSt[pole.id] === 'up';
              return (
                <div
                  key={pole.id}
                  className={`switch-card ${isUp ? 'up' : 'down'}`}
                  style={{ '--pole-color': pole.body }}
                  onClick={() => handleSwitchToggle(pole.id)}
                  title={isUp ? `${pole.id.toUpperCase()} fechado — ${pole.topAnilha}↔${pole.botAnilha}` : `${pole.id.toUpperCase()} aberto — S1↔S2 (curto)`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSwitchToggle(pole.id); } }}
                >
                  <div className="switch-label">{pole.id.toUpperCase()}</div>
                  <div className="switch-track">
                    <div className="switch-track-rail" />
                    <div className={`switch-handle ${isUp ? 'up' : 'down'}`} />
                    <div className="switch-marker top">{pole.topAnilha}</div>
                    <div className="switch-marker bot">{pole.botAnilha}</div>
                  </div>
                  <div className={`switch-state ${isUp ? 'on' : 'off'}`}>
                    {isUp ? '✓ ON' : '⊲ OFF'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <CampoCanvas
          cables={cables}
          fieldState={fieldState}
          electricalGraph={electricalGraph}
          selectedOrigin={selectedOrigin}
          suggestedDests={suggestedDests}
          onSelectOrigin={handleSelectOrigin}
          onSelectDest={handleSelectDest}
          onCancelSelection={handleCancel}
          cableColorFor={cableColorFor}
        />
      </div>
    </div>
  );
}
