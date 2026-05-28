import { memo, useMemo } from "react";
import { toRect, fromRect } from "../protection.js";

// Zero-sequence current magnitude from three phasors
function computeI0(currents) {
  const sum = ["Ia", "Ib", "Ic"].reduce(
    (acc, k) => {
      const r = toRect(currents[k].mag, currents[k].ang);
      return { re: acc.re + r.re, im: acc.im + r.im };
    },
    { re: 0, im: 0 }
  );
  return fromRect(sum.re, sum.im).mag;
}

// Negative-sequence current magnitude from three phasors
function computeI2(currents) {
  const toR = (k) => toRect(currents[k].mag, currents[k].ang);
  const ia = toR("Ia"), ib = toR("Ib"), ic = toR("Ic");
  const a2Re = Math.cos((240 * Math.PI) / 180), a2Im = Math.sin((240 * Math.PI) / 180);
  const aRe = Math.cos((120 * Math.PI) / 180), aIm = Math.sin((120 * Math.PI) / 180);
  const aIbRe = aRe * ib.re - aIm * ib.im, aIbIm = aRe * ib.im + aIm * ib.re;
  const a2IcRe = a2Re * ic.re - a2Im * ic.im, a2IcIm = a2Re * ic.im + a2Im * ic.re;
  return fromRect(
    (ia.re + aIbRe + a2IcRe) / 3,
    (ia.im + aIbIm + a2IcIm) / 3
  ).mag;
}

// Zero-sequence voltage magnitude
function computeV0(voltages) {
  const sum = ["Va", "Vb", "Vc"].reduce(
    (acc, k) => {
      const r = toRect(voltages[k].mag, voltages[k].ang);
      return { re: acc.re + r.re, im: acc.im + r.im };
    },
    { re: 0, im: 0 }
  );
  return fromRect(sum.re, sum.im).mag;
}

