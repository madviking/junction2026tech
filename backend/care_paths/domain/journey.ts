// Journey engine: next(journey, codes, state, input) -> { state, thenKey }.
// Pure: no I/O, no clock (the caller passes `at`), never mutates its input.
// The structure decides everything; adding a stage or outcome needs no code here.
import { outcomeKey } from './keys'
import type { JourneyDef, OutcomeDef } from './types'

export interface JourneyStep {
  stage: string
  outcome: string
  at: string
}

export interface JourneyState {
  stage: string
  lane: string | null
  route: string | null
  // Times an outcome was chosen, key `<stage>.<outcome>` (for max_tries).
  tries: Record<string, number>
  // Current rung of the escalation ladder of the stage that has one.
  ladderStep: number
  visitDate: string | null
  history: JourneyStep[]
}

export interface JourneyInput {
  // An outcome of the current stage or an interrupt id.
  outcome: string
  at: string
  lane?: string
  route?: string
  visitDate?: string
}

export interface JourneyResult {
  state: JourneyState
  // Text key of what to show next (may have no text in the content), or null.
  thenKey: string | null
  interrupt: boolean
}

export interface KnownCodes {
  lanes: string[]
  routes: string[]
}

export class JourneyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JourneyError'
  }
}

export function initialState(journey: JourneyDef): JourneyState {
  return { stage: journey.start, lane: null, route: null, tries: {}, ladderStep: 0, visitDate: null, history: [] }
}

// Every stage accepts its outcomes plus the interrupts, except an interrupt that leads
// to the stage itself (from emergency only "something changed" leads out, so one
// accidental tap on the emergency button does not end the visit for good).
export function availableInputs(journey: JourneyDef, state: JourneyState): string[] {
  const stage = journey.stages[state.stage]
  if (!stage) throw new JourneyError(`unknown stage ${state.stage}`)
  const interrupts = Object.entries(journey.interrupts)
    .filter(([, i]) => i.next !== state.stage)
    .map(([id]) => id)
  return [...Object.keys(stage.outcomes), ...interrupts]
}

export function next(journey: JourneyDef, codes: KnownCodes, state: JourneyState, input: JourneyInput): JourneyResult {
  if (!availableInputs(journey, state).includes(input.outcome)) {
    throw new JourneyError(`outcome ${input.outcome} is not available at stage ${state.stage}`)
  }
  const history = [...state.history, { stage: state.stage, outcome: input.outcome, at: input.at }]

  const interrupt = journey.interrupts[input.outcome]
  if (interrupt && !journey.stages[state.stage]!.outcomes[input.outcome]) {
    return { state: enter(journey, { ...state, history, lane: null }, interrupt.next), thenKey: null, interrupt: true }
  }

  const outcome = journey.stages[state.stage]!.outcomes[input.outcome]!
  const updated: JourneyState = { ...state, history, tries: { ...state.tries } }
  applySets(journey, codes, outcome, input, updated)

  const triesKey = `${state.stage}.${input.outcome}`
  updated.tries[triesKey] = (state.tries[triesKey] ?? 0) + 1
  if (outcome.maxTries !== null && outcome.afterMax && updated.tries[triesKey]! >= outcome.maxTries) {
    return { state: enter(journey, updated, outcome.afterMax), thenKey: null, interrupt: false }
  }

  if (outcome.climb) {
    const rungs = journey.stages[state.stage]!.ladder
    updated.ladderStep = Math.min(state.ladderStep + 1, Math.max(rungs - 1, 0))
  }
  return { state: enter(journey, updated, outcome.next), thenKey: outcomeKey(state.stage, input.outcome, 'then'), interrupt: false }
}

function applySets(journey: JourneyDef, codes: KnownCodes, outcome: OutcomeDef, input: JourneyInput, s: JourneyState) {
  if (outcome.sets === 'lane') {
    if (!input.lane || !codes.lanes.includes(input.lane)) throw new JourneyError(`a known lane is required, got ${input.lane}`)
    s.lane = input.lane
  }
  if (outcome.setsLane) s.lane = outcome.setsLane
  if (outcome.sets === 'route') {
    if (!input.route || !codes.routes.includes(input.route)) throw new JourneyError(`a known route is required, got ${input.route}`)
    s.route = input.route
  }
  if (outcome.sets === 'route_if_unknown') s.route = journey.facts.route.ifUnknownRoute
  if (outcome.records === 'visit_date' && input.visitDate) s.visitDate = input.visitDate
}

// Entering the start stage begins a fresh description of the situation: the lane
// is cleared, the route (shared by all threads) is kept.
function enter(journey: JourneyDef, s: JourneyState, stage: string): JourneyState {
  if (!journey.stages[stage]) throw new JourneyError(`outcome leads to unknown stage ${stage}`)
  return stage === journey.start ? { ...s, stage, lane: null } : { ...s, stage }
}
