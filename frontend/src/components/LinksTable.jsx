import { C } from "../utils/theme";
import { StatusBadge } from "./Badges";
import { shortUrl } from "../utils/url";

// Backend field names from PaginatedLinks response:
// { id, short_code, original_url, clicks, status, created_at, expires_at }

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function LinksTable({ links, onAnalytics, onQR, onCopy, onToggleStatus }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bgInput }}>
          {["Short Code", "Original URL", "Status", "Clicks", "Created", "Expires", "Actions"].map((h) => (
            <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: C.textMuted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {links.map((link, i) => (
          <tr
            key={link.id}
            style={{ borderBottom: i < links.length - 1 ? `1px solid ${C.border}` : "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.bgHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <td style={{ padding: "12px 16px" }}>
              <span
                style={{ color: C.teal, fontWeight: 700, cursor: "pointer", fontFamily: "monospace", fontSize: 12 }}
                onClick={() => onAnalytics(link.short_code)}
              >
                {shortUrl(link.short_code)}
              </span>
            </td>
            <td
              style={{ padding: "12px 16px", color: C.textDim, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              title={link.original_url}
            >
              {link.original_url}
            </td>
            <td style={{ padding: "12px 16px" }}>
              <StatusBadge status={link.status} />
            </td>
            <td style={{ padding: "12px 16px", fontWeight: 700 }}>{link.clicks ?? 0}</td>
            {/* Use created_at / expires_at from backend — format from ISO string */}
            <td style={{ padding: "12px 16px", color: C.textMuted, fontSize: 12 }}>
              {formatDate(link.created_at)}
            </td>
            <td style={{ padding: "12px 16px", color: link.status === "expired" ? C.red : C.textMuted, fontSize: 12 }}>
              {formatDate(link.expires_at)}
            </td>
            <td style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 5 }}>
                <ActionBtn color={C.teal} onClick={() => onAnalytics(link.short_code)}>Analytics</ActionBtn>
                <ActionBtn color={C.pro} onClick={() => onQR(link)}>QR</ActionBtn>
                <ActionBtn color={C.textDim} onClick={() => onCopy(link.short_code)}>Copy</ActionBtn>
                {link.status !== "expired" && (
                  <ActionBtn
                    color={link.status === "active" ? C.red : C.green}
                    onClick={() => onToggleStatus(link.id, link.status)}
                  >
                    {link.status === "active" ? "Disable" : "Enable"}
                  </ActionBtn>
                )}
              </div>
            </td>
          </tr>
        ))}
        {links.length === 0 && (
          <tr>
            <td colSpan={7} style={{ padding: "56px", textAlign: "center", color: C.textMuted }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔗</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No links found</div>
              <div style={{ fontSize: 13 }}>Create your first short link to get started</div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function ActionBtn({ children, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: color + "18",
        border: `1px solid ${color}33`,
        borderRadius: 6,
        padding: "4px 9px",
        color,
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}