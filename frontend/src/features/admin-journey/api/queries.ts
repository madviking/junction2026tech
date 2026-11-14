import { useQuery } from '@tanstack/react-query'
import { useAdminApi } from '@/features/admin-auth'
import { journeyKeys } from '@/features/admin-journey/api/keys'

/** The draft's journey graph (or the live one when there is no draft) with validation issues and review flags. */
export function useJourneyGraph() {
  const api = useAdminApi()
  return useQuery({ queryKey: journeyKeys.graph, queryFn: () => api.content.journeyGraph() })
}
