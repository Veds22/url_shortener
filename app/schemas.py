from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime

class URLCreate(BaseModel):
    url: HttpUrl
    custom_code: Optional[str] = None
    expires_at: Optional[datetime] = None
    
class URLResponse(BaseModel):
    id: int
    original_url: str
    short_code: str
    short_url: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    
class URLAnalytics(BaseModel):
    original_url: str
    short_code: str
    clicks: int
    created_at: datetime
    
class LinkListItem(BaseModel):
    id: int
    short_code: str
    original_url: str
    clicks: int
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime] = None
    
    class config:
        orm_mode = True


class PaginatedLinks(BaseModel):
    total: int
    page: int
    limit: int
    links: List[LinkListItem]