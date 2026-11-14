import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminApi } from '@/features/admin-auth'
import { CONTENT_ADMIN_PREFIX, journeyKeys } from '@/features/admin-journey/api/keys'
import type { JourneyGraph } from '@/features/admin-journey/types'

type AdminApi = ReturnType<typeof useAdminApi>

/**
 * One structural edit of the draft. Every write returns the fresh graph, which replaces the
 * cached one; the content editor's draft queries are refreshed too (same draft).
 */
function useJourneyWrite<Input>(call: (api: AdminApi, input: Input) => Promise<JourneyGraph>) {
  const api = useAdminApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Input) => call(api, input),
    onSuccess: async (graph) => {
      queryClient.setQueryData(journeyKeys.graph, graph)
      await queryClient.invalidateQueries({ queryKey: CONTENT_ADMIN_PREFIX })
    },
  })
}

export const useAddStage = () =>
  useJourneyWrite((api, input: { id: string; terminal: boolean; askEn: string; askFi: string }) => api.content.journeyAddStage(input))

export const useRemoveStage = () => useJourneyWrite((api, input: { id: string }) => api.content.journeyRemoveStage(input))

export const useAddOutcome = () =>
  useJourneyWrite((api, input: { stage: string; id: string; next: string; cardEn: string; cardFi: string }) => api.content.journeyAddOutcome(input))

export const useRemoveOutcome = () => useJourneyWrite((api, input: { stage: string; id: string }) => api.content.journeyRemoveOutcome(input))

export const useSetNext = () => useJourneyWrite((api, input: { stage: string; id: string; next: string }) => api.content.journeySetNext(input))
