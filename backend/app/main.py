from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.briefing import Briefing
from app.schemas.company import CompanyTrackingRequest
from app.schemas.briefing import BriefingResponse

app = FastAPI(title="ScoutFlux API")


@app.get("/health")
def health_check():
    """Basic liveness check — confirms the server is up and responding."""
    return {"status": "ok"}


@app.post("/companies/track")
def track_company(request: CompanyTrackingRequest):
    """
    Accepts a company + list of competitors to monitor.
    For now, just validates and echoes the input back — the actual
    agent pipeline trigger gets wired in once the agents exist (Step 7+).
    """
    return {
        "message": f"Tracking set up for {request.user_company}",
        "competitors_count": len(request.competitors),
        "competitors": request.competitors,
    }


@app.get("/briefings", response_model=list[BriefingResponse])
def list_briefings(db: Session = Depends(get_db)):
    """Returns all briefings currently stored in the database."""
    return db.query(Briefing).all()