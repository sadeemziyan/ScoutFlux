import { useState } from 'react'
import { Button, Field, TextInput, Panel } from './ui'
import { CATEGORIES } from '../lib/briefing'
import Wordmark from './Wordmark'

function AuthForm({ onAuthSuccess }) {
  const [mode, setMode] = useState('login') // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [errorMessage, setErrorMessage] = useState('')

  const isSignup = mode === 'signup'

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
    <main className="min-h-dvh flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-[24rem]">
        <div className="mb-7">
          <Wordmark className="mb-3" />
          <p className="text-[0.9375rem] text-slate leading-relaxed">
            Weekly competitive intelligence, assembled automatically from your
            competitors' public footprint.
          </p>
        </div>

        <Panel className="p-6">
          <h1 className="font-serif text-[1.3125rem] font-semibold text-ink mb-5">
            {isSignup ? 'Create an account' : 'Sign in'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
            <Field label="Email" id="auth-email">
              {(props) => (
                <TextInput
                  {...props}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field
              label="Password"
              id="auth-password"
              hint={isSignup ? 'At least 8 characters.' : undefined}
              error={status === 'error' ? errorMessage : undefined}
            >
              {(props) => (
                <TextInput
                  {...props}
                  type="password"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              )}
            </Field>

            <Button type="submit" size="lg" disabled={status === 'loading'}>
              {status === 'loading'
                ? 'Working…'
                : isSignup
                  ? 'Create account'
                  : 'Sign in'}
            </Button>
          </form>

          <p className="mt-4 text-[0.875rem] text-slate">
            {isSignup ? 'Already have an account?' : 'No account yet?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(isSignup ? 'login' : 'signup')
                setStatus('idle')
                setErrorMessage('')
              }}
              className="font-medium text-ink underline underline-offset-2 decoration-edge
                hover:decoration-ink transition-colors duration-150"
            >
              {isSignup ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </Panel>

        {/* The same five categories the briefings are organized around -
            stated as fact, not sold. */}
        <div className="mt-6">
          <p className="text-[0.8125rem] text-slate mb-1.5">Tracked every week</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-ink">
            {CATEGORIES.map((category) => (
              <li key={category.key}>{category.label}</li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}

export default AuthForm
