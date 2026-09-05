import { useState, useEffect } from "react";
import { C } from "../utils/theme";
import { shortUrl } from "../utils/url";
import Navbar from "../components/Navbar";
import Btn from "../components/Btn";
import Card from "../components/Card";
import Toast from "../components/Toast";
import QRModal from "../components/QRModal";
import { StatusBadge } from "../components/Badges";
import ClickChart from "../components/ClickChart";
import GeoBreakdown from "../components/GeoBreakdown";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import { analyticsApi, linksApi } from "../services/api";

const RANGE_OPTIONS = [7, 14, 30];

export default function AnalyticsPage({ onNavigate, code }) {
  const { user } = useAuth();
  const { toast, showToast } = useToast();
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [range, setRange] = useState(7);
  const [timeseries, setTimeseries] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analyticsApi.get(code)
      .then(setLink)
      .catch((err) => showToast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    setChartLoading(true);
    Promise.all([
      analyticsApi.timeseries(code, range),
      analyticsApi.geo(code),
    ])
      .then(([ts, geo]) => {
        setTimeseries(ts);
        setGeoData(geo);
      })
      .catch(() => {
        // Non-fatal — the main link summary above already loaded, so
        // just leave the charts empty rather than blocking the page.
        setTimeseries(null);
        setGeoData(null);
      })
      .finally(() => setChartLoading(false));
  }, [code, range]);

  const toggleStatus = async () => {
    if (!link || toggling) return;
    setToggling(true);
    try {
      if (link.status === "active") {
        await linksApi.disable(code);
        setLink((l) => ({ ...l, status: "disabled" }));
        showToast("Link disabled");
      } else {
        await linksApi.enable(code);
        setLink((l) => ({ ...l, status: "active" }));
        showToast("Link enabled");
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setToggling(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar onNavigate={onNavigate} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: C.textMuted, fontSize: 14 }}>
        Loading analytics...
      </div>
    </div>
  );

  // ── Not found state ───────────────────────────────────────────────────────
  if (!link) return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar onNavigate={onNavigate} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 36 }}>🔗</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Link not found</div>
        <div style={{ color: C.textMuted, fontSize: 13 }}>You may not have access to this link's analytics</div>
        <Btn variant="ghost" style={{ marginTop: 8 }} onClick={() => onNavigate("/me")}>← Back to My Links</Btn>
      </div>
    </div>
  );

  const status = link.status || "active";
  const fullShortUrl = shortUrl(code);

  // Format dates from ISO strings
  const formatDate = (iso) => {
    if (!iso) return "Never";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar onNavigate={onNavigate} />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 32px" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, color: C.textMuted }}>
          <button onClick={() => onNavigate("/me")}
            style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0, fontWeight: 600 }}>
            My Links
          </button>
          <span>›</span>
          <span style={{ fontFamily: "monospace", color: C.textDim }}>{fullShortUrl}</span>
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, fontFamily: "monospace", color: C.teal }}>
                {fullShortUrl}
              </h1>
              <StatusBadge status={status} />
            </div>
            <div style={{ fontSize: 14, color: C.textDim, display: "flex", alignItems: "center", gap: 8 }}>
              <span>→</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}>
                {link.original_url}
              </span>
              <button
                onClick={() => { navigator.clipboard?.writeText(link.original_url); showToast("Original URL copied!"); }}
                style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: 0, flexShrink: 0 }}
              >
                copy
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <Btn
              variant="ghost"
              style={{ padding: "8px 16px", fontSize: 13 }}
              onClick={() => { navigator.clipboard?.writeText(fullShortUrl); showToast("Short URL copied!"); }}
            >
              Copy Link
            </Btn>
            <Btn
              variant="ghost"
              style={{ padding: "8px 16px", fontSize: 13 }}
              onClick={() => setQrOpen(true)}
            >
              QR Code
            </Btn>
            {status !== "expired" && (
              <Btn
                variant={status === "active" ? "danger" : "success"}
                style={{ padding: "8px 16px", fontSize: 13 }}
                onClick={toggleStatus}
                disabled={toggling}
              >
                {toggling ? "..." : status === "active" ? "Disable" : "Enable"}
              </Btn>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Clicks", value: (link.clicks || 0).toLocaleString(), color: C.teal, big: true },
            { label: "Created", value: formatDate(link.created_at), color: C.text },
            { label: "Expires", value: formatDate(link.expires_at), color: status === "expired" ? C.red : C.text },
            { label: "Avg / Day", value: link.clicks && link.created_at
                ? Math.max(1, Math.round(link.clicks / Math.max(1, Math.ceil((Date.now() - new Date(link.created_at)) / 86400000))))
                : 0,
              color: C.green },
          ].map(({ label, value, color, big }) => (
            <Card key={label} style={{ padding: "20px 22px" }}>
              <div style={{ fontSize: big ? 36 : 18, fontWeight: 900, color, lineHeight: 1, wordBreak: "break-word" }}>{value}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
            </Card>
          ))}
        </div>

        {/* Click trend chart */}
        <Card style={{ padding: "28px", border: `1px solid ${C.border}`, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Clicks Over Time
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {RANGE_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{
                    background: range === r ? C.tealDim : "none",
                    border: `1px solid ${range === r ? C.teal : C.border}`,
                    color: range === r ? C.teal : C.textMuted,
                    borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {r}d
                </button>
              ))}
            </div>
          </div>
          {chartLoading ? (
            <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 13 }}>
              Loading chart...
            </div>
          ) : (
            <ClickChart data={timeseries?.data} />
          )}
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 12, lineHeight: 1.6 }}>
            Chart and country data update on an hourly cycle, so they may run up to an hour behind the live total-clicks count above.
          </div>
        </Card>

        {/* Geo breakdown + coming-soon notice side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card style={{ padding: "28px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              Clicks by Country
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 18 }}>
              Updates hourly — may be up to an hour behind
            </div>
            {chartLoading ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: C.textMuted, fontSize: 13 }}>Loading...</div>
            ) : (
              <GeoBreakdown data={geoData?.data} />
            )}
          </Card>

          <Card style={{ padding: "28px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Coming Soon
            </div>
            <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.8, margin: "0 0 16px" }}>
              Referrer and device-type breakdowns aren't captured yet — they'd need the redirect endpoint to log the <code style={{ background: C.bgInput, padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>Referer</code> and <code style={{ background: C.bgInput, padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>User-Agent</code> headers per click, similar to how geo data is captured today.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Top referrers", "Device types"].map((f) => (
                <span key={f} style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: C.textDim, fontWeight: 600 }}>
                  {f}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {qrOpen && (
        <QRModal
          url={fullShortUrl}
          shortCode={code}
          onClose={() => setQrOpen(false)}
        />
      )}
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}