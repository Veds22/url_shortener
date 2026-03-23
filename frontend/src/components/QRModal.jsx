import { useRef, useEffect } from "react";
import { C } from "../utils/theme";
import Btn from "./Btn";
import Card from "./Card";

export default function QRModal({ url, shortCode, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = C.bgCard;
    ctx.fillRect(0, 0, size, size);

    const modules = 21;
    const ms = size / modules;
    const seed = url.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const pattern = Array.from({ length: modules * modules }, (_, i) => (seed * (i + 1) * 2654435761) % 4 < 2);

    const drawFinder = (x, y) => {
      ctx.fillStyle = C.teal;
      ctx.fillRect(x * ms, y * ms, 7 * ms, 7 * ms);
      ctx.fillStyle = C.bgCard;
      ctx.fillRect((x + 1) * ms, (y + 1) * ms, 5 * ms, 5 * ms);
      ctx.fillStyle = C.teal;
      ctx.fillRect((x + 2) * ms, (y + 2) * ms, 3 * ms, 3 * ms);
    };
    drawFinder(0, 0);
    drawFinder(14, 0);
    drawFinder(0, 14);

    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        const isFinder = (r < 8 && c < 8) || (r < 8 && c >= 13) || (r >= 13 && c < 8);
        if (!isFinder && pattern[r * modules + c]) {
          ctx.fillStyle = C.teal;
          ctx.fillRect(c * ms + 1, r * ms + 1, ms - 1, ms - 1);
        }
      }
    }
  }, [url]);

  const download = () => {
    const link = document.createElement("a");
    link.download = `${shortCode}-qr.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <Card style={{ padding: 32, width: 320, textAlign: "center", boxShadow: "0 32px 80px #00000099" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>QR Code</h2>
        {/* Show the actual URL passed in — not a hardcoded domain */}
        <p style={{ color: C.textDim, fontSize: 12, margin: "0 0 20px", wordBreak: "break-all" }}>{url}</p>
        <div style={{ background: C.bgInput, borderRadius: 12, padding: 16, display: "inline-block", border: `1px solid ${C.border}`, marginBottom: 16 }}>
          <canvas ref={canvasRef} style={{ display: "block" }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="ghost" style={{ flex: 1 }} onClick={onClose}>Close</Btn>
          <Btn style={{ flex: 1 }} onClick={download}>⬇ Download</Btn>
        </div>
      </Card>
    </div>
  );
}