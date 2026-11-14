import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAdminSession } from '@/features/admin-auth/session'

export interface RequireAdminSessionProps {
  /** Path of the sign-in page. */
  signInPath?: string
  children: ReactNode
}

/** Renders children only with a session; otherwise redirects to sign-in with `?next=`. */
export function RequireAdminSession({ signInPath = '/admin/sign-in', children }: RequireAdminSessionProps) {
  const session = useAdminSession()
  const location = useLocation()
  if (!session) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`${signInPath}?next=${encodeURIComponent(next)}`} replace />
  }
  return children
}
