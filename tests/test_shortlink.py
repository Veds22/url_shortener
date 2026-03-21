def test_shortlink_creation(client, mock_redis):
    response = client.post(
        "/shorten",
        json={"url": "https://www.example.com"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "short_url" in data

def test_shortlink_custom_code(client, mock_redis):
    response = client.post(
        "/shorten",
        json={"url": "https://www.example.com", "custom_code": "testlink"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["short_code"] == "testlink"

def test_shortlink_redirection(client, mock_redis):
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
    
def test_enable_short_link(client, mock_redis):
    # Create a short link
    response = client.post(
        "/shorten",
        json={"url": "https://www.example.com"}
    )
    assert response.status_code == 200
    data = response.json()
    short_code = data["short_code"]
    
    # Disable the short link
    disable_response = client.delete(f"/{short_code}")
    assert disable_response.status_code == 200
    
    # Try to access the disabled short link
    redirect_response = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect_response.status_code == 410
    
    # Enable the short link again
    enable_response = client.put(f"/{short_code}")
    assert enable_response.status_code == 200
    
    # Access the enabled short link
    redirect_response = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect_response.status_code == 307
    
def test_shortlink_delete(client):
    # Create a short link
    response = client.post(
        "/shorten",
        json={"url": "https://www.example.com"}
    )
    assert response.status_code == 200
    data = response.json()
    short_code = data["short_code"]
    
    # Delete the short link
    delete_response = client.delete(f"/{short_code}")
    assert delete_response.status_code == 200
    
    # Try to access the deleted short link
    redirect_response = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect_response.status_code == 410
    
    