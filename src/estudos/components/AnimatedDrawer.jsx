/**
 * AnimatedDrawer.jsx — Right-side collapsible drawer
 *
 * Used as the Workbench-lite Right Drawer container.
 * Supports collapse/expand via toggle button (icon ⇄) with a smooth width transition.
 * Honors prefers-reduced-motion via CSS.
 */

export default function AnimatedDrawer({
  open,
  onToggle,
  width = 280,
  collapsedWidth = 40,
  children,
  ariaLabel = "Drawer",
}) {
  return (
    <aside
      style={{
        ...styles.root,
        width: open ? width : collapsedWidth,
      }}
      aria-label={ariaLabel}
      aria-expanded={open}
    >
      {/* Toggle bar (always visible) */}
      <div style={styles.toggleBar}>
        <button
          type="button"
          onClick={onToggle}
          style={styles.toggleBtn}
          title={open ? "Recolher painel (⌘B)" : "Expandir painel (⌘B)"}
          aria-label={open ? "Recolher painel" : "Expandir painel"}
        >
          {open ? "⇨" : "⇦"}
        </button>
      </div>

      {/* Content: only rendered when open to avoid layout flash */}
      {open && <div style={styles.body}>{children}</div>}
    </aside>
  );
}

const styles = {
  root: {
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    background: "var(--card)",
    borderLeft: "1px solid var(--bdr)",
    transition: "width 180ms ease-out",
    overflow: "hidden",
    height: "100%",
  },
  toggleBar: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "6px 8px",
    borderBottom: "1px solid var(--bdr)",
    flexShrink: 0,
    background: "var(--card2)",
  },
  toggleBtn: {
    width: 26,
    height: 26,
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    background: "var(--card)",
    color: "var(--tx3)",
    fontSize: 13,
    fontFamily: "var(--fm)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all .15s",
  },
  body: {
    flex: 1,
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
  },
};
