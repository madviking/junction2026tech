import { useState } from 'react'
import { useNavigate } from 'react-router'
import { adminErrorMessage } from '@/features/admin-auth'
import { useAddOutcome, useAddStage, useRemoveOutcome, useRemoveStage, useSetNext } from '@/features/admin-journey/api/mutations'
import { useJourneyGraph } from '@/features/admin-journey/api/queries'
import { InterruptsList } from '@/features/admin-journey/components/InterruptsList'
import { IssuesPanel } from '@/features/admin-journey/components/IssuesPanel'
import { JourneyEditDrawer } from '@/features/admin-journey/components/JourneyEditDrawer'
import { JourneyGraphView } from '@/features/admin-journey/components/JourneyGraphView'
import { editErrorMessage } from '@/features/admin-journey/lib/errors'
import { useHighlight } from '@/features/admin-journey/state/useHighlight'
import type { JourneyEdit, PendingRemoval } from '@/features/admin-journey/types'
import { ActionButton, Banner, EmptyState, ErrorState, LoadingState, Row, Section, Stack, StatusBadge } from '@/shared/ui'

/** `/admin/journey` (behind VITE_FEATURE_JOURNEY_EDITOR): the draft's journey as a graph with structural edits and validation. */
export function JourneyEditorPage() {
  const navigate = useNavigate()
  const graph = useJourneyGraph()
  const addStage = useAddStage()
  const removeStage = useRemoveStage()
  const addOutcome = useAddOutcome()
  const removeOutcome = useRemoveOutcome()
  const setNext = useSetNext()
  const [edit, setEdit] = useState<JourneyEdit | null>(null)
  const [pending, setPending] = useState<PendingRemoval | null>(null)
  const [highlighted, setHighlighted] = useHighlight()

  const drawerWrite = edit?.kind === 'add-stage' ? addStage : edit?.kind === 'add-outcome' ? addOutcome : setNext
  const removeWrite = pending?.kind === 'stage' ? removeStage : removeOutcome
  const closeDrawer = () => {
    setEdit(null)
    for (const m of [addStage, addOutcome, setNext]) m.reset()
  }
  const askRemove = (removal: PendingRemoval) => {
    removeStage.reset()
    removeOutcome.reset()
    setPending(removal)
  }
  const confirmRemove = () => {
    if (!pending) return
    const done = { onSuccess: () => setPending(null) }
    if (pending.kind === 'stage') removeStage.mutate({ id: pending.stage }, done)
    else removeOutcome.mutate({ stage: pending.stage, id: pending.outcome }, done)
  }

  if (graph.isPending) return <LoadingState label="Loading the journey" />
  if (graph.isError) {
    return <ErrorState title="Could not load the journey" message={adminErrorMessage(graph.error)} onRetry={() => graph.refetch()} retrying={graph.isFetching} />
  }
  const data = graph.data
  if (!data.enabled) return <EmptyState title="The journey editor is turned off" description="The server has the journey editor disabled (SILTA_FEATURE_JOURNEY_EDITOR)." />
  const errors = data.issues.filter((i) => i.severity === 'error').length

  return (
    <Stack gap="lg">
      <Section
        level={1}
        eyebrow="Content"
        title="Journey editor"
        description="Stages and outcome cards of the draft. Every edit is checked like a publish; residents see changes only after the draft is published."
        aside={
          <Row gap="xs">
            <StatusBadge tone={data.source === 'draft' ? 'info' : 'neutral'}>{data.source === 'draft' ? 'Draft' : 'Live (no draft yet)'}</StatusBadge>
            <StatusBadge tone="neutral">{`Based on version ${data.basedOnVersion}`}</StatusBadge>
          </Row>
        }
      >
        <Row gap="xs">
          <ActionButton compact onPress={() => setEdit({ kind: 'add-stage' })}>
            Add stage
          </ActionButton>
          <ActionButton variant="secondary" compact onPress={() => navigate('/admin/content')}>
            Draft and publish
          </ActionButton>
        </Row>
      </Section>

      {errors > 0 && (
        <Banner tone="warning" title={`The draft has ${errors} ${errors === 1 ? 'error' : 'errors'}`}>
          Publishing is refused until every error is fixed. The list below shows what and where.
        </Banner>
      )}

      <IssuesPanel issues={data.issues} reviewFlags={data.reviewFlags} onShowStage={setHighlighted} />

      <JourneyGraphView
        graph={data}
        highlightedStage={highlighted}
        pending={pending}
        removing={removeWrite.isPending}
        removeError={removeWrite.error ? editErrorMessage(removeWrite.error) : null}
        onFollow={setHighlighted}
        onAddOutcome={(stage) => setEdit({ kind: 'add-outcome', stage })}
        onChangeNext={(stage, outcomeId) => {
          const outcome = data.stages.find((s) => s.id === stage)?.outcomes.find((o) => o.id === outcomeId)
          if (outcome) setEdit({ kind: 'set-next', stage, outcome })
        }}
        onAskRemove={askRemove}
        onConfirmRemove={confirmRemove}
        onCancelRemove={() => setPending(null)}
      />
      <InterruptsList interrupts={data.interrupts} onFollow={setHighlighted} />

      <JourneyEditDrawer
        edit={edit}
        graph={data}
        submitting={drawerWrite.isPending}
        error={drawerWrite.error ? editErrorMessage(drawerWrite.error) : null}
        onClose={closeDrawer}
        onAddStage={(input) => addStage.mutate(input, { onSuccess: closeDrawer })}
        onAddOutcome={(input) => addOutcome.mutate(input, { onSuccess: closeDrawer })}
        onSetNext={(input) => setNext.mutate(input, { onSuccess: closeDrawer })}
      />
    </Stack>
  )
}
