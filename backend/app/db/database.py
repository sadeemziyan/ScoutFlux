from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# pool_pre_ping and pool_recycle both address the same real issue:
# Neon's free tier suspends its compute after 5 minutes of database
# inactivity, silently killing any connections sitting in our pool.
# pool_recycle proactively discards connections older than 270
# seconds (safely under Neon's 300-second threshold) before they can
# go stale; pool_pre_ping is a safety net that tests a connection
# right before use and transparently replaces it if already dead.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=270,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()