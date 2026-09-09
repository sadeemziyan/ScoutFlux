from typing import Optional

from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings
from app.agents.analyzer_agent import CompetitorSignals

REPORT_WRITER_MODEL = "gemini-3.5-flash-lite"


class PageSignals(BaseModel):
    """
    One scraped page's extracted signals, paired with its source URL.
    The report writer sees the URL for context, though the final
    briefing itself does not preserve per-signal source attribution.
    """

    url: str
    signals: CompetitorSignals
    github_activity: Optional[str] = None


class BriefingContent(BaseModel):
    """
    Final synthesized briefing for one competitor. Combines signals
    from all of that competitor's scraped pages into one coherent
    summary per category. Matches the five category fields on the
    Briefing database model.
    """

    product_updates: Optional[str] = Field(default=None, description="Synthesized summary of product updates across all sources. Null if none found.")
    hiring_signals: Optional[str] = Field(default=None, description="Synthesized summary of hiring activity across all sources. Null if none found.")
    pricing_changes: Optional[str] = Field(default=None, description="Synthesized summary of pricing information across all sources. Null if none found.")
    tech_stack_changes: Optional[str] = Field(default=None, description="Synthesized summary of tech stack signals across all sources. Null if none found.")
    github_activity: Optional[str] = Field(default=None, description="GitHub repository activity summary. Set directly from github_service, never by the LLM - see write_briefing().")


REPORT_PROMPT = """You are writing a weekly competitive intelligence briefing \
about {competitor_name}, based on signals already extracted from several \
pages on their website.

Sy  nthesize the extracted signals below into one clear, concise summary \
per category. Combine and deduplicate overlapping information across \
pages rather than restating each source separately. Do not invent \
anything beyond what is stated in the sources. If a category has no \
genuine signal in any source, leave it null.

Extracted signals per page:
{sources_text}
"""


def get_report_writer_llm() -> ChatGoogleGenerativeAI:
    """
    Returns the LLM used for report synthesis. Uses Flash-Lite rather
    than standard Flash, despite Flash's somewhat better synthesis
    quality, because Flash's free tier caps at 20 requests/day total,
    shared across every user of the deployed app. That ceiling breaks
    down quickly with real traffic plus the weekly scheduled job,
    while Flash-Lite's 500/day comfortably covers portfolio-demo
    scale. Swapping to a stronger model (Claude or GPT) later, once
    there is a reason to pay for API access, only requires changing
    this function.
    """
    return ChatGoogleGenerativeAI(
        model=REPORT_WRITER_MODEL,
        google_api_key=settings.gemini_api_key,
    )


def write_briefing(competitor_name: str, page_signals: list[PageSignals]) -> BriefingContent:
    """
    Synthesizes signals from multiple scraped pages into one final
    briefing for a competitor. Skips the LLM call entirely and returns
    an all-null result if no page had any genuine signal, avoiding a
    wasted API call for nothing.

    github_activity is handled separately from LLM synthesis entirely -
    it's already a finished sentence from a structured API call, not
    raw scraped text needing extraction, so it's copied straight
    through onto the result rather than asking the LLM to reproduce or
    re-synthesize it. This mirrors github_service.py's own reasoning
    for skipping an LLM call in the first place.
    """
    github_activity = next((ps.github_activity for ps in page_signals if ps.github_activity), None)
    scraped_page_signals = [ps for ps in page_signals if not ps.github_activity]

    has_any_signal = any(
        ps.signals.product_updates
        or ps.signals.hiring_signals
        or ps.signals.pricing_changes
        or ps.signals.tech_stack_changes
        for ps in scraped_page_signals
    )

    if not has_any_signal:
        return BriefingContent(github_activity=github_activity)

    llm = get_report_writer_llm()
    structured_llm = llm.with_structured_output(BriefingContent)

    sources_text = "\n\n".join(
        f"Source: {ps.url}\n"
        f"Product updates: {ps.signals.product_updates or 'none found'}\n"
        f"Hiring signals: {ps.signals.hiring_signals or 'none found'}\n"
        f"Pricing changes: {ps.signals.pricing_changes or 'none found'}\n"
        f"Tech stack changes: {ps.signals.tech_stack_changes or 'none found'}"
        for ps in scraped_page_signals
    )

    prompt = REPORT_PROMPT.format(competitor_name=competitor_name, sources_text=sources_text)

    briefing = structured_llm.invoke(prompt)
    # Overwrite whatever the LLM guessed for this field (its prompt
    # never mentions github_activity, so it should default to null
    # anyway) with the real, already-correct value.
    briefing.github_activity = github_activity
    return briefing