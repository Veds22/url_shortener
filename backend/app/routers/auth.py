from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import timedelta, timezone, datetime

from app.database import get_db
from app.schemas import UserResponse, UserCreate, UserLogin
from app.core.security import hash_password, verify_password
from app.core.jwt import create_access_token, verify_access_token
from app import models


router = APIRouter()

@router.post("/signup", response_model=UserResponse)   
def signup(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account and return the persisted user.

    The username must be unique; passwords are hashed before storing.
    New users are created with the default tier configured on the User model.
    """
    existing_user = db.query(models.User).filter(
        (models.User.username == user_data.username) |
        (models.User.email == user_data.email)
    ).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    hashed_password = hash_password(user_data.password)

    new_user = models.User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.post("/login")
def login(request: Request, user_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate a user and return a JWT access token.

    Validates the provided credentials against the stored password hash and
    issues a short-lived bearer token used by protected endpoints. Blocked
    accounts are rejected here rather than at each individual endpoint.
    """
    db_user = db.query(models.User).filter(
        models.User.username == user_data.username
    ).first()

    if not db_user or not verify_password(user_data.password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid Credentials")

    if db_user.is_blocked:
        raise HTTPException(status_code=403, detail="This account has been blocked")

    # Create a JWT token, embedding the user's tier and a token_version so
    # tokens issued before a future forced-logout (e.g. password reset,
    # blocking) can be invalidated without a token blocklist.
    access_token = create_access_token(data={
        "sub": str(db_user.id),
        "tier": db_user.tier,
        "tv": db_user.token_version,
    })
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }