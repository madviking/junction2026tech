import { OutcomeChooser } from '@/features/journey/components/OutcomeChooser'
import { OutcomeSection } from '@/features/journey/components/OutcomeSection'
import type { StageProps } from '@/features/journey/components/stageProps'

/** Default stage screen: the question and the outcome cards. Any stage without a registry entry uses it. */
export function StageCards(props: StageProps) {
  return <OutcomeChooser {...props}>{(choose) => <OutcomeSection {...props} onChoose={choose} />}</OutcomeChooser>
}
