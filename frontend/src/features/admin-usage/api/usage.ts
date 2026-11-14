import { useQuery } from '@tanstack/react-query'
import { useAdminApi } from '@/features/admin-auth'

export const AUDIT_LIMIT = 200

/** Paid provider usage by day, service, provider and feature, with totals. */
export function useUsageReport() {
  const api = useAdminApi()
  return useQuery({ queryKey: ['admin-usage', 'usage'], queryFn: () => api.admin.usage() })
}

/** The newest audit log entries. */
export function useAuditLog() {
  const api = useAdminApi()
  return useQuery({ queryKey: ['admin-usage', 'audit', AUDIT_LIMIT], queryFn: () => api.admin.audit({ limit: AUDIT_LIMIT }) })
}
