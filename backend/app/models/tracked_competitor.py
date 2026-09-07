from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func

from app.db.database import Base


class TrackedCompetitor(Base):
    """
    A competitor a user wants tracked on an ongoing weekly basis.
    Separate from Briefing, which only stores past run results, not
    what should be re-scraped going forward.
    """

    __tablename__ = "tracked_competitors"
    __table_args__ = (UniqueConstraint("user_id", "competitor_name", name="uq_user_competitor"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    user_company = Column(String, nullable=False)
    competitor_name = Column(String, nullable=False, index=True)
    competitor_urls = Column(ARRAY(String), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())