/**
 * PhasorWheel.jsx — Interactive 6-phasor SVG wheel for Phase 10 VSE.
 *
 * Props:
 *   currents  {Ia,Ib,Ic}  — each {mag, ang}
 *   voltages  {Va,Vb,Vc}  — each {mag, ang}
 *   onChange(nextPhasors)  — callback on mouseup/touchend
 *   maxI      number       — max current scale (default 10 A)
 *   maxV      number       — max voltage scale (default 80 V)
 *
 * Angle convention: 0° = top (12 o'clock), clockwise.
 * Internally all trig uses standard math convention, converted on draw.
 */

import { useState, useRef, useCallback, useMemo, memo } from "react";
import { validatePhasors } from "../engine/scenarioValidator.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CX = 150;          // SVG center X
const CY = 150;          // SVG center Y
const R  = 80;           // radius for max magnitude (px)

// Drag zones (px from center)
const INNER_R = 50;      // ≤ INNER_R → angle drag
// > INNER_R → magnitude drag

// Phase colors: A=yellow, B=green, C=red (voltages same color, dashed)
// Using CSS custom properties so theming is respected.
const COLORS = {
  Ia: "var(--amber)",
  Ib: "var(--green)",
  Ic: "var(--red)",
  Va: "var(--amber)",
  Vb: "var(--green)",
  Vc: "var(--red)",
};

const PHASOR_KEYS = ["Ia", "Ib", "Ic", "Va", "Vb", "Vc"];

// Grid lines every 30°
const GRID_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);
// Concentric circles at 25%, 50%, 75%, 100% of R
const GRID_RADII = [0.25, 0.5, 0.75, 1.0].map(f => f * R);

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Convert display angle (0° top, CW) to SVG angle (0° right, CCW math).
 * @param {number} displayDeg
 * @returns {number} radians for SVG trig
 */
function displayToRad(displayDeg) {
  // 0° top = 90° in math; CW in display = CCW in math negated
  return ((90 - displayDeg) * Math.PI) / 180;
}

/**
 * Convert SVG coords relative to center to display angle (0° top, CW).
 * @param {number} dx  x offset from center
 * @param {number} dy  y offset from center (SVG: positive = down)
 * @returns {number} degrees [0, 360)
 */
function svgToDisplayAngle(dx, dy) {
  // SVG y is flipped: up = negative dy
  const mathRad = Math.atan2(-dy, dx);           // standard math angle
  const displayDeg = 90 - (mathRad * 180) / Math.PI;
  return ((displayDeg % 360) + 360) % 360;
}

/**
 * Snap value to nearest multiple of step.
 * @param {number} val
 * @param {number} step
 * @returns {number}
 */
function snap(val, step) {
  return Math.round(val / step) * step;
}

/**
 * Normalize angle to [0, 360).
 * @param {number} deg
 * @returns {number}
 */
function normAngle(deg) {
  return ((deg % 360) + 360) % 360;
}

/**
 * Get SVG clientX/clientY from mouse or touch event.
 * @param {MouseEvent|TouchEvent} e
 * @returns {{clientX: number, clientY: number}}
 */
function getClientXY(e) {
  if (e.touches && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  }
  if (e.changedTouches && e.changedTouches.length > 0) {
    return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
  }
  return { clientX: e.clientX, clientY: e.clientY };
}

// ---------------------------------------------------------------------------
// Memoized static SVG grid
// ---------------------------------------------------------------------------

