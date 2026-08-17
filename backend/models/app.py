from sqlalchemy import Column, Integer, String, DateTime, Text, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from backend.database import Base


class AppStatus(str, enum.Enum):
    PENDING = "pending"
    RESEARCHING = "researching"
    COMPLETED = "completed"
    FAILED = "failed"


class App(Base):
    __tablename__ = "apps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    url = Column(String(2048), nullable=True)
    category = Column(String(128), nullable=True, index=True)
    description = Column(Text, nullable=True)
    status = Column(
        SAEnum(AppStatus, values_callable=lambda x: [e.value for e in x]),
        default=AppStatus.PENDING,
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    research_results = relationship("ResearchResult", back_populates="app", cascade="all, delete-orphan")
    verification_logs = relationship("VerificationLog", back_populates="app", cascade="all, delete-orphan")
