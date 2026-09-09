import logging
import time
from collections import defaultdict

from app.db.database import SessionLocal
from app.models.user import User
from app.models.tracked_competitor import TrackedCompetitor
from app.schemas.company import CompanyTrackingRequest, CompetitorInput
from app.agents.pipeline import run_pipeline, GEMINI_CALL_DELAY_SECONDS

from app.services.email_service import send_digest_email

logger = logging.getLogger(__name__)


def run_weekly_pipeline_for_all_users() -> None:
    """
    Re-runs the full pipeline for every user's tracked competitors.
    Groups tracked_competitors rows by user, since run_pipeline expects
    one CompanyTrackingRequest per user, not one call per competitor.
    """
    db = SessionLocal()

    try:
        tracked_rows = db.query(TrackedCompetitor).all()

        by_user: dict[int, list[TrackedCompetitor]] = defaultdict(list)
        for row in tracked_rows:
            by_user[row.user_id].append(row)

        logger.info(f"Weekly scheduled run starting for {len(by_user)} user(s)")

        for user_id, rows in by_user.items():

            try:
                request = CompanyTrackingRequest(
                    user_company=rows[0].user_company,
                    competitors=[
                        CompetitorInput(name=row.competitor_name, urls=row.competitor_urls, github_org=row.github_org)
                        for row in rows
                    ],
                )
                saved_briefings = run_pipeline(request, db, user_id)

                user = db.query(User).filter(User.id == user_id).first()
                if user and user.receive_digest:
                    try:
                        send_digest_email(
                            to_email=user.email,
                            user_company=rows[0].user_company,
                            briefings=saved_briefings,
                        )
                    except Exception as e:
                        # A bad/unreachable email shouldn't be treated
                        # like a pipeline failure - the briefings were
                        # still saved fine, so just log and move on.
                        logger.error(f"Digest email failed for user_id {user_id}: {e}")

            except Exception as e:
                # One user's pipeline failing (e.g. a transient Gemini
                # 503, same as we hit earlier) shouldn't stop every
                # other user's scheduled run from happening.
                logger.error(f"Weekly run failed for user_id {user_id}: {e}")
                db.rollback()
            
            time.sleep(GEMINI_CALL_DELAY_SECONDS)

        logger.info("Weekly scheduled run complete")
    finally:
        db.close()