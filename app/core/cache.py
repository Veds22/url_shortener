from app.core.redis import redis_client

def invalidate_url_cache(short_code: str):
    
    redis_client.delete(f"url:{short_code}")
    redis_client.delete(f"clicks:{short_code}")