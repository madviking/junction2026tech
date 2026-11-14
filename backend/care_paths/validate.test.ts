import { describe, expect, it } from 'vitest'
import { assertValid, validateDoc } from './domain/validate'
import { ContentError, type ContentDoc } from './domain/types'
import { loadSeedDoc } from './seed/load'

const seed = loadSeedDoc()
const errors = (doc: ContentDoc) => validateDoc(doc).filter((i) => i.severity === 'error')
const mutate = (fn: (d: ContentDoc) => void) => {
  const d = structuredClone(seed)
  fn(d)
  return d
}

describe('content validation', () => {
  it('accepts the seed', () => {
    expect(errors(seed)).toEqual([])
    expect(() => assertValid(seed)).not.toThrow()
  })

  it('refuses an outcome that leads to an unknown stage', () => {
    const d = mutate((x) => (x.structure.journey.stages.contact!.outcomes.no_answer!.next = 'nowhere'))
    expect(errors(d)).toContainEqual(expect.objectContaining({ path: 'journey.stages.contact.outcomes.no_answer.next' }))
    expect(() => assertValid(d)).toThrow(ContentError)
  })

  it('refuses unknown lanes, routes and stages everywhere', () => {
    const d = mutate((x) => {
      x.structure.rules.push({ lane: 'U9', route: null, clocks: [], clocksWithoutCareGuarantee: null })
      x.structure.rules[0]!.route = 'A99'
      x.structure.barriers.B1!.stepStage = 'lunch'
      x.structure.journey.stages.describe!.outcomes.letter!.setsLane = 'U7'
      x.structure.journey.facts.route.ifUnknownRoute = 'A42'
      x.cards.symptoms[0]!.lane = 'U8'
      x.cards.clinician.push({ outcome: 'magic' })
    })
    const paths = errors(d).map((i) => i.path)
    expect(paths).toEqual(
      expect.arrayContaining([
        'rules[7].lane',
        'rules[0].route',
        'barriers.B1.step.stage',
        'journey.stages.describe.outcomes.letter.sets_lane',
        'journey.facts.route.if_unknown.use_route',
        'cards.symptoms[0].lane',
        'cards.clinician.magic',
      ]),
    )
  })

  it('refuses a non-terminal stage that cannot reach closed', () => {
    const d = mutate((x) => {
      x.structure.journey.stages.trap = { terminal: false, ladder: 0, checkIns: [], overdueNext: null, outcomes: {} }
      x.structure.journey.stages.describe!.outcomes.letter!.next = 'trap'
    })
    expect(errors(d).map((i) => i.path)).toEqual(expect.arrayContaining(['journey.stages.trap']))
  })

  it('refuses missing English or Finnish wording for a required key', () => {
    const d = mutate((x) => {
      delete x.texts['lane.U2.name']!.fi
      delete x.texts['journey.outcome.contact.no_answer.card']
    })
    const paths = errors(d).map((i) => i.path)
    expect(paths).toContain('texts.lane.U2.name.fi')
    expect(paths).toContain('texts.journey.outcome.contact.no_answer.card.en')
  })

  it('refuses a lane without a default rule and an unknown clock basis', () => {
    const d = mutate((x) => {
      x.structure.rules = x.structure.rules.filter((r) => !(r.lane === 'U3' && r.route === null))
      x.structure.rules[0]!.clocks[0]!.basis = 'vibes' as never
    })
    const paths = errors(d).map((i) => i.path)
    expect(paths).toContain('lanes.U3')
    expect(paths).toContain('rules[0].clocks[0].basis')
  })

  it('warns about a stage nobody can reach', () => {
    const d = mutate((x) => {
      x.structure.journey.stages.island = {
        terminal: false, ladder: 0, checkIns: [], overdueNext: null,
        outcomes: { done: { next: 'closed', sets: null, setsLane: null, records: null, maxTries: null, afterMax: null, climb: false, review: null } },
      }
      x.texts['journey.stage.island.ask'] = { en: { text: 'x', review: 'unchecked' }, fi: { text: 'x', review: 'unchecked' } }
      x.texts['journey.outcome.island.done.card'] = { en: { text: 'x', review: 'unchecked' }, fi: { text: 'x', review: 'unchecked' } }
    })
    expect(errors(d)).toEqual([])
    expect(validateDoc(d)).toContainEqual(expect.objectContaining({ severity: 'warning', path: 'journey.stages.island' }))
  })
})
