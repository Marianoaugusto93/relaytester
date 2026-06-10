/**
 * arcFlashLogic.js — Arc-Flash incident energy & PPE category (IEEE 1584-2018)
 *
 * Simplified implementation of IEEE 1584-2018 closed-form equations for arcing
 * current and incident energy. Real-world deployments require the full set of
 * empirically-fit coefficients tabulated in IEEE 1584-2018 §4.6; here we use a
 * reduced parameterization sufficient for a training/sizing tool.
 *
 * Arcing current (kA), simplified:
 *   log10(Iarc) = K1 + K2*log10(Ibf) + K3*log10(gap) + K4*Voc + K5*Cf
 *
 * Incident energy (cal/cm²), simplified:
 *   E = (Iarc * 1000 / D)^1.97 * t_clear * 0.2 * scale(config)
 *
 * Where:
 *   Ibf  — bolted fault current (kA, three-phase symmetrical)
 *   gap  — electrode gap (mm)
 *   D    — working distance (cm)
 *   Voc  — open-circuit voltage (kV)
 *   t_clear — clearing time (s)
 *
 * PPE category mapping uses NFPA 70E Table 130.7(C)(15)(c).
 * Arc-flash boundary returns the radius (cm) at which incident energy = 5 cal/cm².
 *
 * No external dependencies.
 */

// Simplified per-Voc-bracket coefficients. Loosely calibrated to IEEE 1584-2018
// VCB (vertical electrodes in cubic box) reference cases for tutorial use.
const COEFF_LV = { K1: -0.097, K2: 0.662, K3: -0.149, K4: 0.027, K5: 0 }; // < 1 kV
const COEFF_MV = { K1: -0.071, K2: 0.692, K3: -0.137, K4: 0.018, K5: 0 }; // 1-15 kV

// Configuration multipliers (NFPA 70E Annex D adaption for tutorial).
const CONFIG_MULTIPLIER = {
  Ungrounded: 1.20,
  Grounded: 1.00,
  GroundedY20: 0.92,
};

// PPE thresholds (cal/cm²) per NFPA 70E.
const PPE_BANDS = [
  { max: 1.2, category: 0, label: "Não requer EPP", color: "#22c55e" },
  { max: 4.0, category: 1, label: "PPE 1", color: "#0ea5e9" },
  { max: 8.0, category: 2, label: "PPE 2", color: "#a855f7" },
  { max: 25.0, category: 3, label: "PPE 3", color: "#f59e0b" },
  { max: 40.0, category: 4, label: "PPE 4", color: "#ef4444" },
  { max: Infinity, category: "X", label: "Perigo extremo", color: "#dc2626" },
];

/**
 * Return the simplified bracket coefficients for the given open-circuit voltage.
 * @param {number} Voc_kV
 * @returns {{K1:number,K2:number,K3:number,K4:number,K5:number}}
 */
function pickCoefficients(Voc_kV) {
  if (Voc_kV < 1.0) return COEFF_LV;
  return COEFF_MV;
}

/**
 * Arcing current Iarc (kA) from bolted fault and electrode geometry.
 *
 * @param {number} Ibf_kA
 * @param {number} gap_mm
 * @param {number} Voc_kV
 * @param {number} [Cf=1]  Configuration factor — 1.0 nominal
 * @returns {number} Iarc (kA)
 */
export function calcArcingCurrent(Ibf_kA, gap_mm, Voc_kV, Cf = 1) {
  if (Ibf_kA <= 0 || gap_mm <= 0) return 0;
  const k = pickCoefficients(Voc_kV);
  const log10Iarc =
    k.K1 +
    k.K2 * Math.log10(Math.max(0.1, Ibf_kA)) +
    k.K3 * Math.log10(Math.max(1, gap_mm)) +
    k.K4 * Voc_kV +
    k.K5 * Cf;
  // Iarc cannot exceed Ibf physically.
  return Math.min(Ibf_kA, Math.pow(10, log10Iarc));
}

/**
 * Pick the PPE category for a given incident energy.
 * @param {number} E_calcm2
 * @returns {{category: number|string, label: string, color: string}}
 */
