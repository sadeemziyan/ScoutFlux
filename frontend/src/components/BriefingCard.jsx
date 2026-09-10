function BriefingCard({ briefing }) {
  const categories = [
    { label: 'Product Updates', value: briefing.product_updates },
    { label: 'Hiring Signals', value: briefing.hiring_signals },
    { label: 'Pricing Changes', value: briefing.pricing_changes },
    { label: 'Tech Stack Changes', value: briefing.tech_stack_changes },
    { label: 'GitHub Activity', value: briefing.github_activity },
  ]

  const hasAnySignal = categories.some((c) => c.value)

  return (
    <div className="border border-gray-200 rounded-lg p-5 space-y-3 bg-white shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{briefing.competitor_name}</h3>
        <p className="text-xs text-gray-500">
          Tracked for {briefing.user_company} · {new Date(briefing.created_at).toLocaleString()}
        </p>
      </div>

      {!hasAnySignal && (
        <p className="text-sm text-gray-400 italic">No signals found in this run.</p>
      )}

      {categories.map(
        (category) =>
          category.value && (
            <div key={category.label}>
              <p className="text-sm font-medium text-gray-700">{category.label}</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{category.value}</p>
            </div>
          )
      )}
    </div>
  )
}

export default BriefingCard