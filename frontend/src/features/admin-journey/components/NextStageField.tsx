import { useMemo } from 'react'
import { SelectField, Stack, TextField } from '@/shared/ui'
import { OTHER_STAGE, type NextStageValue } from '@/features/admin-journey/lib/nextStage'

export interface NextStageFieldProps {
  stageIds: string[]
  value: NextStageValue
  onChange: (value: NextStageValue) => void
  error?: string | null
}

/** "Leads to": one of the stages, or another id (publish refuses it until that stage exists). */
export function NextStageField({ stageIds, value, onChange, error }: NextStageFieldProps) {
  const options = useMemo(
    () => [...stageIds.map((id) => ({ value: id, label: id })), { value: OTHER_STAGE, label: 'Another id (not a stage yet)' }],
    [stageIds],
  )
  return (
    <Stack gap="sm">
      <SelectField
        label="Leads to (next stage)"
        options={options}
        value={value.choice}
        onChange={(choice) => onChange({ ...value, choice })}
        error={value.choice === null ? error : null}
        required
      />
      {value.choice === OTHER_STAGE && (
        <TextField
          label="Next stage id"
          description="Publishing is refused until a stage with this id exists."
          value={value.other}
          onChange={(other) => onChange({ ...value, other })}
          error={error}
          required
        />
      )}
    </Stack>
  )
}
