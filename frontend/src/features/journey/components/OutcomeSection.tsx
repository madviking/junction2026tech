import { MatchInput } from '@/features/journey/components/MatchInput'
import { OutcomeList } from '@/features/journey/components/OutcomeList'
import { StageQuestion } from '@/features/journey/components/StageQuestion'
import type { StageProps } from '@/features/journey/components/stageProps'
import { stageAskKey } from '@/features/journey/keys'
import { Stack } from '@/shared/ui'

export interface OutcomeSectionProps extends Pick<StageProps, 'view' | 'sending' | 'match'> {
  onChoose: (outcomeId: string) => void
  /** Small label above the question. */
  eyebrow?: string
  /** Outcome ids shown elsewhere on the screen. */
  exclude?: string[]
}

/** The stage question, its outcome cards and free text / voice for them. */
export function OutcomeSection({ view, sending, match, onChoose, eyebrow, exclude = [] }: OutcomeSectionProps) {
  const stage = view.stage.id
  const outcomes = view.outcomes.filter((o) => !exclude.includes(o.id))
  return (
    <Stack gap="md">
      {view.ask && <StageQuestion text={view.ask} textKey={stageAskKey(stage)} eyebrow={eyebrow} />}
      <OutcomeList stage={stage} outcomes={outcomes} disabled={sending} onChoose={onChoose} />
      {view.outcomes.length > 1 && <MatchInput set="outcomes" stage={stage} match={match} onChosen={onChoose} disabled={sending} />}
    </Stack>
  )
}
