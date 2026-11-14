import type { StageProps } from '@/features/journey/components/stageProps'
import { emergencySignKey } from '@/features/journey/keys'
import { CardAudioButton } from '@/features/voice'
import { useContent } from '@/shared/i18n'
import { Banner, Row, Stack, SurfaceCard, Text } from '@/shared/ui'

/**
 * Emergency: one screen, one action. The call link to 112 is the PageShell emergency
 * slot; this screen only adds the emergency signs. No forms, no other choices.
 */
export function EmergencyStage(_props: StageProps) {
  const { t, bundle } = useContent()
  return (
    <Stack gap="lg">
      <Banner tone="emergency" title={t('ui.journey.emergency.title')}>
        {t('ui.journey.emergency.text')}
      </Banner>
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
