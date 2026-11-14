import { EmptyState } from '@/shared/ui'
import { DataTable, type DataTableColumn } from '@/shared/ui/admin'
import { formatCount, formatUsd } from '@/features/admin-usage/components/format'
import type { UsageRow } from '@/features/admin-usage/types'

const COLUMNS: DataTableColumn<UsageRow>[] = [
  { key: 'day', header: 'Day', render: (r) => r.day },
  { key: 'service', header: 'Service', render: (r) => r.service },
  { key: 'provider', header: 'Provider', render: (r) => r.provider },
  { key: 'feature', header: 'Feature', render: (r) => r.feature },
  { key: 'calls', header: 'Calls', render: (r) => formatCount(r.calls), numeric: true },
  { key: 'tokens', header: 'Tokens', render: (r) => formatCount(r.tokens), numeric: true },
  { key: 'characters', header: 'Characters', render: (r) => formatCount(r.characters), numeric: true },
  { key: 'seconds', header: 'Seconds', render: (r) => formatCount(r.seconds), numeric: true },
  { key: 'cost', header: 'Cost USD', render: (r) => formatUsd(r.costUsd), numeric: true },
]

const rowKey = (r: UsageRow) => `${r.day}|${r.service}|${r.provider}|${r.feature}`
const empty = <EmptyState title="No paid usage yet" description="LLM and voice calls are listed here per day and feature." />

/** Usage rows per day, service, provider and feature. */
export function UsageTable({ rows }: { rows: UsageRow[] }) {
  return <DataTable label="Usage by day and feature" columns={COLUMNS} rows={rows} rowKey={rowKey} minWidth={900} emptyState={empty} />
}
