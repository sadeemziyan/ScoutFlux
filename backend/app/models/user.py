from sqlalchemy import Column, Integer, String, DateTime, Boolean, text
from sqlalchemy.sql import func

from app.db.database import Base

class User(Base):
    """A registered account. Owns briefings created while logged in."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable = False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Opted in by default - the weekly job checks this before sending a
    # digest, so existing users start receiving digests once the feature
    # ships, and can turn it off from the dashboard at any time.
    receive_digest = Column(Boolean, nullable=False, server_default=text("false"))