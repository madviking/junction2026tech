import { IconInfoCircle, IconMapPin, IconMessageLanguage, IconShieldLock } from '@tabler/icons-react'
import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCreateVisit } from '@/features/journey/api/useVisit'
import { JourneyFrame } from '@/features/journey/components/JourneyFrame'
import { ResumeCode } from '@/features/journey/components/ResumeCode'
import { LetterEntryCard } from '@/features/letter'
import { CardAudioButton, PageAudioButton } from '@/features/voice'
import { useT } from '@/shared/i18n'
import { ActionButton, Banner, ChoiceCard, ReadingMark, Row, Stack, SurfaceCard, Text } from '@/shared/ui'

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
 * then Start (new anonymous visit) as the one large main action right under it, and the
 * other ways in (photo of a letter, resume with a code, about) under "Other options".
 */
export function JourneyStartPage() {
  const { lang = 'en' } = useParams()
  const t = useT()
  const navigate = useNavigate()
  const create = useCreateVisit()
  const open = (code: string) => navigate(`/r/${lang}/v/${code}`)
  const toLanguages = useCallback(() => navigate('/'), [navigate])
  // The text the Listen button is reading now; its block is highlighted.
  const [reading, setReading] = useState<string | null>(null)
  const isReading = (...keys: string[]) => reading !== null && keys.includes(reading)

  return (
    <JourneyFrame onBack={toLanguages}>
      <Stack gap="md" align="start">
        <ReadingMark active={isReading('ui.journey.start.title')}>
          <Text variant="display" as="h2">
            {t('ui.journey.start.title')}
          </Text>
        </ReadingMark>
        <PageAudioButton textKeys={SPOKEN_KEYS} onReading={setReading} />
      </Stack>
      <SurfaceCard>
        <Stack gap="md">
          <ReadingMark active={isReading('ui.journey.start.what_1')}>
            <Row gap="md" align="start" wrap={false}>
              <IconMapPin size={24} aria-hidden="true" />
              <Text>{t('ui.journey.start.what_1')}</Text>
            </Row>
          </ReadingMark>
          <ReadingMark active={isReading('ui.journey.start.what_2')}>
            <Row gap="md" align="start" wrap={false}>
              <IconMessageLanguage size={24} aria-hidden="true" />
              <Text>{t('ui.journey.start.what_2')}</Text>
            </Row>
          </ReadingMark>
          <ReadingMark active={isReading('ui.journey.start.privacy_title', 'ui.journey.start.privacy')}>
            <Row gap="md" align="start" wrap={false}>
              <IconShieldLock size={24} aria-hidden="true" />
              <Stack gap="xs">
                <Text variant="label">{t('ui.journey.start.privacy_title')}</Text>
                <Text tone="muted">{t('ui.journey.start.privacy')}</Text>
              </Stack>
            </Row>
          </ReadingMark>
        </Stack>
      </SurfaceCard>
      {create.isError && <Banner tone="warning" title={t('ui.journey.start.error')} />}
      <ActionButton fullWidth large loading={create.isPending} onPress={() => create.mutate(lang, { onSuccess: (view) => open(view.code) })}>
        {t('ui.journey.start.button')}
      </ActionButton>
      <Stack gap="sm">
        <Row gap="sm" align="center" justify="between" wrap={false}>
          <Text variant="heading" as="h3">
            {t('ui.journey.start.other_options')}
          </Text>
          <CardAudioButton textKey="ui.journey.start.other_options" />
        </Row>
        <LetterEntryCard lang={lang} />
        <ResumeCode onResume={open} />
        <ChoiceCard label={t('ui.about.title')} icon={<IconInfoCircle size={26} />} onPress={() => navigate(`/r/${lang}/about`)} />
      </Stack>
    </JourneyFrame>
  )
}
