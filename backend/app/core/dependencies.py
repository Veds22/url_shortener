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

    if user.is_blocked:
        raise HTTPException(status_code=403, detail="This account has been blocked")

    token_version = payload.get("tv")
    if token_version is not None and token_version != user.token_version:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")

    return user


def require_admin(
        current_user: Optional[models.User] = Depends(get_current_user)
    ) -> models.User:
    """Dependency for admin-only endpoints.

    Unlike get_current_user (which allows anonymous access for endpoints
    like /shorten), admin endpoints require a valid, logged-in admin.
    """
    if current_user is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    if current_user.tier != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return current_user