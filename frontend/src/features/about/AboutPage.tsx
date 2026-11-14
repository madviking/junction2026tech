import { IconBan, IconBook2, IconHeartHandshake, IconMessageChatbot, IconShieldLock, IconUsersGroup } from '@tabler/icons-react'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useT } from '@/shared/i18n'
import { PageShell, Row, Stack, SurfaceCard, Text } from '@/shared/ui'
import { UrgentHelp } from '@/features/urgent'

/** One section per trust question; texts are `ui.about.<id>.title|text`. */
const SECTIONS = [
  { id: 'what', Icon: IconHeartHandshake },
  { id: 'not', Icon: IconBan },
  { id: 'privacy', Icon: IconShieldLock },
  { id: 'words', Icon: IconMessageChatbot },
  { id: 'facts', Icon: IconBook2 },
  { id: 'who', Icon: IconUsersGroup },
] as const

/** /r/:lang/about — what Silta is, what it is not, and why its answers can be trusted. */
export function AboutPage() {
  const { lang = 'en' } = useParams()
  const t = useT()
  const navigate = useNavigate()
  const backLabel = t('ui.about.back')
  // Back to where the person came from (start screen or their visit); the start screen on a direct link.
  const back = useMemo(
    () => ({ label: backLabel, onPress: () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(`/r/${lang}`)) }),
    [backLabel, navigate, lang],
  )

  return (
    <PageShell title={t('ui.about.title')} back={back} emergency={<UrgentHelp />}>
      <Stack gap="md">
        {SECTIONS.map(({ id, Icon }) => (
          <SurfaceCard key={id} as="section">
            <Stack gap="xs">
              <Row gap="sm" wrap={false}>
                <Icon size={24} aria-hidden="true" />
                <Text variant="heading" as="h2">
                  {t(`ui.about.${id}.title`)}
                </Text>
              </Row>
              <Text>{t(`ui.about.${id}.text`)}</Text>
            </Stack>
          </SurfaceCard>
        ))}
      </Stack>
    </PageShell>
  )
}
