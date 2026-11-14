import { IconInfoCircle, IconShieldLock } from '@tabler/icons-react'
import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCreateVisit } from '@/features/journey/api/useVisit'
import { JourneyFrame } from '@/features/journey/components/JourneyFrame'
import { ResumeCode } from '@/features/journey/components/ResumeCode'
import { StageQuestion } from '@/features/journey/components/StageQuestion'
import { ScreeningEntryCard } from '@/features/screening'
import { CardAudioButton } from '@/features/voice'
import { useT } from '@/shared/i18n'
import { ActionButton, Banner, IconText, PageActions, Row, Stack, SurfaceCard, Text } from '@/shared/ui'

const WHAT_KEYS = ['ui.journey.start.what_1', 'ui.journey.start.what_2'] as const

/** /r/:lang — what Silta does, the privacy promise, Start (new anonymous visit) or resume with a code. */
export function JourneyStartPage() {
  const { lang = 'en' } = useParams()
  const t = useT()
  const navigate = useNavigate()
  const create = useCreateVisit()
  const open = (code: string) => navigate(`/r/${lang}/v/${code}`)
  const toLanguages = useCallback(() => navigate('/'), [navigate])

  return (
    <JourneyFrame onBack={toLanguages}>
      <StageQuestion text={t('ui.journey.start.title')} textKey="ui.journey.start.title" />
      {WHAT_KEYS.map((key) => (
        <Row key={key} gap="sm" align="center" justify="between" wrap={false}>
          <Text>{t(key)}</Text>
          <CardAudioButton textKey={key} />
        </Row>
      ))}
      <SurfaceCard tone="muted">
        <Stack gap="xs">
          <Row gap="sm" align="center" justify="between" wrap={false}>
            <IconText icon={<IconShieldLock size={22} aria-hidden="true" />} variant="label">
              {t('ui.journey.start.privacy_title')}
            </IconText>
            <CardAudioButton textKey="ui.journey.start.privacy_title" />
          </Row>
          <Row gap="sm" align="center" justify="between" wrap={false}>
            <Text>{t('ui.journey.start.privacy')}</Text>
            <CardAudioButton textKey="ui.journey.start.privacy" />
          </Row>
        </Stack>
      </SurfaceCard>
      {create.isError && <Banner tone="warning" title={t('ui.journey.start.error')} />}
      <ScreeningEntryCard lang={lang} />
      <ResumeCode onResume={open} />
      <ActionButton fullWidth variant="subtle" icon={<IconInfoCircle size={22} aria-hidden="true" />} onPress={() => navigate(`/r/${lang}/about`)}>
        {t('ui.about.title')}
      </ActionButton>
      <PageActions>
        <ActionButton fullWidth loading={create.isPending} onPress={() => create.mutate(lang, { onSuccess: (view) => open(view.code) })}>
          {t('ui.journey.start.button')}
        </ActionButton>
      </PageActions>
    </JourneyFrame>
  )
}
