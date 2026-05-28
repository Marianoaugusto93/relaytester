import { useEffect, useState, useRef, useCallback } from "react";
import { useHelp } from "./HelpContext.jsx";
import { useTranslation } from "./i18n/useTranslation.js";
import { useLanguage } from "./i18n/LanguageContext.jsx";
import { SCENARIO_HELP, getDifficultyColor } from "./estudos/constants/scenarioHelpContent.js";

const TOPIC_IDS = [
  "getting-started",
  "wiring-basics",
  "phasors-101",
  "protection-settings",
  "relay-outputs",
  "comtrade-export",
  "scenarios",
];

const EXPANDABLE = new Set(["protection-settings", "relay-outputs"]);

export default function HelpModal() {
  const { helpOpen, activeTopicId, closeHelp } = useHelp();
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const [localTopic, setLocalTopic] = useState(activeTopicId);
  const [expanded, setExpanded] = useState({});

  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const prevFocusRef = useRef(null);

  useEffect(() => {
    setLocalTopic(activeTopicId);
  }, [activeTopicId]);

  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e) => { if (e.key === "Escape") closeHelp(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpOpen, closeHelp]);

  useEffect(() => {
    if (!helpOpen) {
      if (prevFocusRef.current) prevFocusRef.current.focus();
      return;
    }
    prevFocusRef.current = document.activeElement;
    const frame = requestAnimationFrame(() => {
      if (closeButtonRef.current) closeButtonRef.current.focus();
    });
    const trapFocus = (e) => {
      if (!modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.key === "Tab") {
        if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
        else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
      }
    };
    window.addEventListener("keydown", trapFocus);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("keydown", trapFocus); };
  }, [helpOpen]);

  const toggleExpanded = useCallback((topicId) => {
    setExpanded(prev => ({ ...prev, [topicId]: !prev[topicId] }));
  }, []);

  const handleSectionKeyDown = useCallback((e, topicId) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpanded(topicId); }
  }, [toggleExpanded]);

  if (!helpOpen) return null;

  // Get content array directly from locale object (avoids string-only t() limitation)
  const getContent = (id) => {
    try { return locale.help.topics[id].content || []; } catch { return []; }
  };

  const topicLabel = (id) => t(`help.topics.${id}.label`);
  const isExpandable = EXPANDABLE.has(localTopic);
  const isExpanded = expanded[localTopic] ?? false;
  const content = getContent(localTopic);

  return (
    <div className="help-overlay" onClick={closeHelp} role="presentation">
      <div
        className="help-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        ref={modalRef}
      >
        <div className="help-header">
          <div className="help-title" id="help-modal-title">{t("help.title")}</div>
          <button
            className="help-close"
            onClick={closeHelp}
            aria-label={t("help.close")}
            ref={closeButtonRef}
          >
            &#x2715;
          </button>
        </div>
        <div className="help-body">
          <nav className="help-nav" aria-label="Help topics">
            {TOPIC_IDS.map((id) => (
              <button
                key={id}
                className={`help-nav-btn${localTopic === id ? " on" : ""}`}
                onClick={() => setLocalTopic(id)}
                aria-current={localTopic === id ? "true" : undefined}
                tabIndex={0}
              >
                {topicLabel(id)}
              </button>
            ))}
          </nav>
          <div className="help-content" role="region" aria-label={topicLabel(localTopic)}>
            {localTopic === "scenarios" ? (
              <div style={styles.scenariosGrid}>
                {Object.entries(SCENARIO_HELP).map(([scenarioId, help]) => (
                  <div key={scenarioId} style={styles.scenarioCard}>
                    <div style={styles.scenarioHeader}>
                      <div style={styles.scenarioTitle}>{t(`help.scenarios.${scenarioId}.name`)}</div>
                      <div style={{ ...styles.difficultyBadge, color: `var(${getDifficultyColor(help.difficulty)})` }}>
                        {help.difficulty}
                      </div>
                    </div>
                    <div style={styles.scenarioObjective}>{help.learningObjective}</div>
                    <div style={styles.conceptsLabel}>{t("help.scenarios.keyConcepts")}</div>
                    <ul style={styles.conceptsList}>
                      {help.keyConcepts.map((concept, i) => (
                        <li key={i}>{concept}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : isExpandable ? (
              <div className="help-section-card" aria-expanded={isExpanded ? "true" : "false"}>
                <div
                  className="help-section-header"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpanded(localTopic)}
                  onKeyDown={(e) => handleSectionKeyDown(e, localTopic)}
                  aria-expanded={isExpanded}
                  aria-controls={`help-section-content-${localTopic}`}
                >
                  {topicLabel(localTopic)}
                </div>
                <div className="help-section-content" id={`help-section-content-${localTopic}`}>
                  {content.map((section, i) => (
                    <div key={i} style={{ marginBottom: i < content.length - 1 ? 14 : 0 }}>
                      <div className="help-section-title">{section.heading}</div>
                      <div className="help-section-body">
                        {section.body.split("\n").map((line, j) => <p key={j}>{line}</p>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              content.map((section, i) => (
                <div key={i} className="help-section">
                  <div className="help-section-title">{section.heading}</div>
                  <div className="help-section-body">
                    {section.body.split("\n").map((line, j) => <p key={j}>{line}</p>)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  scenariosGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 12,
    padding: "12px 0",
  },
  scenarioCard: {
    padding: 12,
    borderRadius: 8,
    border: "1px solid var(--bdr)",
    background: "var(--card2)",
  },
  scenarioHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  scenarioTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--tx)",
    fontFamily: "var(--fh)",
  },
  difficultyBadge: {
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    whiteSpace: "nowrap",
  },
  scenarioObjective: {
    fontSize: 12,
    color: "var(--tx2)",
    marginBottom: 10,
    lineHeight: 1.4,
  },
  conceptsLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--tx3)",
    fontFamily: "var(--fh)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  conceptsList: {
    fontSize: 11,
    color: "var(--tx2)",
    lineHeight: 1.5,
    paddingLeft: 18,
    margin: 0,
  },
};
