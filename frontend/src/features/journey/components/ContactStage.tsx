import { IconClock } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { CallScript } from '@/features/journey/components/CallScript'
import { ClockList } from '@/features/journey/components/ClockList'
import { OutcomeChooser } from '@/features/journey/components/OutcomeChooser'
import { OutcomeSection } from '@/features/journey/components/OutcomeSection'
import { StageCards } from '@/features/journey/components/StageCards'
import type { StageProps } from '@/features/journey/components/stageProps'
import { routeNoteKey } from '@/features/journey/keys'
import { CardAudioButton } from '@/features/voice'
import { useContent } from '@/shared/i18n'
import { ActionButton, FaqItem, PageActions, Row, Section, Stack, Text } from '@/shared/ui'

/**
 * The door screen: where to go and the Finnish call script; the time limits and "they may
 * ask you" open on tap. "I contacted them" stays at the bottom of the screen and leads to
 * "What happened?" with the outcome cards.
 */
export function ContactStage(props: StageProps) {
  const { t, has } = useContent()
  const [asking, setAsking] = useState(false)
  const path = props.view.carePath

  useEffect(() => {
    document.documentElement.scrollTop = 0
  }, [asking])

  if (!path) return <StageCards {...props} />

  const { destination } = path

  return (
    <OutcomeChooser {...props}>
      {(choose) =>
        asking ? (
          <Stack gap="lg">
            <OutcomeSection {...props} onChoose={choose} eyebrow={t('ui.journey.contact.what_happened')} />
            <ActionButton fullWidth variant="subtle" disabled={props.sending} onPress={() => setAsking(false)}>
              {t('ui.journey.back')}
            </ActionButton>
          </Stack>
        ) : (
          <Stack gap="lg">
            <Section title={destination.title} description={t('ui.journey.contact.door', { door: destination.door })}>
              {destination.note && (
                <Row gap="sm" align="center" justify="between" wrap={false}>
                  <Text tone="muted">{destination.note}</Text>
                  {has(routeNoteKey(path.route)) && <CardAudioButton textKey={routeNoteKey(path.route)} />}
                </Row>
              )}
            </Section>

            {path.clocks.length > 0 && (
              <FaqItem question={t('ui.journey.contact.clocks_title')} icon={<IconClock size={24} aria-hidden="true" />}>
                <ClockList path={path} />
              </FaqItem>
            )}

            <CallScript parts={path.callScript} />

            <PageActions>
              <ActionButton fullWidth disabled={props.sending} onPress={() => setAsking(true)}>
                {t('ui.journey.contact.done')}
              </ActionButton>
            </PageActions>
          </Stack>
        )
      }
    </OutcomeChooser>
  )
}
