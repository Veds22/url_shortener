import { C } from "../utils/theme";

export default function Input({ placeholder, value, onChange, type = "text", style = {} }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={(e) => (e.target.style.borderColor = C.teal)}
      onBlur={(e) => (e.target.style.borderColor = C.border)}
      style={{
        background: C.bgInput,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "10px 14px",
        color: C.text,
        fontSize: 14,
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "inherit",
        transition: "border 0.2s",
        ...style,
      }}
    />
  );
}