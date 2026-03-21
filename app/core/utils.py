import string
from fastapi import HTTPException
# Rate limiting imports
from slowapi import Limiter
from slowapi.util import get_remote_address

BASE62 = string.ascii_lowercase + string.ascii_uppercase + string.digits

limiter = Limiter(key_func=get_remote_address)

def encode_base62(num: int) -> str:
    if num == 0:
        return BASE62[0]
    
    result = []
    base = len(BASE62)
    while num > 0:
        remainder = num % base
        result.append(BASE62[remainder])
        num //= base
        
    return ''.join(reversed(result))


from app.core.redis import redis_client
from app.database import SessionLocal
from app import models

def invalidate_url_cache(short_code: str):
    
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