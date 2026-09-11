/**
 * The mark is a small ledger: four rules of differing length, the way a
 * briefing reports differing amounts per category. Flat ink on paper -
 * no gradient, no glow, no color.
 */
function Wordmark({ className = '', showText = true }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 16 16"
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="0.5" y="0.5" width="15" height="15" rx="3" fill="none"
          stroke="currentColor" strokeWidth="1" opacity="0.35" />
        <g fill="currentColor">
          <rect x="3.5" y="4" width="9" height="1.25" rx="0.6" />
          <rect x="3.5" y="7.375" width="5.5" height="1.25" rx="0.6" />
          <rect x="3.5" y="10.75" width="7.25" height="1.25" rx="0.6" />
        </g>
      </svg>
      {showText && (
        <span className="font-serif text-[1.0625rem] font-semibold tracking-tight text-ink">
          ScoutFlux
        </span>
      )}
    </span>
  )
}

export default Wordmark
