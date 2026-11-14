import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ClinicianSummary } from '@/features/clinician/types'
import { api } from '@/shared/api/api'

export const clinicianSummaryQueryKey = (code: string) => ['clinician', 'summary', code] as const

/** The one-screen Finnish summary of a visit. */
export function useClinicianSummary(code: string) {
  return useQuery({
    queryKey: clinicianSummaryQueryKey(code),
    queryFn: () => api.visits.summary(code),
  })
}

/** Records the clinician's answer cards; the response is the updated summary. */
export function useSendClinicianAnswers(code: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (answers: string[]) => api.visits.clinicianAnswers(code, { answers }),
    onSuccess: (summary: ClinicianSummary) => queryClient.setQueryData(clinicianSummaryQueryKey(code), summary),
  })
}
