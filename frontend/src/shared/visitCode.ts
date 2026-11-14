// Visit codes: SLT-XXXX-XXXX, 8 Crockford base32 characters (no I, L, O, U).
// Mirror of backend/visits/code.ts `normalizeCode`: case, spaces and dashes do not
// matter, the SLT prefix is optional, and a typed O, I or L is read as 0, 1, 1.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const PREFIX = 'SLT'

/** Canonical `SLT-XXXX-XXXX` form of a typed or pasted visit code, or null when it cannot be one. */
export function normalizeVisitCode(input: string): string | null {
  let s = input.toUpperCase().replace(/[\s-]/g, '')
  if (s.startsWith(PREFIX)) s = s.slice(PREFIX.length)
  s = s.replace(/O/g, '0').replace(/[IL]/g, '1')
  if (s.length !== 8 || [...s].some((c) => !ALPHABET.includes(c))) return null
  return `${PREFIX}-${s.slice(0, 4)}-${s.slice(4)}`
}
