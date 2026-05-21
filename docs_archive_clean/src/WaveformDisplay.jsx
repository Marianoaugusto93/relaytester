import { useRef, useEffect, useCallback, useState } from "react";

// ─── CSS ────────────────────────────────────────────────────────────────────
const WF_CSS = `
.wfd-wrap{display:flex;flex-direction:column;gap:6px;padding:8px;height:100%;width:100%;min-height:0;min-width:0;overflow:hidden}
.wfd-canvas-box{position:relative;border-radius:8px;overflow:hidden;background:#0a0e14;border:1px solid rgba(255,255,255,.07);flex:1;min-height:0}
.wfd-canvas{display:block;width:100%;height:100%}
.wfd-overlay-text{position:absolute;top:4px;right:6px;display:flex;flex-direction:column;gap:1px;pointer-events:none}
.wfd-tag{font-size:9px;font-family:'JetBrains Mono',monospace;font-weight:700;letter-spacing:.5px;padding:1px 5px;border-radius:3px;opacity:.92}
.wfd-tag-a{background:rgba(239,68,68,.18);color:#f87171}
.wfd-tag-b{background:rgba(34,197,94,.15);color:#4ade80}
.wfd-tag-c{background:rgba(59,130,246,.18);color:#60a5fa}
.wfd-timeline{border-radius:6px;overflow:hidden;background:#0a0e14;border:1px solid rgba(255,255,255,.07);height:40px;flex-shrink:0}
.wfd-timeline canvas{display:block;width:100%;height:100%}
.wfd-controls{display:flex;align-items:center;gap:5px;flex-shrink:0;flex-wrap:wrap}
.wfd-btn{padding:5px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#9ca3b0;font-size:10px;font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:all .15s;white-space:nowrap}
.wfd-btn:hover{border-color:rgba(255,255,255,.2);color:#f0f0f5}
.wfd-btn.wfd-start{border-color:rgba(74,222,128,.25);background:rgba(74,222,128,.08);color:#4ade80}
.wfd-btn.wfd-start:hover{background:rgba(74,222,128,.15)}
.wfd-btn.wfd-stop{border-color:rgba(248,113,113,.25);background:rgba(248,113,113,.08);color:#f87171}
.wfd-btn.wfd-stop:hover{background:rgba(248,113,113,.15)}
.wfd-btn.wfd-clear{border-color:rgba(251,191,36,.2);background:rgba(251,191,36,.06);color:#fbbf24}
.wfd-btn.wfd-clear:hover{background:rgba(251,191,36,.12)}
.wfd-btn:disabled{opacity:.3;cursor:not-allowed}
.wfd-loop-wrap{display:flex;align-items:center;gap:5px;margin-left:auto}
.wfd-loop-lbl{font-size:10px;font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:1px;color:#5c6370;text-transform:uppercase;cursor:pointer;user-select:none}
.wfd-loop-cb{width:14px;height:14px;cursor:pointer;accent-color:#f97316}
.wfd-info{display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap}
.wfd-info-item{flex:1;min-width:0;background:#0d1117;border-radius:5px;border:1px solid rgba(255,255,255,.05);padding:4px 7px}
.wfd-info-lbl{font-size:8px;font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:1px;color:#5c6370;text-transform:uppercase}
.wfd-info-val{font-size:11px;font-family:'JetBrains Mono',monospace;font-weight:600;color:#f0f0f5;white-space:nowrap}
.wfd-ctrl-row{display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:4px 0}
.wfd-pill-group{display:flex;gap:3px;align-items:center}
.wfd-pill-label{font-size:9px;font-weight:700;color:#5c6370;letter-spacing:1px;text-transform:uppercase;margin-right:4px}
.wfd-pill{padding:4px 10px;border-radius:5px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#9ca3b0;font-size:9px;font-family:'Rajdhani',sans-serif;font-weight:700;cursor:pointer;transition:all .15s;white-space:nowrap}
.wfd-pill:hover{border-color:rgba(255,255,255,.15);background:rgba(255,255,255,.06)}
.wfd-pill.on{background:var(--orange-dim);border-color:rgba(249,115,22,.3);color:var(--orange)}
.wfd-markers-row{display:flex;gap:6px;flex-wrap:wrap;padding:4px 0;max-height:32px;overflow-y:auto}
.wfd-marker-chip{display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:4px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);font-size:9px;font-family:'JetBrains Mono',monospace;color:#9ca3b0;white-space:nowrap}
.wfd-marker-chip.m-orange{background:rgba(249,115,22,.12);border-color:rgba(249,115,22,.2);color:var(--orange)}
.wfd-marker-chip.m-cyan{background:rgba(14,165,233,.12);border-color:rgba(14,165,233,.2);color:var(--cyan)}
.wfd-marker-chip.m-green{background:rgba(74,222,128,.12);border-color:rgba(74,222,128,.2);color:#4ade80}
.wfd-marker-chip.m-amber{background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.2);color:#fbbf24}
.wfd-marker-chip button{background:transparent;border:none;color:inherit;font-size:11px;cursor:pointer;padding:0 2px;opacity:.6;transition:opacity .15s}
.wfd-marker-chip button:hover{opacity:1}
.wfd-cursor-tooltip{position:absolute;background:rgba(10,14,20,.95);border:1px solid rgba(14,165,233,.4);border-radius:5px;padding:6px 10px;font-size:9px;font-family:'JetBrains Mono',monospace;color:#0ea5e9;pointer-events:none;z-index:10;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.6)}
.wfd-pause-overlay{position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;pointer-events:none;border-radius:8px;z-index:5}
.wfd-pause-text{font-size:14px;font-weight:700;color:var(--orange);letter-spacing:2px;font-family:'Rajdhani',sans-serif}
`;


// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const FREQ = 60;           // Hz
const PRE_FAULT_MS = 500;  // ms pre-fault zone
const WINDOW_MS = 100;     // visible waveform window in ms
const CANVAS_H = 180;      // canvas height px (logical)
const TIMELINE_H = 40;     // timeline height px (logical)

// Phase colours (dark-theme friendly)
const PHASE_COLORS = {
  Ia: '#f87171',  // red
  Ib: '#4ade80',  // green
  Ic: '#60a5fa',  // blue
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const rms = (mag) => mag / Math.sqrt(2);

/**
 * Draw one frame of the 3-phase sinusoid on the waveform canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w - canvas width (CSS pixels * dpr)
 * @param {number} h - canvas height
 * @param {Object} phasors - {Ia,Ib,Ic} each {mag, ang}
 * @param {number} tNow - current simulation time in seconds
 * @param {boolean} running - is injection active
 * @param {number|null} tripTimeS - trip event time in seconds (or null)
 * @param {string} tripLabel - stage name for the trip marker
 * @param {number} freq - system frequency Hz
 * @param {number} zoomMs - visible window in ms (instead of WINDOW_MS)
 * @param {Array} markers - array of {id, timeS, color} markers
 * @param {number|null} cursorX - cursor X position in px, or null
 */
function drawWaveform(ctx, w, h, phasors, tNow, running, tripTimeS, tripLabel, freq, zoomMs = 100, markers = [], cursorX = null) {
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, w, h);

  const midY = h / 2;
  const margin = { left: 2, right: 2 };
  const plotW = w - margin.left - margin.right;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,.04)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const y = (h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(w - margin.right, y);
    ctx.stroke();
  }
  // Vertical grid every 1/4 period
  const quarterPeriodPx = plotW / (zoomMs / 1000 * freq * 4);
  for (let i = 0; i <= zoomMs / 1000 * freq * 4; i++) {
    const x = margin.left + i * quarterPeriodPx;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Zero line
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, midY);
  ctx.lineTo(w - margin.right, midY);
  ctx.stroke();

  if (!running) {
    // Draw idle text
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.font = `bold 11px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('IDLE — press Start Injection', w / 2, midY + 4);
    return;
  }

  // Determine amplitude scale: use max magnitude across phases
  const mags = [phasors.Ia.mag, phasors.Ib.mag, phasors.Ic.mag];
  const maxMag = Math.max(...mags, 0.001);
  const ampScale = (h / 2 - 6) / maxMag;

  // Draw each phase
  const phases = ['Ia', 'Ib', 'Ic'];
  const tStart = tNow - zoomMs / 1000;

  phases.forEach(ph => {
    const { mag, ang } = phasors[ph];
    if (mag < 0.001) return;
    const angRad = (ang * Math.PI) / 180;
    const color = PHASE_COLORS[ph];

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.beginPath();

    for (let px = 0; px <= plotW; px++) {
      const t = tStart + (px / plotW) * (zoomMs / 1000);
      const y_val = mag * Math.sin(2 * Math.PI * freq * t + angRad);
      const x = margin.left + px;
      const y = midY - y_val * ampScale;
      if (px === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // Draw markers
  markers.forEach(m => {
    const tOffset = m.timeS - tStart;
    if (tOffset >= 0 && tOffset <= zoomMs / 1000) {
      const markerX = margin.left + (tOffset / (zoomMs / 1000)) * plotW;
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(markerX, 0);
      ctx.lineTo(markerX, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  // Draw cursor
  if (cursorX !== null && cursorX >= margin.left && cursorX <= w - margin.right) {
    ctx.strokeStyle = 'rgba(14,165,233,.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(cursorX, 0);
    ctx.lineTo(cursorX, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Cursor circle at zero line
    ctx.fillStyle = 'rgba(14,165,233,.4)';
    ctx.beginPath();
    ctx.arc(cursorX, midY, 4, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Trip marker (vertical red line at trip moment — mapped to current window)
  if (tripTimeS !== null) {
    const tOffset = tripTimeS - tStart;
    if (tOffset >= 0 && tOffset <= WINDOW_MS / 1000) {
      // Trip marker is within the visible window — draw vertical dashed line
      const tripX = margin.left + (tOffset / (WINDOW_MS / 1000)) * plotW;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(tripX, 0);
      ctx.lineTo(tripX, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Trip label
      ctx.fillStyle = '#ef4444';
      ctx.font = `bold 9px 'JetBrains Mono', monospace`;
      ctx.textAlign = tripX > w * 0.7 ? 'right' : 'left';
      const labelX = tripX + (tripX > w * 0.7 ? -4 : 4);
      ctx.fillText('TRIP', labelX, 12);
      if (tripLabel) ctx.fillText(tripLabel, labelX, 23);
    } else if (tOffset < 0) {
      // Trip has scrolled off the left edge — show persistent banner at bottom-left
      const deltaMs = Math.round((tNow - tripTimeS) * 1000);
      ctx.fillStyle = 'rgba(239,68,68,.15)';
      ctx.beginPath();
      ctx.roundRect(margin.left, h - 22, 140, 18, 3);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.font = `bold 9px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'left';
      const stagePart = tripLabel ? ` [${tripLabel}]` : '';
      ctx.fillText(`TRIP${stagePart} — ${deltaMs}ms ago`, margin.left + 5, h - 9);
    }
  }
}

