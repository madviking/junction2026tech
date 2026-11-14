import { CardAudioButton } from '@/features/voice'
import { useContent } from '@/shared/i18n'
import { Row, Stack, SurfaceCard, Text } from '@/shared/ui'

const TITLE = 'ui.journey.emergency.title'
const TEXT = 'ui.journey.emergency.text'
const signKey = (id: string) => `card.emergency.${id}`

export interface UrgentContentProps {
  /** Id for the title, so a dialog can be named by it. */
  titleId?: string
}

/**
 * What to do in an emergency: "Call 112 now", which signs need help right away, each line
 * with its listen button. The call link itself sits in the caller's bottom bar.
 */
export function UrgentContent({ titleId }: UrgentContentProps) {
  const { t, bundle } = useContent()
  return (
    <Stack gap="lg">
      <Stack gap="md">
        <Row gap="sm" align="center" justify="between" wrap={false}>
          <span id={titleId}>
            <Text variant="display" as="h2" tone="emergency">
              {t(TITLE)}
            </Text>
          </span>
          <CardAudioButton textKey={TITLE} />
        </Row>
        <Row gap="sm" align="center" justify="between" wrap={false}>
          <Text>{t(TEXT)}</Text>
          <CardAudioButton textKey={TEXT} />
        </Row>
      </Stack>
      <Stack gap="sm">
        {bundle.cards.emergencySigns.map((id) => (
          <div key={id}>
            <SurfaceCard padding="md">
              <Row gap="md" align="center" justify="between" wrap={false}>
                <Text variant="label">{t(signKey(id))}</Text>
                <CardAudioButton textKey={signKey(id)} />
              </Row>
            </SurfaceCard>
          </div>
        ))}
      </Stack>
    </Stack>
  )
}
