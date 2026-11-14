import { Container, Stack, Text } from '@/shared/ui'
import { AdminPrimitivesSection } from '@/features/design-system/sections/AdminPrimitivesSection'
import { ResidentPrimitivesSection } from '@/features/design-system/sections/ResidentPrimitivesSection'
import { RtlSection } from '@/features/design-system/sections/RtlSection'
import { TokensSection } from '@/features/design-system/sections/TokensSection'

/** /design-system: every token and every primitive in each state. Not linked from the app shells. */
export function DesignSystemPage() {
  return (
    <Container width="wide">
      <Stack gap="xxl">
        <Stack gap="xs">
          <Text variant="caption" tone="muted" eyebrow>
            Silta
          </Text>
          <Text variant="display" as="h1">
            Design system
          </Text>
          <Text tone="muted">
            Everything visual comes from src/shared/ui. Features compose these primitives and never style anything.
          </Text>
        </Stack>
        <TokensSection />
        <ResidentPrimitivesSection />
        <AdminPrimitivesSection />
        <RtlSection />
      </Stack>
    </Container>
  )
}
