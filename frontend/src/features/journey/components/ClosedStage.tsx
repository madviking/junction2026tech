import { OutcomeChooser } from '@/features/journey/components/OutcomeChooser'
import { OutcomeList } from '@/features/journey/components/OutcomeList'
import { StageQuestion } from '@/features/journey/components/StageQuestion'
import type { StageProps } from '@/features/journey/components/stageProps'
import { useT } from '@/shared/i18n'
import { Stack } from '@/shared/ui'

/** Closed: a short closing text and the reopen card. */
export function ClosedStage(props: StageProps) {
  const t = useT()
  return (
    <OutcomeChooser {...props}>
      {(choose) => (
        <Stack gap="lg">
          <StageQuestion text={t('ui.journey.closed.text')} textKey="ui.journey.closed.text" />
          <OutcomeList stage={props.view.stage.id} outcomes={props.view.outcomes} disabled={props.sending} onChoose={choose} />
        </Stack>
      )}
    </OutcomeChooser>
  )
}
