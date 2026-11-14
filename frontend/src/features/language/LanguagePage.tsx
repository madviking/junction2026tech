import { useNavigate } from 'react-router'
import { useT, useContent } from '@/shared/i18n'
import { ChoiceCard, EmptyState, Grid, PageShell, Stack, Text } from '@/shared/ui'
import { UrgentHelp } from '@/features/urgent'

/** `/` — the shipped languages from the live content, each in its own name. Tapping starts the journey in it. */
export function LanguagePage() {
  const t = useT()
  const { bundle } = useContent()
  const navigate = useNavigate()
  const languages = bundle.languages

  return (
    <PageShell title={t('ui.language.title')} emergency={<UrgentHelp />}>
      <Stack gap="lg">
        <Text>{t('ui.language.intro')}</Text>
        {languages.length === 0 ? (
          <EmptyState title={t('ui.language.empty')} />
        ) : (
          <Grid min="xs" gap="sm">
            {languages.map((language) => (
              <ChoiceCard key={language.code} label={language.name} lang={language.code} onPress={() => navigate(`/r/${language.code}`)} />
            ))}
          </Grid>
        )}
      </Stack>
    </PageShell>
  )
}
