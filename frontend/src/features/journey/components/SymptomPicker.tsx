import { useState } from 'react'
import { MatchInput } from '@/features/journey/components/MatchInput'
import { StageQuestion } from '@/features/journey/components/StageQuestion'
import { SymptomBodyPicker } from '@/features/journey/components/SymptomBodyPicker'
import { durationKey, symptomKey } from '@/features/journey/keys'
import { useSubStepBack } from '@/features/journey/subStepBack'
import type { MatchFn, SymptomOption } from '@/features/journey/types'
import { CardAudioButton } from '@/features/voice'
import { useContent } from '@/shared/i18n'
import { ActionButton, ChoiceCard, PageActions, Stack, Text } from '@/shared/ui'

export interface SymptomPickerProps {
  symptoms: SymptomOption[]
  /** How long the symptoms have lasted: closed choices from the server (optional to answer). */
  durations: SymptomOption[]
  match: MatchFn
  sending: boolean
  onConfirm: (symptomIds: string[], duration: string | null) => void
  onCancel: () => void
}

/**
 * Multi-select symptom cards plus free text / voice, then, after Continue, an optional
 * "how long" step that the call script says. The server picks the lane from the
 * chosen cards; the client only sends ids. The duration never changes the lane.
 */
export function SymptomPicker({ symptoms, durations, match, sending, onConfirm, onCancel }: SymptomPickerProps) {
  const { t, has } = useContent()
  const [chosen, setChosen] = useState<string[]>(() => symptoms.filter((s) => s.selected).map((s) => s.id))
  const toggle = (id: string) => setChosen((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const add = (id: string) => setChosen((ids) => (ids.includes(id) ? ids : [...ids, id]))
  const [duration, setDuration] = useState<string | null>(() => durations.find((d) => d.selected)?.id ?? null)
  // Pictures (body map + picture cards) first, for people who struggle with written text.
  const [view, setView] = useState<'pictures' | 'list'>('pictures')
  // "How long?" is its own short step after the cards, so the screen never grows under the person.
  const [step, setStep] = useState<'cards' | 'duration'>('cards')
  // Back: "how long" → the cards → the stage question. In a journey screen the header arrow does it.
  const inHeader = useSubStepBack(sending ? undefined : step === 'duration' ? () => setStep('cards') : onCancel)
  const freeText = <MatchInput set="symptoms" match={match} onChosen={add} disabled={sending} />

  if (step === 'duration') {
    return (
      <Stack gap="lg">
        <StageQuestion text={t('ui.journey.duration.title')} textKey="ui.journey.duration.title" />
        <Stack gap="sm">
          {durations.map((d) => (
            <ChoiceCard
              key={d.id}
              label={d.text}
              selected={duration === d.id}
              disabled={sending}
              onPress={() => setDuration((cur) => (cur === d.id ? null : d.id))}
              trailing={<CardAudioButton textKey={durationKey(d.id)} />}
            />
          ))}
        </Stack>
        {!inHeader && (
          <ActionButton fullWidth variant="subtle" disabled={sending} onPress={() => setStep('cards')}>
            {t('ui.journey.back')}
          </ActionButton>
        )}
        <PageActions>
          <ActionButton fullWidth loading={sending} onPress={() => onConfirm(chosen, duration)}>
            {t('ui.journey.symptom.confirm')}
          </ActionButton>
        </PageActions>
      </Stack>
    )
  }

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <StageQuestion text={t('ui.journey.symptom.title')} textKey="ui.journey.symptom.title" />
        <Text tone="muted">{t('ui.journey.symptom.hint')}</Text>
      </Stack>
      {view === 'pictures' ? (
        <SymptomBodyPicker symptoms={symptoms} chosen={chosen} disabled={sending} onToggle={toggle} />
      ) : (
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
      )}
      {freeText}
      <Stack gap="xs">
        <ActionButton fullWidth variant="subtle" disabled={sending} onPress={() => setView(view === 'pictures' ? 'list' : 'pictures')}>
          {t(view === 'pictures' ? 'ui.journey.body.show_list' : 'ui.journey.body.show_pictures')}
        </ActionButton>
        {!inHeader && (
          <ActionButton fullWidth variant="subtle" disabled={sending} onPress={onCancel}>
            {t('ui.journey.symptom.cancel')}
          </ActionButton>
        )}
      </Stack>
      <PageActions>
        <ActionButton
          fullWidth
          loading={sending}
          disabled={chosen.length === 0}
          onPress={() => (durations.length > 0 ? setStep('duration') : onConfirm(chosen, null))}
        >
          {t('ui.journey.symptom.confirm')}
        </ActionButton>
      </PageActions>
    </Stack>
  )
}
