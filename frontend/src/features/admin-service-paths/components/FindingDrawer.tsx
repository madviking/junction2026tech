import { useState } from 'react'
import { adminErrorMessage } from '@/features/admin-auth'
import { useSaveFinding } from '@/features/admin-service-paths/api/servicePaths'
import { EditDrawer } from '@/features/admin-service-paths/components/EditDrawer'
import { SourcePicker } from '@/features/admin-service-paths/components/SourcePicker'
import { useStatusActions } from '@/features/admin-service-paths/components/useStatusActions'
import { BARRIER_OPTIONS } from '@/features/admin-service-paths/lib/format'
import type { FindingRow, SourceView, Stage, StageCode } from '@/features/admin-service-paths/types'
import { SelectField, TextAreaField, TextField } from '@/shared/ui'

export interface FindingDrawerProps {
  county: string
  finding: FindingRow | null
  stages: Stage[]
  sources: SourceView[]
  onClose: () => void
}

/** A sourced bottleneck at one stage, optionally tied to a care-path barrier. */
export function FindingDrawer({ county, finding, stages, sources, onClose }: FindingDrawerProps) {
  const [f, setF] = useState({
    key: finding?.key ?? '',
    stage: finding?.stage ?? 'contact',
    barrier: finding?.barrier ?? null,
    finding: finding?.finding ?? '',
    sourceId: finding?.source.id ?? null,
  })
  const [localError, setLocalError] = useState<string | null>(null)
  const save = useSaveFinding()
  const status = useStatusActions(finding ? { kind: 'finding', id: finding.id } : null, finding?.status ?? 'draft', finding?.verifiedOn ?? null)

  const onSave = () => {
    if (f.sourceId === null) return setLocalError('A finding needs a source.')
    setLocalError(null)
    save.mutate(
      {
        id: finding?.id ?? null,
        county,
        key: f.key.trim(),
        stage: f.stage as StageCode,
        barrier: f.barrier,
        finding: f.finding.trim(),
        status: finding?.status ?? 'draft',
        verifiedOn: finding?.verifiedOn ?? null,
        sourceId: f.sourceId,
      },
      { onSuccess: () => !finding && onClose() },
    )
  }

  const error = localError ?? (save.error ? adminErrorMessage(save.error) : status.error ? adminErrorMessage(status.error) : null)
  return (
    <EditDrawer
      opened
      title={finding ? finding.key : 'New finding'}
      onClose={onClose}
      onSave={onSave}
      saving={save.isPending}
      error={error}
      statusActions={status.actions}
    >
      <TextField
        label="Key"
        description="Stable id within the area, kebab-case."
        value={f.key}
        onChange={(key) => setF({ ...f, key })}
        required
        disabled={finding !== null}
      />
      <SelectField
        label="Stage"
        options={stages.map((s) => ({ value: s.code, label: s.name }))}
        value={f.stage}
        onChange={(v) => v && setF({ ...f, stage: v as StageCode })}
        required
      />
      <SelectField label="Barrier" options={BARRIER_OPTIONS} value={f.barrier} onChange={(barrier) => setF({ ...f, barrier })} clearable />
      <TextAreaField
        label="Finding"
        description="One sentence, with the number where there is one."
        value={f.finding}
        onChange={(text) => setF({ ...f, finding: text })}
        rows={3}
        required
      />
      <SourcePicker sources={sources} value={f.sourceId} onChange={(sourceId) => setF({ ...f, sourceId })} required />
    </EditDrawer>
  )
}
