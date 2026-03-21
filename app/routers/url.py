from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import timedelta, timezone, datetime
import re
import uuid

from app.database import get_db
from app.core.utils import encode_base62
from app.middleware.rate_limiter import limiter
from app import models, schemas
from app.core.redis import redis_client
from app.core.utils import invalidate_url_cache

RESERVED_CODES = {
    "docs",
    "openapi.json",
    "redoc",
    "shorten",
    "analytics"
}

CODE_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{1,20}$")

DEFAULT_EXPIRY_DAYS = 7


router = APIRouter()

@router.get("/")
def read_root():
    return {
        "message": "URL Shrotener is running"
    }
    
DEFAULT_EXPIRY_DAYS = 7

@router.post("/shorten", response_model=schemas.URLResponse)
@limiter.limit("10/minute")
def create_short_url(
    request: Request,
    url_data: schemas.URLCreate,
    db: Session = Depends(get_db)
):
    
    now = datetime.now(timezone.utc)

    
    # Step 1: Expiry Logic
    if url_data.expires_at:
        if url_data.expires_at <= now:
            raise HTTPException(
                status_code=400,
                detail="Expiry must be in the future"
            )
        expiry_time = url_data.expires_at
    else:
        expiry_time = now + timedelta(days=DEFAULT_EXPIRY_DAYS)


    # Step 2: Get or Create Destination
    try:
        destination = models.Destination(
            original_url=str(url_data.url)
        )
        db.add(destination)
        db.commit()
        db.refresh(destination)
    except IntegrityError:
        db.rollback()
        destination = db.query(models.Destination).filter(
            models.Destination.original_url == str(url_data.url)
        ).first()
    destination_url = destination

    # Step 3: Custom Code Handling
    if url_data.custom_code:
        code = url_data.custom_code.lower().strip()

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
                destination_id=destination_url.id,
                short_code=code,
                expires_at=expiry_time
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

    # Step 4: Auto-Generated Code    
    else:
        # Generate a temporary code to ensure we get an ID for base62 encoding
        temp_code = f"temp-{uuid.uuid4().hex[:10]}"
        # Insert first to get ID
        new_url = models.ShortLink(
            destination_id=destination_url.id,
            short_code=temp_code,
            expires_at=expiry_time
        )
        db.add(new_url)
        db.flush()

        # Generate base62 from ID
        short_code = encode_base62(new_url.id)
        new_url.short_code = short_code
        db.commit()
        db.refresh(new_url)

    short_url = f"{request.base_url}{new_url.short_code}"

    return {
        "id": new_url.id,
        "original_url": destination_url.original_url,
        "short_code": new_url.short_code,
        "short_url": short_url,
        "created_at": new_url.created_at,
        "expires_at": new_url.expires_at
    }
    
# User endpoint for listing all short links with pagination
@router.get("/links", response_model=schemas.PaginatedLinks)
def list_links(
    page:int = 1,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    if page < 1 or limit < 1:
        raise HTTPException(
            status_code=400,
            detail="Page and limit must be positive integers"
        )

    offset = (page - 1) * limit
    total = db.query(models.ShortLink).count()
        
    links = (
        db.query(models.ShortLink)
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
            "is_active": link.is_active,
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
    
    
# Redirect logic for short code
@router.get("/{short_code}")
def redirect_to_original(short_code: str, db: Session = Depends(get_db)):
    
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

    if not url_entry.is_active:
        invalidate_url_cache(short_code)
        raise HTTPException(status_code=410, detail="URL is disabled")

    if url_entry.expires_at and url_entry.expires_at <= datetime.now(timezone.utc):
        url_entry.is_active = False
        db.commit()
        invalidate_url_cache(short_code)
        raise HTTPException(status_code=410, detail="URL has expired")

    redis_client.set(
        f"url:{short_code}",
        url_entry.destination.original_url,
        ex=3600
    )
    
    redis_client.incr(f"clicks:{short_code}")
    
    return RedirectResponse(url=url_entry.destination.original_url)


# User endpoints for enabling short links
@router.put("/{short_code}")
def enable_short_link(short_code: str, db: Session = Depends(get_db)):
    url_entry = db.query(models.ShortLink).filter(
        models.ShortLink.short_code == short_code
    ).first()

    if not url_entry:
        raise HTTPException(status_code=404, detail="Short URL not found")

    if url_entry.is_active:
        raise HTTPException(status_code=400, detail="Short URL is already active")

    url_entry.is_active = True
    db.commit()
    return {
        "message": f"Short URL with code '{short_code}' has been enabled"
    }


# User endpoints for disabling short links by soft delete
@router.delete("/{short_code}")
def disable_short_link(short_code: str, db: Session = Depends(get_db)):
    url_entry = db.query(models.ShortLink).filter(
        models.ShortLink.short_code == short_code
    ).first()

    if not url_entry:
        raise HTTPException(status_code=404, detail="Short URL not found")

    if not url_entry.is_active:
        raise HTTPException(status_code=410, detail="Short URL is already disabled")

    url_entry.is_active = False
    invalidate_url_cache(short_code)
    
    db.commit()
    return {
        "message": f"Short URL with code '{short_code}' has been disabled"
    }



# User endpoint for analytics of short links
@router.get("/analytics/{short_code}", response_model=schemas.URLAnalytics )
def get_analytics(short_code: str, db: Session = Depends(get_db)):
    url_entry = db.query(models.ShortLink).filter(models.ShortLink.short_code == short_code).first()
    if not url_entry:
        raise HTTPException(status_code=404, detail="Short URL not available")
    
    response = schemas.URLAnalytics(
        original_url=url_entry.destination.original_url,
        short_code=url_entry.short_code,
        clicks=url_entry.clicks,
        created_at=url_entry.created_at
    )
    return response
 
        