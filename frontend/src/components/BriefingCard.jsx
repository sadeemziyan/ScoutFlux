import { categoryLedger, splitGithubActivity, formatDay, formatTime } from '../lib/briefing'

/**
 * The five-slot ledger. Found categories are ink and medium-weight;
 * empty ones stay visible in rule-gray. Two states, no per-category
 * color coding - a five-color chip set would be noise, and the useful
 * signal here is simply "which of the five fired".
 */
export function CategoryLedger({ ledger, variant = 'row' }) {
  const found = ledger.filter((c) => c.present)
  const missing = ledger.filter((c) => !c.present)

  /**
   * Inside an expanded briefing, every category that has content
   * already has its own heading a few pixels below. Repeating all five
   * names here would just be the same list twice, so the expanded form
   * states only the part the body cannot show: what was searched and
   * came back empty.
   */
  if (variant === 'summary') {
    if (found.length === 0) {
      return (
        <p className="text-[0.75rem] text-graphite">
          All 5 categories were checked. Nothing found in this run.
        </p>
      )
    }
    return (
      <p className="flex flex-wrap items-baseline gap-x-2 text-[0.75rem]">
        <span data-numeric className="font-medium text-ink">
          {found.length} of 5 categories
        </span>
        {missing.length > 0 && (
          <>
            <span className="text-rule" aria-hidden="true">
              |
            </span>
            <span className="text-graphite">
              nothing found in {missing.map((c) => c.inline).join(', ')}
            </span>
          </>
        )}
      </p>
    )
  }

  /**
   * Collapsed history rows have no visible body, so there the full
   * five-slot ledger does real work. Below `sm` the names are dropped
   * rather than wrapped - at that width the count alone is the
   * scannable part.
   */
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.75rem]">
      <span data-numeric className="font-medium text-ink">
        {found.length} of 5
      </span>
      <span className="hidden sm:flex sm:flex-wrap sm:items-baseline sm:gap-x-2 sm:gap-y-1 min-w-0">
        <span className="text-rule" aria-hidden="true">
          |
        </span>
        {ledger.map((category) => (
          <span
            key={category.key}
            className={category.present ? 'font-medium text-ink' : 'text-rule'}
          >
            {category.label}
          </span>
        ))}
      </span>
      <span className="sr-only">
        {found.length} of 5 categories have findings:{' '}
        {found.map((c) => c.label).join(', ') || 'none'}.
      </span>
    </span>
  )
}

/**
 * GitHub activity renders as two visually distinct lines because the
 * two lines are different kinds of claim:
 *
 *   stats line  - measured, straight from the GitHub API.
 *                 Sans, ink, tabular figures.
 *   summary     - a model's reading of the commit messages.
 *                 Serif, graphite, behind an explicit label.
 *
 * The typography reinforces a distinction the label states outright -
 * it is never asked to carry the meaning on its own.
 */
function GithubActivity({ raw }) {
  const activity = splitGithubActivity(raw)
  if (!activity) return null

  return (
    <div className="space-y-2.5">
      <p data-numeric className="text-[0.875rem] text-ink leading-relaxed">
        {activity.stats}
      </p>

      {activity.interpretation && (
        <div className="border-t border-rule pt-2.5">
          <p className="text-[0.75rem] font-medium text-graphite mb-1">
            {activity.interpreted ? 'Commit summary · AI-read' : 'Commit summary'}
          </p>
          <p className="font-serif text-[0.9375rem] leading-relaxed text-graphite">
            {activity.interpretation}
          </p>
        </div>
      )}
    </div>
  )
}

function CategoryBlock({ label, value, isGithub }) {
  return (
    <section className="border-l-2 border-rule pl-3.5">
      <h4 className="font-serif text-[0.9375rem] font-semibold text-ink mb-1.5">{label}</h4>
      {isGithub ? (
        <GithubActivity raw={value} />
      ) : (
        /* Synthesized prose - serif, generous leading, preserving any
           line breaks the report writer produced. */
        <p className="font-serif text-[0.9375rem] leading-[1.65] text-ink whitespace-pre-line">
          {value}
        </p>
      )}
    </section>
  )
}

function BriefingCard({ briefing, headingLevel: Heading = 'h3', showHeader = true }) {
  const ledger = categoryLedger(briefing)
  const withContent = ledger.filter((c) => c.present)

  return (
    <article className="space-y-4">
      {showHeader && (
        <header className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <Heading className="font-serif text-[1.0625rem] font-semibold leading-tight text-ink">
              {briefing.competitor_name}
            </Heading>
            <time
              dateTime={briefing.created_at}
              className="text-[0.75rem] text-graphite shrink-0"
            >
              {formatDay(briefing.created_at)} · {formatTime(briefing.created_at)}
            </time>
          </div>
          <CategoryLedger ledger={ledger} variant="summary" />
        </header>
      )}

      {withContent.length === 0 ? (
        !showHeader && (
          <p className="text-[0.875rem] text-graphite">
            All 5 categories were checked. Nothing found in this run.
          </p>
        )
      ) : (
        <div className="space-y-4">
          {withContent.map((category) => (
            <CategoryBlock
              key={category.key}
              label={category.label}
              value={category.value}
              isGithub={category.key === 'github_activity'}
            />
          ))}
        </div>
      )}

      <footer className="text-[0.75rem] text-graphite pt-1">
        <span data-numeric>{briefing.competitor_urls?.length ?? 0}</span>{' '}
        {briefing.competitor_urls?.length === 1 ? 'source page' : 'source pages'} · tracked for{' '}
        {briefing.user_company}
      </footer>
    </article>
  )
}

export default BriefingCard
