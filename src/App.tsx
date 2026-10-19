import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { api, type Me } from './api'
import AuthForm from './pages/AuthForm'
import Dashboard from './pages/Dashboard'

// undefined while loading, null when signed out.
function useMe() {
  const [me, setMe] = useState<Me | null | undefined>(undefined)
  const refresh = useCallback(() => {
    api<Me>('/auth/me')
      .then(setMe)
      .catch(() => setMe(null)) // signed out (or the API is unreachable): show sign-in
  }, [])
  useEffect(refresh, [refresh])
  return { me, refresh }
}

export default function App() {
  const { me, refresh } = useMe()
  if (me === undefined) return <div className="loading" aria-busy="true" />
  return (
    <Routes>
      <Route
        path="/signup"
        element={me ? <Navigate to="/" replace /> : <AuthForm mode="signup" onDone={refresh} />}
      />
      <Route
        path="/signin"
        element={me ? <Navigate to="/" replace /> : <AuthForm mode="login" onDone={refresh} />}
      />
      <Route
        path="/"
        element={me ? <Dashboard me={me} onChange={refresh} /> : <Navigate to="/signin" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
