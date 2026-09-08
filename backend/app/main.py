from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.briefing import Briefing
from app.models.user import User
from app.models.tracked_competitor import TrackedCompetitor
from app.schemas.tracked_competitor import TrackedCompetitorResponse
from app.schemas.company import CompanyTrackingRequest
from app.schemas.briefing import BriefingResponse
from app.schemas.auth import UserSignup, UserLogin, TokenResponse, UserResponse
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.agents.pipeline import run_pipeline

from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.scheduler.jobs import run_weekly_pipeline_for_all_users
scheduler = BackgroundScheduler()

import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once, when the app starts up
    scheduler.add_job(
        run_weekly_pipeline_for_all_users,
        trigger=CronTrigger(day_of_week="sun", hour=0, minute=0),
        id="weekly_pipeline",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started")

    yield  # the app runs here, handling requests, until it's told to shut down

    # Runs once, when the app shuts down
    scheduler.shutdown()
    logger.info("Scheduler shut down")

app = FastAPI(title="ScoutFlux API", lifespan = lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """Basic liveness check - confirms the server is up and responding."""
    return {"status": "ok"}

@app.post("/auth/signup", response_model=TokenResponse)
def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    """Creates a new account and immediately logs it in, returning a token."""
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=user_data.email, hashed_password=hash_password(user_data.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user_id=user.id)
    return TokenResponse(access_token=token)


@app.post("/auth/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Verifies credentials and returns a new token."""
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token(user_id=user.id)
    return TokenResponse(access_token=token)

@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the currently authenticated user's basic info."""
    return current_user

@app.post("/companies/track", response_model=list[BriefingResponse])
def track_company(
    request: CompanyTrackingRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user,)
):
    """
    Runs the full scrape/analyze/synthesize pipeline for every
    competitor in the request and returns the saved briefings.
    """
    return run_pipeline(request, db, current_user.id)


@app.get("/briefings", response_model=list[BriefingResponse])
def list_briefings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns briefings belonging to the current user only."""
    return db.query(Briefing).filter(Briefing.user_id == current_user.id).all()

@app.get("/tracked-competitors", response_model=list[TrackedCompetitorResponse])
def list_tracked_competitors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the current user's ongoing tracked competitors."""
    return db.query(TrackedCompetitor).filter(TrackedCompetitor.user_id == current_user.id).all()


@app.delete("/tracked-competitors/{tracked_id}", status_code=204)
def delete_tracked_competitor(
    tracked_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Removes a tracked competitor. Filters by id AND user_id together,
    not just id, so a user can never delete another user's tracked
    competitor by guessing or incrementing ids.
    """
    tracked = (
        db.query(TrackedCompetitor)
        .filter(TrackedCompetitor.id == tracked_id, TrackedCompetitor.user_id == current_user.id)
        .first()
    )

    if tracked is None:
        raise HTTPException(status_code=404, detail="Tracked competitor not found")

    db.delete(tracked)
    db.commit()