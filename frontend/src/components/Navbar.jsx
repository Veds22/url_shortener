import { C } from "../utils/theme";
import Btn from "./Btn";
import { TierBadge } from "./Badges";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ onNavigate }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    onNavigate("/");
  };

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "15px 48px",
        borderBottom: `1px solid ${C.border}`,
        background: C.bgCard,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <button
        onClick={() => onNavigate("/")}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
      >
        <span style={{ fontSize: 18, fontWeight: 900, color: C.teal, letterSpacing: "-0.03em" }}>
          ⚡ LinkSnip
        </span>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Btn variant="ghost" style={{ padding: "7px 14px", fontSize: 13 }} onClick={() => onNavigate("/docs")}>
          Docs
        </Btn>
        {user ? (
          <>
            <Btn variant="ghost" style={{ padding: "7px 16px", fontSize: 13 }} onClick={() => onNavigate("/me")}>
              My Links
            </Btn>
            <div
              onClick={() => onNavigate("/me")}
              style={{
                width: 34, height: 34, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.teal}, ${C.pro})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, color: "#080d1a", cursor: "pointer",
              }}
            >
              {user.name[0].toUpperCase()}
            </div>
            <TierBadge tier={user.tier} />
            <Btn variant="ghost" style={{ padding: "6px 14px", fontSize: 12 }} onClick={handleLogout}>
              Logout
            </Btn>
          </>
        ) : (
          <>
            <Btn variant="ghost" onClick={() => onNavigate("/login")}>Login</Btn>
            <Btn onClick={() => onNavigate("/signup")}>Sign Up</Btn>
          </>
        )}
      </div>
    </nav>
  );
}