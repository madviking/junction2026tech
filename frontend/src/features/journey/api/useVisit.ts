import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isUnknownCode } from '@/features/journey/code'
import type { JourneyEvent, VisitView } from '@/features/journey/types'
import { api } from '@/shared/api/api'

export const visitQueryKey = (code: string, lang: string) => ['journey', 'visit', code, lang] as const

/** The visit's current view (stage, question, outcome cards, care path) in `lang`. */
export function useVisit(code: string, lang: string) {
  return useQuery({
    queryKey: visitQueryKey(code, lang),
    queryFn: () => api.visits.get(code, { lang }),
    // An unknown code will not appear by retrying.
    retry: (count, error) => !isUnknownCode(error) && count < 2,
  })
}

/** Sends one tapped outcome (or interrupt); the server replays the journey and returns the new view. */
export function useVisitEvent(code: string, lang: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (event: JourneyEvent) => api.visits.addEvent(code, { ...event, lang }),
    onSuccess: (view: VisitView) => queryClient.setQueryData(visitQueryKey(code, lang), view),
  })
}

/** Starts a new anonymous visit; the response is the only place its code is returned. */
export function useCreateVisit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (lang: string) => api.visits.create({ lang }),
    onSuccess: (view: VisitView) => queryClient.setQueryData(visitQueryKey(view.code, view.lang), view),
  })
}

/** One step back on the path: the server undoes the resident's last tap and returns the new view. */
export function useVisitBack(code: string, lang: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.visits.back(code, { lang }),
    onSuccess: (view: VisitView) => queryClient.setQueryData(visitQueryKey(code, lang), view),
  })
}
