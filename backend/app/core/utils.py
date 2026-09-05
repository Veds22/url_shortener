import string
from datetime import datetime, timezone
# Rate limiting imports
from slowapi import Limiter
from slowapi.util import get_remote_address

BASE62 = string.ascii_lowercase + string.ascii_uppercase + string.digits


def ensure_utc(dt: datetime) -> datetime:
    """Return dt as an aware UTC datetime.

    SQLite drops timezone info when reading DateTime(timezone=True) columns,
    yielding naive datetimes that crash on comparison with aware ones.
    This helper re-attaches UTC when the info is missing, which is safe
    because all datetimes in this project are stored as UTC.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

BASE62 = string.ascii_lowercase + string.ascii_uppercase + string.digits


def encode_base62(num: int) -> str:
    """Encode an integer into a URL-safe base62 string.

    Used to derive compact short codes from the auto-incrementing
    database row ID when no custom short code is provided.
    """
    if num == 0:
        return BASE62[0]
    
    result = []
    base = len(BASE62)
    while num > 0:
        remainder = num % base
        result.append(BASE62[remainder])
        num //= base
        
    return ''.join(reversed(result))

def get_link_limit(tier: str) -> int:
    """Return the maximum number of active links allowed for a given tier.

    Tiers:
    - ``free``: 1 active link
    - ``pro``: 10 active links
    - ``premium`` and ``admin``: unlimited (returns ``None``)
    """
    limits = {
        "free": 1,
        "pro": 10,
        "premium": None,
        "admin": None
    }
    if tier not in limits:
        raise ValueError(f"Unknown tier: {tier}")
    return limits[tier]

def get_expiry_limit(tier: str) -> int:
    """Return the maximum expiry duration in days for a given tier.

    Tiers:
    - anonymous (handled elsewhere): 1 day
    - ``free``: 7 days
    - ``pro``: 90 days
    - ``premium`` and ``admin``: unlimited (returns ``None``)
    """
    limits = {
        "free": 7,
        "pro": 90,
        "premium": None,
        "admin": None
    }
    if tier not in limits:
        raise ValueError(f"Unknown tier: {tier}")
    return limits[tier]