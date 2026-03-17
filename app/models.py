from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Destination(Base):
    __tablename__ = "destinations"
    
    id = Column(Integer, primary_key=True, index=True)
    original_url = Column(Text, nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())  
    short_links = relationship(
        "ShortLink",
        back_populates="destination",
        cascade="all, delete-orphan"
    )

class ShortLink(Base):
    __tablename__ = "short_links"
    
    id = Column(Integer, primary_key=True, index=True)
    short_code = Column(String(20), unique=True, nullable=False)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    user_id = Column(Integer, nullable=True)
    clicks = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    destination = relationship("Destination", back_populates="short_links")