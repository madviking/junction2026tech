// Visit codes: SLT-XXXX-XXXX, 8 random Crockford base32 characters (40 bits).
// The alphabet has no I, L, O or U; typing O, I or L is read as 0, 1, 1.
// Only HMAC-SHA256(pepper, canonical code) is stored: a leaked table cannot be
// brute-forced without the server secret VisitCodePepper.
import { createHmac, randomBytes } from 'node:crypto'
import { APIError } from 'encore.dev/api'
import { secret } from 'encore.dev/config'
import log from 'encore.dev/log'

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const PREFIX = 'SLT'
const visitCodePepper = secret('VisitCodePepper')

export function newCode(): string {
  // 256 is a multiple of 32, so `byte & 31` is uniform.
  const chars = [...randomBytes(8)].map((b) => ALPHABET[b & 31]).join('')
  return `${PREFIX}-${chars.slice(0, 4)}-${chars.slice(4)}`
}

// Canonical form of a typed or pasted code, or null when it cannot be a code.
export function normalizeCode(input: string): string | null {
  let s = input.toUpperCase().replace(/[\s-]/g, '')
  if (s.startsWith(PREFIX)) s = s.slice(PREFIX.length)
  s = s.replace(/O/g, '0').replace(/[IL]/g, '1')
  if (s.length !== 8 || [...s].some((c) => !ALPHABET.includes(c))) return null
  return `${PREFIX}-${s.slice(0, 4)}-${s.slice(4)}`
}

function pepper(): string {
  let value = ''
  try {
    value = visitCodePepper()
  } catch (err) {
    log.error('VisitCodePepper secret cannot be read', { error: err instanceof Error ? err.name : 'UnknownError' })
    throw APIError.internal('visit codes are not configured')
  }
  if (!value) {
    log.error('VisitCodePepper secret is empty; refusing to hash visit codes without it')
    throw APIError.internal('visit codes are not configured')
  }
  return value
}

export function hashCode(canonical: string): string {
  return createHmac('sha256', pepper()).update(canonical).digest('hex')
}
