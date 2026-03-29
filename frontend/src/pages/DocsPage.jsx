import Navbar from "../components/Navbar";
import { C } from "../utils/theme";
import architectureDiagram from "../assets/architecture.png";
import erDiagram from "../assets/entity-relationship.png";
import backgroundFlowDiagram from "../assets/user-flow.png";

// ── tiny helpers ─────────────────────────────────────────────────────────────

const Tag = ({ children, color = C.teal }) => (
  <span style={{
    display: "inline-block", background: color + "18",
    border: `1px solid ${color}33`, borderRadius: 5,
    padding: "1px 8px", fontSize: 11, fontWeight: 700,
    color, letterSpacing: "0.05em", fontFamily: "monospace",
  }}>
    {children}
  </span>
);

const Badge = ({ method }) => {
  const colors = {
    GET: { bg: "#1D9E7518", border: "#1D9E7533", text: "#1D9E75" },
    POST: { bg: "#3B8BD418", border: "#3B8BD433", text: "#3B8BD4" },
    PUT: { bg: "#EF9F2718", border: "#EF9F2733", text: "#EF9F27" },
    DELETE: { bg: "#E24B4A18", border: "#E24B4A33", text: "#E24B4A" },
  };
  const c = colors[method] || colors.GET;
  return (
    <span style={{
      display: "inline-block", background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 800,
      color: c.text, letterSpacing: "0.07em", minWidth: 52, textAlign: "center",
    }}>
      {method}
    </span>
  );
};

const Section = ({ id, title, children }) => (
  <section id={id} style={{ marginBottom: 52 }}>
    <h2 style={{
      fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em",
      margin: "0 0 16px", paddingBottom: 10,
      borderBottom: `1px solid ${C.border}`,
    }}>
      {title}
    </h2>
    {children}
  </section>
);

const InfoCard = ({ title, children, accent = C.teal }) => (
  <div style={{
    borderRadius: 12, border: `1px solid ${C.border}`,
    background: C.bgCard, overflow: "hidden",
  }}>
    <div style={{
      padding: "10px 18px", background: accent + "12",
      borderBottom: `1px solid ${C.border}`,
      fontSize: 12, fontWeight: 700, color: accent,
      textTransform: "uppercase", letterSpacing: "0.09em",
    }}>
      {title}
    </div>
    <div style={{ padding: "16px 18px" }}>{children}</div>
  </div>
);

const CodeBlock = ({ children }) => (
  <pre style={{
    background: C.bgInput, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "12px 16px", fontSize: 12,
    fontFamily: "monospace", color: C.textDim, overflowX: "auto",
    lineHeight: 1.7, margin: 0,
  }}>
    {children}
  </pre>
);

const Pill = ({ children, color = C.textMuted }) => (
  <span style={{
    background: C.bgInput, border: `1px solid ${C.border}`,
    borderRadius: 20, padding: "4px 12px", fontSize: 12,
    color, fontWeight: 600,
  }}>
    {children}
  </span>
);