export function pickPPECategory(E_calcm2) {
  for (const band of PPE_BANDS) {
    if (E_calcm2 <= band.max) {
      return { category: band.category, label: band.label, color: band.color };
    }
  }
  return PPE_BANDS[PPE_BANDS.length - 1];
}

/**
 * Compute the arc-flash boundary — the distance at which the incident energy
 * equals 5 cal/cm² (typical NFPA 70E onset of 2nd-degree burn).
 *
 * Since E ∝ 1/D^1.97 in our simplified model, we invert algebraically:
 *   D_boundary = D_ref * (E_ref / 5)^(1/1.97)
 *
 * @param {number} E_calcm2  Incident energy at the reference distance
 * @param {number} D_ref     Reference working distance (cm)
 * @returns {number}         Boundary radius (cm)
 */
export function calcArcFlashBoundary(E_calcm2, D_ref) {
  if (E_calcm2 <= 0 || D_ref <= 0) return 0;
  const ratio = E_calcm2 / 5;
  if (ratio <= 0) return D_ref;
  return D_ref * Math.pow(ratio, 1 / 1.97);
}

/**
 * Compute incident energy in cal/cm² at the working distance for the supplied
 * fault, gap, voltage, configuration and clearing time, and return the PPE
 * category + arc-flash boundary.
 *
 * @param {number} Ibf_kA            Bolted fault current (kA)
 * @param {number} gap_mm            Electrode gap (mm)
 * @param {number} workingDist_cm    Working distance (cm)
 * @param {number} systemV_kV        Open-circuit voltage (kV)
 * @param {"Ungrounded"|"Grounded"|"GroundedY20"} electrodeConfig
 * @param {number} t_clear_s         Clearing time (s)
 * @returns {{
 *   Iarc_kA: number,
 *   energy: number,
 *   category: number|string,
 *   label: string,
 *   color: string,
 *   boundary: number
 * }}
 */
export function calcIncidentEnergy(
  Ibf_kA,
  gap_mm,
  workingDist_cm,
  systemV_kV,
  electrodeConfig,
  t_clear_s,
) {
  const D = Math.max(1, workingDist_cm);
  const mult = CONFIG_MULTIPLIER[electrodeConfig] ?? 1.0;
  const Iarc_kA = calcArcingCurrent(Ibf_kA, gap_mm, systemV_kV, 1);

  // Simplified incident energy model (calibrated for tutorial use).
  const Iarc_A = Iarc_kA * 1000;
  const baseEnergy = Math.pow(Iarc_A / D, 1.97) * Math.max(0, t_clear_s) * 0.2;
  const energy = baseEnergy * mult;

  const ppe = pickPPECategory(energy);
  const boundary = calcArcFlashBoundary(energy, D);

  return {
    Iarc_kA: parseFloat(Iarc_kA.toFixed(3)),
    energy: parseFloat(energy.toFixed(3)),
    category: ppe.category,
    label: ppe.label,
    color: ppe.color,
    boundary: parseFloat(boundary.toFixed(1)),
  };
}

/**
 * Compute a comparison table of incident energy vs. clearing time. Useful for
 * the recommendation "reduce clearing to X ms".
 *
 * @param {number} Ibf_kA
 * @param {number} gap_mm
 * @param {number} workingDist_cm
 * @param {number} systemV_kV
 * @param {string} electrodeConfig
 * @param {Array<number>} [clearMs_list=[50,100,200,300]]
 * @returns {Array<{ t_ms: number, energy: number, category: number|string, label: string }>}
 */
export function compareClearingTimes(
  Ibf_kA,
  gap_mm,
  workingDist_cm,
  systemV_kV,
  electrodeConfig,
  clearMs_list = [50, 100, 200, 300],
) {
  return clearMs_list.map((t_ms) => {
    const r = calcIncidentEnergy(
      Ibf_kA,
      gap_mm,
      workingDist_cm,
      systemV_kV,
      electrodeConfig,
      t_ms / 1000,
    );
    return {
      t_ms,
      energy: r.energy,
      category: r.category,
      label: r.label,
    };
  });
}
