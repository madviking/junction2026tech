import { EmptyState, Text } from '@/shared/ui'
import { DataTable, type DataTableColumn } from '@/shared/ui/admin'
import { formatDateTime } from '@/features/admin-usage/components/format'
import type { AuditEntry } from '@/features/admin-usage/types'

const COLUMNS: DataTableColumn<AuditEntry>[] = [
  { key: 'at', header: 'When', render: (e) => formatDateTime(e.at) },
  { key: 'actor', header: 'Who', render: (e) => e.actor },
  { key: 'action', header: 'Action', render: (e) => e.action },
  { key: 'target', header: 'Target', render: (e) => e.target },
  {
    key: 'detail',
    header: 'Detail',
    render: (e) =>
      e.detail && e.detail !== '{}' ? (
        <Text variant="caption" tone="muted" as="span">
          {e.detail}
        </Text>
      ) : null,
  },
]

const rowKey = (e: AuditEntry) => String(e.id)
const empty = <EmptyState title="No audit entries" description="Admin sign-ins and every admin change are recorded here." />

/** Audit log, newest first. */
export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  return <DataTable label="Audit log" columns={COLUMNS} rows={entries} rowKey={rowKey} minWidth={760} emptyState={empty} />
}
