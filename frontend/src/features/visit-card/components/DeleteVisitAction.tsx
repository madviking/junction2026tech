import { IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { ActionButton, Banner, Row, Text } from '@/shared/ui'

export interface DeleteVisitActionProps {
  onConfirm: () => void
  pending: boolean
  failed: boolean
}

/** "Delete my data" with an inline confirmation step. */
export function DeleteVisitAction({ onConfirm, pending, failed }: DeleteVisitActionProps) {
  const t = useT()
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <ActionButton variant="subtle" icon={<IconTrash size={20} aria-hidden="true" />} onPress={() => setConfirming(true)}>
        {t('ui.visit.delete')}
      </ActionButton>
    )
  }
  return (
    <Banner
      tone="warning"
      title={t('ui.visit.delete_title')}
      action={
        <Row gap="sm">
          <ActionButton variant="danger" loading={pending} onPress={onConfirm}>
            {t('ui.visit.delete_confirm')}
          </ActionButton>
          <ActionButton variant="secondary" disabled={pending} onPress={() => setConfirming(false)}>
            {t('ui.visit.cancel')}
          </ActionButton>
        </Row>
      }
    >
      <Text as="span">{t('ui.visit.delete_text')}</Text>
      {failed && (
        <Text as="span" tone="danger">
          {' '}
          {t('ui.visit.delete_failed')}
        </Text>
      )}
    </Banner>
  )
}
