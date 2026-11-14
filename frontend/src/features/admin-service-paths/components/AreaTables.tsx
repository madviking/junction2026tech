import { SourceLink } from '@/features/admin-service-paths/components/SourceLink'
import { StatusPill } from '@/features/admin-service-paths/components/StatusPill'
import { formatValue, informedLabel, kindLabel } from '@/features/admin-service-paths/lib/format'
import type { FindingRow, MetricRow, PointRow, ScreeningRow, SourceView, Stage, StepRow } from '@/features/admin-service-paths/types'
import { EmptyState, Stack, Text } from '@/shared/ui'
import { DataTable, type DataTableColumn } from '@/shared/ui/admin'

const muted = (text: string | null | undefined, empty = '—') => (
  <Text variant="caption" tone="muted" as="span">
    {text || empty}
  </Text>
)

const two = (main: string, sub: string | null | undefined) => (
  <Stack gap="xs">
    <Text as="span">{main}</Text>
    {sub ? muted(sub) : null}
  </Stack>
)

const noRows = (what: string) => <EmptyState title={`No ${what} match`} description="Change the status filter or add one." />

const POINT_COLUMNS: DataTableColumn<PointRow>[] = [
  { key: 'name', header: 'Door', render: (p) => two(p.nameFi, p.nameEn) },
  { key: 'kind', header: 'Kind', render: (p) => kindLabel(p.kind) },
  { key: 'routes', header: 'Routes', render: (p) => p.routes.join(' ') },
  {
    key: 'contact',
    header: 'Contact',
    render: (p) => two(p.phone ?? p.digitalChannel ?? '—', p.hours),
  },
  {
    key: 'interpreter',
    header: 'Interpreter',
    render: (p) => muted(p.interpreterHow, 'not published'),
  },
  {
    key: 'status',
    header: 'Status',
    render: (p) => <StatusPill status={p.status} verifiedOn={p.verifiedOn} />,
  },
  {
    key: 'source',
    header: 'Source',
    render: (p) => <SourceLink source={p.source} />,
  },
]

export function PointsTable({ rows, onOpen }: { rows: PointRow[]; onOpen: (p: PointRow) => void }) {
  return (
    <DataTable label="Doors" columns={POINT_COLUMNS} rows={rows} rowKey={(p) => String(p.id)} onRowClick={onOpen} minWidth={1200} emptyState={noRows('doors')} />
  )
}

export interface StageLine {
  stage: Stage
  step: StepRow | null
}

const STEP_COLUMNS: DataTableColumn<StageLine>[] = [
  {
    key: 'stage',
    header: 'Stage',
    render: (l) => two(l.stage.name, l.stage.limits.map((x) => `${x.limit} (${x.basis})`).join(' · ')),
  },
  {
    key: 'door',
    header: 'Door',
    render: (l) => (l.step ? (l.step.pointName ?? '—') : muted('not mapped')),
  },
  {
    key: 'informed',
    header: 'Informed by',
    render: (l) => (l.step ? two(informedLabel(l.step.informedBy) || '—', l.step.portal) : null),
  },
  {
    key: 'nothing',
    header: 'If nothing is heard',
    render: (l) => muted(l.step?.ifNothingHeard),
  },
  {
    key: 'status',
    header: 'Status',
    render: (l) => (l.step ? <StatusPill status={l.step.status} verifiedOn={l.step.verifiedOn} /> : null),
  },
  {
    key: 'source',
    header: 'Source',
    render: (l) => (l.step ? <SourceLink source={l.step.source} /> : null),
  },
]

/** Every national stage, mapped or not; the limit column is the same in every area. */
export function StepsTable({ rows, onOpen }: { rows: StageLine[]; onOpen: (l: StageLine) => void }) {
  return (
    <DataTable
      label="Steps by stage"
      columns={STEP_COLUMNS}
      rows={rows}
      rowKey={(l) => l.stage.code}
      onRowClick={onOpen}
      minWidth={1100}
      emptyState={noRows('stages')}
    />
  )
}

