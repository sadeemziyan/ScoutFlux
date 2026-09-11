import { useCallback, useEffect, useState } from 'react'
import AuthForm from './components/AuthForm'
import CompanyForm from './components/CompanyForm'
import Dashboard from './components/Dashboard'
import TrackedCompetitorsCard from './components/TrackedCompetitorsCard'
import Wordmark from './components/Wordmark'
import { Button, Note } from './components/ui'
import { apiFetch } from './api'

const NAV = [
  { id: 'dashboard', label: 'Briefings' },
  { id: 'form', label: 'Track new' },
]

/**
 * Navigation is deliberately minor - two items, set small and quiet.
 * The dominant element in the sidebar is the watchlist below it,
 * because in this product the list of entities under observation IS
 * the primary structure, not a set of app sections.
 */
function NavList({ view, onNavigate }) {
  return (
    <ul className="space-y-0.5 -mx-2">
      {NAV.map((item) => {
        const active = view === item.id
        return (
          <li key={item.id} className="relative">
            <span
              aria-hidden="true"
              className={`absolute left-0 top-1 bottom-1 w-0.5 rounded-full
                ${active ? 'bg-signal' : 'bg-transparent'}`}
            />
            <button
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`w-full text-left pl-3 pr-2 py-1.5 rounded-control text-[0.8125rem]
                transition-colors duration-150
                ${active ? 'font-medium text-ink bg-[#F1EEE8]' : 'text-graphite hover:text-ink hover:bg-[#F4F2ED]'}`}
            >
              {item.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [userEmail, setUserEmail] = useState(null)
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('view') === 'dashboard' ? 'dashboard' : 'form'
  })
  const [submitStatus, setSubmitStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [filter, setFilter] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function handleAuthSuccess(newToken) {
    localStorage.setItem('token', newToken)
    setToken(newToken)
  }

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    setToken(null)
    setUserEmail(null)
  }, [])

  function navigate(next) {
    setView(next)
    setSidebarOpen(false)
  }

  useEffect(() => {
    if (!token) return

    async function fetchMe() {
      try {
        const response = await apiFetch('/auth/me', token)
        if (response.status === 401) return handleLogout()
        if (!response.ok) throw new Error(`Server responded with ${response.status}`)
        const data = await response.json()
        setUserEmail(data.email)
      } catch (err) {
        console.error('Failed to fetch current user:', err)
      }
    }

    fetchMe()
  }, [token, handleLogout])

  async function handleSubmit(payload) {
    setSubmitStatus('loading')
    setErrorMessage('')

    try {
      const response = await apiFetch('/companies/track', token, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (response.status === 401) return handleLogout()
      if (!response.ok) throw new Error(`Server responded with ${response.status}`)

      await response.json()
      setSubmitStatus('idle')
      setView('dashboard')
    } catch (err) {
      setErrorMessage(err.message)
      setSubmitStatus('error')
    }
  }

  if (!token) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Mobile bar. The sidebar discloses inline beneath it - no
          slide-in drawer, keeping the app's motion budget at one. */}
      <div className="lg:hidden border-b border-rule bg-paper sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3 px-4 h-14">
          <Wordmark />
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
            className="text-[0.8125rem] font-medium text-graphite hover:text-ink px-2 py-1 rounded-control"
          >
            {sidebarOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      {/* One instance only. Rendering this in both a mobile container
          and a `hidden lg:flex` desktop container would mount it twice
          at mobile width - duplicating the heading ids that
          aria-labelledby points at, and firing every fetch twice. */}
      <aside
        id="app-sidebar"
        aria-label="Watchlist and navigation"
        className={`${sidebarOpen ? 'flex' : 'hidden'} lg:flex flex-col
          border-b border-rule lg:border-b-0 lg:border-r
          px-4 py-5 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto`}
      >
        <Wordmark className="mb-6 px-1 hidden lg:inline-flex" />
        <NavList view={view} onNavigate={navigate} />

        <div className="mt-6 pt-5 border-t border-rule">
          <TrackedCompetitorsCard
            token={token}
            onUnauthorized={handleLogout}
            selected={filter}
            onSelect={(name) => {
              setFilter(name)
              if (name) navigate('dashboard')
            }}
          />
        </div>

        <div className="mt-8 lg:mt-auto lg:pt-6">
          <div className="border-t border-rule pt-4 flex items-center justify-between gap-2">
            <p className="text-[0.6875rem] text-graphite truncate" title={userEmail || ''}>
              {userEmail}
            </p>
            <Button variant="quiet" size="sm" onClick={handleLogout} className="shrink-0">
              Log out
            </Button>
          </div>
        </div>
      </aside>

      <main className="px-5 sm:px-8 lg:px-10 py-7 lg:py-9 max-w-[56rem] w-full">
        {view === 'form' && submitStatus === 'idle' && <CompanyForm onSubmit={handleSubmit} />}

        {view === 'form' && submitStatus === 'loading' && (
          <div className="max-w-lg">
            <h1 className="font-serif text-[1.25rem] font-semibold text-ink mb-2">
              Collecting the first briefing
            </h1>
            <Note className="leading-relaxed">
              Scraping the pages you listed, pulling public GitHub activity, and
              synthesizing the results. This usually takes a few minutes.
            </Note>
          </div>
        )}

        {view === 'form' && submitStatus === 'error' && (
          <div className="max-w-lg space-y-4">
            <h1 className="font-serif text-[1.25rem] font-semibold text-ink">
              That run didn't finish
            </h1>
            <Note tone="alert">{errorMessage}</Note>
            <Button variant="secondary" onClick={() => setSubmitStatus('idle')}>
              Back to the form
            </Button>
          </div>
        )}

        {view === 'dashboard' && (
          <Dashboard
            token={token}
            onUnauthorized={handleLogout}
            filter={filter}
            onClearFilter={() => setFilter(null)}
            onTrackNew={() => navigate('form')}
          />
        )}

      </main>
    </div>
  )
}

export default App
