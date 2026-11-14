import { ActionButton, Stack, SurfaceCard, Text } from '@/shared/ui'

export interface DemoAccessCardProps {
  email: string
  password: string
  pending: boolean
  onUse: () => void
}

/** The public demo credentials and a one-click sign-in. Presentational. */
export function DemoAccessCard({ email, password, pending, onUse }: DemoAccessCardProps) {
  return (
    <SurfaceCard padding="lg" as="section">
      <Stack gap="sm" align="start">
        <Text variant="heading" as="h2">
          Look around with the demo account
        </Text>
        <Text tone="muted">It opens every admin page. Nothing you change is saved.</Text>
        <Text as="p">
          <Text as="strong" variant="label">
            Email:
          </Text>{' '}
          <Text as="span">{email}</Text>
        </Text>
        <Text as="p">
          <Text as="strong" variant="label">
            Password:
          </Text>{' '}
          <Text as="span">{password}</Text>
        </Text>
        <ActionButton variant="secondary" loading={pending} onPress={onUse}>
          Sign in as demo viewer
        </ActionButton>
      </Stack>
    </SurfaceCard>
  )
}
