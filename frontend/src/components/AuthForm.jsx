import { useState } from 'react'

function AuthForm({ onAuthSuccess }) {
  const [mode, setMode] = useState('login') // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || `Request failed with ${response.status}`)
      }

      onAuthSuccess(data.access_token)
    } catch (err) {
      setErrorMessage(err.message)
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-16 p-6 space-y-4 border border-gray-200 rounded-lg">
      <h2 className="text-xl font-bold text-gray-900">
        {mode === 'login' ? 'Log in' : 'Sign up'}
      </h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full border border-gray-300 rounded-md px-3 py-2"
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        className="w-full border border-gray-300 rounded-md px-3 py-2"
      />

      {status === 'error' && <p className="text-sm text-red-600">{errorMessage}</p>}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {status === 'loading' ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        className="text-sm text-blue-600 hover:underline w-full text-center"
      >
        {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
      </button>
    </form>
  )
}

export default AuthForm