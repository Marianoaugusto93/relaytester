/**
 * TabBar.jsx — Multi-tool canvas tab strip (Track 3 / UX Polish)
 *
 * Displays open tools as inline tabs above the canvas. Each tab has:
 *  - Click → activate (parent sets activeToolId)
 *  - ✕ button → close (remove from openTools)
 *  - Active style: cyan-dim background, cyan border
 *
 * Props:
 *  @param {Array<{id:string, name:string}>} openTools - tabs in order
 *  @param {string|null} activeToolId - id of currently active tab
 *  @param {Function} onActivate - (id) => void, switch active
 *  @param {Function} onClose - (id) => void, remove tab
 *  @param {Function} [onBackToHub] - () => void, optional Hub button
 */

export default function TabBar({ openTools, activeToolId, onActivate, onClose, onBackToHub }) {
  if (!openTools || openTools.length === 0) return null;

  return (
    <div style={styles.root} role="tablist" aria-label="Ferramentas abertas">
      {onBackToHub && (
        <button
          type="button"
          onClick={onBackToHub}
          style={styles.hubBtn}
          title="Voltar ao Hub"
          aria-label="Voltar ao Hub"
        >
          ⌂ Hub
        </button>
      )}
      <div style={styles.tabs}>
        {openTools.map((tool) => {
          const active = tool.id === activeToolId;
          return (
            <div
              key={tool.id}
              role="tab"
              aria-selected={active}
              style={{
                ...styles.tab,
                ...(active ? styles.tabActive : {}),
              }}
            >
              <button
                type="button"
                onClick={() => onActivate?.(tool.id)}
                style={{
                  ...styles.tabBtn,
                  ...(active ? styles.tabBtnActive : {}),
                }}
                title={tool.name}
              >
                {tool.name}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose?.(tool.id);
                }}
                style={styles.closeBtn}
                title="Fechar aba"
                aria-label={`Fechar ${tool.name}`}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    background: "var(--card)",
    borderBottom: "1px solid var(--bdr)",
    flexShrink: 0,
    overflow: "hidden",
  },
  hubBtn: {
    padding: "5px 10px",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    background: "var(--card2)",
    color: "var(--tx3)",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    transition: "all .12s",
    flexShrink: 0,
    letterSpacing: 0.5,
  },
  tabs: {
    display: "flex",
    gap: 4,
    flex: 1,
    overflowX: "auto",
    minWidth: 0,
  },
  tab: {
    display: "flex",
    alignItems: "center",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    background: "var(--card2)",
    overflow: "hidden",
    flexShrink: 0,
    maxWidth: 220,
    transition: "all .12s",
  },
  tabActive: {
    background: "var(--cyan-dim)",
    borderColor: "rgba(14,165,233,0.45)",
  },
  tabBtn: {
    border: "none",
    background: "transparent",
    color: "var(--tx2)",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "var(--fm)",
    padding: "5px 10px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 180,
  },
  tabBtnActive: {
    color: "var(--cyan)",
    fontWeight: 700,
  },
  closeBtn: {
    border: "none",
    background: "transparent",
    color: "var(--tx3)",
    fontSize: 11,
    cursor: "pointer",
    padding: "4px 8px 4px 4px",
    lineHeight: 1,
  },
};
