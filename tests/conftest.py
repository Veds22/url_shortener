import load_dotenv
import os

# Load environment variables from .env.test
load_dotenv.load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env.test"))
TEST_DATABASE_URL = os.getenv("DATABASE_URL")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db, Base

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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
    
    
# add at top of each file that uses redirect
from unittest.mock import patch

@pytest.fixture()  # autouse means it applies to ALL tests in this file automatically
def mock_redis():
    with patch("app.routers.redirect.redis_client") as mock:
        mock.get.return_value = None
        mock.incr.return_value = 1
        yield mock