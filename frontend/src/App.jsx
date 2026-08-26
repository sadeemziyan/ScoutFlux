import { useState } from 'react'
import CompanyForm from './components/CompanyForm'

function App() {
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [briefings, setBriefings] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(payload) {
    setStatus('loading')
    setErrorMessage('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/companies/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      const data = await response.json()
      setBriefings(data)
      setStatus('success')
    } catch (err) {
      setErrorMessage(err.message)
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <p className="text-gray-600">
          Scraping and analyzing competitors... this can take a few minutes.
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-4">
        <p className="text-red-600">Something went wrong: {errorMessage}</p>
        <button
          onClick={() => setStatus('idle')}
          className="text-blue-600 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="max-w-xl mx-auto p-6">
        <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
          {JSON.stringify(briefings, null, 2)}
        </pre>
      </div>
    )
  }

  return <CompanyForm onSubmit={handleSubmit} />
}

export default App