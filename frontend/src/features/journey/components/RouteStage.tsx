import { OutcomeChooser } from '@/features/journey/components/OutcomeChooser'
import { OutcomeList } from '@/features/journey/components/OutcomeList'
import { RouteChoices } from '@/features/journey/components/RouteChoices'
import { StageQuestion } from '@/features/journey/components/StageQuestion'
import type { StageProps } from '@/features/journey/components/stageProps'
import { stageAskKey } from '@/features/journey/keys'
import { Stack } from '@/shared/ui'

/** Route stage: the route questions as guidance, the route cards, then the other outcomes ("not sure"). */
export function RouteStage(props: StageProps) {
  const { view, send, sending, match } = props
  const routeOutcome = view.stage.outcomes.find((o) => o.sets === 'route')?.id
  const others = view.outcomes.filter((o) => o.id !== routeOutcome)
  return (
    <OutcomeChooser {...props}>
      {(choose) => (
        <Stack gap="lg">
          {view.ask && <StageQuestion text={view.ask} textKey={stageAskKey(view.stage.id)} />}
          {routeOutcome && <RouteChoices match={match} disabled={sending} onRoute={(route) => send({ outcome: routeOutcome, route })} />}
          <OutcomeList stage={view.stage.id} outcomes={others} disabled={sending} onChoose={choose} />
        </Stack>
      )}
    </OutcomeChooser>
  )
}
