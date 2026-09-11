/**
 * Shared design-system primitives.
 *
 * Every button, input, panel and label in ScoutFlux comes from this
 * file, so hierarchy stays deliberate instead of being re-invented per
 * component. Two rules this file enforces:
 *
 *  1. No drop shadows anywhere. Panels separate from the ground by
 *     tone (white on warm paper) and a hairline, never by elevation.
 *  2. Sans for measured values, serif for synthesized prose. See
 *     BriefingCard for why that distinction is load-bearing.
 */

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-control font-medium ' +
  'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45'

const BUTTON_VARIANTS = {
  // Primary actions are ink-filled. Deliberately not a saturated blue -
  // the accent color stays reserved for focus and state markers.
  primary: 'bg-ink text-paper hover:bg-[#333029]',
  secondary: 'bg-surface text-ink border border-edge hover:bg-[#F2F0EB]',
  quiet: 'text-graphite hover:text-ink',
  danger: 'text-graphite hover:text-signal',
}

const BUTTON_SIZES = {
  sm: 'h-7 px-2.5 text-[0.8125rem]',
  md: 'h-9 px-3.5 text-[0.875rem]',
  lg: 'h-10 px-4 text-[0.875rem] w-full',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  return (
    <button
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...props}
    />
  )
}

/** White panel on the paper ground. Hairline border, no shadow. */
export function Panel({ as: Tag = 'div', className = '', ...props }) {
  return (
    <Tag className={`bg-surface border border-rule rounded-panel ${className}`} {...props} />
  )
}

const CONTROL =
  'w-full bg-surface text-ink placeholder:text-[#A8A093] border border-edge ' +
  'rounded-control px-3 py-2 text-[0.875rem] leading-normal ' +
  'transition-colors duration-150 hover:border-[#6B675F]'

/**
 * Label + control + optional hint/error, wired together with real
 * htmlFor/id and aria-describedby rather than placeholder-only labels.
 */
export function Field({ label, hint, error, id, children }) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[0.8125rem] font-medium text-ink">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-[0.75rem] text-graphite leading-snug">
          {hint}
        </p>
      )}
      {children({
        id,
        className: CONTROL,
        'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {error && (
        <p id={errorId} className="text-[0.75rem] text-signal font-medium">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextInput(props) {
  return <input {...props} />
}

export function TextArea(props) {
  return <textarea {...props} />
}

/** Section heading. Serif, sentence case - never all-caps eyebrows. */
export function SectionHeading({ children, count, className = '' }) {
  return (
    <div className={`flex items-baseline gap-2.5 ${className}`}>
      <h2 className="font-serif text-[1.25rem] font-semibold leading-tight text-ink">
        {children}
      </h2>
      {count !== undefined && (
        <span data-numeric className="text-[0.8125rem] text-graphite">
          {count}
        </span>
      )}
    </div>
  )
}

/** Accessible switch. Sienna when on - one of only four accent uses. */
export function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full
        border transition-colors duration-150 disabled:opacity-45
        ${checked ? 'bg-signal border-signal' : 'bg-[#EDEAE4] border-edge'}`}
    >
      <span
        className={`block h-3 w-3 rounded-full bg-surface transition-transform duration-150
          ${checked ? 'translate-x-[15px]' : 'translate-x-[2px]'}`}
      />
    </button>
  )
}

/** Non-blocking inline status text. */
export function Note({ tone = 'muted', children, className = '' }) {
  const tones = {
    muted: 'text-graphite',
    alert: 'text-signal',
  }
  return <p className={`text-[0.8125rem] ${tones[tone]} ${className}`}>{children}</p>
}
