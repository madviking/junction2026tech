// Journey engine: generated over every stage and outcome in the seed.
import { describe, expect, it } from 'vitest'
import { availableInputs, initialState, JourneyError, next, type JourneyState } from './domain/journey'
import type { JourneyDef } from './domain/types'
import { loadSeedDoc } from './seed/load'

const doc = loadSeedDoc()
const journey: JourneyDef = doc.structure.journey
const codes = { lanes: Object.keys(doc.structure.lanes), routes: Object.keys(doc.structure.routes) }
const AT = '2026-11-14T00:00:00.000Z'
const stages = Object.entries(journey.stages)

// A valid payload for outcomes that need one.
function inputFor(stage: string, outcome: string) {
  const def = journey.stages[stage]!.outcomes[outcome]!
  return {
    outcome,
    at: AT,
    ...(def.sets === 'lane' ? { lane: 'U2' } : {}),
    ...(def.sets === 'route' ? { route: 'A2' } : {}),
    ...(def.records === 'visit_date' ? { visitDate: '2026-11-20' } : {}),
  }
}

function at(stage: string, extra: Partial<JourneyState> = {}): JourneyState {
  return { ...initialState(journey), stage, lane: 'U2', route: 'A1', ...extra }
}

describe('journey engine', () => {
  it('starts at the configured start stage with an empty history', () => {
    const s = initialState(journey)
    expect(s.stage).toBe(journey.start)
    expect(s.history).toEqual([])
    expect(s.lane).toBeNull()
  })

  for (const [stageId, stage] of stages) {
    for (const [outcomeId, outcome] of Object.entries(stage.outcomes)) {
      it(`${stageId} --${outcomeId}--> ${outcome.next}`, () => {
        const result = next(journey, codes, at(stageId), inputFor(stageId, outcomeId))
        expect(result.state.stage).toBe(outcome.next)
        expect(result.state.history.at(-1)).toEqual({ stage: stageId, outcome: outcomeId, at: AT })
      })
    }
  }

  it('every non-terminal stage can reach closed', () => {
    for (const [stageId, stage] of stages) {
      if (stage.terminal) continue
      const seen = new Set<string>([stageId])
      const queue = [stageId]
      while (queue.length) {
        const current = queue.shift()!
        for (const outcomeId of Object.keys(journey.stages[current]!.outcomes)) {
          const target = next(journey, codes, at(current), inputFor(current, outcomeId)).state.stage
          if (!seen.has(target)) {
            seen.add(target)
            queue.push(target)
          }
        }
      }
      expect(seen.has('closed'), `${stageId} cannot reach closed`).toBe(true)
    }
  })

  for (const [stageId, stage] of stages) {
    for (const [interruptId, interrupt] of Object.entries(journey.interrupts)) {
      if (interrupt.next === stageId) continue
      it(`interrupt ${interruptId} works from ${stageId}${stage.terminal ? ' (terminal)' : ''}`, () => {
        const result = next(journey, codes, at(stageId), { outcome: interruptId, at: AT })
        expect(result.state.stage).toBe(interrupt.next)
        expect(result.interrupt).toBe(true)
      })
    }
  }

  it('emergency offers no outcomes; only "something changed" leads out of it', () => {
    expect(availableInputs(journey, at('emergency'))).toEqual(['something_changed'])
    expect(() => next(journey, codes, at('emergency'), { outcome: 'emergency_sign', at: AT })).toThrow(JourneyError)
    expect(next(journey, codes, at('emergency'), { outcome: 'something_changed', at: AT }).state.stage).toBe('describe')
  })

  it('nobody answered twice leads to stalled, then the ladder climbs and stops at the top', () => {
    let s = at('contact')
    s = next(journey, codes, s, { outcome: 'no_answer', at: AT }).state
    expect(s.stage).toBe('contact')
    const second = next(journey, codes, s, { outcome: 'no_answer', at: AT })
    expect(second.state.stage).toBe('stalled')
    expect(second.thenKey).toBeNull()
    s = second.state
    expect(s.ladderStep).toBe(0)
    const rungs = journey.stages.stalled!.ladder
    for (let i = 1; i < rungs + 2; i++) {
      s = next(journey, codes, s, { outcome: 'still_nothing', at: AT }).state
      expect(s.ladderStep).toBe(Math.min(i, rungs - 1))
    }
  })

  it('returns the then-text key of the outcome', () => {
    const r = next(journey, codes, at('contact'), { outcome: 'no_answer', at: AT })
    expect(r.thenKey).toBe('journey.outcome.contact.no_answer.then')
  })

  it('sets the lane from the payload and refuses unknown lanes', () => {
    const r = next(journey, codes, initialState(journey), { outcome: 'symptom', lane: 'U3', at: AT })
    expect(r.state.lane).toBe('U3')
    expect(() => next(journey, codes, initialState(journey), { outcome: 'symptom', at: AT })).toThrow(JourneyError)
    expect(() => next(journey, codes, initialState(journey), { outcome: 'symptom', lane: 'U9', at: AT })).toThrow(JourneyError)
  })

  it('fixed lanes come from the structure', () => {
    expect(next(journey, codes, initialState(journey), { outcome: 'letter', at: AT }).state.lane).toBe('U4')
    expect(next(journey, codes, initialState(journey), { outcome: 'waiting', at: AT }).state.lane).toBe('U5')
  })

  it('a known door sets the route; not sure uses the if-unknown route', () => {
    expect(next(journey, codes, at('route', { route: null }), { outcome: 'door_known', route: 'A3', at: AT }).state.route).toBe('A3')
    expect(() => next(journey, codes, at('route'), { outcome: 'door_known', route: 'A99', at: AT })).toThrow(JourneyError)
    expect(next(journey, codes, at('route', { route: null }), { outcome: 'not_sure', at: AT }).state.route).toBe(
      journey.facts.route.ifUnknownRoute,
    )
  })

  it('records the visit date', () => {
    const r = next(journey, codes, at('contact'), { outcome: 'got_time', visitDate: '2026-12-01', at: AT })
    expect(r.state.visitDate).toBe('2026-12-01')
  })

  it('refuses an outcome that does not belong to the stage', () => {
    expect(() => next(journey, codes, at('contact'), { outcome: 'referral_sent', at: AT })).toThrow(JourneyError)
  })

  it('something changed and reopen start a fresh description but keep the route', () => {
    const changed = next(journey, codes, at('wait'), { outcome: 'something_changed', at: AT }).state
    expect(changed).toMatchObject({ stage: 'describe', lane: null, route: 'A1' })
    const reopened = next(journey, codes, at('closed'), { outcome: 'reopen', at: AT }).state
    expect(reopened).toMatchObject({ stage: 'describe', lane: null, route: 'A1' })
  })

  it('lists stage outcomes then interrupts as the available inputs', () => {
    expect(availableInputs(journey, at('route'))).toEqual(['door_known', 'not_sure', 'emergency_sign', 'something_changed'])
  })

  it('does not mutate the input state', () => {
    const s = at('contact')
    const copy = structuredClone(s)
    next(journey, codes, s, { outcome: 'no_answer', at: AT })
    expect(s).toEqual(copy)
  })
})
