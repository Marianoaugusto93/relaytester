import { useTranslation } from "./i18n/useTranslation.js";

// Static list of all borne IDs (1-16)
export const BORNE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

// Static non-translatable data (icon, color) for each group
const BORNE_GROUP_META = {
  saída:    { icon: "📤", color: "#FFB84D" },
  feedback: { icon: "📡", color: "#81C784" },
  comando:  { icon: "🎛️", color: "#64B5F6" }
};

/**
 * Hook that returns all 16 borne descriptions using the current locale.
 * Return shape matches original BORNE_DESCRIPTIONS[n]: { label, desc, group, fullName, detail, related, usage }
 * @returns {Object} Map from borne number (1-16) to description object
 */
export function useBorneDescriptions() {
  const { t } = useTranslation();
  const descs = {};

  // group is structural (not translated) — kept as static mapping
  const BORNE_GROUP = {
    1: "saída", 2: "saída", 3: "saída", 4: "saída",
    5: "saída", 6: "saída", 7: "saída", 8: "saída",
    9: "feedback", 10: "feedback", 11: "feedback", 12: "feedback",
    13: "comando", 14: "comando", 15: "comando", 16: "comando"
  };

  for (let i = 1; i <= 16; i++) {
    descs[i] = {
      label:    t(`borne.descriptions.${i}.label`),
      desc:     t(`borne.descriptions.${i}.desc`),
      group:    BORNE_GROUP[i],
      fullName: t(`borne.descriptions.${i}.fullName`),
      detail:   t(`borne.descriptions.${i}.detail`),
      related:  t(`borne.descriptions.${i}.related`),
      usage:    t(`borne.descriptions.${i}.usage`)
    };
  }

  return descs;
}

/**
 * Hook that returns all 3 borne groups using the current locale.
 * Return shape matches original BORNE_GROUPS[key]: { title, description, icon, color }
 * @returns {Object} Map from group key to group info object
 */
export function useBorneGroups() {
  const { t } = useTranslation();
  return {
    saída: {
      title:       t("borne.groups.saída.title"),
      description: t("borne.groups.saída.description"),
      ...BORNE_GROUP_META.saída
    },
    feedback: {
      title:       t("borne.groups.feedback.title"),
      description: t("borne.groups.feedback.description"),
      ...BORNE_GROUP_META.feedback
    },
    comando: {
      title:       t("borne.groups.comando.title"),
      description: t("borne.groups.comando.description"),
      ...BORNE_GROUP_META.comando
    }
  };
}

// Deprecated: use useBorneDescriptions() and useBorneGroups() instead
export const BORNE_DESCRIPTIONS = null;
export const BORNE_GROUPS = null;
