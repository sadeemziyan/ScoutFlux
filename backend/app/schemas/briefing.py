from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BriefingResponse(BaseModel):
    """Shape of a briefing as returned by the API (matches the Briefing model)."""

    id: int
    user_company: str
    competitor_name: str
    competitor_urls: list[str]
    product_updates: str | None
    hiring_signals: str | None
    pricing_changes: str | None
    tech_stack_changes: str | None
    created_at: datetime

    # Lets Pydantic build this schema directly from a SQLAlchemy model
    # instance (e.g. BriefingResponse.model_validate(db_briefing)),
    # instead of manually unpacking each field yourself.
    model_config = ConfigDict(from_attributes=True)