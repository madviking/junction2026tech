import { useSetStatus } from '@/features/admin-service-paths/api/servicePaths'
import type { StatusActions } from '@/features/admin-service-paths/components/EditDrawer'
import type { FactStatus, StatusRequest } from '@/features/admin-service-paths/types'

type Target = Omit<StatusRequest, 'status' | 'verify'>

/** Status buttons for a saved row; `target` null for a row not saved yet. */
export function useStatusActions(target: Target | null, status: FactStatus, verifiedOn: string | null) {
  const set = useSetStatus()
  const actions: StatusActions | undefined = target
    ? {
        status,
        verifiedOn,
        busy: set.isPending,
        onPublish: () => set.mutate({ ...target, status: 'published', verify: true }),
        onSetStatus: (s: FactStatus) => set.mutate({ ...target, status: s }),
      }
    : undefined
  return { actions, error: set.error, reset: set.reset }
}
