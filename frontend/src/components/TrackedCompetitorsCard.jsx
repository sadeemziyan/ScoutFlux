import { useEffect, useState } from 'react'
import { Switch, Note } from './ui'
import { apiFetch } from '../api'

/**
 * Small inline mark meaning "this competitor's public GitHub org is
 * also being tracked". Neutral, not accent-colored - it is a fact
 * about configuration, not a state that needs attention.
 */
function GithubMark({ org }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[0.8125rem] text-slate"
      title={`GitHub org tracked: ${org}`}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
      </svg>
      {org}
    </span>
  )
}

function TrackedCompetitorsCard({ token, onUnauthorized, selected, onSelect }) {
  const [tracked, setTracked] = useState([])
  const [status, setStatus] = useState('loading')
  const [removingId, setRemovingId] = useState(null)
  const [removeError, setRemoveError] = useState(null)

  const [digestEnabled, setDigestEnabled] = useState(false)
  const [digestStatus, setDigestStatus] = useState('loading')
  const [digestSaving, setDigestSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadWatchlist() {
      try {
        const response = await apiFetch('/tracked-competitors', token)
        if (response.status === 401) return onUnauthorized()
        if (!response.ok) throw new Error(`Server responded with ${response.status}`)
        const data = await response.json()
        if (cancelled) return
        setTracked(data)
        setStatus('success')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    async function loadDigestPreference() {
      try {
        const response = await apiFetch('/auth/me', token)
        if (response.status === 401) return onUnauthorized()
        if (!response.ok) throw new Error(`Server responded with ${response.status}`)
        const data = await response.json()
        if (cancelled) return
        setDigestEnabled(data.receive_digest)
        setDigestStatus('success')
      } catch {
        if (!cancelled) setDigestStatus('error')
      }
    }

    loadWatchlist()
    loadDigestPreference()

    return () => {
      cancelled = true
    }
  }, [token, onUnauthorized])

  async function handleToggleDigest() {
    const nextValue = !digestEnabled
    setDigestSaving(true)
    setDigestEnabled(nextValue) // optimistic - reverted below if the request fails

    try {
      const response = await apiFetch('/auth/me/digest', token, {
        method: 'PATCH',
        body: JSON.stringify({ receive_digest: nextValue }),
      })
      if (response.status === 401) return onUnauthorized()
      if (!response.ok) throw new Error(`Server responded with ${response.status}`)
    } catch {
      setDigestEnabled(!nextValue) // revert on failure
    } finally {
      setDigestSaving(false)
    }
  }

  async function handleRemove(competitor) {
    setRemovingId(competitor.id)
    setRemoveError(null)
    try {
      const response = await apiFetch(`/tracked-competitors/${competitor.id}`, token, {
        method: 'DELETE',
      })
      if (response.status === 401) return onUnauthorized()
      if (!response.ok && response.status !== 204) {
        throw new Error(`Server responded with ${response.status}`)
      }
      setTracked((prev) => prev.filter((t) => t.id !== competitor.id))
      if (selected === competitor.competitor_name) onSelect(null)
    } catch {
      // Leave the row in place so the user can see it and retry.
      setRemoveError(competitor.id)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <section aria-labelledby="watchlist-heading">
        <div className="flex items-baseline justify-between gap-2 mb-2.5">
          <h2 id="watchlist-heading" className="text-[0.875rem] font-medium text-ink">
            Watchlist
          </h2>
          {status === 'success' && tracked.length > 0 && (
            <span data-numeric className="text-[0.8125rem] text-slate">
              {tracked.length}
            </span>
          )}
        </div>

        {status === 'loading' && <Note className="text-[0.8125rem]">Loading…</Note>}
        {status === 'error' && (
          <Note tone="alert" className="text-[0.8125rem]">
            Couldn't load your watchlist.
          </Note>
        )}
        {status === 'success' && tracked.length === 0 && (
          <Note className="text-[0.8125rem] leading-relaxed">
            Nothing tracked yet. Add a competitor to start collecting briefings.
          </Note>
        )}

        <ul className="space-y-0.5 -mx-2">
          {tracked.map((competitor) => {
            const isSelected = selected === competitor.competitor_name
            return (
              <li key={competitor.id} className="group relative">
                {/* The selected marker is a left bar, not a filled
                    background - it keeps the sidebar quiet while still
                    being unambiguous. */}
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full
                    ${isSelected ? 'bg-accent' : 'bg-transparent'}`}
                />
                <div
                  className={`flex items-start gap-2 rounded-control pl-3 pr-1.5 py-1.5
                    transition-colors duration-150
                    ${isSelected ? 'bg-row-selected' : 'hover:bg-row-hover'}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(isSelected ? null : competitor.competitor_name)}
                    aria-pressed={isSelected}
                    className="flex-1 min-w-0 text-left"
                  >
                    <span className="block truncate text-[0.875rem] font-medium text-ink">
                      {competitor.competitor_name}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span data-numeric className="text-[0.8125rem] text-slate">
                        {competitor.competitor_urls.length}{' '}
                        {competitor.competitor_urls.length === 1 ? 'page' : 'pages'}
                      </span>
                      {competitor.github_org && <GithubMark org={competitor.github_org} />}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(competitor)}
                    disabled={removingId === competitor.id}
                    aria-label={`Stop tracking ${competitor.competitor_name}`}
                    className="shrink-0 mt-0.5 h-5 w-5 inline-flex items-center justify-center
                      rounded text-slate opacity-0 group-hover:opacity-100
                      focus-visible:opacity-100 hover:text-accent
                      transition-opacity duration-150 disabled:opacity-45"
                  >
                    {removingId === competitor.id ? (
                      <span className="text-[0.75rem]">…</span>
                    ) : (
                      <svg viewBox="0 0 14 14" className="h-3 w-3" aria-hidden="true">
                        <path
                          d="M3 3l8 8M11 3l-8 8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {removeError === competitor.id && (
                  <p className="pl-3 pb-1 text-[0.8125rem] text-accent">
                    Couldn't remove. Try again.
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section
        aria-labelledby="digest-heading"
        className="border-t border-rule pt-4 flex items-start justify-between gap-3"
      >
        <div className="min-w-0">
          <h2 id="digest-heading" className="text-[0.875rem] font-medium text-ink">
            Weekly email digest
          </h2>
          <p className="text-[0.8125rem] text-slate leading-snug mt-0.5">
            {digestStatus === 'error'
              ? "Couldn't load this setting."
              : digestEnabled
                ? 'Sent every Monday morning.'
                : 'Off — read briefings here only.'}
          </p>
        </div>
        <Switch
          checked={digestEnabled}
          onChange={handleToggleDigest}
          disabled={digestStatus !== 'success' || digestSaving}
          label="Weekly email digest"
        />
      </section>
    </div>
  )
}

export default TrackedCompetitorsCard
