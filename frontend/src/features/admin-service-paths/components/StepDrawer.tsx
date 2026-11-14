import { useState } from 'react'
import { adminErrorMessage } from '@/features/admin-auth'
import { useSaveStep } from '@/features/admin-service-paths/api/servicePaths'
import { EditDrawer } from '@/features/admin-service-paths/components/EditDrawer'
import { SourcePicker } from '@/features/admin-service-paths/components/SourcePicker'
import { useStatusActions } from '@/features/admin-service-paths/components/useStatusActions'
import { INFORMED_OPTIONS, orNull } from '@/features/admin-service-paths/lib/format'
import type { InformedBy, PointRow, SourceView, Stage, StepRow } from '@/features/admin-service-paths/types'
import { SelectField, Stack, Text, TextAreaField, TextField } from '@/shared/ui'

export interface StepDrawerProps {
  county: string
  stage: Stage
  step: StepRow | null
  points: PointRow[]
  sources: SourceView[]
  onClose: () => void
}

/** How one stage works in this area: the door, how people hear back, what to do if nothing comes. */
export function StepDrawer({ county, stage, step, points, sources, onClose }: StepDrawerProps) {
  const [f, setF] = useState({
    pointId: step?.pointId ?? null,
    informedBy: step?.informedBy ?? null,
    portal: step?.portal ?? '',
    ifNothingHeard: step?.ifNothingHeard ?? '',
    sourceId: step?.source?.id ?? null,
  })
  const save = useSaveStep()
  const status = useStatusActions(step ? { kind: 'step', county, ref: stage.code } : null, step?.status ?? 'draft', step?.verifiedOn ?? null)
  const onSave = () =>
    save.mutate({
      county,
      stage: stage.code,
      pointId: f.pointId,
      informedBy: f.informedBy,
      portal: orNull(f.portal),
      ifNothingHeard: orNull(f.ifNothingHeard),
      status: step?.status ?? 'draft',
      verifiedOn: step?.verifiedOn ?? null,
      sourceId: f.sourceId,
    })
  const error = save.error ?? status.error
  return (
    <EditDrawer
      opened
      title={stage.name}
      onClose={onClose}
      onSave={onSave}
      saving={save.isPending}
      error={error ? adminErrorMessage(error) : null}
      statusActions={status.actions}
    >
      <Stack gap="xs">
        <Text variant="label">National limit (same in every area)</Text>
        {stage.limits.map((l) => (
          <Text key={l.label} variant="caption" tone="muted">{`${l.label}: ${l.limit} (${l.basis}, ${l.ref})`}</Text>
        ))}
      </Stack>
      <SelectField
        label="Door"
        options={points.map((p) => ({ value: String(p.id), label: p.nameFi }))}
        value={f.pointId === null ? null : String(f.pointId)}
        onChange={(v) => setF({ ...f, pointId: v ? Number(v) : null })}
        searchable
        clearable
      />
      <SelectField
        label="How people are informed"
        options={INFORMED_OPTIONS}
        value={f.informedBy}
        onChange={(v) => setF({ ...f, informedBy: v as InformedBy | null })}
        clearable
      />
      <TextField label="Portal" description="e.g. Maisa, OmaPohde." value={f.portal} onChange={(portal) => setF({ ...f, portal })} />
      <TextAreaField label="If nothing is heard" value={f.ifNothingHeard} onChange={(ifNothingHeard) => setF({ ...f, ifNothingHeard })} rows={3} />
      <SourcePicker sources={sources} value={f.sourceId} onChange={(sourceId) => setF({ ...f, sourceId })} />
    </EditDrawer>
  )
}
