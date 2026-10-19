import { useEffect, useRef } from 'react'

// Cloudflare Turnstile widget. Without VITE_TURNSTILE_SITE_KEY it uses Cloudflare's test key, which
// always passes (local development).
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string
      reset: (id: string) => void
      remove: (id: string) => void
    }
  }
}

let loading: Promise<void> | null = null
function loadScript() {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile failed to load'))
    document.head.appendChild(script)
  })
  return loading
}

/** Calls onToken with a fresh token (or null when it expires). Change `resetKey` to get a new one. */
export default function Turnstile({
  onToken,
  resetKey,
}: {
  onToken: (token: string | null) => void
  resetKey: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const callback = useRef(onToken)
  callback.current = onToken

  useEffect(() => {
    let id: string | undefined
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return
        id = window.turnstile.render(box.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => callback.current(token),
          'expired-callback': () => callback.current(null),
          'error-callback': () => callback.current(null),
        })
      })
      .catch(() => callback.current(null))
    return () => {
      cancelled = true
      if (id) window.turnstile?.remove(id)
    }
  }, [resetKey])

  return <div className="turnstile" ref={box} />
}
