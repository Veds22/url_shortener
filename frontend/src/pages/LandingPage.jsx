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

const TESTIMONIALS = [
  { quote: "LinkSnip cut our marketing link chaos in half. Clean dashboard, instant QR codes — we use it every day.", name: "Sara Gupta", role: "Growth Lead", company: "PixelWave", initials: "SG", color: "#00d4b8" },
  { quote: "The QR code feature alone is worth it. We slap them on flyers and track every scan in real time.", name: "Miguel Hernandez", role: "Founder", company: "Café Norte", initials: "MH", color: "#8b5cf6" },
  { quote: "Finally a link shortener that doesn't make me feel like I'm using a tool from 2010.", name: "Emily Chen", role: "Product Manager", company: "Nimbus", initials: "EC", color: "#3b82f6" },
  { quote: "We create hundreds of campaign links a month. Custom codes and expiry dates keep everything sane.", name: "James Lee", role: "Marketing Ops", company: "Aurora Labs", initials: "JL", color: "#f59e0b" },
  { quote: "Switched from Bitly. The analytics are simpler and the free tier is genuinely useful.", name: "Priya Nair", role: "Indie Maker", company: "Buildspace", initials: "PN", color: "#10b981" },
  { quote: "Set up in 2 minutes, my team was sharing branded short links within the hour.", name: "Tom Bakker", role: "CTO", company: "Foldspace", initials: "TB", color: "#ef4444" },
];

