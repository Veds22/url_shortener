import { C } from "../utils/theme";

export default function Toast({ message, type = "success" }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        background: type === "success" ? C.green + "22" : C.red + "22",
        border: `1px solid ${type === "success" ? C.green : C.red}55`,
        borderRadius: 10,
        padding: "12px 20px",
        color: type === "success" ? C.green : C.red,
        fontSize: 14,
        fontWeight: 600,
        zIndex: 9999,
        boxShadow: "0 8px 32px #00000066",
      }}
    >
      {type === "success" ? "✓" : "✗"} {message}
    </div>
  );
}