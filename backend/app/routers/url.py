from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import timedelta, timezone, datetime
from typing import Optional
import re
import uuid

from app.database import get_db
from app.core.utils import encode_base62, get_link_limit, get_expiry_limit
from app.middleware.rate_limiter import limiter
from app import models, schemas
from app.core.redis import redis_client
from app.core.cache import invalidate_url_cache
from app.core.dependencies import get_current_user

RESERVED_CODES = {
    "docs",
    "openapi.json",
    "redoc",
    "shorten",
    "analytics",
    "links",
    "login",
    "signup",
    "admin",
}

CODE_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{1,20}$")

router = APIRouter()


@router.get("/")
def read_root():
    """Health check endpoint."""
    return {"message": "URL Shortener is running"}


@router.post("/shorten", response_model=schemas.URLResponse)
@limiter.limit("10/minute")
def create_short_url(
    request: Request,
    url_data: schemas.URLCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user)
):
    """
    Create a new short URL.

    - If `custom_code` is provided, uses it as the short code.
    - If not, auto-generates a base62 short code from the DB row ID.
    - If the destination URL already exists, reuses the existing Destination record.
    - Expiry defaults to 7 days if not provided.
    """
    now = datetime.now(timezone.utc)

    user_id = current_user.id if current_user else None
    
    if user_id is not None and current_user.tier != "admin":
        limit = get_link_limit(current_user.tier)
        user_links_count = db.query(models.ShortLink).filter(
            models.ShortLink.user_id == user_id,
            models.ShortLink.status == "active"
        ).count()
        if limit is not None and user_links_count >= limit:
            raise HTTPException(
                status_code=403,
                detail=f"Link creation limit reached for your tier ({limit} links)"
            )
        
    # Set expiry based on user tier
    
    if url_data.expires_at is not None and url_data.expires_at <= now:
        raise HTTPException(
            status_code=400,
            detail="Expiry time must be in the future"
        )
    
    if user_id is None:
        max_expiry = now + timedelta(days=1)
        if url_data.expires_at is not None and url_data.expires_at > max_expiry:
            raise HTTPException(
                status_code=400,
                detail="Unauthenticated users cannot set expiry beyond 1 day"
            )
        expiry_time = url_data.expires_at or max_expiry

        
    else:
        expiry_limit = get_expiry_limit(current_user.tier)
        if expiry_limit is not None:
            max_expiry = now + timedelta(days=expiry_limit)
            if url_data.expires_at is not None and url_data.expires_at > max_expiry:
                raise HTTPException(
                    status_code=400,
                    detail=f"Expiry time exceeds maximum allowed for your tier ({expiry_limit} days)"
                )
            expiry_time = url_data.expires_at or max_expiry
        else:
            expiry_time = url_data.expires_at
        

    try:
        destination = models.Destination(original_url=str(url_data.url))
        db.add(destination)
        db.commit()
        db.refresh(destination)
    except IntegrityError:
        db.rollback()
        destination = db.query(models.Destination).filter(
            models.Destination.original_url == str(url_data.url)
        ).first()

    if url_data.custom_code:
        code = url_data.custom_code.strip()

        if code in RESERVED_CODES:
            raise HTTPException(
                status_code=400,
                detail="Custom code is reserved"
            )

        if not CODE_PATTERN.match(code):
            raise HTTPException(
                status_code=400,
                detail="Custom code must be 1-20 characters and contain only letters, numbers, '-' or '_'"
            )

        try:
            new_url = models.ShortLink(
                destination_id=destination.id,
                short_code=code,
                expires_at=expiry_time,
                status="active",
                user_id=user_id
            )
            db.add(new_url)
            db.commit()
            db.refresh(new_url)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail="Custom code is already in use"
            )

    else:
        temp_code = f"temp-{uuid.uuid4().hex[:10]}"
        new_url = models.ShortLink(
            destination_id=destination.id,
            short_code=temp_code,
            expires_at=expiry_time,
            status="active",
            user_id=user_id
        )
        db.add(new_url)
        db.flush()

        new_url.short_code = encode_base62(new_url.id)
        if new_url.short_code in RESERVED_CODES:
            new_url.short_code = f"code-{uuid.uuid4().hex[:8]}"
        db.commit()
        db.refresh(new_url)

    short_url = f"{request.base_url}{new_url.short_code}"

    return {
        "id": new_url.id,
        "original_url": destination.original_url,
        "short_code": new_url.short_code,
        "short_url": short_url,
        "created_at": new_url.created_at,
        "expires_at": new_url.expires_at
    }


