import { useEffect, useState } from 'react'
import { JourneyFrame } from '@/features/journey/components/JourneyFrame'
import { PathOverview } from '@/features/journey/components/PathOverview'
import { PathProgress } from '@/features/journey/components/PathProgress'
import type { StageProps } from '@/features/journey/components/stageProps'
import { thenKey } from '@/features/journey/keys'
import { stageComponentFor } from '@/features/journey/registry'
import { SubStepBackProvider, useSubStepBackSlot } from '@/features/journey/subStepBack'
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
 * stage from the registry and the interrupts. The header holds the visit code and the one
 * red control, "Urgent help" (`@/features/urgent`): a panel over the page with the emergency
 * signs, the call to 112 and Cancel. It sends nothing and is not a step, so "back" keeps
 * following the person's own steps. The `emergency` stage (reached through content) still
 * shows the same urgent content with the call in the bottom bar.
 */
export function JourneyScreen({ sendFailed, aboutPath, goBack, restart, ...stage }: JourneyScreenProps) {
  const { t, has, bundle } = useContent()
  const { view, send, sending } = stage
  const [showPath, setShowPath] = useState(false)
  // An inner step of the stage (symptom cards, "what happened?") takes over the header arrow.
  const subStep = useSubStepBackSlot()
  const headerBack = sending ? undefined : (subStep.current ?? (view.canGoBack ? goBack : undefined))

  const nextOf = new Map(bundle.journey.interrupts.map((i) => [i.id, i.next]))
  const inEmergency = view.stage.id === EMERGENCY_STAGE
  const current = view.stage.id
  // Never offer an interrupt that leads to the stage already shown. The emergency interrupt
  // is not offered as a button: urgent help in the header covers it.
  const others = view.interrupts.filter((i) => nextOf.get(i.id) !== current && nextOf.get(i.id) !== EMERGENCY_STAGE)

  const Stage = stageComponentFor(current)
  const last = view.history.at(-1)
  const thenAudio = view.then ? thenKey(view.then, last, has, t) : undefined
  // A new stage (or a repeated one) starts a fresh screen: reset local state and scroll up.
  const screenKey = `${view.stage.id}-${view.history.length}`

  useEffect(() => {
    document.documentElement.scrollTop = 0
    setShowPath(false)
  }, [screenKey])
  useEffect(() => {
    document.documentElement.scrollTop = 0
  }, [showPath])

  const interrupt = (id: string) => send({ outcome: id })
  const restartId = view.interrupts.find((i) => nextOf.get(i.id) !== EMERGENCY_STAGE)?.id
  const cancelEmergency = () => {
    if (view.canGoBack) goBack()
    else if (restartId) interrupt(restartId)
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
    >
      {!inEmergency && view.then && (
        <Banner tone="info" title={view.then} action={thenAudio && <CardAudioButton textKey={thenAudio} />} />
      )}
      {!inEmergency && sendFailed && <Banner tone="warning" title={t('ui.journey.error.send')} />}
      <SubStepBackProvider value={subStep.register}>
        <Stage key={screenKey} {...stage} />
      </SubStepBackProvider>
      {inEmergency ? (
        // One action: the call. Under it a clear Cancel: undo the emergency step (back to where
        // the person was, so "back" keeps following their steps), or start over if there is
        // nothing to undo.
        <PageActions>
          <EmergencyCallLink label={t('ui.journey.emergency_call')} phoneNumber="112" />
          <ActionButton variant="secondary" fullWidth disabled={sending} onPress={cancelEmergency}>
            {t('ui.urgent.cancel')}
          </ActionButton>
        </PageActions>
      ) : (
        <PrintHidden>{otherInterrupts}</PrintHidden>
      )}
    </JourneyFrame>
  )
}
