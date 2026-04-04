import { useEffect, useRef } from "react";
import { C } from "../utils/theme";
import Btn from "./Btn";

// Uses qrcode library — add to package.json:
// npm install qrcode

export default function QRModal({ url, shortCode, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!url || !canvasRef.current) return;

    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 2,
        color: {
          dark: "#00d4b8",   // teal modules
          light: "#0f1829",  // dark background
        },
      }).catch(console.error);
    });
  }, [url]);

  const download = () => {
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: { dark: "#00d4b8", light: "#0f1829" },
      }).then((dataUrl) => {
        const a = document.createElement("a");
        a.download = `${shortCode}-qr.png`;
        a.href = dataUrl;
        a.click();
      });
    });
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: 32, width: 300, textAlign: "center", boxShadow: "0 32px 80px #00000099" }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: C.text }}>QR Code</h2>
        <p style={{ color: C.textDim, fontSize: 12, margin: "0 0 20px", wordBreak: "break-all" }}>{url}</p>

        <div style={{ background: C.bgInput, borderRadius: 12, padding: 16, display: "inline-block", border: `1px solid ${C.border}`, marginBottom: 20 }}>
          <canvas ref={canvasRef} style={{ display: "block" }} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="ghost" style={{ flex: 1 }} onClick={onClose}>Close</Btn>
          <Btn style={{ flex: 1 }} onClick={download}>⬇ Download</Btn>
        </div>
      </div>
    </div>
  );
}