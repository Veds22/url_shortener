import { useState } from "react";
import { C } from "../utils/theme";
import Btn from "./Btn";
import Card from "./Card";
import Input from "./Input";

export default function CreateLinkModal({ onClose, onCreate }) {
  const [newUrl, setNewUrl] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async () => {
    if (!newUrl) return;
    setError(null);
    setLoading(true);
    try {
      await onCreate({ url: newUrl, customCode: newCode || null, expiry: newExpiry || null });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: 32,
          width: 440,
          maxWidth: "90vw",
          boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
        }}
      >
        <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 800, color: C.text }}>
          Create New Link
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* URL */}
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Original URL</span>
              <span style={{ color: C.red }}>Required</span>
            </label>
            <Input
              placeholder="https://your-long-url.com/path"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
          </div>

          {/* Custom code */}
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Custom Code <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <Input
              placeholder="mycode"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
          </div>

          {/* Expiry */}
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Expiry Date <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <Input
              type="date"
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
              style={{ colorScheme: "dark" }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: C.red + "18", border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 14px", color: C.red, fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <Btn variant="ghost" onClick={onClose} disabled={loading}>Cancel</Btn>
            <Btn onClick={handleCreate} disabled={!newUrl || loading}>
              {loading ? "Creating..." : "Create Link"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}