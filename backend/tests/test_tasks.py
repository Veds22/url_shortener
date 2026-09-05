from tests.conftest import TestingSessionLocal
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta
from app.tasks.expiry_tasks import expiry_short_links
from app.tasks.click_tasks import sync_all_clicks, sync_clicks_for_code
from app import models


def make_short_link(short_code, expired=False, status="active", clicks=0):
    """helper to create a Destination + ShortLink together"""
    db = TestingSessionLocal()
    destination = models.Destination(original_url=f"https://example.com/{short_code}")
    db.add(destination)
    db.flush()
    link = models.ShortLink(
        short_code=short_code,
        destination_id=destination.id,
        status=status,
        clicks=clicks,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1) if expired
                   else datetime.now(timezone.utc) + timedelta(hours=5),
    )
    db.add(link)
    db.commit()
    db.close()


# ── expiry_short_links ──────────────────────────────────────────────────────

def test_expiry_marks_expired_links_inactive(client):
    make_short_link("abc123", expired=True)

    with patch("app.tasks.expiry_tasks.invalidate_url_cache") as mock_invalidate:
        with patch("app.tasks.expiry_tasks.SessionLocal", return_value=TestingSessionLocal()):
            expiry_short_links()

    db = TestingSessionLocal()
    updated = db.query(models.ShortLink).filter_by(short_code="abc123").first()
    assert updated.status == "expired"
    mock_invalidate.assert_called_once_with("abc123")
    db.close()


def test_expiry_ignores_non_expired_links(client):
    make_short_link("xyz999", expired=False)

    with patch("app.tasks.expiry_tasks.invalidate_url_cache"):
        with patch("app.tasks.expiry_tasks.SessionLocal", return_value=TestingSessionLocal()):
            expiry_short_links()

    db = TestingSessionLocal()
    updated = db.query(models.ShortLink).filter_by(short_code="xyz999").first()
    assert updated.status == "active"
    db.close()


# ── sync_clicks_for_code ────────────────────────────────────────────────────

def test_sync_clicks_for_code_updates_db(client):
    make_short_link("click1", clicks=0)

    mock_redis = MagicMock()
    mock_redis.get.return_value = "5"

    with patch("app.tasks.click_tasks.redis_client", mock_redis):
        with patch("app.tasks.click_tasks.SessionLocal", return_value=TestingSessionLocal()):
            sync_clicks_for_code("click1")

    db = TestingSessionLocal()
    updated = db.query(models.ShortLink).filter_by(short_code="click1").first()
    assert updated.clicks == 5
    mock_redis.delete.assert_called_once_with("clicks:click1")
    db.close()


def test_sync_clicks_for_code_skips_zero_clicks(client):
    mock_redis = MagicMock()
    mock_redis.get.return_value = None

    with patch("app.tasks.click_tasks.redis_client", mock_redis):
        with patch("app.tasks.click_tasks.SessionLocal", return_value=TestingSessionLocal()):
            sync_clicks_for_code("noclick")

    mock_redis.delete.assert_not_called()


# ── sync_all_clicks ─────────────────────────────────────────────────────────

def test_sync_all_clicks(client):
    make_short_link("all1", clicks=2)

    mock_redis = MagicMock()
    mock_redis.keys.return_value = ["clicks:all1"]
    mock_redis.get.return_value = "3"

    with patch("app.tasks.click_tasks.redis_client", mock_redis):
        with patch("app.tasks.click_tasks.SessionLocal", return_value=TestingSessionLocal()):
            sync_all_clicks()

    db = TestingSessionLocal()
    updated = db.query(models.ShortLink).filter_by(short_code="all1").first()
    assert updated.clicks == 5
    mock_redis.delete.assert_called_once_with("clicks:all1")
    db.close()