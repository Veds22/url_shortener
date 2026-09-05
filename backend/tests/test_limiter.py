def test_rate_limiter(client, mock_redis):
    # Make 15 rapid requests to trigger rate limiting
    for i in range(15):
        response = client.post(
            "/shorten",
            json={"url": f"https://www.example.com/{i}"}
        )
        if i < 10:
            assert response.status_code == 200
        else:
            assert response.status_code == 429