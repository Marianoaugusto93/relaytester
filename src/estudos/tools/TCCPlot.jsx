/**
 * TCCPlot.jsx — Time-Current Characteristic (TCC) log-log SVG plot.
 *
 * SVG 600×500, margins: left=60, right=120, top=20, bottom=50.
 * Plot area 420×430. X: 1A–10kA (log10 0–4). Y: 0.01s–1000s (log10 -2–3, inverted).
 *
 * Props:
 *   curveDefs      {Array<{id,pickup,timeDial,curveType}>}
 *   showCoordination {boolean}
 *   userTrips      {Array<{I,t,fn,stage}>}
 *
 * Visibility toggling is done by CSS display:none on each <g> so no re-render.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  useTCCPlot,
  CANVAS_W,
  CANVAS_H,
  MARGIN,
  PLOT_W,
  PLOT_H,
  curveToPixels,
  pixelsToCurve,
} from '../hooks/useTCCPlot.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Per-function color palette (matches relay function convention). */
const FN_COLORS = {
  '51':  '#0ea5e9', // cyan
  '51N': '#0ea5e9',
  '50':  '#22d3ee',
  '50N': '#22d3ee',
  '67':  '#f97316', // orange
  '67N': '#f97316',
  '27':  '#4ade80', // green
  '59':  '#fbbf24', // amber
  '47':  '#c4b5fd', // lav
  '46':  '#fda4af', // rose
  '81U': '#7dd3fc', // sky
  '81O': '#fb923c',
  '32':  '#86efac',
};

/** Fallback palette for curves without explicit fn mapping. */
const CURVE_PALETTE = ['#0ea5e9','#22c55e','#f97316','#8b5cf6','#ec4899'];

/** Coordination warning threshold in seconds. */
const COORD_WARN_DT = 0.2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a display color for a curve definition.
 * @param {{fn?: string}} def
 * @param {number} idx
 * @returns {string}
 */
function curveColor(def, idx) {
  if (def.fn && FN_COLORS[def.fn]) return FN_COLORS[def.fn];
  return CURVE_PALETTE[idx % CURVE_PALETTE.length];
}

/**
 * Format current value with kA shorthand.
 * @param {number} I
 * @returns {string}
 */
function fmtI(I) {
  if (I >= 1000) return `${(I / 1000).toFixed(1)}kA`;
  return `${I.toFixed(1)}A`;
}

/**
 * Format time value.
 * @param {number} t
 * @returns {string}
 */
