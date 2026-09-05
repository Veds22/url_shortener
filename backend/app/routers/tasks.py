"""
HTTP-triggered task endpoints — a lightweight replacement for Celery beat.

Since this project runs on free-tier infrastructure (no Railway/Celery worker),
these endpoints expose the three periodic tasks as plain HTTP POST routes that
can be called by an external cron service (cron-job.org) once per hour.

All endpoints require a CRON_SECRET header matching the CRON_SECRET env var
so that random callers can't trigger expensive DB operations.
"""
import os
import logging

from fastapi import APIRouter, Header, HTTPException
from app.core.redis import redis_client
from app.database import SessionLocal
from app import models
from app.core.cache import invalidate_url_cache
from app.core.geoip import lookup_ip
from datetime import datetime, timezone
import json

logger = logging.getLogger("app.routers.tasks")

router = APIRouter(tags=["tasks"])

CRON_SECRET = os.getenv("CRON_SECRET", "")


def _verify_secret(x_cron_secret: str = ""):
    """Raise 401 if the caller doesn't supply the correct CRON_SECRET header."""
    if not CRON_SECRET:
        raise HTTPException(
            status_code=500,
            detail="CRON_SECRET is not configured on the server"
        )
    if x_cron_secret != CRON_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing cron secret")


GEO_ENRICHMENT_BATCH_SIZE = 50


# ── sync clicks ──────────────────────────────────────────────────────────────

@router.post("/sync-clicks")
def sync_clicks(x_cron_secret: str = Header(default="")):
    """Flush all buffered click counts from Redis into the database.

    Equivalent to the Celery sync_all_clicks task.
    Call this every hour via cron-job.org.
    """
    _verify_secret(x_cron_secret)

    db = SessionLocal()
    updated = 0
    try:
        keys = redis_client.keys("clicks:*")
        for key in keys:
            short_code = key.split(":")[1]
            raw = redis_client.get(key)
            if raw is None:
                continue
            clicks = int(raw)
            if clicks > 0:
                db.query(models.ShortLink).filter(
                    models.ShortLink.short_code == short_code
                ).update({models.ShortLink.clicks: models.ShortLink.clicks + clicks})
                redis_client.delete(key)
                updated += 1
        db.commit()
    finally:
        db.close()

    logger.info("sync-clicks: flushed %d keys", updated)
    return {"ok": True, "keys_flushed": updated}


# ── enrich click events ──────────────────────────────────────────────────────

@router.post("/enrich-clicks")
def enrich_clicks(x_cron_secret: str = Header(default="")):
    """Drain the pending_click_events Redis queue and write ClickEvent rows.

    Equivalent to the Celery enrich_click_events task.
    Call this every hour via cron-job.org.
    """
    _verify_secret(x_cron_secret)

    db = SessionLocal()
    processed = 0
    skipped = 0

    try:
        for _ in range(GEO_ENRICHMENT_BATCH_SIZE):
            raw = redis_client.lpop("pending_click_events")
            if raw is None:
                break

            try:
                event = json.loads(raw)
                short_code = event["short_code"]
                ip = event.get("ip", "")
            except (json.JSONDecodeError, KeyError):
                logger.warning("Skipping malformed click event: %r", raw)
                skipped += 1
                continue

            short_link = db.query(models.ShortLink).filter(
                models.ShortLink.short_code == short_code
            ).first()

            if short_link is None:
                skipped += 1
                continue

            geo = lookup_ip(ip)
            db.add(models.ClickEvent(
                short_link_id=short_link.id,
                country_code=geo["country_code"],
                region=geo["region"],
                city=geo["city"],
            ))
            processed += 1

        db.commit()
    finally:
        db.close()

    logger.info("enrich-clicks: processed=%d skipped=%d", processed, skipped)
    return {"ok": True, "processed": processed, "skipped": skipped}


# ── expire links ─────────────────────────────────────────────────────────────

@router.post("/expire-links")
def expire_links(x_cron_secret: str = Header(default="")):
    """Soft-expire links whose expires_at has passed.

    Equivalent to the Celery expiry_short_links task.
    Call this every hour via cron-job.org.
    """
    _verify_secret(x_cron_secret)

    db = SessionLocal()
    expired = 0

    try:
        now = datetime.now(timezone.utc)
        links = db.query(models.ShortLink).filter(
            models.ShortLink.expires_at != None,
            models.ShortLink.expires_at <= now,
            models.ShortLink.status == "active"
        ).all()

        for link in links:
            link.status = "expired"
            invalidate_url_cache(link.short_code)
            expired += 1

        db.commit()
    finally:
        db.close()

    logger.info("expire-links: expired %d links", expired)
    return {"ok": True, "links_expired": expired}