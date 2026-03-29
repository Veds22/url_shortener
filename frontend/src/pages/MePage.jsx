import { useState } from "react";
import { C } from "../utils/theme";
import { shortUrl } from "../utils/url";
import Navbar from "../components/Navbar";
import Btn from "../components/Btn";
import Card from "../components/Card";
import Toast from "../components/Toast";
import QRModal from "../components/QRModal";
import CreateLinkModal from "../components/CreateLinkModal";
import LinksTable from "../components/LinksTable";
import Input from "../components/Input";
import { TierBadge } from "../components/Badges";
import { useToast } from "../hooks/useToast";
import { useLinks } from "../hooks/useLinks";
import { useAuth } from "../context/AuthContext";

export default function MePage({ onNavigate }) {
  const { user } = useAuth();
  const { links, loading, error, page, setPage, limit, total, toggleStatus, createLink } = useLinks();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [qrLink, setQrLink] = useState(null);
  const { toast, showToast } = useToast();

  // Guard — must be after all hooks
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>
        <Navbar onNavigate={onNavigate} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 40 }}>🔐</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Sign in to view your links</div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <Btn onClick={() => onNavigate("/login")}>Login</Btn>
            <Btn variant="secondary" onClick={() => onNavigate("/signup")}>Sign Up</Btn>
          </div>
        </div>
      </div>
    );
  }

  const filtered = links.filter((l) => {
    const matchSearch =
      l.short_code.toLowerCase().includes(search.toLowerCase()) ||
      l.original_url.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || l.status === filter;
    return matchSearch && matchFilter;
  });

  // Server-side pagination: backend already limits to `limit` per page
  const totalPages = Math.max(1, Math.ceil(total / (limit || 10)));
  const paginated = filtered;
  const totalClicks = links.reduce((a, l) => a + (l.clicks || 0), 0);

  // Called by CreateLinkModal — must be async so modal can await it
  const handleCreate = async (data) => {
    await createLink(data);         // throws on error — modal catches and shows inline
    showToast("Short link created!");
    setShowModal(false);            // close only on success
  };

  const handleCopy = (code) => {
    navigator.clipboard?.writeText(shortUrl(code));
    showToast("Copied!");
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      await toggleStatus(id, currentStatus);
      showToast(`Link ${currentStatus === "active" ? "disabled" : "enabled"}`);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar onNavigate={onNavigate} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 32px" }}>

        {/* Profile header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${C.teal}, ${C.pro})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "#080d1a" }}>
              {user.name[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>{user.name}</div>
              <div style={{ fontSize: 13, color: C.textDim, marginTop: 2 }}>@{user.username}</div>
              <div style={{ marginTop: 6 }}><TierBadge tier={user.tier} /></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {user.tier !== "premium" && user.tier !== "admin" && (
              <Btn variant="secondary" style={{ padding: "8px 16px", fontSize: 12 }}
                onClick={() => showToast("Upgrade plans coming soon!", "error")}>
                ⚡ Upgrade Plan
              </Btn>
            )}
            <Btn onClick={() => setShowModal(true)} style={{ padding: "10px 22px" }}>
              + Create New Link
            </Btn>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Total Links", value: loading ? "—" : total, color: C.teal },
            { label: "Active", value: loading ? "—" : links.filter((l) => l.status === "active").length, color: C.green },
            { label: "Total Clicks", value: loading ? "—" : totalClicks.toLocaleString(), color: C.pro },
            { label: "Tier", value: user.tier.toUpperCase(), color: C.premium },
          ].map(({ label, value, color }) => (
            <Card key={label} style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</div>
            </Card>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ background: C.red + "18", border: `1px solid ${C.red}33`, borderRadius: 10, padding: "12px 16px", marginBottom: 18, color: C.red, fontSize: 13 }}>
            Failed to load links: {error} —{" "}
            <button onClick={() => window.location.reload()}
              style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontWeight: 600, textDecoration: "underline", fontFamily: "inherit", fontSize: 13 }}>
              Retry
            </button>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center" }}>
          <Input
            placeholder="🔍  Search links..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ maxWidth: 280 }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            {["all", "active", "disabled", "expired"].map((f) => (
              <button key={f} onClick={() => { setFilter(f); setPage(1); }}
                style={{ background: filter === f ? C.teal : C.bgInput, border: `1px solid ${filter === f ? C.teal : C.border}`, borderRadius: 6, padding: "7px 14px", color: filter === f ? "#080d1a" : C.textDim, fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize", fontFamily: "inherit" }}>
                {f}
              </button>
            ))}
          </div>
          <span style={{ color: C.textMuted, fontSize: 13, marginLeft: "auto" }}>
            {filtered.length} link{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <Card style={{ padding: "48px", textAlign: "center", color: C.textMuted }}>
            <div style={{ fontSize: 13 }}>Loading your links...</div>
          </Card>
        ) : (
          <Card style={{ overflow: "hidden", marginBottom: 16 }}>
            <LinksTable
              links={paginated}
              onAnalytics={(code) => onNavigate(`/analytics/${code}`)}
              onQR={(link) => setQrLink(link)}
              onCopy={handleCopy}
              onToggleStatus={handleToggle}
            />
          </Card>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: C.textMuted }}>Page {page} of {totalPages}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn variant="ghost" style={{ padding: "6px 14px", fontSize: 12 }} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</Btn>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ background: p === page ? C.teal : C.bgInput, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", color: p === page ? "#080d1a" : C.textMuted, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {p}
                </button>
              ))}
              <Btn variant="ghost" style={{ padding: "6px 14px", fontSize: 12 }} disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next →</Btn>
            </div>
          </div>
        )}
      </div>

      {/* Modal renders when showModal is true */}
      {showModal && (
        <CreateLinkModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}

      {qrLink && (
        <QRModal
          url={shortUrl(qrLink.short_code)}
          shortCode={qrLink.short_code}
          onClose={() => setQrLink(null)}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}