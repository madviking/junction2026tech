import { historyText } from '@/features/visit-card/historyText'
import type { VisitView } from '@/features/visit-card/types'
import { useContent } from '@/shared/i18n'
import { Banner, Divider, Section, Stack, SurfaceCard, Text } from '@/shared/ui'

export interface VisitSummaryProps {
  view: VisitView
}

function formatDate(isoDate: string, lang: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(year, month - 1, day))
  } catch {
    return isoDate
  }
}

function Field({ label, children }: { label: string; children: string }) {
  return (
    <Stack gap="xs">
      <Text variant="caption" tone="muted" as="h3">
        {label}
      </Text>
      <Text>{children}</Text>
    </Stack>
  )
}

/** The resident's own summary in their language: symptoms, door, date, what happened, interpreter. */
export function VisitSummary({ view }: VisitSummaryProps) {
  const { t, has, lang, bundle } = useContent()
  const symptoms = view.symptoms.filter((s) => s.selected).map((s) => s.text)
  const destination = view.carePath?.destination
  const languageName = bundle.languages.find((l) => l.code === view.lang)?.name ?? view.lang

  return (
    <Stack gap="md">
      {view.interpreterNeeded && (
        <Banner tone="info" title={t('ui.visit.interpreter_title')}>
          {t('ui.visit.interpreter_text', { language: languageName })}
        </Banner>
      )}
      <SurfaceCard>
        <Section title={t('ui.visit.summary_title')} level={2}>
          <Stack gap="md">
            <Field label={t('ui.visit.symptoms')}>{symptoms.length > 0 ? symptoms.join(', ') : t('ui.visit.not_yet')}</Field>
            <Field label={t('ui.visit.door')}>{destination ? destination.title : t('ui.visit.not_yet')}</Field>
            <Field label={t('ui.visit.visit_date')}>
              {view.state.visitDate ? formatDate(view.state.visitDate, lang) : t('ui.visit.no_date')}
            </Field>
            <Divider />
            <Stack gap="sm">
              <Text variant="label" as="h3">
                {t('ui.visit.history_title')}
              </Text>
              {view.history.length === 0 ? (
                <Text tone="muted">{t('ui.visit.history_empty')}</Text>
              ) : (
                <Stack as="ol" gap="xs">
                  {view.history.map((item, index) => (
                    <li key={`${item.at}-${index}`}>
                      <Text>
                        {item.actor === 'clinician' && item.stage === bundle.cards.clinicianStage ? `${t('ui.visit.by_clinician')}: ` : ''}
                        {historyText(item, t, has)}
                      </Text>
                    </li>
                  ))}
                </Stack>
              )}
            </Stack>
          </Stack>
        </Section>
      </SurfaceCard>
    </Stack>
  )
}
