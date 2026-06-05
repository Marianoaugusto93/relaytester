import { describe, it, expect } from 'vitest';
import {
  serializeNetwork,
  deserializeNetwork,
  validateRoundTrip,
  voltageHeatmapColor,
  angleHeatmapColor,
  formatAmps,
  bboxForText,
  bboxOverlap,
  bboxCollisionCount,
} from '../../src/simulators/powerflow/core/index.js';

describe('Newton-Raphson Visualization & Persistence (Phase 3)', () => {
  describe('Heatmap Color Mapping', () => {
    it('should map nominal voltage to white', () => {
      const color = voltageHeatmapColor(1.0, 0.1, 0.1);
      expect(color).toBe('rgb(255,255,255)');
    });

    it('should map low voltage to blue', () => {
      const color = voltageHeatmapColor(0.9, 0.1, 0.1);
      // At -1.0 deviation: should be deep blue (~30, 111, 206)
      expect(color).toMatch(/rgb\(30,111,206\)/);
    });

    it('should map high voltage to red', () => {
      const color = voltageHeatmapColor(1.1, 0.1, 0.1);
      // At +1.0 deviation: should be deep red (~217, 38, 38)
      expect(color).toMatch(/rgb\(217,38,38\)/);
    });

    it('should handle null voltage gracefully', () => {
      const color = voltageHeatmapColor(null, 0.1, 0.1);
      expect(color).toBe('#cfcfd1'); // Gray for undefined
    });

    it('should map zero angle to white', () => {
      const color = angleHeatmapColor(0, 30, 30);
      expect(color).toBe('rgb(255,255,255)');
    });

    it('should map negative angle to purple', () => {
      const color = angleHeatmapColor(-30, 30, 30);
      // At -1.0 deviation: should be deep purple
      expect(color).toMatch(/rgb\(93,63,162\)/);
    });

    it('should map positive angle to orange', () => {
      const color = angleHeatmapColor(30, 30, 30);
      // At +1.0 deviation: should be deep orange
      expect(color).toMatch(/rgb\(204,90,24\)/);
    });
  });

  describe('Current Formatting', () => {
    it('should format < 1 A with 2 decimals', () => {
      expect(formatAmps(0.5)).toBe('0.50 A');
    });

    it('should format 1-1000 A as integer', () => {
      expect(formatAmps(500)).toBe('500 A');
    });

    it('should format 1-10 kA with 1 decimal', () => {
      expect(formatAmps(5000)).toBe('5.0 kA');
    });

    it('should format >= 10 kA as integer', () => {
      expect(formatAmps(50000)).toBe('50 kA');
    });

    it('should handle invalid values', () => {
      expect(formatAmps(-1)).toBe('— A');
      expect(formatAmps(null)).toBe('— A');
    });
  });

  describe('Label Collision Detection', () => {
    it('should compute bounding box for text', () => {
      const bb = bboxForText(100, 100, 'Test', 12);
      expect(bb).toHaveProperty('x1');
      expect(bb).toHaveProperty('y1');
      expect(bb).toHaveProperty('x2');
      expect(bb).toHaveProperty('y2');
      expect(bb.x2).toBeGreaterThan(bb.x1);
      expect(bb.y2).toBeGreaterThan(bb.y1);
    });

    it('should detect overlapping boxes', () => {
      const a = { x1: 0, y1: 0, x2: 10, y2: 10 };
      const b = { x1: 5, y1: 5, x2: 15, y2: 15 };
      expect(bboxOverlap(a, b)).toBe(true);
    });

    it('should detect non-overlapping boxes', () => {
      const a = { x1: 0, y1: 0, x2: 10, y2: 10 };
      const b = { x1: 20, y1: 20, x2: 30, y2: 30 };
      expect(bboxOverlap(a, b)).toBe(false);
    });

    it('should count collisions correctly', () => {
      const bb = { x1: 5, y1: 5, x2: 15, y2: 15 };
      const occupied = [
        { x1: 0, y1: 0, x2: 10, y2: 10 },
        { x1: 20, y1: 20, x2: 30, y2: 30 },
        { x1: 12, y1: 12, x2: 20, y2: 20 },
      ];
      expect(bboxCollisionCount(bb, occupied)).toBe(2);
    });
  });

  describe('Network Persistence', () => {
    const createTestNetwork = () => ({
      buses: [
        {
          id: 1,
          name: 'Bus 1',
          V: 1.05,
          theta: 0,
          type: 'slack',
          Pl: 0,
          Ql: 0,
          Pg: 2.0,
          Qg: 1.0,
        },
        {
          id: 2,
          name: 'Bus 2',
          V: 0.98,
          theta: -0.1,
          type: 'pq',
          Pl: 1.0,
          Ql: 0.5,
          Pg: 0,
          Qg: 0,
        },
      ],
      branches: [
        {
          from: 1,
          to: 2,
          r: 0.01,
          x: 0.1,
          b: 0.01,
          tap: 1.0,
          phaseShift: 0,
          rating: 100,
          kind: 'line',
        },
      ],
    });

    it('should serialize network to JSON', () => {
      const net = createTestNetwork();
      const json = serializeNetwork(net, {
        name: 'Test Network',
        description: 'Test case',
      });

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('Test Network');
      expect(parsed.network.buses).toHaveLength(2);
      expect(parsed.network.branches).toHaveLength(1);
    });

    it('should deserialize network from JSON', () => {
      const net = createTestNetwork();
      const json = serializeNetwork(net);
      const restored = deserializeNetwork(json);

      expect(restored.buses).toHaveLength(2);
      expect(restored.branches).toHaveLength(1);
      expect(restored.buses[0].id).toBe(1);
      expect(restored.buses[0].type).toBe('slack');
    });

    it('should preserve bus properties during round-trip', () => {
      const net = createTestNetwork();
      const json = serializeNetwork(net);
      const restored = deserializeNetwork(json);

      expect(restored.buses[0].V).toBeCloseTo(1.05);
      expect(restored.buses[0].Pg).toBeCloseTo(2.0);
      expect(restored.buses[1].Pl).toBeCloseTo(1.0);
    });

    it('should preserve branch properties during round-trip', () => {
      const net = createTestNetwork();
      const json = serializeNetwork(net);
      const restored = deserializeNetwork(json);

      expect(restored.branches[0].r).toBe(0.01);
      expect(restored.branches[0].x).toBe(0.1);
      expect(restored.branches[0].b).toBe(0.01);
    });

    it('should validate round-trip with no data loss', () => {
      const net = createTestNetwork();
      expect(validateRoundTrip(net)).toBe(true);
    });

    it('should detect round-trip failure on empty network', () => {
      const net = { buses: [], branches: [] };
      expect(validateRoundTrip(net)).toBe(true); // Empty is valid
    });

    it('should handle missing buses gracefully', () => {
      const net = { branches: [] };
      const json = serializeNetwork(net);
      const restored = deserializeNetwork(json);
      expect(restored.buses).toEqual([]);
    });
  });
});
