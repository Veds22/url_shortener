from pydantic import BaseModel, HttpUrl, EmailStr
from typing import Optional, List
from datetime import datetime, date

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
    status: str         
    expires_at: Optional[datetime] = None  
    
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    tier: str

    class Config:
        from_attributes = True


class AdminUserListItem(BaseModel):
    """Row shape for the admin user-management table (Phase 2)."""
    id: int
    username: str
    email: Optional[str] = None
    tier: str
    is_blocked: bool
    created_at: datetime
    link_count: int

    class Config:
        from_attributes = True


class PaginatedAdminUsers(BaseModel):
    total: int
    page: int
    limit: int
    users: List[AdminUserListItem]


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


class AdminUserDetail(BaseModel):
    """Full detail shown when an admin drills into a single user."""
    id: int
    username: str
    email: Optional[str] = None
    tier: str
    is_blocked: bool
    created_at: datetime
    links: List[LinkListItem]

    class Config:
        from_attributes = True


class PaginatedLinks(BaseModel):
    total: int
    page: int
    limit: int
    links: List[LinkListItem]


class URLResolve(BaseModel):
    short_code: str
    status: str
    original_url: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None


class DailyClickPoint(BaseModel):
    """One point in a click-count-over-time chart. Days with zero clicks
    are included (not omitted) so the frontend can render a continuous
    line/bar chart without gaps."""
    date: date
    clicks: int


class AnalyticsTimeseries(BaseModel):
    short_code: str
    days: int
    data: List[DailyClickPoint]


class GeoBreakdownItem(BaseModel):
    # None represents clicks that haven't been geo-enriched yet (Celery
    # beat runs enrichment every 5 minutes, so there's always a small
    # window of un-enriched clicks) or where the IP couldn't be resolved
    # (private/reserved ranges, VPNs pointing at unmapped ranges, etc).
    country_code: Optional[str]
    clicks: int


class AnalyticsGeoBreakdown(BaseModel):
    short_code: str
    data: List[GeoBreakdownItem]