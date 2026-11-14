import { IconArrowRight } from '@tabler/icons-react'
import { useState } from 'react'
import { normalizeVisitCode as normalizeCode } from '@/shared/visitCode'
import { useT } from '@/shared/i18n'
import { ActionButton, Stack, TextField } from '@/shared/ui'

export interface CodeLookupFormProps {
  onOpen: (canonicalCode: string) => void
}

/** Visit-code input that accepts sloppy typing and hands back the canonical code. */
export function CodeLookupForm({ onOpen }: CodeLookupFormProps) {
  const t = useT()
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)

  const submit = () => {
    const code = normalizeCode(value)
    if (!code) {
      setInvalid(true)
      return
    }
    onOpen(code)
  }

  return (
    <Stack gap="md">
      <TextField
        label={t('ui.clinician.code_field')}
        placeholder="SLT-XXXX-XXXX"
        autoComplete="off"
        value={value}
        onChange={(next) => {
          setValue(next)
          setInvalid(false)
        }}
        error={invalid ? t('ui.clinician.invalid_code') : undefined}
      />
      <ActionButton fullWidth icon={<IconArrowRight size={20} aria-hidden="true" />} onPress={submit}>
        {t('ui.clinician.open')}
      </ActionButton>
    </Stack>
  )
}
