import { outcomeCards } from '@/features/journey/outcomeCards'
import { DefaultOutcomeCard } from '@/features/journey/components/DefaultOutcomeCard'
import type { OutcomeCard } from '@/features/journey/types'
import { Stack } from '@/shared/ui'

export interface OutcomeListProps {
  stage: string
  outcomes: OutcomeCard[]
  disabled: boolean
  onChoose: (outcomeId: string) => void
}

/** The stage's outcome cards; an outcome with an entry in `outcomeCards` gets its own card. */
export function OutcomeList({ stage, outcomes, disabled, onChoose }: OutcomeListProps) {
  return (
    <Stack gap="sm">
      {outcomes.map((outcome) => {
        const Card = outcomeCards[outcome.id] ?? DefaultOutcomeCard
        return <Card key={outcome.id} stage={stage} outcome={outcome} disabled={disabled} onChoose={() => onChoose(outcome.id)} />
      })}
    </Stack>
  )
}
