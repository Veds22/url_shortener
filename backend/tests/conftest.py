import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env.test"))
TEST_DATABASE_URL = os.getenv("DATABASE_URL")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch

from app.main import app
from app.database import get_db, Base

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset the in-process slowapi limiter storage before every test.

    The limiter is a module-level singleton whose in-memory hit counters
    accumulate across tests in the same pytest process.  Without this,
    tests that exercise rate-limited endpoints cause later tests to see
    spurious 429s depending on execution order.
    """
    from app.middleware.rate_limiter import limiter
    limiter.reset()
    yield


@pytest.fixture
def client():
    from app.database import Base
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c

    del app.dependency_overrides[get_db]
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def mock_redis():
    """Patch every Redis import used by the URL router and cache module.

    app.routers.url.redis_client  – covers the shorten + redirect paths
    app.core.cache.redis_client   – covers invalidate_url_cache() calls
    Both must be patched or any code path that hits the cache layer will
    try to connect to a real Redis that doesn't exist in CI.
    """
    with patch("app.routers.url.redis_client") as mock, \
         patch("app.core.cache.redis_client"):
        mock.get.return_value = None
        mock.incr.return_value = 1
        yield mock