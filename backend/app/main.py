from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.briefing import Briefing
from app.models.user import User
from app.schemas.company import CompanyTrackingRequest
from app.schemas.briefing import BriefingResponse
from app.schemas.auth import UserSignup, UserLogin, TokenResponse, UserResponse
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.agents.pipeline import run_pipeline

import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")


app = FastAPI(title="ScoutFlux API")

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