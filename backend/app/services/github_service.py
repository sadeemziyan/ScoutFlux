"""
Fetches lightweight GitHub activity signals for a tracked competitor's
GitHub org/username, using GitHub's official MCP server.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone

from langchain_mcp_adapters.client import MultiServerMCPClient

from app.core.config import settings

logger = logging.getLogger(__name__)

GITHUB_MCP_URL = "https://api.githubcopilot.com/mcp/"
TOP_N_REPOS_FOR_COMMIT_CHECK = 5


def get_github_activity_summary(org: str) -> str | None:
    """
    Synchronous entry point - this is what pipeline.py actually calls.
    Returns a templated 1-2 sentence summary, or None if the org has no
    discoverable public repos or the lookup fails for any reason.
    """
    try:
        return asyncio.run(_fetch_github_activity(org))
    except Exception as e:
        # Same "skip and log, don't crash" pattern as the scraper - one
        # competitor's bad/missing GitHub org shouldn't break the
        # whole pipeline run.
        logger.error(f"GitHub MCP lookup failed for org '{org}': {e}")
        return None


async def _fetch_github_activity(org: str) -> str | None:
    client = MultiServerMCPClient(
        {
            "github": {
                "transport": "http",
                "url": GITHUB_MCP_URL,
                "headers": {"Authorization": f"Bearer {settings.github_token}"},
            }
        }
    )
    tools = await client.get_tools()
    tools_by_name = {tool.name: tool for tool in tools}

    search_tool = tools_by_name["search_repositories"]
    commits_tool = tools_by_name["list_commits"]

    # Sorted by most recently updated, so the first page IS "their most
    # active repos" - no separate sorting step needed afterward.
    all_repos_result = await search_tool.ainvoke({
        "query": f"org:{org}",
        "sort": "updated",
        "order": "desc",
        "perPage": TOP_N_REPOS_FOR_COMMIT_CHECK,
    })

    try:
        all_repos_data = _parse_tool_result(all_repos_result)
    except json.JSONDecodeError:
        # GitHub's search tool returns a plain-English error message
        # (not JSON) when the org doesn't exist or has no discoverable
        # public repos - confirmed directly against the live server
        # with "craft". This is the same common, expected case the
        # scraper already treats as "skip and log", not a real failure.
        logger.info(f"GitHub org '{org}' not found or has no public repos")
        return None

    total_count = all_repos_data.get("total_count", 0)
    if total_count == 0:
        # Matches the scraper's existing behavior for a competitor with
        # nothing to find - not an error, just nothing to report.
        logger.info(f"No public repos found for GitHub org '{org}'")
        return None

    # A second, narrower search - GitHub's search API does the date
    # filtering server-side via the created: qualifier, so this is
    # still just one total_count read, no client-side date math over a
    # full repo list.
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    new_repos_result = await search_tool.ainvoke({
        "query": f"org:{org} created:>={thirty_days_ago}",
    })
    new_repo_count = _parse_tool_result(new_repos_result).get("total_count", 0)

    # Commit activity across the most active repos, last 7 days.
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
    active_repos = all_repos_data.get("items", [])[:TOP_N_REPOS_FOR_COMMIT_CHECK]

    total_commits = 0
    for repo in active_repos:
        try:
            commits_result = await commits_tool.ainvoke({
                "owner": org,
                "repo": repo["name"],
                "since": seven_days_ago,
            })
            commits_data = _parse_tool_result(commits_result)
            # list_commits returns a plain list, not a {"items": [...]} wrapper.
            if isinstance(commits_data, list):
                total_commits += len(commits_data)
        except Exception as e:
            # One repo's commit history failing to fetch (e.g. empty or
            # archived repo) shouldn't sink the whole summary.
            logger.warning(f"Could not fetch commits for {org}/{repo.get('name')}: {e}")

    return (
        f"{org} has {total_count} public repositories on GitHub, "
        f"with {new_repo_count} created in the last 30 days. "
        f"Across their most active repos, there were {total_commits} commits in the past week."
    )


def _parse_tool_result(result):
    """
    langchain-mcp-adapters hands back MCP tool results as a list of
    content blocks - e.g. [{"type": "text", "text": "<json string>",
    "id": "..."}] - not parsed data directly. This unwraps that shape
    before parsing the actual JSON payload inside.
    """
    if isinstance(result, list) and result and isinstance(result[0], dict) and "text" in result[0]:
        result = result[0]["text"]
    if isinstance(result, str):
        return json.loads(result)
    return result