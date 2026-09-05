from app.core.celery_app import celery_app
from app.core.redis import redis_client
from app.database import SessionLocal
from app import models
from app.core.geoip import lookup_ip
import json
import logging

logger = logging.getLogger("app.tasks.click_tasks")

GEO_ENRICHMENT_BATCH_SIZE = 50


@celery_app.task
def sync_all_clicks():
    """Aggregate buffered click counts from Redis into the database.

    This task is scheduled periodically by Celery beat (every 60 seconds)
    and scans all ``clicks:*`` keys, incrementing the corresponding
    ShortLink.clicks counters and clearing the Redis buffers.
    """
    db = SessionLocal()
    
    keys = redis_client.keys("clicks:*")
    
    for key in keys:
        short_code = key.split(":")[1]
        clicks = int(redis_client.get(key))
        if clicks > 0:
            db.query(models.ShortLink).filter(models.ShortLink.short_code == short_code).update(
                {models.ShortLink.clicks: models.ShortLink.clicks + clicks}
            )
            redis_client.delete(key)
    db.commit()
    db.close()
    
@celery_app.task
def sync_clicks_for_code(short_code: str):
    """Flush buffered clicks for a single short code from Redis to the DB.

    Used as a targeted optimization when a link receives at least 50
    buffered clicks, avoiding per-request writes while keeping counts
    reasonably fresh for analytics.
    """
    db = SessionLocal()
    
    key =  f"clicks:{short_code}"
    clicks = int(redis_client.get(key) or 0) 
    if clicks > 0:
        db.query(models.ShortLink).filter(models.ShortLink.short_code == short_code).update(
            {models.ShortLink.clicks: models.ShortLink.clicks + clicks}
        )
        redis_client.delete(key)
    db.commit()
    db.close()


@celery_app.task
def enrich_click_events():
    """Consume queued click events (see queue_click_for_geo_enrichment in
    app.routers.url) and turn each into a ClickEvent row enriched with
    geo data from the local GeoLite2 database.

    Processes up to GEO_ENRICHMENT_BATCH_SIZE events per run to bound
    how long a single task execution takes — Celery beat calls this
    frequently enough (see celery_app.py) that the queue doesn't build
    up meaningfully between runs.

    Deliberately resilient: a single bad event (unresolvable short_code,
    malformed payload) is skipped rather than aborting the whole batch,
    since one bad click record shouldn't block enrichment for the rest.
    """
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
                # Link may have been deleted between the click and enrichment
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

    if processed or skipped:
        logger.info("enrich_click_events: processed=%d skipped=%d", processed, skipped)