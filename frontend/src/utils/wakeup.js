const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Render free tier spins down after 15min inactivity.
// This silently pings the health check on app load so the backend
// is warm by the time the user actually does something.
// GET / returns {"message": "URL Shortener is running"} — no auth needed.

export function wakeUpBackend() {
  fetch(`${API_BASE}/`, { method: "GET" })
    .then(() => console.log("Backend awake"))
    .catch(() => {}); // silent — user doesn't need to know
}