import { useState } from 'react'
import { adminErrorMessage } from '@/features/admin-auth'
import { useSavePoint } from '@/features/admin-service-paths/api/servicePaths'
import { EditDrawer } from '@/features/admin-service-paths/components/EditDrawer'
import { SourcePicker } from '@/features/admin-service-paths/components/SourcePicker'
import { useStatusActions } from '@/features/admin-service-paths/components/useStatusActions'
import { KIND_OPTIONS, ROUTES, TRI_STATE, fromTri, listText, orNull, textList, toTri } from '@/features/admin-service-paths/lib/format'
import type { PointKind, PointRow, SourceView } from '@/features/admin-service-paths/types'
import { CheckboxField, Row, SelectField, Stack, Text, TextAreaField, TextField } from '@/shared/ui'

function formOf(p: PointRow | null) {
  return {
    key: p?.key ?? '',
    kind: (p?.kind ?? 'health_station') as PointKind,
    routes: p?.routes ?? ['A1'],
    nameFi: p?.nameFi ?? '',
    nameEn: p?.nameEn ?? '',
    city: p?.city ?? '',
    phone: p?.phone ?? '',
    hours: p?.hours ?? '',
    contactNote: p?.contactNote ?? '',
    callback: toTri(p?.callback ?? null),
    walkIn: p?.walkIn ?? '',
    digitalChannel: p?.digitalChannel ?? '',
    digitalLogin: p?.digitalLogin ?? '',
    serviceLanguages: listText(p?.serviceLanguages ?? null),
    interpreterHow: p?.interpreterHow ?? '',
    feeNote: p?.feeNote ?? '',
    url: p?.url ?? '',
    sourceId: p?.source?.id ?? null,
  }
}

export interface PointDrawerProps {
  county: string
  /** The door to edit, or null for a new one. */
  point: PointRow | null
  sources: SourceView[]
  onClose: () => void
}

/** Edit a door: contact facts, the routes it serves, and its source. Keyed by point id by the caller. */
export function PointDrawer({ county, point, sources, onClose }: PointDrawerProps) {
  const [f, setF] = useState(() => formOf(point))
  const save = useSavePoint()
  const status = useStatusActions(point ? { kind: 'point', id: point.id } : null, point?.status ?? 'draft', point?.verifiedOn ?? null)
  const set =
    <K extends keyof typeof f>(k: K) =>
    (v: (typeof f)[K]) =>
      setF({ ...f, [k]: v })
  const toggleRoute = (code: string, on: boolean) => set('routes')(on ? [...f.routes, code].sort() : f.routes.filter((r) => r !== code))

  const onSave = () =>
    save.mutate(
      {
        id: point?.id ?? null,
        county,
        key: f.key.trim(),
        kind: f.kind,
        routes: f.routes,
        nameFi: f.nameFi.trim(),
        nameEn: orNull(f.nameEn),
        city: orNull(f.city),
        phone: orNull(f.phone),
        hours: orNull(f.hours),
        contactNote: orNull(f.contactNote),
        callback: fromTri(f.callback),
        walkIn: orNull(f.walkIn),
        digitalChannel: orNull(f.digitalChannel),
        digitalLogin: orNull(f.digitalLogin),
        serviceLanguages: textList(f.serviceLanguages),
        interpreterHow: orNull(f.interpreterHow),
        feeNote: orNull(f.feeNote),
        url: orNull(f.url),
        status: point?.status ?? 'draft',
        verifiedOn: point?.verifiedOn ?? null,
        sourceId: f.sourceId,
      },
      { onSuccess: () => !point && onClose() },
    )

  const error = save.error ?? status.error
  return (
    <EditDrawer
      opened
      title={point ? point.nameFi : 'New door'}
      onClose={onClose}
      onSave={onSave}
      saving={save.isPending}
      error={error ? adminErrorMessage(error) : null}
      statusActions={status.actions}
    >
      <TextField label="Key" description="Stable id within the area, kebab-case." value={f.key} onChange={set('key')} required />
      <SelectField label="Kind" options={KIND_OPTIONS} value={f.kind} onChange={(v) => v && set('kind')(v as PointKind)} required />
      <TextField label="Name (Finnish)" value={f.nameFi} onChange={set('nameFi')} required />
      <TextField label="Name (English)" value={f.nameEn} onChange={set('nameEn')} />
      <Stack gap="xs">
        <Text variant="label">Access routes this door serves</Text>
        <Row gap="md">
          {ROUTES.map((r) => (
            <CheckboxField key={r.code} label={r.label} checked={f.routes.includes(r.code)} onChange={(on) => toggleRoute(r.code, on)} />
          ))}
        </Row>
      </Stack>
      <TextField label="City" value={f.city} onChange={set('city')} />
      <TextField label="Phone" description="Organisation numbers only." type="tel" value={f.phone} onChange={set('phone')} />
      <TextField label="Hours" value={f.hours} onChange={set('hours')} />
      <TextAreaField
        label="Contact note"
        description="Routing quirks, e.g. one number for all stations."
        value={f.contactNote}
        onChange={set('contactNote')}
        rows={2}
      />
      <SelectField label="Callback" options={TRI_STATE} value={f.callback} onChange={(v) => set('callback')(v ?? 'unknown')} />
      <TextField label="Walk-in" description="Leave empty when unknown." value={f.walkIn} onChange={set('walkIn')} />
      <TextField label="Digital channel" value={f.digitalChannel} onChange={set('digitalChannel')} />
      <TextField label="Digital login" value={f.digitalLogin} onChange={set('digitalLogin')} />
      <TextField
        label="Service languages"
        description="Comma-separated codes, e.g. fi, sv, en."
        value={f.serviceLanguages}
        onChange={set('serviceLanguages')}
      />
      <TextAreaField
        label="How to get an interpreter"
        description="Leave empty when the area does not publish it."
        value={f.interpreterHow}
        onChange={set('interpreterHow')}
        rows={2}
      />
      <TextAreaField label="Fees" value={f.feeNote} onChange={set('feeNote')} rows={2} />
      <TextField label="Web page" type="url" value={f.url} onChange={set('url')} />
      <SourcePicker sources={sources} value={f.sourceId} onChange={set('sourceId')} />
    </EditDrawer>
  )
}
