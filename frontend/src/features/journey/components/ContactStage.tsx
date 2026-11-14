import { OutcomeChooser } from '@/features/journey/components/OutcomeChooser'
import { OutcomeSection } from '@/features/journey/components/OutcomeSection'
import { StageCards } from '@/features/journey/components/StageCards'
import type { StageProps } from '@/features/journey/components/stageProps'
import { clockLabelKey, routeNoteKey, scriptKey } from '@/features/journey/keys'
import { CardAudioButton } from '@/features/voice'
import { useContent } from '@/shared/i18n'
import { DirectionScope, Divider, Row, Section, Stack, StatusBadge, SurfaceCard, Text, type Tone } from '@/shared/ui'

const BASIS_TONE: Record<string, Tone> = { legal: 'info', recommended: 'neutral', open: 'warning' }

/** The door screen: where to go, the Finnish call script with its meaning, the clocks, then "What happened?". */
export function ContactStage(props: StageProps) {
  const { t, has } = useContent()
  const path = props.view.carePath
  if (!path) return <StageCards {...props} />

  const { destination } = path
  const script = scriptKey(path.lane, path.route, has)

  return (
    <OutcomeChooser {...props}>
      {(choose) => (
        <Stack gap="lg">
          <Section title={destination.title} description={t('ui.journey.contact.door', { door: destination.door })}>
            {destination.note && (
              <Row gap="sm" align="center" justify="between" wrap={false}>
                <Text tone="muted">{destination.note}</Text>
                {has(routeNoteKey(path.route)) && <CardAudioButton textKey={routeNoteKey(path.route)} />}
              </Row>
            )}
          </Section>

          <SurfaceCard>
            <Stack gap="md">
              <Row gap="sm" align="center" justify="between" wrap={false}>
                <Text variant="caption" eyebrow>
                  {t('ui.journey.contact.script_title')}
                </Text>
                <CardAudioButton textKey={script} lang="fi" label={t('ui.journey.contact.play_fi')} />
              </Row>
              <DirectionScope dir="ltr" lang="fi">
                <Text variant="title" as="p">
                  {destination.scriptFi}
                </Text>
              </DirectionScope>
              <Divider />
              <Row gap="sm" align="center" justify="between" wrap={false}>
                <Stack gap="xs">
                  <Text variant="caption" eyebrow>
                    {t('ui.journey.contact.script_meaning')}
                  </Text>
                  <Text>{destination.scriptLocal}</Text>
                </Stack>
                <CardAudioButton textKey={script} />
              </Row>
            </Stack>
          </SurfaceCard>

          {path.clocks.length > 0 && (
            <Stack gap="sm">
              <Text variant="heading" as="h3">
                {t('ui.journey.contact.clocks_title')}
              </Text>
              <Stack gap="xs">
                {path.clocks.map((clock, i) => {
                  const labelKey = clockLabelKey(path.lane, path.route, i, clock.label, has, t)
                  return (
                    <div key={`${clock.label}-${clock.limit}`}>
                      <SurfaceCard padding="sm">
                        <Row gap="sm" align="center" justify="between" wrap={false}>
                          <Stack gap="xs">
                            <Text variant="label">{clock.label}</Text>
                            <Text tone="muted">{clock.limit}</Text>
                            <Row gap="sm">
                              <StatusBadge tone={BASIS_TONE[clock.basis] ?? 'neutral'}>{t(`ui.journey.basis.${clock.basis}`)}</StatusBadge>
                            </Row>
                          </Stack>
                          {labelKey && <CardAudioButton textKey={labelKey} />}
                        </Row>
                      </SurfaceCard>
                    </div>
                  )
                })}
              </Stack>
            </Stack>
          )}

          <OutcomeSection {...props} onChoose={choose} eyebrow={t('ui.journey.contact.what_happened')} />
        </Stack>
      )}
    </OutcomeChooser>
  )
}