const WheelGrid = memo(function WheelGrid() {
  return (
    <g aria-hidden="true">
      {/* Concentric circles */}
      {GRID_RADII.map(r => (
        <circle
          key={r}
          cx={CX}
          cy={CY}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,.06)"
          strokeWidth={1}
        />
      ))}
      {/* Angle grid lines every 30° */}
      {GRID_ANGLES.map(a => {
        const rad = displayToRad(a);
        return (
          <line
            key={a}
            x1={CX}
            y1={CY}
            x2={CX + (R + 8) * Math.cos(rad)}
            y2={CY - (R + 8) * Math.sin(rad)}
            stroke="rgba(255,255,255,.05)"
            strokeWidth={1}
          />
        );
      })}
      {/* Axes cross */}
      <line x1={CX} y1={CY - R - 10} x2={CX} y2={CY + R + 10} stroke="rgba(255,255,255,.1)" strokeWidth={1} />
      <line x1={CX - R - 10} y1={CY} x2={CX + R + 10} y2={CY} stroke="rgba(255,255,255,.1)" strokeWidth={1} />
      {/* Angle labels at cardinal points */}
      <text x={CX} y={CY - R - 14} fill="rgba(255,255,255,.25)" fontSize={8} textAnchor="middle" fontFamily="var(--fm)">0°</text>
      <text x={CX + R + 13} y={CY + 3} fill="rgba(255,255,255,.25)" fontSize={8} textAnchor="middle" fontFamily="var(--fm)">90°</text>
      <text x={CX} y={CY + R + 20} fill="rgba(255,255,255,.25)" fontSize={8} textAnchor="middle" fontFamily="var(--fm)">180°</text>
      <text x={CX - R - 13} y={CY + 3} fill="rgba(255,255,255,.25)" fontSize={8} textAnchor="middle" fontFamily="var(--fm)">270°</text>
    </g>
  );
});

// ---------------------------------------------------------------------------
// Arrowhead marker definition (per color)
// ---------------------------------------------------------------------------

function ArrowMarkers() {
  return (
    <defs>
      {Object.entries(COLORS).map(([id, color]) => (
        <marker
          key={id}
          id={`arrow-${id}`}
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L6,3 Z" style={{ fill: color }} />
        </marker>
      ))}
    </defs>
  );
}

// ---------------------------------------------------------------------------
// Single phasor vector
// ---------------------------------------------------------------------------

const PhasorVector = memo(function PhasorVector({
  id, mag, ang, color, isDashed, scale, isActive, onPointerDown,
}) {
  const r = (mag / scale) * R;
  const isZero = r < 2;

  const rad = displayToRad(ang);
  const ex = CX + r * Math.cos(rad);
  const ey = CY - r * Math.sin(rad);

  const opacity = isZero ? 0.2 : 1;

  // Label position: just beyond tip
  const labelR = r + 12;
  const lx = CX + labelR * Math.cos(rad);
  const ly = CY - labelR * Math.sin(rad);

  return (
    <g
      style={{ opacity, willChange: isActive ? "transform" : undefined, cursor: "grab" }}
      onPointerDown={onPointerDown}
      role="slider"
      aria-label={`${id} phasor`}
      aria-valuetext={`${mag.toFixed(1)} @ ${ang.toFixed(0)}°`}
    >
      {/* Hit-test area (wider than the visible line) */}
      <line
        x1={CX}
        y1={CY}
        x2={isZero ? CX + 20 * Math.cos(rad) : ex}
        y2={isZero ? CY - 20 * Math.sin(rad) : ey}
        stroke="transparent"
        strokeWidth={14}
        style={{ cursor: "grab" }}
      />
      {/* Visible phasor line */}
      {!isZero && (
        <line
          x1={CX}
          y1={CY}
          x2={ex}
          y2={ey}
          style={{ stroke: color }}
          strokeWidth={isActive ? 3 : 2}
          strokeDasharray={isDashed ? "6,3" : undefined}
          markerEnd={`url(#arrow-${id})`}
        />
      )}
      {/* Zero-magnitude indicator: small dim circle */}
      {isZero && (
        <circle cx={CX} cy={CY} r={5} fill="none" style={{ stroke: color }} strokeWidth={1.5} strokeDasharray="2,2" />
      )}
      {/* Label */}
      {!isZero && (
        <text
          x={lx}
          y={ly}
          style={{ fill: color, pointerEvents: "none", userSelect: "none" }}
          fontSize={9}
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--fm)"
        >
          {id}
        </text>
      )}
      {/* Active highlight ring */}
      {isActive && (
        <circle
          cx={isZero ? CX : ex}
          cy={isZero ? CY : ey}
          r={6}
          fill="none"
          style={{ stroke: color }}
          strokeWidth={1.5}
          opacity={0.6}
        />
      )}
    </g>
  );
});

