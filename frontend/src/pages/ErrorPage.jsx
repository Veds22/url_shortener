import { useLocation, useNavigate } from "react-router-dom";
import { C } from "../utils/theme";
import Btn from "../components/Btn";

// Error icon component
const ErrorIcon = ({ statusCode }) => {
  const color = statusCode === 410 ? "#FF6B6B" : statusCode === 404 ? "#FF8E42" : "#EE5A52";
  return (
    <svg
      width={96}
      height={96}
      viewBox="0 0 96 96"
      fill="none"
      style={{ marginBottom: 24 }}
    >
      <circle cx={48} cy={48} r={44} stroke={color} strokeWidth={2} />
      <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize={40} fill={color} fontWeight="bold">
        {statusCode || "!"}
      </text>
    </svg>
  );
};

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

export default function ErrorPage({ onNavigate, statusCode = 404, errorMessage = null }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract error info from state or use provided values
  const error = location.state || { statusCode, errorMessage };
  const errorInfo = ERROR_DETAILS[error.statusCode] || ERROR_DETAILS[404];

  const handleGoHome = () => {
    navigate("/");
  };

  const container = {
    minHeight: "100vh",
    background: C.bg,
    color: C.text,
    fontFamily: "'DM Sans', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 16,
    padding: 20,
  };

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
    <div style={container}>
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
            onClick={handleGoHome}
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
          >
            Go Home
          </Btn>
          <Btn
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
          >
            Go Back
          </Btn>
        </div>
      </div>
    </div>
  );
}
