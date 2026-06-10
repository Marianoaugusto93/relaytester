/**
 * ArtifactList.jsx — Artifact History Strip (Track 3 / Feature 2)
 *
 * Renders the latest results published via ArtifactBus.
 * Subscribes to wildcard "*" topic in the parent (BayContextPanel) and
 * receives the array as prop. Each artifact:
 *   - Tool id badge + timestamp
 *   - 1-2 line summary (extracted from payload)
 *   - [Abrir] (re-emit) + [Descartar] buttons
 *
 * Props:
 *  @param {Array} artifacts - { topic, data, timestamp, toolId }
 *  @param {Function} onOpen - (artifact) => void
 *  @param {Function} onDiscard - (timestamp) => void
 */

import { getTool } from "../catalog.js";

const TOOL_ICONS = {
  "coordination-tcc": "🔧",
  "inrush-discrimination": "📊",
  "tc-sizing": "⚙",
  "reach-loadability": "📐",
  "differential-transformer": "🧲",
  "directional-logic": "🧭",
  "under-frequency": "📉",
  "reclosing-sequence": "🔄",
  "arc-flash": "⚡",
  "grounding-impedance": "🌍",
  "fault-calc": "💥",
  "tcc": "📈",
  "distribution": "🔌",
  "distance": "📏",
  "differential-inrush": "🧲",
  "ampacity-ct": "🔋",
  "symm-components": "🧮",
};

function formatTime(ts) {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Build a 1-2 line summary from an artifact payload.
 * Heuristic: prefer "status", "result", "outcome", "classification" or first
 * primitive value. Avoid arrays/objects on the first line.
 */
function summarize(topic, data) {
  if (!data || typeof data !== "object") return String(data ?? "");
  // Whitelist of "headline" fields commonly emitted by tools
  const headline = ["status", "outcome", "classification", "category", "label", "tripped"];
  for (const key of headline) {
    if (data[key] !== undefined && (typeof data[key] === "string" || typeof data[key] === "boolean")) {
      return `${key}: ${data[key]}`;
    }
  }
  // Numeric fields
  const numeric = ["gap", "worstGap", "energy", "boundary", "torque", "Iarc_kA", "Iground", "margin"];
  for (const key of numeric) {
    if (typeof data[key] === "number") {
      return `${key}: ${data[key].toFixed(3)}`;
    }
  }
  // Fallback: count of keys
  const keys = Object.keys(data);
  return `${keys.length} campo${keys.length === 1 ? "" : "s"}`;
}

export default function ArtifactList({ artifacts, onOpen, onDiscard }) {
  if (!artifacts || artifacts.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyTitle}>Nenhum artefato ainda</div>
        <div style={styles.emptyHint}>
          Execute uma ferramenta para ver resultados aqui. Publicações via
          ArtifactBus aparecem em ordem cronológica.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.list} role="list" aria-label="Histórico de artefatos">
      {artifacts.map((art) => {
        const tool = getTool(art.toolId);
        const name = tool?.name || art.toolId;
        const icon = TOOL_ICONS[art.toolId] || "•";
        return (
          <div key={art.timestamp + art.topic} style={styles.card} role="listitem">
            <div style={styles.head}>
              <span style={styles.icon} aria-hidden="true">{icon}</span>
              <span style={styles.name} title={name}>{name}</span>
              <span style={styles.time}>{formatTime(art.timestamp)}</span>
            </div>
            <div style={styles.summary}>{summarize(art.topic, art.data)}</div>
            <div style={styles.actions}>
              <button
                type="button"
                onClick={() => onOpen?.(art)}
                style={styles.openBtn}
                title="Abrir resultado na ferramenta ativa"
              >
                Abrir
              </button>
              <button
                type="button"
                onClick={() => onDiscard?.(art.timestamp + art.topic)}
                style={styles.discardBtn}
                title="Remover do histórico"
              >
                Descartar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  list: {
    flex: 1,
    overflow: "auto",
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    textAlign: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--tx2)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  emptyHint: {
    fontSize: 11,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
    lineHeight: 1.5,
    maxWidth: 220,
  },
  card: {
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    background: "var(--card2)",
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  head: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  icon: {
    fontSize: 13,
    flexShrink: 0,
  },
  name: {
    flex: 1,
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--fm)",
    color: "var(--tx)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  time: {
    fontSize: 10,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
    flexShrink: 0,
  },
  summary: {
    fontSize: 10,
    color: "var(--tx2)",
    fontFamily: "var(--fm)",
    lineHeight: 1.4,
    paddingLeft: 18,
    wordBreak: "break-word",
  },
  actions: {
    display: "flex",
    gap: 6,
    paddingLeft: 18,
  },
  openBtn: {
    padding: "3px 10px",
    border: "1px solid rgba(14,165,233,0.4)",
    borderRadius: 4,
    background: "var(--cyan-dim)",
    color: "var(--cyan)",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    letterSpacing: 0.5,
  },
  discardBtn: {
    padding: "3px 10px",
    border: "1px solid var(--bdr)",
    borderRadius: 4,
    background: "var(--card)",
    color: "var(--tx3)",
    fontSize: 10,
    fontWeight: 600,
    fontFamily: "var(--fh)",
    cursor: "pointer",
    letterSpacing: 0.5,
  },
};
