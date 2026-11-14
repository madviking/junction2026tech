import { Row, Stack, StatusBadge, Text } from '@/shared/ui'
import type { ValidationIssue } from '@/features/admin-content/types'

/** Validation errors and warnings, one line each with its path. */
export function IssuesList({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null
  return (
    <Stack as="ul" gap="xs">
      {issues.map((issue, index) => (
        <li key={`${issue.path}-${index}`}>
          <Row gap="xs">
            <StatusBadge tone={issue.severity === 'error' ? 'danger' : 'warning'}>{issue.severity}</StatusBadge>
            <Text as="span">{issue.message}</Text>
            <Text variant="caption" tone="muted" as="span">
              {issue.path}
            </Text>
          </Row>
        </li>
      ))}
    </Stack>
  )
}
