from sqlalchemy import Column, Integer, String, DateTime, Text, Float, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from backend.database import Base


class ResearchResult(Base):
    __tablename__ = "research_results"

    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("apps.id"), nullable=False, index=True)
    agent_version = Column(String(64), nullable=True)
    raw_findings = Column(JSON, nullable=True)
    summary = Column(Text, nullable=True)
    tech_stack = Column(JSON, nullable=True)
    confidence_score = Column(Float, nullable=True, index=True)
    sources = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    app = relationship("App", back_populates="research_results")
    verifications = relationship("VerificationLog", back_populates="research_result", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_app_confidence", "app_id", "confidence_score"),
    )
