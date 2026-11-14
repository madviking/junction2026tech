// Ordered, array-based views of the structure for API responses. Encore's JSON
// encoder sorts object keys, so anything whose order matters on screen (stages,
// outcomes, interrupts) is sent as an array.
import type { InterruptDef, JourneyDef, OutcomeDef, RouteFact, StageDef } from './types'

export interface OutcomeView extends OutcomeDef {
  id: string
}

export interface StageView extends Omit<StageDef, 'outcomes'> {
  id: string
  outcomes: OutcomeView[]
}

export interface InterruptView extends InterruptDef {
  id: string
}

export interface JourneyView {
  start: string
  interrupts: InterruptView[]
  routeFact: RouteFact
  stages: StageView[]
}

export function journeyView(j: JourneyDef): JourneyView {
  return {
    start: j.start,
    interrupts: Object.entries(j.interrupts).map(([id, i]) => ({ id, ...i })),
    routeFact: j.facts.route,
    stages: Object.entries(j.stages).map(([id, s]) => ({
      id,
      ...s,
      outcomes: Object.entries(s.outcomes).map(([oid, o]) => ({ id: oid, ...o })),
    })),
  }
}
