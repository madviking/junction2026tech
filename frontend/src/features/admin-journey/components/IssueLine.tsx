import { ActionButton, Row, StatusBadge, Text } from '@/shared/ui'
import { issueStage } from '@/features/admin-journey/lib/nextStage'
import type { ValidationIssue } from '@/features/admin-journey/types'

export interface IssueLineProps {
  issue: ValidationIssue
  /** Shows a "Show stage" button for issues inside a stage. */
  onShowStage?: (stageId: string) => void
}

/** One validation issue: severity badge (errors red, warnings amber), message, path. */
export function IssueLine({ issue, onShowStage }: IssueLineProps) {
  const stage = onShowStage ? issueStage(issue.path) : null
  return (
    <Row gap="xs" align="start">
      <StatusBadge tone={issue.severity === 'error' ? 'danger' : 'warning'}>{issue.severity}</StatusBadge>
      <Text as="span">{issue.message}</Text>
      <Text variant="caption" tone="muted" as="span">
        {issue.path}
      </Text>
      {stage && onShowStage && (
        <ActionButton variant="subtle" compact ariaLabel={`Show stage ${stage}`} onPress={() => onShowStage(stage)}>
          Show
        </ActionButton>
      )}
    </Row>
  )
}
