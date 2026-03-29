from datetime import datetime, timezone, timedelta
from app import models
from tests.conftest import TestingSessionLocal, mock_redis
from unittest.mock import patch, MagicMock

def make_short_link(short_code, status="active", expired=False):
    db = TestingSessionLocal()
    destination = models.Destination(original_url="https://www.example.com")
    db.add(destination)
    db.flush()
    link = models.ShortLink(
        short_code=short_code,
        destination_id=destination.id,
        status=status,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1) if expired else None,
    )
    db.add(link)
    db.commit()
    db.close()


def test_redirect_single(client, mock_redis):
    response = client.post("/shorten", json={"url": "https://www.example.com"})
    assert response.status_code == 200
    short_code = response.json()["short_code"]

    redirect_response = client.get(f"/{short_code}", allow_redirects=False)
    assert redirect_response.status_code == 307
    assert redirect_response.headers["location"] == "https://www.example.com"


def test_redirect_multiple(client, mock_redis):
    response = client.post("/shorten", json={"url": "https://www.example.com"})
    short_code = response.json()["short_code"]

    for _ in range(50):
        redirect_response = client.get(f"/{short_code}", allow_redirects=False)
        assert redirect_response.status_code == 307


def test_redirect_not_found(client, mock_redis):
    redirect_response = client.get("/nonexistent_xyz", allow_redirects=False)
    assert redirect_response.status_code == 404


def test_redirect_inactive_url(client, mock_redis):
    response = client.post("/shorten", json={"url": "https://www.example.com"})
    short_code = response.json()["short_code"]

    db = TestingSessionLocal()
    link = db.query(models.ShortLink).filter_by(short_code=short_code).first()
    link.status = "disabled"
    db.commit()
    db.close()

    redirect_response = client.get(f"/{short_code}", allow_redirects=False)
    assert redirect_response.status_code == 410


def test_redirect_expired_url(client, mock_redis):
    response = client.post("/shorten", json={"url": "https://www.example.com"})
    short_code = response.json()["short_code"]

    db = TestingSessionLocal()
    link = db.query(models.ShortLink).filter_by(short_code=short_code).first()
    link.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db.commit()
    db.close()

    redirect_response = client.get(f"/{short_code}", allow_redirects=False)
    assert redirect_response.status_code == 410


def test_redirect_cache_hit(client, mock_redis):
    mock_redis.get.return_value = "https://www.example.com"
    mock_redis.incr.return_value = 1

    redirect_response = client.get("/anycode", allow_redirects=False)
    assert redirect_response.status_code == 307
    assert redirect_response.headers["location"] == "https://www.example.com"


def test_redirect_cache_hit_triggers_sync(client, mock_redis):
    mock_redis.get.return_value = "https://www.example.com"
    mock_redis.incr.return_value = 50

    with patch("app.routers.redirect.sync_clicks_for_code") as mock_sync:
        redirect_response = client.get("/anycode", allow_redirects=False)
        assert redirect_response.status_code == 307
        mock_sync.delay.assert_called_once_with("anycode")