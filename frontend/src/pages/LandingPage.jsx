import { useState } from "react";
import { C } from "../utils/theme";
import Navbar from "../components/Navbar";
import Btn from "../components/Btn";
import Input from "../components/Input";
import Card from "../components/Card";
import Toast from "../components/Toast";
import QRModal from "../components/QRModal";
import { TierBadge } from "../components/Badges";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import { linksApi } from "../services/api";

export default function LandingPage({ onNavigate }) {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expiry, setExpiry] = useState("");
  const [gotoValue, setGotoValue] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [result, setResult] = useState(null);
  const [qrLink, setQrLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast, showToast } = useToast();

  const shorten = async () => {
    if (!url) { showToast("Please enter a URL", "error"); return; }
    setLoading(true);
    try {
      // backend returns { id, original_url, short_code, short_url, created_at, expires_at }
      // short_url is already the full URL from backend (e.g. http://localhost:8000/abc)
      const data = await linksApi.shorten(
        url,
        customCode || null,
        expiry || null
      );
      setResult(data);
      setUrl("");
      setCustomCode("");
      setExpiry("");
      showToast("Short link created!");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const goTo = () => {
    const value = gotoValue.trim();
    if (!value) {
      showToast("Please enter a short code or URL", "error");
      return;
    }

    let code = value;
    try {
      if (value.includes("://")) {
        const urlObj = new URL(value);
        const parts = urlObj.pathname.split("/").filter(Boolean);
        code = parts[parts.length - 1] || "";
      } else if (value.includes("/")) {
        const parts = value.split("/").filter(Boolean);
        code = parts[parts.length - 1] || "";
      }
    } catch (_e) {
      // If URL parsing fails, fall back to treating input as the code
    }

    if (!code) {
      showToast("Could not extract short code", "error");
      return;
    }

    setGotoValue("");
    // First navigate to SPA RedirectPage, which will handle timed redirect
    onNavigate(`/${code}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "96px 48px 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${C.teal}18, transparent)`, pointerEvents: "none" }} />
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", color: C.teal, textTransform: "uppercase", marginBottom: 18 }}>
          Fast · Reliable · Trackable
        </div>
        <h1 style={{ fontSize: 60, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 20px", lineHeight: 1.05 }}>
          SHORTEN. SHARE.<br /><span style={{ color: C.teal }}>TRACK.</span>
        </h1>
        <p style={{ color: C.textDim, fontSize: 17, maxWidth: 480, margin: "0 auto 48px", lineHeight: 1.7 }}>
          Create short links, generate QR codes, and track every click — all from one clean dashboard.
        </p>

        {/* Shortener box */}
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <Card style={{ padding: 24, border: `1px solid ${C.teal}33` }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <Input
                placeholder="Paste your long URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                style={{ fontSize: 15 }}
              />
              <Btn
                style={{ padding: "10px 28px", fontSize: 14, flexShrink: 0 }}
                onClick={shorten}
                disabled={loading}
              >
                {loading ? "..." : "Shorten!"}
              </Btn>
            </div>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ background: "none", border: "none", color: C.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
            >
              {showAdvanced ? "▲ Hide options" : "▼ Custom code & expiry"}
            </button>

            {showAdvanced && (
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={smallLabel}>Custom code</label>
                  <Input
                    placeholder="mycode"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={smallLabel}>Expiry date</label>
                  <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} style={{ colorScheme: "dark" }} />
                </div>
              </div>
            )}

            {/* Result — uses short_url from backend directly */}
            {result && (
              <div style={{ marginTop: 16, background: C.bgInput, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.teal}33`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.teal, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    ⚡ {result.short_url}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {result.original_url}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Btn
                    variant="secondary"
                    style={{ padding: "6px 14px", fontSize: 12 }}
                    onClick={() => { navigator.clipboard?.writeText(result.short_url); showToast("Copied!"); }}
                  >
                    Copy
                  </Btn>
                  <Btn
                    variant="ghost"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                    onClick={() => setQrLink(result)}
                  >
                    QR
                  </Btn>
                  {user && (
                    <Btn
                      variant="ghost"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                      onClick={() => onNavigate(`/analytics/${result.short_code}`)}
                    >
                      Analytics
                    </Btn>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Go to existing short link */}
          <div style={{ marginTop: 18 }}>
            <Card style={{ padding: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ ...smallLabel, marginBottom: 4 }}>Go to short link</span>
                <div style={{ fontSize: 12, color: C.textMuted }}>
                  Enter a short code (e.g. <strong>abc123</strong>) or full short URL and jump to it.
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Input
                  placeholder="abc123 or https://sho.rt/abc123"
                  value={gotoValue}
                  onChange={(e) => setGotoValue(e.target.value)}
                  style={{ fontSize: 14 }}
                />
                <Btn
                  style={{ padding: "9px 18px", fontSize: 13, flexShrink: 0 }}
                  onClick={goTo}
                >
                  Go to
                </Btn>
              </div>
            </Card>
          </div>

          {!user && (
            <p style={{ color: C.textMuted, fontSize: 13, marginTop: 14 }}>
              <button onClick={() => onNavigate("/login")} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}>
                Sign in
              </button>
              {" "}to save links, set custom codes, and track analytics.
            </p>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: C.bgCard, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "22px 48px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 80 }}>
          {[["2.4M+", "Links Created"], ["48M+", "Clicks Tracked"], ["99.9%", "Uptime"], ["150+", "Countries"]].map(([val, label]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.teal }}>{val}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: "72px 48px", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: C.textMuted, textTransform: "uppercase", marginBottom: 48 }}>HOW IT WORKS</div>
        <div style={{ display: "flex", justifyContent: "center", maxWidth: 700, margin: "0 auto" }}>
          {[
            { icon: "📋", step: "1. Paste URL", desc: "Drop your long URL into the box above" },
            { icon: "✂️", step: "2. Get Short Link", desc: "We generate a short code instantly" },
            { icon: "✈️", step: "3. Share & Track", desc: "Share everywhere and watch analytics grow" },
          ].map(({ icon, step, desc }) => (
            <div key={step} style={{ flex: 1, padding: "0 28px" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{step}</div>
              <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={{ padding: "72px 48px", borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: C.textMuted, textTransform: "uppercase", marginBottom: 48 }}>PRICING</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
          {[
            { name: "Free", color: C.free, icon: "🆓", price: "Free Forever", features: ["1 active link", "7 day expiry", "Basic analytics", "QR generation"] },
            { name: "Pro", color: C.pro, icon: "⚡", price: "$12/mo", features: ["10 active links", "90 day expiry", "Full analytics", "Custom codes"] },
            { name: "Premium", color: C.premium, icon: "👑", price: "$29/mo", features: ["Unlimited links", "No expiry limit", "Advanced analytics", "API access"] },
          ].map(({ name, color, icon, price, features }) => (
            <div key={name} style={{ background: C.bgCard, border: `1px solid ${color}44`, borderRadius: 16, padding: "28px", width: 220, textAlign: "left", boxShadow: `0 0 32px ${color}11` }}>
              <div style={{ fontSize: 30, marginBottom: 12 }}>{icon}</div>
              <TierBadge tier={name.toLowerCase()} />
              <div style={{ fontSize: 24, fontWeight: 900, margin: "14px 0 4px" }}>
                {price.split("/")[0]}
                <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 400 }}>{price.includes("/") ? "/mo" : ""}</span>
              </div>
              <div style={{ height: 1, background: C.border, margin: "14px 0" }} />
              {features.map((f) => (
                <div key={f} style={{ fontSize: 13, color: C.textDim, display: "flex", gap: 8, marginBottom: 8 }}>
                  <span style={{ color }}>✓</span>{f}
                </div>
              ))}
              <Btn style={{ marginTop: 16, width: "100%", padding: "9px 0" }} onClick={() => onNavigate("/signup")}>Get Started</Btn>
            </div>
          ))}
        </div>
      </div>

      {/* QR uses short_url from backend response directly */}
      {qrLink && (
        <QRModal
          url={qrLink.short_url}
          shortCode={qrLink.short_code}
          onClose={() => setQrLink(null)}
        />
      )}
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}

const smallLabel = {
  fontSize: 11, color: C.textMuted, fontWeight: 600,
  display: "block", marginBottom: 5,
  textTransform: "uppercase", letterSpacing: "0.06em",
};