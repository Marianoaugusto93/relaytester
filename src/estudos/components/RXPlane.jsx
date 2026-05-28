/**
 * RXPlane.jsx — R-X plane visualization for distance protection zones.
 *
 * Renders mho (circle) and quad (polygon) zones on a 500×500 SVG canvas
 * with interactive pan, zoom, and operating-point tooltip.
 *
 * Props:
 *   zones          — { mho: {cx,cy,r}, quad: [[r,x],...], zone2Mho, zone3Mho }
 *   operatingPoint — { r: number, x: number } fault impedance in secondary ohms
 *   scale          — initial zoom (default 1.0, clamped [0.5, 8.0])
 */

import { useState, useRef, useEffect, useCallback, memo } from "react";
import useRXPlot, { transformToSvg } from "../hooks/useRXPlot.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const SVG_W = 500;
const SVG_H = 500;
const ORIGIN_X = 250;
const ORIGIN_Y = 250;
const SCALE_MIN = 0.5;
const SCALE_MAX = 8.0;
const BASE_PX_PER_OHM = 40;

// ─── Zone group — memoized to skip re-render when zones unchanged ─────────────
const ZoneGroup = memo(function ZoneGroup({ svgPaths }) {
  return (
    <g aria-label="Protection zones">
      {svgPaths.mho && (
        <path
          d={svgPaths.mho}
          fill="rgba(0,150,200,0.15)"
          stroke="var(--cyan)"
          strokeWidth={1.5}
          strokeOpacity={0.75}
        />
      )}
      {svgPaths.quad && (
        <path
          d={svgPaths.quad}
          fill="rgba(200,0,150,0.15)"
          stroke="var(--orange)"
          strokeWidth={1.5}
          strokeOpacity={0.75}
        />
      )}
    </g>
  );
});

