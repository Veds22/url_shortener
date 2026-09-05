"""
Tests for Phase 5 analytics endpoints:
- GET /analytics/{short_code}/timeseries
- GET /analytics/{short_code}/geo

Also covers the refactored ownership check shared with the pre-existing
GET /analytics/{short_code} endpoint, since that refactor fixed a latent
bug (anonymous access used to crash with a 500 instead of a clean 403).
"""
from datetime import datetime, timezone, timedelta

from app import models
from tests.conftest import TestingSessionLocal


def make_owned_short_link(short_code, owner_id, clicks=0):
    db = TestingSessionLocal()
    destination = models.Destination(original_url="https://www.example.com")
    db.add(destination)
    db.flush()
    link = models.ShortLink(
        short_code=short_code,
        destination_id=destination.id,
        user_id=owner_id,
        status="active",
        clicks=clicks,
    )
    db.add(link)
    db.commit()
    link_id = link.id
    db.close()
    return link_id


def add_click_events(link_id, events):
    """events: list of (days_ago, country_code) tuples"""
    db = TestingSessionLocal()
    now = datetime.now(timezone.utc)
    for days_ago, country_code in events:
        ce = models.ClickEvent(short_link_id=link_id, country_code=country_code)
        ce.clicked_at = now - timedelta(days=days_ago)
        db.add(ce)
    db.commit()
    db.close()


def signup_and_login(client, username, email, password="testpass123"):
    r = client.post("/auth/signup", json={"username": username, "email": email, "password": password})
    assert r.status_code == 200, r.text
    user_id = r.json()["id"]
    r = client.post("/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return user_id, r.json()["access_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ── timeseries ───────────────────────────────────────────────────────────────

def test_timeseries_zero_fills_days_with_no_clicks(client):
    alice_id, alice_token = signup_and_login(client, "alice", "alice@example.com")
    link_id = make_owned_short_link("chartcode1", alice_id)
    add_click_events(link_id, [(0, "IN"), (0, "IN"), (2, "US")])

    r = client.get("/analytics/chartcode1/timeseries?days=7", headers=auth_headers(alice_token))
    assert r.status_code == 200
    body = r.json()
    assert body["days"] == 7
    assert len(body["data"]) == 7

    total_clicks = sum(point["clicks"] for point in body["data"])
    assert total_clicks == 3

    zero_days = [point for point in body["data"] if point["clicks"] == 0]
    assert len(zero_days) == 5  # 7 days total, 2 had events


def test_timeseries_excludes_events_outside_window(client):
    alice_id, alice_token = signup_and_login(client, "alice", "alice@example.com")
    link_id = make_owned_short_link("chartcode2", alice_id)
    add_click_events(link_id, [(0, "IN"), (20, "US")])  # second one outside 7-day window

    r = client.get("/analytics/chartcode2/timeseries?days=7", headers=auth_headers(alice_token))
    assert r.status_code == 200
    total_clicks = sum(point["clicks"] for point in r.json()["data"])
    assert total_clicks == 1


def test_timeseries_rejects_invalid_days(client):
    alice_id, alice_token = signup_and_login(client, "alice", "alice@example.com")
    make_owned_short_link("chartcode3", alice_id)

    r = client.get("/analytics/chartcode3/timeseries?days=0", headers=auth_headers(alice_token))
    assert r.status_code == 400

    r = client.get("/analytics/chartcode3/timeseries?days=91", headers=auth_headers(alice_token))
    assert r.status_code == 400


def test_timeseries_404_for_missing_link(client):
    _, alice_token = signup_and_login(client, "alice", "alice@example.com")
    r = client.get("/analytics/doesnotexist/timeseries", headers=auth_headers(alice_token))
    assert r.status_code == 404


def test_timeseries_rejects_non_owner(client):
    alice_id, _ = signup_and_login(client, "alice", "alice@example.com")
    make_owned_short_link("chartcode4", alice_id)

    _, bob_token = signup_and_login(client, "bob", "bob@example.com")
    r = client.get("/analytics/chartcode4/timeseries", headers=auth_headers(bob_token))
    assert r.status_code == 403


def test_timeseries_rejects_anonymous_without_crashing(client):
    """Regression check: previously current_user could be None here and
    the ownership check crashed with a 500 instead of a clean 403."""
    alice_id, _ = signup_and_login(client, "alice", "alice@example.com")
    make_owned_short_link("chartcode5", alice_id)

    r = client.get("/analytics/chartcode5/timeseries")
    assert r.status_code == 403


# ── geo breakdown ────────────────────────────────────────────────────────────

def test_geo_breakdown_groups_by_country(client):
    alice_id, alice_token = signup_and_login(client, "alice", "alice@example.com")
    link_id = make_owned_short_link("geocode1", alice_id)
    add_click_events(link_id, [(0, "IN"), (0, "IN"), (1, "US"), (1, None)])

    r = client.get("/analytics/geocode1/geo", headers=auth_headers(alice_token))
    assert r.status_code == 200
    rows = {row["country_code"]: row["clicks"] for row in r.json()["data"]}
    assert rows["IN"] == 2
    assert rows["US"] == 1
    assert rows[None] == 1


def test_geo_breakdown_empty_when_no_events(client):
    alice_id, alice_token = signup_and_login(client, "alice", "alice@example.com")
    make_owned_short_link("geocode2", alice_id)

    r = client.get("/analytics/geocode2/geo", headers=auth_headers(alice_token))
    assert r.status_code == 200
    assert r.json()["data"] == []


def test_geo_breakdown_rejects_non_owner(client):
    alice_id, _ = signup_and_login(client, "alice", "alice@example.com")
    make_owned_short_link("geocode3", alice_id)

    _, bob_token = signup_and_login(client, "bob", "bob@example.com")
    r = client.get("/analytics/geocode3/geo", headers=auth_headers(bob_token))
    assert r.status_code == 403


def test_geo_breakdown_admin_can_view_others_links(client):
    from tests.test_admin import promote_to_admin

    alice_id, _ = signup_and_login(client, "alice", "alice@example.com")
    link_id = make_owned_short_link("geocode4", alice_id)
    add_click_events(link_id, [(0, "IN")])

    admin_id, _ = signup_and_login(client, "admin1", "admin1@example.com")
    promote_to_admin(admin_id)
    admin_token = client.post("/auth/login", json={"username": "admin1", "password": "testpass123"}).json()["access_token"]

    r = client.get("/analytics/geocode4/geo", headers=auth_headers(admin_token))
    assert r.status_code == 200
    assert r.json()["data"] == [{"country_code": "IN", "clicks": 1}]


# ── original /analytics/{short_code} endpoint still works post-refactor ───────

def test_original_analytics_endpoint_unaffected_by_refactor(client):
    alice_id, alice_token = signup_and_login(client, "alice", "alice@example.com")
    make_owned_short_link("origcode1", alice_id, clicks=42)

    r = client.get("/analytics/origcode1", headers=auth_headers(alice_token))
    assert r.status_code == 200
    assert r.json()["clicks"] == 42


def test_original_analytics_rejects_anonymous_without_crashing(client):
    alice_id, _ = signup_and_login(client, "alice", "alice@example.com")
    make_owned_short_link("origcode2", alice_id)

    r = client.get("/analytics/origcode2")
    assert r.status_code == 401