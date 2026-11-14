import type { ComponentType } from 'react'
import type { JourneyEvent, MatchFn, OutcomeCard, VisitView } from '@/features/journey/types'

/** What every stage screen gets. Stages never fetch: they render the view and call `send`. */
export interface StageProps {
  view: VisitView
  /** Sends a tapped outcome; the server decides the next stage. */
  send: (event: JourneyEvent) => void
  /** True while an event is on its way (cards are disabled). */
  sending: boolean
  match: MatchFn
  /** In-app path of the visit card. */
  visitCardPath: string
}

export type StageComponent = ComponentType<StageProps>

export interface OutcomeCardProps {
  stage: string
  outcome: OutcomeCard
  disabled: boolean
  onChoose: () => void
}

export type OutcomeCardComponent = ComponentType<OutcomeCardProps>
