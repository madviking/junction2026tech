import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdminApi } from '@/features/admin-auth'
import type { FindingInput, MetricInput, PointInput, ScreeningInput, SourceInput, StatusRequest, StepInput } from '@/features/admin-service-paths/types'

export const servicePathKeys = {
  all: ['admin-service-paths'] as const,
  areas: ['admin-service-paths', 'areas'] as const,
  area: (id: string) => ['admin-service-paths', 'area', id] as const,
  compare: ['admin-service-paths', 'compare'] as const,
}

/** The five areas with fact counts by status. */
export function useAreas() {
  const api = useAdminApi()
  return useQuery({
    queryKey: servicePathKeys.areas,
    queryFn: async () => (await api.service_paths.areas()).areas,
  })
}

/** Every row of one area, drafts included, plus all sources. */
export function useAdminArea(id: string) {
  const api = useAdminApi()
  return useQuery({
    queryKey: servicePathKeys.area(id),
    queryFn: () => api.service_paths.adminArea(id),
  })
}

/** Published metrics and steps, area × stage, against Finland. */
export function useCompare() {
  const api = useAdminApi()
  return useQuery({
    queryKey: servicePathKeys.compare,
    queryFn: () => api.service_paths.compare(),
  })
}

function useSave<T>(fn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: servicePathKeys.all }),
  })
}

export function useSavePoint() {
  const api = useAdminApi()
  return useSave((input: PointInput) => api.service_paths.adminSavePoint(input))
}

export function useSaveStep() {
  const api = useAdminApi()
  return useSave((input: StepInput) => api.service_paths.adminSaveStep(input))
}

export function useSaveScreening() {
  const api = useAdminApi()
  return useSave((input: ScreeningInput) => api.service_paths.adminSaveScreening(input))
}

export function useSaveMetric() {
  const api = useAdminApi()
  return useSave((input: MetricInput) => api.service_paths.adminSaveMetric(input))
}

export function useSaveFinding() {
  const api = useAdminApi()
  return useSave((input: FindingInput) => api.service_paths.adminSaveFinding(input))
}

export function useAddSource() {
  const api = useAdminApi()
  return useSave((input: SourceInput) => api.service_paths.adminAddSource(input))
}

/** Publish (with verify: stamps today's check date), dispute or retire a row. */
export function useSetStatus() {
  const api = useAdminApi()
  return useSave((input: StatusRequest) => api.service_paths.adminSetStatus(input))
}
