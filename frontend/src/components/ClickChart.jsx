import { C } from "../utils/theme";

// A small, dependency-free bar chart. The app doesn't use any chart
// library (everything here is hand-rolled SVG/inline styles), so this
// matches that pattern rather than pulling in recharts for one feature.
export default function ClickChart({ data, height = 160 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 13 }}>
        No click data yet
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.clicks));
  const barCount = data.length;

  // Each bar gets an equal-width "slot" (100 / barCount), and occupies a
  // fixed proportion of that slot — this scales correctly for any bar
  // count (7, 14, 30, ...) without ever exceeding the 0-100 viewBox,
  // unlike a fixed-unit gap which only balanced out at exactly 7 bars.
  const slotWidth = 100 / barCount;
  const barWidth = slotWidth * 0.6;
  const barOffset = (slotWidth - barWidth) / 2;

  // Avoid crowding the x-axis with labels when there are many days —
  // show at most ~8 labels regardless of range.
  const labelEvery = Math.max(1, Math.ceil(barCount / 8));

  const formatLabel = (isoDate) => {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} preserveAspectRatio="none">
        {data.map((d, i) => {
          const barHeight = (d.clicks / max) * (height - 24);
          const x = i * slotWidth + barOffset;
          const y = height - 24 - barHeight;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, d.clicks > 0 ? 2 : 0)}
                rx={1.5}
                fill={d.clicks > 0 ? C.teal : C.border}
                opacity={d.clicks > 0 ? 1 : 0.5}
              >
                <title>{`${formatLabel(d.date)}: ${d.clicks} click${d.clicks === 1 ? "" : "s"}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", marginTop: 8 }}>
        {data.map((d, i) => {
          const barWidthPct = 100 / barCount;
          return (
            <div key={d.date} style={{ width: `${barWidthPct}%`, textAlign: "center", fontSize: 10, color: C.textMuted, fontWeight: 600 }}>
              {i % labelEvery === 0 ? formatLabel(d.date) : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}