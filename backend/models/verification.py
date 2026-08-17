from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from backend.database import Base


class VerificationLog(Base):
    __tablename__ = "verification_logs"

    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("apps.id"), nullable=False, index=True)
    research_result_id = Column(Integer, ForeignKey("research_results.id"), nullable=True, index=True)
    method = Column(String(64), nullable=True)
    claim = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)
    is_accurate = Column(Boolean, nullable=True)
    confidence_delta = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    source_url = Column(String(2048), nullable=True)
    raw_response = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    app = relationship("App", back_populates="verification_logs")
    research_result = relationship("ResearchResult", back_populates="verifications")
