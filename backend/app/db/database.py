from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# The engine manages the actual connection pool to PostgreSQL.
# It doesn't connect immediately — connections are opened lazily
# as needed and reused from the pool.
engine = create_engine(settings.database_url)

# SessionLocal is a factory: calling SessionLocal() creates a new
# database session (one unit of work — a set of queries you'll
# commit or roll back together).
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is the parent class every SQLAlchemy model will inherit from.
# It's how SQLAlchemy discovers which Python classes correspond to
# database tables.
Base = declarative_base()


def get_db():
    """
    Dependency function for FastAPI routes. Opens a session, hands it
    to the route function, and guarantees it's closed afterward —
    even if the route raises an exception.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()