const SCREENING_COLUMNS: DataTableColumn<ScreeningRow>[] = [
  { key: 'cancer', header: 'Programme', render: (s) => two(s.cancer, s.ages) },
  { key: 'provider', header: 'Provider', render: (s) => s.provider ?? '—' },
  {
    key: 'invite',
    header: 'Invitation',
    render: (s) => two(s.invitationChannel ?? '—', s.infoLanguages?.join(', ')),
  },
  {
    key: 'followup',
    header: 'Follow-up door',
    render: (s) => s.followupPointName ?? muted(null, 'not published'),
  },
  {
    key: 'status',
    header: 'Status',
    render: (s) => <StatusPill status={s.status} verifiedOn={s.verifiedOn} />,
  },
  {
    key: 'source',
    header: 'Source',
    render: (s) => <SourceLink source={s.source} />,
  },
]

export function ScreeningTable({ rows, onOpen }: { rows: ScreeningRow[]; onOpen: (s: ScreeningRow) => void }) {
  return (
    <DataTable
      label="Screening programmes"
      columns={SCREENING_COLUMNS}
      rows={rows}
      rowKey={(s) => s.cancer}
      onRowClick={onOpen}
      minWidth={860}
      emptyState={noRows('programmes')}
    />
  )
}

const METRIC_COLUMNS: DataTableColumn<MetricRow>[] = [
  {
    key: 'metric',
    header: 'Metric',
    render: (m) => two(m.metric, m.definition),
  },
  { key: 'period', header: 'Period', render: (m) => m.period },
  {
    key: 'value',
    header: 'Value',
    numeric: true,
    render: (m) => formatValue(m.value, m.unit),
  },
  { key: 'better', header: 'Better', render: (m) => m.better },
  {
    key: 'status',
    header: 'Status',
    render: (m) => <StatusPill status={m.status} />,
  },
  {
    key: 'source',
    header: 'Source',
    render: (m) => <SourceLink source={m.source} />,
  },
]

export function MetricsTable({ rows, onOpen }: { rows: MetricRow[]; onOpen: (m: MetricRow) => void }) {
  return (
    <DataTable
      label="Measured values"
      columns={METRIC_COLUMNS}
      rows={rows}
      rowKey={(m) => String(m.id)}
      onRowClick={onOpen}
      minWidth={860}
      emptyState={noRows('values')}
    />
  )
}

const FINDING_COLUMNS: DataTableColumn<FindingRow>[] = [
  { key: 'finding', header: 'Finding', render: (f) => two(f.finding, f.key) },
  { key: 'stage', header: 'Stage', render: (f) => f.stage },
  { key: 'barrier', header: 'Barrier', render: (f) => f.barrier ?? '—' },
  {
    key: 'status',
    header: 'Status',
    render: (f) => <StatusPill status={f.status} verifiedOn={f.verifiedOn} />,
  },
  {
    key: 'source',
    header: 'Source',
    render: (f) => <SourceLink source={f.source} />,
  },
]

export function FindingsTable({ rows, onOpen }: { rows: FindingRow[]; onOpen: (f: FindingRow) => void }) {
  return (
    <DataTable
      label="Findings"
      columns={FINDING_COLUMNS}
      rows={rows}
      rowKey={(f) => String(f.id)}
      onRowClick={onOpen}
      minWidth={860}
      emptyState={noRows('findings')}
    />
  )
}

const SOURCE_COLUMNS: DataTableColumn<SourceView>[] = [
  { key: 'title', header: 'Title', render: (s) => two(s.title, s.brainRef) },
  { key: 'publisher', header: 'Publisher', render: (s) => s.publisher },
  { key: 'captured', header: 'Captured', render: (s) => s.capturedOn },
  { key: 'link', header: 'Link', render: (s) => <SourceLink source={s} /> },
]

export function SourcesTable({ rows }: { rows: SourceView[] }) {
  return (
    <DataTable
      label="Sources"
      columns={SOURCE_COLUMNS}
      rows={rows}
      rowKey={(s) => String(s.id)}
      minWidth={760}
      emptyState={<EmptyState title="No sources yet" />}
    />
  )
}
