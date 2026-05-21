import CampoPresets from "./CampoPresets.jsx";
import CampoStatus from "./CampoStatus.jsx";
import CampoCircuits from "./CampoCircuits.jsx";
import CableList from "./CableList.jsx";

export default function CampoLeftSidebar({
  cables, fieldState, electricalGraph, presets, onLoadPreset, onClearCables,
  cableListExpanded, onToggleCableList, onRemoveCable, bkStatus, boStatus, biStatus, switchSt
}) {
  return (
    <div className="campo-sidebar-new">
      <CampoPresets presets={presets} onLoadPreset={onLoadPreset} cables={cables} switchSt={switchSt} />
      <CampoStatus bkStatus={bkStatus} />
      <CampoCircuits cables={cables} fieldState={fieldState} electricalGraph={electricalGraph} boStatus={boStatus} biStatus={biStatus} />
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
