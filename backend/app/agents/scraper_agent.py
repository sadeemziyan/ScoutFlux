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

# Cached per-domain: robots.txt is identical for every page on a
# domain, so we fetch it once and reuse it across all URLs on that
# same domain instead of hitting the network again each time.
# Stores (parsed RobotFileParser, raw text) - both None if unreachable.
_robots_cache: dict[str, tuple[RobotFileParser | None, str | None]] = {}


def _load_robots(domain: str) -> tuple[RobotFileParser | None, str | None]:
    """
    Fetches and caches robots.txt for a domain, once per domain, using
    our own honest User-Agent and timeout. Returns (parser, raw_text).

    Three distinct outcomes, not one blanket "success or fail closed":
    - 404 (no robots.txt published): well-defined as "no restrictions
      declared" - treated as fully permissive, not uncertain.
    - 401/403 (access to the rules file itself is blocked): treated as
      fully disallowed - a site restricting its own rules is a
      stronger signal than silence.
    - Anything else (network failure, 5xx, etc.): genuinely uncertain
      or possibly temporary - fails closed, per our original policy.
    """
    if domain in _robots_cache:
        return _robots_cache[domain]

    try:
        response = requests.get(
            f"{domain}/robots.txt",
            headers={"User-Agent": USER_AGENT},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as e:
        logger.warning(f"Could not reach {domain} for robots.txt: {e}")
        _robots_cache[domain] = (None, None)
        return _robots_cache[domain]

    if response.status_code == 404:
        logger.info(f"No robots.txt at {domain} (404) - treating as unrestricted")
        parser = RobotFileParser()
        parser.parse([])  # empty ruleset - can_fetch() defaults to True
        _robots_cache[domain] = (parser, "")
        return _robots_cache[domain]

    if response.status_code in (401, 403):
        logger.warning(f"robots.txt at {domain} returned {response.status_code} - treating as fully disallowed")
        _robots_cache[domain] = (None, None)
        return _robots_cache[domain]

    if not response.ok:
        logger.warning(f"robots.txt at {domain} returned {response.status_code} - failing closed")
        _robots_cache[domain] = (None, None)
        return _robots_cache[domain]

    raw_text = response.text
    parser = RobotFileParser()
    parser.parse(raw_text.splitlines())
    _robots_cache[domain] = (parser, raw_text)
    return _robots_cache[domain]


def is_scraping_allowed(url: str) -> bool:
    """
    Checks the site's robots.txt (cached per domain) to see if our bot
    is allowed to fetch this specific URL. Fails closed: if robots.txt
    can't be read or parsed, we treat that as "not allowed" rather
    than assuming permission.
    """
    parsed = urlparse(url)
    domain = f"{parsed.scheme}://{parsed.netloc}"

    parser, _ = _load_robots(domain)
    if parser is None:
        return False
    return parser.can_fetch(USER_AGENT, url)


def ai_input_disallowed(url: str) -> bool:
    """
    Checks for Cloudflare's newer "Content Signals" extension to
    robots.txt - specifically whether this site has explicitly opted
    out of `ai-input` (feeding its content into an AI model), which is
    exactly what our analyzer agent does with scraped text.

    This is separate from is_scraping_allowed(): a page can be fully
    permitted to fetch under traditional Disallow/Allow rules while
    still explicitly opting out of this specific downstream use.
    Python's built-in RobotFileParser doesn't recognize this newer
    directive, so we scan the raw text for it ourselves.

    If robots.txt couldn't be read at all, that's not treated as an
    ai-input opt-out here - is_scraping_allowed() already fails closed
    on that same underlying fetch failure.
    """
    parsed = urlparse(url)
    domain = f"{parsed.scheme}://{parsed.netloc}"

    _, raw_text = _load_robots(domain)
    if raw_text is None:
        return False

    for line in raw_text.splitlines():
        stripped = line.strip().lower()
        if stripped.startswith("content-signal:") and "ai-input=no" in stripped:
            return True

    return False


def fetch_page(url: str) -> requests.Response | None:
    """
    Fetches a URL with an honest User-Agent and a timeout.
    Returns None (rather than raising) on any request failure, so a
    single bad competitor URL doesn't take down the whole scrape run.
    """
    headers = {"User-Agent": USER_AGENT}

    try:
        return requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
    except requests.RequestException as e:
        logger.warning(f"Request failed for {url}: {e}")
        return None


def looks_like_gated_content(response: requests.Response) -> bool:
    """
    Heuristic check for whether we actually landed on a real public
    page, rather than a login wall or paywall we got redirected to.
    Not foolproof - sites gate content in many different ways - but
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

    if ai_input_disallowed(url):
        logger.info(f"Skipping {url}: site opted out of ai-input via Content-Signal")
        return None

    response = fetch_page(url)
    if response is None:
        return None

    # A real request just went out over the network, regardless of
    # what we do with the response - so the politeness delay belongs
    # here, applying to failed/gated pages too, not just successes.
    time.sleep(DELAY_BETWEEN_REQUESTS_SECONDS)

    if not response.ok:
        logger.info(f"Skipping {url}: HTTP {response.status_code}")
        return None

    if looks_like_gated_content(response):
        logger.info(f"Skipping {url}: appears to be behind a login/paywall")
        return None

    soup = BeautifulSoup(response.text, "html.parser")
    return soup.get_text(separator=" ", strip=True)