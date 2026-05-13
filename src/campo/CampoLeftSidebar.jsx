import CampoPresets from "./CampoPresets.jsx";
import CampoStatus from "./CampoStatus.jsx";
import CampoCircuits from "./CampoCircuits.jsx";
import CableList from "./CableList.jsx";

export default function CampoLeftSidebar({
  cables, fieldState, presets, onLoadPreset, onClearCables, 
  cableListExpanded, onToggleCableList, onRemoveCable, bkStatus
}) {
  return (
    <div className="campo-sidebar-new">
      <CampoPresets presets={presets} onLoadPreset={onLoadPreset} />
      <CampoStatus bkStatus={bkStatus} />
      <CampoCircuits cables={cables} fieldState={fieldState} />
      <CableList 
        cables={cables} 
        expanded={cableListExpanded} 
        onToggle={onToggleCableList}
        onRemove={onRemoveCable}
        onClearAll={onClearCables}
      />
    </div>
  );
}