const FOOTER_LINKS = {
  Product: ["Features", "Pricing", "Changelog", "Roadmap"],
  Developers: ["API Docs", "GitHub", "Status Page"],
  Company: ["About", "Blog", "Privacy Policy", "Terms of Service"],
};

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

  const scrollToSection = (id) => {
    const el = typeof document !== "undefined" ? document.getElementById(id) : null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const shorten = async () => {
    if (!url) { showToast("Please enter a URL", "error"); return; }
    setLoading(true);
    try {
      const data = await linksApi.shorten(url, customCode || null, expiry ? new Date(expiry).toISOString() : null);
      setResult(data);
      setUrl(""); setCustomCode(""); setExpiry("");
      showToast("Short link created!");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const goTo = () => {
    const value = gotoValue.trim();
    if (!value) { showToast("Please enter a short code or URL", "error"); return; }
    let code = value;
    try {
      if (value.includes("://")) {
        const parts = new URL(value).pathname.split("/").filter(Boolean);
        code = parts[parts.length - 1] || "";
      } else if (value.includes("/")) {
        const parts = value.split("/").filter(Boolean);
        code = parts[parts.length - 1] || "";
      }
    } catch (_) {}
    if (!code) { showToast("Could not extract short code", "error"); return; }
    setGotoValue("");
    onNavigate(`/${code}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "112px 48px 96px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${C.teal}18, transparent)`, pointerEvents: "none" }} />
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", color: C.teal, textTransform: "uppercase", marginBottom: 20 }}>
          Fast · Reliable · Trackable
        </div>
        <h1 style={{ fontSize: 68, fontWeight: 900, letterSpacing: "-0.05em", margin: "0 0 24px", lineHeight: 1.03 }}>
          SHORTEN. SHARE.<br /><span style={{ color: C.teal }}>TRACK.</span>
        </h1>
        <p style={{ color: C.textDim, fontSize: 18, maxWidth: 540, margin: "0 auto 56px", lineHeight: 1.8 }}>
          Create short links, generate QR codes, and track every click 
        </p>

        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <Card style={{ padding: 24, border: `1px solid ${C.teal}33` }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <Input placeholder="Paste your long URL here..." value={url} onChange={(e) => setUrl(e.target.value)} style={{ fontSize: 15 }} />
              <Btn style={{ padding: "10px 28px", fontSize: 14, flexShrink: 0 }} onClick={shorten} disabled={loading}>
                {loading ? "..." : "Shorten!"}
              </Btn>
            </div>

            <button onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ background: "none", border: "none", color: C.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
              {showAdvanced ? "▲ Hide options" : "▼ Custom code & expiry"}
            </button>

            {showAdvanced && (
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={smallLabel}>Custom code</label>
                  <Input placeholder="mycode" value={customCode} onChange={(e) => setCustomCode(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={smallLabel}>Expiry date</label>
                  <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} style={{ colorScheme: "dark" }} />
                </div>
              </div>
            )}

            {result && (
              <div style={{ marginTop: 16, background: C.bgInput, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.teal}33`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.teal, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>⚡ {result.short_url}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{result.original_url}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Btn variant="secondary" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => { navigator.clipboard?.writeText(result.short_url); showToast("Copied!"); }}>Copy</Btn>
                  <Btn variant="ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setQrLink(result)}>QR</Btn>
                  {user && <Btn variant="ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => onNavigate(`/analytics/${result.short_code}`)}>Analytics</Btn>}
                </div>
              </div>
            )}
          </Card>

          <div style={{ marginTop: 18 }}>
            <Card style={{ padding: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ ...smallLabel, marginBottom: 4 }}>Go to short link</span>
                <div style={{ fontSize: 12, color: C.textMuted }}>Enter a short code or full short URL to jump to it.</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Input placeholder="abc123 or https://sho.rt/abc123" value={gotoValue} onChange={(e) => setGotoValue(e.target.value)} style={{ fontSize: 14 }} />
                <Btn style={{ padding: "9px 18px", fontSize: 13, flexShrink: 0 }} onClick={goTo}>Go →</Btn>
              </div>
            </Card>
          </div>

          {!user && (
            <p style={{ color: C.textMuted, fontSize: 13, marginTop: 14 }}>
              <button onClick={() => onNavigate("/login")} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}>Sign in</button>
              {" "}to save links, set custom codes, and track analytics.
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div id="stats" style={{ background: C.bgCard, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "22px 48px" }}>
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
      <div id="how-it-works" style={{ padding: "72px 48px", textAlign: "center" }}>
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
              <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" style={{ padding: "72px 48px", borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
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
                {price.split("/")[0]}<span style={{ fontSize: 13, color: C.textMuted, fontWeight: 400 }}>{price.includes("/") ? "/mo" : ""}</span>
              </div>
              <div style={{ height: 1, background: C.border, margin: "14px 0" }} />
              {features.map((f) => (
                <div key={f} style={{ fontSize: 14, color: C.textDim, display: "flex", gap: 8, marginBottom: 8 }}>
                  <span style={{ color }}>✓</span>{f}
                </div>
              ))}
              <Btn style={{ marginTop: 16, width: "100%", padding: "9px 0" }} onClick={() => onNavigate("/signup")}>Get Started</Btn>
            </div>
          ))}
        </div>
      </div>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <div id="testimonials" style={{ padding: "80px 48px", borderTop: `1px solid ${C.border}`, background: C.bgCard }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: C.teal, textTransform: "uppercase", marginBottom: 12 }}>Testimonials</div>
          <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>Trusted by teams who move fast</h2>
            <p style={{ color: C.textDim, fontSize: 16, marginTop: 12 }}>Here's what people building with LinkSnip have to say.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 1000, margin: "0 auto" }}>
          {TESTIMONIALS.map(({ quote, name, role, company, initials, color }) => (
            <div key={name} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Stars */}
              <div style={{ display: "flex", gap: 3 }}>
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={C.premium}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </div>

              {/* Quote */}
              <p style={{ fontSize: 15, color: C.textDim, lineHeight: 1.75, margin: 0, flex: 1 }}>"{quote}"</p>

              {/* Author */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: color + "33", border: `1px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color, flexShrink: 0 }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>{role}, {company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <div id="cta" style={{ padding: "72px 48px", textAlign: "center", borderTop: `1px solid ${C.border}`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 80% at 50% 50%, ${C.teal}0d, transparent)`, pointerEvents: "none" }} />
        <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
          Ready to shorten smarter?
        </h2>
        <p style={{ color: C.textDim, fontSize: 16, margin: "0 0 32px" }}>
           Free to start. No credit card required.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <Btn style={{ padding: "12px 32px", fontSize: 15 }} onClick={() => onNavigate("/signup")}>Get Started Free</Btn>
          <Btn variant="secondary" style={{ padding: "12px 32px", fontSize: 15 }} onClick={() => onNavigate("/login")}>Login</Btn>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, background: C.bgCard, padding: "48px 64px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }}>

          {/* Brand column */}
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.teal, letterSpacing: "-0.03em", marginBottom: 12 }}>⚡ LinkSnip</div>
            <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.8, margin: "0 0 20px", maxWidth: 260 }}>
              Short links, QR codes, and click analytics — built for teams and makers who move fast.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { label: "GitHub", iconId: "github-icon", fallback: "GH", href: "https://github.com/Veds22" },
                { label: "LinkedIn", iconId: "social-icon", fallback: "IN", href: "https://www.linkedin.com/in/vedant-srivastava-b21472291/" },
              ].map(({ label, iconId, fallback, href }) => (
                <a
                  key={label}
                  href={href}
                  title={label}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: C.bgInput,
                    border: `1px solid ${C.border}`,
                    color: C.textDim,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                  }}
                >
                  <svg width="18" height="18" aria-hidden="true" focusable="false">
                    <use href={`/icons.svg#${iconId}`} />
                  </svg>
                  <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 }}>{fallback}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>{heading}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map((link) => (
                  <button
                    key={link}
                    style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: 0, transition: "color 0.15s" }}
                    onClick={() => {
                      switch (link) {
                        case "Features":
                          scrollToSection("how-it-works");
                          break;
                        case "Pricing":
                          scrollToSection("pricing");
                          break;
                        case "Changelog":
                        case "Roadmap":
                        case "API Docs":
                        case "Status Page":
                        case "About":
                        case "Blog":
                        case "Privacy Policy":
                        case "Terms of Service":
                          onNavigate("/docs");
                          break;
                        case "GitHub":
                          if (typeof window !== "undefined") {
                            window.open("https://github.com/Veds22", "_blank", "noopener,noreferrer");
                          }
                          break;
                        default:
                          break;
                      }
                    }}
                    onMouseEnter={(e) => { e.target.style.color = C.text; }}
                    onMouseLeave={(e) => { e.target.style.color = C.textMuted; }}
                  >
                    {link}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>
            © {new Date().getFullYear()} LinkSnip. All rights reserved.
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item) => (
              <button key={item} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </footer>

      {qrLink && <QRModal url={qrLink.short_url} shortCode={qrLink.short_code} onClose={() => setQrLink(null)} />}
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}

const smallLabel = {
  fontSize: 13, color: C.textMuted, fontWeight: 600,
  display: "block", marginBottom: 5,
  textTransform: "uppercase", letterSpacing: "0.06em",
};