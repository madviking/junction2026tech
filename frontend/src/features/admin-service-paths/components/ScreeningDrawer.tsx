import { useState } from 'react'
import { adminErrorMessage } from '@/features/admin-auth'
import { useSaveScreening } from '@/features/admin-service-paths/api/servicePaths'
import { EditDrawer } from '@/features/admin-service-paths/components/EditDrawer'
import { SourcePicker } from '@/features/admin-service-paths/components/SourcePicker'
import { useStatusActions } from '@/features/admin-service-paths/components/useStatusActions'
import { TRI_STATE, fromTri, listText, orNull, textList, toTri } from '@/features/admin-service-paths/lib/format'
import type { PointRow, ScreeningRow, SourceView } from '@/features/admin-service-paths/types'
import { SelectField, TextField } from '@/shared/ui'

export interface ScreeningDrawerProps {
  county: string
  row: ScreeningRow
  points: PointRow[]
  sources: SourceView[]
  onClose: () => void
}

/** One screening programme in this area: ages, provider, invitation, follow-up door. */
export function ScreeningDrawer({ county, row, points, sources, onClose }: ScreeningDrawerProps) {
  const [f, setF] = useState({
    ages: row.ages,
    provider: row.provider ?? '',
    invitationChannel: row.invitationChannel ?? '',
    infoLanguages: listText(row.infoLanguages),
    followupPointId: row.followupPointId,
    selfSampling: toTri(row.selfSampling),
    sourceId: row.source?.id ?? null,
  })
  const save = useSaveScreening()
  const status = useStatusActions({ kind: 'screening', county, ref: row.cancer }, row.status, row.verifiedOn)
  const onSave = () =>
    save.mutate({
      county,
      cancer: row.cancer,
      ages: f.ages.trim(),
      provider: orNull(f.provider),
      invitationChannel: orNull(f.invitationChannel),
      infoLanguages: textList(f.infoLanguages),
      followupPointId: f.followupPointId,
      selfSampling: fromTri(f.selfSampling),
      status: row.status,
      verifiedOn: row.verifiedOn,
      sourceId: f.sourceId,
    })
  const error = save.error ?? status.error
  return (
    <EditDrawer
      opened
      title={`${row.cancer} screening`}
      onClose={onClose}
      onSave={onSave}
      saving={save.isPending}
      error={error ? adminErrorMessage(error) : null}
      statusActions={status.actions}
    >
      <TextField label="Ages" value={f.ages} onChange={(ages) => setF({ ...f, ages })} required />
      <TextField label="Provider" value={f.provider} onChange={(provider) => setF({ ...f, provider })} />
      <TextField
        label="Invitation channel"
        description="letter, sms or electronic."
        value={f.invitationChannel}
        onChange={(invitationChannel) => setF({ ...f, invitationChannel })}
      />
      <TextField
        label="Information languages"
        description="Comma-separated codes."
        value={f.infoLanguages}
        onChange={(infoLanguages) => setF({ ...f, infoLanguages })}
      />
      <SelectField
        label="Follow-up door after a positive result"
        options={points.map((p) => ({ value: String(p.id), label: p.nameFi }))}
        value={f.followupPointId === null ? null : String(f.followupPointId)}
        onChange={(v) => setF({ ...f, followupPointId: v ? Number(v) : null })}
        searchable
        clearable
      />
      <SelectField label="Self-sampling" options={TRI_STATE} value={f.selfSampling} onChange={(v) => setF({ ...f, selfSampling: v ?? 'unknown' })} />
      <SourcePicker sources={sources} value={f.sourceId} onChange={(sourceId) => setF({ ...f, sourceId })} />
    </EditDrawer>
  )
}
