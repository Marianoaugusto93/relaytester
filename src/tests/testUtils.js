export function logspace(minVal, maxVal, nPoints) {
  minVal = Math.max(minVal, 0.01);
  maxVal = Math.max(maxVal, 0.01);
  if (nPoints === 1) return [minVal];
  const logMin = Math.log10(minVal);
  const logMax = Math.log10(maxVal);
  const step = (logMax - logMin) / (nPoints - 1);
  return Array.from({ length: nPoints }, (_, i) =>
    Math.pow(10, logMin + i * step)
  );
}

export function linspace(minVal, maxVal, nPoints) {
  if (nPoints === 1) return [minVal];
  const step = (maxVal - minVal) / (nPoints - 1);
  return Array.from({ length: nPoints }, (_, i) =>
    minVal + i * step
  );
}

export function buildFaultPhasors(testPoint, system, fn) {
  const { IxIpk = 1.0, Iamps = 0, rampFrom, rampTo } = testPoint;
  const mult = IxIpk;
  const defaultI = Iamps || 1.0;

  if (fn === '81U' || fn === '81O') {
    const freqOffset = testPoint.freqOffset || 0;
    return {
      currents: {
        Ia: { mag: defaultI, ang: 0 },
        Ib: { mag: defaultI, ang: -120 },
        Ic: { mag: defaultI, ang: 120 },
      },
      voltages: {
        Va: { mag: 66.4, ang: 0 },
        Vb: { mag: 66.4, ang: -120 },
        Vc: { mag: 66.4, ang: 120 },
      },
      frequency: 60 + freqOffset,
    };
  }

  if (fn === '67' || fn === '67N') {
    const angle = testPoint.angle || 0;
    return {
      currents: {
        Ia: { mag: defaultI, ang: angle },
        Ib: { mag: defaultI, ang: angle - 120 },
        Ic: { mag: defaultI, ang: angle + 120 },
      },
      voltages: {
        Va: { mag: 66.4, ang: 0 },
        Vb: { mag: 66.4, ang: -120 },
        Vc: { mag: 66.4, ang: 120 },
      },
    };
  }

  if (fn === '27' || fn === '59') {
    const vMult = testPoint.VMult || 1.0;
    return {
      currents: {
        Ia: { mag: 1.0, ang: 0 },
        Ib: { mag: 1.0, ang: -120 },
        Ic: { mag: 1.0, ang: 120 },
      },
      voltages: {
        Va: { mag: 66.4 * vMult, ang: 0 },
        Vb: { mag: 66.4 * vMult, ang: -120 },
        Vc: { mag: 66.4 * vMult, ang: 120 },
      },
    };
  }

  if (fn === '46') {
    const i2 = testPoint.I2mag || defaultI;
    return {
      currents: {
        Ia: { mag: i2 * 1.5, ang: 0 },
        Ib: { mag: i2 * 1.5, ang: -120 },
        Ic: { mag: i2 * 1.5, ang: 120 },
      },
      voltages: {
        Va: { mag: 66.4, ang: 0 },
        Vb: { mag: 66.4, ang: -120 },
        Vc: { mag: 66.4, ang: 120 },
      },
    };
  }

  return {
    currents: {
      Ia: { mag: defaultI, ang: 0 },
      Ib: { mag: defaultI, ang: -120 },
      Ic: { mag: defaultI, ang: 120 },
    },
    voltages: {
      Va: { mag: 66.4, ang: 0 },
      Vb: { mag: 66.4, ang: -120 },
      Vc: { mag: 66.4, ang: 120 },
    },
  };
}

export function buildPrefaultPhasors(testPoint, system) {
  const { prefaultMult = 1.0 } = testPoint;
  return {
    currents: {
      Ia: { mag: prefaultMult * (system.ip1 || 5.0), ang: 0 },
      Ib: { mag: prefaultMult * (system.ip1 || 5.0), ang: -120 },
      Ic: { mag: prefaultMult * (system.ip1 || 5.0), ang: 120 },
    },
    voltages: {
      Va: { mag: 66.4, ang: 0 },
      Vb: { mag: 66.4, ang: -120 },
      Vc: { mag: 66.4, ang: 120 },
    },
  };
}

export function genId() {
  return Math.random().toString(36).substring(2, 9);
}
