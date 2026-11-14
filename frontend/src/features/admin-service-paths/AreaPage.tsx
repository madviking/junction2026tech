import { IconArrowLeft, IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { adminErrorMessage } from '@/features/admin-auth'
import { useAdminArea } from '@/features/admin-service-paths/api/servicePaths'
import {
  FindingsTable,
  MetricsTable,
  PointsTable,
  ScreeningTable,
  SourcesTable,
  StepsTable,
  type StageLine,
} from '@/features/admin-service-paths/components/AreaTables'
import { FindingDrawer } from '@/features/admin-service-paths/components/FindingDrawer'
import { MetricDrawer } from '@/features/admin-service-paths/components/MetricDrawer'
import { PointDrawer } from '@/features/admin-service-paths/components/PointDrawer'
import { ScreeningDrawer } from '@/features/admin-service-paths/components/ScreeningDrawer'
import { StepDrawer } from '@/features/admin-service-paths/components/StepDrawer'
import { STATUS_FILTERS } from '@/features/admin-service-paths/lib/format'
import type { AdminAreaView, FactStatus } from '@/features/admin-service-paths/types'
import { ActionButton, ErrorState, Grid, LoadingState, Section, SelectField, StatTile, Stack } from '@/shared/ui'
import { Tabs, Toolbar } from '@/shared/ui/admin'

type Tab = 'doors' | 'steps' | 'screening' | 'metrics' | 'findings' | 'sources'
type Open = { tab: Tab; ref: string } | null

const TABS = [
  { value: 'doors', label: 'Doors' },
  { value: 'steps', label: 'Steps' },
  { value: 'screening', label: 'Screening' },
  { value: 'metrics', label: 'Measured values' },
  { value: 'findings', label: 'Findings' },
  { value: 'sources', label: 'Sources' },
]

const NEW = 'new'

function countStatuses(a: AdminAreaView) {
  const all = [...a.points, ...a.steps, ...a.screening, ...a.metrics, ...a.findings]
  const n = (s: FactStatus) => all.filter((r) => r.status === s).length
  return {
    published: n('published'),
    draft: n('draft'),
    disputed: n('disputed'),
    stale: n('stale'),
  }
}

/** `/admin/service-paths/:id`: every fact for one area, editable, with its source and status. */
export function AreaPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const area = useAdminArea(id)
  const [tab, setTab] = useState<Tab>('doors')
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState<Open>(null)
  const close = () => setOpen(null)
  const back = (
    <ActionButton compact variant="subtle" icon={<IconArrowLeft size={18} aria-hidden="true" />} onPress={() => navigate('/admin/service-paths')}>
      All areas
    </ActionButton>
  )

  if (area.isPending) return <LoadingState label="Loading the area" />
  if (area.isError) {
    return (
      <Stack gap="md">
        {back}
        <ErrorState title="Could not load the area" message={adminErrorMessage(area.error)} onRetry={() => area.refetch()} retrying={area.isFetching} />
      </Stack>
    )
  }

  const a = area.data
  const keep = <T extends { status: FactStatus }>(rows: T[]) => (filter === 'all' ? rows : rows.filter((r) => r.status === filter))
  const lines: StageLine[] = a.stages.map((stage) => ({
    stage,
    step: a.steps.find((s) => s.stage === stage.code) ?? null,
  }))
  const shownLines = filter === 'all' ? lines : lines.filter((l) => l.step?.status === filter)
  const counts = countStatuses(a)
  const add = (label: string, t: Tab) => (
    <ActionButton compact icon={<IconPlus size={18} aria-hidden="true" />} onPress={() => setOpen({ tab: t, ref: NEW })}>
      {label}
    </ActionButton>
  )
  const actions =
    tab === 'doors'
      ? add('Add door', 'doors')
      : tab === 'metrics'
        ? add('Add value', 'metrics')
        : tab === 'findings'
          ? add('Add finding', 'findings')
          : undefined

  const ref = open?.ref ?? ''
  const point = open?.tab === 'doors' && ref !== NEW ? (a.points.find((p) => String(p.id) === ref) ?? null) : null
  const line = open?.tab === 'steps' ? lines.find((l) => l.stage.code === ref) : undefined
  const screening = open?.tab === 'screening' ? a.screening.find((s) => s.cancer === ref) : undefined
  const metric = open?.tab === 'metrics' && ref !== NEW ? (a.metrics.find((m) => String(m.id) === ref) ?? null) : null
  const finding = open?.tab === 'findings' && ref !== NEW ? (a.findings.find((f) => String(f.id) === ref) ?? null) : null

  return (
    <Stack gap="lg">
      {back}
      <Section
        level={1}
        eyebrow="Service paths"
        title={a.area.name}
        description={
          [a.area.specialistProvider && `Specialist care: ${a.area.specialistProvider}`, a.area.collaborationArea].filter(Boolean).join(' · ') || undefined
        }
      >
        <Grid min="xs">
          <StatTile label="Published" value={counts.published} note="Reach residents and the comparison" />
          <StatTile label="Draft" value={counts.draft} note="Waiting for a check" />
          <StatTile label="Disputed" value={counts.disputed} note="Sources disagree" />
          <StatTile label="Stale" value={counts.stale} />
        </Grid>
      </Section>
      <Tabs label="Area facts" items={TABS} value={tab} onChange={(v) => setTab(v as Tab)}>
        <Stack gap="md">
          {tab !== 'sources' && (
            <Toolbar actions={actions}>
              <SelectField label="Status" options={STATUS_FILTERS} value={filter} onChange={(v) => setFilter(v ?? 'all')} />
            </Toolbar>
          )}
          {tab === 'doors' && <PointsTable rows={keep(a.points)} onOpen={(p) => setOpen({ tab, ref: String(p.id) })} />}
          {tab === 'steps' && <StepsTable rows={shownLines} onOpen={(l) => setOpen({ tab, ref: l.stage.code })} />}
          {tab === 'screening' && <ScreeningTable rows={keep(a.screening)} onOpen={(s) => setOpen({ tab, ref: s.cancer })} />}
          {tab === 'metrics' && <MetricsTable rows={keep(a.metrics)} onOpen={(m) => setOpen({ tab, ref: String(m.id) })} />}
          {tab === 'findings' && <FindingsTable rows={keep(a.findings)} onOpen={(f) => setOpen({ tab, ref: String(f.id) })} />}
          {tab === 'sources' && <SourcesTable rows={a.sources} />}
        </Stack>
      </Tabs>

      {open?.tab === 'doors' && <PointDrawer key={ref} county={id} point={point} sources={a.sources} onClose={close} />}
      {line && <StepDrawer key={ref} county={id} stage={line.stage} step={line.step} points={a.points} sources={a.sources} onClose={close} />}
      {screening && <ScreeningDrawer key={ref} county={id} row={screening} points={a.points} sources={a.sources} onClose={close} />}
      {open?.tab === 'metrics' && <MetricDrawer key={ref} area={id} metric={metric} stages={a.stages} sources={a.sources} onClose={close} />}
      {open?.tab === 'findings' && <FindingDrawer key={ref} county={id} finding={finding} stages={a.stages} sources={a.sources} onClose={close} />}
    </Stack>
  )
}
