from typing import TypedDict
import time

from langgraph.graph import StateGraph, END

from sqlalchemy.orm import Session
from app.models.briefing import Briefing

from app.agents.scraper_agent import scrape_url, close_all_selenium_drivers
from app.agents.analyzer_agent import analyze_page
from app.agents.report_writer_agent import write_briefing, PageSignals, BriefingContent
from app.schemas.company import CompanyTrackingRequest

ANALYZER_CALL_DELAY_SECONDS = 4

class PipelineState(TypedDict):
    """
    Shared state passed between nodes for one competitor's pipeline run.
    Each node reads what it needs and returns only the fields it updates.
    """

    competitor_name: str
    urls: list[str]
    scraped_pages: list[dict]
    page_signals: list[PageSignals]
    briefing: BriefingContent | None


def scrape_node(state: PipelineState) -> dict:
    """Scrapes every URL for this competitor. URLs that fail or are blocked are skipped, not treated as errors."""
    scraped_pages = []
    for url in state["urls"]:
        text = scrape_url(url)
        if text:
            scraped_pages.append({"url": url, "text": text})
    return {"scraped_pages": scraped_pages}


def analyze_node(state: PipelineState) -> dict:
    """
    Runs the analyzer agent on each successfully scraped page.
    A small delay between calls keeps this comfortably under the
    analyzer model's free tier RPM limit, mirroring the scraper's
    own rate limiting toward external sites.
    """
    page_signals = []
    for page in state["scraped_pages"]:
        signals = analyze_page(state["competitor_name"], page["url"], page["text"])
        page_signals.append(PageSignals(url=page["url"], signals=signals))
        time.sleep(ANALYZER_CALL_DELAY_SECONDS)

    return {"page_signals": page_signals}


def synthesize_node(state: PipelineState) -> dict:
    """Runs the report writer agent to combine all page signals into one briefing."""
    briefing = write_briefing(state["competitor_name"], state["page_signals"])
    return {"briefing": briefing}


def build_pipeline_graph():
    """Builds the three-node scrape/analyze/synthesize pipeline for one competitor."""
    graph = StateGraph(PipelineState)
    graph.add_node("scrape", scrape_node)
    graph.add_node("analyze", analyze_node)
    graph.add_node("synthesize", synthesize_node)
    graph.set_entry_point("scrape")
    graph.add_edge("scrape", "analyze")
    graph.add_edge("analyze", "synthesize")
    graph.add_edge("synthesize", END)
    return graph.compile()

def _save_briefing(db: Session, user_id: int, user_company: str, competitor: "CompetitorInput", content: BriefingContent) -> Briefing:
    """Persists one competitor's synthesized briefing as a new row."""
    briefing = Briefing(
        user_id=user_id,
        user_company=user_company,
        competitor_name=competitor.name,
        competitor_urls=[str(u) for u in competitor.urls],
        product_updates=content.product_updates,
        hiring_signals=content.hiring_signals,
        pricing_changes=content.pricing_changes,
        tech_stack_changes=content.tech_stack_changes,
    )
    db.add(briefing)
    db.commit()
    db.refresh(briefing)
    return briefing

def run_pipeline(request: CompanyTrackingRequest, db: Session, user_id: int) -> list[Briefing]:
    """
    Runs the full pipeline for every competitor in the request and
    saves each result as a Briefing row. Returns the saved rows.
    """
    graph = build_pipeline_graph()
    saved_briefings = []

    try:
        for competitor in request.competitors:
            initial_state: PipelineState = {
                "competitor_name": competitor.name,
                "urls": [str(u) for u in competitor.urls],
                "scraped_pages": [],
                "page_signals": [],
                "briefing": None,
            }
            final_state = graph.invoke(initial_state)
            saved = _save_briefing(db, user_id, request.user_company, competitor, final_state["briefing"])
            saved_briefings.append(saved)
    finally:
        close_all_selenium_drivers()

    return saved_briefings