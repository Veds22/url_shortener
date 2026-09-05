# LinkSnip — URL Shortener

A full-stack URL shortener with QR code generation, click analytics, tier-based access control, and Redis-backed caching.

**Live:** https://linksnip-iota.vercel.app · **API:** https://linksnip-api.onrender.com

---

## Features

- Shorten any URL with auto-generated base62 codes or custom aliases
- QR code generation and PNG download for every short link
- Click analytics — total clicks, created/expiry dates, per-link status
- JWT authentication with user tiers (Free / Pro / Premium / Admin)
- Tier-based limits — link count and expiry duration enforced server-side
- Redis click buffering — counts batch-synced to PostgreSQL via Celery
- Cache invalidation on link disable/expire
- Rate limiting on the shorten endpoint (10 req/min per IP)
- Admin role with unrestricted access across all user links
- Soft disable/enable links without deletion
- Automatic expiry — Celery beat marks links expired every 24h
- Hard delete of anonymous expired links older than 1 day

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, SQLAlchemy, PostgreSQL |
| Cache | Redis (Upstash) |
| Task queue | Celery + Celery Beat |
| Auth | JWT (python-jose) |
| Frontend | React + Vite |
| Deployment | Render (API + Celery), Vercel (frontend), Supabase (DB), Upstash (Redis) |

---

## Architecture

```
Browser → Vercel (React SPA)
              ↓
        Render (FastAPI)
         ├── Supabase (PostgreSQL)
         ├── Upstash (Redis) ← click buffer + URL cache
         └── Render Worker (Celery)
              ├── sync_all_clicks (every 60s)
              └── expiry_short_links (every 24h)
```

**Redirect flow:**
1. `GET /{code}` hits FastAPI
2. Redis cache checked first (~5ms hit)
3. Cache miss → PostgreSQL lookup (~50ms)
4. 307 redirect issued, URL cached for 1 hour
5. Click counter incremented in Redis
6. At 50 buffered clicks → immediate DB sync via Celery task

---

## Local Development

```bash
# Clone and start all services
git clone https://github.com/your-username/linksnip
cd linksnip/backend
cp .env.example .env        # fill in values
docker compose up --build
```

Services:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Frontend: http://localhost:5173 (run separately)

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string (`rediss://` for Upstash) |
| `SECRET_KEY` | JWT signing secret |
| `ALGORITHM` | JWT algorithm (HS256) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/signup` | — | Register user |
| POST | `/login` | — | Get JWT token |
| POST | `/shorten` | optional | Create short link |
| GET | `/{code}` | — | Redirect to original URL |
| GET | `/links` | required | List user's links |
| GET | `/analytics/{code}` | required | Link analytics |
| PUT | `/{code}` | required | Enable link |
| DELETE | `/{code}` | required | Disable link |

---

## User Tiers

| Tier | Active links | Max expiry |
|---|---|---|
| Free | 1 | 7 days |
| Pro | 10 | 90 days |
| Premium | Unlimited | No limit |
| Admin | Unlimited | No limit + full access |

---
