import { useState } from 'react'
import { ActionButton, Divider, Row, Stack, StatusBadge, SurfaceCard, Text } from '@/shared/ui'
import { IssueLine } from '@/features/admin-journey/components/IssueLine'
import { sortIssues } from '@/features/admin-journey/lib/layout'
import { issueStage } from '@/features/admin-journey/lib/nextStage'
import type { GraphReviewFlag, ValidationIssue } from '@/features/admin-journey/types'

export interface IssuesPanelProps {
  issues: ValidationIssue[]
  reviewFlags: GraphReviewFlag[]
  onShowStage: (stageId: string) => void
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Strip above the board: validation of the whole draft (the same check publish runs; issues
 * always listed) and the clinical/legal review flags (counts, list folded until asked).
 */
export function IssuesPanel({ issues, reviewFlags, onShowStage }: IssuesPanelProps) {
  const [flagsOpen, setFlagsOpen] = useState(false)
  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.length - errors
  const clinical = reviewFlags.filter((f) => f.kind === 'clinical').length
  const legal = reviewFlags.length - clinical
  return (
    <aside aria-label="Validation and review flags">
      <SurfaceCard padding="sm">
        <Stack gap="sm">
          <Row gap="lg" justify="between">
            <Row gap="xs">
              <Text variant="label" as="h2">
                Validation
              </Text>
              <StatusBadge tone={errors ? 'danger' : 'success'}>{count(errors, 'error', 'errors')}</StatusBadge>
              <StatusBadge tone={warnings ? 'warning' : 'neutral'}>{count(warnings, 'warning', 'warnings')}</StatusBadge>
              <Text as="span" variant="caption" tone={issues.length ? 'muted' : 'success'}>
                {issues.length ? 'The same check publish runs. Errors block publishing; warnings do not.' : 'No problems: the draft can be published.'}
              </Text>
            </Row>
            <Row gap="xs">
              <Text variant="label" as="h2">
                Review flags
              </Text>
              {reviewFlags.length === 0 && <StatusBadge tone="neutral">none</StatusBadge>}
              {clinical > 0 && <StatusBadge tone="warning">{`${clinical} clinical`}</StatusBadge>}
              {legal > 0 && <StatusBadge tone="info">{`${legal} legal`}</StatusBadge>}
              {reviewFlags.length > 0 && (
                <ActionButton variant="subtle" compact onPress={() => setFlagsOpen((open) => !open)}>
                  {flagsOpen ? 'Hide review flags' : 'Show review flags'}
                </ActionButton>
              )}
            </Row>
          </Row>
          {issues.length > 0 && (
            <Stack as="ul" gap="xs">
              {sortIssues(issues).map((issue, index) => (
                <li key={`${issue.path}-${index}`}>
                  <IssueLine issue={issue} onShowStage={onShowStage} />
                </li>
              ))}
            </Stack>
          )}
          {flagsOpen && (
            <>
              <Divider label="Places marked for a clinical or legal check before a pilot" />
              <Stack as="ul" gap="xs">
                {reviewFlags.map((flag) => {
                  const stage = issueStage(flag.path)
                  return (
                    <li key={`${flag.kind}-${flag.path}`}>
                      <Row gap="xs">
                        <StatusBadge tone={flag.kind === 'clinical' ? 'warning' : 'info'}>{flag.kind}</StatusBadge>
                        <Text as="span">{flag.message}</Text>
                        {stage && (
                          <ActionButton variant="subtle" compact ariaLabel={`Show stage ${stage}`} onPress={() => onShowStage(stage)}>
                            Show
                          </ActionButton>
                        )}
                      </Row>
                    </li>
                  )
                })}
              </Stack>
            </>
          )}
        </Stack>
      </SurfaceCard>
    </aside>
  )
}
