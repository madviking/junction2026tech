import { useMemo } from 'react'
import { OutcomeChooser } from '@/features/journey/components/OutcomeChooser'
import { OutcomeSection } from '@/features/journey/components/OutcomeSection'
import type { StageProps } from '@/features/journey/components/stageProps'
import { ladderKey } from '@/features/journey/keys'
import { CardAudioButton } from '@/features/voice'
import { useT } from '@/shared/i18n'
import { Stack, StepList, Text, type StepStatus } from '@/shared/ui'

/** Stalled: the escalation ladder (current rung highlighted) and the outcome cards. */
export function StalledStage(props: StageProps) {
  const t = useT()
  const { view } = props
  const ladder = view.ladder
  const statusLabels = useMemo(
    () => ({ done: t('ui.journey.step.done'), current: t('ui.journey.step.current'), upcoming: t('ui.journey.step.upcoming') }),
    [t],
  )
  const status = (i: number): StepStatus => (!ladder ? 'upcoming' : i < ladder.current ? 'done' : i === ladder.current ? 'current' : 'upcoming')

  return (
    <OutcomeChooser {...props}>
      {(choose) => (
        <Stack gap="lg">
          {ladder && ladder.rungs.length > 0 && (
            <Stack gap="sm">
              <Text variant="heading" as="h2">
                {t('ui.journey.stalled.ladder_title')}
              </Text>
              <StepList
                statusLabels={statusLabels}
                steps={ladder.rungs.map((rung, i) => ({
                  id: String(i),
                  title: rung,
                  detail: <CardAudioButton textKey={ladderKey(view.stage.id, i)} />,
                  status: status(i),
                }))}
              />
            </Stack>
          )}
          <OutcomeSection {...props} onChoose={choose} />
        </Stack>
      )}
    </OutcomeChooser>
  )
}
