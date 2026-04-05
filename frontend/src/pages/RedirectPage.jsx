import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../utils/theme";
import { shortUrl } from "../utils/url";
import Btn from "../components/Btn";
import { publicLinksApi, redirectApi } from "../services/api";
import ErrorPage from "./ErrorPage";

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

  const errorState = error
    ? {
        statusCode: error.statusCode,
        errorMessage: error.errorMessage,
      }
    : null;

  // Fetch link data on mount or code change
  useEffect(() => {
    setLoading(true);
    setError(null);
    publicLinksApi.resolve(code)
      .then((data) => {
        const status = (data?.status || "").toLowerCase();

        if (status !== "active") {
          const errorMessage = status === "expired"
            ? "URL has expired"
            : status === "disabled"
              ? "URL is disabled"
              : "URL is unavailable";

          setError({ statusCode: 410, errorMessage });
          setLink(null);
          return;
        }

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

  if (errorState) {
    return <ErrorPage onNavigate={onNavigate} statusCode={errorState.statusCode} errorMessage={errorState.errorMessage} />;
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