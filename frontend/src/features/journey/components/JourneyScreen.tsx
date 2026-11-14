import { useEffect, useState } from 'react'
import { JourneyFrame } from '@/features/journey/components/JourneyFrame'
import type { StageProps } from '@/features/journey/components/stageProps'
import { interruptKey, thenKey } from '@/features/journey/keys'
import { stageComponentFor } from '@/features/journey/registry'
import type { VisitView } from '@/features/journey/types'
import { CardAudioButton } from '@/features/voice'
import { useContent } from '@/shared/i18n'
import { ActionButton, Banner, Divider, Stack, Text } from '@/shared/ui'

/** The stage an emergency interrupt leads to (registry entry `emergency`). */
const EMERGENCY_STAGE = 'emergency'

export interface JourneyScreenProps extends StageProps {
  /** The last event could not be saved. */
  sendFailed: boolean
}

/**
 * One journey screen: the current stage from the registry, the last then-text, the
 * interrupts (emergency in the always-visible slot, the others as secondary actions)
 * and the visit code.
 *
 * The emergency screen never waits for the server: tapping the emergency interrupt shows
 * it at once (112 and the signs come from the loaded content) and sends the event in the
 * background. If that request fails, the screen stays and nothing alarming is shown.
 */
export function JourneyScreen({ sendFailed, ...stage }: JourneyScreenProps) {
  const { t, has, bundle } = useContent()
  const { view, send, sending } = stage
  const [localEmergency, setLocalEmergency] = useState(false)

  const nextOf = new Map(bundle.journey.interrupts.map((i) => [i.id, i.next]))
  const inEmergency = localEmergency || view.stage.id === EMERGENCY_STAGE
  const current = inEmergency ? EMERGENCY_STAGE : view.stage.id
  // The server lists the interrupts available on its stage; while the emergency screen
  // is shown ahead of the server, the content's interrupts stand in. Never offer an
  // interrupt that leads to the stage already shown.
  const listed: VisitView['interrupts'] =
    view.stage.id === current ? view.interrupts : bundle.journey.interrupts.map((i) => ({ id: i.id, text: t(interruptKey(i.id)) }))
  const available = listed.filter((i) => nextOf.get(i.id) !== current)
  const emergency = available.find((i) => nextOf.get(i.id) === EMERGENCY_STAGE)
  const others = available.filter((i) => nextOf.get(i.id) !== EMERGENCY_STAGE)

  const Stage = stageComponentFor(current)
  const last = view.history.at(-1)
  const thenAudio = view.then ? thenKey(view.then, last, has, t) : undefined
  // A new stage (or a repeated one) starts a fresh screen: reset local state and scroll up.
  const screenKey = inEmergency ? EMERGENCY_STAGE : `${view.stage.id}-${view.history.length}`

  useEffect(() => {
    document.documentElement.scrollTop = 0
  }, [screenKey])

  const toEmergency = (id: string) => {
    setLocalEmergency(true)
    send({ outcome: id })
  }
  const interrupt = (id: string) => {
    setLocalEmergency(false)
    send({ outcome: id })
  }

  return (
    <JourneyFrame
      emergencyAction={
        emergency && (
          <ActionButton variant="danger" fullWidth onPress={() => toEmergency(emergency.id)}>
            {emergency.text}
          </ActionButton>
        )
      }
    >
      {!inEmergency && view.then && (
        <Banner tone="info" title={view.then} action={thenAudio && <CardAudioButton textKey={thenAudio} />} />
      )}
      {!inEmergency && sendFailed && <Banner tone="warning" title={t('ui.journey.error.send')} />}
      <Stage key={screenKey} {...stage} />
      {others.length > 0 && (
        <Stack gap="sm">
          <Divider />
          <Text tone="muted">{t(inEmergency ? 'ui.journey.emergency.back_hint' : 'ui.journey.something_changed_hint')}</Text>
          {others.map((item) => (
            <ActionButton key={item.id} variant="secondary" fullWidth disabled={sending} onPress={() => interrupt(item.id)}>
              {item.text}
            </ActionButton>
          ))}
        </Stack>
      )}
      <Stack gap="xs">
        <Text variant="label">{t('ui.journey.your_code', { code: view.code })}</Text>
        <Text variant="caption" tone="muted">
          {t('ui.journey.save_code')}
        </Text>
      </Stack>
    </JourneyFrame>
  )
}
