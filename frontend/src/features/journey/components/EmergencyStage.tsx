import type { StageProps } from '@/features/journey/components/stageProps'
import { emergencySignKey } from '@/features/journey/keys'
import { CardAudioButton } from '@/features/voice'
import { useContent } from '@/shared/i18n'
import { Row, Stack, SurfaceCard, Text } from '@/shared/ui'

/**
 * Emergency: one screen, one action. The large call link to 112 is in the bottom bar
 * (JourneyScreen); this screen shows the emergency signs. No forms, no other choices.
 */
export function EmergencyStage(_props: StageProps) {
  const { t, bundle } = useContent()
  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Text variant="display" as="h2" tone="emergency">
          {t('ui.journey.emergency.title')}
        </Text>
        <Text>{t('ui.journey.emergency.text')}</Text>
      </Stack>
      <Stack gap="sm">
        {bundle.cards.emergencySigns.map((id) => (
          <div key={id}>
            <SurfaceCard padding="sm">
              <Row gap="sm" align="center" justify="between" wrap={false}>
                <Text variant="label">{t(emergencySignKey(id))}</Text>
                <CardAudioButton textKey={emergencySignKey(id)} />
              </Row>
            </SurfaceCard>
          </div>
        ))}
      </Stack>
    </Stack>
  )
}
