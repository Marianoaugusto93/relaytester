/**
 * StatusBadge.jsx — Tool availability badge
 *
 * Replaces legacy "Sprint N" badges with semantic status:
 *  - stable  → "Disponível" (green)
 *  - beta    → "Beta" (yellow)
 *  - planned → "Planejado" (gray)
 */

const VARIANTS = {
  stable: {
    label: "Disponível",
    bg: "rgba(34,197,94,0.12)",
    color: "#22c55e",
    border: "rgba(34,197,94,0.25)",
  },
  beta: {
    label: "Beta",
    bg: "rgba(234,179,8,0.12)",
    color: "#eab308",
    border: "rgba(234,179,8,0.25)",
  },
  planned: {
    label: "Planejado",
    bg: "rgba(107,114,128,0.12)",
    color: "var(--tx3)",
    border: "rgba(107,114,128,0.25)",
  },
};

export default function StatusBadge({ status = "stable", size = "md" }) {
  const variant = VARIANTS[status] || VARIANTS.stable;
  const sizing = size === "sm" ? sizes.sm : sizes.md;

  return (
    <div
      style={{
        ...sizing,
        background: variant.bg,
        color: variant.color,
        border: `1px solid ${variant.border}`,
        ...baseStyle,
      }}
      aria-label={`Status: ${variant.label}`}
    >
      {variant.label}
    </div>
  );
}

const baseStyle = {
  borderRadius: 4,
  fontWeight: 700,
  fontFamily: "var(--fh)",
  textAlign: "center",
  letterSpacing: 0.5,
  display: "inline-block",
};

const sizes = {
  sm: {
    padding: "2px 6px",
    fontSize: 9,
  },
  md: {
    padding: "4px 8px",
    fontSize: 10,
  },
};
