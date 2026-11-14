import { adminErrorMessage } from '@/features/admin-auth'

/** A readable message for a refused edit (the backend names what blocks it, e.g. the outcomes leading to a stage). */
export function editErrorMessage(error: unknown): string {
  const message = adminErrorMessage(error)
  return message === 'journey editor is disabled' ? 'The journey editor is turned off on the server.' : message
}
