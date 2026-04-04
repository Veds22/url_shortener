import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { wakeUpBackend } from "./utils/wakeup";
 
// Ping backend immediately on load — warms up Render free tier
wakeUpBackend();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);