// Journey state of a visit = its outcome events replayed through the pure engine with
// the CURRENT live journey. Pure: no I/O, no clock.
import { initialState, JourneyError, next, type JourneyState, type KnownCodes } from '../care_paths/domain/journey'
import type { ContentDoc } from '../care_paths/domain/types'
import type { Actor, EventRow } from './repository'

export interface AppliedStep {
  stage: string
  outcome: string
  at: Date
  actor: Actor
}

export interface Replay {
  state: JourneyState
  // Text key of the last transition's "then" (may have no text), or null.
  thenKey: string | null
  // Outcome events that applied, in order (skipped ones are left out).
  applied: AppliedStep[]
  // Symptom card ids behind the current lane ([] when the lane is not from symptoms).
  symptoms: string[]
  // How long those symptoms have lasted (keys.SYMPTOM_DURATIONS), or null.
  duration: string | null
  // Clinician answers in first-recorded order, without repeats.
  answers: string[]
  // True once the clinician has answered and the resident has not tapped an outcome since:
  // a further clinician post only adds answers and does not move the journey again.
  clinicianDone: boolean
  // Events that no longer fit the live journey (content changed since they were recorded).
  skipped: number
  // True when the resident can go back one step: their last tap can be undone and no
  // clinician answer came after it.
  canGoBack: boolean
}

export const knownCodes = (doc: ContentDoc): KnownCodes => ({
  lanes: Object.keys(doc.structure.lanes),
  routes: Object.keys(doc.structure.routes),
})

export function replay(doc: ContentDoc, events: EventRow[]): Replay {
  const journey = doc.structure.journey
  const codes = knownCodes(doc)
  const out: Replay = { state: initialState(journey), thenKey: null, applied: [], symptoms: [], duration: null, answers: [], clinicianDone: false, skipped: 0, canGoBack: false }
  let pendingSymptoms: string[] = []
  let pendingDuration: string | null = null
  // What the visit looked like before each resident tap, newest last. 'undo' pops one.
  // A clinician event empties it: the resident cannot go back past the clinician's answer.
  const before: Array<Pick<Replay, 'state' | 'thenKey' | 'symptoms' | 'duration' | 'clinicianDone'> & { applied: number }> = []

  for (const e of events) {
    if (e.kind === 'symptoms') {
      pendingSymptoms = e.payload.symptoms ?? []
      pendingDuration = e.payload.duration ?? null
      continue
    }
    if (e.kind === 'undo') {
      const prev = before.pop()
      if (!prev) {
        out.skipped++
        continue
      }
      out.state = prev.state
      out.thenKey = prev.thenKey
      out.symptoms = prev.symptoms
      out.duration = prev.duration
      out.clinicianDone = prev.clinicianDone
      out.applied.length = prev.applied
      continue
    }
    if (e.kind === 'clinician_answer') {
      if (!out.answers.includes(e.outcome)) out.answers.push(e.outcome)
      out.clinicianDone = true
      before.length = 0
      continue
    }
    if (e.kind === 'clinician_move') {
      // The engine has no jump input: the clinician moves the visit to the clinician
      // stage directly. Lane and route stay.
      const to = e.payload.to
      if (to && journey.stages[to] && !journey.stages[out.state.stage]?.terminal) out.state = { ...out.state, stage: to }
      else out.skipped++
      before.length = 0
      continue
    }
    try {
      const r = next(journey, codes, out.state, {
        outcome: e.outcome,
        at: e.at.toISOString(),
        lane: e.payload.lane,
        route: e.payload.route,
        visitDate: e.payload.visitDate,
      })
      const setsLane = journey.stages[out.state.stage]?.outcomes[e.outcome]?.sets === 'lane' && !r.interrupt
      if (e.actor === 'resident') before.push({ state: out.state, thenKey: out.thenKey, symptoms: out.symptoms, duration: out.duration, clinicianDone: out.clinicianDone, applied: out.applied.length })
      else before.length = 0
      out.state = r.state
      out.thenKey = r.thenKey
      out.applied.push({ stage: e.stage, outcome: e.outcome, at: e.at, actor: e.actor })
      if (e.actor === 'resident') out.clinicianDone = false
      if (setsLane) {
        out.symptoms = pendingSymptoms
        out.duration = pendingDuration
      } else if (r.state.lane === null || r.state.stage === journey.start) {
        out.symptoms = []
        out.duration = null
      }
    } catch (err) {
      if (!(err instanceof JourneyError)) throw err
      // Keep the last good state and go on: the visit stays usable after a content change.
      out.skipped++
    }
  }
  out.canGoBack = before.length > 0
  return out
}
