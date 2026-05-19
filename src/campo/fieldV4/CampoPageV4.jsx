import FieldStage from './FieldStage.jsx';
import FieldSidePanel from './FieldSidePanel.jsx';
import { fieldV4CSS } from './fieldV4Styles.js';

export default function CampoPageV4(props) {
  return (
    <>
      <style>{fieldV4CSS}</style>
      <div className="field-page-v4">
        <FieldStage />
        <FieldSidePanel />
      </div>
    </>
  );
}
