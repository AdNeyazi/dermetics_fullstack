const INSECURE_SECRETS = new Set(['dev-secret-change-me'])
const MIN_LENGTH = 32
const DEV_FALLBACK = 'dev-secret-change-me'

/**
 * JWT signing secret for dashboard middleware (must match Rails JWT_SECRET).
 * Production: required, min 32 chars, not the dev default.
 */
export function getJwtSecretBytes() {
  const raw = process.env.JWT_SECRET?.trim()
  const isProd = process.env.NODE_ENV === 'production'

  if (isProd) {
    if (!raw) {
      throw new Error(
        'JWT_SECRET must be set in production (Next.js). Use a random string of at least 32 characters, identical to the Rails API.'
      )
    }
    if (INSECURE_SECRETS.has(raw) || raw.length < MIN_LENGTH) {
      throw new Error(
        'JWT_SECRET is too weak for production. Use openssl rand -hex 32 (or similar), not the dev default.'
      )
    }
    return new TextEncoder().encode(raw)
  }

  return new TextEncoder().encode(raw || DEV_FALLBACK)
}