const TierTable = () => {
  const rows = [
    { tier: "anonymous", links: 1, expiry: "1 day", color: C.textMuted },
    { tier: "free", links: 1, expiry: "7 days", color: C.textDim },
    { tier: "pro", links: 10, expiry: "90 days", color: "#3B8BD4" },
    { tier: "premium", links: "∞", expiry: "∞", color: "#9F7AEA" },
    { tier: "admin", links: "∞", expiry: "∞", color: C.teal },
  ];
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.bgInput, textAlign: "left" }}>
            {["Tier", "Active link limit", "Max expiry"].map(h => (
              <th key={h} style={{ padding: "8px 14px", color: C.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.tier} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? "transparent" : C.bgInput + "60" }}>
              <td style={{ padding: "8px 14px" }}>
                <span style={{ fontWeight: 700, color: r.color, textTransform: "capitalize", fontFamily: "monospace" }}>{r.tier}</span>
              </td>
              <td style={{ padding: "8px 14px", color: C.textDim }}>{r.links}</td>
              <td style={{ padding: "8px 14px", color: C.textDim }}>{r.expiry}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const EndpointRow = ({ method, path, desc, auth }) => (
  <tr style={{ borderTop: `1px solid ${C.border}` }}>
    <td style={{ padding: "9px 14px", whiteSpace: "nowrap", verticalAlign: "top" }}>
      <Badge method={method} />
    </td>
    <td style={{ padding: "9px 14px", whiteSpace: "nowrap", verticalAlign: "top" }}>
      <code style={{ fontFamily: "monospace", fontSize: 12, color: C.teal }}>{path}</code>
    </td>
    <td style={{ padding: "9px 14px", fontSize: 13, color: C.textDim, verticalAlign: "top" }}>{desc}</td>
    <td style={{ padding: "9px 14px", verticalAlign: "top" }}>
      {auth && <Tag color="#9F7AEA">JWT</Tag>}
    </td>
  </tr>
);

// ── diagram images (swap these src values with real PNGs you export) ─────────

const DiagramPlaceholder = ({ label, hint, imgSrc }) => (
  <div style={{
    borderRadius: 12, border: `2px dashed ${C.border}`,
    background: C.bgCard, padding: imgSrc ? 0 : "36px 24px",
    textAlign: "center", overflow: "hidden",
  }}>
    {imgSrc
      ? <img src={imgSrc} alt={label} style={{ width: "100%", borderRadius: 10, display: "block" }} />
      : (
        <>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
          <div style={{ fontWeight: 700, color: C.textDim, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>{hint}</div>
        </>
      )
    }
  </div>
);

// ── Sidebar nav ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "architecture", label: "Architecture" },
  { id: "stack", label: "Tech Stack" },
  { id: "data-model", label: "Data Model" },
  { id: "redis-celery", label: "Redis & Celery" },
  { id: "tiers", label: "Tier System" },
  { id: "api", label: "API Reference" },
  { id: "frontend", label: "Frontend Flow" },
  { id: "features", label: "Features" },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function DocsPage({ onNavigate }) {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <Navbar onNavigate={onNavigate} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", gap: 40 }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: 200, flexShrink: 0, position: "sticky", top: 24,
          alignSelf: "flex-start", paddingTop: 40,
          display: "none",  // hidden on mobile by default; override with CSS if needed
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            On this page
          </div>
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: "none", border: "none", padding: "6px 10px",
                fontSize: 13, color: C.textDim, cursor: "pointer",
                borderRadius: 6, fontFamily: "inherit",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={e => { e.target.style.background = C.bgInput; e.target.style.color = C.teal; }}
              onMouseLeave={e => { e.target.style.background = "none"; e.target.style.color = C.textDim; }}
            >
              {label}
            </button>
          ))}
        </aside>

        {/* ── Main content ── */}
        <main style={{ flex: 1, minWidth: 0, padding: "40px 0 80px" }}>

          {/* Hero */}
          <div style={{ marginBottom: 48 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: C.teal + "14", border: `1px solid ${C.teal}33`,
              borderRadius: 20, padding: "4px 14px", marginBottom: 16,
              fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              ⚡ Project Documentation
            </div>
            <h1 style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 12px" }}>
              LinkSnip
            </h1>
            <p style={{ fontSize: 15, color: C.textDim, lineHeight: 1.75, maxWidth: 640, margin: 0 }}>
              A production-grade URL shortener with Redis caching, Celery-driven background tasks,
              tier-based access control, and a React SPA frontend. This page is the authoritative
              entry point for reviewers.
            </p>

            {/* tech pills */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
              {["FastAPI", "SQLAlchemy", "PostgreSQL", "Redis", "Celery", "React", "Vite", "Docker"].map(t => (
                <Pill key={t}>{t}</Pill>
              ))}
            </div>
          </div>

          {/* ── Overview ── */}
          <Section id="overview" title="Overview">
            <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8, margin: "0 0 20px" }}>
              LinkSnip turns long URLs into short, trackable codes (e.g.{" "}
              <code style={{ fontFamily: "monospace", color: C.teal }}>linksnip.io/aB3</code>). Every redirect is
              served from Redis for sub-millisecond latency. Clicks are buffered in Redis and flushed to
              Postgres asynchronously by Celery workers, avoiding per-request DB writes. Users are assigned
              a tier that governs how many links they can create and how long those links live.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                { icon: "⚡", title: "Fast redirects", body: "Redis read-through cache serves all warm redirects. Cache miss falls through to Postgres, then re-populates Redis with a 3600 s TTL." },
                { icon: "📊", title: "Buffered analytics", body: "Click counts are held in Redis and bulk-flushed to Postgres every 60 s, plus an on-demand flush when a single link crosses 50 Redis clicks." },
                { icon: "🔐", title: "Tier access control", body: "Four user tiers (free, pro, premium, admin) control link quotas and maximum expiry windows. Anonymous users get 1 link, 1-day expiry." },
              ].map(({ icon, title, body }) => (
                <div key={title} style={{
                  borderRadius: 12, border: `1px solid ${C.border}`,
                  background: C.bgCard, padding: "18px 20px",
                }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7 }}>{body}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Architecture ── */}
          <Section id="architecture" title="Architecture">
            <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8, margin: "0 0 20px" }}>
              The system is a monorepo split into <code style={{ fontFamily: "monospace" }}>backend/</code> and{" "}
              <code style={{ fontFamily: "monospace" }}>frontend/</code>. All services are containerised with
              Docker Compose. The diagram below shows the high-level component topology — replace the
              placeholder with the exported PNG once you have it.
            </p>

            {/* DIAGRAM 1 — swap src once you have the image */}
            <DiagramPlaceholder
              label="High-level Architecture Diagram"
              hint="Browser → React SPA → FastAPI → Postgres / Redis / Celery"
              imgSrc={architectureDiagram}
            />

            <div style={{ marginTop: 20 }}>
              <CodeBlock>{`# Component topology (text fallback)

Browser
  └─ React SPA (Vite, port 5173)
       └─ HTTP/JSON API calls ──► FastAPI (Uvicorn, port 8000)
                                        ├─ Postgres (SQLAlchemy ORM)
                                        ├─ Redis  (cache + Celery broker)
                                        └─ Celery worker + beat scheduler
                                               ├─ sync_all_clicks  (every 60 s)
                                               └─ expiry_short_links (every 10 min)`}
              </CodeBlock>
            </div>
          </Section>

          {/* ── Stack ── */}
          <Section id="stack" title="Tech Stack">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <InfoCard title="Backend" accent={C.teal}>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.textDim, lineHeight: 2 }}>
                  <li><strong>FastAPI</strong> — async web framework, auto-generates OpenAPI docs</li>
                  <li><strong>SQLAlchemy ORM</strong> — models, sessions, relationships</li>
                  <li><strong>PostgreSQL</strong> — primary persistent store</li>
                  <li><strong>Redis</strong> — URL cache + click buffers + Celery broker/backend</li>
                  <li><strong>Celery + beat</strong> — scheduled background workers</li>
                  <li><strong>python-jose</strong> — JWT signing &amp; verification</li>
                  <li><strong>passlib / bcrypt</strong> — password hashing</li>
                  <li><strong>SlowAPI</strong> — global rate limiting (10 req/min on <code>/shorten</code>)</li>
                </ul>
              </InfoCard>
              <InfoCard title="Frontend" accent="#9F7AEA">
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.textDim, lineHeight: 2 }}>
                  <li><strong>React 18</strong> — component-based UI</li>
                  <li><strong>Vite</strong> — dev server + production bundler</li>
                  <li><strong>Custom SPA router</strong> — in-memory URL state, no React Router dependency</li>
                  <li><strong>Context API</strong> — global auth state (<code>AuthContext</code>)</li>
                  <li><strong>api.js</strong> — thin fetch wrapper that injects JWT and normalises errors</li>
                  <li><strong>QR Code generation</strong> — per-link downloadable QR modal</li>
                  <li><strong>DM Sans</strong> — primary font</li>
                </ul>
              </InfoCard>
              <InfoCard title="Infrastructure" accent="#EF9F27">
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.textDim, lineHeight: 2 }}>
                  <li><strong>Docker + Docker Compose</strong> — multi-service orchestration</li>
                  <li>Postgres healthcheck gates API container startup</li>
                  <li><code>VITE_API_BASE_URL</code> env-var drives frontend → backend routing</li>
                  <li><code>SECRET_KEY</code>, <code>REDIS_URL</code>, <code>DATABASE_URL</code> via <code>.env</code></li>
                </ul>
              </InfoCard>
              <InfoCard title="Testing" accent="#E24B4A">
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.textDim, lineHeight: 2 }}>
                  <li><strong>pytest</strong> — test runner with fixtures</li>
                  <li><code>app.dependency_overrides</code> for DB/auth injection in tests</li>
                  <li>Custom <code>ColorFormatter</code> log handler for pretty test output</li>
                  <li>Separate test DB session lifecycle (function-scoped fixtures)</li>
                </ul>
              </InfoCard>
            </div>
          </Section>

          {/* ── Data Model ── */}
          <Section id="data-model" title="Data Model">
            <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8, margin: "0 0 20px" }}>
              Three core tables power the service. <strong>Destination</strong> deduplicates raw URLs so
              many short codes can point to the same original URL without storing it redundantly.{" "}
              <strong>ShortLink</strong> holds the code, status, expiry, click count, and owner.{" "}
              <strong>User</strong> stores credentials and the tier that governs quotas.
            </p>

            {/* DIAGRAM 2 — ER diagram image placeholder */}
            <DiagramPlaceholder
              label="Entity-Relationship Diagram"
              hint="User (1) → ShortLink (N) → Destination (1), with column detail"
              imgSrc={erDiagram}
            />

            <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                {
                  name: "Destination", color: "#3B8BD4",
                  fields: ["id (PK)", "original_url (unique)", "created_at"],
                  note: "Deduplicated store of raw URLs.",
                },
                {
                  name: "ShortLink", color: C.teal,
                  fields: ["id (PK)", "short_code (unique)", "destination_id (FK)", "user_id (FK, nullable)", "status (active/disabled/expired)", "clicks", "created_at", "expires_at"],
                  note: "Central entity. Anonymous links have user_id = NULL.",
                },
                {
                  name: "User", color: "#9F7AEA",
                  fields: ["id (PK)", "username (unique)", "password_hash", "tier (free/pro/premium/admin)", "created_at"],
                  note: "Tier is embedded in the JWT on login.",
                },
              ].map(({ name, color, fields, note }) => (
                <div key={name} style={{
                  borderRadius: 10, border: `1px solid ${color}44`,
                  background: C.bgCard, overflow: "hidden",
                }}>
                  <div style={{
                    background: color + "18", borderBottom: `1px solid ${color}33`,
                    padding: "8px 14px", fontWeight: 800, fontSize: 13, color,
                    fontFamily: "monospace",
                  }}>
                    {name}
                  </div>
                  <ul style={{ margin: 0, padding: "10px 14px 10px 26px", fontSize: 12, color: C.textDim, lineHeight: 1.9 }}>
                    {fields.map(f => <li key={f} style={{ fontFamily: "monospace" }}>{f}</li>)}
                  </ul>
                  <div style={{
                    borderTop: `1px solid ${C.border}`, padding: "8px 14px",
                    fontSize: 11, color: C.textMuted, fontStyle: "italic",
                  }}>
                    {note}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18, fontSize: 13, color: C.textMuted, lineHeight: 1.8 }}>
              <strong style={{ color: C.textDim }}>Pydantic schemas</strong> mirror the ORM shapes over
              the wire:{" "}
              <Tag>URLCreate</Tag> / <Tag>URLResponse</Tag> for <code style={{ fontFamily: "monospace" }}>/shorten</code>,{" "}
              <Tag>URLAnalytics</Tag> for analytics, <Tag>PaginatedLinks</Tag> for link listing,
              and <Tag>UserCreate</Tag> / <Tag>UserResponse</Tag> for auth.
            </div>
          </Section>

          {/* ── Redis & Celery ── */}
          <Section id="redis-celery" title="Redis & Celery">
            <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8, margin: "0 0 20px" }}>
              Redis plays a dual role: a read-through URL cache, and the Celery broker/result backend.
              Click counts are buffered in Redis keys to avoid per-request Postgres writes.
            </p>

            {/* DIAGRAM 3 — background processing flow */}
            <DiagramPlaceholder
              label="Background Processing Flow"
              hint="Redirect request → Redis incr → Celery threshold flush → Postgres + Celery beat → periodic sync + expiry"
              imgSrc={backgroundFlowDiagram}
            />

            <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <InfoCard title="Redis key schema" accent={C.teal}>
                <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.9 }}>
                  <div style={{ marginBottom: 8 }}>
                    <code style={{ fontFamily: "monospace", color: C.teal }}>url:&#123;short_code&#125;</code>
                    <span style={{ marginLeft: 8, color: C.textMuted }}>→ original URL string, TTL 3600 s</span>
                  </div>
                  <div>
                    <code style={{ fontFamily: "monospace", color: C.teal }}>clicks:&#123;short_code&#125;</code>
                    <span style={{ marginLeft: 8, color: C.textMuted }}>→ integer counter, flushed on sync</span>
                  </div>
                </div>
              </InfoCard>
              <InfoCard title="Celery tasks" accent="#EF9F27">
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.textDim, lineHeight: 2 }}>
                  <li>
                    <code style={{ fontFamily: "monospace" }}>sync_all_clicks</code>
                    <span style={{ color: C.textMuted }}> — scans all <code>clicks:*</code> keys, adds counts to DB, clears keys. Runs every 60 s.</span>
                  </li>
                  <li>
                    <code style={{ fontFamily: "monospace" }}>sync_clicks_for_code</code>
                    <span style={{ color: C.textMuted }}> — targeted flush for a single code triggered at 50 buffered clicks.</span>
                  </li>
                  <li>
                    <code style={{ fontFamily: "monospace" }}>expiry_short_links</code>
                    <span style={{ color: C.textMuted }}> — marks expired links, invalidates cache, hard-deletes anonymous links older than 1 day. Runs every 10 min.</span>
                  </li>
                </ul>
              </InfoCard>
            </div>

            <div style={{ marginTop: 14 }}>
              <InfoCard title="Cache invalidation (invalidate_url_cache)" accent="#E24B4A">
                <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.8 }}>
                  Called when a link is disabled, expired, or force-flushed. It atomically reads and
                  deletes the <code style={{ fontFamily: "monospace" }}>clicks:&#123;code&#125;</code> key, adds any
                  buffered count to the DB row, then deletes the <code style={{ fontFamily: "monospace" }}>url:&#123;code&#125;</code> cache
                  entry. This prevents stale counts being lost during cache eviction.
                </div>
              </InfoCard>
            </div>
          </Section>

          {/* ── Tier System ── */}
          <Section id="tiers" title="Tier System">
            <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8, margin: "0 0 16px" }}>
              Every user belongs to a tier that controls two limits: how many <em>active</em> links they
              can hold simultaneously, and the maximum duration a link can live. Both limits are enforced
              server-side on <code style={{ fontFamily: "monospace" }}>POST /shorten</code>. The tier is
              embedded in the JWT payload on login so the frontend can display it without an extra request.
            </p>
            <TierTable />
            <div style={{ marginTop: 12, fontSize: 12, color: C.textMuted }}>
              ∞ = no server-enforced limit. Admin tier bypasses all quota checks entirely.
            </div>
          </Section>

          {/* ── API Reference ── */}
          <Section id="api" title="API Reference">
            <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8, margin: "0 0 16px" }}>
              All endpoints are served by FastAPI at the base URL configured in{" "}
              <code style={{ fontFamily: "monospace" }}>VITE_API_BASE_URL</code>. Interactive docs are
              available at <code style={{ fontFamily: "monospace" }}>/docs</code> (Swagger UI) and{" "}
              <code style={{ fontFamily: "monospace" }}>/redoc</code>. Authenticated endpoints require a
              Bearer token in the <code style={{ fontFamily: "monospace" }}>Authorization</code> header.
            </p>

            <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", background: C.bgCard }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bgInput, textAlign: "left" }}>
                    {["Method", "Path", "Description", "Auth"].map(h => (
                      <th key={h} style={{ padding: "8px 14px", color: C.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <EndpointRow method="GET"    path="/"                       desc="Health check — returns service status." />
                  <EndpointRow method="POST"   path="/auth/signup"            desc="Register a new user. Returns the persisted User object." />
                  <EndpointRow method="POST"   path="/auth/login"             desc="Authenticate and receive a JWT access token (1-hour TTL)." />
                  <EndpointRow method="POST"   path="/shorten"                desc="Create a short URL. Optional: custom_code, expires_at. Rate-limited to 10 req/min." auth />
                  <EndpointRow method="GET"    path="/links"                  desc="Paginated list of the caller's links. Admin sees all links across all users." auth />
                  <EndpointRow method="GET"    path="/{short_code}"           desc="Redirect to original URL. Served from Redis cache; increments click counter." />
                  <EndpointRow method="PUT"    path="/{short_code}"           desc="Re-enable a disabled link. Caller must own the link (or be admin)." auth />
                  <EndpointRow method="DELETE" path="/{short_code}"           desc="Soft-disable a link. Invalidates Redis cache atomically." auth />
                  <EndpointRow method="GET"    path="/analytics/{short_code}" desc="Return click count, status, and dates for a link. Caller must own the link." auth />
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 20 }}>
              <InfoCard title="Error shape" accent={C.textMuted}>
                <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.8 }}>
                  FastAPI validation errors follow{" "}
                  <code style={{ fontFamily: "monospace" }}>{"{ detail: string | [{msg, ...}] }"}</code>.
                  The frontend <code style={{ fontFamily: "monospace" }}>api.js</code> wrapper normalises
                  all error shapes — including custom <code style={{ fontFamily: "monospace" }}>{"{ error: { message, details } }"}</code> wrappers —
                  into a single <code style={{ fontFamily: "monospace" }}>Error.message</code> string that is
                  safe to display directly in toast notifications.
                </div>
              </InfoCard>
            </div>
          </Section>

          {/* ── Frontend Flow ── */}
          <Section id="frontend" title="Frontend Flow">
            <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8, margin: "0 0 20px" }}>
              The SPA is controlled by a custom router in <code style={{ fontFamily: "monospace" }}>App.jsx</code>.
              URL state is held in React state (no browser history manipulation), so all navigation is
              via the <code style={{ fontFamily: "monospace" }}>onNavigate</code> prop drilled to every page.
              Redirects (e.g. <code style={{ fontFamily: "monospace" }}>linksnip.io/aB3</code>) are handled
              entirely by the FastAPI backend — the React layer is never involved in production redirect traffic.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
              {[
                {
                  path: "/",
                  name: "LandingPage",
                  desc: "Public URL shortener form. Shows QR modal on success. Prompts unauthenticated users to log in for custom codes.",
                },
                {
                  path: "/login · /signup",
                  name: "AuthPage",
                  desc: "Tab-switching login/signup form. On success: calls /auth/login, decodes tier from JWT, stores token + user in AuthContext, navigates to /me.",
                },
                {
                  path: "/me",
                  name: "MePage",
                  desc: "Authenticated link dashboard. Paginated table with search + status filter, inline enable/disable, QR modal, and CreateLinkModal.",
                },
                {
                  path: "/analytics/:code",
                  name: "AnalyticsPage",
                  desc: "Per-link analytics: click count, creation date, expiry, avg/day stat card. Enable/disable toggle. Advanced breakdown is a future feature.",
                },
                {
                  path: "/docs",
                  name: "DocsPage",
                  desc: "This page. Architecture reference for contributors and reviewers.",
                },
              ].map(({ path, name, desc }) => (
                <div key={name} style={{
                  borderRadius: 10, border: `1px solid ${C.border}`,
                  background: C.bgCard, padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <code style={{ fontFamily: "monospace", fontSize: 11, color: C.teal, background: C.teal + "14", padding: "2px 7px", borderRadius: 4 }}>{path}</code>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>{desc}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18 }}>
              <InfoCard title="Auth flow detail" accent={C.teal}>
                <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.8 }}>
                  Token is stored in <code style={{ fontFamily: "monospace" }}>localStorage</code> and injected
                  into every API request by <code style={{ fontFamily: "monospace" }}>api.js</code>. The JWT
                  payload contains <code style={{ fontFamily: "monospace" }}>sub</code> (user ID) and{" "}
                  <code style={{ fontFamily: "monospace" }}>tier</code>. The frontend decodes the tier directly
                  from the token using <code style={{ fontFamily: "monospace" }}>atob(token.split('.')[1])</code>{" "}
                  — no separate profile endpoint is needed. Token TTL is 60 minutes (configurable via{" "}
                  <code style={{ fontFamily: "monospace" }}>ACCESS_TOKEN_EXPIRE_MINUTES</code> in{" "}
                  <code style={{ fontFamily: "monospace" }}>jwt.py</code>).
                </div>
              </InfoCard>
            </div>
          </Section>

          {/* ── Features ── */}
          <Section id="features" title="Notable Implementation Details">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                {
                  title: "Base62 short code generation",
                  body: "When no custom code is supplied, a temporary UUID-based code is flushed to the DB, the row ID is retrieved, and encode_base62(id) produces the final compact code. Reserved codes (docs, shorten, links, etc.) trigger a UUID fallback.",
                },
                {
                  title: "Custom code validation",
                  body: "Custom codes are validated against a 1–20 character regex (a-z, A-Z, 0-9, -, _). Reserved codes and already-taken codes return 400 with a clear error message.",
                },
                {
                  title: "Click threshold Celery dispatch",
                  body: "Every redirect increments clicks:{code} in Redis via INCR. If the returned value ≥ 50, sync_clicks_for_code.delay(code) is called immediately, keeping DB counts reasonably fresh for high-traffic links without per-request writes.",
                },
                {
                  title: "Atomic cache invalidation",
                  body: "invalidate_url_cache uses GETDEL (atomic get-and-delete) on the click key so no buffered clicks are lost when a link is disabled or expired mid-flight.",
                },
                {
                  title: "Anonymous link cleanup",
                  body: "expiry_short_links hard-deletes anonymous (user_id = NULL) links that have been in 'expired' status for more than 1 day, keeping the table from growing unbounded.",
                },
                {
                  title: "Rate limiting",
                  body: "POST /shorten is decorated with @limiter.limit('10/minute') via SlowAPI. The limiter uses the client's remote IP address. Exceeding the limit returns 429.",
                },
                {
                  title: "Admin override",
                  body: "Users with tier='admin' bypass link quotas entirely and can view analytics and enable/disable any link, not just their own. GET /links returns all links system-wide for admins.",
                },
                {
                  title: "Expiry enforcement (dual layer)",
                  body: "Links are soft-expired at redirect time (FastAPI checks expires_at on cache miss) and in bulk by the Celery beat task every 10 minutes. Both paths call invalidate_url_cache to keep Redis consistent.",
                },
              ].map(({ title, body }) => (
                <div key={title} style={{
                  borderRadius: 10, border: `1px solid ${C.border}`,
                  background: C.bgCard, padding: "16px 18px",
                }}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6, color: C.text }}>{title}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.75 }}>{body}</div>
                </div>
              ))}
            </div>
          </Section>

        </main>
      </div>
    </div>
  );
}