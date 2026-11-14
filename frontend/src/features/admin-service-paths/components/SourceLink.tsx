import { IconExternalLink } from '@tabler/icons-react'
import { ActionButton, Text } from '@/shared/ui'
import type { SourceRef } from '@/features/admin-service-paths/types'

/** Opens the source page; "No source" when a row has none yet. */
export function SourceLink({ source }: { source: SourceRef | null }) {
  if (!source) {
    return (
      <Text variant="caption" tone="warning" as="span">
        No source
      </Text>
    )
  }
  return (
    <ActionButton
      variant="subtle"
      compact
      href={source.url}
      external
      icon={<IconExternalLink size={16} aria-hidden="true" />}
      ariaLabel={`Source: ${source.title} (${source.publisher})`}
    >
      {source.publisher}
    </ActionButton>
  )
}
