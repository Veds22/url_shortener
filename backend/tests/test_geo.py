"""
Tests for Phase 4 geolocation tracking:
- app.core.geoip.lookup_ip (graceful degradation for private IPs / missing DB)
- app.routers.url.get_client_ip (X-Forwarded-For handling)
- app.routers.url.queue_click_for_geo_enrichment (redirect -> Redis queue)
- app.tasks.click_tasks.enrich_click_events (Redis queue -> ClickEvent rows)

No real GeoLite2 .mmdb file is required for these tests — lookup_ip is
exercised in its "database not present" degraded mode, and enrich_click_events
tests patch lookup_ip directly to isolate queue-draining logic from the
GeoIP library itself.
"""
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from app import models
from app.core.geoip import lookup_ip
from tests.conftest import TestingSessionLocal


def make_short_link(short_code):
    db = TestingSessionLocal()
    destination = models.Destination(original_url="https://www.example.com")
    db.add(destination)
    db.flush()
    link = models.ShortLink(short_code=short_code, destination_id=destination.id, status="active")
    db.add(link)
    db.commit()
    link_id = link.id
    db.close()
    return link_id


# ── lookup_ip ────────────────────────────────────────────────────────────────

def test_lookup_ip_private_address_returns_none_fields():
    result = lookup_ip("192.168.1.1")
    assert result == {"country_code": None, "region": None, "city": None}


def test_lookup_ip_loopback_returns_none_fields():
    result = lookup_ip("127.0.0.1")
    assert result == {"country_code": None, "region": None, "city": None}


def test_lookup_ip_empty_string_returns_none_fields():
    result = lookup_ip("")
    assert result == {"country_code": None, "region": None, "city": None}


def test_lookup_ip_malformed_address_does_not_raise():
    result = lookup_ip("not-an-ip-address")
    assert result == {"country_code": None, "region": None, "city": None}


def test_lookup_ip_missing_database_degrades_gracefully():
    # Patch _get_reader to return None, simulating a missing .mmdb file,
    # regardless of whether the file actually exists in this environment.
    with patch("app.core.geoip._get_reader", return_value=None):
        result = lookup_ip("8.8.8.8")
    assert result == {"country_code": None, "region": None, "city": None}
    

def test_lookup_ip_uses_reader_when_available():
    fake_response = MagicMock()
    fake_response.country.iso_code = "IN"
    fake_response.subdivisions.most_specific.name = "Uttar Pradesh"
    fake_response.city.name = "Lucknow"

    fake_reader = MagicMock()
    fake_reader.city.return_value = fake_response

    with patch("app.core.geoip._get_reader", return_value=fake_reader):
        result = lookup_ip("8.8.8.8")

    assert result == {"country_code": "IN", "region": "Uttar Pradesh", "city": "Lucknow"}


# ── get_client_ip ────────────────────────────────────────────────────────────

def test_get_client_ip_uses_x_forwarded_for():
    from app.routers.url import get_client_ip

    fake_request = MagicMock()
    fake_request.headers = {"x-forwarded-for": "203.0.113.42, 10.0.0.1"}
    assert get_client_ip(fake_request) == "203.0.113.42"


def test_get_client_ip_falls_back_to_request_client():
    from app.routers.url import get_client_ip

    fake_request = MagicMock()
    fake_request.headers = {}
    fake_request.client.host = "127.0.0.1"
    assert get_client_ip(fake_request) == "127.0.0.1"


def test_get_client_ip_handles_missing_client():
    from app.routers.url import get_client_ip

    fake_request = MagicMock()
    fake_request.headers = {}
    fake_request.client = None
    assert get_client_ip(fake_request) == ""


# ── redirect endpoint queues a click event ─────────────────────────────────

def test_redirect_queues_click_event(client, mock_redis):
    # Using make_short_link (expires_at=None) rather than /shorten here —
    # /shorten sets a real expiry, which trips a pre-existing bug in
    # redirect_to_original where SQLite returns naive datetimes for a
    # timezone-aware column (confirmed present on unmodified main too,
    # unrelated to this phase). Not this test's concern to fix.
    short_code = "queuetest1"
    make_short_link(short_code)

    short_code_holder = {}

    def fake_rpush(key, value):
        short_code_holder["key"] = key
        short_code_holder["value"] = value

    mock_redis.rpush.side_effect = fake_rpush

    client.get(f"/{short_code}", follow_redirects=False, headers={"X-Forwarded-For": "8.8.8.8"})

    assert short_code_holder["key"] == "pending_click_events"
    payload = json.loads(short_code_holder["value"])
    assert payload["short_code"] == short_code
    assert payload["ip"] == "8.8.8.8"
    assert "ts" in payload


