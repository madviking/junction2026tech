import type { ClinicianAnswerCard } from '@/features/clinician/types'
import { useT } from '@/shared/i18n'
import { ChoiceCard, Stack } from '@/shared/ui'

export interface AnswerCardsProps {
  cards: ClinicianAnswerCard[]
  /** Outcomes chosen now and not yet sent. */
  chosen: ReadonlySet<string>
  onToggle: (outcome: string) => void
  disabled?: boolean
}

/** Multi-select answer cards. Cards already sent stay selected and locked (posting only adds). */
export function AnswerCards({ cards, chosen, onToggle, disabled }: AnswerCardsProps) {
  const t = useT()
  return (
    <Stack gap="sm">
      {cards.map((card) => (
        <ChoiceCard
          key={card.outcome}
          label={card.text}
          detail={card.selected ? t('ui.clinician.already_sent') : undefined}
          selected={card.selected || chosen.has(card.outcome)}
          disabled={card.selected || disabled}
          onPress={() => onToggle(card.outcome)}
        />
      ))}
    </Stack>
  )
}
