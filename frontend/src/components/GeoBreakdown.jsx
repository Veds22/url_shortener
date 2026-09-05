import { C } from "../utils/theme";

// Turns a 2-letter ISO country code into its flag emoji using the Unicode
// regional indicator symbol trick (each letter A-Z maps to a regional
// indicator codepoint, and two of them combined render as that country's
// flag in virtually every modern OS/browser) — no country-name lookup
// table or extra dependency needed.
function flagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const codePoints = [...countryCode.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default function GeoBreakdown({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: C.textMuted, fontSize: 13 }}>
        No geo data yet
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.clicks));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((row) => {
        const label = row.country_code || "Unknown";
        const pct = (row.clicks / max) * 100;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, fontSize: 16, flexShrink: 0, textAlign: "center" }}>
              {row.country_code ? flagEmoji(row.country_code) : "❔"}
            </div>
            <div style={{ width: 48, fontSize: 12, color: C.textDim, fontWeight: 700, flexShrink: 0 }}>
              {label}
            </div>
            <div style={{ flex: 1, background: C.bgInput, borderRadius: 4, height: 8, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: C.teal, borderRadius: 4 }} />
            </div>
            <div style={{ width: 32, fontSize: 12, color: C.text, fontWeight: 700, textAlign: "right", flexShrink: 0 }}>
              {row.clicks}
            </div>
          </div>
        );
      })}
    </div>
  );
}