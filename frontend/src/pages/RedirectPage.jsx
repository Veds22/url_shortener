import { useState, useEffect } from "react";
import { C } from "../utils/theme";
import { shortUrl } from "../utils/url";
import Btn from "../components/Btn";
import { publicLinksApi, redirectApi } from "../services/api";

// NOTE: In production this page is never reached — FastAPI handles
// GET /{short_code} and issues a real HTTP 307 redirect before React loads.
// This only exists for local dev SPA navigation.

export default function RedirectPage({ onNavigate, code }) {
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    setLoading(true);
    publicLinksApi.resolve(code)
      .then((data) => {
        setLink(data);
        setCountdown(3);
      })
      .catch(() => {
        setLink(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code]);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          // After countdown, trigger real backend redirect
          redirectApi.get(code);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [link]);

  const center = {
    minHeight: "100vh", background: C.bg, color: C.text,
    fontFamily: "'DM Sans', sans-serif", display: "flex",
    alignItems: "center", justifyContent: "center",
    flexDirection: "column", gap: 16,
  };

  if (loading) return (
    <div style={center}>
      <div style={{ fontSize: 48 }}>⚡</div>
      <div style={{ fontSize: 18, color: C.textMuted }}>Looking up link...</div>
    </div>
  );

  if (!link) return (
    <div style={center}>
      <div style={{ fontSize: 48 }}>🔗</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>Link not found</div>
      <div style={{ color: C.textMuted, fontSize: 14 }}>{shortUrl(code)} doesn't exist</div>
      <Btn onClick={() => onNavigate("/")}>Go Home</Btn>
    </div>
  );

  if (link.status === "disabled") return (
    <div style={center}>
      <div style={{ fontSize: 48 }}>🚫</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>Link Disabled</div>
      <div style={{ color: C.textMuted, fontSize: 14 }}>This link has been disabled by its owner</div>
      <Btn onClick={() => onNavigate("/")}>Go Home</Btn>
    </div>
  );

  if (link.status === "expired") return (
    <div style={center}>
      <div style={{ fontSize: 48 }}>⏰</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>Link Expired</div>
      <div style={{ color: C.textMuted, fontSize: 14 }}>
        This link expired on {link.expires_at ? new Date(link.expires_at).toLocaleDateString() : "unknown"}
      </div>
      <Btn onClick={() => onNavigate("/")}>Go Home</Btn>
    </div>
  );

  return (
    <div style={center}>
      <div style={{ fontSize: 48 }}>⚡</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.teal }}>Redirecting...</div>
      <div style={{ color: C.textMuted, fontSize: 14 }}>Taking you to:</div>
      <div style={{ color: C.textDim, fontSize: 14, maxWidth: 400, textAlign: "center", wordBreak: "break-all" }}>
        {link.original_url}
      </div>
      {countdown > 0
        ? <div style={{ fontSize: 42, fontWeight: 900, color: C.teal, marginTop: 8 }}>{countdown}</div>
        : <div style={{ fontSize: 18, color: C.textMuted, marginTop: 8 }}>Redirecting now...</div>
      }
      <Btn variant="ghost" style={{ marginTop: 8 }} onClick={() => onNavigate("/")}>Cancel</Btn>
    </div>
  );
}