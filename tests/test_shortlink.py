def test_shortlink_creation(client):
    response = client.post(
        "/shorten",
        json={"url": "https://www.example.com"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "short_url" in data

def test_shortlink_custom_code(client):
    response = client.post(
        "/shorten",
        json={"url": "https://www.example.com", "custom_code": "testlink"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["short_code"] == "testlink"

def test_shortlink_redirection(client):
    # First create a short link
    response = client.post(
        "/shorten",
        json={"url": "https://www.example.com"}
    )
    assert response.status_code == 200
    data = response.json()
    short_url = data["short_url"]
    
    # Extract the short code from the URL
    short_code = short_url.rsplit("/", 1)[-1]
    
    # Now test redirection
    redirect_response = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect_response.status_code == 307
    assert redirect_response.headers["location"] == "https://www.example.com/"