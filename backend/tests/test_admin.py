"""
Tests for the admin router: /admin/users, /admin/users/{id},
/admin/users/{id}/block, /admin/users/{id}/unblock.

Users are created through the real /auth/signup endpoint (so password
hashing and schema validation go through the normal path), then promoted
to admin tier directly in the DB where needed — signup has no way to
create an admin on purpose, so this mirrors how a real admin would be
promoted out-of-band.
"""
from tests.conftest import TestingSessionLocal
from app import models


def signup(client, username, email, password="testpass123"):
    r = client.post(
        "/auth/signup",
        json={"username": username, "email": email, "password": password},
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def login(client, username, password="testpass123"):
    r = client.post("/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def promote_to_admin(user_id):
    db = TestingSessionLocal()
    user = db.query(models.User).filter(models.User.id == user_id).first()
    user.tier = "admin"
    db.commit()
    db.close()


def make_admin(client, username="admin1", email="admin1@example.com", password="adminpass123"):
    """Signup a regular user then promote them to admin, return (id, token)."""
    user_id = signup(client, username, email, password)
    promote_to_admin(user_id)
    token = login(client, username, password)
    return user_id, token


# ── access control ──────────────────────────────────────────────────────────

def test_list_users_requires_auth(client):
    r = client.get("/admin/users")
    assert r.status_code == 401


def test_list_users_rejects_non_admin(client):
    signup(client, "alice", "alice@example.com")
    token = login(client, "alice")

    r = client.get("/admin/users", headers=auth_headers(token))
    assert r.status_code == 403


def test_list_users_allows_admin(client):
    _, admin_token = make_admin(client)
    signup(client, "alice", "alice@example.com")

    r = client.get("/admin/users", headers=auth_headers(admin_token))
    assert r.status_code == 200
    body = r.json()
    usernames = {u["username"] for u in body["users"]}
    assert "admin1" in usernames
    assert "alice" in usernames


# ── listing content ──────────────────────────────────────────────────────────

def test_list_users_includes_link_count(client, mock_redis):
    _, admin_token = make_admin(client)
    alice_id = signup(client, "alice", "alice@example.com")
    alice_token = login(client, "alice")
    bob_id = signup(client, "bob", "bob@example.com")
    bob_token = login(client, "bob")

    # free tier allows 1 active link per user, so use two separate
    # users rather than trying to create two links on one free account
    client.post(
        "/shorten",
        json={"url": "https://example.com/a"},
        headers=auth_headers(alice_token),
    )
    client.post(
        "/shorten",
        json={"url": "https://example.com/b"},
        headers=auth_headers(bob_token),
    )

    r = client.get("/admin/users", headers=auth_headers(admin_token))
    assert r.status_code == 200
    rows = {u["id"]: u["link_count"] for u in r.json()["users"]}
    assert rows[alice_id] == 1
    assert rows[bob_id] == 1


def test_list_users_pagination(client):
    _, admin_token = make_admin(client)
    for i in range(3):
        signup(client, f"user{i}", f"user{i}@example.com")

    r = client.get("/admin/users?page=1&limit=2", headers=auth_headers(admin_token))
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 5  # 3 regular + 1 test admin + 1 startup admin
    assert len(body["users"]) == 2


def test_list_users_rejects_invalid_pagination(client):
    _, admin_token = make_admin(client)
    r = client.get("/admin/users?page=0", headers=auth_headers(admin_token))
    assert r.status_code == 400


# ── user detail ──────────────────────────────────────────────────────────────

def test_get_user_detail_includes_links(client, mock_redis):
    _, admin_token = make_admin(client)
    alice_id = signup(client, "alice", "alice@example.com")
    alice_token = login(client, "alice")

    client.post(
        "/shorten",
        json={"url": "https://example.com/detail"},
        headers=auth_headers(alice_token),
    )

    r = client.get(f"/admin/users/{alice_id}", headers=auth_headers(admin_token))
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "alice"
    assert len(body["links"]) == 1
    assert body["links"][0]["original_url"] == "https://example.com/detail"


def test_get_user_detail_404_for_missing_user(client):
    _, admin_token = make_admin(client)
    r = client.get("/admin/users/999999", headers=auth_headers(admin_token))
    assert r.status_code == 404


def test_get_user_detail_rejects_non_admin(client):
    signup(client, "alice", "alice@example.com")
    alice_token = login(client, "alice")
    bob_id = signup(client, "bob", "bob@example.com")

    r = client.get(f"/admin/users/{bob_id}", headers=auth_headers(alice_token))
    assert r.status_code == 403


# ── block / unblock ──────────────────────────────────────────────────────────

def test_admin_can_block_and_unblock_user(client):
    _, admin_token = make_admin(client)
    bob_id = signup(client, "bob", "bob@example.com")

    r = client.put(f"/admin/users/{bob_id}/block", headers=auth_headers(admin_token))
    assert r.status_code == 200

    # blocked user cannot log in
    r = client.post("/auth/login", json={"username": "bob", "password": "testpass123"})
    assert r.status_code == 403

    r = client.put(f"/admin/users/{bob_id}/unblock", headers=auth_headers(admin_token))
    assert r.status_code == 200

    # unblocked user can log in again
    r = client.post("/auth/login", json={"username": "bob", "password": "testpass123"})
    assert r.status_code == 200


def test_blocking_invalidates_existing_token(client):
    """A token issued before blocking should stop working immediately,
    not just future login attempts."""
    _, admin_token = make_admin(client)
    bob_id = signup(client, "bob", "bob@example.com")
    bob_token = login(client, "bob")

    # token works before block
    r = client.get("/links", headers=auth_headers(bob_token))
    assert r.status_code == 200

    client.put(f"/admin/users/{bob_id}/block", headers=auth_headers(admin_token))

    # same token should now be rejected
    r = client.get("/links", headers=auth_headers(bob_token))
    assert r.status_code == 403


def test_block_already_blocked_user_fails(client):
    _, admin_token = make_admin(client)
    bob_id = signup(client, "bob", "bob@example.com")

    client.put(f"/admin/users/{bob_id}/block", headers=auth_headers(admin_token))
    r = client.put(f"/admin/users/{bob_id}/block", headers=auth_headers(admin_token))
    assert r.status_code == 400


def test_unblock_non_blocked_user_fails(client):
    _, admin_token = make_admin(client)
    bob_id = signup(client, "bob", "bob@example.com")

    r = client.put(f"/admin/users/{bob_id}/unblock", headers=auth_headers(admin_token))
    assert r.status_code == 400


def test_admin_cannot_block_self(client):
    admin_id, admin_token = make_admin(client)

    r = client.put(f"/admin/users/{admin_id}/block", headers=auth_headers(admin_token))
    assert r.status_code == 403


def test_admin_cannot_block_another_admin(client):
    _, admin_token = make_admin(client, "admin1", "admin1@example.com")
    admin2_id, _ = make_admin(client, "admin2", "admin2@example.com")

    r = client.put(f"/admin/users/{admin2_id}/block", headers=auth_headers(admin_token))
    assert r.status_code == 403


def test_block_nonexistent_user_404(client):
    _, admin_token = make_admin(client)
    r = client.put("/admin/users/999999/block", headers=auth_headers(admin_token))
    assert r.status_code == 404


def test_non_admin_cannot_block_users(client):
    signup(client, "alice", "alice@example.com")
    alice_token = login(client, "alice")
    bob_id = signup(client, "bob", "bob@example.com")

    r = client.put(f"/admin/users/{bob_id}/block", headers=auth_headers(alice_token))
    assert r.status_code == 403