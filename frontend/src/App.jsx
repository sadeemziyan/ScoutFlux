import { useEffect, useState } from 'react'
import AuthForm from './components/AuthForm'
import CompanyForm from './components/CompanyForm'
import Dashboard from './components/Dashboard'
import { apiFetch } from './api'

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [userEmail, setUserEmail] = useState(null)
const [view, setView] = useState(() => {
  const params = new URLSearchParams(window.location.search)
  return params.get('view') === 'dashboard' ? 'dashboard' : 'form'
})
  const [submitStatus, setSubmitStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  function handleAuthSuccess(newToken) {
    localStorage.setItem('token', newToken)
    setToken(newToken)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    setToken(null)
  }

    useEffect(() => {
    if (!token) {
      setUserEmail(null)
      return
    }

    async function fetchMe() {
      try {
        const response = await apiFetch('/auth/me', token)
        if (response.status === 401) {
          handleLogout()
          return
        }
        if (!response.ok) throw new Error(`Server responded with ${response.status}`)
        const data = await response.json()
        setUserEmail(data.email)
      } catch (err) {
        console.error('Failed to fetch current user:', err)
      }
    }

    fetchMe()
  }, [token])

  async function handleSubmit(payload) {
    setSubmitStatus('loading')
    setErrorMessage('')

    try {
      const response = await apiFetch('/companies/track', token, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (response.status === 401) {
        handleLogout()
        return
      }
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
    <div>
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex gap-6 items-center">
          <button onClick={() => setView('form')} className={`text-sm font-medium ${view === 'form' ? 'text-blue-600' : 'text-gray-500'}`}>
            Track a Competitor
          </button>
          <button onClick={() => setView('dashboard')} className={`text-sm font-medium ${view === 'dashboard' ? 'text-blue-600' : 'text-gray-500'}`}>
            Dashboard
          </button>
          {userEmail && (
            <span className="text-sm text-gray-500 ml-auto">Welcome, {userEmail}</span>
          )}
          <button onClick={handleLogout} className="text-sm font-medium text-gray-500">
            Log out
          </button>
        </div>
      </nav>

      {view === 'form' && submitStatus === 'loading' && (
        <p className="text-center text-gray-600 p-6">Scraping and analyzing competitors... this can take a few minutes.</p>
      )}

      {view === 'form' && submitStatus === 'error' && (
        <div className="text-center p-6 space-y-4">
          <p className="text-red-600">Something went wrong: {errorMessage}</p>
          <button onClick={() => setSubmitStatus('idle')} className="text-blue-600 hover:underline">Try again</button>
        </div>
      )}

      {view === 'form' && submitStatus === 'idle' && <CompanyForm onSubmit={handleSubmit} />}
      {view === 'dashboard' && <Dashboard token={token} onUnauthorized={handleLogout} />}
    </div>
  )
}

export default App