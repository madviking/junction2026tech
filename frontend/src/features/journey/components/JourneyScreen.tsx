import { useEffect, useState } from 'react'
import { JourneyFrame } from '@/features/journey/components/JourneyFrame'
import { PathOverview } from '@/features/journey/components/PathOverview'
import { PathProgress } from '@/features/journey/components/PathProgress'
import type { StageProps } from '@/features/journey/components/stageProps'
import { interruptKey, thenKey } from '@/features/journey/keys'
import { stageComponentFor } from '@/features/journey/registry'
import { SubStepBackProvider, useSubStepBackSlot } from '@/features/journey/subStepBack'
import type { VisitView } from '@/features/journey/types'
import { CardAudioButton } from '@/features/voice'
import { useContent } from '@/shared/i18n'
import { ActionButton, Banner, EmergencyCallLink, PageActions, PrintHidden } from '@/shared/ui'

/** The stage an emergency interrupt leads to (registry entry `emergency`). */
const EMERGENCY_STAGE = 'emergency'

export interface JourneyScreenProps extends StageProps {
  /** The last event could not be saved. */
  sendFailed: boolean
  /** In-app path of the about page. */
  aboutPath: string
  /** One step back on the path (offered when `view.canGoBack`). */
  goBack: () => void
  /** Leave this visit for the start screen. */
  restart: () => void
}

/**
 * One journey screen: where the person is on their path, the last then-text, the current
 * stage from the registry and the interrupts. The header holds the visit code, the one red
 * control (112, direct dial) and a neutral button to the emergency signs.
 *
 * The emergency screen never waits for the server: tapping the emergency interrupt shows
 * it at once (112 and the signs come from the loaded content) and sends the event in the
 * background. If that request fails, the screen stays and nothing alarming is shown.
 */
export function JourneyScreen({ sendFailed, aboutPath, goBack, restart, ...stage }: JourneyScreenProps) {
  const { t, has, bundle } = useContent()
  const { view, send, sending } = stage
  const [localEmergency, setLocalEmergency] = useState(false)
  const [showPath, setShowPath] = useState(false)
  // An inner step of the stage (symptom cards, "what happened?") takes over the header arrow.
  const subStep = useSubStepBackSlot()
  const headerBack = sending ? undefined : (subStep.current ?? (view.canGoBack ? goBack : undefined))

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
    setShowPath(false)
  }, [screenKey])
  useEffect(() => {
    document.documentElement.scrollTop = 0
  }, [showPath])

  const toEmergency = (id: string) => {
    setLocalEmergency(true)
    send({ outcome: id })
  }
  const interrupt = (id: string) => {
    setLocalEmergency(false)
    send({ outcome: id })
  }
  const otherInterrupts = others.map((item) => (
    <ActionButton key={item.id} variant="subtle" fullWidth disabled={sending} onPress={() => interrupt(item.id)}>
      {item.text}
    </ActionButton>
  ))

  if (showPath && !inEmergency) {
    return (
      <JourneyFrame code={view.code} onBack={() => setShowPath(false)}>
        <PathOverview view={view} aboutPath={aboutPath} sending={sending} onClose={() => setShowPath(false)} onBackStep={goBack} onRestart={restart} />
      </JourneyFrame>
    )
  }

  return (
    <JourneyFrame
      code={view.code}
      hideCall={inEmergency}
      progress={inEmergency ? undefined : <PathProgress view={view} onOpen={() => setShowPath(true)} onBack={headerBack} />}
      headerAction={
        emergency && (
          <ActionButton variant="secondary" onPress={() => toEmergency(emergency.id)}>
            {t('ui.journey.urgent')}
          </ActionButton>
        )
      }
    >
      {!inEmergency && view.then && (
        <Banner tone="info" title={view.then} action={thenAudio && <CardAudioButton textKey={thenAudio} />} />
      )}
      {!inEmergency && sendFailed && <Banner tone="warning" title={t('ui.journey.error.send')} />}
      <SubStepBackProvider value={subStep.register}>
        <Stage key={screenKey} {...stage} />
      </SubStepBackProvider>
      {inEmergency ? (
        // One action: the call. The way back sits under it, in the same bar.
        <PageActions>
          <EmergencyCallLink label={t('ui.journey.emergency_call')} phoneNumber="112" />
          {otherInterrupts}
        </PageActions>
      ) : (
        <PrintHidden>{otherInterrupts}</PrintHidden>
      )}
    </JourneyFrame>
  )
}
