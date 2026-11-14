import { useMemo } from 'react'
import { ActionButton, EmptyState, StatusBadge, Text } from '@/shared/ui'
import { DataTable, type DataTableColumn } from '@/shared/ui/admin'
import { formatDateTime } from '@/features/admin-content/lib/format'
import type { ReleaseInfo } from '@/features/admin-content/types'

export interface VersionsTableProps {
  versions: ReleaseInfo[]
  onRollback: (version: ReleaseInfo) => void
}

/** Published versions, newest first, with the live one marked. */
export function VersionsTable({ versions, onRollback }: VersionsTableProps) {
  const columns = useMemo<DataTableColumn<ReleaseInfo>[]>(
    () => [
      { key: 'version', header: 'Version', render: (v) => `v${v.version}`, numeric: true },
      { key: 'live', header: 'Status', render: (v) => (v.live ? <StatusBadge tone="success">Live</StatusBadge> : <Text tone="muted" as="span">Published</Text>) },
      { key: 'note', header: 'Note', render: (v) => v.note ?? '—' },
      { key: 'by', header: 'By', render: (v) => v.createdBy },
      { key: 'date', header: 'Published', render: (v) => formatDateTime(v.publishedAt) },
      {
        key: 'actions',
        header: 'Actions',
        render: (v) =>
          v.live ? null : (
            <ActionButton variant="secondary" compact onPress={() => onRollback(v)} ariaLabel={`Roll back to version ${v.version}`}>
              Roll back
            </ActionButton>
          ),
      },
    ],
    [onRollback],
  )
  return (
    <DataTable
      label="Published versions"
      columns={columns}
      rows={versions}
      rowKey={(v) => String(v.id)}
      minWidth={720}
      emptyState={<EmptyState title="No versions yet" description="The seed publishes version 1 on first start." />}
    />
  )
}
