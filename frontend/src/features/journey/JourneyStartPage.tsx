import { IconInfoCircle, IconMapPin, IconMessageLanguage, IconShieldLock } from '@tabler/icons-react'
import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCreateVisit } from '@/features/journey/api/useVisit'
import { JourneyFrame } from '@/features/journey/components/JourneyFrame'
import { ResumeCode } from '@/features/journey/components/ResumeCode'
import { ScreeningEntryCard } from '@/features/screening'
import { PageAudioButton } from '@/features/voice'
import { useT } from '@/shared/i18n'
import { ActionButton, Banner, ChoiceCard, PageActions, Row, Stack, SurfaceCard, Text } from '@/shared/ui'

/** Everything the screen says, in reading order, for the one "Listen" button. */
const SPOKEN_KEYS = [
  'ui.journey.start.title',
  'ui.journey.start.what_1',
  'ui.journey.start.what_2',
  'ui.journey.start.privacy_title',
  'ui.journey.start.privacy',
] as const

/**
 * /r/:lang — what Silta does and the privacy promise in one card with one "Listen" button,
 * the other ways in (screening letter, resume with a code, about), and Start (new anonymous
 * visit) in the bottom bar.
 */
export function JourneyStartPage() {
  const { lang = 'en' } = useParams()
  const t = useT()
  const navigate = useNavigate()
  const create = useCreateVisit()
  const open = (code: string) => navigate(`/r/${lang}/v/${code}`)
  const toLanguages = useCallback(() => navigate('/'), [navigate])

  return (
    <JourneyFrame onBack={toLanguages}>
      <Stack gap="md" align="start">
        <Text variant="display" as="h2">
          {t('ui.journey.start.title')}
        </Text>
        <PageAudioButton textKeys={SPOKEN_KEYS} />
      </Stack>
      <SurfaceCard>
        <Stack gap="md">
          <Row gap="md" align="start" wrap={false}>
            <IconMapPin size={24} aria-hidden="true" />
            <Text>{t('ui.journey.start.what_1')}</Text>
          </Row>
          <Row gap="md" align="start" wrap={false}>
            <IconMessageLanguage size={24} aria-hidden="true" />
            <Text>{t('ui.journey.start.what_2')}</Text>
          </Row>
          <Row gap="md" align="start" wrap={false}>
            <IconShieldLock size={24} aria-hidden="true" />
            <Stack gap="xs">
              <Text variant="label">{t('ui.journey.start.privacy_title')}</Text>
              <Text tone="muted">{t('ui.journey.start.privacy')}</Text>
            </Stack>
          </Row>
        </Stack>
      </SurfaceCard>
      {create.isError && <Banner tone="warning" title={t('ui.journey.start.error')} />}
      <Stack gap="sm">
        <ScreeningEntryCard lang={lang} />
        <ResumeCode onResume={open} />
        <ChoiceCard label={t('ui.about.title')} icon={<IconInfoCircle size={26} />} onPress={() => navigate(`/r/${lang}/about`)} />
      </Stack>
      <PageActions>
        <ActionButton fullWidth loading={create.isPending} onPress={() => create.mutate(lang, { onSuccess: (view) => open(view.code) })}>
          {t('ui.journey.start.button')}
        </ActionButton>
      </PageActions>
    </JourneyFrame>
  )
}
