import { IconArrowsSplit2, IconTrash } from '@tabler/icons-react'
import { ActionButton, Row, Stack, StatusBadge, Text } from '@/shared/ui'
import { IconButton } from '@/shared/ui/admin'
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

/** One outcome: card text with its edit icons, "id → target", then flags and issues. */
export function OutcomeRow(props: OutcomeRowProps) {
  const { outcome, targetExists, issues } = props
  const card = outcome.card || `(no English card for ${outcome.id})`
  const badges = [
    outcome.review && <StatusBadge key="review" tone={outcome.review === 'clinical' ? 'warning' : 'info'}>{`${outcome.review} review`}</StatusBadge>,
    outcome.maxTries !== null && <StatusBadge key="tries" tone="neutral">{`after ${outcome.maxTries} tries → ${outcome.afterMax ?? '?'}`}</StatusBadge>,
    outcome.climb && <StatusBadge key="climb" tone="neutral">climbs ladder</StatusBadge>,
    outcome.sets && <StatusBadge key="sets" tone="neutral">{`sets ${outcome.sets}`}</StatusBadge>,
    outcome.setsLane && <StatusBadge key="lane" tone="neutral">{`lane ${outcome.setsLane}`}</StatusBadge>,
  ].filter(Boolean)
  return (
    <Stack gap="xs">
      <Row gap="xs" justify="between" align="start" wrap={false}>
        <Text>{card}</Text>
        {!props.confirming && (
          <Row gap="none" wrap={false}>
            <IconButton label={`Change where ${outcome.id} leads`} icon={<IconArrowsSplit2 size={18} />} onPress={props.onChangeNext} />
            <IconButton label={`Remove outcome ${outcome.id}`} variant="danger" icon={<IconTrash size={18} />} onPress={props.onRemove} />
          </Row>
        )}
      </Row>
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
      </Row>
      {badges.length > 0 && <Row gap="xs">{badges}</Row>}
      {issues.map((issue, index) => (
        <Text key={`${issue.path}-${index}`} variant="caption" tone={issue.severity === 'error' ? 'danger' : 'warning'}>
          {issue.message}
        </Text>
      ))}
      {props.confirming && (
        <RemoveConfirm
          question={`Remove outcome ${outcome.id}?`}
          onConfirm={props.onConfirmRemove}
          onCancel={props.onCancelRemove}
          removing={props.removing}
          error={props.removeError}
        />
      )}
    </Stack>
  )
}
