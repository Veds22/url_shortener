import { useState } from "react";
import { C } from "../utils/theme";
import Navbar from "../components/Navbar";
import Btn from "../components/Btn";
import Input from "../components/Input";
import Toast from "../components/Toast";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services/api";

export default function AuthPage({ onNavigate, defaultTab = "login" }) {
  const { login } = useAuth();
  const [tab, setTab] = useState(defaultTab);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast, showToast } = useToast();

  const submit = async () => {
    if (!username || !password) { showToast("Please fill all fields", "error"); return; }
    
    setLoading(true);
    try {
      if (tab === "signup") {
        // 1. Create account
        await authApi.signup(username, password);
        showToast("Account created! Logging you in...");
      }

      // 2. Login to get token (always — after signup too)
      const { access_token } = await authApi.login(username, password);

      // 3. Store token + user in context
      login(access_token, {
        name: username,
        username,
        // tier comes from the JWT payload or defaults to free
        // we'll decode it from the token
        tier: getTierFromToken(access_token),
      });

      showToast(tab === "login" ? "Welcome back!" : "Account created!");
      setTimeout(() => onNavigate("/me"), 800);

    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setUsername(""); setPassword("");
    onNavigate(t === "login" ? "/login" : "/signup");
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar onNavigate={onNavigate} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: "36px 40px", width: 400, boxShadow: "0 24px 64px #00000066" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: C.teal }}>⚡ LinkSnip</span>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 6 }}>
              {tab === "login" ? "Welcome back" : "Create your account"}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 28 }}>
            {["login", "signup"].map((t) => (
              <button key={t} onClick={() => switchTab(t)}
                style={{ flex: 1, background: "none", border: "none", padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.1em", color: tab === t ? C.teal : C.textMuted, borderBottom: tab === t ? `2px solid ${C.teal}` : "2px solid transparent", marginBottom: -1 }}>
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Username</label>
              <Input placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <Input placeholder="Enter password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <Btn
              style={{ width: "100%", padding: "12px 0", marginTop: 4, fontSize: 14 }}
              onClick={submit}
              disabled={loading}
            >
              {loading ? "Please wait..." : tab === "login" ? "Login" : "Create Account"}
            </Btn>

            <div style={{ textAlign: "center", color: C.textMuted, fontSize: 13 }}>
              {tab === "login" ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => switchTab(tab === "login" ? "signup" : "login")}
                style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}>
                {tab === "login" ? "Sign up" : "Login"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}

const labelStyle = {
  fontSize: 12, color: C.textMuted, fontWeight: 600,
  display: "block", marginBottom: 6,
  textTransform: "uppercase", letterSpacing: "0.06em",
};

// Decode tier from JWT payload — your token has { sub: user_id }
// If tier isn't in the token, default to "free"
function getTierFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.tier || "free";
  } catch {
    return "free";
  }
}