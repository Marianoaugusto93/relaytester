/**
 * Educational scenario help content for 6 protection scenarios.
 * Maps scenario IDs to learning objectives, difficulty levels, and key concepts.
 */

export const SCENARIO_HELP = {
  "3ph-symmetrical": {
    difficulty: "Beginner",
    learningObjective: "Understand balanced three-phase fault protection",
    keyConcepts: [
      "Symmetrical three-phase faults produce equal currents in all phases",
      "Instantaneous 50 function detects high fault currents immediately",
      "Secondary-side current proportional to primary via CT ratio",
    ],
    relatedFunctions: ["50", "51"],
  },

  "1lg-fault": {
    difficulty: "Intermediate",
    learningObjective: "Recognize line-to-ground faults with neutral current",
    keyConcepts: [
      "Single line-to-ground faults generate zero-sequence current (3I0)",
      "50N/51N functions detect neutral protection on phase A faults",
      "Major zero-sequence current ≈ 0.3× phase current under healthy load",
    ],
    relatedFunctions: ["50N", "51N"],
  },

  "1ll-fault": {
    difficulty: "Intermediate",
    learningObjective: "Detect line-to-line faults without zero-sequence",
    keyConcepts: [
      "Phase-to-phase faults eliminate one phase reference; I0 = 0",
      "Remaining two phases carry equal but opposite currents",
      "50/51 must discriminate between L-L fault and single L-G",
    ],
    relatedFunctions: ["50", "51"],
  },

  "inrush-transient": {
    difficulty: "Advanced",
    learningObjective: "Distinguish motor inrush from sustained overcurrent",
    keyConcepts: [
      "Inrush transient: 4 A for ~1.2 seconds after motor start",
      "51 function must not trip on inrush (time dial > 1.0 or curve selection)",
      "Definite-Time curve ideal for inrush mitigation",
    ],
    relatedFunctions: ["51"],
  },

  "undervoltage-27": {
    difficulty: "Intermediate",
    learningObjective: "Protect equipment during low-voltage conditions",
    keyConcepts: [
      "Undervoltage 27 function trips when line voltage < 46.5 V secondary",
      "Prevents motor stalling and equipment damage during sag",
      "Hysteresis: trip < 46.5 V, reset > 50 V (3.5 V margin)",
    ],
    relatedFunctions: ["27"],
  },

  "underfreq-81u": {
    difficulty: "Advanced",
    learningObjective: "Prevent grid instability during low-frequency events",
    keyConcepts: [
      "Underfrequency 81U detects system disturbances (generator loss, load increase)",
      "Trip when frequency < 61 Hz (1 Hz below nominal 60 Hz)",
      "Prevents generator runaway and cascading blackout",
    ],
    relatedFunctions: ["81U"],
  },
};

/**
 * Directional protection scenario (bonus 7th scenario).
 * Separates forward from reverse fault power flows.
 */
export const SCENARIO_HELP_DIRECTIONAL = {
  "directional-67": {
    difficulty: "Advanced",
    learningObjective: "Discriminate fault direction using power flow angle",
    keyConcepts: [
      "Directional 67 uses MTA (measuring tolerance angle) and polarizing voltage",
      "Trips only on forward faults (generator perspective); blocks reverse faults",
      "Essential in radial or meshed networks to prevent miscoordination",
    ],
    relatedFunctions: ["67"],
  },
};

/**
 * Get help content for a scenario ID.
 * @param {string} scenarioId - Scenario ID (e.g., "3ph-symmetrical")
 * @returns {object|null} Help content or null if not found
 */
export function getScenarioHelp(scenarioId) {
  return SCENARIO_HELP[scenarioId] || SCENARIO_HELP_DIRECTIONAL[scenarioId] || null;
}

/**
 * Get difficulty badge color for UI display.
 * @param {string} difficulty - "Beginner" | "Intermediate" | "Advanced"
 * @returns {string} Color token (--cyan, --amber, --red)
 */
export function getDifficultyColor(difficulty) {
  const colors = {
    "Beginner": "--cyan",
    "Intermediate": "--amber",
    "Advanced": "--red",
  };
  return colors[difficulty] || "--tx3";
}