function fmtT(t) {
  if (t >= 1) return `${t.toFixed(3)}s`;
  return `${(t * 1000).toFixed(1)}ms`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Major and minor grid lines + axis tick labels for the log-log plot.
 */
function AxisGrid({ axis }) {
  const { xTicks, xLabels, xMinorTicks, yTicks, yLabels, yMinorTicks } = axis;

  return (
    <g>
      {/* Minor grid lines */}
      {xMinorTicks.map((v) => {
        const { px } = curveToPixels(v, 1);
        const x = px + MARGIN.left;
        return (
          <line
            key={`xm-${v}`}
            x1={x} y1={MARGIN.top}
            x2={x} y2={MARGIN.top + PLOT_H}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={0.5}
          />
        );
      })}
      {yMinorTicks.map((v) => {
        const { py } = curveToPixels(1, v);
        const y = py + MARGIN.top;
        return (
          <line
            key={`ym-${v}`}
            x1={MARGIN.left} y1={y}
            x2={MARGIN.left + PLOT_W} y2={y}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Major grid lines */}
      {xTicks.map((v) => {
        const { px } = curveToPixels(v, 1);
        const x = px + MARGIN.left;
        return (
          <line
            key={`xM-${v}`}
            x1={x} y1={MARGIN.top}
            x2={x} y2={MARGIN.top + PLOT_H}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={0.7}
          />
        );
      })}
      {yTicks.map((v) => {
        const { py } = curveToPixels(1, v);
        const y = py + MARGIN.top;
        return (
          <line
            key={`yM-${v}`}
            x1={MARGIN.left} y1={y}
            x2={MARGIN.left + PLOT_W} y2={y}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={0.7}
          />
        );
      })}

      {/* X tick labels (bottom) */}
      {xTicks.map((v, i) => {
        const { px } = curveToPixels(v, 1);
        const x = px + MARGIN.left;
        return (
          <text
            key={`xl-${v}`}
            x={x}
            y={MARGIN.top + PLOT_H + 14}
            fontSize={9}
            fill="rgba(255,255,255,0.45)"
            fontFamily="var(--fm)"
            textAnchor="middle"
          >
            {xLabels[i]}
          </text>
        );
      })}

      {/* Y tick labels (left) */}
      {yTicks.map((v, i) => {
        const { py } = curveToPixels(1, v);
        const y = py + MARGIN.top;
        return (
          <text
            key={`yl-${v}`}
            x={MARGIN.left - 6}
            y={y + 3}
            fontSize={9}
            fill="rgba(255,255,255,0.45)"
            fontFamily="var(--fm)"
            textAnchor="end"
          >
            {yLabels[i]}
          </text>
        );
      })}

      {/* Axis border box */}
      <rect
        x={MARGIN.left}
        y={MARGIN.top}
        width={PLOT_W}
        height={PLOT_H}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1}
      />

      {/* Axis titles */}
      <text
        x={MARGIN.left + PLOT_W / 2}
        y={CANVAS_H - 4}
        fontSize={10}
        fill="rgba(255,255,255,0.4)"
        fontFamily="var(--fm)"
        textAnchor="middle"
      >
        Corrente (A)
      </text>
      <text
        x={10}
        y={MARGIN.top + PLOT_H / 2}
        fontSize={10}
        fill="rgba(255,255,255,0.4)"
        fontFamily="var(--fm)"
        textAnchor="middle"
        transform={`rotate(-90, 10, ${MARGIN.top + PLOT_H / 2})`}
      >
        Tempo (s)
      </text>
    </g>
  );
}

/**
 * Single TCC curve path inside a <g> with a ref for CSS toggle.
 */
function CurvePath({ id, path, color, hidden }) {
  if (!path) return null;
  return (
    <g id={`curve-g-${id}`} style={{ display: hidden ? 'none' : undefined }}>
      <path
        d={path}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`translate(${MARGIN.left},${MARGIN.top})`}
      />
    </g>
  );
}

/**
 * User trip scatter points.
 */
function TripPoints({ trips, onHover, onLeave }) {
  return (
    <g>
      {(trips || []).map((trip, i) => {
        if (!isFinite(trip.I) || !isFinite(trip.t) || trip.I <= 0 || trip.t <= 0) return null;
        const { px, py } = curveToPixels(trip.I, trip.t);
        const x = px + MARGIN.left;
        const y = py + MARGIN.top;
        const color = FN_COLORS[trip.fn] || '#ffffff';
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={4}
            fill={color}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth={1}
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => onHover(e, trip)}
            onMouseLeave={onLeave}
          />
        );
      })}
    </g>
  );
}

/**
 * Coordination warning dots at intersection points where Δt < threshold.
 */
