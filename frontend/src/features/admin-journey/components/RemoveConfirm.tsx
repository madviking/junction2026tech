import { ActionButton, Row, Stack, Text } from '@/shared/ui'

export interface RemoveConfirmProps {
  question: string
  onConfirm: () => void
  onCancel: () => void
  removing: boolean
  error: string | null
}

/** Inline "are you sure" for a removal, with the server's refusal shown in place. */
export function RemoveConfirm({ question, onConfirm, onCancel, removing, error }: RemoveConfirmProps) {
  return (
    <Stack gap="xs">
      <Text variant="label" tone="danger">
        {question}
      </Text>
      {error && (
        <Text tone="danger" variant="caption">
          {error}
        </Text>
      )}
      <Row gap="xs">
        <ActionButton variant="danger" compact loading={removing} onPress={onConfirm}>
          Confirm remove
        </ActionButton>
        <ActionButton variant="secondary" compact onPress={onCancel}>
          Cancel
        </ActionButton>
      </Row>
    </Stack>
  )
}
