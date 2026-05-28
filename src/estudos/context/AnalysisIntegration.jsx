/**
 * AnalysisIntegration.jsx — Shared analysis results across tools
 *
 * Manages cross-tool data sharing:
 * - Fault analysis results available to TCC tool
 * - TCC curves available to Distance/Differential tools
 * - Distribution context available for cable ratings
 *
 * Context providers and hooks for inter-tool communication.
 */

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useArtifactBus } from "./ArtifactBus.jsx";

const AnalysisIntegrationContext = createContext();

export function AnalysisIntegrationProvider({ children }) {
  const bus = useArtifactBus();

  // Shared analysis results
  const [faultResults, setFaultResults] = useState(null);
  const [tccAnalysis, setTccAnalysis] = useState(null);
  const [distributionAnalysis, setDistributionAnalysis] = useState(null);

  // Subscribe to artifact events
  useEffect(() => {
    // Listen for fault analysis results
    const unsubFault = bus.subscribe("fault.result", (payload) => {
      setFaultResults(payload);
    });

    // Listen for TCC exports
    const unsubTcc = bus.subscribe("artifact.tccExport", (payload) => {
      setTccAnalysis(payload);
    });

    // Listen for distribution context
    const unsubDist = bus.subscribe("artifact.distributionContext", (payload) => {
      setDistributionAnalysis(payload);
    });

    return () => {
      unsubFault?.();
      unsubTcc?.();
      unsubDist?.();
    };
  }, [bus]);

  const clearAnalysis = useCallback((type = "all") => {
    if (type === "fault" || type === "all") setFaultResults(null);
    if (type === "tcc" || type === "all") setTccAnalysis(null);
    if (type === "distribution" || type === "all") setDistributionAnalysis(null);
  }, []);

  const value = {
    faultResults,
    tccAnalysis,
    distributionAnalysis,
    clearAnalysis,
  };

  return (
    <AnalysisIntegrationContext.Provider value={value}>
      {children}
    </AnalysisIntegrationContext.Provider>
  );
}

/**
 * Hook to access cross-tool analysis results.
 * @returns {Object} {faultResults, tccAnalysis, distributionAnalysis, clearAnalysis}
 */
export function useAnalysisIntegration() {
  const context = useContext(AnalysisIntegrationContext);
  if (!context) {
    throw new Error(
      "useAnalysisIntegration must be used within AnalysisIntegrationProvider"
    );
  }
  return context;
}