function CoordWarnings({ intersections, onHover, onLeave }) {
  const warnings = (intersections || []).filter((x) => x.delta_t < COORD_WARN_DT);
  return (
    <g>
      {warnings.map((w, i) => {
        const { px, py } = curveToPixels(w.I, w.t);
        const x = px + MARGIN.left;
        const y = py + MARGIN.top;
        return (
          <g key={i}>
            <circle
              cx={x} cy={y} r={7}
              fill="rgba(239,68,68,0.2)"
              stroke="#ef4444"
              strokeWidth={1.5}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => onHover(e, w)}
              onMouseLeave={onLeave}
            />
            <text
              x={x} y={y + 1}
              fontSize={8}
              fill="#ef4444"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="var(--fm)"
              style={{ pointerEvents: 'none' }}
            >
              !
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * TCCPlot — Interactive TCC log-log chart.
 *
 * @param {object} props
 * @param {Array<{id:string,pickup:number,timeDial:number,curveType:string,fn?:string,label?:string}>} props.curveDefs
 * @param {boolean} [props.showCoordination=false]
 * @param {Array<{I:number,t:number,fn:string,stage:string}>} [props.userTrips=[]]
 */
export default function TCCPlot({ curveDefs = [], showCoordination = false, userTrips = [] }) {
  const { paths, intersections, axis, capped } = useTCCPlot(curveDefs, showCoordination);

  // Visibility state: keyed by curve id, true=visible
  const [visible, setVisible] = useState(() => {
    const init = {};
    curveDefs.forEach((d) => { init[d.id] = true; });
    return init;
  });

  // Sync new curve defs into visible map without wiping existing keys
  useEffect(() => {
    setVisible((prev) => {
      const next = { ...prev };
      curveDefs.forEach((d) => {
        if (next[d.id] === undefined) next[d.id] = true;
      });
      return next;
    });
  }, [curveDefs]);

  // Tooltip state
  const [tooltip, setTooltip] = useState(null); // { x, y, content }
  const svgRef = useRef(null);

  const handleTripHover = useCallback((e, trip) => {
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      content: `${trip.fn || ''}${trip.stage ? ` ${trip.stage}` : ''} trip: ${fmtI(trip.I)} @ ${fmtT(trip.t)}`,
    });
  }, []);

  const handleCoordHover = useCallback((e, w) => {
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      content: `Coordenacao insuficiente: Δt=${fmtT(w.delta_t)}`,
    });
  }, []);

  const handleLeave = useCallback(() => setTooltip(null), []);

  // Hover over SVG to show (I, t) crosshair readout
  const [crosshair, setCrosshair] = useState(null);

  const handleMouseMove = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (CANVAS_W / rect.width) - MARGIN.left;
    const py = (e.clientY - rect.top)  * (CANVAS_H / rect.height) - MARGIN.top;
    if (px < 0 || px > PLOT_W || py < 0 || py > PLOT_H) {
      setCrosshair(null);
      return;
    }
    const { I, t } = pixelsToCurve(px, py);
    setCrosshair({ px: px + MARGIN.left, py: py + MARGIN.top, I, t });
  }, []);

  const handleMouseLeave = useCallback(() => setCrosshair(null), []);

  // Performance measurement (DEV only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      const t0 = performance.now();
      // paths computation already happened in hook; measure rendering budget here
      requestAnimationFrame(() => {
        const dt = performance.now() - t0;
        if (dt > 50) console.warn(`[TCCPlot] render took ${dt.toFixed(1)}ms (target ≤100ms)`);
      });
    }
  }, [paths]);

  const toggleCurve = useCallback((id) => {
    setVisible((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const safeDefs = curveDefs.slice(0, 5);

  return (
    <div style={S.root}>
      {capped && (
        <div style={S.capWarn}>
          Limite: 5 curvas. As extras foram ignoradas.
        </div>
      )}

      <div style={S.layout}>
        {/* SVG Plot */}
        <div style={S.svgWrap}>
          <svg
            ref={svgRef}
            width={CANVAS_W}
            height={CANVAS_H}
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            style={S.svg}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            aria-label="Gráfico TCC — Curvas Tempo-Corrente"
            role="img"
          >
            {/* Background */}
            <rect width={CANVAS_W} height={CANVAS_H} fill="var(--card2)" rx={4} />

            {/* Grid + axes */}
            <AxisGrid axis={axis} />

            {/* TCC curves */}
            <g>
              {safeDefs.map((def, idx) => (
                <CurvePath
                  key={def.id}
                  id={def.id}
                  path={paths[def.id]}
                  color={curveColor(def, idx)}
                  hidden={visible[def.id] === false}
                />
              ))}
            </g>

            {/* User trip scatter */}
            <TripPoints
              trips={userTrips}
              onHover={handleTripHover}
              onLeave={handleLeave}
            />

            {/* Coordination warnings */}
            {showCoordination && (
              <CoordWarnings
                intersections={intersections}
                onHover={handleCoordHover}
                onLeave={handleLeave}
              />
            )}

            {/* Crosshair readout */}
            {crosshair && (
              <g style={{ pointerEvents: 'none' }}>
                <line
                  x1={crosshair.px} y1={MARGIN.top}
                  x2={crosshair.px} y2={MARGIN.top + PLOT_H}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
                <line
                  x1={MARGIN.left} y1={crosshair.py}
                  x2={MARGIN.left + PLOT_W} y2={crosshair.py}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
                <rect
                  x={crosshair.px + 6}
                  y={crosshair.py - 18}
                  width={100}
                  height={16}
                  rx={3}
                  fill="rgba(0,0,0,0.75)"
                />
                <text
                  x={crosshair.px + 10}
                  y={crosshair.py - 7}
                  fontSize={9}
                  fill="rgba(255,255,255,0.8)"
                  fontFamily="var(--fm)"
                >
                  {fmtI(crosshair.I)} / {fmtT(crosshair.t)}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Interactive legend */}
        <div style={S.legend} role="list" aria-label="Curvas TCC">
          <div style={S.legendTitle}>Curvas</div>
          {safeDefs.length === 0 && (
            <div style={S.legendEmpty}>Nenhuma curva selecionada</div>
          )}
          {safeDefs.map((def, idx) => {
            const color = curveColor(def, idx);
            const isOn = visible[def.id] !== false;
            return (
              <button
                key={def.id}
                role="listitem"
                style={{
                  ...S.legendItem,
                  opacity: isOn ? 1 : 0.35,
                }}
                onClick={() => toggleCurve(def.id)}
                title={isOn ? 'Ocultar curva' : 'Mostrar curva'}
                aria-pressed={isOn}
              >
                <span
                  style={{
                    ...S.legendSwatch,
                    background: color,
                    boxShadow: isOn ? `0 0 6px ${color}` : 'none',
                  }}
                />
                <span style={S.legendLabel}>
                  {def.label || def.id}
                </span>
              </button>
            );
          })}

          {/* Coordination status */}
          {showCoordination && intersections.length > 0 && (
            <div style={S.coordSection}>
              <div style={S.coordTitle}>Coordenacao</div>
              {intersections.map((w, i) => {
                const warn = w.delta_t < COORD_WARN_DT;
                return (
                  <div
                    key={i}
                    style={{
                      ...S.coordItem,
                      color: warn ? '#ef4444' : '#4ade80',
                    }}
                  >
                    <span style={{ fontSize: 10 }}>{warn ? '⚠' : '✓'}</span>
                    <span>{fmtI(w.I)} Δt={fmtT(w.delta_t)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          style={{
            ...S.tooltip,
            left: tooltip.x + 12,
            top: tooltip.y - 28,
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const S = {
  root: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    fontFamily: 'var(--fi)',
  },
  capWarn: {
    padding: '4px 10px',
    background: 'rgba(251,191,36,0.1)',
    border: '1px solid rgba(251,191,36,0.3)',
    borderRadius: 6,
    fontSize: 11,
    color: 'var(--amber)',
    fontFamily: 'var(--fm)',
  },
  layout: {
    display: 'flex',
    gap: 0,
    alignItems: 'flex-start',
  },
  svgWrap: {
    flex: '0 0 auto',
    lineHeight: 0,
  },
  svg: {
    display: 'block',
    width: '100%',
    maxWidth: CANVAS_W,
    height: 'auto',
    borderRadius: 4,
    border: '1px solid var(--bdr)',
    cursor: 'crosshair',
  },
  legend: {
    flex: '0 0 108px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingLeft: 10,
    paddingTop: MARGIN.top,
  },
  legendTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--tx3)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'var(--fh)',
    marginBottom: 4,
  },
  legendEmpty: {
    fontSize: 10,
    color: 'var(--tx3)',
    fontFamily: 'var(--fm)',
    fontStyle: 'italic',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '3px 4px',
    borderRadius: 4,
    width: '100%',
    textAlign: 'left',
    transition: 'opacity 0.15s',
  },
  legendSwatch: {
    flexShrink: 0,
    width: 10,
    height: 10,
    borderRadius: 2,
    transition: 'box-shadow 0.15s',
  },
  legendLabel: {
    fontSize: 10,
    color: 'var(--tx2)',
    fontFamily: 'var(--fm)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 80,
  },
  coordSection: {
    marginTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  coordTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--tx3)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'var(--fh)',
    marginBottom: 4,
  },
  coordItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 9,
    fontFamily: 'var(--fm)',
  },
  tooltip: {
    position: 'fixed',
    background: 'rgba(0,0,0,0.85)',
    color: 'var(--tx)',
    fontSize: 10,
    fontFamily: 'var(--fm)',
    padding: '4px 8px',
    borderRadius: 4,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    border: '1px solid var(--bdr)',
    zIndex: 9999,
  },
};
