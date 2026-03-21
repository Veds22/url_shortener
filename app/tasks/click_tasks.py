from app.core.celery_app import celery_app
from app.core.redis import redis_client
from app.database import SessionLocal
from app import models


@celery_app.task
def sync_all_clicks():
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