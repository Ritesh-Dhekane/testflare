import { ApiError } from './errors'

export const PASSWORD_MIN = 10

export function email(value: unknown): string {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (text.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    throw new ApiError(400, 'invalid_email', 'Enter a valid email address.')
  }
  return text
}

export function password(value: unknown): string {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN || value.length > 200) {
    throw new ApiError(400, 'weak_password', `Use a password of at least ${PASSWORD_MIN} characters.`)
  }
  return value
}

export function text(value: unknown, field: string, { min = 1, max = 80 } = {}): string {
  const out = typeof value === 'string' ? value.trim() : ''
  if (out.length < min || out.length > max) {
    throw new ApiError(
      400,
      `invalid_${field}`,
      `${field[0].toUpperCase()}${field.slice(1)} should be ${min}–${max} characters.`,
    )
  }
  return out
}

/** "Acme Labs Pvt. Ltd." -> "acme-labs-pvt-ltd" */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'company'
  )
}
