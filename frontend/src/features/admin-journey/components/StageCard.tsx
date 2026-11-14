import { ActionButton, Divider, Row, Stack, StatusBadge, SurfaceCard, Text } from '@/shared/ui'
import { OutcomeRow } from '@/features/admin-journey/components/OutcomeRow'
import { RemoveConfirm } from '@/features/admin-journey/components/RemoveConfirm'
import { outcomeIssues, stageIssues, type ColumnKind } from '@/features/admin-journey/lib/layout'
import type { GraphStage, PendingRemoval, ValidationIssue } from '@/features/admin-journey/types'

export interface StageCardProps {
  stage: GraphStage
  isStart: boolean
  column: ColumnKind
  issues: ValidationIssue[]
  stageIds: Set<string>
  pending: PendingRemoval | null
  removing: boolean
  removeError: string | null
  onFollow: (stageId: string) => void
  onAddOutcome: () => void
  onChangeNext: (outcomeId: string) => void
  onAskRemove: (removal: PendingRemoval) => void
  onConfirmRemove: () => void
  onCancelRemove: () => void
}

/** One stage of the journey: question, outcomes with their targets, and edit actions. */
export function StageCard(props: StageCardProps) {
  const { stage, isStart, column, pending } = props
  const mine = stageIssues(props.issues, stage.id)
  const own = mine.filter((i) => i.path === `journey.stages.${stage.id}`)
  const errors = mine.filter((i) => i.severity === 'error').length
  const removable = !isStart && stage.id !== 'closed'
  const confirmingStage = pending?.kind === 'stage' && pending.stage === stage.id
  return (
    <SurfaceCard as="article">
      <Stack gap="sm">
        <Row gap="xs" justify="between">
          <Text variant="heading" as="h4">
            {stage.id}
          </Text>
          <Row gap="xs">
            {isStart && <StatusBadge tone="info">start</StatusBadge>}
            {stage.terminal && <StatusBadge tone="neutral">terminal</StatusBadge>}
            {column === 'unreachable' && <StatusBadge tone="warning">not reachable</StatusBadge>}
            {errors > 0 && <StatusBadge tone="danger">{`${errors} ${errors === 1 ? 'error' : 'errors'}`}</StatusBadge>}
          </Row>
        </Row>
        <Text tone="muted">{stage.terminal ? 'End of the journey (no question).' : (stage.ask ?? '(no English question)')}</Text>
        {stage.ladder > 0 && <Text variant="caption" tone="muted">{`Escalation ladder: ${stage.ladder} steps`}</Text>}
        {own.map((issue, index) => (
          <Text key={`${issue.path}-${index}`} variant="caption" tone={issue.severity === 'error' ? 'danger' : 'warning'}>
            {issue.message}
          </Text>
        ))}
        {stage.outcomes.length > 0 && (
          <Stack as="ul" gap="sm">
            {stage.outcomes.map((outcome) => (
              <li key={outcome.id}>
                <Divider />
                <OutcomeRow
                  outcome={outcome}
                  targetExists={props.stageIds.has(outcome.next)}
                  issues={outcomeIssues(props.issues, stage.id, outcome.id)}
                  onFollow={props.onFollow}
                  onChangeNext={() => props.onChangeNext(outcome.id)}
                  onRemove={() => props.onAskRemove({ kind: 'outcome', stage: stage.id, outcome: outcome.id })}
                  confirming={pending?.kind === 'outcome' && pending.stage === stage.id && pending.outcome === outcome.id}
                  onConfirmRemove={props.onConfirmRemove}
                  onCancelRemove={props.onCancelRemove}
                  removing={props.removing}
                  removeError={props.removeError}
                />
              </li>
            ))}
          </Stack>
        )}
        <Divider />
        {confirmingStage ? (
          <RemoveConfirm
            question={`Remove stage ${stage.id} and its texts?`}
            onConfirm={props.onConfirmRemove}
            onCancel={props.onCancelRemove}
            removing={props.removing}
            error={props.removeError}
          />
        ) : (
          <Row gap="xs">
            <ActionButton variant="secondary" compact ariaLabel={`Add outcome to ${stage.id}`} onPress={props.onAddOutcome}>
              Add outcome
            </ActionButton>
            {removable && (
              <ActionButton variant="subtle" compact ariaLabel={`Remove stage ${stage.id}`} onPress={() => props.onAskRemove({ kind: 'stage', stage: stage.id })}>
                Remove stage
              </ActionButton>
            )}
          </Row>
        )}
      </Stack>
    </SurfaceCard>
  )
}
