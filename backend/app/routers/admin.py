from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models, schemas
from app.core.dependencies import require_admin

router = APIRouter()


@router.get("/users", response_model=schemas.PaginatedAdminUsers)
def list_users(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    """
    List all users for the admin panel, with each user's link count.

    Paginated the same way as /links, for consistency with the rest of
    the API.
    """
    if page < 1 or limit < 1:
        raise HTTPException(
            status_code=400,
            detail="Page and limit must be positive integers"
        )

    offset = (page - 1) * limit

    query = (
        db.query(
            models.User,
            func.count(models.ShortLink.id).label("link_count")
        )
        .outerjoin(models.ShortLink, models.ShortLink.user_id == models.User.id)
        .group_by(models.User.id)
    )

    total = query.count()

    rows = (
        query
        .order_by(models.User.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    users = [
        schemas.AdminUserListItem(
            id=user.id,
            username=user.username,
            email=user.email,
            tier=user.tier,
            is_blocked=user.is_blocked,
            created_at=user.created_at,
            link_count=link_count,
        )
        for user, link_count in rows
    ]

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "users": users,
    }


@router.get("/users/{user_id}", response_model=schemas.AdminUserDetail)
def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    """Full detail view for a single user, including all their links."""
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    links = [
        {
            "id": link.id,
            "short_code": link.short_code,
            "original_url": link.destination.original_url,
            "clicks": link.clicks,
            "status": link.status,
            "created_at": link.created_at,
            "expires_at": link.expires_at,
        }
        for link in user.short_links
    ]

    return schemas.AdminUserDetail(
        id=user.id,
        username=user.username,
        email=user.email,
        tier=user.tier,
        is_blocked=user.is_blocked,
        created_at=user.created_at,
        links=links,
    )


@router.put("/users/{user_id}/block")
def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    """
    Block a user, immediately preventing login and invalidating any
    active session (via the token_version bump, checked on every
    authenticated request).

    Admins cannot block other admins, and cannot block themselves —
    both would risk locking out the only account able to undo it.
    """
    target_user = _get_blockable_target(db, admin, user_id)

    if target_user.is_blocked:
        raise HTTPException(status_code=400, detail="User is already blocked")

    target_user.is_blocked = True
    target_user.token_version += 1
    db.commit()

    return {"message": f"User '{target_user.username}' has been blocked"}


@router.put("/users/{user_id}/unblock")
def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    """Unblock a previously blocked user, restoring their ability to log in."""
    target_user = db.query(models.User).filter(models.User.id == user_id).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not target_user.is_blocked:
        raise HTTPException(status_code=400, detail="User is not blocked")

    target_user.is_blocked = False
    db.commit()

    return {"message": f"User '{target_user.username}' has been unblocked"}


def _get_blockable_target(db: Session, admin: models.User, user_id: int) -> models.User:
    """Shared lookup + guardrails for the block endpoint."""
    target_user = db.query(models.User).filter(models.User.id == user_id).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.id == admin.id:
        raise HTTPException(status_code=403, detail="You cannot block your own account")

    if target_user.tier == "admin":
        raise HTTPException(status_code=403, detail="Admins cannot block other admins")

    return target_user