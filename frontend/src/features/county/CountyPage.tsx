import { IconRefresh } from '@tabler/icons-react'
import { useParams } from 'react-router'
import { useCounty } from '@/features/county/api/useCounty'
import { CountsTables } from '@/features/county/components/CountsTables'
import { FiguresGrid } from '@/features/county/components/FiguresGrid'
import { useContent } from '@/shared/i18n'
import { ActionButton, Banner, ErrorState, LoadingState, PageShell, Section, Stack, StatTile, SurfaceCard, Text } from '@/shared/ui'

function formatTime(iso: string, lang: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'medium' }).format(date)
}

/** /county/:id — public figures and anonymous Silta counts for one county (English). */
export function CountyPage() {
  const { id = 'helsinki' } = useParams()
  const { t, lang } = useContent()
  const county = useCounty(id)

  const refresh = (
    <ActionButton variant="subtle" icon={<IconRefresh size={20} aria-hidden="true" />} loading={county.isFetching} onPress={() => county.refetch()}>
      {t('ui.county.refresh')}
    </ActionButton>
  )

  return (
    <PageShell title={county.data?.name ?? t('ui.county.title')} headerAction={county.data && refresh}>
      <Stack gap="lg">
        {county.isPending && <LoadingState label={t('ui.county.loading')} />}
        {county.isError && (
          <ErrorState
            title={t('ui.county.error_title')}
            message={county.error.message}
            onRetry={() => county.refetch()}
            retryLabel={t('ui.county.retry')}
            retrying={county.isRefetching}
          />
        )}
        {county.data && (
          <>
            <Text variant="caption" tone="muted">
              {t('ui.county.generated', { time: formatTime(county.data.generatedAt, lang) })}
            </Text>
            <SurfaceCard>
              <Section title={t('ui.county.figures')} level={2}>
                <FiguresGrid figures={county.data.figures} />
              </Section>
            </SurfaceCard>
            <SurfaceCard>
              <Section title={t('ui.county.languages')} level={2}>
                <Stack as="ol" gap="xs">
                  {county.data.topLanguages.map((language) => (
                    <li key={language}>
                      <Text>{language}</Text>
                    </li>
                  ))}
                </Stack>
              </Section>
            </SurfaceCard>
            <SurfaceCard>
              <Section title={t('ui.county.counts')} level={2}>
                <Stack gap="lg">
                  <Banner tone="info" title={t('ui.county.privacy')} />
                  <StatTile label={t('ui.county.total')} value={county.data.counts.total} />
                  <CountsTables byStage={county.data.counts.byStage} byOutcome={county.data.counts.byOutcome} />
                </Stack>
              </Section>
            </SurfaceCard>
          </>
        )}
      </Stack>
    </PageShell>
  )
}
