import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/api'

export const countyQueryKey = (id: string) => ['county', id] as const

/** County figures and anonymous counts; refetches every 15 s while open. */
export function useCounty(id: string) {
  return useQuery({
    queryKey: countyQueryKey(id),
    queryFn: () => api.regions.county(id),
    refetchInterval: 15_000,
    staleTime: 0,
  })
}
