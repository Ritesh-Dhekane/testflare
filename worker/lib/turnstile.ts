// Cloudflare Turnstile: checks the token the browser widget produced, so bots can't sign up or guess
// passwords. Locally the test secret in .dev.vars makes every check pass.
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function passesTurnstile(token: unknown, secret: string, ip?: string): Promise<boolean> {
  if (typeof token !== 'string' || !token || !secret) return false
  const body = new FormData()
  body.append('secret', secret)
  body.append('response', token)
  if (ip) body.append('remoteip', ip)
  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body })
    const data = await res.json<{ success?: boolean }>()
    return data.success === true
  } catch {
    return false
  }
}
