import { useMemo } from 'react'
import { SideDrawer } from '@/shared/ui/admin'
import { AddOutcomeForm, AddStageForm, SetNextForm } from '@/features/admin-journey/components/EditForms'
import type { JourneyEdit, JourneyGraph } from '@/features/admin-journey/types'

export interface JourneyEditDrawerProps {
  edit: JourneyEdit | null
  graph: JourneyGraph
  submitting: boolean
  error: string | null
  onClose: () => void
  onAddStage: (input: { id: string; terminal: boolean; askEn: string; askFi: string }) => void
  onAddOutcome: (input: { stage: string; id: string; next: string; cardEn: string; cardFi: string }) => void
  onSetNext: (input: { stage: string; id: string; next: string }) => void
}

const TITLES = { 'add-stage': 'Add a stage', 'add-outcome': 'Add an outcome', 'set-next': 'Change where it leads' } as const

/** Side drawer with the form of the current structural edit. */
export function JourneyEditDrawer({ edit, graph, submitting, error, onClose, onAddStage, onAddOutcome, onSetNext }: JourneyEditDrawerProps) {
  const stageIds = useMemo(() => graph.stages.map((s) => s.id), [graph])
  const outcomeStage = edit?.kind === 'add-outcome' ? edit.stage : null
  // Ids a new outcome cannot take: the stage's outcomes and the interrupts.
  const takenOutcomeIds = useMemo(
    () => [...(graph.stages.find((s) => s.id === outcomeStage)?.outcomes.map((o) => o.id) ?? []), ...graph.interrupts.map((i) => i.id)],
    [graph, outcomeStage],
  )
  const base = { submitting, error, onCancel: onClose }
  const title = edit ? (edit.kind === 'add-stage' ? TITLES[edit.kind] : `${TITLES[edit.kind]} · ${edit.stage}`) : 'Edit'
  return (
    <SideDrawer opened={edit !== null} onClose={onClose} title={title}>
      {edit?.kind === 'add-stage' && <AddStageForm {...base} takenIds={stageIds} onSubmit={onAddStage} />}
      {edit?.kind === 'add-outcome' && (
        <AddOutcomeForm
          key={edit.stage}
          {...base}
          stage={edit.stage}
          stageIds={stageIds}
          takenIds={takenOutcomeIds}
          onSubmit={onAddOutcome}
        />
      )}
      {edit?.kind === 'set-next' && (
        <SetNextForm
          key={`${edit.stage}.${edit.outcome.id}`}
          {...base}
          card={edit.outcome.card || edit.outcome.id}
          current={edit.outcome.next}
          stageIds={stageIds}
          onSubmit={(next) => onSetNext({ stage: edit.stage, id: edit.outcome.id, next })}
        />
      )}
    </SideDrawer>
  )
}
