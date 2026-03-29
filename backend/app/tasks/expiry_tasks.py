from app.core.celery_app import celery_app
from app.database import SessionLocal
from app import models
from app.core.cache import invalidate_url_cache
from datetime import datetime, timezone, timedelta

@celery_app.task
def expiry_short_links():
    """Soft-expire and clean up outdated short links.

    Marks active links whose ``expires_at`` is in the past as ``expired``
    and invalidates their cache entries. Additionally, anonymously owned
    links that have been expired for more than one day are hard-deleted
    in bulk to keep the table size under control.
    """
    db = SessionLocal()
    
    try:  
        now = datetime.now(timezone.utc)
         
        expired_links = db.query(models.ShortLink).filter(
            models.ShortLink.expires_at != None,
            models.ShortLink.expires_at <= now,
            models.ShortLink.status == "active"
        )
        for link in expired_links:
            link.status = "expired"
            invalidate_url_cache(link.short_code)
        db.commit()
        hard_delete_before = now - timedelta(days=1)
        db.query(models.ShortLink).filter(
            models.ShortLink.user_id == None,
            models.ShortLink.status == "expired",
            models.ShortLink.created_at <= hard_delete_before
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()