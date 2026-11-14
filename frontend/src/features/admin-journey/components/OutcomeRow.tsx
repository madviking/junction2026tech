import { ActionButton, Row, Stack, StatusBadge, Text } from '@/shared/ui'
import { RemoveConfirm } from '@/features/admin-journey/components/RemoveConfirm'
import type { GraphOutcome, ValidationIssue } from '@/features/admin-journey/types'

export interface OutcomeRowProps {
  outcome: GraphOutcome
  /** False when `next` names no stage (a validation error). */
  targetExists: boolean
  issues: ValidationIssue[]
  onFollow: (stageId: string) => void
  onChangeNext: () => void
  onRemove: () => void
  confirming: boolean
  onConfirmRemove: () => void
  onCancelRemove: () => void
  removing: boolean
  removeError: string | null
}

/** One outcome: "card text → target stage", its flags, issues and edit actions. */
export function OutcomeRow(props: OutcomeRowProps) {
  const { outcome, targetExists, issues } = props
  const card = outcome.card || `(no English card for ${outcome.id})`
  return (
    <Stack gap="xs">
      <Text>{card}</Text>
      <Row gap="xs">
        <Text as="span" tone="muted" variant="caption">
          {`${outcome.id} →`}
        </Text>
        {targetExists ? (
          <ActionButton variant="subtle" compact ariaLabel={`Go to stage ${outcome.next}`} onPress={() => props.onFollow(outcome.next)}>
            {outcome.next}
          </ActionButton>
        ) : (
          <StatusBadge tone="danger">{`missing stage ${outcome.next}`}</StatusBadge>
        )}
        {outcome.review && <StatusBadge tone={outcome.review === 'clinical' ? 'warning' : 'info'}>{`${outcome.review} review`}</StatusBadge>}
        {outcome.maxTries !== null && <StatusBadge tone="neutral">{`after ${outcome.maxTries} tries → ${outcome.afterMax ?? '?'}`}</StatusBadge>}
        {outcome.climb && <StatusBadge tone="neutral">climbs ladder</StatusBadge>}
        {outcome.sets && <StatusBadge tone="neutral">{`sets ${outcome.sets}`}</StatusBadge>}
        {outcome.setsLane && <StatusBadge tone="neutral">{`lane ${outcome.setsLane}`}</StatusBadge>}
      </Row>
      {issues.map((issue, index) => (
        <Text key={`${issue.path}-${index}`} variant="caption" tone={issue.severity === 'error' ? 'danger' : 'warning'}>
          {issue.message}
        </Text>
      ))}
      {props.confirming ? (
        <RemoveConfirm
          question={`Remove outcome ${outcome.id}?`}
          onConfirm={props.onConfirmRemove}
          onCancel={props.onCancelRemove}
          removing={props.removing}
          error={props.removeError}
        />
      ) : (
        <Row gap="xs">
          <ActionButton variant="subtle" compact ariaLabel={`Change where ${outcome.id} leads`} onPress={props.onChangeNext}>
            Change next
          </ActionButton>
          <ActionButton variant="subtle" compact ariaLabel={`Remove outcome ${outcome.id}`} onPress={props.onRemove}>
            Remove
          </ActionButton>
        </Row>
      )}
    </Stack>
  )
}
