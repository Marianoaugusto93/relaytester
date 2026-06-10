/**
 * LoadingPlaceholder.jsx — Suspense fallback for lazy-loaded tools
 *
 * Shows a minimal centered spinner + label while a tool module is fetched.
 * Designed to be visually unobtrusive so it does not flash on cached loads.
 */

export default function LoadingPlaceholder({ label = "Carregando ferramenta..." }) {
  return (
    <div style={styles.root} role="status" aria-live="polite">
      <div style={styles.spinner} aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle
            cx="16"
            cy="16"
            r="13"
            stroke="rgba(14,165,233,0.15)"
            strokeWidth="2"
          />
          <path
            d="M 16 3 A 13 13 0 0 1 29 16"
            stroke="#0ea5e9"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 16 16"
              to="360 16 16"
              dur="0.9s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      </div>
      <div style={styles.label}>{label}</div>
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 40,
    minHeight: 240,
  },
  spinner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
    letterSpacing: 0.5,
  },
};
