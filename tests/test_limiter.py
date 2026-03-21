# add at top of each file that uses redirect
import pytest
from unittest.mock import patch

@pytest.fixture(autouse=True)  # autouse means it applies to ALL tests in this file automatically
def mock_redis():
    with patch("app.routers.redirect.redis_client") as mock:
        mock.get.return_value = None
        mock.incr.return_value = 1
        yield mock

def test_rate_limiter(client):
    # Make 15 rapid requests to trigger rate limiting
    for i in range(10):
        response = client.post(
            "/shorten",
            json={"url": f"https://www.example.com/{i}"}
        )
        if i < 5:
            assert response.status_code == 200
        else:
            assert response.status_code == 429