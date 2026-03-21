# add at top of each file that uses redirect
import pytest
from unittest.mock import patch

@pytest.fixture(autouse=True)  # autouse means it applies to ALL tests in this file automatically
def mock_redis():
    with patch("app.routers.redirect.redis_client") as mock:
        mock.get.return_value = None
        mock.incr.return_value = 1
        yield mock

def test_analytics(client):
    # Create a short link first
    response = client.post(
        "/shorten",
        json={"url": "https://www.example.com"}
    )
    assert response.status_code == 200
    data = response.json()
    short_url = data["short_url"]
    
    # Extract the short code from the URL
    short_code = short_url.rsplit("/", 1)[-1]
    
    # Access the short link to generate analytics data
    client.get(f"/{short_code}", follow_redirects=False)
    
    # Now test analytics endpoint
    analytics_response = client.get(f"/analytics/{short_code}")
    assert analytics_response.status_code == 200
    analytics_data = analytics_response.json()
    
    assert analytics_data["short_code"] == short_code
    assert analytics_data["original_url"] == "https://www.example.com/"
    assert analytics_data["clicks"] >= 0