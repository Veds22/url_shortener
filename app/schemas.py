from pydantic import BaseModel, HttpUrl
from datetime import datetime

class URLCreate(BaseModel):
    url: HttpUrl
    
class URLResponse(BaseModel):
    id: int
    original_url: str
    short_code: str
    created_at: datetime