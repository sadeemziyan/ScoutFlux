import { useEffect, useState } from 'react'
import { apiFetch } from '../api'

function TrackedCompetitorsCard({ token, onUnauthorized }) {
  const [tracked, setTracked] = useState([])
  const [status, setStatus] = useState('loading')
  const [removingId, setRemovingId] = useState(null)

  const [digestEnabled, setDigestEnabled] = useState(false)
  const [digestStatus, setDigestStatus] = useState('loading')
  const [digestSaving, setDigestSaving] = useState(false)

  useEffect(() => {
    fetchTracked()
    fetchDigestPreference()
  }, [token])

  async function fetchTracked() {
    try {
      const response = await apiFetch('/tracked-competitors', token)
      if (response.status === 401) {
        onUnauthorized()
        return
      }
      if (!response.ok) throw new Error(`Server responded with ${response.status}`)
      const data = await response.json()
      setTracked(data)
      setStatus('success')
    } catch (err) {
      setStatus('error')
    }
  }

  async function fetchDigestPreference() {
    try {
      const response = await apiFetch('/auth/me', token)
      if (response.status === 401) {
        onUnauthorized()
        return
      }
      if (!response.ok) throw new Error(`Server responded with ${response.status}`)
      const data = await response.json()
      setDigestEnabled(data.receive_digest)
      setDigestStatus('success')
    } catch (err) {
      setDigestStatus('error')
    }
  }

  async function handleToggleDigest() {
    const nextValue = !digestEnabled
    setDigestSaving(true)
    setDigestEnabled(nextValue) // optimistic - reverted below if the request fails

    try {
      const response = await apiFetch('/auth/me/digest', token, {
        method: 'PATCH',
        body: JSON.stringify({ receive_digest: nextValue }),
      })
      if (response.status === 401) {
        onUnauthorized()
        return
      }
      if (!response.ok) throw new Error(`Server responded with ${response.status}`)
    } catch (err) {
      setDigestEnabled(!nextValue) // revert on failure
    } finally {
      setDigestSaving(false)
    }
  }

  async function handleRemove(id) {
    setRemovingId(id)
    try {
      const response = await apiFetch(`/tracked-competitors/${id}`, token, { method: 'DELETE' })
      if (response.status === 401) {
        onUnauthorized()
        return
      }
      if (!response.ok && response.status !== 204) throw new Error(`Server responded with ${response.status}`)
      setTracked((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      // leave the item in place so the user can see it and retry
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <p className="text-sm font-medium text-gray-800">Weekly email digest</p>
          {digestStatus === 'error' && (
            <p className="text-xs text-red-600">Couldn't load preference</p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={digestEnabled}
          aria-label="Toggle weekly email digest"
          onClick={handleToggleDigest}
          disabled={digestStatus !== 'success' || digestSaving}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-50 ${
            digestEnabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              digestEnabled ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 mb-3">Currently Tracking</h3>

      {status === 'loading' && <p className="text-sm text-gray-400">Loading...</p>}
      {status === 'error' && <p className="text-sm text-red-600">Failed to load.</p>}
      {status === 'success' && tracked.length === 0 && (
        <p className="text-sm text-gray-400 italic">Not tracking anyone yet.</p>
      )}

      <ul className="space-y-3">
        {tracked.map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-gray-800">{t.competitor_name}</p>
              <p className="text-xs text-gray-500">{t.competitor_urls.length} page(s) tracked</p>
            </div>
            <button
              onClick={() => handleRemove(t.id)}
              disabled={removingId === t.id}
              className="text-xs text-red-600 hover:underline disabled:opacity-50 shrink-0"
            >
              {removingId === t.id ? 'Removing...' : 'Remove'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TrackedCompetitorsCard