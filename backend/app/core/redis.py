import os
import redis

REDIS_URL = os.getenv("REDIS_URL")

if not REDIS_URL:
    raise ValueError("REDIS_URL is not set")

def get_redis_client():
    return redis.Redis.from_url(
        REDIS_URL,
        decode_responses=True,
        ssl=True,
        ssl_cert_reqs="none",
    )
    
redis_client = get_redis_client()