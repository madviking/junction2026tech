import { IconLogout } from '@tabler/icons-react'
import { ActionButton, Row, Text } from '@/shared/ui'

export interface UserMenuProps {
  name: string
  email: string
  onSignOut: () => void
  signingOut: boolean
}

/** Header slot: who is signed in, and sign-out. */
export function UserMenu({ name, email, onSignOut, signingOut }: UserMenuProps) {
  return (
    <Row gap="sm" wrap={false}>
      <Text variant="label" as="span">
        <span title={email}>{name}</span>
      </Text>
      <ActionButton variant="secondary" compact icon={<IconLogout size={18} aria-hidden="true" />} loading={signingOut} onPress={onSignOut}>
        Sign out
      </ActionButton>
    </Row>
  )
}
