import { useNavigate } from 'react-router'
import { CodeLookupForm } from '@/features/clinician/components/CodeLookupForm'
import { useT } from '@/shared/i18n'
import { PageShell, Section, Stack, SurfaceCard, Text } from '@/shared/ui'

/** /clinic — the doctor or nurse types the visit code (Finnish). */
export function ClinicianLookupPage() {
  const t = useT()
  const navigate = useNavigate()
  return (
    <PageShell title={t('ui.clinician.lookup_title')}>
      <SurfaceCard>
        <Section title={t('ui.clinician.lookup_title')} description={t('ui.clinician.lookup_intro')} level={2}>
          <Stack gap="md">
            <CodeLookupForm onOpen={(code) => navigate(`/clinic/${code}`)} />
            <Text variant="caption" tone="muted">
              {t('ui.clinician.privacy')}
            </Text>
          </Stack>
        </Section>
      </SurfaceCard>
    </PageShell>
  )
}
