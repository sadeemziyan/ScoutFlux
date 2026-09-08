import { useState } from 'react'
import CompanyForm from './components/CompanyForm'
import Dashboard from './components/Dashboard'

function App() {
  const [view, setView] = useState('form') // form | dashboard
  const [submitStatus, setSubmitStatus] = useState('idle') // idle | loading | error
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(payload) {
    setSubmitStatus('loading')
    setErrorMessage('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/companies/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(`Server responded with ${response.status}`)

      await response.json()
      setSubmitStatus('idle')
      setView('dashboard')
    } catch (err) {
      setErrorMessage(err.message)
      setSubmitStatus('error')
    }
  }

  return (
    <div>
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex gap-6">
          <button
            onClick={() => setView('form')}
            className={`text-sm font-medium ${view === 'form' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            Track a Competitor
          </button>
          <button
            onClick={() => setView('dashboard')}
            className={`text-sm font-medium ${view === 'dashboard' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            Dashboard
          </button>
        </div>
      </nav>

      {view === 'form' && submitStatus === 'loading' && (
        <p className="text-center text-gray-600 p-6">
          Scraping and analyzing competitors... this can take a few minutes.
        </p>
      )}

      {view === 'form' && submitStatus === 'error' && (
        <div className="text-center p-6 space-y-4">
          <p className="text-red-600">Something went wrong: {errorMessage}</p>
          <button onClick={() => setSubmitStatus('idle')} className="text-blue-600 hover:underline">
            Try again
          </button>
        </div>
      )}

      {view === 'form' && submitStatus === 'idle' && <CompanyForm onSubmit={handleSubmit} />}

      {view === 'dashboard' && <Dashboard />}
    </div>
  )
}

export default App