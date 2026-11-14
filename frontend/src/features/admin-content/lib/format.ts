import { APIError } from '@/shared/api/client'
import type { ValidationIssue } from '@/features/admin-content/types'

const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

/** "14 Nov 2026, 01:12" for an ISO timestamp; the raw value if it does not parse. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const at = new Date(iso)
  return Number.isNaN(at.getTime()) ? iso : dateTime.format(at)
}

function isIssue(value: unknown): value is ValidationIssue {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.path === 'string' && typeof v.message === 'string'
}

/** The validation issues a refused publish carries in its error details (`{ issues }`). */
export function issuesFromError(error: unknown): ValidationIssue[] {
  if (!(error instanceof APIError)) return []
  const details: unknown = error.details
  if (!details || typeof details !== 'object') return []
  const issues = (details as { issues?: unknown }).issues
  return Array.isArray(issues) ? issues.filter(isIssue) : []
}

/** Starts a browser download of a text file (Blob + temporary object URL). */
export function downloadTextFile(filename: string, text: string, type = 'application/yaml') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
