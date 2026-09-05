"""
Seed the two static demo accounts (Admin + Pro) used on the login page's
"Explore as Admin/Pro" buttons, plus a handful of dummy non-admin users so
the admin panel has real entries to block/unblock in a demo.

Usage (run once against a fresh DB, from the backend/ directory):

    python -m scripts.seed_demo_data

Safe to re-run: existing demo/dummy accounts are detected by username and
skipped rather than duplicated. This is a one-time manual seed, not a
recurring job — see project notes on why these accounts are static rather
than reset on a schedule.
"""
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

# Allow running as `python -m scripts.seed_demo_data` from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app import models
from app.core.security import hash_password
from app.core.utils import encode_base62

DEMO_ADMIN = {"username": "demo.admin", "email": "demo.admin@linksnip.app", "password": "DemoAdmin123!"}
DEMO_PRO = {"username": "demo.pro", "email": "demo.pro@linksnip.app", "password": "DemoPro123!"}

# Extra non-admin users purely so the admin panel has real rows to act on.
DUMMY_USERS = [
    {"username": "dummy.rahul", "email": "rahul@example.com", "password": "DummyPass123!", "tier": "free"},
    {"username": "dummy.sara", "email": "sara@example.com", "password": "DummyPass123!", "tier": "free"},
    {"username": "dummy.kenji", "email": "kenji@example.com", "password": "DummyPass123!", "tier": "pro"},
]

now = datetime.now(timezone.utc)


def get_or_create_user(db, username, email, password, tier):
    user = db.query(models.User).filter(models.User.username == username).first()
    if user:
        print(f"  '{username}' already exists, skipping creation")
        return user

    user = models.User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        tier=tier,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"  created user '{username}' (tier={tier})")
    return user


def make_short_link(db, user, destination_url, status="active", expires_in_days=30, clicks=0):
    """Create a Destination + ShortLink pair owned by `user`."""
    destination = db.query(models.Destination).filter(
        models.Destination.original_url == destination_url
    ).first()
    if destination is None:
        destination = models.Destination(original_url=destination_url)
        db.add(destination)
        db.flush()

    link = models.ShortLink(
        destination_id=destination.id,
        user_id=user.id,
        # short_code is unique+not-null (varchar(20)), so we need *some*
        # value before the insert to get an auto-generated id — use a
        # short random placeholder, then overwrite with the real code
        # derived from that id right after.
        short_code=uuid.uuid4().hex[:12],
        status=status,
        clicks=clicks,
        expires_at=now + timedelta(days=expires_in_days) if expires_in_days is not None else None,
    )
    db.add(link)
    db.flush()
    link.short_code = f"demo-{encode_base62(link.id)}"
    db.commit()
    db.refresh(link)
    return link


def seed_admin_demo_links(db, admin_user):
    """A small spread of link states so the Admin's own dashboard also has
    something to look at, not just the admin panel."""
    existing = db.query(models.ShortLink).filter(models.ShortLink.user_id == admin_user.id).count()
    if existing:
        print("  demo.admin already has links, skipping")
        return

    make_short_link(db, admin_user, "https://github.com/Veds22/url_shortener", status="active", expires_in_days=90, clicks=42)
    make_short_link(db, admin_user, "https://fastapi.tiangolo.com/", status="disabled", expires_in_days=90, clicks=7)
    make_short_link(db, admin_user, "https://www.postgresql.org/", status="expired", expires_in_days=-1, clicks=15)
    print("  seeded 3 demo links for demo.admin (active/disabled/expired)")


def seed_pro_demo_links(db, pro_user):
    """Several links with varied click counts so Analytics (Phase 5) has
    something to chart immediately."""
    existing = db.query(models.ShortLink).filter(models.ShortLink.user_id == pro_user.id).count()
    if existing:
        print("  demo.pro already has links, skipping")
        return

    destinations = [
        ("https://react.dev/", 120),
        ("https://www.docker.com/", 87),
        ("https://redis.io/", 54),
        ("https://vercel.com/", 33),
        ("https://render.com/", 12),
    ]
    for url, clicks in destinations:
        make_short_link(db, pro_user, url, status="active", expires_in_days=90, clicks=clicks)
    print(f"  seeded {len(destinations)} demo links for demo.pro")


def main():
    # Fresh-DB assumption per project decision: no Alembic, just create_all.
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding demo.admin...")
        admin_user = get_or_create_user(db, **DEMO_ADMIN, tier="admin")
        seed_admin_demo_links(db, admin_user)

        print("Seeding demo.pro...")
        pro_user = get_or_create_user(db, **DEMO_PRO, tier="pro")
        seed_pro_demo_links(db, pro_user)

        print("Seeding dummy users for the admin panel...")
        for dummy in DUMMY_USERS:
            get_or_create_user(db, **dummy)

        print("\nDone. Demo accounts:")
        print(f"  Admin -> username='{DEMO_ADMIN['username']}'  password='{DEMO_ADMIN['password']}'")
        print(f"  Pro   -> username='{DEMO_PRO['username']}'  password='{DEMO_PRO['password']}'")
    finally:
        db.close()


if __name__ == "__main__":
    main()