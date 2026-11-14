import { StatusBadge, Text, EmptyState, Row } from '@/shared/ui'
import { DataTable, type DataTableColumn } from '@/shared/ui/admin'
import type { AreaSummary } from '@/features/admin-service-paths/types'

const COLUMNS: DataTableColumn<AreaSummary>[] = [
  { key: 'name', header: 'Area', render: (a) => a.name },
  {
    key: 'specialist',
    header: 'Specialist care',
    render: (a) => a.specialistProvider ?? '—',
  },
  {
    key: 'published',
    header: 'Published',
    numeric: true,
    render: (a) => a.counts.published,
  },
  {
    key: 'draft',
    header: 'Draft',
    numeric: true,
    render: (a) => a.counts.draft,
  },
  {
    key: 'attention',
    header: 'Needs attention',
    render: (a) =>
      a.counts.disputed + a.counts.stale > 0 ? (
        <Row gap="xs">
          {a.counts.disputed > 0 && <StatusBadge tone="warning">{`${a.counts.disputed} disputed`}</StatusBadge>}
          {a.counts.stale > 0 && <StatusBadge tone="danger">{`${a.counts.stale} stale`}</StatusBadge>}
        </Row>
      ) : (
        <Text variant="caption" tone="muted" as="span">
          —
        </Text>
      ),
  },
]

/** One row per area; opening a row goes to the area page. */
export function AreasTable({ areas, onOpen }: { areas: AreaSummary[]; onOpen: (a: AreaSummary) => void }) {
  return (
    <DataTable
      label="Areas"
      columns={COLUMNS}
      rows={areas}
      rowKey={(a) => a.id}
      onRowClick={onOpen}
      minWidth={760}
      emptyState={<EmptyState title="No areas" description="The seed loads five areas on first use." />}
    />
  )
}
