from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import ARRAY

from app.db.database import Base


class Briefing(Base):
    """
    A single weekly intelligence briefing for one competitor.
    Each row = one report generated for one competitor, at one point in time.
    """

    __tablename__ = "briefings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Whose competitor intelligence this is for, and which competitor
    user_company = Column(String, nullable=False, index=True)
    competitor_name = Column(String, nullable=False, index=True)
    competitor_urls = Column(ARRAY(String), nullable=False)
    
    # The four report categories from the spec — stored as text for now.
    # Each will hold AI-generated summary text (or JSON-as-text later
    # if we want more structure per category).
    product_updates = Column(Text, nullable=True)
    hiring_signals = Column(Text, nullable=True)
    pricing_changes = Column(Text, nullable=True)
    tech_stack_changes = Column(Text, nullable=True)
    github_activity = Column(Text, nullable=True)
    
    # Automatically set by the database when a row is created —
    # func.now() tells PostgreSQL to use its own clock, not Python's,
    # which avoids timezone mismatches between your app and the DB.
    created_at = Column(DateTime(timezone=True), server_default=func.now())