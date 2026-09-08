from pydantic import BaseModel, HttpUrl


class CompetitorInput(BaseModel):
    """A single competitor to track: display name + URL to scrape."""

    name: str
    url: HttpUrl


class CompanyTrackingRequest(BaseModel):
    """
    Submitted when a user sets up tracking: their own company name,
    plus the list of competitors they want briefings generated for.
    """

    user_company: str
    competitors: list[CompetitorInput]