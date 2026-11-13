import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'

export const healthQueryKey = ['health'] as const

export function useHealth() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: async () => {
      const { data, response } = await api.GET('/api/health')
      if (!data) throw new Error(`Health check failed (HTTP ${response.status})`)
      return data
    },
    refetchInterval: 30_000,
  })
}
