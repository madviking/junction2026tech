import { useState } from 'react'
import { MatchInput } from '@/features/journey/components/MatchInput'
import { StageQuestion } from '@/features/journey/components/StageQuestion'
import { symptomKey } from '@/features/journey/keys'
import type { MatchFn, SymptomOption } from '@/features/journey/types'
import { CardAudioButton } from '@/features/voice'
import { useContent } from '@/shared/i18n'
import { ActionButton, ChoiceCard, Stack, Text } from '@/shared/ui'

export interface SymptomPickerProps {
  symptoms: SymptomOption[]
  match: MatchFn
  sending: boolean
  onConfirm: (symptomIds: string[]) => void
  onCancel: () => void
}

/**
 * Multi-select symptom cards plus free text / voice. The server picks the lane from the
 * chosen cards; the client only sends their ids.
 */
export function SymptomPicker({ symptoms, match, sending, onConfirm, onCancel }: SymptomPickerProps) {
  const { t, has } = useContent()
  const [chosen, setChosen] = useState<string[]>(() => symptoms.filter((s) => s.selected).map((s) => s.id))
  const toggle = (id: string) => setChosen((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const add = (id: string) => setChosen((ids) => (ids.includes(id) ? ids : [...ids, id]))

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <StageQuestion text={t('ui.journey.symptom.title')} textKey="ui.journey.symptom.title" />
        <Text tone="muted">{t('ui.journey.symptom.hint')}</Text>
      </Stack>
      <MatchInput set="symptoms" match={match} onChosen={add} disabled={sending} />
      <Stack gap="sm">
        {symptoms.map((symptom) => {
          const detailKey = symptomKey(symptom.id, 'detail')
          return (
            <ChoiceCard
              key={symptom.id}
              label={symptom.text}
              detail={has(detailKey) ? t(detailKey) : undefined}
              selected={chosen.includes(symptom.id)}
              disabled={sending}
              onPress={() => toggle(symptom.id)}
              trailing={<CardAudioButton textKey={symptomKey(symptom.id, 'card')} />}
            />
          )
        })}
      </Stack>
      <Stack gap="sm">
        <ActionButton fullWidth loading={sending} disabled={chosen.length === 0} onPress={() => onConfirm(chosen)}>
          {t('ui.journey.symptom.confirm')}
        </ActionButton>
        <ActionButton fullWidth variant="subtle" disabled={sending} onPress={onCancel}>
          {t('ui.journey.symptom.cancel')}
        </ActionButton>
      </Stack>
    </Stack>
  )
}