// ─── Determine operating-point color by zone membership ──────────────────────
function pointColor(hitResult) {
  if (!hitResult) return "var(--tx3)";
  if (hitResult.inZone1) return "var(--green)";
  if (hitResult.inZone2) return "var(--amber)";
  if (hitResult.inZone3) return "var(--orange)";
  return "var(--red)";
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RXPlane({ zones = {}, operatingPoint, scale: initScale = 1.0 }) {
  const [scale, setScale] = useState(
    Math.max(SCALE_MIN, Math.min(SCALE_MAX, initScale))
  );
  const [tooltip, setTooltip] = useState(null); // { r, x, svgX, svgY }

  // Pan state lives on a ref so we never re-render during drag
  const panRef = useRef({ tx: 0, ty: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, tx: 0, ty: 0 });
  const gRef = useRef(null);       // <g> that receives transform
  const svgRef = useRef(null);

  // Touch pinch state
  const pinchRef = useRef(null);   // { dist, scale }

  const { svgPaths, gridLines, ticks, hitTest } = useRXPlot(zones, scale);

  // Apply pan+zoom transform to the inner <g> without touching React state
  const applyTransform = useCallback(() => {
    if (!gRef.current) return;
    const { tx, ty } = panRef.current;
    gRef.current.setAttribute("transform", `translate(${tx},${ty})`);
  }, []);

  // Reset view to defaults
  const resetView = useCallback(() => {
    panRef.current = { tx: 0, ty: 0 };
    setScale(Math.max(SCALE_MIN, Math.min(SCALE_MAX, initScale)));
    if (gRef.current) {
      gRef.current.setAttribute("transform", "translate(0,0)");
    }
  }, [initScale]);

  // Escape key resets view
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") resetView();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resetView]);

  // ── Mouse wheel zoom ────────────────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function onWheel(e) {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      // Cursor position relative to SVG
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      setScale(prev => {
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const next = Math.max(SCALE_MIN, Math.min(SCALE_MAX, prev * factor));

        // Adjust pan so zoom is centered on cursor
        const ratio = next / prev;
        panRef.current = {
          tx: cx + (panRef.current.tx - cx) * ratio,
          ty: cy + (panRef.current.ty - cy) * ratio,
        };
        applyTransform();
        return next;
      });
    }

    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [applyTransform]);

  // ── Mouse pan ───────────────────────────────────────────────────────────────
  function onMouseDown(e) {
    // Only drag on empty area (not the operating point)
    if (e.target.closest("[data-oppoint]")) return;
    dragging.current = true;
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      tx: panRef.current.tx,
      ty: panRef.current.ty,
    };
    e.currentTarget.style.cursor = "grabbing";
  }

  function onMouseMove(e) {
    if (!dragging.current) return;
    panRef.current = {
      tx: dragStart.current.tx + (e.clientX - dragStart.current.mx),
      ty: dragStart.current.ty + (e.clientY - dragStart.current.my),
    };
    applyTransform();
  }

  function onMouseUp(e) {
    if (!dragging.current) return;
    dragging.current = false;
    e.currentTarget.style.cursor = "";
  }

  function onMouseLeave(e) {
    if (dragging.current) {
      dragging.current = false;
      e.currentTarget.style.cursor = "";
    }
  }

  // ── Touch pinch-zoom ────────────────────────────────────────────────────────
  function touchDist(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onTouchStart(e) {
    if (e.touches.length === 2) {
      pinchRef.current = {
        dist: touchDist(e.touches[0], e.touches[1]),
        scale,
      };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      dragging.current = true;
      dragStart.current = {
        mx: t.clientX,
        my: t.clientY,
        tx: panRef.current.tx,
        ty: panRef.current.ty,
      };
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 2 && pinchRef.current) {
      const newDist = touchDist(e.touches[0], e.touches[1]);
      const factor = newDist / pinchRef.current.dist;
      const next = Math.max(
        SCALE_MIN,
        Math.min(SCALE_MAX, pinchRef.current.scale * factor)
      );
      const ratio = next / scale;
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const cx = midX - rect.left;
        const cy = midY - rect.top;
        panRef.current = {
          tx: cx + (panRef.current.tx - cx) * ratio,
          ty: cy + (panRef.current.ty - cy) * ratio,
        };
        applyTransform();
      }
      setScale(next);
    } else if (e.touches.length === 1 && dragging.current) {
      const t = e.touches[0];
      panRef.current = {
        tx: dragStart.current.tx + (t.clientX - dragStart.current.mx),
        ty: dragStart.current.ty + (t.clientY - dragStart.current.my),
      };
      applyTransform();
    }
  }

  function onTouchEnd() {
    dragging.current = false;
    pinchRef.current = null;
  }

  // ── Operating point ─────────────────────────────────────────────────────────
  const opHit = operatingPoint
    ? hitTest(operatingPoint.r, operatingPoint.x)
    : null;
  const opColor = pointColor(opHit);
  const opSvg = operatingPoint
    ? transformToSvg(operatingPoint.r, operatingPoint.x, scale)
    : null;

  // ── Font size — responsive ──────────────────────────────────────────────────
  // Labels shrink on small viewports; SVG is fixed 500px internally but
  // can be scaled by the container via CSS.
  const labelSize = 9;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        lineHeight: 0,
        userSelect: "none",
      }}
    >
      <svg
        ref={svgRef}
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        role="img"
        aria-label="R-X Plane: Zone reach visualization"
        tabIndex={0}
        style={{
          background: "var(--bg, #0e1015)",
          borderRadius: 8,
          display: "block",
          cursor: "grab",
          touchAction: "none",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* All content in panning group */}
        <g ref={gRef} transform="translate(0,0)">

          {/* Minor grid lines */}
          {gridLines.minor.map((l, i) => (
            <line
              key={`mn${i}`}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="var(--tx3, #5c6370)"
              strokeWidth={0.5}
              strokeOpacity={0.3}
            />
          ))}

          {/* Major grid lines */}
          {gridLines.major.map((l, i) => (
            <line
              key={`mj${i}`}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="var(--tx3, #5c6370)"
              strokeWidth={0.75}
              strokeOpacity={0.5}
            />
          ))}

          {/* R-axis (horizontal) — cyan accent */}
          <line
            x1={0} y1={ORIGIN_Y} x2={SVG_W} y2={ORIGIN_Y}
            stroke="var(--cyan, #0ea5e9)"
            strokeWidth={1}
            strokeOpacity={0.5}
          />
          {/* X-axis (vertical) — red accent */}
          <line
            x1={ORIGIN_X} y1={0} x2={ORIGIN_X} y2={SVG_H}
            stroke="var(--red, #f87171)"
            strokeWidth={1}
            strokeOpacity={0.5}
          />

          {/* R-axis tick labels */}
          {ticks.r.map((t) => (
            <text
              key={`rt${t.value}`}
              x={t.svgX}
              y={ORIGIN_Y + 12}
              fill="var(--tx3, #5c6370)"
              fontSize={labelSize}
              fontFamily="var(--fm, monospace)"
              textAnchor="middle"
            >
              {t.value}
            </text>
          ))}

          {/* X-axis tick labels */}
          {ticks.x.map((t) => (
            <text
              key={`xt${t.value}`}
              x={ORIGIN_X - 14}
              y={t.svgY}
              fill="var(--tx3, #5c6370)"
              fontSize={labelSize}
              fontFamily="var(--fm, monospace)"
              textAnchor="end"
              dominantBaseline="central"
            >
              {t.value}
            </text>
          ))}

          {/* Axis labels */}
          <text
            x={SVG_W - 8}
            y={ORIGIN_Y - 6}
            fill="var(--cyan, #0ea5e9)"
            fontSize={10}
            fontFamily="var(--fm, monospace)"
            textAnchor="end"
            fontWeight={700}
          >
            R (Ω)
          </text>
          <text
            x={ORIGIN_X + 6}
            y={10}
            fill="var(--red, #f87171)"
            fontSize={10}
            fontFamily="var(--fm, monospace)"
            textAnchor="start"
            fontWeight={700}
          >
            X (Ω)
          </text>

          {/* Origin crosshair */}
          <circle
            cx={ORIGIN_X}
            cy={ORIGIN_Y}
            r={3}
            fill="var(--tx3, #5c6370)"
            opacity={0.6}
          />
          <text
            x={ORIGIN_X + 5}
            y={ORIGIN_Y + 12}
            fill="var(--tx3, #5c6370)"
            fontSize={labelSize}
            fontFamily="var(--fm, monospace)"
          >
            0
          </text>

          {/* Zone shapes */}
          <ZoneGroup svgPaths={svgPaths} />

          {/* Operating point */}
          {opSvg && (
            <g
              data-oppoint="1"
              style={{ cursor: "crosshair" }}
              onMouseEnter={() => setTooltip({
                r: operatingPoint.r,
                x: operatingPoint.x,
                svgX: opSvg.svgX,
                svgY: opSvg.svgY,
              })}
              onMouseLeave={() => setTooltip(null)}
            >
              <circle
                cx={opSvg.svgX}
                cy={opSvg.svgY}
                r={12}
                fill="transparent"
              />
              <circle
                cx={opSvg.svgX}
                cy={opSvg.svgY}
                r={4}
                fill={opColor}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={1}
              />
            </g>
          )}

        </g>{/* end pan group */}

        {/* Tooltip — outside pan group so it stays fixed in SVG space */}
        {tooltip && opSvg && (
          <g>
            <rect
              x={opSvg.svgX + 10}
              y={opSvg.svgY - 22}
              width={140}
              height={20}
              rx={4}
              fill="var(--card2, #1e2129)"
              stroke="var(--bdr, rgba(255,255,255,0.06))"
              strokeWidth={1}
            />
            <text
              x={opSvg.svgX + 18}
              y={opSvg.svgY - 8}
              fill="var(--tx, #f0f0f5)"
              fontSize={10}
              fontFamily="var(--fm, monospace)"
            >
              {`(r, x) = (${tooltip.r.toFixed(2)}, ${tooltip.x.toFixed(2)}) Ω`}
            </text>
          </g>
        )}

      </svg>

      {/* Reset button (visible hint) */}
      <button
        onClick={resetView}
        title="Reset view (Esc)"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "var(--card2, #1e2129)",
          border: "1px solid var(--bdr, rgba(255,255,255,0.06))",
          color: "var(--tx3, #5c6370)",
          borderRadius: 6,
          padding: "3px 7px",
          fontSize: 10,
          fontFamily: "var(--fm, monospace)",
          cursor: "pointer",
          lineHeight: 1.4,
          zIndex: 1,
        }}
        aria-label="Reset zoom and pan"
      >
        ↺ Reset
      </button>
    </div>
  );
}
