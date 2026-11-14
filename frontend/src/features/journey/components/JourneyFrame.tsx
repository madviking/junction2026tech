import { useMemo, type ReactNode } from 'react'
import { useContent } from '@/shared/i18n'
import { EmergencyCallLink, PageShell, PlaceholderNotice, Stack } from '@/shared/ui'

export interface JourneyFrameProps {
  /** Extra emergency action under the call link (the emergency interrupt). */
  emergencyAction?: ReactNode
  /** Shows a back arrow that calls this. */
  onBack?: () => void
  children: ReactNode
}

/** Resident page frame of the journey: title, 112 always visible, the unchecked-translation marker. */
export function JourneyFrame({ emergencyAction, onBack, children }: JourneyFrameProps) {
  const { t, placeholder } = useContent()
  const backLabel = t('ui.journey.back')
  const back = useMemo(() => (onBack ? { label: backLabel, onPress: onBack } : undefined), [onBack, backLabel])
  return (
    <PageShell
      title={t('ui.journey.title')}
      back={back}
      emergency={
        <Stack gap="xs">
          <EmergencyCallLink label={t('ui.journey.emergency_call')} phoneNumber="112" />
          {emergencyAction}
        </Stack>
      }
    >
      <Stack gap="lg">
        {placeholder && <PlaceholderNotice>{t('ui.journey.placeholder')}</PlaceholderNotice>}
        {children}
      </Stack>
    </PageShell>
  )
}
