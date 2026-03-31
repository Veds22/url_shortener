const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Core fetch wrapper ──────────────────────────────────────────────────────

async function request(path, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorBody = null;
    try {
      errorBody = await res.json();
    } catch {
      // ignore JSON parse errors
    }

    let message = "Something went wrong";

    if (errorBody) {
      // FastAPI default: { detail: "..." } or { detail: [{ msg, ... }, ...] }
      if (typeof errorBody.detail === "string") {
        message = errorBody.detail;
      } else if (Array.isArray(errorBody.detail) && errorBody.detail.length) {
        message = errorBody.detail
          .map((d) => d.msg || d.message || "Validation error")
          .join("; ");
      }
      // Custom wrapper: { error: { message, details } }
      else if (errorBody.error) {
        if (typeof errorBody.error.message === "string") {
          message = errorBody.error.message;
        } else if (Array.isArray(errorBody.error.details) && errorBody.error.details.length) {
          message = errorBody.error.details
            .map((d) => d.msg || d.message || (typeof d === "string" ? d : "Error"))
            .join("; ");
        }
      }
      // Fallback to generic message field if present
      else if (typeof errorBody.message === "string") {
        message = errorBody.message;
      }
    }

    throw new Error(message || "Request failed");
  }

  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ────────────────────────────────────────────────────────────────────
// backend signup: { username, password } — no email field in User model

export const authApi = {
  signup: (username, password) =>
    request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  login: (username, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
};

// ── Links ───────────────────────────────────────────────────────────────────
// backend returns URLResponse: { id, original_url, short_code, short_url, created_at, expires_at }
// backend returns PaginatedLinks: { total, page, limit, links: [...] }

export const linksApi = {
  getMyLinks: (page = 1, limit = 10) =>
    request(`/links?page=${page}&limit=${limit}`),

  shorten: (url, customCode = null, expiresAt = null) => {
  // input[type=date] returns "YYYY-MM-DD" — FastAPI needs full ISO datetime
  const isoExpiry = expiresAt ? new Date(expiresAt).toISOString() : null;

    return request("/shorten", {
      method: "POST",
      body: JSON.stringify({
        url,
        ...(customCode ? { custom_code: customCode } : {}),
        ...(isoExpiry ? { expires_at: isoExpiry } : {}),
      }),
    });
  },

  enable: (shortCode) =>
    request(`/${shortCode}`, { method: "PUT" }),

  disable: (shortCode) =>
    request(`/${shortCode}`, { method: "DELETE" }),
};

// ── Analytics ───────────────────────────────────────────────────────────────
// backend returns URLAnalytics: { original_url, short_code, clicks, created_at, status, expires_at }

export const analyticsApi = {
  get: (shortCode) => request(`/analytics/${shortCode}`),
};

// ── Redirect ───────────────────────────────────────────────────────────────
// Uses backend GET /{short_code} redirect endpoint. This does not parse JSON;
// it is meant for triggering a real browser navigation.

export const redirectApi = {
  // Navigate the browser to the backend redirect endpoint for a short code.
  get: async (shortCode) => {
    if (!shortCode) return;
    console.log("Redirecting to:", shortCode);
    if (shortCode.endsWith("/")) {
      shortCode = shortCode.slice(0, -1);
    }

    try {
      const data = await request(`/${shortCode}`);
      if (data && data.original_url) {
        console.log("Redirecting to original URL:", data.original_url);
        window.location.href = data.original_url;
      }
    } catch (err) {
      // Swallow errors here; the redirect page already shows state,
      // and failures just mean we stay on the current page.
      console.error("Redirect failed:", err);
    }
  }
};