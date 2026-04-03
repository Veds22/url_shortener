import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import MePage from "./pages/MePage";
import AuthPage from "./pages/AuthPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import RedirectPage from "./pages/RedirectPage";
import DocsPage from "./pages/DocsPage";

const RESERVED = ["me", "login", "signup", "docs"];

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/" element={<LandingPage onNavigate={navigate} />} />
      <Route path="/me" element={<MePage onNavigate={navigate} />} />
      <Route path="/login" element={<AuthPage onNavigate={navigate} defaultTab="login" />} />
      <Route path="/signup" element={<AuthPage onNavigate={navigate} defaultTab="signup" />} />
      <Route path="/docs" element={<DocsPage onNavigate={navigate} />} />
      <Route path="/analytics/:code" element={<AnalyticsRoute onNavigate={navigate} />} />
      <Route path="/:code" element={<RedirectPage onNavigate={navigate} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AnalyticsRoute({ onNavigate }) {
  const { code = "" } = useParams();
  return <AnalyticsPage onNavigate={onNavigate} code={code} />;
}

function ShortCodeRoute({ onNavigate }) {
  const { code = "" } = useParams();

  if (RESERVED.includes(code)) {
    return <Navigate to={`/${code}`} replace />;
  }

  return <RedirectPage onNavigate={onNavigate} code={code} />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}