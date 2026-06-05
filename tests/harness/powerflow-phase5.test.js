/**
 * Phase 5 Controls & Diagnostics Test Suite
 *
 * Tests for:
 * - renderControls: slider generation for transformers and generators
 * - applyControls: reading sliders back to model
 * - onCellEdit: table cell parameter editing
 * - tracePvCurve: P-V curve loading profile
 * - runConvergenceDiagnostics: diagnostic output rendering
 *
 * Note: These tests use jsdom to simulate DOM elements.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  renderControls,
  applyControls,
  onCellEdit,
} from '../../src/simulators/powerflow/core/controls.js';
import {
  tracePvCurve,
  renderPvCurveSvg,
  runConvergenceDiagnostics,
} from '../../src/simulators/powerflow/core/diagnostics.js';

describe('Phase 5: Controls & Diagnostics', () => {
  let dom, document, window;
  let buses, branches, baseLoads;
  const BASE_MVA = 100;

  beforeEach(() => {
    dom = new JSDOM(`
      <html>
        <body>
          <div id="ctrl-xfmrs"></div>
          <div id="ctrl-gens"></div>
          <div id="loadscale" style="display:none;" value="1.0"></div>
          <div id="status"></div>
          <div id="convergence-diagnostic"></div>
          <div id="trace-pv-status"></div>
          <div id="pv-chart"></div>
        </body>
      </html>
    `, {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });
    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;

    // Setup test fixtures
    buses = [
      {
        id: 1,
        type: 'slack',
        V: 1.0,
        Vset: 1.0,
        theta: 0,
        hasGenerator: true,
        Pl: 0,
        Ql: 0,
        _Pl_load: 0,
        _Ql_load: 0,
        loadInService: true,
        capInService: true,
        reactInService: true,
      },
      {
        id: 2,
        type: 'pv',
        V: 0.98,
        Vset: 0.98,
        theta: -0.05,
        hasGenerator: true,
        Pg: 0.5,
        Pset: 0.5,
        Pgmin: 0,
        Pgmax: 1.5,
        Pl: 0.2,
        Ql: 0.1,
        _Pl_load: 0.2,
        _Ql_load: 0.1,
        loadInService: true,
      },
      {
        id: 3,
        type: 'pq',
        V: 0.95,
        theta: -0.1,
        hasGenerator: true,
        Pg: 0.3,
        Pset: 0.3,
        Qg: 0.1,
        Pl: 0.3,
        Ql: 0.15,
        _Pl_load: 0.3,
        _Ql_load: 0.15,
        loadInService: true,
      },
    ];

    branches = [
      {
        from: 1,
        to: 2,
        name: 'Line 1-2',
        kind: 'line',
        r: 0.01,
        x: 0.05,
        b: 0.01,
      },
      {
        from: 2,
        to: 3,
        name: 'Transformer 2-3',
        kind: 'xfmr',
        r: 0.001,
        x: 0.03,
        tap: 1.0,
        phaseShift: 0,
      },
    ];

    baseLoads = [
      null,
      { Pl: 0.1, Ql: 0.05 },
      { Pl: 0.15, Ql: 0.08 },
    ];
  });

  describe('renderControls', () => {
    it('should generate transformer tap sliders', () => {
      renderControls(buses, branches, BASE_MVA);
      const sliders = document.querySelectorAll('input[data-ctrl="tap"]');
      expect(sliders.length).toBeGreaterThan(0);
      expect(sliders[0].value).toBe('1');
    });

    it('should generate generator V setpoint sliders for slack/PV', () => {
      renderControls(buses, branches, BASE_MVA);
      const vSliders = document.querySelectorAll('input[data-ctrl="vgen"]');
      expect(vSliders.length).toBeGreaterThanOrEqual(2);
      expect(vSliders[0].value).toBe('1');
      expect(vSliders[1].value).toBe('0.98');
    });

    it('should not generate V slider for PQ buses', () => {
      renderControls(buses, branches, BASE_MVA);
      const vSliders = document.querySelectorAll('input[data-ctrl="vgen"]');
      const busIdxs = Array.from(vSliders).map(el => parseInt(el.dataset.busidx, 10));
      expect(busIdxs).not.toContain(2); // Bus index 2 is PQ
    });

    it('should generate P dispatch sliders for PV/PQ', () => {
      renderControls(buses, branches, BASE_MVA);
      const pSliders = document.querySelectorAll('input[data-ctrl="pgen"]');
      expect(pSliders.length).toBeGreaterThanOrEqual(2);
    });

    it('should display current values correctly', () => {
      renderControls(buses, branches, BASE_MVA);
      const pSliders = document.querySelectorAll('input[data-ctrl="pgen"]');
      // First PV generator (bus index 1): Pg = 0.5 pu = 50 MW
      expect(parseFloat(pSliders[0].value)).toBeCloseTo(50, 0);
    });
  });

  describe('applyControls', () => {
    it('should read tap slider back to branch model', () => {
      const tapSlider = document.createElement('input');
      tapSlider.type = 'range';
      tapSlider.dataset.ctrl = 'tap';
      tapSlider.dataset.bridx = '1';
      tapSlider.value = '1.05';
      document.body.appendChild(tapSlider);

      applyControls(buses, branches, baseLoads, BASE_MVA);
      expect(branches[1].tap).toBe(1.05);
    });

    it('should read phase shift slider (degrees to radians)', () => {
      branches[1].phaseShift = 0;
      const phaseSlider = document.createElement('input');
      phaseSlider.type = 'range';
      phaseSlider.dataset.ctrl = 'phase';
      phaseSlider.dataset.bridx = '1';
      phaseSlider.value = '10';
      document.body.appendChild(phaseSlider);

      applyControls(buses, branches, baseLoads, BASE_MVA);
      expect(branches[1].phaseShift).toBeCloseTo(10 * Math.PI / 180, 5);
    });

    it('should apply load scale to bus loads', () => {
      const loadscale = document.getElementById('loadscale');
      loadscale.value = '1.5';

      applyControls(buses, branches, baseLoads, BASE_MVA);
      // Bus 1: base load Pl=0.1 pu scaled by 1.5 = 0.15 pu
      expect(buses[1]._Pl_load).toBeCloseTo(0.15, 5);
    });

    it('should update generator P dispatch from slider', () => {
      const pSlider = document.createElement('input');
      pSlider.type = 'range';
      pSlider.dataset.ctrl = 'pgen';
      pSlider.dataset.busidx = '1';
      pSlider.value = '75'; // 75 MW
      document.body.appendChild(pSlider);

      applyControls(buses, branches, baseLoads, BASE_MVA);
      expect(buses[1].Pg).toBeCloseTo(0.75, 5); // 75 MW / 100 MVA = 0.75 pu
      expect(buses[1].Pset).toBeCloseTo(0.75, 5);
    });
  });

  describe('onCellEdit', () => {
    it('should update bus Pl from table edit', () => {
      const input = document.createElement('input');
      input.dataset.kind = 'Pl';
      input.dataset.idx = '1';
      input.value = '15'; // 15 MW
      const event = { target: input };

      const loadscale = document.getElementById('loadscale');
      loadscale.value = '1.0';

      onCellEdit(event, { buses, branches, baseLoads, baseMva: BASE_MVA });
      expect(baseLoads[1].Pl).toBeCloseTo(0.15, 5); // 15 MW / 100 MVA = 0.15 pu
    });

    it('should update branch tap from table edit', () => {
      const input = document.createElement('input');
      input.dataset.kind = 'tap';
      input.dataset.bidx = '1';
      input.value = '1.03';
      const event = { target: input };

      onCellEdit(event, { buses, branches, baseLoads, baseMva: BASE_MVA });
      expect(branches[1].tap).toBe(1.03);
    });

    it('should handle limit fields with valid numeric values', () => {
      const input = document.createElement('input');
      input.dataset.kind = 'Pgmin';
      input.dataset.idx = '1';
      input.value = '25'; // 25 MW minimum
      const event = { target: input };

      onCellEdit(event, { buses, branches, baseLoads, baseMva: BASE_MVA });
      expect(buses[1].Pgmin).toBe(25);
    });

    it('should convert phase shift degrees to radians', () => {
      const input = document.createElement('input');
      input.dataset.kind = 'phaseShiftDeg';
      input.dataset.bidx = '1';
      input.value = '5'; // 5 degrees
      const event = { target: input };

      onCellEdit(event, { buses, branches, baseLoads, baseMva: BASE_MVA });
      expect(branches[1].phaseShift).toBeCloseTo(5 * Math.PI / 180, 5);
    });
  });

  describe('tracePvCurve', () => {
    it('should return empty samples if loadscale element missing', () => {
      document.getElementById('loadscale').remove();
      const context = {
        maxScale: 2.0,
        tryInnerSolve: () => ({ converged: false }),
        applyControls: () => {},
        applyFlatStart: () => {},
        applyDcSeed: () => {},
        updateLabels: () => {},
      };
      const result = tracePvCurve(buses, baseLoads, context);
      expect(result.samples).toHaveLength(0);
    });

    it('should return initial sample on successful low-load convergence', () => {
      const mockTryInnerSolve = vi.fn(() => ({ converged: true }));
      const context = {
        maxScale: 2.0,
        tryInnerSolve: mockTryInnerSolve,
        applyControls: () => {},
        applyFlatStart: () => {},
        applyDcSeed: () => {},
        updateLabels: () => {},
      };

      const result = tracePvCurve(buses, baseLoads, context);
      expect(result.samples.length).toBeGreaterThanOrEqual(1);
      expect(result.samples[0]).toHaveProperty('scale');
      expect(result.samples[0]).toHaveProperty('voltages');
      expect(result.samples[0]).toHaveProperty('thetas');
    });

    it('should identify load buses (PQ with non-zero load)', () => {
      const context = {
        maxScale: 5.0,
        tryInnerSolve: () => ({ converged: false }),
        applyControls: () => {},
        applyFlatStart: () => {},
        applyDcSeed: () => {},
        updateLabels: () => {},
      };

      const result = tracePvCurve(buses, baseLoads, context);
      // Expect bus 2 (PQ) to be in load bus list
      expect(result.loadBusIdxs).toContain(2);
    });
  });

  describe('renderPvCurveSvg', () => {
    it('should return empty string for invalid input', () => {
      expect(renderPvCurveSvg(null)).toBe('');
      expect(renderPvCurveSvg({})).toBe('');
      expect(renderPvCurveSvg({ samples: [] })).toBe('');
    });

    it('should return empty string for single sample', () => {
      const curve = {
        samples: [{ scale: 0.5, voltages: [1.0, 0.95], thetas: [0, -0.05] }],
        loadBusIdxs: [1, 2],
      };
      expect(renderPvCurveSvg(curve)).toBe('');
    });

    it('should render SVG for two or more samples', () => {
      const curve = {
        samples: [
          { scale: 0.5, voltages: [1.0, 0.95], thetas: [0, -0.05] },
          { scale: 1.0, voltages: [1.0, 0.92], thetas: [0, -0.08] },
        ],
        loadBusIdxs: [1, 2],
      };
      const svg = renderPvCurveSvg(curve);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('path');
    });

    it('should include axis labels in SVG', () => {
      const curve = {
        samples: [
          { scale: 0.5, voltages: [1.0, 0.95], thetas: [0, -0.05] },
          { scale: 1.0, voltages: [1.0, 0.90], thetas: [0, -0.08] },
        ],
        loadBusIdxs: [1],
      };
      const svg = renderPvCurveSvg(curve);
      expect(svg).toContain('Load Scale');
      expect(svg).toContain('Voltage');
    });
  });

  describe('runConvergenceDiagnostics', () => {
    it('should update status element with error message', () => {
      const failedResult = { singular: true, iter: 0 };
      const context = {
        buses,
        findDataIssues: () => [],
        reachableFromSlack: () => new Set([0, 1, 2]),
      };

      runConvergenceDiagnostics(failedResult, context);
      const status = document.getElementById('status');
      expect(status.className).toBe('status bad');
      expect(status.textContent).toContain('singular');
    });

    it('should detect islanded buses', () => {
      const failedResult = { singular: false, iter: 50, maxMis: 0.001 };
      const context = {
        buses,
        findDataIssues: () => [],
        reachableFromSlack: () => new Set([0, 1]), // Bus 2 unreachable
      };

      runConvergenceDiagnostics(failedResult, context);
      const panel = document.getElementById('convergence-diagnostic');
      expect(panel.innerHTML).toContain('Islanded');
    });

    it('should display data issues if found', () => {
      const failedResult = { singular: false, iter: 50, maxMis: 0.001 };
      const dataIssues = ['Bus 1: Pmin > Pmax'];
      const context = {
        buses,
        findDataIssues: () => dataIssues,
        reachableFromSlack: () => new Set([0, 1, 2]),
      };

      runConvergenceDiagnostics(failedResult, context);
      const panel = document.getElementById('convergence-diagnostic');
      expect(panel.innerHTML).toContain('Data inconsistency');
      expect(panel.innerHTML).toContain('Pmin');
    });

    it('should show Q-limit chattering diagnostic', () => {
      const failedResult = { singular: false, iter: 50, chattering: true, maxMis: 0.001 };
      const context = {
        buses,
        findDataIssues: () => [],
        reachableFromSlack: () => new Set([0, 1, 2]),
      };

      runConvergenceDiagnostics(failedResult, context);
      const panel = document.getElementById('convergence-diagnostic');
      expect(panel.innerHTML).toContain('Q-limit');
    });
  });

  describe('Integration: Controls + Apply flow', () => {
    it('should render and apply controls roundtrip', () => {
      renderControls(buses, branches, BASE_MVA);

      // Simulate user changing a slider
      const tapSlider = document.querySelector('input[data-ctrl="tap"]');
      if (tapSlider) {
        tapSlider.value = '1.08';
        applyControls(buses, branches, baseLoads, BASE_MVA);
        expect(branches[1].tap).toBe(1.08);
      }
    });

    it('should handle phase shift with no initial PST', () => {
      branches[1].isPST = false;
      branches[1].phaseShift = 0;
      renderControls(buses, branches, BASE_MVA);

      // Phase shift sliders should not appear for non-PST (zero phase shift)
      const phaseSliders = document.querySelectorAll('input[data-ctrl="phase"]');
      expect(phaseSliders.length).toBe(0);
    });
  });
});
