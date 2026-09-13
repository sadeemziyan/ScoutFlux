import {
  categoryLedger,
  splitGithubActivity,
  formatDay,
  formatTime,
  displayUrl,
} from '../lib/briefing'

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
        <p className="text-[0.8125rem] text-slate">
          All 5 categories were checked. Nothing found in this run.
        </p>
      )
    }
    return (
      <p className="flex flex-wrap items-baseline gap-x-2 text-[0.8125rem]">
        <span data-numeric className="font-medium text-ink">
          {found.length} of 5 categories
        </span>
        {missing.length > 0 && (
          <>
            <span className="text-rule" aria-hidden="true">
              |
            </span>
            <span className="text-slate">
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
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.8125rem]">
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
            className={category.present ? 'font-medium text-ink' : 'text-slate'}
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
 *                 Serif, slate, behind an explicit label.
 *
 * The typography reinforces a distinction the label states outright -
 * it is never asked to carry the meaning on its own.
 */
function GithubActivity({ raw }) {
  const activity = splitGithubActivity(raw)
  if (!activity) return null

  return (
    <div className="space-y-2.5">
      <p className="text-[0.9375rem] text-ink leading-relaxed">
        {activity.stats}
      </p>

      {activity.interpretation && (
        <div className="border-t border-rule pt-2.5">
          <p className="text-[0.8125rem] font-medium text-slate mb-1">
            {activity.interpreted ? 'Commit summary · AI-read' : 'Commit summary'}
          </p>
          <p className="font-serif text-[1rem] leading-relaxed text-slate">
            {activity.interpretation}
          </p>
        </div>
      )}
    </div>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

function CategoryBlock({ label, value, isGithub }) {
  /* GitHub activity is the one category pulled from a real API rather
     than synthesized from scraped pages, so it sits in a tinted panel
     instead of behind the plain left rule. The row-hover tint is used
     because it stays visible on both grounds this card renders on: the
     white "Latest" panel and the canvas ground of expanded History rows
     (GitHub's own #F6F8FA would be identical to canvas and vanish). */
  if (isGithub) {
    return (
      <section className="rounded-panel bg-row-hover px-4 py-3.5">
        <h4 className="flex items-center gap-1.5 font-serif text-[1rem] font-semibold text-ink mb-1.5">
          <GithubIcon />
          {label}
        </h4>
        <GithubActivity raw={value} />
      </section>
    )
  }

  return (
    <section className="border-l-2 border-rule pl-3.5">
      <h4 className="font-serif text-[1rem] font-semibold text-ink mb-1.5">{label}</h4>
      {/* Synthesized prose - serif, generous leading, preserving any
          line breaks the report writer produced. */}
      <p className="font-serif text-[1rem] leading-[1.65] text-ink whitespace-pre-line">
        {value}
      </p>
    </section>
  )
}

/**
 * `showSources` lists the competitor's tracked pages in the footer.
 * It is on for the "Latest briefings" card and off in History: the same
 * URL set repeats on every run for a competitor, so printing it once
 * per historical entry would be the same list stacked N times for no
 * added information.
 */
function BriefingCard({
  briefing,
  headingLevel: Heading = 'h3',
  showHeader = true,
  showSources = true,
}) {
  const ledger = categoryLedger(briefing)
  const withContent = ledger.filter((c) => c.present)
  const sources = briefing.competitor_urls ?? []
  const listSources = showSources && sources.length > 0

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
              className="text-[0.8125rem] text-slate shrink-0"
            >
              {formatDay(briefing.created_at)} · {formatTime(briefing.created_at)}
            </time>
          </div>
          <CategoryLedger ledger={ledger} variant="summary" />
        </header>
      )}

      {withContent.length === 0 ? (
        !showHeader && (
          <p className="text-[0.9375rem] text-slate">
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

      <footer
        className={
          listSources
            ? 'border-t border-rule pt-3 mt-1 space-y-1.5'
            : 'text-[0.8125rem] text-slate pt-1'
        }
      >
        {listSources ? (
          <>
            {/* The count is dropped here - the list below it IS the
                count, and restating it would be the same information
                twice. History keeps the count precisely because it has
                no list. */}
            <p className="text-[0.8125rem] text-slate">
              Sources · tracked for {briefing.user_company}
            </p>
            <ul className="space-y-1">
              {sources.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={url}
                    className="text-[0.8125rem] text-slate hover:text-ink break-all
                      underline underline-offset-2 decoration-rule hover:decoration-edge
                      transition-colors duration-150"
                  >
                    {displayUrl(url)}
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <span data-numeric>{sources.length}</span>{' '}
            {sources.length === 1 ? 'source page' : 'source pages'} · tracked for{' '}
            {briefing.user_company}
          </>
        )}
      </footer>
    </article>
  )
}

export default BriefingCard
