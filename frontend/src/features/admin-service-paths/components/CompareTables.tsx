import { useMemo } from 'react'
import { formatValue, informedLabel } from '@/features/admin-service-paths/lib/format'
import type { CompareMetricRow, CompareStepRow, CompareView } from '@/features/admin-service-paths/types'
import { EmptyState, Stack, Text } from '@/shared/ui'
import { DataTable, type DataTableColumn } from '@/shared/ui/admin'

const TONE = { better: 'success', worse: 'danger', same: 'default' } as const

function stageName(view: CompareView, code: string) {
  return view.stages.find((s) => s.code === code)?.name ?? code
}

/** Each area's latest value against Finland in the same period; older values are shown but not compared. */
export function CompareMetricsTable({ view }: { view: CompareView }) {
  const columns = useMemo(
    (): DataTableColumn<CompareMetricRow>[] => [
      {
        key: 'metric',
        header: 'Measure',
        render: (r) => (
          <Stack gap="xs">
            <Text as="span">{r.definition}</Text>
            <Text variant="caption" tone="muted" as="span">{`${stageName(view, r.stage)} · ${r.metric} · ${r.better} is better`}</Text>
          </Stack>
        ),
      },
      { key: 'period', header: 'Period', render: (r) => r.period },
      {
        key: 'finland',
        header: 'Finland',
        numeric: true,
        render: (r) => formatValue(r.finland.value, r.unit),
      },
      ...view.areas.map((a): DataTableColumn<CompareMetricRow> => ({
        key: a.id,
        header: a.name.split(' / ')[1] ?? a.name,
        numeric: true,
        render: (r) => {
          const c = r.cells.find((x) => x.area === a.id)
          if (!c || c.value === null) {
            return (
              <Text variant="caption" tone="muted" as="span">
                not published
              </Text>
            )
          }
          return (
            <Stack gap="xs">
              <Text as="span" tone={c.vsFinland ? TONE[c.vsFinland] : 'default'}>
                {formatValue(c.value, r.unit)}
              </Text>
              {c.period !== r.period && <Text variant="caption" tone="muted" as="span">{`${c.period}, not compared`}</Text>}
            </Stack>
          )
        },
      })),
    ],
    [view],
  )
  return (
    <DataTable
      label="Measured values by area"
      columns={columns}
      rows={view.metrics}
      rowKey={(r) => r.metric}
      minWidth={1500}
      emptyState={<EmptyState title="No published values" description="Publish measured values in an area to compare them." />}
    />
  )
}

/** How each stage works in each area, beside the national limit that is the same everywhere. */
export function CompareStepsTable({ view }: { view: CompareView }) {
  const columns = useMemo(
    (): DataTableColumn<CompareStepRow>[] => [
      {
        key: 'stage',
        header: 'Stage and national limit',
        render: (r) => {
          const stage = view.stages.find((s) => s.code === r.stage)
          return (
            <Stack gap="xs">
              <Text as="span">{stage?.name ?? r.stage}</Text>
              <Text variant="caption" tone="muted" as="span">
                {stage?.limits.map((l) => `${l.limit} (${l.basis})`).join(' · ')}
              </Text>
            </Stack>
          )
        },
      },
      ...view.areas.map((a): DataTableColumn<CompareStepRow> => ({
        key: a.id,
        header: a.name.split(' / ')[1] ?? a.name,
        render: (r) => {
          const c = r.cells.find((x) => x.area === a.id)
          if (!c || (c.pointName === null && c.informedBy === null && c.ifNothingHeard === null)) {
            return (
              <Text variant="caption" tone="muted" as="span">
                not mapped
              </Text>
            )
          }
          return (
            <Stack gap="xs">
              <Text as="span">{[c.pointName, informedLabel(c.informedBy)].filter(Boolean).join(' · ')}</Text>
              {c.ifNothingHeard && (
                <Text variant="caption" tone="muted" as="span">
                  {c.ifNothingHeard}
                </Text>
              )}
            </Stack>
          )
        },
      })),
    ],
    [view],
  )
  return (
    <DataTable
      label="Steps by area"
      columns={columns}
      rows={view.steps}
      rowKey={(r) => r.stage}
      minWidth={1500}
      emptyState={<EmptyState title="No published steps" description="Publish steps in an area to compare them." />}
    />
  )
}
