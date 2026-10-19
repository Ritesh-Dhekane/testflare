import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { api, ApiError } from '../api'
import Turnstile from '../components/Turnstile'

// Sign up and sign in share one form: sign up adds name and company.
export default function AuthForm({ mode, onDone }: { mode: 'signup' | 'login'; onDone: () => void }) {
  const signup = mode === 'signup'
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true)
    setError(null)
    try {
      await api(signup ? '/auth/signup' : '/auth/login', { ...form, turnstileToken: token })
      onDone()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
      setToken(null)
      setResetKey((k) => k + 1) // a Turnstile token works once
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth">
      <Link to="/" className="brand">
        TestFlare
      </Link>
      <form className="card" onSubmit={submit}>
        <h1>{signup ? 'Create your company account' : 'Sign in'}</h1>
        <p className="muted">
          {signup ? 'Share Android test builds with your team in minutes.' : 'Welcome back.'}
        </p>
        {signup && (
          <>
            <label>
              Your name
              <input name="name" autoComplete="name" required maxLength={80} />
            </label>
            <label>
              Company name
              <input name="companyName" autoComplete="organization" required minLength={2} maxLength={60} />
            </label>
          </>
        )}
        <label>
          Work email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={signup ? 'new-password' : 'current-password'}
            required
            minLength={signup ? 10 : undefined}
          />
          {signup && <span className="hint">At least 10 characters.</span>}
        </label>
        <Turnstile onToken={setToken} resetKey={resetKey} />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary" disabled={busy || !token}>
          {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
        </button>
        <p className="muted switch">
          {signup ? (
            <>
              Already have an account? <Link to="/signin">Sign in</Link>
            </>
          ) : (
            <>
              New to TestFlare? <Link to="/signup">Create an account</Link>
            </>
          )}
        </p>
      </form>
    </main>
  )
}
