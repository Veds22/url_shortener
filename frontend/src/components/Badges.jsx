import { C } from "../utils/theme";

export function StatusBadge({ status }) {
  const map = { active: C.green, disabled: C.red, expired: C.gray };
  const color = map[status] || C.gray;
  return (
    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: color + "22", color, border: `1px solid ${color}44` }}>
      {status}
    </span>
  );
}

export function TierBadge({ tier }) {
  const map = { free: C.free, pro: C.pro, premium: C.premium, admin: C.admin };
  const color = map[tier] || C.free;
  return (
    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: color + "33", color, border: `1px solid ${color}55` }}>
      {tier}
    </span>
  );
}