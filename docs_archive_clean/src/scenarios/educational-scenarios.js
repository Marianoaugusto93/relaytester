/**
 * Educational preset scenarios for RelayLab 360.
 * Each scenario pre-configures phasors and protection settings to demonstrate
 * a specific fault type or protection function to students and trainees.
 *
 * Structure mirrors TEST_PRESETS in defaults.js, extended with:
 *   phasors   – fault-state phasor injection values (currents + voltages)
 *   expectedTrip  – protection stage expected to operate
 *   expectedTime  – approximate trip time in seconds
 *   learningObj   – one-line learning objective for educators
 */

export const EDUCATIONAL_SCENARIOS = [
  {
    id: 'edu_3ph_fault',
    label: '3-Ph Fault',
    name: 'Three-Phase Symmetrical Fault',
    description:
      'Balanced three-phase fault — all three phase currents rise to 5 A, ' +
      'voltages collapse near zero. Tests instantaneous (50) and time-overcurrent (51) phase protection. ' +
      'Expected: 50-1 trips in ~50 ms.',
    learningObj: 'Demonstrate how a symmetrical three-phase fault appears on the relay measurements and which protection stages respond first.',
    phasors: {
      currents: {
        Ia: { mag: 5.0, ang: 0 },
        Ib: { mag: 5.0, ang: -120 },
        Ic: { mag: 5.0, ang: 120 },
      },
      voltages: {
        Va: { mag: 5.0,  ang: 0 },
        Vb: { mag: 5.0,  ang: -120 },
        Vc: { mag: 5.0,  ang: 120 },
      },
    },
    // Protection: enable 50/51 phase, stage 0 of each
    fns: ['51', '50'],
    stages: { '51': [0], '50': [0] },
    patch: {
      '50': { stages: [{ pickup: 4.0, timeOp: 0.05 }] },
      '51': { stages: [{ pickup: 2.0, timeDial: 0.1, curve: 'IEC - Standard Inverse' }] },
    },
    out: {
      '50-1': { BO3: true, L3: true },
      '51-1': { BO3: true, L4: true },
      CB_Opened: { L1: true },
      CB_Closed: { L2: true },
    },
    inp: { CB_Opened: { BI3: true }, CB_Closed: { BI2: true } },
    expectedTrip: '50-1',
    expectedTime: 0.05,
  },

  {
    id: 'edu_slg_fault',
    label: 'L-G Fault',
    name: 'Single Line-to-Ground Fault (Phase A)',
    description:
      'Phase A single line-to-ground fault — Ia rises to 3.5 A while Ib and Ic stay near normal. ' +
      'Zero-sequence current 3I0 is present. Va collapses, Vb/Vc slightly elevated. ' +
      'Tests neutral overcurrent (50N / 51N).',
    learningObj: 'Show how a single line-to-ground fault produces zero-sequence current and how 50N/51N protection detects it.',
    phasors: {
      currents: {
        Ia: { mag: 3.5, ang: 0 },
        Ib: { mag: 0.3, ang: -120 },
        Ic: { mag: 0.3, ang: 120 },
      },
      voltages: {
        Va: { mag: 10.0, ang: 0 },
        Vb: { mag: 72.0, ang: -115 },
        Vc: { mag: 72.0, ang: 115 },
      },
    },
    fns: ['51N', '50N'],
    stages: { '51N': [0], '50N': [0] },
    patch: {
      '50N': { stages: [{ pickup: 1.0, timeOp: 0.05 }] },
      '51N': { stages: [{ pickup: 0.5, timeDial: 0.1, curve: 'IEC - Standard Inverse' }] },
    },
    out: {
      '50N-1': { BO4: true, L5: true },
      '51N-1': { BO4: true, L6: true },
      CB_Opened: { L1: true },
      CB_Closed: { L2: true },
    },
    inp: { CB_Opened: { BI3: true }, CB_Closed: { BI2: true } },
    expectedTrip: '50N-1',
    expectedTime: 0.05,
  },

  {
    id: 'edu_ll_fault',
    label: 'L-L Fault',
    name: 'Line-to-Line Fault (Phases A-B)',
    description:
      'Phase A-B line-to-line fault — Ia and Ib elevated (4.0 A) with 180° phase opposition, ' +
      'Ic remains at normal load. No zero-sequence current. ' +
      'Tests phase overcurrent (50/51) or directional element (67).',
    learningObj: 'Illustrate a line-to-line fault signature: elevated phase currents without zero-sequence component, and how phase-selective protection operates.',
    phasors: {
      currents: {
        Ia: { mag: 4.0, ang: 30 },
        Ib: { mag: 4.0, ang: 210 },
        Ic: { mag: 0.2, ang: 120 },
      },
      voltages: {
        Va: { mag: 40.0, ang: 0 },
        Vb: { mag: 40.0, ang: -120 },
        Vc: { mag: 66.4, ang: 120 },
      },
    },
    fns: ['51', '50'],
    stages: { '51': [0], '50': [0] },
    patch: {
      '50': { stages: [{ pickup: 3.0, timeOp: 0.05 }] },
      '51': { stages: [{ pickup: 1.5, timeDial: 0.1, curve: 'IEC - Standard Inverse' }] },
    },
    out: {
      '50-1': { BO3: true, L3: true },
      '51-1': { BO3: true, L4: true },
      CB_Opened: { L1: true },
      CB_Closed: { L2: true },
    },
    inp: { CB_Opened: { BI3: true }, CB_Closed: { BI2: true } },
    expectedTrip: '50-1',
    expectedTime: 0.05,
  },

  {
    id: 'edu_inrush',
    label: 'Inrush 51',
    name: 'Motor/Transformer Inrush (51 Time-Overcurrent)',
    description:
      'High inrush current at energisation — Ia/Ib/Ic at 4.0 A. ' +
      'The 51 time-overcurrent curve delays the trip, allowing temporary overload. ' +
      'Demonstrates how time-dial and curve shape affect trip time to distinguish load pickup from faults.',
    learningObj: 'Understand how the 51 inverse-time curve provides tolerance for short-duration overcurrents without false tripping on motor/transformer inrush.',
    phasors: {
      currents: {
        Ia: { mag: 4.0, ang: 0 },
        Ib: { mag: 4.0, ang: -120 },
        Ic: { mag: 4.0, ang: 120 },
      },
      voltages: {
        Va: { mag: 63.0, ang: 0 },
        Vb: { mag: 63.0, ang: -120 },
        Vc: { mag: 63.0, ang: 120 },
      },
    },
    fns: ['51'],
    stages: { '51': [0] },
    patch: {
      '51': { stages: [{ pickup: 2.0, timeDial: 0.089, curve: 'IEC - Very Inverse' }] },
    },
    out: {
      '51-1': { BO3: true, L4: true },
      CB_Opened: { L1: true },
      CB_Closed: { L2: true },
    },
    inp: { CB_Opened: { BI3: true }, CB_Closed: { BI2: true } },
    expectedTrip: '51-1',
    expectedTime: 1.2,
  },

  {
    id: 'edu_undervolt',
    label: 'Undervoltage 27',
    name: 'Undervoltage Condition (27)',
    description:
      'System voltages drop to 70% of nominal (46.5 V secondary) on all three phases. ' +
      'Currents remain at load levels. Tests undervoltage protection (27). ' +
      'Expected: 27-1 trips after configured time delay (1.0 s).',
    learningObj: 'Show how sustained low voltage is detected by the 27 element, and the role of hysteresis in preventing chattering near the threshold.',
    phasors: {
      currents: {
        Ia: { mag: 1.0, ang: 0 },
        Ib: { mag: 1.0, ang: -120 },
        Ic: { mag: 1.0, ang: 120 },
      },
      voltages: {
        Va: { mag: 46.5, ang: 0 },
        Vb: { mag: 46.5, ang: -120 },
        Vc: { mag: 46.5, ang: 120 },
      },
    },
    fns: ['27/59'],
    stages: { '27/59': { s27: [0], s59: [] } },
    patch: {},
    out: {
      '27-1': { BO3: true, L3: true },
      CB_Opened: { L1: true },
      CB_Closed: { L2: true },
    },
    inp: { CB_Opened: { BI3: true }, CB_Closed: { BI2: true } },
    expectedTrip: '27-1',
    expectedTime: 1.0,
  },

  {
    id: 'edu_underfreq',
    label: 'Underfreq 81U',
    name: 'Underfrequency Event (81U)',
    description:
      'System frequency at nominal (60 Hz) demonstrates 81U underfrequency threshold detection. ' +
      'Voltages and currents at nominal levels. Tests 81U underfrequency protection behavior. ' +
      'Pickup set to 61.0 Hz: when system frequency drops below 61 Hz, the relay detects underfrequency. ' +
      'Expected: 81U-1 trips after 1.0 s when frequency goes below the 61 Hz threshold.',
    learningObj: 'Demonstrate how underfrequency relays protect generators and loads during grid frequency events, and the importance of staged pickup thresholds.',
    phasors: {
      currents: {
        Ia: { mag: 1.5, ang: 0 },
        Ib: { mag: 1.5, ang: -120 },
        Ic: { mag: 1.5, ang: 120 },
      },
      voltages: {
        Va: { mag: 66.4, ang: 0 },
        Vb: { mag: 66.4, ang: -120 },
        Vc: { mag: 66.4, ang: 120 },
      },
    },
    fns: ['81'],
    stages: { '81': { s81u: [0], s81o: [] } },
    patch: {
      '81': { stages81u: [{ pickup: 61.0, timeOp: 1.0 }] },
    },
    out: {
      '81U-1': { BO3: true, L3: true },
      CB_Opened: { L1: true },
      CB_Closed: { L2: true },
    },
    inp: { CB_Opened: { BI3: true }, CB_Closed: { BI2: true } },
    expectedTrip: '81U-1',
    expectedTime: 1.0,
  },

  {
    id: 'edu_directional',
    label: '67 Directional',
    name: 'Directional Phase Overcurrent (67)',
    description:
      'Forward fault with Ia = 3.0 A at 0°, Va = 40 V at 0°. ' +
      'MTA = −45°, polarisation = quadrature. Tests the directional element: ' +
      'only forward faults should operate the relay, reverse faults should be blocked. ' +
      'Uses definite-time delay (0.3s) for demonstration.',
    learningObj: 'Explain how the 67 directional element uses voltage polarisation to distinguish forward faults from reverse faults on a meshed network.',
    phasors: {
      currents: {
        Ia: { mag: 3.0, ang: 0 },
        Ib: { mag: 0.5, ang: -120 },
        Ic: { mag: 0.5, ang: 120 },
      },
      voltages: {
        Va: { mag: 40.0, ang: 0 },
        Vb: { mag: 66.4, ang: -120 },
        Vc: { mag: 66.4, ang: 120 },
      },
    },
    fns: ['67'],
    stages: { '67': [0] },
    patch: {
      '67': { stages: [{ pickup: 2.0, curve: 'Tempo Definido', timeDial: 0.3, mta: -45, pol: 'quadratura', dir: 'forward' }] },
    },
    out: {
      '67-1': { BO3: true, L3: true },
      CB_Opened: { L1: true },
      CB_Closed: { L2: true },
    },
    inp: { CB_Opened: { BI3: true }, CB_Closed: { BI2: true } },
    expectedTrip: '67-1',
    expectedTime: 0.3,
  },
];
