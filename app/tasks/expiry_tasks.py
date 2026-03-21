from app.core.celery_app import celery_app
from app.database import SessionLocal
from app import models
from app.core.utils import invalidate_url_cache
from datetime import datetime, timezone

@celery_app.task
def expiry_short_links():
    db = SessionLocal()
    
    try:   
        expired_links = db.query(models.ShortLink).filter(
            models.ShortLink.expires_at != None,
            models.ShortLink.expires_at <= datetime.now(timezone.utc),
            models.ShortLink.is_active == True
        )
        for link in expired_links:
            link.is_active = False
            invalidate_url_cache(link.short_code) 
        db.commit() 
    finally:
        db.close()