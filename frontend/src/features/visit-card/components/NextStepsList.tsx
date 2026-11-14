import { IconRefresh } from '@tabler/icons-react'
import type { VisitNextStep } from '@/features/visit-card/types'
import { CardAudioButton } from '@/features/voice'
import { useT } from '@/shared/i18n'
import { ActionButton, EmptyState, Row, Section, Stack, SurfaceCard, Text } from '@/shared/ui'

export interface NextStepsListProps {
  steps: VisitNextStep[]
  onRefresh: () => void
  refreshing: boolean
}

/** Next steps from the clinician's taps, each playable aloud. */
export function NextStepsList({ steps, onRefresh, refreshing }: NextStepsListProps) {
  const t = useT()
  return (
    <SurfaceCard>
      <Section
        title={t('ui.visit.next_title')}
        level={2}
        aside={
          <ActionButton variant="subtle" icon={<IconRefresh size={20} aria-hidden="true" />} loading={refreshing} onPress={onRefresh}>
            {t('ui.visit.refresh')}
          </ActionButton>
        }
      >
        {steps.length === 0 ? (
          <EmptyState title={t('ui.visit.next_empty')} description={t('ui.visit.next_empty_detail')} />
        ) : (
          <Stack as="ol" gap="sm">
            {steps.map((step) => (
              <SurfaceCard key={step.outcome} as="li" tone="muted" padding="sm">
                <Row gap="sm" align="start" wrap={false}>
                  <Text>{step.text}</Text>
                  <CardAudioButton textKey={`card.clinician.${step.outcome}.next`} label={t('ui.visit.listen')} />
                </Row>
              </SurfaceCard>
            ))}
          </Stack>
        )}
      </Section>
    </SurfaceCard>
  )
}
