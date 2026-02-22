from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime

class URLCreate(BaseModel):
    url: HttpUrl
    custom_code: Optional[str] = None
    
class URLResponse(BaseModel):
    id: int
    original_url: str
    short_code: str
    short_url: str
    created_at: datetime
    
class URLAnalytics(BaseModel):
    original_url: str
    short_code: str
    clicks: int
    created_at: datetime