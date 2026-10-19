import { describe, expect, it } from 'vitest'
import {
  fromBase64Url,
  hashPassword,
  randomToken,
  sha256,
  timingSafeEqual,
  toBase64Url,
  verifyPassword,
} from './crypto'
import { ApiError } from './errors'
import { subscriptionState, trialPeriod, TRIAL_DAYS } from './subscription'
import * as v from './validate'

describe('passwords', () => {
  it('verifies the right password and rejects others', async () => {
    const stored = await hashPassword('correct horse battery', 1000)
    expect(stored).toMatch(/^pbkdf2\$1000\$[\w-]+\$[\w-]+$/)
    expect(await verifyPassword('correct horse battery', stored)).toBe(true)
    expect(await verifyPassword('wrong password!!', stored)).toBe(false)
  })

  it('salts every hash differently', async () => {
    expect(await hashPassword('same password', 1000)).not.toBe(await hashPassword('same password', 1000))
  })

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('anything', 'plain-text')).toBe(false)
  })
})

describe('tokens and hashes', () => {
  it('round-trips base64url', () => {
    const bytes = new Uint8Array([0, 255, 62, 63, 128])
    expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes)
  })

  it('makes long random tokens and stable hashes', async () => {
    const token = randomToken()
    expect(token).toHaveLength(43)
    expect(token).not.toBe(randomToken())
    expect(await sha256('abc')).toBe(await sha256('abc'))
    expect(timingSafeEqual('abc', 'abc')).toBe(true)
    expect(timingSafeEqual('abc', 'abd')).toBe(false)
  })
})

describe('subscription', () => {
  const day = 24 * 60 * 60 * 1000
  it('lasts 7 days from the start', () => {
    const { startsAt, endsAt } = trialPeriod(1_000)
    expect(endsAt - startsAt).toBe(TRIAL_DAYS * day)
  })

  it('is none, active with days left, then expired', () => {
    const row = { starts_at: 0, ends_at: 7 * day }
    expect(subscriptionState(null)).toEqual({ status: 'none' })
    expect(subscriptionState(row, 2.5 * day)).toMatchObject({ status: 'active', daysLeft: 5 })
    expect(subscriptionState(row, 7 * day)).toMatchObject({ status: 'expired', daysLeft: 0 })
  })
})

describe('validation', () => {
  it('normalises emails and refuses bad ones', () => {
    expect(v.email('  Ravi@Example.COM ')).toBe('ravi@example.com')
    expect(() => v.email('not-an-email')).toThrow(ApiError)
  })

  it('needs a 10+ character password', () => {
    expect(() => v.password('short')).toThrow(ApiError)
    expect(v.password('long enough pw')).toBe('long enough pw')
  })

  it('makes URL slugs', () => {
    expect(v.slugify('Acme Labs Pvt. Ltd.')).toBe('acme-labs-pvt-ltd')
    expect(v.slugify('!!!')).toBe('company')
  })
})
