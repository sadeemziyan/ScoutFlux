/**
 * Shared briefing vocabulary. Kept in one place so the dashboard, the
 * cards and the history rows always name and order the five categories
 * identically.
 */

/**
 * `inline` is the mid-sentence form. It is stored rather than derived
 * with toLowerCase(), which would turn "GitHub" into "github".
 */
export const CATEGORIES = [
  { key: 'product_updates', label: 'Product updates', inline: 'product updates' },
  { key: 'hiring_signals', label: 'Hiring signals', inline: 'hiring signals' },
  { key: 'pricing_changes', label: 'Pricing changes', inline: 'pricing changes' },
  { key: 'tech_stack_changes', label: 'Tech stack changes', inline: 'tech stack changes' },
  { key: 'github_activity', label: 'GitHub activity', inline: 'GitHub activity' },
]

/**
 * The full five-slot ledger for a briefing - every category, each
 * flagged present or absent.
 *
 * The UI renders body content only for categories that have content,
 * but it still shows all five names. "Hiring signals only" is
 * information precisely because the other four were searched and came
 * back empty; dropping them entirely would hide the difference between
 * "not checked" and "checked, nothing found".
 */
export function categoryLedger(briefing) {
  return CATEGORIES.map((category) => ({
    ...category,
    value: briefing[category.key] || null,
    present: Boolean(briefing[category.key]),
  }))
}

/**
 * github_activity arrives from the backend as exactly two lines joined
 * by \n (see github_service._fetch_github_activity):
 *
 *   line 1 - repo/commit counts straight from the GitHub API
 *   line 2 - either a Gemini-written summary of the commit messages,
 *            or, when there were zero commits, a fixed string
 *
 * These have genuinely different epistemic status, so they are split
 * here and rendered differently. The zero-commit case is checked
 * explicitly: it is a hardcoded backend string, and labelling it
 * "AI-read" would be a lie in exactly the place this app claims to be
 * careful about provenance.
 */
const NO_COMMIT_ACTIVITY = 'No commit activity in the past week.'

export function splitGithubActivity(raw) {
  if (!raw) return null

  const [stats, ...rest] = raw.split('\n')
  const interpretation = rest.join('\n').trim()

  return {
    stats: stats.trim(),
    interpretation: interpretation || null,
    // Only a real Gemini call earns the "AI-read" label.
    interpreted: Boolean(interpretation) && interpretation !== NO_COMMIT_ACTIVITY,
  }
}

/** "Mar 4, 2026" - stable across locales for grouping history by day. */
export function dayKey(isoString) {
  return new Date(isoString).toDateString()
}

export function formatDay(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Reading form for a tracked source URL. The protocol is pure noise in
 * a list of one competitor's own pages, so it is stripped for display
 * while the link itself keeps the original, unmodified URL.
 */
export function displayUrl(url) {
  return url.replace(/^https?:\/\//, '').replace(/\/+$/, '')
}
