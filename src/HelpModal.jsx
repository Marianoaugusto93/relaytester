import { useEffect, useState } from "react";
import { useHelp } from "./HelpContext.jsx";

const TOPICS = [
  {
    id: "getting-started",
    label: "Getting Started",
    content: [
      {
        heading: "Welcome to RelayLab 360",
        body: "RelayLab 360 is a protection relay test bench simulator. Use it to learn relay commissioning, configure protection settings, and simulate fault conditions in a safe virtual environment.",
      },
      {
        heading: "Three Main Areas",
        body: "Campo — physical wiring between the test suitcase and relay terminals.\nRelé — phasor injection, protection settings, and relay behaviour.\nPainel — circuit breaker panel and single-line diagram.",
      },
    ],
  },
  {
    id: "wiring-basics",
    label: "Wiring Basics",
    content: [
      {
        heading: "Campo Tab",
        body: "The Campo tab represents a physical test suitcase connected to a relay via a calibration switch and terminal block. Drag wires between compatible terminals to build the injection circuit.",
      },
      {
        heading: "Terminal Naming",
        body: "i1_pos / i1_neg — current output jacks on the suitcase.\nv1_pos / v1_neg — voltage output jacks.\nbi1_pos / bi1_neg — binary input jacks.\nbo1_pos / bo1_neg — binary output jacks.\ntb_N_top / tb_N_bottom — terminal block openings (internally shorted).",
      },
      {
        heading: "Calibration Switch",
        body: "In the UP (closed) position the switch passes current through to the relay. In the DOWN position the S1/S2 banana jacks are shorted, providing a safe state when making connections.",
      },
    ],
  },
  {
    id: "phasors-101",
    label: "Phasors 101",
    content: [
      {
        heading: "What is a Phasor?",
        body: "A phasor represents a sinusoidal quantity by its magnitude and phase angle. The test suitcase injects these values into the relay's current and voltage inputs.",
      },
      {
        heading: "Balanced 3-Phase",
        body: "Use the '3φ Equil.' mode to automatically set Ib and Ic 120° apart from Ia. Choose ABC or ACB rotation sequence.",
      },
      {
        heading: "Pre-Fault / Fault",
        body: "Pre-Fault values are injected before the fault occurs. When Pre-Fault is enabled the simulation injects the pre-fault state for the configured duration, then switches to the fault state.",
      },
    ],
  },
  {
    id: "protection-settings",
    label: "Protection Settings",
    content: [
      {
        heading: "ANSI/IEC Functions",
        body: "50/50N — Instantaneous overcurrent (phase / neutral).\n51/51N — Time-overcurrent with IEC, US, IEEE, ANSI, or Definite-Time curves.\n67/67N — Directional overcurrent using MTA angle and polarising voltage.\n27/59 — Under/overvoltage with hysteresis.\n47 — Negative-sequence voltage.",
      },
      {
        heading: "Pickup and Time Dial",
        body: "Pickup (Ipu) sets the threshold current in amps. Time Dial (TD) scales the operating curve. Higher TD = longer trip time.",
      },
      {
        heading: "Output Matrix",
        body: "The Output Matrix links each protection stage to relay binary outputs (BOs) and LEDs. A checked cell means that stage activates that output when it trips.",
      },
    ],
  },
  {
    id: "relay-outputs",
    label: "Relay Outputs",
    content: [
      {
        heading: "Binary Outputs (BO)",
        body: "BOs are physical output contacts on the relay that close when a protection stage trips. In the simulator they can be wired via the Campo tab to open the circuit breaker.",
      },
      {
        heading: "Binary Inputs (BI)",
        body: "BIs receive external signals (e.g. circuit breaker status feedback). Use the Input Matrix to configure which BI corresponds to which function.",
      },
      {
        heading: "LED Indicators",
        body: "LEDs on the relay front panel illuminate when the assigned stage trips. They remain latched until manually reset.",
      },
    ],
  },
  {
    id: "comtrade-export",
    label: "COMTRADE Export",
    content: [
      {
        heading: "What is COMTRADE?",
        body: "COMTRADE (IEEE C37.111) is a standard format for storing power system disturbance data. RelayLab 360 generates a three-file package: .cfg (configuration), .dat (sampled data), .hdr (header).",
      },
      {
        heading: "How to Export",
        body: "After a relay trip, open the Fault Records panel, select the trip record, and click Download. The files are packaged as a ZIP archive.",
      },
      {
        heading: "Format Details",
        body: "ASCII format, 960 samples/s, 8 analog channels: IA, IB, IC, IGS, VA, VB, VC, VN. The trip event is anchored at the 500 ms pre-trigger point.",
      },
    ],
  },
];

export default function HelpModal() {
  const { helpOpen, activeTopicId, closeHelp, openHelp } = useHelp();
  const [localTopic, setLocalTopic] = useState(activeTopicId);

  useEffect(() => {
    setLocalTopic(activeTopicId);
  }, [activeTopicId]);

  useEffect(() => {
    if (!helpOpen) return;
    function onKey(e) {
      if (e.key === "Escape") closeHelp();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpOpen, closeHelp]);

  if (!helpOpen) return null;

  const topic = TOPICS.find((t) => t.id === localTopic) || TOPICS[0];

  return (
    <div className="help-overlay" onClick={closeHelp}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <div className="help-title">HELP &amp; REFERENCE</div>
          <button className="help-close" onClick={closeHelp} aria-label="Close help">
            &#x2715;
          </button>
        </div>
        <div className="help-body">
          <nav className="help-nav">
            {TOPICS.map((t) => (
              <button
                key={t.id}
                className={`help-nav-btn${localTopic === t.id ? " on" : ""}`}
                onClick={() => setLocalTopic(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="help-content">
            {topic.content.map((section, i) => (
              <div key={i} className="help-section">
                <div className="help-section-title">{section.heading}</div>
                <div className="help-section-body">
                  {section.body.split("\n").map((line, j) => (
                    <p key={j}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
