import { useState, useCallback } from "react";
import { deepClone, defaultPhasors, defaultProtections } from "./defaults.js";
import { calc3 } from "./protection.js";

const VSB_CSS = `
.vsb-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 2500;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}
.vsb-modal {
  background: var(--card);
  border: 1px solid var(--bdr);
  border-radius: 16px;
  width: 1000px;
  max-width: 96vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
}
.vsb-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--bdr);
  flex-shrink: 0;
}
.vsb-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--tx);
  font-family: var(--fh);
  letter-spacing: 1px;
  text-transform: uppercase;
  flex: 1;
}
.vsb-close {
  background: transparent;
  border: 1px solid var(--bdr);
  color: var(--tx3);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.vsb-close:hover {
  background: var(--red-dim);
  border-color: rgba(248, 113, 113, 0.3);
  color: var(--red);
}
.vsb-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
}
.vsb-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--card2);
  border-radius: 12px;
  padding: 14px;
  border: 1px solid var(--bdr);
}
.vsb-section-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--orange);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  font-family: var(--fh);
}
.vsb-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.vsb-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--tx2);
  min-width: 80px;
  flex-shrink: 0;
}
.vsb-slider {
  flex: 1;
  height: 24px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--card3);
  border-radius: 6px;
  outline: none;
  border: 1px solid var(--bdr);
}
.vsb-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--orange);
  cursor: pointer;
  border: 2px solid var(--card);
}
.vsb-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--orange);
  cursor: pointer;
  border: 2px solid var(--card);
}
.vsb-value {
  font-size: 11px;
  font-weight: 700;
  color: var(--cyan);
  font-family: var(--fm);
  min-width: 50px;
  text-align: right;
}
.vsb-value.warm {
  color: var(--warm);
}
.vsb-preview-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--green-dim);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
}
.vsb-preview-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
}
.vsb-status-icon {
  font-size: 16px;
}
.vsb-preview-text {
  font-size: 11px;
  color: var(--tx2);
}
.vsb-footer {
  display: flex;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--bdr);
  flex-shrink: 0;
  justify-content: flex-end;
}
.vsb-btn {
  padding: 8px 18px;
  border-radius: 8px;
  border: 1px solid var(--bdr);
  background: var(--card2);
  color: var(--tx2);
  font-size: 11px;
  font-family: var(--fi);
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.vsb-btn:hover {
  border-color: var(--tx3);
  color: var(--tx);
}
.vsb-btn.primary {
  background: var(--orange-dim);
  border-color: rgba(249, 115, 22, 0.3);
  color: var(--orange);
}
.vsb-btn.primary:hover {
  background: rgba(249, 115, 22, 0.18);
}
`;

