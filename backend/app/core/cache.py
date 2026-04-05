from app.core.redis import redis_client
from app.database import SessionLocal
from app import models

def invalidate_url_cache(short_code: str):
    """Flush cached clicks for a short code and remove its URL cache entry.

    Any buffered click count stored in Redis for the given short code is
    atomically retrieved and, if greater than zero, added to the
    corresponding ShortLink.clicks column before the cache keys are
    deleted. This keeps analytics accurate when links are disabled,
    expired, or otherwise invalidated.
    """

    clicks = redis_client.getdel(f"clicks:{short_code}")
    
    if clicks and int(clicks) > 0:
        db = SessionLocal()
        try:
            url_entry = db.query(models.ShortLink).filter(
                models.ShortLink.short_code == short_code
                ).first()
            if url_entry:
                url_entry.clicks += int(clicks)
                db.commit()
        finally:
            db.close()
    
    redis_client.delete(f"clicks:{short_code}")
    redis_client.delete(f"url:{short_code}")