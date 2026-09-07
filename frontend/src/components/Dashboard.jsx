import { useEffect, useState } from 'react'
import BriefingCard from './BriefingCard'
import TrackedCompetitorsCard from './TrackedCompetitorsCard'
import { apiFetch } from '../api'

function Dashboard({ token, onUnauthorized }) {
  const [briefings, setBriefings] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    async function fetchBriefings() {
      try {
        const response = await apiFetch('/briefings', token)
        if (response.status === 401) {
          onUnauthorized()
          return
        }
        if (!response.ok) throw new Error(`Server responded with ${response.status}`)
        const data = await response.json()
        setBriefings(data)
        setStatus('success')
      } catch (err) {
        setStatus('error')
      }
    }

    fetchBriefings()
  }, [token])

  if (status === 'loading') return <p className="text-center text-gray-500 p-6">Loading briefings...</p>
  if (status === 'error') return <p className="text-center text-red-600 p-6">Failed to load briefings.</p>

  const sorted = [...briefings].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const seen = new Set()
  const latestPerCompetitor = sorted.filter((b) => {
    if (seen.has(b.competitor_name)) return false
    seen.add(b.competitor_name)
    return true
  })

  return (
    <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-8">
      <div className="space-y-10">
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Latest Briefings</h2>
          {latestPerCompetitor.length === 0 ? (
            <p className="text-gray-500">No briefings yet. Track a competitor to get started.</p>
          ) : (
            <div className="space-y-4">
              {latestPerCompetitor.map((b) => (
                <BriefingCard key={b.id} briefing={b} />
              ))}
            </div>
          )}
        </section>

        {sorted.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">History</h2>
            <div className="space-y-4">
              {sorted.map((b) => (
                <BriefingCard key={b.id} briefing={b} />
              ))}
            </div>
          </section>
        )}
      </div>

      <aside>
        <TrackedCompetitorsCard token={token} onUnauthorized={onUnauthorized} />
      </aside>
    </div>
  )
}

export default Dashboard