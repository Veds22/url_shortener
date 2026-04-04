import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../utils/theme";
import { shortUrl } from "../utils/url";
import Btn from "../components/Btn";
import { publicLinksApi, redirectApi } from "../services/api";

// NOTE: In production this page is never reached — FastAPI handles
// GET /{short_code} and issues a real HTTP 307 redirect before React loads.
// This only exists for local dev SPA navigation.

// Error details mapping
const ERROR_DETAILS = {
  404: {
    title: "Link Not Found",
    subtitle: "Page Not Found",
    icon: "🔗",
    colors: {
      bg: "#FFF5F0",
      text: "#333",
      accent: "#FF8E42"
    }
  },
  410: {
    title: "Link Unavailable",
    subtitle: "This link is no longer available",
    icon: "⏰",
    colors: {
      bg: "#FFF0F0",
      text: "#333",
      accent: "#FF6B6B"
    }
  },
  403: {
    title: "Access Denied",
    subtitle: "You don't have permission to access this",
    icon: "🔒",
    colors: {
      bg: "#F0F5FF",
      text: "#333",
      accent: "#4A90FF"
    }
  },
  429: {
    title: "Too Many Requests",
    subtitle: "Please try again in a moment",
    icon: "⚡",
    colors: {
      bg: "#FFF9F0",
      text: "#333",
      accent: "#FFB84D"
    }
  }
};

export default function RedirectPage({ onNavigate, code }) {
  const navigate = useNavigate();
  const [link, setLink] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(3);

  // Fetch link data on mount or code change
  useEffect(() => {
    setLoading(true);
    setError(null);
    publicLinksApi.resolve(code)
      .then((data) => {
        setLink(data);
        setCountdown(3);
      })
      .catch((err) => {
        // Extract error details from the error message
        const errorMessage = err.message || "Unknown error";
        
        // Map common error messages to HTTP status codes
        let statusCode = 404;
        if (errorMessage.includes("expired") || errorMessage.includes("has expired")) {
          statusCode = 410;
        } else if (errorMessage.includes("disabled")) {
          statusCode = 410;
        } else if (errorMessage.includes("not found")) {
          statusCode = 404;
        }
        
        setError({
          statusCode,
          errorMessage
        });
        setLink(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code]);

  // Start countdown timer when link is resolved
  useEffect(() => {
    if (!link) return;
    
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
  }, [link, code]);

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

  // Display error inline
  if (error) {
    const errorInfo = ERROR_DETAILS[error.statusCode] || ERROR_DETAILS[404];

    const content = {
      textAlign: "center",
      maxWidth: 500,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 24,
    };

    const statusCodeStyle = {
      fontSize: 72,
      fontWeight: 700,
      color: errorInfo.colors.accent,
      margin: 0,
      lineHeight: 1,
    };

    const titleStyle = {
      fontSize: 28,
      fontWeight: 600,
      color: C.text,
      margin: 0,
    };

    const subtitleStyle = {
      fontSize: 16,
      color: C.text,
      opacity: 0.7,
      margin: 0,
      lineHeight: 1.5,
    };

    const messageStyle = {
      fontSize: 14,
      color: errorInfo.colors.accent,
      background: `${errorInfo.colors.accent}15`,
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
      fontFamily: "monospace",
      wordBreak: "break-word",
    };

    const buttonsContainer = {
      display: "flex",
      gap: 12,
      justifyContent: "center",
      flexWrap: "wrap",
      marginTop: 12,
    };

    return (
      <div style={center}>
        <div style={content}>
          <div style={statusCodeStyle}>{error.statusCode}</div>
          <div>
            <h1 style={titleStyle}>{errorInfo.title}</h1>
            <p style={subtitleStyle}>{errorInfo.subtitle}</p>
            {error.errorMessage && (
              <p style={messageStyle}>{error.errorMessage}</p>
            )}
          </div>

          <div style={buttonsContainer}>
            <Btn
              label="Go Home"
              onClick={() => onNavigate("/")}
              style={{
                background: errorInfo.colors.accent,
                color: "white",
                padding: "10px 24px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                transition: "all 0.3s",
              }}
            />
            <Btn
              label="Go Back"
              onClick={() => navigate(-1)}
              style={{
                background: "transparent",
                color: errorInfo.colors.accent,
                padding: "10px 24px",
                borderRadius: 8,
                border: `2px solid ${errorInfo.colors.accent}`,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                transition: "all 0.3s",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

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