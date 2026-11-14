import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/api'

export const visitCardQueryKey = (code: string, lang: string) => ['visit-card', 'visit', code, lang] as const

/** The resident's visit in their language. Refetches on focus so new next steps appear. */
export function useVisitCard(code: string, lang: string) {
  return useQuery({
    queryKey: visitCardQueryKey(code, lang),
    queryFn: () => api.visits.get(code, { lang }),
    refetchOnWindowFocus: true,
    staleTime: 0,
  })
}

/** Deletes the visit and all its events (DELETE /api/visits/:code). */
export function useDeleteVisit(code: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.visits.remove(code),
    onSuccess: () => queryClient.removeQueries({ queryKey: ['visit-card', 'visit', code] }),
  })
}
