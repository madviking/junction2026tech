import { IconArrowBackUp, IconInfoCircle, IconRestore } from '@tabler/icons-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { ClockList } from '@/features/journey/components/ClockList'
import { pathSteps } from '@/features/journey/pathSteps'
import type { VisitView } from '@/features/journey/types'
import { useContent } from '@/shared/i18n'
import { ActionButton, PageActions, Stack, StepList, Text } from '@/shared/ui'

export interface PathOverviewProps {
  view: VisitView
  /** In-app path of the about page. */
  aboutPath: string
  sending: boolean
  onClose: () => void
  /** Undo the last answer (shown when the visit can go back). */
  onBackStep: () => void
  /** Leave this visit for the start screen. */
  onRestart: () => void
}

/**
 * The whole care path on one screen: every step with "you are here", the door, the time
 * limits and the visit code. Extra information, one tap from any stage; changes nothing.
 */
export function PathOverview({ view, aboutPath, sending, onClose, onBackStep, onRestart }: PathOverviewProps) {
  const { t, has } = useContent()
  const navigate = useNavigate()
  const { steps } = pathSteps(view, t, has)
  const statusLabels = useMemo(
    () => ({ done: t('ui.journey.step.done'), current: t('ui.journey.step.current'), upcoming: t('ui.journey.step.upcoming') }),
    [t],
  )
  const path = view.carePath
  return (
    <Stack gap="lg">
      <Text variant="title" as="h2">
        {t('ui.journey.path.title')}
      </Text>
      <StepList statusLabels={statusLabels} steps={steps.map((s) => ({ id: s.id, title: s.text, status: s.status }))} />
      <Stack gap="sm">
        {view.canGoBack && (
          <ActionButton variant="secondary" fullWidth disabled={sending} icon={<IconArrowBackUp size={22} aria-hidden="true" />} onPress={onBackStep}>
            {t('ui.journey.path.back_step')}
          </ActionButton>
        )}
        <ActionButton variant="secondary" fullWidth disabled={sending} icon={<IconRestore size={22} aria-hidden="true" />} onPress={onRestart}>
          {t('ui.journey.path.restart')}
        </ActionButton>
      </Stack>
      {path && path.clocks.length > 0 && (
        <Stack gap="sm">
          <Text variant="heading" as="h3">
            {t('ui.journey.contact.clocks_title')}
          </Text>
          <ClockList path={path} />
        </Stack>
      )}
      <Stack gap="xs">
        <Text variant="label">{t('ui.journey.your_code', { code: view.code })}</Text>
        <Text variant="caption" tone="muted">
          {t('ui.journey.save_code')}
        </Text>
      </Stack>
      <ActionButton variant="subtle" fullWidth onPress={() => navigate(aboutPath)} icon={<IconInfoCircle size={22} aria-hidden="true" />}>
        {t('ui.about.title')}
      </ActionButton>
      <PageActions>
        <ActionButton fullWidth onPress={onClose}>
          {t('ui.journey.path.close')}
        </ActionButton>
      </PageActions>
    </Stack>
  )
}