export default function VisualScenarioBuilder({ isOpen, onClose, onSave }) {
  const [scenario, setScenario] = useState(() => ({
    name: "",
    description: "",
    difficulty: "intermediate",
    phasors: deepClone(defaultPhasors),
    protection: {
      functionCode: "50",
      stageNum: 1,
      config: { pickup: 2.5, curve: "IEC", timeDial: 0.3 },
      expectedTripTime: 0.05,
    },
  }));

  const [tripResult, setTripResult] = useState(null);

  const updatePhasor = useCallback((type, phase, field, value) => {
    setScenario((prev) => ({
      ...prev,
      phasors: {
        ...prev.phasors,
        [type]: {
          ...prev.phasors[type],
          [phase]: {
            ...prev.phasors[type][phase],
            [field]: parseFloat(value) || 0,
          },
        },
      },
    }));
  }, []);

  const updateProtection = useCallback((field, value) => {
    setScenario((prev) => ({
      ...prev,
      protection: { ...prev.protection, [field]: value },
    }));
  }, []);

  const updateMetadata = useCallback((field, value) => {
    setScenario((prev) => ({ ...prev, [field]: value }));
  }, []);

  const previewTrip = useCallback(() => {
    const { phasors, protection } = scenario;
    const Ia = {
      mag: phasors.currents.Ia.mag,
      ang: (phasors.currents.Ia.ang * Math.PI) / 180,
    };
    const trip = calc3(Ia, protection.functionCode, protection.config);
    setTripResult({
      trips: trip,
      time: trip ? protection.config.timeDial * 0.05 : null,
    });
  }, [scenario]);

  const handleSave = () => {
    if (!scenario.name.trim()) {
      alert("Please enter a scenario name");
      return;
    }
    onSave(scenario);
    setScenario(() => ({
      name: "",
      description: "",
      difficulty: "intermediate",
      phasors: deepClone(defaultPhasors),
      protection: {
        functionCode: "50",
        stageNum: 1,
        config: { pickup: 2.5, curve: "IEC", timeDial: 0.3 },
        expectedTripTime: 0.05,
      },
    }));
    onClose();
  };

  if (!isOpen) return null;

  const { currents, voltages } = scenario.phasors;
  const { functionCode, config } = scenario.protection;

  return (
    <>
      <style>{VSB_CSS}</style>
      <div className="vsb-overlay" onClick={onClose}>
        <div className="vsb-modal" onClick={(e) => e.stopPropagation()}>
          <div className="vsb-header">
            <div className="vsb-title">Visual Scenario Builder</div>
            <button
              className="vsb-close"
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          <div className="vsb-body">
            {/* Left: Phasor Editor */}
            <div>
              <div className="vsb-section">
                <div className="vsb-section-title">Current Injection (A)</div>
                {["Ia", "Ib", "Ic"].map((phase) => (
                  <div key={`cur-${phase}`}>
                    <div className="vsb-row">
                      <div className="vsb-label">{phase} Mag</div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={currents[phase].mag}
                        onChange={(e) =>
                          updatePhasor("currents", phase, "mag", e.target.value)
                        }
                        className="vsb-slider"
                        aria-label={`${phase} magnitude`}
                      />
                      <div className="vsb-value">
                        {currents[phase].mag.toFixed(1)} A
                      </div>
                    </div>
                    <div className="vsb-row">
                      <div className="vsb-label">{phase} Ang</div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        value={currents[phase].ang}
                        onChange={(e) =>
                          updatePhasor("currents", phase, "ang", e.target.value)
                        }
                        className="vsb-slider"
                        aria-label={`${phase} angle`}
                      />
                      <div className="vsb-value warm">
                        {currents[phase].ang.toFixed(0)}°
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="vsb-section">
                <div className="vsb-section-title">Voltage (V)</div>
                {["Va", "Vb", "Vc"].map((phase) => (
                  <div key={`vol-${phase}`}>
                    <div className="vsb-row">
                      <div className="vsb-label">{phase} Mag</div>
                      <input
                        type="range"
                        min="0"
                        max="140"
                        step="0.1"
                        value={voltages[phase].mag}
                        onChange={(e) =>
                          updatePhasor("voltages", phase, "mag", e.target.value)
                        }
                        className="vsb-slider"
                        aria-label={`${phase} voltage magnitude`}
                      />
                      <div className="vsb-value">
                        {voltages[phase].mag.toFixed(1)} V
                      </div>
                    </div>
                    <div className="vsb-row">
                      <div className="vsb-label">{phase} Ang</div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        value={voltages[phase].ang}
                        onChange={(e) =>
                          updatePhasor("voltages", phase, "ang", e.target.value)
                        }
                        className="vsb-slider"
                        aria-label={`${phase} voltage angle`}
                      />
                      <div className="vsb-value warm">
                        {voltages[phase].ang.toFixed(0)}°
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Protection Config */}
            <div>
              <div className="vsb-section">
                <div className="vsb-section-title">Protection Settings</div>
                <div className="vsb-row">
                  <div className="vsb-label">Function</div>
                  <select
                    value={functionCode}
                    onChange={(e) =>
                      updateProtection("functionCode", e.target.value)
                    }
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      background: "var(--card3)",
                      border: "1px solid var(--bdr)",
                      borderRadius: "6px",
                      color: "var(--cyan)",
                      fontSize: "11px",
                      fontFamily: "var(--fm)",
                    }}
                    aria-label="Protection function"
                  >
                    {["50", "51", "50N", "51N", "67", "67N", "27", "59"].map(
                      (fc) => (
                        <option key={fc} value={fc}>
                          {fc}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="vsb-row">
                  <div className="vsb-label">Pickup (A)</div>
                  <input
                    type="range"
                    min="0.5"
                    max="20"
                    step="0.1"
                    value={config.pickup}
                    onChange={(e) =>
                      updateProtection("config", {
                        ...config,
                        pickup: parseFloat(e.target.value),
                      })
                    }
                    className="vsb-slider"
                    aria-label="Pickup current"
                  />
                  <div className="vsb-value">
                    {config.pickup.toFixed(2)} A
                  </div>
                </div>

                {["51", "51N"].includes(functionCode) && (
                  <>
                    <div className="vsb-row">
                      <div className="vsb-label">Curve</div>
                      <select
                        value={config.curve || "IEC"}
                        onChange={(e) =>
                          updateProtection("config", {
                            ...config,
                            curve: e.target.value,
                          })
                        }
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          background: "var(--card3)",
                          border: "1px solid var(--bdr)",
                          borderRadius: "6px",
                          color: "var(--cyan)",
                          fontSize: "11px",
                          fontFamily: "var(--fm)",
                        }}
                        aria-label="Time-overcurrent curve"
                      >
                        {["IEC", "IEEE", "ANSI"].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="vsb-row">
                      <div className="vsb-label">Time Dial</div>
                      <input
                        type="range"
                        min="0.05"
                        max="10"
                        step="0.05"
                        value={config.timeDial}
                        onChange={(e) =>
                          updateProtection("config", {
                            ...config,
                            timeDial: parseFloat(e.target.value),
                          })
                        }
                        className="vsb-slider"
                        aria-label="Time dial"
                      />
                      <div className="vsb-value">
                        {config.timeDial.toFixed(2)}
                      </div>
                    </div>
                  </>
                )}

                <div className="vsb-row">
                  <div className="vsb-label">Expected Trip (s)</div>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    step="0.01"
                    value={scenario.protection.expectedTripTime}
                    onChange={(e) =>
                      updateProtection(
                        "expectedTripTime",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      background: "var(--card3)",
                      border: "1px solid var(--bdr)",
                      borderRadius: "6px",
                      color: "var(--cyan)",
                      fontSize: "11px",
                      fontFamily: "var(--fm)",
                    }}
                    aria-label="Expected trip time"
                  />
                </div>

                <button
                  onClick={previewTrip}
                  style={{
                    padding: "8px 12px",
                    background: "var(--cyan-dim)",
                    border: "1px solid rgba(14, 165, 233, 0.3)",
                    color: "var(--cyan)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "700",
                    marginTop: "8px",
                    transition: "all 0.15s",
                  }}
                  aria-label="Preview trip"
                >
                  Preview Trip
                </button>

                {tripResult && (
                  <div className="vsb-preview-panel">
                    <div className="vsb-preview-status">
                      <span className="vsb-status-icon">
                        {tripResult.trips ? "✓" : "✗"}
                      </span>
                      <span>
                        {tripResult.trips ? "WILL TRIP" : "NO TRIP"}
                      </span>
                    </div>
                    {tripResult.time && (
                      <div className="vsb-preview-text">
                        Est. trip time: {tripResult.time.toFixed(3)}s
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="vsb-section">
                <div className="vsb-section-title">Scenario Info</div>
                <div className="vsb-row">
                  <div className="vsb-label">Name</div>
                  <input
                    type="text"
                    value={scenario.name}
                    onChange={(e) => updateMetadata("name", e.target.value)}
                    placeholder="e.g., Custom Inrush"
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      background: "var(--card3)",
                      border: "1px solid var(--bdr)",
                      borderRadius: "6px",
                      color: "var(--cyan)",
                      fontSize: "11px",
                      fontFamily: "var(--fm)",
                    }}
                    aria-label="Scenario name"
                  />
                </div>

                <div className="vsb-row">
                  <div className="vsb-label">Difficulty</div>
                  <select
                    value={scenario.difficulty}
                    onChange={(e) =>
                      updateMetadata("difficulty", e.target.value)
                    }
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      background: "var(--card3)",
                      border: "1px solid var(--bdr)",
                      borderRadius: "6px",
                      color: "var(--cyan)",
                      fontSize: "11px",
                      fontFamily: "var(--fm)",
                    }}
                    aria-label="Difficulty level"
                  >
                    {["beginner", "intermediate", "advanced"].map((d) => (
                      <option key={d} value={d}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={scenario.description}
                  onChange={(e) =>
                    updateMetadata("description", e.target.value)
                  }
                  placeholder="Description (optional)"
                  style={{
                    padding: "6px 8px",
                    background: "var(--card3)",
                    border: "1px solid var(--bdr)",
                    borderRadius: "6px",
                    color: "var(--cyan)",
                    fontSize: "11px",
                    fontFamily: "var(--fm)",
                    resize: "vertical",
                    minHeight: "60px",
                  }}
                  aria-label="Scenario description"
                />
              </div>
            </div>
          </div>

          <div className="vsb-footer">
            <button className="vsb-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="vsb-btn primary"
              onClick={handleSave}
              aria-label="Save scenario"
            >
              Save Scenario
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
