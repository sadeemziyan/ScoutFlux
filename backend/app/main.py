from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.briefing import Briefing
from app.schemas.company import CompanyTrackingRequest
from app.schemas.briefing import BriefingResponse
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


@app.post("/companies/track", response_model=list[BriefingResponse])
def track_company(request: CompanyTrackingRequest, db: Session = Depends(get_db)):
    """
    Runs the full scrape/analyze/synthesize pipeline for every
    competitor in the request and returns the saved briefings.
    """
    return run_pipeline(request, db)


@app.get("/briefings", response_model=list[BriefingResponse])
def list_briefings(db: Session = Depends(get_db)):
    """Returns all briefings currently stored in the database."""
    return db.query(Briefing).all()