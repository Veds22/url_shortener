import { useState, useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import MePage from "./pages/MePage";
import AuthPage from "./pages/AuthPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import RedirectPage from "./pages/RedirectPage";
import DocsPage from "./pages/DocsPage";

const RESERVED = ["me", "login", "signup"];

function getInitialRoute() {
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname || "/";
  // Normalize multiple trailing slashes
  return path.replace(/\/+$/, "") || "/";
}

function Router() {
  const [route, setRoute] = useState(getInitialRoute);
  const navigate = (path) => {
    if (typeof window !== "undefined") {
      // Push new entry into browser history so URL updates
      window.history.pushState({}, "", path);
    }
    setRoute(path);
  };

  // Keep route in sync when user uses browser back/forward buttons
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      setRoute(getInitialRoute());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (route === "/") return <LandingPage onNavigate={navigate} />;
  if (route === "/me") return <MePage onNavigate={navigate} />;
  if (route === "/login") return <AuthPage onNavigate={navigate} defaultTab="login" />;
  if (route === "/signup") return <AuthPage onNavigate={navigate} defaultTab="signup" />;
  if (route === "/docs") return <DocsPage onNavigate={navigate} />;

  if (route.startsWith("/analytics/")) {
    const code = route.replace("/analytics/", "");
    return <AnalyticsPage onNavigate={navigate} code={code} />;
  }

  if (route.startsWith("/") && route.length > 1) {
    const code = route.slice(1);
    console.log(code);
    if (!RESERVED.includes(code)) return <RedirectPage onNavigate={navigate} code={code} />;
  }

  return <LandingPage onNavigate={navigate} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}