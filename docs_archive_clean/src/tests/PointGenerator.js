import { logspace, linspace, genId } from './testUtils.js';
import { computeTimeForCurve, mapCurveName } from './CurveModel.js';

export function generatePoints(fn, stage, planConfig) {
  if (!fn || !stage) return [];

  const {
    minMult = 1.5,
    maxMult = 15,
    nPoints = 7,
    spacing = 'log',
    includePickup = true,
    pickupRange = [0.95, 1.10],
    prefaultMult = 1.0,
    prefaultDur = 0.2,
  } = planConfig;

  let points = [];

  if (fn === '51' || fn === '51N') {
    points = generateInversePoints(stage, {
      minMult,
      maxMult,
      nPoints,
      spacing,
      prefaultMult,
      prefaultDur,
    });
    if (includePickup && stage.pickup > 0) {
      points.push(
        generatePickupProbe(stage, 'up', pickupRange, prefaultMult, prefaultDur)
      );
      points.push(
        generatePickupProbe(stage, 'down', pickupRange, prefaultMult, prefaultDur)
      );
    }
  } else if (fn === '50' || fn === '50N') {
    points = generateInstantaneousPoints(stage, {
      minMult,
      maxMult,
      nPoints,
      spacing,
      prefaultMult,
      prefaultDur,
    });
  } else if (fn === '67' || fn === '67N') {
    points = generateDirectionalPoints(stage, {
      minMult,
      maxMult,
      nPoints,
      spacing,
      prefaultMult,
      prefaultDur,
    });
  } else if (fn === '27' || fn === '59') {
    points = generateVoltagePoints(fn, stage, { prefaultMult, prefaultDur });
  } else if (fn === '81U' || fn === '81O') {
    points = generateFrequencyPoints(fn, stage, { prefaultMult, prefaultDur });
  } else if (fn === '46') {
    points = generateNegativeSequencePoints(stage, {
      minMult,
      maxMult,
      nPoints,
      spacing,
      prefaultMult,
      prefaultDur,
    });
  } else {
    points = generateInversePoints(stage, {
      minMult,
      maxMult,
      nPoints,
      spacing,
      prefaultMult,
      prefaultDur,
    });
  }

  return points;
}

function generateInversePoints(stage, config) {
  const {
    minMult,
    maxMult,
    nPoints,
    spacing,
    prefaultMult,
    prefaultDur,
  } = config;

  const factors =
    spacing === 'log'
      ? logspace(minMult, maxMult, nPoints)
      : linspace(minMult, maxMult, nPoints);

  const points = factors.map((mult, idx) => {
    const pickup = stage.pickup;
    const td = stage.timeDial ?? stage.timeOp;
    const curve = mapCurveName(stage.curve);

    const tExpected = computeTimeForCurve(curve, mult, td);

    return {
      id: `P${idx + 1}`,
      kind: 'curve',
      IxIpk: mult,
      Iamps: mult * pickup,
      tExpected,
      prefaultMult,
      prefaultDur,
      expectedBO: stage.boId || 'BO1',
    };
  });

  return points;
}

function generateInstantaneousPoints(stage, config) {
  const {
    prefaultMult,
    prefaultDur,
    minMult = 1.5,
    maxMult = 5,
    nPoints = 3,
    spacing = 'linear',
  } = config;
  const pickup = stage.pickup;
  const tExpected = stage.timeOp;

  const mults = spacing === 'log'
    ? logspace(minMult, maxMult, nPoints)
    : linspace(minMult, maxMult, nPoints);

  return mults.map((mult, idx) => ({
    id: `P${idx + 1}`,
    kind: 'definite',
    IxIpk: mult,
    Iamps: mult * pickup,
    tExpected,
    prefaultMult,
    prefaultDur,
    expectedBO: stage.boId || 'BO1',
  }));
}

