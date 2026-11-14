import { outcomeKey } from '@/features/journey/keys'
import type { OutcomeCardProps } from '@/features/journey/components/stageProps'
import { CardAudioButton } from '@/features/voice'
import { ChoiceCard } from '@/shared/ui'

/** The default outcome card: the card text, its play button, one tap sends it. */
export function DefaultOutcomeCard({ stage, outcome, disabled, onChoose }: OutcomeCardProps) {
  return (
    <ChoiceCard
      label={outcome.text}
      disabled={disabled}
      onPress={onChoose}
      trailing={<CardAudioButton textKey={outcomeKey(stage, outcome.id, 'card')} />}
    />
  )
}