@router.get("/links", response_model=schemas.PaginatedLinks)
def list_links(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List short links with pagination.

    - Unauthenticated requests are rejected with 401.
    - Admin user (tier='admin') sees all links across all users.
    - Regular users see only their own links.
    """
    if page < 1 or limit < 1:
        raise HTTPException(
            status_code=400,
            detail="Page and limit must be positive integers"
        )

    offset = (page - 1) * limit

    query = db.query(models.ShortLink)

    if current_user.tier != "admin":
        query = query.filter(models.ShortLink.user_id == current_user.id)

    total = query.count()

    links = (
        query
        .order_by(models.ShortLink.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    data = [
        {
            "id": link.id,
            "short_code": link.short_code,
            "original_url": link.destination.original_url,
            "clicks": link.clicks,
            "status": link.status,
            "created_at": link.created_at,
            "expires_at": link.expires_at
        }
        for link in links
    ]

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "links": data
    }


@router.get("/{short_code}")
def redirect_to_original(short_code: str, db: Session = Depends(get_db)):
    """
    Redirect to the original URL for a given short code.

    Cache hit path:
        - Fetches the original URL directly from Redis.
        - Increments click counter in Redis.
        - If clicks reach 50, triggers an async Celery task to sync
          the buffered click count to the database.

    Cache miss path:
        - Queries the database for the short link.
        - Returns 404 if not found.
        - Returns 410 if status is disabled or expired.
        - If expires_at has passed, updates status to expired in DB,
          invalidates cache, and returns 410.
        - On a valid link, caches the URL in Redis for 3600 seconds
          and increments the click counter.
    """
    cached_url = redis_client.get(f"url:{short_code}")
    if cached_url:
        new_count = redis_client.incr(f"clicks:{short_code}")
        if new_count >= 50:
            from app.tasks.click_tasks import sync_clicks_for_code
            sync_clicks_for_code.delay(short_code)
        return RedirectResponse(url=cached_url)

    url_entry = db.query(models.ShortLink).filter(
        models.ShortLink.short_code == short_code
    ).first()

    if not url_entry:
        raise HTTPException(status_code=404, detail="Short URL not found")

    if url_entry.status == "disabled":
        raise HTTPException(status_code=410, detail="URL is disabled")

    if url_entry.status == "expired":
        raise HTTPException(status_code=410, detail="URL has expired")

    if url_entry.expires_at and url_entry.expires_at <= datetime.now(timezone.utc):
        url_entry.status = "expired"
        db.commit()
        invalidate_url_cache(short_code)
        raise HTTPException(status_code=410, detail="URL has expired")

    redis_client.set(
        f"url:{short_code}",
        url_entry.destination.original_url,
        ex=3600
    )
    redis_client.incr(f"clicks:{short_code}")

    return {
        'result': 'success',
        'original_url': url_entry.destination.original_url
    }


@router.put("/{short_code}")
def enable_short_link(short_code: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Re-enable a previously disabled short link.

    Returns 404 if the short code does not exist.
    Returns 400 if the link is already active.
    """
    url_entry = db.query(models.ShortLink).filter(
        models.ShortLink.short_code == short_code,
    ).first()

    if not url_entry:
        raise HTTPException(status_code=404, detail="Short URL not found")

    if url_entry.user_id != current_user.id and current_user.tier != "admin":
        raise HTTPException(status_code=403, detail="Unauthorised to enable this URL")

    if url_entry.status == "active":
        raise HTTPException(status_code=400, detail="Short URL is already active")

    url_entry.status = "active"
    db.commit()

    return {"message": f"Short URL '{short_code}' has been enabled"}


@router.delete("/{short_code}")
def disable_short_link(short_code: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Disable a short link via soft delete.

    Invalidates the Redis cache so subsequent requests are not served
    the stale cached URL.

    Returns 404 if the short code does not exist.
    Returns 410 if the link is already disabled.
    """
    url_entry = db.query(models.ShortLink).filter(
        models.ShortLink.short_code == short_code
    ).first()

    if not url_entry:
        raise HTTPException(status_code=404, detail="Short URL not found")
    
    if url_entry.user_id != current_user.id and current_user.tier != "admin":
        raise HTTPException(status_code=403, detail="Unauthorised to disable this URL")

    if url_entry.status == "disabled":
        raise HTTPException(status_code=410, detail="Short URL is already disabled")

    url_entry.status = "disabled"
    db.commit()
    invalidate_url_cache(short_code)

    return {"message": f"Short URL '{short_code}' has been disabled"}


@router.get("/analytics/{short_code}", response_model=schemas.URLAnalytics)
def get_analytics(short_code: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Retrieve analytics for a short link.

    Returns click count, original URL, short code, and creation date.
    Note: clicks shown reflect the last DB sync — buffered Redis clicks
    may not yet be included until the next Celery sync task runs.
    """
    url_entry = db.query(models.ShortLink).filter(
        models.ShortLink.short_code == short_code,
    ).first()

    if not url_entry:
        raise HTTPException(status_code=404, detail="Short URL not available")

    if url_entry.user_id != current_user.id and current_user.tier != "admin":
        raise HTTPException(status_code=403, detail="Unauthorised to view analytics for this URL")

    return schemas.URLAnalytics(
        original_url=url_entry.destination.original_url,
        short_code=url_entry.short_code,
        clicks=url_entry.clicks,
        created_at=url_entry.created_at,
        status=url_entry.status,       
        expires_at=url_entry.expires_at
    )