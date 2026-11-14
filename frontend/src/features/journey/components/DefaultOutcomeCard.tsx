import { outcomeKey } from '@/features/journey/keys'
import type { OutcomeCardProps } from '@/features/journey/components/stageProps'
import { outcomeIcon } from '@/features/journey/outcomeVisuals'
import { CardAudioButton } from '@/features/voice'
import { ChoiceCard } from '@/shared/ui'

/** The default outcome card: its picture when it has one, the card text, its play button; one tap sends it. */
export function DefaultOutcomeCard({ stage, outcome, disabled, onChoose }: OutcomeCardProps) {
  const Picture = outcomeIcon(stage, outcome.id)
  return (
    <ChoiceCard
      label={outcome.text}
      icon={Picture && <Picture size={26} />}
      disabled={disabled}
      onPress={onChoose}
      trailing={<CardAudioButton textKey={outcomeKey(stage, outcome.id, 'card')} />}
    />
  )
}