// ---------------------------------------------------------------------------
// Numeric readout row
// ---------------------------------------------------------------------------

const ReadoutRow = memo(function ReadoutRow({ id, mag, ang, color, isDashed, isActive }) {
  const unit = id.startsWith("V") ? "V" : "A";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 0",
        opacity: isActive ? 1 : 0.65,
        transition: "opacity .15s",
      }}
    >
      <span
        style={{
          width: 24,
          fontSize: 10,
          fontWeight: 700,
          fontFamily: "var(--fm)",
          color,
          textDecoration: isDashed ? "underline dotted" : undefined,
          flexShrink: 0,
        }}
      >
        {id}
      </span>
      <span style={{ fontSize: 10, fontFamily: "var(--fm)", color: "var(--tx2)", flex: 1, minWidth: 0 }}>
        {mag.toFixed(1)} {unit} @ {ang.toFixed(1)}°
      </span>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function PhasorWheel({
  currents,
  voltages,
  onChange,
  maxI = 10,
  maxV = 80,
}) {
  // Active phasor index (0-5) for keyboard nav and visual highlight
  const [activePhasor, setActivePhasor] = useState(0);

  // Live drag state (displayed during drag, committed on mouseup)
  const [dragState, setDragState] = useState(null); // {id, mag, ang} or null

  // Drag internals stored in ref to avoid stale closure issues
  const drag = useRef(null); // {id, type, svgRect, startMag, startAng, scale}

  const svgRef = useRef(null);

  // Merge drag overrides into phasors for live display
  const displayPhasors = useMemo(() => {
    const c = { ...currents };
    const v = { ...voltages };
    if (dragState) {
      const { id, mag, ang } = dragState;
      if (id.startsWith("V")) {
        v[id] = { mag, ang };
      } else {
        c[id] = { mag, ang };
      }
    }
    return { currents: c, voltages: v };
  }, [currents, voltages, dragState]);

  // Optional validation warning
  const validation = useMemo(() => {
    try {
      return validatePhasors(displayPhasors);
    } catch {
      return { ok: true, errors: [] };
    }
  }, [displayPhasors]);

  // Build the 6 phasor descriptor objects
  const phasorList = useMemo(() => [
    { id: "Ia", ...displayPhasors.currents.Ia, color: COLORS.Ia, isDashed: false, scale: maxI },
    { id: "Ib", ...displayPhasors.currents.Ib, color: COLORS.Ib, isDashed: false, scale: maxI },
    { id: "Ic", ...displayPhasors.currents.Ic, color: COLORS.Ic, isDashed: false, scale: maxI },
    { id: "Va", ...displayPhasors.voltages.Va, color: COLORS.Va, isDashed: true,  scale: maxV },
    { id: "Vb", ...displayPhasors.voltages.Vb, color: COLORS.Vb, isDashed: true,  scale: maxV },
    { id: "Vc", ...displayPhasors.voltages.Vc, color: COLORS.Vc, isDashed: true,  scale: maxV },
  ], [displayPhasors, maxI, maxV]);

  // ---- Pointer-to-SVG coordinate helper ----
  const getSVGCoords = useCallback((clientX, clientY) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 300 / rect.width;
    const scaleY = 300 / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // ---- Drag start ----
  const handlePointerDown = useCallback((id, e) => {
    e.preventDefault();
    e.stopPropagation();

    const { clientX, clientY } = getClientXY(e);
    const { x, y } = getSVGCoords(clientX, clientY);
    const dx = x - CX;
    const dy = y - CY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const ph = phasorList.find(p => p.id === id);
    if (!ph) return;

    const type = dist <= INNER_R ? "angle" : "magnitude";

    drag.current = {
      id,
      type,
      scale: ph.scale,
      startMag: ph.mag,
      startAng: ph.ang,
    };

    // Set active phasor
    const idx = PHASOR_KEYS.indexOf(id);
    if (idx >= 0) setActivePhasor(idx);

    // Capture pointer for mouse; touch events bubble naturally
    if (e.pointerId !== undefined && svgRef.current) {
      try { svgRef.current.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  }, [phasorList, getSVGCoords]);

  // ---- Drag move ----
  const handlePointerMove = useCallback((e) => {
    if (!drag.current) return;
    e.preventDefault();

    const { clientX, clientY } = getClientXY(e);
    const { x, y } = getSVGCoords(clientX, clientY);
    const dx = x - CX;
    const dy = y - CY;

    const isShift = e.shiftKey;
    const isCtrl  = e.ctrlKey || e.metaKey;
    const { id, type, scale, startMag, startAng } = drag.current;

    let newMag = startMag;
    let newAng  = startAng;

    if (type === "magnitude" && !isCtrl) {
      // Distance from center → magnitude
      const dist = Math.sqrt(dx * dx + dy * dy);
      newMag = Math.max(0, (dist / R) * scale);
      if (isShift) newMag = snap(newMag, scale * 0.1); // snap to 10% steps
      newMag = Math.min(newMag, scale);
      // preserve angle from current display
      const cur = phasorList.find(p => p.id === id);
      newAng = cur ? cur.ang : startAng;
    } else if (type === "angle" || isCtrl) {
      // Angle from mouse position relative to center
      newAng = normAngle(svgToDisplayAngle(dx, dy));
      if (isShift) newAng = snap(newAng, 15); // snap to 15° grid
      // preserve magnitude
      const cur = phasorList.find(p => p.id === id);
      newMag = cur ? cur.mag : startMag;
    }

    setDragState({ id, mag: newMag, ang: newAng });
  }, [getSVGCoords, phasorList]);

  // ---- Drag end ----
  const handlePointerUp = useCallback((e) => {
    if (!drag.current) return;
    const { id } = drag.current;
    drag.current = null;

    if (!dragState) { setDragState(null); return; }

    const { mag, ang } = dragState;
    setDragState(null);

    // Build updated phasors and call onChange once
    if (!onChange) return;
    const nextPhasors = {
      currents: { ...currents },
      voltages: { ...voltages },
    };
    if (id.startsWith("V")) {
      nextPhasors.voltages = { ...voltages, [id]: { mag, ang } };
    } else {
      nextPhasors.currents = { ...currents, [id]: { mag, ang } };
    }
    onChange(nextPhasors);
  }, [dragState, currents, voltages, onChange]);

  // ---- Keyboard navigation ----
  const handleKeyDown = useCallback((e) => {
    const ph = phasorList[activePhasor];
    if (!ph) return;
    const { id, mag, ang } = ph;

    let newMag = mag;
    let newAng = ang;
    let handled = true;

    switch (e.key) {
      case "ArrowRight":
        newAng = normAngle(ang + 5);
        break;
      case "ArrowLeft":
        newAng = normAngle(ang - 5);
        break;
      case "ArrowUp":
        newMag = Math.min(ph.scale, mag + 0.1);
        break;
      case "ArrowDown":
        newMag = Math.max(0, mag - 0.1);
        break;
      case "Tab":
        // Tab cycles phasors; handled via tabIndex on SVG focus
        setActivePhasor(prev => (prev + (e.shiftKey ? 5 : 1)) % 6);
        e.preventDefault();
        return;
      default:
        handled = false;
    }

    if (!handled) return;
    e.preventDefault();

    if (!onChange) return;
    const nextPhasors = {
      currents: { ...currents },
      voltages: { ...voltages },
    };
    if (id.startsWith("V")) {
      nextPhasors.voltages = { ...voltages, [id]: { mag: newMag, ang: newAng } };
    } else {
      nextPhasors.currents = { ...currents, [id]: { mag: newMag, ang: newAng } };
    }
    onChange(nextPhasors);
  }, [activePhasor, phasorList, currents, voltages, onChange]);

  // Touch event passthrough for SVG pointer events
  const handleTouchStart  = useCallback((id, e) => handlePointerDown(id, e), [handlePointerDown]);
  const handleTouchMove   = useCallback((e) => handlePointerMove(e), [handlePointerMove]);
  const handleTouchEnd    = useCallback((e) => handlePointerUp(e), [handlePointerUp]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        userSelect: "none",
      }}
    >
      {/* SVG Wheel */}
      <svg
        ref={svgRef}
        width={300}
        height={300}
        viewBox="0 0 300 300"
        style={{
          background: "var(--card)",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.06)",
          touchAction: "none",
          outline: "none",
        }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        aria-label="Interactive phasor diagram. Use Tab to cycle phasors, Arrow keys to adjust."
        role="group"
      >
        <ArrowMarkers />
        <WheelGrid />

        {/* Background center dot */}
        <circle cx={CX} cy={CY} r={3} fill="rgba(255,255,255,.15)" />

        {/* Phasor vectors (voltages first so currents render on top) */}
        {phasorList.filter(ph => ph.isDashed).map(ph => (
          <PhasorVector
            key={ph.id}
            {...ph}
            isActive={activePhasor === PHASOR_KEYS.indexOf(ph.id)}
            onPointerDown={e => handlePointerDown(ph.id, e)}
          />
        ))}
        {phasorList.filter(ph => !ph.isDashed).map(ph => (
          <PhasorVector
            key={ph.id}
            {...ph}
            isActive={activePhasor === PHASOR_KEYS.indexOf(ph.id)}
            onPointerDown={e => handlePointerDown(ph.id, e)}
          />
        ))}

        {/* Touch handlers on transparent overlay for drag */}
        {phasorList.map(ph => {
          const rad = displayToRad(ph.ang);
          const r = Math.max(20, (ph.mag / ph.scale) * R);
          const ex = CX + r * Math.cos(rad);
          const ey = CY - r * Math.sin(rad);
          return (
            <circle
              key={`touch-${ph.id}`}
              cx={ex}
              cy={ey}
              r={10}
              fill="transparent"
              style={{ cursor: "grab" }}
              onTouchStart={e => handleTouchStart(ph.id, e)}
            />
          );
        })}

        {/* Drag mode label */}
        {drag.current && (
          <text
            x={CX}
            y={CY + R + 22}
            fill="rgba(255,255,255,.3)"
            fontSize={8}
            textAnchor="middle"
            fontFamily="var(--fm)"
          >
            {drag.current.type === "angle" ? "ANGLE" : "MAG"} drag
          </text>
        )}
      </svg>

      {/* Validation warning badge */}
      {!validation.ok && validation.errors.length > 0 && (
        <div
          style={{
            fontSize: 10,
            color: "var(--amber)",
            background: "var(--amber-dim)",
            border: "1px solid rgba(251,191,36,.2)",
            borderRadius: 6,
            padding: "3px 8px",
            maxWidth: 300,
            textAlign: "center",
            fontFamily: "var(--fm)",
          }}
          role="alert"
          aria-live="polite"
        >
          {validation.errors[0]}
        </div>
      )}

      {/* Numeric readout */}
      <div
        style={{
          width: 300,
          background: "var(--card)",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.06)",
          padding: "8px 12px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2px 16px",
        }}
      >
        {phasorList.map((ph, idx) => (
          <ReadoutRow
            key={ph.id}
            id={ph.id}
            mag={ph.mag}
            ang={ph.ang}
            color={ph.color}
            isDashed={ph.isDashed}
            isActive={activePhasor === idx}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(PhasorWheel);