def test_redirect_still_succeeds_if_queueing_fails(client, mock_redis):
    """A Redis failure while queueing the geo-enrichment event must never
    break the actual redirect — this is a fire-and-forget side effect."""
    short_code = "queuetest2"
    make_short_link(short_code)

    mock_redis.rpush.side_effect = Exception("redis is down")

    redirect_response = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect_response.status_code == 307


# ── enrich_click_events ──────────────────────────────────────────────────────

def test_enrich_click_events_creates_click_event_rows(client):
    from app.tasks.click_tasks import enrich_click_events

    short_code = "geotest1"
    link_id = make_short_link(short_code)

    queue = [
        json.dumps({"short_code": short_code, "ip": "8.8.8.8", "ts": datetime.now(timezone.utc).isoformat()}),
    ]

    def fake_lpop(key):
        return queue.pop(0) if queue else None

    fake_geo = {"country_code": "US", "region": "California", "city": "Mountain View"}

    with patch("app.tasks.click_tasks.redis_client") as mock_redis, \
         patch("app.tasks.click_tasks.lookup_ip", return_value=fake_geo):
        mock_redis.lpop.side_effect = fake_lpop
        enrich_click_events()

    db = TestingSessionLocal()
    events = db.query(models.ClickEvent).filter(models.ClickEvent.short_link_id == link_id).all()
    db.close()

    assert len(events) == 1
    assert events[0].country_code == "US"
    assert events[0].region == "California"
    assert events[0].city == "Mountain View"


def test_enrich_click_events_skips_malformed_payload(client):
    from app.tasks.click_tasks import enrich_click_events

    queue = ["not valid json{{{"]

    def fake_lpop(key):
        return queue.pop(0) if queue else None

    with patch("app.tasks.click_tasks.redis_client") as mock_redis:
        mock_redis.lpop.side_effect = fake_lpop
        # Should not raise despite the malformed entry
        enrich_click_events()


def test_enrich_click_events_skips_deleted_short_link(client):
    from app.tasks.click_tasks import enrich_click_events

    queue = [
        json.dumps({"short_code": "does-not-exist-anymore", "ip": "8.8.8.8", "ts": "now"}),
    ]

    def fake_lpop(key):
        return queue.pop(0) if queue else None

    with patch("app.tasks.click_tasks.redis_client") as mock_redis, \
         patch("app.tasks.click_tasks.lookup_ip", return_value={"country_code": None, "region": None, "city": None}):
        mock_redis.lpop.side_effect = fake_lpop
        # Should not raise; the event is simply skipped
        enrich_click_events()

    db = TestingSessionLocal()
    count = db.query(models.ClickEvent).count()
    db.close()
    assert count == 0


def test_enrich_click_events_respects_batch_size(client):
    from app.tasks import click_tasks

    short_code = "geotest2"
    link_id = make_short_link(short_code)

    # Queue more events than the batch size to confirm only
    # GEO_ENRICHMENT_BATCH_SIZE are drained in one run.
    total_events = click_tasks.GEO_ENRICHMENT_BATCH_SIZE + 5
    queue = [
        json.dumps({"short_code": short_code, "ip": "8.8.8.8", "ts": "now"})
        for _ in range(total_events)
    ]

    def fake_lpop(key):
        return queue.pop(0) if queue else None

    with patch("app.tasks.click_tasks.redis_client") as mock_redis, \
         patch("app.tasks.click_tasks.lookup_ip", return_value={"country_code": None, "region": None, "city": None}):
        mock_redis.lpop.side_effect = fake_lpop
        click_tasks.enrich_click_events()

    db = TestingSessionLocal()
    count = db.query(models.ClickEvent).filter(models.ClickEvent.short_link_id == link_id).count()
    db.close()

    assert count == click_tasks.GEO_ENRICHMENT_BATCH_SIZE
    assert len(queue) == 5  # remaining events left for the next run