/**
 * Draw the timeline bar showing pre-fault and injection zones.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {boolean} running
 * @param {number} injectionTimeMs - elapsed injection time in ms
 * @param {number|null} tripTimeMs - trip time in ms (null if no trip yet)
 * @param {string} tripLabel
 */
function drawTimeline(ctx, w, h, running, injectionTimeMs, tripTimeMs, tripLabel) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, w, h);

  const totalMs = PRE_FAULT_MS + Math.max(injectionTimeMs, 200);
  const barH = 10;
  const barY = h / 2 - barH / 2;
  const margin = { left: 44, right: 10 };
  const barW = w - margin.left - margin.right;

  // Pre-fault zone (gray)
  const preFaultW = Math.round((PRE_FAULT_MS / totalMs) * barW);
  ctx.fillStyle = 'rgba(100,116,139,.35)';
  ctx.beginPath();
  ctx.roundRect(margin.left, barY, preFaultW, barH, 3);
  ctx.fill();

  // Injection zone (orange/cyan gradient)
  if (running || injectionTimeMs > 0) {
    const injW = barW - preFaultW;
    const grad = ctx.createLinearGradient(margin.left + preFaultW, 0, margin.left + barW, 0);
    grad.addColorStop(0, 'rgba(249,115,22,.5)');
    grad.addColorStop(1, 'rgba(14,165,233,.3)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(margin.left + preFaultW, barY, injW, barH, 3);
    ctx.fill();
  }

  // Zone labels
  ctx.font = `700 7px 'Rajdhani', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(100,116,139,.8)';
  ctx.fillText('PRE-FAULT', margin.left + preFaultW / 2, barY - 3);

  if (running || injectionTimeMs > 0) {
    const injW = barW - preFaultW;
    ctx.fillStyle = 'rgba(249,115,22,.8)';
    ctx.fillText('INJECTION', margin.left + preFaultW + injW / 2, barY - 3);
  }

  // Time axis labels
  ctx.font = `600 7px 'JetBrains Mono', monospace`;
  ctx.fillStyle = '#5c6370';
  ctx.textAlign = 'left';
  ctx.fillText('0ms', margin.left - 2, h - 3);
  ctx.textAlign = 'center';
  ctx.fillText(`${PRE_FAULT_MS}ms`, margin.left + preFaultW, h - 3);
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(PRE_FAULT_MS + injectionTimeMs)}ms`, margin.left + barW, h - 3);

  // Left label
  ctx.save();
  ctx.translate(14, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#5c6370';
  ctx.font = `700 7px 'Rajdhani', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('TIME', 0, 0);
  ctx.restore();

  // Trip marker on timeline
  if (tripTimeMs !== null) {
    const totalElapsed = PRE_FAULT_MS + tripTimeMs;
    const tripX = margin.left + (totalElapsed / totalMs) * barW;
    if (tripX >= margin.left && tripX <= margin.left + barW) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tripX, barY - 2);
      ctx.lineTo(tripX, barY + barH + 2);
      ctx.stroke();

      // Diamond marker
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(tripX, barY - 6);
      ctx.lineTo(tripX + 4, barY - 2);
      ctx.lineTo(tripX, barY + 2);
      ctx.lineTo(tripX - 4, barY - 2);
      ctx.closePath();
      ctx.fill();

      // Trip label below bar
      ctx.fillStyle = '#ef4444';
      ctx.font = `700 7px 'JetBrains Mono', monospace`;
      ctx.textAlign = tripX > w * 0.7 ? 'right' : 'left';
      const lx = tripX + (tripX > w * 0.7 ? -4 : 4);
      ctx.fillText(`${Math.round(tripTimeMs)}ms`, lx, barY + barH + 10);
      if (tripLabel) {
        ctx.fillText(tripLabel, lx, barY + barH + 19);
      }
    }
  }
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
/**
 * WaveformDisplay — real-time 3-phase sinusoid canvas with timeline.
 *
 * @param {Object} phasors - {currents:{Ia,Ib,Ic}, voltages:{...}} from App.jsx
 * @param {boolean} isInjecting - whether injection is running
 * @param {number} injectionTime - elapsed injection time in seconds (from App.jsx stime)
 * @param {Array} tripHistory - trip records from App.jsx (used for trip marker)
 * @param {number} freq - system frequency in Hz
 */
export default function WaveformDisplay({ phasors, isInjecting, injectionTime, tripHistory, freq = 60 }) {
  const wfCanvasRef  = useRef(null);
  const tlCanvasRef  = useRef(null);
  const rafRef       = useRef(null);
  const tNowRef      = useRef(0);
  const runningRef   = useRef(false);
  const startWallRef = useRef(null);
  const tripInfoRef  = useRef({ timeS: null, label: '' });
  const pausedRef    = useRef(false);
  const pausedAtRef  = useRef(0);
  const speedRef     = useRef(1);
  const zoomMsRef    = useRef(100);
  const cursorModeRef = useRef(false);
  const markersRef   = useRef([]);

  const [localRunning, setLocalRunning] = useState(false);
  const [cleared, setCleared]           = useState(false);
  const [loop, setLoop]                 = useState(false);
  const [displayTime, setDisplayTime]   = useState(0);
  const [paused, setPaused]             = useState(false);
  const [speed, setSpeed]               = useState(1);
  const [zoomMs, setZoomMs]             = useState(100);
  const [cursorMode, setCursorMode]     = useState(false);
  const [cursorX, setCursorX]           = useState(null);
  const [markers, setMarkers]           = useState([]);

  // Sync injection state from parent when it changes externally
  useEffect(() => {
    if (isInjecting && !localRunning) {
      handleStart();
    } else if (!isInjecting && localRunning) {
      handleStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInjecting]);

  // Track trip events from tripHistory
  useEffect(() => {
    if (tripHistory && tripHistory.length > 0) {
      const latest = tripHistory[0];
      if (latest && latest.tripTime !== null && latest.tripTime !== undefined) {
        tripInfoRef.current = {
          timeS: latest.tripTime,
          label: (latest.stages || []).filter(s => s !== 'SNAPSHOT').join(', '),
        };
      }
    }
  }, [tripHistory]);

  // Sync refs with state
  useEffect(() => {
    pausedRef.current = paused;
    speedRef.current = speed;
    zoomMsRef.current = zoomMs;
    cursorModeRef.current = cursorMode;
    markersRef.current = markers;
  }, [paused, speed, zoomMs, cursorMode, markers]);

  // DPR-aware canvas sizing
  const resizeCanvas = useCallback((canvas) => {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    canvas.width  = Math.round(rect.width  * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    const wfCanvas = wfCanvasRef.current;
    const tlCanvas = tlCanvasRef.current;
    if (!wfCanvas || !tlCanvas) return;

    const dpr = window.devicePixelRatio || 1;
    const wfCtx = wfCanvas.getContext('2d');
    const tlCtx = tlCanvas.getContext('2d');

    // CSS dimensions
    const wfW = wfCanvas.width / dpr;
    const wfH = wfCanvas.height / dpr;
    const tlW = tlCanvas.width / dpr;
    const tlH = tlCanvas.height / dpr;

    const now = performance.now();
    if (startWallRef.current !== null && !pausedRef.current) {
      tNowRef.current = ((now - startWallRef.current) / 1000) * speedRef.current;
    } else if (pausedRef.current) {
      // Keep tNowRef at pausedAtRef value while paused
      tNowRef.current = pausedAtRef.current;
    }

    const ph = phasors?.currents || { Ia: { mag: 0, ang: 0 }, Ib: { mag: 0, ang: -120 }, Ic: { mag: 0, ang: 120 } };
    const tripInfo = tripInfoRef.current;
    const injMs = runningRef.current ? tNowRef.current * 1000 : displayTime * 1000;

    drawWaveform(wfCtx, wfW, wfH, ph, tNowRef.current, runningRef.current, tripInfo.timeS, tripInfo.label, freq, zoomMsRef.current, markersRef.current, cursorX);
    drawTimeline(tlCtx, tlW, tlH, runningRef.current, injMs, tripInfo.timeS !== null ? tripInfo.timeS * 1000 : null, tripInfo.label);

    if (runningRef.current) {
      setDisplayTime(tNowRef.current);
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [phasors, freq, displayTime]);

  // Start RAF loop
  const startRaf = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
  }, [animate]);

  // Draw idle frame when not running
  useEffect(() => {
    if (localRunning) return;
    const wfCanvas = wfCanvasRef.current;
    const tlCanvas = tlCanvasRef.current;
    if (!wfCanvas || !tlCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const wfCtx = wfCanvas.getContext('2d');
    const tlCtx = tlCanvas.getContext('2d');
    const wfW = wfCanvas.width / dpr;
    const wfH = wfCanvas.height / dpr;
    const tlW = tlCanvas.width / dpr;
    const tlH = tlCanvas.height / dpr;
    const ph = phasors?.currents || { Ia: { mag: 0, ang: 0 }, Ib: { mag: 0, ang: -120 }, Ic: { mag: 0, ang: 120 } };
    const tripInfo = tripInfoRef.current;
    drawWaveform(wfCtx, wfW, wfH, ph, tNowRef.current, false, tripInfo.timeS, tripInfo.label, freq, zoomMsRef.current, markersRef.current, null);
    drawTimeline(tlCtx, tlW, tlH, false, displayTime * 1000, tripInfo.timeS !== null ? tripInfo.timeS * 1000 : null, tripInfo.label);
  }, [localRunning, phasors, freq, displayTime, cleared]);

  // Canvas resize observer
  useEffect(() => {
    const wfCanvas = wfCanvasRef.current;
    const tlCanvas = tlCanvasRef.current;
    if (!wfCanvas || !tlCanvas) return;

    const ro = new ResizeObserver(() => {
      resizeCanvas(wfCanvas);
      resizeCanvas(tlCanvas);
      if (localRunning) startRaf();
      else {
        // Redraw idle frame after resize
        const dpr = window.devicePixelRatio || 1;
        const wfCtx = wfCanvas.getContext('2d');
        const tlCtx = tlCanvas.getContext('2d');
        const ph = phasors?.currents || { Ia: { mag: 0, ang: 0 }, Ib: { mag: 0, ang: -120 }, Ic: { mag: 0, ang: 120 } };
        const tripInfo = tripInfoRef.current;
        drawWaveform(wfCtx, wfCanvas.width / dpr, wfCanvas.height / dpr, ph, tNowRef.current, false, tripInfo.timeS, tripInfo.label, freq);
        drawTimeline(tlCtx, tlCanvas.width / dpr, tlCanvas.height / dpr, false, displayTime * 1000, tripInfo.timeS !== null ? tripInfo.timeS * 1000 : null, tripInfo.label);
      }
    });
    ro.observe(wfCanvas);
    ro.observe(tlCanvas);

    // Initial size
    resizeCanvas(wfCanvas);
    resizeCanvas(tlCanvas);

    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localRunning, freq]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleStart = useCallback(() => {
    if (runningRef.current) return;
    tripInfoRef.current = { timeS: null, label: '' };
    runningRef.current = true;
    startWallRef.current = performance.now() - tNowRef.current * 1000;
    setLocalRunning(true);
    setCleared(false);
    // Kick off RAF on next tick so state is flushed
    requestAnimationFrame(() => {
      resizeCanvas(wfCanvasRef.current);
      resizeCanvas(tlCanvasRef.current);
      rafRef.current = requestAnimationFrame(animate);
    });
  }, [animate, resizeCanvas]);

  const handleStop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startWallRef.current = null;
    setLocalRunning(false);
  }, []);

  const handleClear = useCallback(() => {
    handleStop();
    tNowRef.current = 0;
    tripInfoRef.current = { timeS: null, label: '' };
    setDisplayTime(0);
    setCleared(c => !c);
  }, [handleStop]);

  const handlePause = useCallback(() => {
    if (!localRunning) return;
    pausedAtRef.current = tNowRef.current;
    setPaused(true);
  }, [localRunning]);

  const handleResume = useCallback(() => {
    if (!paused) return;
    startWallRef.current = performance.now() - pausedAtRef.current * 1000 / speedRef.current;
    setPaused(false);
  }, [paused]);

  const handleAddMarker = useCallback(() => {
    if (!localRunning && displayTime === 0) return;
    const colors = ['var(--orange)', 'var(--cyan)', '#4ade80', '#fbbf24'];
    const colorIdx = markers.length % colors.length;
    const newMarker = {
      id: Date.now(),
      timeS: tNowRef.current,
      color: colors[colorIdx],
      colorName: ['orange', 'cyan', 'green', 'amber'][colorIdx],
    };
    setMarkers(m => [newMarker, ...m]);
  }, [localRunning, displayTime, markers]);

  const handleRemoveMarker = useCallback((id) => {
    setMarkers(m => m.filter(mk => mk.id !== id));
  }, []);

  const handleExportPNG = useCallback(() => {
    const wfCanvas = wfCanvasRef.current;
    if (!wfCanvas) return;
    const link = document.createElement('a');
    const now = new Date();
    const dateStr = now.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const timeStr = displayTime.toFixed(1).replace('.', '_');
    link.href = wfCanvas.toDataURL('image/png');
    link.download = `waveform_T+${timeStr}s_${dateStr}.png`;
    link.click();
  }, [displayTime]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleAddMarker();
      }
    };
    if (localRunning || displayTime > 0) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [localRunning, displayTime, handleAddMarker]);

  // Handle canvas mouse move for cursor
  const handleCanvasMouseMove = useCallback((e) => {
    if (!cursorMode) {
      setCursorX(null);
      return;
    }
    const canvas = wfCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setCursorX(x);
  }, [cursorMode]);

  const handleCanvasMouseLeave = useCallback(() => {
    setCursorX(null);
  }, []);

  const handleCanvasWheel = useCallback((e) => {
    e.preventDefault();
    const zoomValues = [20, 50, 100, 200, 500];
    const currentIdx = zoomValues.indexOf(zoomMs);
    if (e.deltaY < 0 && currentIdx > 0) {
      setZoomMs(zoomValues[currentIdx - 1]);
    } else if (e.deltaY > 0 && currentIdx < zoomValues.length - 1) {
      setZoomMs(zoomValues[currentIdx + 1]);
    }
  }, [zoomMs]);

  // Restart loop if loop=true and injection stops (auto-restart)
  useEffect(() => {
    if (!localRunning && loop && displayTime > 0) {
      const tid = setTimeout(() => {
        tNowRef.current = 0;
        setDisplayTime(0);
        handleStart();
      }, 800);
      return () => clearTimeout(tid);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localRunning, loop]);

  const ph = phasors?.currents || {};
  const IaRms = rms(ph.Ia?.mag || 0);
  const IbRms = rms(ph.Ib?.mag || 0);
  const IcRms = rms(ph.Ic?.mag || 0);

  return (
    <>
      <style>{WF_CSS}</style>
      <div className="wfd-wrap">

        {/* Waveform canvas */}
        <div className="wfd-canvas-box" style={{ position: 'relative' }}>
          <canvas
            ref={wfCanvasRef}
            className="wfd-canvas"
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            onWheel={handleCanvasWheel}
          />
          {paused && (
            <div className="wfd-pause-overlay">
              <span className="wfd-pause-text">PAUSADO</span>
            </div>
          )}
          <div className="wfd-overlay-text">
            <span className="wfd-tag wfd-tag-a">Ia {(ph.Ia?.mag || 0).toFixed(2)} A pk</span>
            <span className="wfd-tag wfd-tag-b">Ib {(ph.Ib?.mag || 0).toFixed(2)} A pk</span>
            <span className="wfd-tag wfd-tag-c">Ic {(ph.Ic?.mag || 0).toFixed(2)} A pk</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="wfd-timeline">
          <canvas ref={tlCanvasRef} className="wfd-timeline" style={{ width: '100%', height: '100%' }}/>
        </div>

        {/* Controls Row 1 */}
        <div className="wfd-ctrl-row">
          <button
            className="wfd-btn wfd-start"
            onClick={handleStart}
            disabled={localRunning}
          >
            ▶ Start
          </button>
          <button
            className="wfd-btn wfd-stop"
            onClick={handleStop}
            disabled={!localRunning}
          >
            ■ Stop
          </button>
          <button
            className={`wfd-btn ${paused ? '' : ''}`}
            onClick={paused ? handleResume : handlePause}
            disabled={!localRunning}
            style={paused ? { background: 'var(--orange-dim)', borderColor: 'rgba(249,115,22,.3)', color: 'var(--orange)' } : {}}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            className="wfd-btn wfd-clear"
            onClick={handleClear}
          >
            ↺ Clear
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
            <button
              className={`wfd-btn ${cursorMode ? '' : ''}`}
              onClick={() => setCursorMode(!cursorMode)}
              title="Toggle cursor analysis mode"
              style={cursorMode ? { background: 'rgba(14,165,233,.12)', borderColor: 'rgba(14,165,233,.3)', color: 'var(--cyan)' } : {}}
            >
              📊 Cursor
            </button>
            <button
              className="wfd-btn"
              onClick={handleAddMarker}
              disabled={!localRunning && displayTime === 0}
              title="Add marker at current time (or press M)"
            >
              📍 Marker
            </button>
            <button
              className="wfd-btn"
              onClick={handleExportPNG}
              title="Export canvas as PNG"
            >
              📥 PNG
            </button>
          </div>
          <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="checkbox"
              className="wfd-loop-cb"
              checked={loop}
              onChange={e => setLoop(e.target.checked)}
            />
            <span className="wfd-loop-lbl">Loop</span>
          </label>
        </div>

        {/* Controls Row 2 - Speed */}
        <div className="wfd-ctrl-row">
          <div className="wfd-pill-group">
            <span className="wfd-pill-label">Speed</span>
            {[0.25, 0.5, 1, 2, 4].map(s => (
              <button
                key={s}
                className={`wfd-pill ${speed === s ? 'on' : ''}`}
                onClick={() => {
                  setSpeed(s);
                  if (localRunning && !paused) {
                    startWallRef.current = performance.now() - tNowRef.current * 1000 / s;
                  }
                }}
              >
                {s}×
              </button>
            ))}
          </div>
          <div className="wfd-pill-group" style={{ marginLeft: 'auto' }}>
            <span className="wfd-pill-label">Zoom</span>
            {[20, 50, 100, 200, 500].map(z => (
              <button
                key={z}
                className={`wfd-pill ${zoomMs === z ? 'on' : ''}`}
                onClick={() => setZoomMs(z)}
              >
                {z}ms
              </button>
            ))}
          </div>
        </div>

        {/* Markers List */}
        {markers.length > 0 && (
          <div className="wfd-markers-row">
            {markers.map((m) => (
              <div key={m.id} className={`wfd-marker-chip m-${m.colorName}`}>
                <span>◆ T+{m.timeS.toFixed(2)}s</span>
                <button onClick={() => handleRemoveMarker(m.id)}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Info row */}
        <div className="wfd-info">
          <div className="wfd-info-item">
            <div className="wfd-info-lbl">Freq</div>
            <div className="wfd-info-val">{freq} Hz</div>
          </div>
          <div className="wfd-info-item" style={{ color: '#f87171' }}>
            <div className="wfd-info-lbl" style={{ color: '#f87171' }}>Ia RMS</div>
            <div className="wfd-info-val" style={{ color: '#f87171' }}>{IaRms.toFixed(3)} A</div>
          </div>
          <div className="wfd-info-item">
            <div className="wfd-info-lbl" style={{ color: '#4ade80' }}>Ib RMS</div>
            <div className="wfd-info-val" style={{ color: '#4ade80' }}>{IbRms.toFixed(3)} A</div>
          </div>
          <div className="wfd-info-item">
            <div className="wfd-info-lbl" style={{ color: '#60a5fa' }}>Ic RMS</div>
            <div className="wfd-info-val" style={{ color: '#60a5fa' }}>{IcRms.toFixed(3)} A</div>
          </div>
          <div className="wfd-info-item">
            <div className="wfd-info-lbl">Time</div>
            <div className="wfd-info-val">{displayTime.toFixed(2)} s</div>
          </div>
        </div>

      </div>
    </>
  );
}
