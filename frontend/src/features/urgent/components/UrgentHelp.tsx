import { useCallback, useId, useState } from 'react'
import { UrgentContent } from '@/features/urgent/components/UrgentContent'
import { useContent } from '@/shared/i18n'
import { ActionButton, EmergencyButton, EmergencyCallLink, FullScreenSheet } from '@/shared/ui'

/**
 * The one red header control of resident pages: "Urgent help" opens a panel over the page with
 * the emergency signs, the call to 112 and Cancel. Opening it records nothing and is not a step:
 * Cancel returns to exactly where the person was, and "back" keeps following their own steps.
 */
export function UrgentHelp() {
  const { t } = useContent()
  const [opened, setOpened] = useState(false)
  const titleId = useId()
  const close = useCallback(() => setOpened(false), [])
  return (
    <>
      <EmergencyButton label={t('ui.urgent.button')} onPress={() => setOpened(true)} />
      <FullScreenSheet
        opened={opened}
        onClose={close}
        labelledBy={titleId}
        footer={
          <>
            <EmergencyCallLink label={t('ui.journey.emergency_call')} phoneNumber="112" />
            <ActionButton variant="secondary" fullWidth onPress={close}>
              {t('ui.urgent.cancel')}
            </ActionButton>
          </>
        }
      >
        <UrgentContent titleId={titleId} />
      </FullScreenSheet>
    </>
  )
}
