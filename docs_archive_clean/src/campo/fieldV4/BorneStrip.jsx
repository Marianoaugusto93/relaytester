import { BORNES } from './fieldV4Data.js';
import { phaseColor } from './fieldLogic.js';

export default function BorneStrip() {
  return (
    <div className="borne-strip">
      {BORNES.map(borne => (
        <div
          key={borne.n}
          className="borne"
          data-connector={`TB${borne.n}-b`}
          style={{ borderLeftColor: phaseColor(borne.phase) }}
        >
          <div className="screw-top" />
          <div className="borne-number">{borne.n}</div>
          <div className="borne-tag">{borne.tag}</div>
          <div className="screw-bottom" />
        </div>
      ))}
    </div>
  );
}
