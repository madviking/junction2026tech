import { Grid, StatTile } from '@/shared/ui'
import { formatUsd } from '@/features/admin-usage/components/format'
import type { UsageReport } from '@/features/admin-usage/types'

/** Total paid spend and the spend per provider. */
export function UsageTotals({ report }: { report: UsageReport }) {
  return (
    <Grid min="sm">
      <StatTile label="Total spend" value={formatUsd(report.totalUsd)} note="All providers, all days" />
      {report.totals.map((total) => (
        <StatTile key={total.provider} label={total.provider} value={formatUsd(total.costUsd)} />
      ))}
    </Grid>
  )
}
