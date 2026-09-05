import uuid


def _register_and_login(client):
    """Sign up a fresh user and return an auth header dict."""
    username = f"testuser_{uuid.uuid4().hex[:8]}"
    password = "TestPass123!"
    client.post("/auth/signup", json={
        "username": username,
        "email": f"{username}@test.com",
        "password": password,
    })
    resp = client.post("/auth/login", json={"username": username, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_shortlink_creation(client, mock_redis):
    response = client.post("/shorten", json={"url": "https://www.example.com"})
    assert response.status_code == 200
    assert "short_url" in response.json()


def test_shortlink_custom_code(client, mock_redis):
    response = client.post(
        "/shorten",
        json={"url": "https://www.example.com", "custom_code": "testlink"}
    )
    assert response.status_code == 200
    assert response.json()["short_code"] == "testlink"


def test_shortlink_redirection(client, mock_redis):
    response = client.post("/shorten", json={"url": "https://www.example.com"})
    short_code = response.json()["short_url"].rsplit("/", 1)[-1]

    redirect_response = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect_response.status_code == 307
    assert redirect_response.headers["location"].rstrip("/") == "https://www.example.com"


def test_enable_short_link(client, mock_redis):
    headers = _register_and_login(client)

    response = client.post(
        "/shorten",
        json={"url": "https://www.example.com"},
        headers=headers,
    )
    assert response.status_code == 200
    short_code = response.json()["short_code"]

    disable_response = client.delete(f"/{short_code}", headers=headers)
    assert disable_response.status_code == 200

    redirect_response = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect_response.status_code == 410

    enable_response = client.put(f"/{short_code}", headers=headers)
    assert enable_response.status_code == 200

    redirect_response = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect_response.status_code == 307


def test_shortlink_delete(client, mock_redis):
    headers = _register_and_login(client)

    response = client.post(
        "/shorten",
        json={"url": "https://www.example.com"},
        headers=headers,
    )
    assert response.status_code == 200
    short_code = response.json()["short_code"]

    delete_response = client.delete(f"/{short_code}", headers=headers)
    assert delete_response.status_code == 200

    redirect_response = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect_response.status_code == 410