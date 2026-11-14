import { useMemo, type ReactNode } from 'react'
import { useContent } from '@/shared/i18n'
import { EmergencyCallLink, PageShell, Stack } from '@/shared/ui'

export interface JourneyFrameProps {
  /** The visit code, shown under the title so it is always at hand. */
  code?: string
  /** Neutral header control next to the call link (the way to the emergency signs). */
  headerAction?: ReactNode
  /** The emergency screen has its own large call link; hide the header pill there. */
  hideCall?: boolean
  /** Shows a back arrow that calls this. */
  onBack?: () => void
  children: ReactNode
}

/** Resident page frame of the journey: title, visit code, and the one red control (112, direct dial). */
export function JourneyFrame({ code, headerAction, hideCall, onBack, children }: JourneyFrameProps) {
  const { t } = useContent()
  const backLabel = t('ui.journey.back')
  const back = useMemo(() => (onBack ? { label: backLabel, onPress: onBack } : undefined), [onBack, backLabel])
  return (
    <PageShell
      title={t('ui.journey.title')}
      subtitle={code}
      back={back}
      headerAction={headerAction}
      emergency={hideCall ? undefined : <EmergencyCallLink compact label={t('ui.journey.emergency_call')} phoneNumber="112" />}
    >
      <Stack gap="lg">{children}</Stack>
    </PageShell>
  )
}