// Mini phasor diagram — memoized to avoid re-renders on parent prop churn
const PhasorMini = memo(function PhasorMini({ currents, voltages }) {
  const CX = 100, CY = 100, R = 80;
  const toRad = (deg) => ((deg - 90) * Math.PI) / 180;

  const allMags = [
    currents.Ia.mag, currents.Ib.mag, currents.Ic.mag,
    voltages.Va.mag, voltages.Vb.mag, voltages.Vc.mag,
  ];
  const maxMag = Math.max(5, ...allMags);

  const arrow = (mag, ang, color, dashed, key) => {
    const scale = mag / maxMag;
    const x2 = CX + R * scale * Math.cos(toRad(ang));
    const y2 = CY + R * scale * Math.sin(toRad(ang));
    return (
      <g key={key}>
        <line
          x1={CX} y1={CY} x2={x2} y2={y2}
          stroke={color} strokeWidth={dashed ? 1.5 : 2}
          strokeDasharray={dashed ? "2,3" : undefined}
          markerEnd={`url(#arr-${dashed ? "dash" : "solid"})`}
        />
      </g>
    );
  };

  const degMarkers = [0, 90, 180, 270];

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", borderRadius: 8,
      border: "1px solid var(--bdr)", padding: 4,
      display: "flex", justifyContent: "center",
    }}>
      <svg width={200} height={200} viewBox="0 0 200 200">
        <defs>
          <marker id="sp-arr-solid" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="currentColor" />
          </marker>
          <marker id="sp-arr-dash" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#6ab4f5" />
          </marker>
        </defs>
        {[0.25, 0.5, 0.75, 1].map(r => (
          <circle key={r} cx={CX} cy={CY} r={R * r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        ))}
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
        <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
        {degMarkers.map(deg => {
          const rx = CX + (R + 10) * Math.cos(toRad(deg));
          const ry = CY + (R + 10) * Math.sin(toRad(deg));
          return (
            <text key={deg} x={rx} y={ry} textAnchor="middle" dominantBaseline="middle"
              fill="rgba(255,255,255,0.3)" fontSize={7}>{deg}°</text>
          );
        })}
        {arrow(voltages.Va.mag, voltages.Va.ang, "#6ab4f5", true, "Va")}
        {arrow(voltages.Vb.mag, voltages.Vb.ang, "#93c5fd", true, "Vb")}
        {arrow(voltages.Vc.mag, voltages.Vc.ang, "#818cf8", true, "Vc")}
        {arrow(currents.Ia.mag, currents.Ia.ang, "#FFD700", false, "Ia")}
        {arrow(currents.Ib.mag, currents.Ib.ang, "#E53935", false, "Ib")}
        {arrow(currents.Ic.mag, currents.Ic.ang, "#9E9E9E", false, "Ic")}
        <circle cx={CX} cy={CY} r={3} fill="#111" stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
        {[
          { color: "#FFD700", label: "Ia" }, { color: "#E53935", label: "Ib" }, { color: "#9E9E9E", label: "Ic" },
          { color: "#6ab4f5", label: "Va", dash: true }, { color: "#93c5fd", label: "Vb", dash: true }, { color: "#818cf8", label: "Vc", dash: true },
        ].map(({ color, label, dash }, i) => (
          <g key={label} transform={`translate(${4 + i * 32}, 190)`}>
            <line x1={0} y1={0} x2={10} y2={0} stroke={color} strokeWidth={dash ? 1.5 : 2} strokeDasharray={dash ? "2,3" : undefined} />
            <text x={12} y={0} dominantBaseline="middle" fill={color} fontSize={7}>{label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
});

// Computed values row
function ValueRow({ label, value, unit, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
      <span style={{ fontSize: 10, color: "var(--tx3)", fontFamily: "var(--fm)" }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: color || "var(--cyan)", fontFamily: "var(--fm)" }}>
        {typeof value === "number" ? value.toFixed(3) : value}{unit}
      </span>
    </div>
  );
}

/**
 * ScenarioPreview — read-only preview of scenario phasors and computed sequence values.
 * @param {Object} props.scenario - current scenario state {phasors, fns, stages, patch, ...}
 * @param {Object} [props.preview] - {stageId, time} from computePreviewTrip (optional)
 */
export default function ScenarioPreview({ scenario, preview }) {
  const currents = scenario?.phasors?.currents ?? {
    Ia: { mag: 0, ang: 0 }, Ib: { mag: 0, ang: -120 }, Ic: { mag: 0, ang: 120 },
  };
  const voltages = scenario?.phasors?.voltages ?? {
    Va: { mag: 66.4, ang: 0 }, Vb: { mag: 66.4, ang: -120 }, Vc: { mag: 66.4, ang: 120 },
  };

  const computed = useMemo(() => {
    const I0 = computeI0(currents);
    const I2 = computeI2(currents);
    const V0 = computeV0(voltages);
    return { I0, I2, V0 };
  }, [currents, voltages]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Mini phasor diagram */}
      <PhasorMini currents={currents} voltages={voltages} />

      {/* Magnitude labels */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 4, padding: "6px 8px",
        background: "rgba(255,255,255,0.03)", borderRadius: 6,
        border: "1px solid var(--bdr)",
      }}>
        {[
          { label: "Ia", value: currents.Ia.mag, color: "#FFD700", unit: "A" },
          { label: "Ib", value: currents.Ib.mag, color: "#E53935", unit: "A" },
          { label: "Ic", value: currents.Ic.mag, color: "#9E9E9E", unit: "A" },
          { label: "Va", value: voltages.Va.mag, color: "#6ab4f5", unit: "V" },
          { label: "Vb", value: voltages.Vb.mag, color: "#93c5fd", unit: "V" },
          { label: "Vc", value: voltages.Vc.mag, color: "#818cf8", unit: "V" },
        ].map(({ label, value, color, unit }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "var(--tx3)", marginBottom: 1 }}>{label}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color, fontFamily: "var(--fm)" }}>
              {value.toFixed(2)}{unit}
            </div>
          </div>
        ))}
      </div>

      {/* Computed sequence values */}
      <div style={{
        background: "var(--card2)", borderRadius: 8,
        border: "1px solid var(--bdr)", padding: "8px 10px",
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: "var(--tx3)",
          textTransform: "uppercase", letterSpacing: "1px",
          marginBottom: 6, fontFamily: "var(--fm)",
          borderBottom: "1px solid var(--bdr)", paddingBottom: 4,
        }}>
          Componentes Simétricas
        </div>
        <ValueRow label="I0 (seq. zero)" value={computed.I0} unit=" A" color="var(--warm)" />
        <ValueRow label="I2 (seq. negativa)" value={computed.I2} unit=" A" color="var(--rose)" />
        <ValueRow label="V0 (seq. zero tensão)" value={computed.V0} unit=" V" color="var(--amber)" />
      </div>

      {/* Trip indicator */}
      <div style={{
        background: "var(--card2)", borderRadius: 8, padding: "8px 10px",
        border: preview ? "1px solid rgba(74,222,128,.2)" : "1px solid var(--bdr)",
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: "var(--tx3)",
          textTransform: "uppercase", letterSpacing: "1px",
          marginBottom: 6, fontFamily: "var(--fm)",
        }}>
          Preview de Trip
        </div>
        {preview ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              background: "var(--green-dim)", color: "var(--green)",
              border: "1px solid rgba(74,222,128,.25)",
              borderRadius: 6, padding: "3px 8px",
              fontSize: 11, fontWeight: 700, fontFamily: "var(--fm)",
            }}>
              {preview.stageId}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--warm)", fontFamily: "var(--fm)" }}>
              @ {Number(preview.time).toFixed(3)} s
            </span>
            <span style={{ fontSize: 9, color: "var(--tx3)" }}>±10%</span>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "var(--tx3)", fontStyle: "italic" }}>
            Nenhum trip esperado com os valores atuais
          </div>
        )}
      </div>
    </div>
  );
}
