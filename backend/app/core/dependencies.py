from typing import Optional
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer

from app import models
from app.database import get_db
from app.core.jwt import verify_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)
def get_current_user(
        token:Optional[str] = Depends(oauth2_scheme), 
        db: Session = Depends(get_db)
    ) -> Optional[models.User]:
    
    if token is None:
        return None
    
    payload = verify_access_token(token)
    if payload is None:
        return None
    
    user_id = int(payload.get("sub"))
    
    user = db.query(models.User).filter(
        models.User.id == user_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user
    
    