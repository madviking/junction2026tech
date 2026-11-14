import { useState } from 'react'
import { adminErrorMessage } from '@/features/admin-auth'
import { useAddSource } from '@/features/admin-service-paths/api/servicePaths'
import { today } from '@/features/admin-service-paths/lib/format'
import type { SourceView } from '@/features/admin-service-paths/types'
import { ActionButton, Banner, Row, SelectField, Stack, TextField } from '@/shared/ui'

export interface SourcePickerProps {
  sources: SourceView[]
  value: number | null
  onChange: (id: number | null) => void
  required?: boolean
}

/** Pick an existing source or add a new one (https only); every fact cites one. */
export function SourcePicker({ sources, value, onChange, required }: SourcePickerProps) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({
    url: '',
    title: '',
    publisher: '',
    capturedOn: today(),
  })
  const add = useAddSource()
  const options = sources.map((s) => ({
    value: String(s.id),
    label: `${s.publisher}: ${s.title}`,
  }))

  const save = () =>
    add.mutate(
      {
        url: draft.url.trim(),
        title: draft.title.trim(),
        publisher: draft.publisher.trim(),
        capturedOn: draft.capturedOn,
        brainRef: null,
      },
      {
        onSuccess: (r) => {
          onChange((r as { id: number }).id)
          setAdding(false)
        },
      },
    )

  return (
    <Stack gap="sm">
      <SelectField
        label="Source"
        description="The page this fact was checked against."
        options={options}
        value={value === null ? null : String(value)}
        onChange={(v) => onChange(v ? Number(v) : null)}
        searchable
        clearable={!required}
        required={required}
      />
      {adding ? (
        <Stack gap="sm">
          <TextField label="URL" type="url" value={draft.url} onChange={(url) => setDraft({ ...draft, url })} required />
          <TextField label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} required />
          <TextField label="Publisher" value={draft.publisher} onChange={(publisher) => setDraft({ ...draft, publisher })} required />
          <TextField label="Captured on" type="date" value={draft.capturedOn} onChange={(capturedOn) => setDraft({ ...draft, capturedOn })} required />
          {add.isError && (
            <Banner tone="warning" title="Could not add the source">
              {adminErrorMessage(add.error)}
            </Banner>
          )}
          <Row gap="sm">
            <ActionButton compact loading={add.isPending} onPress={save}>
              Add source
            </ActionButton>
            <ActionButton compact variant="subtle" onPress={() => setAdding(false)}>
              Cancel
            </ActionButton>
          </Row>
        </Stack>
      ) : (
        <ActionButton compact variant="subtle" onPress={() => setAdding(true)}>
          New source
        </ActionButton>
      )}
    </Stack>
  )
}
