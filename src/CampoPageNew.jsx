import { useState, useCallback, useEffect } from "react";
import { TEST_PRESETS } from "./defaults.js";
import { suggestDestinations } from "./campo/routing.js";
import CampoLeftSidebar from "./campo/CampoLeftSidebar.jsx";
import CampoCanvas from "./campo/CampoCanvas.jsx";

export default function CampoPageNew({
  onFieldStateChange, bkStatus, onBkCommand, loadWiring
}) {
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [suggestedDests, setSuggestedDests] = useState(new Set());
  const [cableListExpanded, setCableListExpanded] = useState(false);
  const [cables, setCables] = useState([]);
  const [fieldState, setFieldState] = useState({ connections: [], internalConns: [] });

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

  const loadPreset = useCallback((presetId) => {
    const preset = TEST_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setCables([]);
    setFieldState({ connections: [], internalConns: [] });
    onFieldStateChange({ connections: [], internalConns: [] });
  }, [onFieldStateChange]);

  const clearCables = useCallback(() => {
    setCables([]);
    const newState = { connections: [], internalConns: [] };
    setFieldState(newState);
    onFieldStateChange(newState);
  }, [onFieldStateChange]);

  const removeCable = useCallback((idx) => {
    setCables(prev => {
      const newCables = prev.filter((_, i) => i !== idx);
      const newState = { connections: newCables, internalConns: fieldState.internalConns };
      setFieldState(newState);
      onFieldStateChange(newState);
      return newCables;
    });
  }, [fieldState.internalConns, onFieldStateChange]);

  const handleSelectOrigin = useCallback((termId) => {
    setSelectedOrigin(termId);
    setSuggestedDests(suggestDestinations(termId, fieldState));
  }, [fieldState]);

  const handleSelectDest = useCallback((destId) => {
    if (selectedOrigin && suggestedDests.has(destId)) {
      setCables(prev => {
        const newCables = [...prev, { from: selectedOrigin, to: destId }];
        const newState = { connections: newCables, internalConns: fieldState.internalConns };
        setFieldState(newState);
        onFieldStateChange(newState);
        return newCables;
      });
      setSelectedOrigin(null);
      setSuggestedDests(new Set());
    }
  }, [selectedOrigin, suggestedDests, fieldState.internalConns, onFieldStateChange]);

  const handleCancel = useCallback(() => {
    setSelectedOrigin(null);
    setSuggestedDests(new Set());
  }, []);

  return (
    <div className="campo-page-new">
      <CampoLeftSidebar
        cables={cables}
        fieldState={fieldState}
        presets={TEST_PRESETS}
        onLoadPreset={loadPreset}
        onClearCables={clearCables}
        cableListExpanded={cableListExpanded}
        onToggleCableList={() => setCableListExpanded(prev => !prev)}
        onRemoveCable={removeCable}
        bkStatus={bkStatus}
      />
      <CampoCanvas
        cables={cables}
        fieldState={fieldState}
        selectedOrigin={selectedOrigin}
        suggestedDests={suggestedDests}
        onSelectOrigin={handleSelectOrigin}
        onSelectDest={handleSelectDest}
        onCancelSelection={handleCancel}
      />
    </div>
  );
}
