import { IconLanguage } from '@tabler/icons-react'
import { useNavigate } from 'react-router'
import { useT, useContent } from '@/shared/i18n'
import { ChoiceCard, EmergencyCallLink, EmptyState, PageShell, Stack, Text } from '@/shared/ui'

/** `/` — the shipped languages from the live content, each in its own name. Tapping starts the journey in it. */
export function LanguagePage() {
  const t = useT()
  const { bundle } = useContent()
  const navigate = useNavigate()
  const languages = bundle.languages

  return (
    <PageShell title={t('ui.language.title')} emergency={<EmergencyCallLink label={t('ui.language.emergency_call')} phoneNumber="112" />}>
      <Stack gap="lg">
        <Text>{t('ui.language.intro')}</Text>
        {languages.length === 0 ? (
          <EmptyState title={t('ui.language.empty')} />
        ) : (
          <Stack gap="sm">
            {languages.map((language) => (
              <ChoiceCard
                key={language.code}
                label={language.name}
                lang={language.code}
                icon={<IconLanguage size={24} />}
                detail={language.placeholder ? t('ui.language.unchecked') : undefined}
                onPress={() => navigate(`/r/${language.code}`)}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </PageShell>
  )
}
