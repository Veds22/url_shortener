import { C } from "../utils/theme";

export default function Card({ children, style = {}, onMouseEnter, onMouseLeave }) {
  return (
    <div
      style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, ...style }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}