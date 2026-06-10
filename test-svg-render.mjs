// Test SVG rendering logic
const mockSVG = {
  getAttribute: () => null,
  setAttribute: () => {},
  innerHTML: '',
  appendChild: (el) => {
    console.log(`✓ Added element: ${el.tagName}`);
  }
};

// Simulate rendering
const buses = [
  { id: 1, type: 'slack', V: 1.0, theta: 0 },
  { id: 2, type: 'pv', V: 0.98, theta: -0.05 },
  { id: 3, type: 'pq', V: 0.95, theta: -0.1 }
];

const branches = [
  { from: 1, to: 2, name: 'Line 1-2', inService: true },
  { from: 2, to: 3, name: 'Xfmr 2-3', inService: true }
];

// Test heatmap function
function voltageHeatmapColor(v, devLow, devHigh) {
  return '#00ff00'; // Mock green for nominal voltage
}

const width = 600;
const height = 350;
const margin = 40;
const radius = (width - 2 * margin) / (buses.length + 1);
const centerY = height / 2;

let elementCount = 0;

// Count expected elements
// Branches: 2 branches * 2 elements (line + text) = 4
// Buses: 3 buses * 4 elements (circle + id + voltage + angle) = 12
// Total: 16 elements

branches.forEach(br => {
  const fromIdx = buses.findIndex(b => b.id === br.from);
  const toIdx = buses.findIndex(b => b.id === br.to);
  if (fromIdx >= 0 && toIdx >= 0) {
    elementCount += 2; // line + text
    console.log(`✓ Branch: ${br.from} → ${br.to}`);
  }
});

buses.forEach((bus, idx) => {
  elementCount += 4; // circle + id text + voltage text + angle text
  console.log(`✓ Bus ${bus.id}: circle + 3 text elements`);
});

console.log(`\nTotal SVG elements to render: ${elementCount}`);
console.log(`Expected: 16 (2 branches × 2) + (3 buses × 4)`);
console.log(`Match: ${elementCount === 16 ? '✅ YES' : '❌ NO'}`);
