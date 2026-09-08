from typing import Optional

from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings

ANALYZER_MODEL = "gemini-3.5-flash-lite"

class CompetitorSignals(BaseModel):
    """
    Structured signals extracted from a single scraped page. Any
    category genuinely not present in the source text is left as
    None, rather than guessed or invented.
    """

    product_updates: Optional[str] = Field(
        default=None,
        description="Summary of product updates, launches, or feature announcements found. Null if none present.",
    )
    hiring_signals: Optional[str] = Field(
        default=None,
        description="Summary of hiring activity, job postings, or team growth signals found. Null if none present.",
    )
    pricing_changes: Optional[str] = Field(
        default=None,
        description="Summary of pricing information or pricing changes found. Null if none present.",
    )
    tech_stack_changes: Optional[str] = Field(
        default=None,
        description="Summary of technology stack signals (frameworks, tools, infrastructure) found. Null if none present.",
    )


ANALYSIS_PROMPT = """You are analyzing a single scraped web page from a competitor's \
website to extract competitive intelligence signals.

Extract ONLY information that is genuinely present in the text below. \
Do not guess, infer, or invent signals that aren't actually stated.
Summarize and paraphrase in your own words - do not copy sentences \
verbatim from the source text.
If a category has no relevant information in this text, leave it null.

Competitor: {competitor_name}
Source URL: {url}

Scraped page text:
{scraped_text}
"""


def get_analyzer_llm() -> ChatGoogleGenerativeAI:
    """
    Returns a Gemini Flash model configured for structured signal
    extraction. Flash (not a stronger/pricier model) is deliberate:
    this agent runs once per scraped page, so call volume is high
    relative to the report-writer agent, which runs once per briefing.
    Temperature 0 since this is factual extraction, not creative work.
    """
    return ChatGoogleGenerativeAI(
        model=ANALYZER_MODEL,
        google_api_key=settings.gemini_api_key,
    )


def analyze_page(competitor_name: str, url: str, scraped_text: str) -> CompetitorSignals:
    """
    Extracts structured competitor signals from one scraped page.
    Returns a CompetitorSignals object with any non-applicable
    categories left as None.
    """
    llm = get_analyzer_llm()
    structured_llm = llm.with_structured_output(CompetitorSignals)

    prompt = ANALYSIS_PROMPT.format(
        competitor_name=competitor_name,
        url=url,
        scraped_text=scraped_text,
    )

    return structured_llm.invoke(prompt)