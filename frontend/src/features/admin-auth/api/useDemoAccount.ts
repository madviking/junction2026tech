import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/api'

/** The public, view-only demo account shown on the sign-in page (no session needed). */
export function useDemoAccount() {
  return useQuery({
    queryKey: ['admin-auth', 'demo-account'],
    queryFn: () => api.admin.demoAccount(),
    staleTime: Infinity,
    retry: false,
  })
}
