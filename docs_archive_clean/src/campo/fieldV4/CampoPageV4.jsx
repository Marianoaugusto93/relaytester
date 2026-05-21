import { useState } from 'react';
import FieldHeader from './FieldHeader.jsx';
import FieldStage from './FieldStage.jsx';
import FieldSidePanel from './FieldSidePanel.jsx';
import { fieldV4CSS } from './fieldV4Styles.js';

export default function CampoPageV4(props) {
  const [mode, setMode] = useState('op');

  return (
    <>
      <style>{fieldV4CSS}</style>
      <div className="field-page-v4">
        <FieldHeader mode={mode} onModeChange={setMode} />
        <div className="field-main">
          <FieldStage mode={mode} onModeChange={setMode} />
          <FieldSidePanel />
        </div>
      </div>
    </>
  );
}
