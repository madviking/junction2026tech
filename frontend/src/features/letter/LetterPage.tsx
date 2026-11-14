import { IconCamera, IconPhoto, IconShieldLock, IconSun, IconViewfinder } from '@tabler/icons-react'
import { useNavigate, useParams } from 'react-router'
import { useExplainLetter } from '@/features/letter/api/useExplainLetter'
import { LetterResult } from '@/features/letter/components/LetterResult'
import { ScreeningEntryCard } from '@/features/screening'
import { useT } from '@/shared/i18n'
import { ActionButton, Banner, ErrorState, LoadingState, PageActions, PageShell, PhotoButton, Row, Stack, SurfaceCard, Text } from '@/shared/ui'

/**
 * `/r/:lang/letter` — "I got a letter": take a photo of it → what it is, the facts in it and
 * what to do, in the page language (POST /api/letters/explain). The photo and the result
 * live only in this page's memory; leaving the page drops them.
 */
export function LetterPage() {
  const { lang = 'en' } = useParams()
  const t = useT()
  const navigate = useNavigate()
  const explain = useExplainLetter()
  const send = (file: File) => explain.mutate({ lang, file })
  const home = () => navigate(`/r/${lang}`)
  const letter = explain.data
  const failed = explain.variables

  const photoButtons = (
    <Stack gap="sm">
      <PhotoButton camera fullWidth icon={<IconCamera size={20} />} onPhoto={send}>
        {t('ui.letter.take_photo')}
      </PhotoButton>
      <PhotoButton variant="secondary" fullWidth icon={<IconPhoto size={20} />} onPhoto={send}>
        {t('ui.letter.choose_photo')}
      </PhotoButton>
    </Stack>
  )

  let body
  if (explain.isPending) {
    body = <LoadingState label={t('ui.letter.reading')} />
  } else if (explain.isError) {
    body = (
      <ErrorState
        title={t('ui.letter.error_title')}
        message={t('ui.letter.error_text')}
        retryLabel={t('ui.letter.retry')}
        onRetry={failed ? () => explain.mutate(failed) : undefined}
      />
    )
  } else if (letter?.status === 'explained') {
    body = (
      <>
        <LetterResult letter={letter} onOpenGuide={(guide) => navigate(`/r/${lang}/learn/${guide}?via=letter-photo`)} />
        <PageActions>
          <Stack gap="sm">
            <PhotoButton camera variant="secondary" fullWidth icon={<IconCamera size={20} />} onPhoto={send}>
              {t('ui.letter.again')}
            </PhotoButton>
            <ActionButton variant="subtle" fullWidth onPress={home}>
              {t('ui.letter.done')}
            </ActionButton>
          </Stack>
        </PageActions>
      </>
    )
  } else {
    body = (
      <>
        {letter?.status === 'unreadable' ? (
          <Banner tone="warning" title={t('ui.letter.unreadable_title')}>
            {t('ui.letter.unreadable_text')}
          </Banner>
        ) : (
          <Text>{t('ui.letter.intro')}</Text>
        )}
        <SurfaceCard>
          <Stack gap="md">
            <Row gap="md" align="start" wrap={false}>
              <IconSun size={24} aria-hidden="true" />
              <Text>{t('ui.letter.tip_light')}</Text>
            </Row>
            <Row gap="md" align="start" wrap={false}>
              <IconViewfinder size={24} aria-hidden="true" />
              <Text>{t('ui.letter.tip_page')}</Text>
            </Row>
            <Row gap="md" align="start" wrap={false}>
              <IconShieldLock size={24} aria-hidden="true" />
              <Stack gap="xs">
                <Text variant="label">{t('ui.letter.privacy_title')}</Text>
                <Text tone="muted">{t('ui.letter.privacy')}</Text>
              </Stack>
            </Row>
          </Stack>
        </SurfaceCard>
        <Stack gap="sm">
          <Text variant="label">{t('ui.letter.other_title')}</Text>
          <ScreeningEntryCard lang={lang} />
        </Stack>
        <PageActions>{photoButtons}</PageActions>
      </>
    )
  }

  return (
    <PageShell title={t('ui.letter.title')} back={{ label: t('ui.letter.done'), onPress: home }}>
      <Stack gap="lg">{body}</Stack>
    </PageShell>
  )
}
