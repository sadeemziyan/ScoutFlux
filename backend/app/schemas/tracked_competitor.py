from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TrackedCompetitorResponse(BaseModel):
    id: int
    user_company: str
    competitor_name: str
    competitor_urls: list[str]
    github_org: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)