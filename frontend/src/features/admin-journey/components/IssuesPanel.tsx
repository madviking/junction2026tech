import { Divider, Row, Section, Stack, StatusBadge, SurfaceCard, Text } from '@/shared/ui'
import { IssueLine } from '@/features/admin-journey/components/IssueLine'
import { sortIssues } from '@/features/admin-journey/lib/layout'
import type { GraphReviewFlag, ValidationIssue } from '@/features/admin-journey/types'

export interface IssuesPanelProps {
  issues: ValidationIssue[]
  reviewFlags: GraphReviewFlag[]
  onShowStage: (stageId: string) => void
}

/** Validation of the whole draft (the same check publish runs) and the clinical/legal review flags. */
export function IssuesPanel({ issues, reviewFlags, onShowStage }: IssuesPanelProps) {
  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.length - errors
  return (
    <SurfaceCard>
      <Stack gap="md">
        <Section
          level={2}
          title="Validation"
          description="The same check publish runs. Any error blocks publishing; warnings do not."
          aside={
            <Row gap="xs">
              <StatusBadge tone={errors ? 'danger' : 'success'}>{`${errors} ${errors === 1 ? 'error' : 'errors'}`}</StatusBadge>
              <StatusBadge tone={warnings ? 'warning' : 'neutral'}>{`${warnings} ${warnings === 1 ? 'warning' : 'warnings'}`}</StatusBadge>
            </Row>
          }
        >
          {issues.length === 0 ? (
            <Text tone="success">No problems: the draft can be published.</Text>
          ) : (
            <Stack as="ul" gap="xs">
              {sortIssues(issues).map((issue, index) => (
                <li key={`${issue.path}-${index}`}>
                  <IssueLine issue={issue} onShowStage={onShowStage} />
                </li>
              ))}
            </Stack>
          )}
        </Section>
        <Divider />
        <Section level={2} title="Review flags" description="Places marked for a clinical or legal check before a pilot.">
          {reviewFlags.length === 0 ? (
            <Text tone="muted">No review flags.</Text>
          ) : (
            <Stack as="ul" gap="xs">
              {reviewFlags.map((flag) => (
                <li key={`${flag.kind}-${flag.path}`}>
                  <Row gap="xs" align="start">
                    <StatusBadge tone={flag.kind === 'clinical' ? 'warning' : 'info'}>{flag.kind}</StatusBadge>
                    <Text as="span">{flag.message}</Text>
                  </Row>
                </li>
              ))}
            </Stack>
          )}
        </Section>
      </Stack>
    </SurfaceCard>
  )
}
