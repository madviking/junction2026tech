import { useState } from 'react'
import { adminErrorMessage } from '@/features/admin-auth'
import { useSaveMetric } from '@/features/admin-service-paths/api/servicePaths'
import { EditDrawer } from '@/features/admin-service-paths/components/EditDrawer'
import { SourcePicker } from '@/features/admin-service-paths/components/SourcePicker'
import { useStatusActions } from '@/features/admin-service-paths/components/useStatusActions'
import type { MetricInput, MetricRow, SourceView, Stage, StageCode } from '@/features/admin-service-paths/types'
import { SelectField, TextField } from '@/shared/ui'

const BETTER = [
  { value: 'lower', label: 'Lower is better' },
  { value: 'higher', label: 'Higher is better' },
]
const SCOPE = [
  { value: 'area', label: 'This area' },
  { value: 'hospital_district', label: 'Hospital district' },
  { value: 'national', label: 'National' },
]

export interface MetricDrawerProps {
  area: string
  /** The value to edit, or null for a new one. */
  metric: MetricRow | null
  stages: Stage[]
  sources: SourceView[]
  onClose: () => void
}

/** A measured value for one metric and period. Area, metric and period identify it. */
export function MetricDrawer({ area, metric, stages, sources, onClose }: MetricDrawerProps) {
  const [f, setF] = useState({
    stage: metric?.stage ?? 'primary_visit',
    metric: metric?.metric ?? '',
    definition: metric?.definition ?? '',
    value: metric ? String(metric.value) : '',
    unit: metric?.unit ?? '%',
    period: metric?.period ?? '',
    better: metric?.better ?? 'lower',
    scope: metric?.scope ?? 'area',
    sourceId: metric?.source.id ?? null,
  })
  const [localError, setLocalError] = useState<string | null>(null)
  const save = useSaveMetric()
  const status = useStatusActions(metric ? { kind: 'metric', id: metric.id } : null, metric?.status ?? 'draft', null)

  const onSave = () => {
    const value = Number(f.value.replace(',', '.'))
    if (!f.value.trim() || Number.isNaN(value)) return setLocalError('Value must be a number.')
    if (f.sourceId === null) return setLocalError('A measured value needs a source.')
    setLocalError(null)
    const input: MetricInput = {
      area,
      stage: f.stage as StageCode,
      metric: f.metric.trim(),
      definition: f.definition.trim(),
      value,
      unit: f.unit.trim(),
      period: f.period.trim(),
      better: f.better as MetricInput['better'],
      scope: f.scope as MetricInput['scope'],
      status: metric?.status ?? 'draft',
      sourceId: f.sourceId,
    }
    save.mutate(input, { onSuccess: () => !metric && onClose() })
  }

  const error = localError ?? (save.error ? adminErrorMessage(save.error) : status.error ? adminErrorMessage(status.error) : null)
  return (
    <EditDrawer
      opened
      title={metric ? `${metric.metric} ${metric.period}` : 'New measured value'}
      onClose={onClose}
      onSave={onSave}
      saving={save.isPending}
      error={error}
      statusActions={status.actions}
    >
      <TextField
        label="Metric id"
        description="e.g. sotkanet:6411."
        value={f.metric}
        onChange={(m) => setF({ ...f, metric: m })}
        required
        disabled={metric !== null}
      />
      <TextField label="Period" description="e.g. 2025." value={f.period} onChange={(period) => setF({ ...f, period })} required disabled={metric !== null} />
      <SelectField
        label="Stage"
        options={stages.map((s) => ({ value: s.code, label: s.name }))}
        value={f.stage}
        onChange={(v) => v && setF({ ...f, stage: v as StageCode })}
        required
      />
      <TextField label="Definition" value={f.definition} onChange={(definition) => setF({ ...f, definition })} required />
      <TextField label="Value" value={f.value} onChange={(value) => setF({ ...f, value })} required />
      <TextField label="Unit" value={f.unit} onChange={(unit) => setF({ ...f, unit })} required />
      <SelectField label="Direction" options={BETTER} value={f.better} onChange={(v) => v && setF({ ...f, better: v as MetricInput['better'] })} />
      <SelectField label="Scope" options={SCOPE} value={f.scope} onChange={(v) => v && setF({ ...f, scope: v as MetricInput['scope'] })} />
      <SourcePicker sources={sources} value={f.sourceId} onChange={(sourceId) => setF({ ...f, sourceId })} required />
    </EditDrawer>
  )
}
