import logging
import time
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

logger = logging.getLogger(__name__)

USER_AGENT = "ScoutFluxBot/1.0 (+https://github.com/sadeemziyan/ScoutFlux)"
REQUEST_TIMEOUT_SECONDS = 10
DELAY_BETWEEN_REQUESTS_SECONDS = 2
RENDERING_COMPARISON_THRESHOLD = 1.2  # Selenium must exceed static length by this factor to flip a domain's strategy

_robots_cache: dict[str, tuple[RobotFileParser | None, str | None]] = {}
_rendering_strategy_cache: dict[str, str] = {}  # domain -> "static" or "selenium"
_selenium_driver_cache: dict[str, webdriver.Chrome] = {}  # domain -> open driver, reused across that domain's pages


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
        parser.parse([])
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

    Separate from is_scraping_allowed(): a page can be fully permitted
    to fetch under traditional Disallow/Allow rules while still
    explicitly opting out of this specific downstream use. Python's
    built-in RobotFileParser doesn't recognize this newer directive,
    so we scan the raw text for it ourselves.
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


def _build_chrome_options() -> Options:
    """
    Headless Chrome config for WSL2: no display server available,
    sandboxing disabled (acceptable for local dev against known,
    trusted competitor sites - would need reconsidering for untrusted
    input), and disk-based temp storage since /dev/shm is often too
    small in WSL2/containerized environments.
    """
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument(f"--user-agent={USER_AGENT}")
    return options


def _get_selenium_driver(domain: str) -> webdriver.Chrome:
    """
    Returns the open Chrome driver for a domain, creating one if this
    is the first time this domain needs Selenium. Reusing one driver
    across a domain's pages avoids paying full browser launch/teardown
    cost on every single page.
    """
    if domain not in _selenium_driver_cache:
        driver = webdriver.Chrome(options=_build_chrome_options())
        driver.set_page_load_timeout(REQUEST_TIMEOUT_SECONDS)
        _selenium_driver_cache[domain] = driver

    return _selenium_driver_cache[domain]


def _close_selenium_driver(domain: str) -> None:
    """Quits and evicts a single domain's driver, if one is open."""
    driver = _selenium_driver_cache.pop(domain, None)
    if driver is not None:
        driver.quit()


def close_all_selenium_drivers() -> None:
    """
    Quits every open Selenium driver and clears the cache. Must be
    called once, by whoever orchestrates a scrape run, after that run
    finishes - drivers persist across scrape_url() calls for reuse, so
    nothing closes them automatically otherwise.
    """
    for domain in list(_selenium_driver_cache.keys()):
        _close_selenium_driver(domain)


def fetch_with_selenium(driver: webdriver.Chrome, url: str) -> str | None:
    """
    Loads a URL in an already-open Chrome driver and returns its
    rendered text. Driver lifecycle (creation/teardown) is the
    caller's responsibility - this function only navigates and
    extracts.
    """
    try:
        driver.get(url)
        soup = BeautifulSoup(driver.page_source, "html.parser")
        return soup.get_text(separator=" ", strip=True)
    except Exception as e:
        logger.warning(f"Selenium fetch failed for {url}: {e}")
        return None


def _determine_rendering_strategy(domain: str, sample_url: str, static_text: str) -> tuple[str, str | None]:
    """
    Decides, once per domain, whether pages here need Selenium by
    directly comparing static vs. rendered content on one sample page
    - rather than guessing from a fixed length threshold, which can't
    tell "enough real content" apart from "some content, but more is
    loaded dynamically and missing."

    Returns (strategy, selenium_text_if_fetched) - the second value
    lets the caller reuse the Selenium fetch that happened during this
    comparison, instead of fetching the same page twice.

    Known limitation: assumes a domain's pages are consistently built
    (all JS-rendered or all server-rendered). A site mixing both - e.g.
    a static blog alongside a JS-heavy embedded job board - could be
    misclassified based on whichever page is scraped first. Accepted
    tradeoff for this project's scale; a page-level check would remove
    this risk at the cost of Selenium overhead on every page.
    """
    if domain in _rendering_strategy_cache:
        return _rendering_strategy_cache[domain], None

    driver = _get_selenium_driver(domain)
    selenium_text = fetch_with_selenium(driver, sample_url)

    if selenium_text and len(selenium_text) > len(static_text) * RENDERING_COMPARISON_THRESHOLD:
        logger.info(f"{domain}: Selenium found meaningfully more content, using it going forward")
        strategy = "selenium"
    else:
        strategy = "static"
        _close_selenium_driver(domain)  # only needed for this comparison — won't be reused

    _rendering_strategy_cache[domain] = strategy
    return strategy, selenium_text


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

    time.sleep(DELAY_BETWEEN_REQUESTS_SECONDS)

    if not response.ok:
        logger.info(f"Skipping {url}: HTTP {response.status_code}")
        return None

    if looks_like_gated_content(response):
        logger.info(f"Skipping {url}: appears to be behind a login/paywall")
        return None

    soup = BeautifulSoup(response.text, "html.parser")
    text = soup.get_text(separator=" ", strip=True)

    domain = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
    strategy, selenium_text = _determine_rendering_strategy(domain, url, text)

    if strategy == "selenium":
        if selenium_text is None:  # cached strategy from an earlier page — this page needs its own fetch
            driver = _get_selenium_driver(domain)
            selenium_text = fetch_with_selenium(driver, url)
        if selenium_text:
            return selenium_text

    return text