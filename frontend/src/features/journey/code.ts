import { isAPIError } from '@/shared/api/client'

/**
 * True when the backend says the visit code is unknown. The visits service answers
 * `not_found` for an unknown, malformed or expired code; other errors (invalid_argument,
 * network) are not about the code and get a retry instead.
 */
export function isUnknownCode(error: unknown): boolean {
  return isAPIError(error) && error.code === 'not_found'
}
