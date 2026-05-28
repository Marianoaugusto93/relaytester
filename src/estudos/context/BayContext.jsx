import { createContext, useContext, useState } from "react";

/**
 * BayContext — holds the electrical bay parameters shared across all Estudos tools.
 * State: { vn, sBase, tc, tp, freq, grounding }
 * Sprint 1 will add localStorage persistence and a BayContextPanel UI component.
 */
const BayContext = createContext(null);

/** Default bay parameters (secondary-side, IEC 61850 convention) */
const DEFAULT_BAY = {
  vn: 115,        // Nominal voltage (kV)
  sBase: 100,     // System base MVA
  tc: { priA: 600, secA: 5 },
  tp: { priV: 13800, secV: 115 },
  freq: 60,       // Nominal frequency (Hz)
  grounding: "solidly",  // "solidly" | "resistance" | "isolated"
};

/**
 * BayProvider — wraps the Estudos subtree (and optionally all of AppInner).
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function BayProvider({ children }) {
  const [bay, setBay] = useState(DEFAULT_BAY);

  /**
   * Patch one or more bay fields.
   * @param {Partial<typeof DEFAULT_BAY>} patch
   */
  function updateBay(patch) {
    setBay(prev => ({ ...prev, ...patch }));
  }

  /**
   * Reset bay to defaults.
   */
  function resetBay() {
    setBay(DEFAULT_BAY);
  }

  const value = { bay, updateBay, resetBay };

  return (
    <BayContext.Provider value={value}>
      {children}
    </BayContext.Provider>
  );
}

/**
 * useBay — consume BayContext.
 * @throws {Error} if used outside BayProvider
 * @returns {{ bay: typeof DEFAULT_BAY, updateBay: Function, resetBay: Function }}
 */
export function useBay() {
  const ctx = useContext(BayContext);
  if (!ctx) throw new Error("useBay must be used inside BayProvider");
  return ctx;
}
