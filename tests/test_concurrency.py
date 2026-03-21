import threading 
import uuid

# add at top of each file that uses redirect
import pytest
from unittest.mock import patch

@pytest.fixture(autouse=True)  # autouse means it applies to ALL tests in this file automatically
def mock_redis():
    with patch("app.routers.redirect.redis_client") as mock:
        mock.get.return_value = None
        mock.incr.return_value = 1
        yield mock

def test_custom_code_race_condition(client):
    
    payload = {
        "url": "https://www.example.com",
        "custom_code": f"race_{uuid.uuid4().hex[:6]}"
    }
    
    responses = []
    
    def send():
        response = client.post("/shorten", json=payload)
        responses.append(response.status_code)
        
    threads = []
    
    for _ in range(5):
        thread = threading.Thread(target=send)
        threads.append(thread)
        thread.start()
        
    for thread in threads:
        thread.join()
        
    assert 200 in responses
    assert responses.count(200) == 1
    assert responses.count(400) >= 1