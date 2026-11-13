import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/api'

export const healthQueryKey = ['health'] as const

export function useHealth() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: () => api.health.get(),
    refetchInterval: 30_000,
  })
}
