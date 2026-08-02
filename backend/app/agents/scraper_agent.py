import logging
import time
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

USER_AGENT = "ScoutFluxBot/1.0 (+https://github.com/sadeemziyan/ScoutFlux)"
REQUEST_TIMEOUT_SECONDS = 10
DELAY_BETWEEN_REQUESTS_SECONDS = 2


def is_scraping_allowed(url: str) -> bool:
    """
    Checks the site's robots.txt to see if our bot is allowed to
    fetch this specific URL. Fails closed: if robots.txt can't be
    read or parsed for any reason, we treat that as "not allowed"
    rather than assuming permission.
    """
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"

    parser = RobotFileParser()
    parser.set_url(robots_url)

    try:
        parser.read()
    except Exception as e:
        logger.warning(f"Could not read robots.txt at {robots_url}: {e}")
        return False

    return parser.can_fetch(USER_AGENT, url)


def fetch_page(url: str) -> requests.Response | None:
    """
    Fetches a URL with an honest User-Agent and a timeout.
    Returns None (rather than raising) on any request failure, so a
    single bad competitor URL doesn't take down the whole scrape run.
    """
    headers = {"User-Agent": USER_AGENT}

    try:
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
        return response
    except requests.RequestException as e:
        logger.warning(f"Request failed for {url}: {e}")
        return None


def looks_like_gated_content(response: requests.Response) -> bool:
    """
    Heuristic check for whether we actually landed on a real public
    page, rather than a login wall or paywall we got redirected to.
    Not foolproof — sites gate content in many different ways — but
    catches the common cases (explicit auth failure, or a redirect
    history landing us somewhere with "login"/"signin" in the URL).
    """
    if response.status_code in (401, 403):
        return True

    for redirect in response.history:
        redirect_path = redirect.url.lower()
        if "login" in redirect_path or "signin" in redirect_path:
            return True

    return False


def scrape_url(url: str) -> str | None:
    """
    Full safety-checked scrape of a single URL.
    Returns the page's visible text content, or None if the URL should
    be (or was unable to be) scraped, logging the reason either way.
    """
    if not is_scraping_allowed(url):
        logger.info(f"Skipping {url}: disallowed by robots.txt")
        return None

    response = fetch_page(url)
    if response is None:
        return None

    if not response.ok:
        logger.info(f"Skipping {url}: HTTP {response.status_code}")
        return None

    if looks_like_gated_content(response):
        logger.info(f"Skipping {url}: appears to be behind a login/paywall")
        return None

    soup = BeautifulSoup(response.text, "html.parser")

    # Rate limit — space out requests so we're not hammering
    # the competitor's server on this or subsequent calls.
    time.sleep(DELAY_BETWEEN_REQUESTS_SECONDS)

    return soup.get_text(separator=" ", strip=True)