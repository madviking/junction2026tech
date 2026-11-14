import { StatusBadge } from '@/shared/ui'
import { STATUS_TONE } from '@/features/admin-service-paths/lib/format'
import type { FactStatus } from '@/features/admin-service-paths/types'

/** Fact status as a coloured pill, with the check date when there is one. */
export function StatusPill({ status, verifiedOn }: { status: FactStatus; verifiedOn?: string | null }) {
  return <StatusBadge tone={STATUS_TONE[status]}>{verifiedOn && status === 'published' ? `published ${verifiedOn}` : status}</StatusBadge>
}