function generateDirectionalPoints(stage, config) {
  const {
    minMult,
    maxMult,
    nPoints,
    spacing,
    prefaultMult,
    prefaultDur,
  } = config;

  const factors =
    spacing === 'log'
      ? logspace(minMult, maxMult, nPoints)
      : linspace(minMult, maxMult, nPoints);

  const points = [];

  factors.forEach((mult, idx) => {
    const pickup = stage.pickup;
    const td = stage.timeDial ?? stage.timeOp;
    const curve = mapCurveName(stage.curve);
    const tExpected = computeTimeForCurve(curve, mult, td);

    points.push({
      id: `P${idx + 1}`,
      kind: 'curve',
      IxIpk: mult,
      Iamps: mult * pickup,
      tExpected,
      angle: stage.mta || 0,
      prefaultMult,
      prefaultDur,
      expectedBO: stage.boId || 'BO1',
    });
  });

  for (let ang = -180; ang <= 180; ang += 90) {
    if (ang !== stage.mta) {
      points.push({
        id: `ANG${ang}`,
        kind: 'directional-angle',
        IxIpk: 5.0,
        Iamps: 5.0 * stage.pickup,
        tExpected: stage.timeOp,
        angle: ang,
        prefaultMult,
        prefaultDur,
        expectedBO: stage.boId || 'BO1',
      });
    }
  }

  return points;
}

function generateVoltagePoints(fn, stage, config) {
  const { prefaultMult, prefaultDur } = config;

  let points = [];
  if (fn === '27') {
    points = [0.5, 0.7, 0.9, 1.1];
  } else {
    points = [0.9, 1.1, 1.2, 1.5];
  }

  return points.map((mult, idx) => ({
    id: `P${idx + 1}`,
    kind: 'definite',
    VMult: mult,
    tExpected: stage.timeOp,
    prefaultMult,
    prefaultDur,
    expectedBO: stage.boId || 'BO1',
  }));
}

function generateFrequencyPoints(fn, stage, config) {
  const { prefaultMult, prefaultDur } = config;

  const baseFreq = 60;
  const offsets = [-1.0, -0.5, -0.2, 0.2, 0.5, 1.0];

  return offsets.map((offset, idx) => ({
    id: `F${idx + 1}`,
    kind: 'frequency',
    freqOffset: offset,
    frequency: baseFreq + offset,
    tExpected: stage.timeOp,
    prefaultMult,
    prefaultDur,
    expectedBO: stage.boId || 'BO1',
  }));
}

function generateNegativeSequencePoints(stage, config) {
  const {
    minMult,
    maxMult,
    nPoints,
    spacing,
    prefaultMult,
    prefaultDur,
  } = config;

  const factors =
    spacing === 'log'
      ? logspace(minMult, maxMult, nPoints)
      : linspace(minMult, maxMult, nPoints);

  return factors.map((mult, idx) => {
    const pickup = stage.pickup;
    const td = stage.timeDial ?? stage.timeOp;
    const curve = mapCurveName(stage.curve);
    const tExpected = computeTimeForCurve(curve, mult, td);

    return {
      id: `P${idx + 1}`,
      kind: 'curve',
      I2mag: mult * pickup,
      IxIpk: mult,
      Iamps: mult * pickup,
      tExpected,
      prefaultMult,
      prefaultDur,
      expectedBO: stage.boId || 'BO1',
    };
  });
}

function generatePickupProbe(stage, direction, range, prefaultMult, prefaultDur) {
  const pickup = stage.pickup;
  const [minR, maxR] = range;

  return {
    id: direction === 'up' ? 'Pk1' : 'Pk2',
    kind: `pickup-${direction}`,
    rampFrom: direction === 'up' ? minR * pickup : maxR * pickup,
    rampTo: direction === 'up' ? maxR * pickup : minR * pickup,
    rampStep: 0.01 * pickup,
    rampDwell: 0.1,
    Ipk: pickup,
    prefaultMult,
    prefaultDur: prefaultDur * 0.5,
    expectedBO: stage.boId || 'BO1',
  };
}

export const PointGenerator = {
  generatePoints,
};
