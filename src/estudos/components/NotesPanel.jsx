/**
 * NotesPanel.jsx — Scratchpad notes per active tool (Track 3 / Feature 4)
 *
 * Free-text textarea persisted to localStorage under
 *   estudos.notes.${activeToolId}.v1
 * Auto-saves after 500 ms debounce. Shows "Salvo às hh:mm" hint.
 *
 * Props:
 *  @param {string|null} activeToolId - tool the notes belong to; null disables editing
 *  @param {string|null} activeToolName - display label for the heading
 */

import { useEffect, useRef, useState } from "react";

function storageKey(toolId) {
  return `estudos.notes.${toolId}.v1`;
}

function formatTime(ts) {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function NotesPanel({ activeToolId, activeToolName }) {
  const [text, setText] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const debounceRef = useRef(null);

  // Load notes when activeToolId changes
  useEffect(() => {
    if (!activeToolId) {
      setText("");
      setSavedAt(null);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(activeToolId));
      setText(raw || "");
      setSavedAt(null);
    } catch {
      setText("");
    }
  }, [activeToolId]);

  // Debounced auto-save
  useEffect(() => {
    if (!activeToolId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey(activeToolId), text);
        setSavedAt(Date.now());
      } catch {
        /* quota exceeded */
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, activeToolId]);

  if (!activeToolId) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyTitle}>Sem ferramenta ativa</div>
        <div style={styles.emptyHint}>
          Abra uma ferramenta para começar a escrever notas. As anotações são
          salvas localmente por ferramenta.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.head}>
        <div style={styles.heading}>Notas para</div>
        <div style={styles.toolName} title={activeToolName || activeToolId}>
          {activeToolName || activeToolId}
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escreva observações, ajustes a testar, dúvidas… (suporta *negrito*, `código`, - listas)"
        style={styles.textarea}
        aria-label={`Notas para ${activeToolName || activeToolId}`}
      />
      <div style={styles.footer}>
        {savedAt ? (
          <span style={styles.saved}>✓ Salvo às {formatTime(savedAt)}</span>
        ) : (
          <span style={styles.hint}>Auto-save ativo (500 ms)</span>
        )}
      </div>
    </div>
  );
}

const styles = {
  root: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: 10,
    gap: 8,
    minHeight: 0,
  },
  head: {
    flexShrink: 0,
  },
  heading: {
    fontSize: 9,
    fontWeight: 700,
    fontFamily: "var(--fh)",
    color: "var(--tx3)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  toolName: {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--fm)",
    color: "var(--cyan)",
    marginTop: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  textarea: {
    flex: 1,
    minHeight: 200,
    padding: "8px 10px",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    background: "var(--card2)",
    color: "var(--tx)",
    fontSize: 12,
    fontFamily: "var(--fm)",
    boxSizing: "border-box",
    resize: "vertical",
    outline: "none",
    lineHeight: 1.5,
  },
  footer: {
    fontSize: 10,
    color: "var(--tx3)",
    fontFamily: "var(--fm)",
    flexShrink: 0,
  },
  saved: {
    color: "#22c55e",
    fontWeight: 600,
  },
  hint: {
    color: "var(--tx3)",
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
};
