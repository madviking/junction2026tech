import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { ActionButton, Stack, TextField } from '@/shared/ui'
import { normalizeVisitCode } from '@/shared/visitCode'

/** "I have a code": a code field that resumes the visit at its URL. */
export function ResumeCode({ onResume }: { onResume: (code: string) => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)

  if (!open) {
    return (
      <ActionButton fullWidth variant="secondary" onPress={() => setOpen(true)}>
        {t('ui.journey.start.have_code')}
      </ActionButton>
    )
  }

  const submit = () => {
    const code = normalizeVisitCode(value)
    if (code) onResume(code)
    else setInvalid(true)
  }

  return (
    <Stack gap="sm">
      <TextField
        label={t('ui.journey.start.code_label')}
        description={t('ui.journey.start.code_hint')}
        value={value}
        onChange={(v) => {
          setValue(v)
          setInvalid(false)
        }}
        error={invalid ? t('ui.journey.start.code_invalid') : undefined}
        autoComplete="off"
      />
      <ActionButton fullWidth variant="secondary" disabled={!value.trim()} onPress={submit}>
        {t('ui.journey.start.code_go')}
      </ActionButton>
    </Stack>
  )
}
