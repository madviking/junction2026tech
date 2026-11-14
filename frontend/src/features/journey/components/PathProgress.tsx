import { IconRoute } from '@tabler/icons-react'
import { pathSteps } from '@/features/journey/pathSteps'
import type { VisitView } from '@/features/journey/types'
import { useContent } from '@/shared/i18n'
import { ActionButton, LessonProgress, Stack } from '@/shared/ui'

/** Where the person is on their care path, and the way to the whole path. Top of every stage. */
export function PathProgress({ view, onOpen }: { view: VisitView; onOpen: () => void }) {
  const { t, has } = useContent()
  const { steps, current } = pathSteps(view, t, has)
  if (steps.length === 0) return null
  return (
    <Stack gap="xs">
      <LessonProgress value={current} total={steps.length} label={t('ui.journey.path.step_of', { n: current, total: steps.length })} />
      <ActionButton variant="subtle" fullWidth icon={<IconRoute size={22} aria-hidden="true" />} onPress={onOpen}>
        {t('ui.journey.path.title')}
      </ActionButton>
    </Stack>
  )
}
