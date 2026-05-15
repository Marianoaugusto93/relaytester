const K_TABLE = {
  'IEC-Standard': { k: 0.14, a: 0.02 },
  'IEC-Very-Inverse': { k: 13.5, a: 1.0 },
  'IEC-Extremely-Inverse': { k: 80.0, a: 2.0 },
  'IEC-Long-Time-Inverse': { k: 120, a: 1.0 },
  'ANSI-Moderate': { k: 0.0515, a: 0.02, c: 0.114 },
  'ANSI-Very-Inverse': { k: 19.61, a: 2.0, c: 0.491 },
  'ANSI-Extremely-Inverse': { k: 28.2, a: 2.0, c: 0.1217 },
};

export function iecTime(curveType, M, TD) {
  const params = K_TABLE[curveType];
  if (!params) return Infinity;
  if (M <= 1) return Infinity;
  const { k, a } = params;
  return (TD * k) / (Math.pow(M, a) - 1);
}

export function ansiTime(curveType, M, TD) {
  const params = K_TABLE[curveType];
  if (!params) return Infinity;
  if (M <= 1) return Infinity;
  const { k, a, c } = params;
  return (TD * k) / (Math.pow(M, a) - 1) + (TD * c);
}

export function computeTimeForCurve(curve, M, TD) {
  if (!curve) return Infinity;

  if (curve.startsWith('IEC')) {
    return iecTime(curve, M, TD);
  } else if (curve.startsWith('ANSI')) {
    return ansiTime(curve, M, TD);
  } else if (curve === 'Definite-Time') {
    return TD;
  }

  return Infinity;
}

export function mapCurveName(settingCurve) {
  const m = {
    // Abbreviated names
    'IEC VI': 'IEC-Very-Inverse',
    'IEC EI': 'IEC-Extremely-Inverse',
    'IEC LTI': 'IEC-Long-Time-Inverse',
    'IEC SI': 'IEC-Standard',
    'ANSI-MI': 'ANSI-Moderate',
    'ANSI-VI': 'ANSI-Very-Inverse',
    'ANSI-EI': 'ANSI-Extremely-Inverse',
    // Full names (from protection.js CURVE_MAP)
    'IEC - Standard Inverse': 'IEC-Standard',
    'IEC - Very Inverse': 'IEC-Very-Inverse',
    'IEC - Extremely Inverse': 'IEC-Extremely-Inverse',
    'IEC - Long Time Inverse': 'IEC-Long-Time-Inverse',
    'ANSI - Moderate Inverse': 'ANSI-Moderate',
    'ANSI - Very Inverse': 'ANSI-Very-Inverse',
    'ANSI - Extremely Inverse': 'ANSI-Extremely-Inverse',
  };
  return m[settingCurve] || 'IEC-Very-Inverse';
}

export const CurveModel = {
  iecTime,
  ansiTime,
  computeTimeForCurve,
  mapCurveName,
};
