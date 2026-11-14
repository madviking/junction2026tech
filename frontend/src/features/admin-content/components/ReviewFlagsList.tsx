import { EmptyState, Row, Stack, StatusBadge, Text } from '@/shared/ui'
import type { ReviewFlag } from '@/features/admin-content/types'

/** Clinical and legal review flags of the live structure. */
export function ReviewFlagsList({ flags }: { flags: ReviewFlag[] }) {
  if (flags.length === 0) return <EmptyState title="No review flags" description="Nothing in the live structure is marked for clinical or legal review." />
  return (
    <Stack as="ul" gap="xs">
      {flags.map((flag) => (
        <li key={`${flag.kind}-${flag.path}`}>
          <Row gap="xs">
            <StatusBadge tone={flag.kind === 'clinical' ? 'warning' : 'info'}>{flag.kind}</StatusBadge>
            <Text as="span">{flag.message}</Text>
            <Text variant="caption" tone="muted" as="span">
              {flag.path}
            </Text>
          </Row>
        </li>
      ))}
    </Stack>
  )
}
