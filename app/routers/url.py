from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import update
import re

from app.database import engine, get_db
from app import models, schemas
from app.utils import encode_base62


RESERVED_CODES = {
    "docs",
    "openapi.json",
    "redoc",
    "sohrten",
    "analytics"
}

CODE_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{1,20}$")

router = APIRouter()

@router.get("/")
def read_root():
    return {
        "message": "URL Shrotener is running"
    }
    
@router.post("/shorten", response_model=schemas.URLResponse)
def create_short_url(
    request: Request,
    url_data: schemas.URLCreate,
    db: Session = Depends(get_db)
):
    
    # Step 1: Check for existince of same URL
    existing_url = db.query(models.URL).filter(models.URL.original_url == str(url_data.url)).first()
    if existing_url:
        if not url_data.custom_code:
            short_url = f"{request.base_url}{existing_url.short_code}"
            return {
                "id": existing_url.id,
                "original_url": existing_url.original_url,
                "short_code": existing_url.short_code,
                "short_url": short_url,
                "created_at": existing_url.created_at
            }
        else:
            raise HTTPException(status_code=400, detail="URL already exists with a different short code")
    
    
    if url_data.custom_code:
        code = url_data.custom_code
        if code.lower() in RESERVED_CODES:
            raise HTTPException(status_code=400, detail="Custom code is reserved and cannot be used")
        if not CODE_PATTERN.match(code):
            raise HTTPException(
                status_code=400, 
                detail="Custom code must be comprised of characters, numbers, '-' or '_' and 1-20 characters long"
            )
         
        existing_code = db.query(models.URL).filter(models.URL.short_code == code).first()
        if existing_code:
            raise HTTPException(status_code=400, detail="Custom code already in use")
        
        short_code = code
        new_url = models.URL(original_url=str(url_data.url),
                          short_code=short_code)
        db.add(new_url)
        db.commit()
        db.refresh(new_url)
    else:    
    # Step 2: Create DB entry without short_code
        new_url = models.URL(original_url=str(url_data.url))
        db.add(new_url)
        db.commit()
        db.refresh(new_url)
        
        # Step 3: Generate Base62 short_code
        short_code = encode_base62(new_url.id)
        
        # Step 4: Update Record
        new_url.short_code = short_code
        db.commit()
        db.refresh(new_url)
    
    short_url = f"{request.base_url}{short_code}"
    return {
        "id": new_url.id,
        "original_url": new_url.original_url,
        "short_code": new_url.short_code,
        "short_url": short_url,
        "created_at": new_url.created_at
    }
    
    

@router.get("/{short_code}")
def redirect_to_original(short_code: str, db: Session = Depends(get_db)):
    url_entry = db.query(models.URL).filter(models.URL.short_code == short_code).first()
    if not url_entry:
        raise HTTPException(status_code=404, detail="Short URL not found")
    
    db.execute(
        update(models.URL)
        .where(models.URL.short_code == short_code)
        .values(clicks = models.URL.clicks + 1)
    )
    db.commit()
    return RedirectResponse(url=url_entry.original_url)


@router.get("/analytics/{short_code}", response_model=schemas.URLAnalytics )
def get_analytics(short_code: str, db: Session = Depends(get_db)):
    
    url_entry = db.query(models.URL).filter(models.URL.short_code == short_code).first()
    if not url_entry:
        raise HTTPException(status_code=404, detail="Short URL not available")
    
    response = schemas.URLAnalytics(
        original_url=url_entry.original_url,
        short_code=url_entry.short_code,
        clicks=url_entry.clicks,
        created_at=url_entry.created_at
    )
    return response
