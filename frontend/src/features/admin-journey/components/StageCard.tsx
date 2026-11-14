import { IconPlus, IconTrash } from '@tabler/icons-react'
import { ActionButton, Divider, Row, Stack, StatusBadge, SurfaceCard, Text } from '@/shared/ui'
import { IconButton } from '@/shared/ui/admin'
import { OutcomeRow } from '@/features/admin-journey/components/OutcomeRow'
import { RemoveConfirm } from '@/features/admin-journey/components/RemoveConfirm'
import { outcomeIssues, stageIssues, type ColumnKind, type IncomingLink } from '@/features/admin-journey/lib/layout'
import type { GraphStage, PendingRemoval, ValidationIssue } from '@/features/admin-journey/types'

export interface StageCardProps {
  stage: GraphStage
  isStart: boolean
  column: ColumnKind
  issues: ValidationIssue[]
  stageIds: Set<string>
  /** What leads to this stage (outcomes of other stages, interrupts). */
  incoming: IncomingLink[]
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

/** "From describe, route · interrupt emergency_sign": each source stage once, as a link back. */
function IncomingLine({ incoming, isStart, onFollow }: { incoming: IncomingLink[]; isStart: boolean; onFollow: (stageId: string) => void }) {
  const stages = [...new Set(incoming.flatMap((l) => (l.kind === 'outcome' ? [l.stage] : [])))]
  const interrupts = incoming.flatMap((l) => (l.kind === 'interrupt' ? [l.id] : []))
  if (!stages.length && !interrupts.length) {
    return isStart ? null : (
      <Text variant="caption" tone="warning">
        Nothing leads here.
      </Text>
    )
  }
  return (
    <Row gap="xs">
      <Text as="span" variant="caption" tone="muted">
        From
      </Text>
      {stages.map((id) => (
        <ActionButton key={id} variant="subtle" compact ariaLabel={`Go to stage ${id} (leads here)`} onPress={() => onFollow(id)}>
          {id}
        </ActionButton>
      ))}
      {interrupts.map((id) => (
        <Text key={id} as="span" variant="caption" tone="muted">
          {`interrupt ${id}`}
        </Text>
      ))}
    </Row>
  )
}

/** One stage of the journey: question, where it is reached from, outcomes with their targets, and edit actions. */
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
        <Row gap="xs" justify="between" wrap={false}>
          <Text variant="heading" as="h4">
            {stage.id}
          </Text>
          <Row gap="xs" wrap={false}>
            {isStart && <StatusBadge tone="info">start</StatusBadge>}
            {stage.terminal && <StatusBadge tone="neutral">terminal</StatusBadge>}
            {column === 'unreachable' && <StatusBadge tone="warning">not reachable</StatusBadge>}
            {errors > 0 && <StatusBadge tone="danger">{`${errors} ${errors === 1 ? 'error' : 'errors'}`}</StatusBadge>}
            {removable && !confirmingStage && (
              <IconButton
                label={`Remove stage ${stage.id}`}
                variant="danger"
                icon={<IconTrash size={18} />}
                onPress={() => props.onAskRemove({ kind: 'stage', stage: stage.id })}
              />
            )}
          </Row>
        </Row>
        {confirmingStage && (
          <RemoveConfirm
            question={`Remove stage ${stage.id} and its texts?`}
            onConfirm={props.onConfirmRemove}
            onCancel={props.onCancelRemove}
            removing={props.removing}
            error={props.removeError}
          />
        )}
        <Text tone="muted">{stage.terminal ? 'End of the journey (no question).' : (stage.ask ?? '(no English question)')}</Text>
        <IncomingLine incoming={props.incoming} isStart={isStart} onFollow={props.onFollow} />
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
        {!stage.terminal && (
          <>
            <Divider />
            <Row gap="xs">
              <ActionButton variant="subtle" compact icon={<IconPlus size={18} />} ariaLabel={`Add outcome to ${stage.id}`} onPress={props.onAddOutcome}>
                Add outcome
              </ActionButton>
            </Row>
          </>
        )}
      </Stack>
    </SurfaceCard>
  )
}
