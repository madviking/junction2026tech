import { useMemo } from 'react'
import { pathSteps } from '@/features/journey/pathSteps'
import type { VisitView } from '@/features/journey/types'
import { useContent } from '@/shared/i18n'
import { PageProgress } from '@/shared/ui'

/** Where the person is on their care path; the strip opens the whole path. Sits in the header of every stage. */
export function PathProgress({ view, onOpen, onBack }: { view: VisitView; onOpen: () => void; onBack?: () => void }) {
  const { t, has } = useContent()
  const backLabel = t('ui.journey.path.back_step')
  const back = useMemo(() => (onBack ? { label: backLabel, onPress: onBack } : undefined), [onBack, backLabel])
  const { steps, current } = pathSteps(view, t, has)
  if (steps.length === 0) return null
  return (
    <PageProgress
      value={current}
      total={steps.length}
      label={t('ui.journey.path.title')}
      status={t('ui.journey.path.step_of', { n: current, total: steps.length })}
      onPress={onOpen}
      back={back}
    />
  )
}
