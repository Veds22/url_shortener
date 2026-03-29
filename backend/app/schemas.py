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
    
# schemas.py
class URLAnalytics(BaseModel):
    original_url: str
    short_code: str
    clicks: int
    created_at: datetime
    status: str         
    expires_at: Optional[datetime] = None  
    
class UserCreate(BaseModel):
    username: str
    password: str
    
class UserResponse(BaseModel):
    id: int
    username: str
    tier: str
    
    class Config:
        from_attributes = True

class LinkListItem(BaseModel):
    id: int
    short_code: str
    original_url: str
    clicks: int
    status: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PaginatedLinks(BaseModel):
    total: int
    page: int
    limit: int
    links: List[LinkListItem]