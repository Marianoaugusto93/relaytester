/**
 * AnalyticsDashboard.jsx — Usage analytics visualization.
 * Displays scenario usage, error frequency, action distribution.
 */

import { useMemo } from "react";
import { getTopScenarios, getErrorSummary, getActionSummary, getStats } from "../utils/analyticsEngine.js";
import { useTranslation } from "../../i18n/useTranslation.js";

export default function AnalyticsDashboard({ analytics, onClear }) {
  const { t } = useTranslation();

  const topScenarios = useMemo(() => getTopScenarios(analytics, 5), [analytics]);
  const errors = useMemo(() => getErrorSummary(analytics), [analytics]);
  const actions = useMemo(() => getActionSummary(analytics), [analytics]);
  const stats = useMemo(() => getStats(analytics), [analytics]);

  // Find max for bar scaling
  const maxUses = topScenarios.length > 0 ? Math.max(...topScenarios.map(s => s.uses)) : 1;
  const maxErrors = errors.length > 0 ? Math.max(...errors.map(e => e.count)) : 1;

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>{t("analytics.title") || "Analytics"}</h2>
        <button style={styles.clearBtn} onClick={onClear}>
          {t("analytics.clear") || "Clear Data"}
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.totalScenarioUses}</div>
          <div style={styles.statLabel}>{t("analytics.totalUses") || "Total Uses"}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.scenariosTracked}</div>
          <div style={styles.statLabel}>{t("analytics.scenarios") || "Scenarios"}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.totalActions}</div>
          <div style={styles.statLabel}>{t("analytics.actions") || "Actions"}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.totalErrors}</div>
          <div style={styles.statLabel}>{t("analytics.errors") || "Errors"}</div>
        </div>
      </div>

      {/* Top Scenarios */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>{t("analytics.topScenarios") || "Top Scenarios"}</h3>
        {topScenarios.length === 0 ? (
          <p style={styles.empty}>{t("analytics.noData") || "No data yet"}</p>
        ) : (
          <div style={styles.scenariosList}>
            {topScenarios.map(s => (
              <div key={s.id} style={styles.scenarioItem}>
                <div style={styles.scenarioLabel}>
                  <span style={styles.scenarioName}>{s.id}</span>
                  <span style={styles.scenarioCount}>{s.uses} uses</span>
                </div>
                <div style={styles.barContainer}>
                  <div style={{ ...styles.bar, width: `${(s.uses / maxUses) * 100}%` }} />
                </div>
                <div style={styles.scenarioStats}>
                  <span>⌀ {s.avgDuration}s</span>
                  <span>min {s.minDuration}s</span>
                  <span>max {s.maxDuration}s</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>{t("analytics.errorFrequency") || "Error Frequency"}</h3>
          <div style={styles.errorsList}>
            {errors.map(e => (
              <div key={e.type} style={styles.errorItem}>
                <span style={styles.errorType}>{e.type}</span>
                <div style={styles.barContainer}>
                  <div style={{ ...styles.errorBar, width: `${(e.count / maxErrors) * 100}%` }} />
                </div>
                <span style={styles.errorCount}>{e.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>{t("analytics.actionDistribution") || "Action Distribution"}</h3>
          <div style={styles.actionsList}>
            {actions.map(a => (
              <div key={a.type} style={styles.actionItem}>
                <span style={styles.actionType}>{a.type}</span>
                <span style={styles.actionCount}>{a.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <small style={styles.timestamp}>
          Last updated: {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : "Never"}
        </small>
      </div>
    </div>
  );
}

const styles = {
  root: {
    padding: 16,
    maxWidth: 800,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottom: "1px solid var(--bdr)",
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "var(--tx)",
    fontFamily: "var(--fh)",
    margin: 0,
  },
  clearBtn: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid var(--bdr)",
    background: "var(--card2)",
    color: "var(--tx3)",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    padding: 12,
    borderRadius: 8,
    border: "1px solid var(--bdr)",
    background: "var(--card2)",
    textAlign: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: 800,
    color: "var(--cyan)",
    fontFamily: "var(--fh)",
  },
  statLabel: {
    fontSize: 11,
    color: "var(--tx3)",
    fontWeight: 600,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--tx)",
    fontFamily: "var(--fh)",
    margin: "0 0 12px 0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  empty: {
    fontSize: 12,
    color: "var(--tx3)",
    fontStyle: "italic",
    margin: 0,
  },
  scenariosList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  scenarioItem: {
    padding: 12,
    borderRadius: 6,
    border: "1px solid var(--bdr)",
    background: "var(--card2)",
  },
  scenarioLabel: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  scenarioName: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--tx)",
    fontFamily: "var(--fh)",
  },
  scenarioCount: {
    fontSize: 11,
    color: "var(--tx3)",
    fontWeight: 500,
  },
  barContainer: {
    height: 20,
    background: "var(--card)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  bar: {
    height: "100%",
    background: "linear-gradient(90deg, var(--cyan), var(--cyan-dim))",
    transition: "width 0.2s",
  },
  scenarioStats: {
    display: "flex",
    gap: 12,
    fontSize: 11,
    color: "var(--tx2)",
  },
  errorsList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  errorItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  errorType: {
    fontSize: 11,
    color: "var(--tx2)",
    fontWeight: 600,
    minWidth: 100,
  },
  errorBar: {
    flex: 1,
    height: 16,
    background: "rgba(239, 68, 68, 0.2)",
    borderRadius: 2,
  },
  errorCount: {
    fontSize: 11,
    fontWeight: 600,
    color: "#ef4444",
    minWidth: 30,
    textAlign: "right",
  },
  actionsList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 12,
  },
  actionItem: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid var(--bdr)",
    background: "var(--card2)",
    textAlign: "center",
  },
  actionType: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--tx2)",
    marginBottom: 4,
  },
  actionCount: {
    display: "block",
    fontSize: 16,
    fontWeight: 800,
    color: "var(--amber)",
  },
  footer: {
    marginTop: 20,
    paddingTop: 12,
    borderTop: "1px solid var(--bdr)",
    textAlign: "center",
  },
  timestamp: {
    color: "var(--tx3)",
    fontSize: 10,
  },
};
