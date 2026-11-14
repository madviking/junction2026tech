import { IconLanguage } from '@tabler/icons-react'
import type { ClinicianSummary } from '@/features/clinician/types'
import { useContent } from '@/shared/i18n'
import { Banner, Divider, Grid, IconText, Section, Stack, StatusBadge, SurfaceCard, Text } from '@/shared/ui'

export interface SummaryPanelProps {
  summary: ClinicianSummary
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate
  return new Intl.DateTimeFormat('fi', { dateStyle: 'long' }).format(new Date(year, month - 1, day))
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : new Intl.DateTimeFormat('fi', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap="xs">
      <Text variant="caption" tone="muted" as="h3">
        {label}
      </Text>
      <Text variant="label" as="p">
        {value}
      </Text>
    </Stack>
  )
}

/** Everything the doctor or nurse needs on one card, always in Finnish. */
export function SummaryPanel({ summary }: SummaryPanelProps) {
  const { t, has } = useContent()
  const langKey = `ui.clinician.lang.${summary.language.code}`
  const languageName = has(langKey) ? t(langKey) : summary.language.name
  const none = t('ui.clinician.none')

  return (
    <Stack gap="md">
      {summary.interpreter.needed ? (
        <Banner tone="warning" title={t('ui.clinician.interpreter_needed', { language: languageName })}>
          {t('ui.clinician.interpreter_text')}
        </Banner>
      ) : (
        <IconText icon={<IconLanguage size={20} aria-hidden="true" />} tone="muted">
          {`${t('ui.clinician.language')}: ${languageName}. ${t('ui.clinician.no_interpreter')}`}
        </IconText>
      )}

      {summary.flags.length > 0 && (
        <Stack gap="xs">
          <Text variant="caption" tone="muted" as="h2">
            {t('ui.clinician.flags')}
          </Text>
          <Stack as="ul" gap="xs">
            {summary.flags.map((flag) => (
              <li key={flag}>
                <StatusBadge tone="warning">{flag}</StatusBadge>
              </li>
            ))}
          </Stack>
        </Stack>
      )}

      <SurfaceCard>
        <Stack gap="md">
          <Grid min="sm" gap="md">
            <Field label={t('ui.clinician.code')} value={summary.code} />
            <Field label={t('ui.clinician.language')} value={languageName} />
            <Field label={t('ui.clinician.situation')} value={summary.situation ?? none} />
            <Field label={t('ui.clinician.symptoms')} value={summary.symptoms.length > 0 ? summary.symptoms.join(', ') : none} />
            <Field label={t('ui.clinician.route')} value={summary.route ? `${summary.route.name} — ${summary.route.door}` : none} />
            <Field label={t('ui.clinician.visit_date')} value={summary.visitDate ? formatDate(summary.visitDate) : none} />
          </Grid>
          <Divider />
          <Section title={t('ui.clinician.history')} level={3}>
            {summary.history.length === 0 ? (
              <Text tone="muted">{none}</Text>
            ) : (
              <Stack as="ol" gap="xs">
                {summary.history.map((item, index) => (
                  <li key={`${item.at}-${index}`}>
                    <Text>
                      <Text as="span" variant="caption" tone="muted">
                        {formatTime(item.at)}
                      </Text>{' '}
                      {item.text}
                    </Text>
                  </li>
                ))}
              </Stack>
            )}
          </Section>
        </Stack>
      </SurfaceCard>
    </Stack>
  )
}
