import os
from app.database import SessionLocal
from app import models
from app.core.security import hash_password
from app.middleware.logging import get_logger
from dotenv import load_dotenv

load_dotenv()
logger = get_logger("app.core.init_admin")

def create_admin():
    db = SessionLocal()

    try:
        admin_username = os.getenv("ADMIN_USERNAME")
        admin_password = os.getenv("ADMIN_PASSWORD")

        if not admin_username or not admin_password:
            logger.warning("Admin credentials not set")
            return

        existing_admin = db.query(models.User).filter(
            models.User.username == admin_username
        ).first()

        if existing_admin:
            logger.info("Admin already exists")
            return

        admin_user = models.User(
            username=admin_username,
            password_hash=hash_password(admin_password),
            role="admin",
            tier="premium"
        )

        db.add(admin_user)
        db.commit()

        logger.info("Admin user created successfully")

    finally:
        db.close()