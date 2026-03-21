import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv 
from app.middleware.logging import get_logger

load_dotenv()

ENV = os.getenv("ENV", "production")

logger = get_logger("app.database")

logger.info(f"Starting database setup in {ENV} environment")


DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
    echo=(ENV == "development"), 
    future = True,
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush = False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        