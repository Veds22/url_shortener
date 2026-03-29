import { C } from "../utils/theme";

const variants = {
  primary: { background: C.teal, color: "#080d1a", border: "none" },
  secondary: { background: "transparent", color: C.teal, border: `1px solid ${C.teal}` },
  danger: { background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440" },
  ghost: { background: "transparent", color: C.textDim, border: `1px solid ${C.border}` },
  success: { background: "#10b98120", color: "#10b981", border: "1px solid #10b98140" },
};

export default function Btn({ children, onClick, variant = "primary", style = {}, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.opacity = "0.82"; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.opacity = "1"; }}
      style={{
        ...variants[variant],
        borderRadius: 8,
        padding: "9px 18px",
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
        transition: "opacity 0.15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}