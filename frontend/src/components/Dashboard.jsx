import { useEffect, useMemo, useState } from 'react'
import BriefingCard, { CategoryLedger } from './BriefingCard'
import { Panel, SectionHeading, Note, Button } from './ui'
import { apiFetch } from '../api'
import { categoryLedger, dayKey, formatDay, formatTime } from '../lib/briefing'

/**
 * One row in the chronological history.
 *
 * History is deliberately NOT the same card as "Latest". Latest is a
 * small number of white panels you read; history is a long archive you
 * scan, so it is flush hairline-separated rows on the canvas ground,
 * grouped under date rules. Same tokens, different structure - that is
 * what carries the hierarchy, rather than one card style repeated at
 * different sizes.
 *
 * Expanding a row is the only animated transition in the application.
 */
function HistoryRow({ briefing }) {
  const [open, setOpen] = useState(false)
  const ledger = categoryLedger(briefing)
  const panelId = `briefing-${briefing.id}`

  return (
    <li className="border-b border-rule last:border-b-0">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="w-full text-left py-3 px-2 -mx-2 rounded-control
            flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4
            transition-colors duration-150 hover:bg-row-hover"
        >
          <span className="flex items-baseline gap-3 shrink-0">
            <span className="font-serif text-[1rem] font-semibold text-ink">
              {briefing.competitor_name}
            </span>
            <time data-numeric dateTime={briefing.created_at} className="text-[0.8125rem] text-slate">
              {formatTime(briefing.created_at)}
            </time>
          </span>
          <span className="min-w-0 sm:ml-auto">
            <CategoryLedger ledger={ledger} variant="row" />
          </span>
        </button>
      </h3>

      <div id={panelId} className="sf-expand" data-open={open} role="region">
        <div>
          <div className="pb-5 pt-1 pl-2 pr-2">
            <BriefingCard briefing={briefing} showHeader={false} showSources={false} />
          </div>
        </div>
      </div>
    </li>
  )
}

function Dashboard({ token, onUnauthorized, filter, onClearFilter, onTrackNew }) {
  const [briefings, setBriefings] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false

    async function fetchBriefings() {
      try {
        const response = await apiFetch('/briefings', token)
        if (response.status === 401) {
          onUnauthorized()
          return
        }
        if (!response.ok) throw new Error(`Server responded with ${response.status}`)
        const data = await response.json()
        if (cancelled) return
        setBriefings(data)
        setStatus('success')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    fetchBriefings()
    return () => {
      cancelled = true
    }
  }, [token, onUnauthorized])

  const { latest, history } = useMemo(() => {
    const sorted = [...briefings].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )
    const scoped = filter ? sorted.filter((b) => b.competitor_name === filter) : sorted

    const seen = new Set()
    const latestPerCompetitor = scoped.filter((b) => {
      if (seen.has(b.competitor_name)) return false
      seen.add(b.competitor_name)
      return true
    })

    // Group the full archive by calendar day.
    const grouped = []
    for (const briefing of scoped) {
      const key = dayKey(briefing.created_at)
      const bucket = grouped.at(-1)
      if (bucket && bucket.key === key) bucket.items.push(briefing)
      else grouped.push({ key, date: briefing.created_at, items: [briefing] })
    }

    return { latest: latestPerCompetitor, history: grouped }
  }, [briefings, filter])

  if (status === 'loading') {
    return <Note className="py-10">Loading briefings…</Note>
  }

  if (status === 'error') {
    return (
      <Note tone="alert" className="py-10">
        Couldn't load briefings. Check that the API is running, then reload.
      </Note>
    )
  }

  if (briefings.length === 0) {
    return (
      <Panel className="p-8 max-w-lg">
        <h2 className="font-serif text-[1.3125rem] font-semibold text-ink mb-2">
          No briefings yet
        </h2>
        <p className="text-[0.9375rem] text-slate mb-5 leading-relaxed">
          Add a competitor and the agents will scrape their pages, pull public GitHub
          activity, and file the first briefing here.
        </p>
        <Button onClick={onTrackNew}>Track a competitor</Button>
      </Panel>
    )
  }

  return (
    <div>
      {/* Sits outside the space-y-12 rhythm below rather than trying to
          cancel it with a negative margin. Tailwind v4's space-y-* sets
          margin-block-end on the child itself through a zero-specificity
          :where() rule, so a -mb-* utility replaces that gap outright
          instead of trimming it - which collapsed this bar into the
          "Latest briefings" heading. */}
      {filter && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-6">
          <p className="text-[0.875rem] text-slate">
            Filtered to <span className="font-medium text-ink">{filter}</span>
          </p>
          <Button variant="quiet" size="sm" onClick={onClearFilter}>
            Show all
          </Button>
        </div>
      )}

      <div className="space-y-12">
        <section aria-labelledby="latest-heading">
          <SectionHeading className="mb-1" count={latest.length === 1 ? '1 competitor' : `${latest.length} competitors`}>
            <span id="latest-heading">Latest briefings</span>
          </SectionHeading>
          <p className="text-[0.875rem] text-slate mb-5">
            The most recent run for each competitor you track.
          </p>

          {latest.length === 0 ? (
            <Note>Nothing filed for this competitor yet.</Note>
          ) : (
            <div className="space-y-4">
              {latest.map((briefing) => (
                <Panel key={briefing.id} className="p-5 sm:p-6">
                  <BriefingCard briefing={briefing} />
                </Panel>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="history-heading">
          <SectionHeading
            className="mb-1"
            count={briefings.length === 1 ? '1 briefing' : `${history.reduce((n, g) => n + g.items.length, 0)} briefings`}
          >
            <span id="history-heading">History</span>
          </SectionHeading>
          <p className="text-[0.875rem] text-slate mb-5">
            Every run, newest first. Select a briefing to read it in full.
          </p>

          <div className="space-y-7">
            {history.map((group) => (
              <div key={group.key}>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-[0.875rem] font-medium text-ink shrink-0">
                    {formatDay(group.date)}
                  </h3>
                  <span className="h-px bg-rule flex-1" aria-hidden="true" />
                </div>
                <ul>
                  {group.items.map((briefing) => (
                    <HistoryRow key={briefing.id} briefing={briefing} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Dashboard
