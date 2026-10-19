import { useState } from 'react'
import { api, ApiError, type Me, type Subscription } from '../api'

const formatDate = (ms: number) =>
  new Date(ms).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

function AccessCard({ me, onChange }: { me: Me; onChange: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sub: Subscription = me.subscription
  const canStart = me.company && me.company.role !== 'member'

  async function start() {
    setBusy(true)
    setError(null)
    try {
      await api('/company/subscription/start', {})
      onChange()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start access.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <h2>Access</h2>
      {sub.status === 'none' && (
        <>
          <p className="muted">Start your 7-day access to upload builds and create access tokens.</p>
          {canStart ? (
            <button className="primary" onClick={start} disabled={busy}>
              {busy ? 'Starting…' : 'Start 7-day access'}
            </button>
          ) : (
            <p className="muted">Ask your company owner to start access.</p>
          )}
        </>
      )}
      {sub.status === 'active' && (
        <p>
          <span className="badge ok">Active</span> {sub.daysLeft} {sub.daysLeft === 1 ? 'day' : 'days'} left ·
          ends {formatDate(sub.endsAt)}
        </p>
      )}
      {sub.status === 'expired' && (
        <p>
          <span className="badge warn">Ended</span> Access ended on {formatDate(sub.endsAt)}. Install pages
          keep working; uploads are paused.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}

export default function Dashboard({ me, onChange }: { me: Me; onChange: () => void }) {
  async function signOut() {
    await api('/auth/logout', {}).catch(() => {})
    onChange()
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">TestFlare</span>
        <span className="who">
          {me.user.name || me.user.email}
          <button className="link" onClick={signOut}>
            Sign out
          </button>
        </span>
      </header>
      <main className="dashboard">
        <h1>{me.company?.name ?? 'Your company'}</h1>
        {!me.user.emailVerified && (
          <p className="notice">
            Email verification is coming next: you'll confirm {me.user.email} with a code.
          </p>
        )}
        <AccessCard me={me} onChange={onChange} />
        <section className="card">
          <h2>Apps</h2>
          <p className="muted">Creating apps and uploading builds arrive in the next steps.</p>
        </section>
      </main>
    </div>
  )
}
