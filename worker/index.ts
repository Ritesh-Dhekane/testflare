// TestFlare API (everything under /api). Other paths are the web app, served from static assets.
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import type { AppEnv } from './env'
import { ApiError } from './lib/errors'
import { auth } from './routes/auth'
import { company } from './routes/company'

const app = new Hono<AppEnv>().basePath('/api')

app.use(secureHeaders())
// Read every request body once up front (Hono caches it for the handlers), so a request refused early
// (rate limit, validation) never leaves an unread body behind on the connection.
app.use(async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') await c.req.text().catch(() => '')
  await next()
})
app.get('/health', (c) => c.json({ ok: true }))
app.route('/auth', auth)
app.route('/company', company)

app.notFound((c) => c.json({ error: 'not_found', message: 'Not found.' }, 404))
app.onError((err, c) => {
  if (err instanceof ApiError) return c.json({ error: err.code, message: err.message }, err.status)
  console.error(err)
  return c.json({ error: 'server_error', message: 'Something went wrong. Please try again.' }, 500)
})

export default app
