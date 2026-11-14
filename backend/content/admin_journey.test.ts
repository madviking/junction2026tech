// Journey editor: pure structural edits, the graph view, the feature flag on the
// endpoints, and edit → validation issues → publish refused (Encore test database, no
// mocks). Signed-in calls cannot go through the gateway in tests, so the database flow
// uses the exported helpers of admin_journey_api.ts.
import { describe, expect, it } from 'vitest'
import { listAudit } from '../admin/repository'
import { loadSeedDoc } from '../care_paths/seed/load'
import { validateDoc } from '../care_paths/domain/validate'
import * as journey from './admin_journey'
import {
  applyJourneyEdit,
  currentGraph,
  journeyAddOutcome,
  journeyAddStage,
  journeyGraph,
  journeyRemoveOutcome,
  journeyRemoveStage,
  journeySetNext,
} from './admin_journey_api'
import * as texts from './admin_texts'
import { live } from './content'
import { JOURNEY_EDITOR_ENABLED } from './features'
import * as service from './service'

const ACTOR = 'journey-editor-test@example.test'
const seed = loadSeedDoc()
const fresh = () => structuredClone(seed)
const errors = (doc: ReturnType<typeof fresh>) => validateDoc(doc).filter((i) => i.severity === 'error')
const outcome = { stage: 'wait', id: 'jt_moved', next: 'closed', cardEn: 'I moved away', cardFi: 'Muutin pois' }

describe('structural edits (pure)', () => {
  it('adds a stage before closed with its question in en and fi, then an outcome makes it valid', () => {
    const doc = fresh()
    journey.addStage(doc, { id: 'jt_extra', askEn: 'What now?', askFi: 'Mitä nyt?' })
    const ids = Object.keys(doc.structure.journey.stages)
    expect(ids.indexOf('jt_extra')).toBe(ids.indexOf('closed') - 1)
    expect(doc.texts['journey.stage.jt_extra.ask']).toEqual({ en: { text: 'What now?', review: 'unchecked' }, fi: { text: 'Mitä nyt?', review: 'unchecked' } })
    // A non-terminal stage without outcomes is an error; nothing leads to it yet (warning).
    expect(errors(doc).map((i) => i.path)).toContain('journey.stages.jt_extra')
    journey.addOutcome(doc, { stage: 'jt_extra', id: 'done', next: 'closed', cardEn: 'Done', cardFi: 'Valmis' })
    journey.setNext(doc, { stage: 'wait', id: 'stopped', next: 'jt_extra' })
    expect(errors(doc)).toEqual([])
  })

  it('adds a terminal stage without a question', () => {
    const doc = fresh()
    journey.addStage(doc, { id: 'jt_end', terminal: true, askEn: '', askFi: '' })
    expect(doc.structure.journey.stages.jt_end).toMatchObject({ terminal: true, outcomes: {} })
    expect(doc.texts['journey.stage.jt_end.ask']).toBeUndefined()
  })

  it('refuses bad ids, duplicates and missing texts', () => {
    const doc = fresh()
    for (const id of ['A', 'x', '1abc', 'has-dash', 'a'.repeat(42)]) {
      expect(() => journey.addStage(doc, { id, askEn: 'q', askFi: 'q' })).toThrow(/must match/)
    }
    expect(() => journey.addStage(doc, { id: 'wait', askEn: 'q', askFi: 'q' })).toThrow(/already exists/)
    expect(() => journey.addStage(doc, { id: 'jt_q', askEn: 'q', askFi: ' ' })).toThrow(/Finnish/)
    expect(() => journey.addOutcome(doc, { ...outcome, id: 'stopped' })).toThrow(/already has/)
    expect(() => journey.addOutcome(doc, { ...outcome, id: 'emergency_sign' })).toThrow(/interrupt/)
    expect(() => journey.addOutcome(doc, { ...outcome, stage: 'nope' })).toThrow(/no stage/)
    expect(() => journey.addOutcome(doc, { ...outcome, next: 'Bad Next' })).toThrow(/must match/)
    expect(() => journey.addOutcome(doc, { ...outcome, cardEn: '' })).toThrow(/English/)
    expect(() => journey.setNext(doc, { stage: 'wait', id: 'nope', next: 'closed' })).toThrow(/no outcome/)
  })

  it('keeps an unknown next in the document and validation reports it', () => {
    const doc = fresh()
    journey.addOutcome(doc, { ...outcome, next: 'jt_nowhere' })
    expect(doc.structure.journey.stages.wait!.outcomes.jt_moved!.next).toBe('jt_nowhere')
    expect(errors(doc)).toContainEqual({ severity: 'error', path: 'journey.stages.wait.outcomes.jt_moved.next', message: 'unknown stage jt_nowhere' })
    journey.setNext(doc, { stage: 'wait', id: 'jt_moved', next: 'closed' })
    expect(errors(doc)).toEqual([])
  })

  it('removes an outcome with its texts, but not a clinician answer card', () => {
    const doc = fresh()
    journey.addOutcome(doc, outcome)
    journey.removeOutcome(doc, { stage: 'wait', id: 'jt_moved' })
    expect(doc.structure.journey.stages.wait!.outcomes.jt_moved).toBeUndefined()
    expect(doc.texts['journey.outcome.wait.jt_moved.card']).toBeUndefined()
    const clinician = doc.cards.clinician[0]!.outcome
    expect(() => journey.removeOutcome(doc, { stage: doc.cards.clinicianStage, id: clinician })).toThrow(/clinician/)
    journey.removeOutcome(doc, { stage: 'wait', id: 'stopped' })
    expect(doc.texts['journey.outcome.wait.stopped.then']).toBeUndefined()
  })

  it('refuses to remove start, closed, or a stage that others lead to, listing them', () => {
    const doc = fresh()
    expect(() => journey.removeStage(doc, 'closed')).toThrow(/cannot be removed/)
    expect(() => journey.removeStage(doc, doc.structure.journey.start)).toThrow(/start stage/)
    expect(() => journey.removeStage(doc, 'nope')).toThrow(/no stage/)
    expect(() => journey.removeStage(doc, 'stalled')).toThrow(/journey\.stages\.contact\.outcomes\.no_answer\.after_max/)
    expect(journey.stageReferences(doc, 'stalled')).toEqual(
      expect.arrayContaining(['journey.stages.contact.outcomes.refused.next', 'journey.stages.wait.overdue.next']),
    )
    // Self-links do not block: stalled → stalled is removed with the stage.
    expect(journey.stageReferences(doc, 'stalled')).not.toContain('journey.stages.stalled.outcomes.still_nothing.next')
  })

  it('removes an unused stage with all its texts and stays valid', () => {
    const doc = fresh()
    journey.addStage(doc, { id: 'jt_tmp', askEn: 'Q?', askFi: 'K?' })
    journey.addOutcome(doc, { stage: 'jt_tmp', id: 'go', next: 'closed', cardEn: 'Go', cardFi: 'Mene' })
    journey.removeStage(doc, 'jt_tmp')
    expect(doc.structure.journey.stages.jt_tmp).toBeUndefined()
    expect(Object.keys(doc.texts).filter((k) => k.includes('jt_tmp'))).toEqual([])
    expect(errors(doc)).toEqual([])
  })

  it('builds an ordered graph with English texts', () => {
    const graph = journey.buildGraph(seed, { source: 'live', basedOnVersion: 3, issues: [], reviewFlags: texts.reviewFlags(seed) })
    expect(graph).toMatchObject({ enabled: true, source: 'live', basedOnVersion: 3, start: 'describe' })
    expect(graph.stages.map((s) => s.id).slice(0, 3)).toEqual(['describe', 'route', 'contact'])
    const contact = graph.stages.find((s) => s.id === 'contact')!
    expect(contact.ask).toBe('What happened when you contacted them?')
    expect(contact.outcomes.find((o) => o.id === 'no_answer')).toMatchObject({ card: 'Nobody answered', next: 'contact', maxTries: 2, afterMax: 'stalled' })
    expect(graph.stages.find((s) => s.id === 'closed')).toMatchObject({ terminal: true, ask: null })
    expect(graph.interrupts.map((i) => i.id)).toEqual(['emergency_sign', 'something_changed'])
    expect(graph.reviewFlags.some((f) => f.kind === 'legal')).toBe(true)
  })
})

describe('feature flag', () => {
  it('is off by default: graph says disabled and every write is refused', async () => {
    expect(JOURNEY_EDITOR_ENABLED).toBe(false)
    expect(await journeyGraph()).toMatchObject({ enabled: false, stages: [] })
    const writes: [string, () => Promise<unknown>][] = [
      ['stage', () => journeyAddStage({ id: 'jt_x', askEn: 'q', askFi: 'q' })],
      ['stage/remove', () => journeyRemoveStage({ id: 'jt_x' })],
      ['outcome', () => journeyAddOutcome(outcome)],
      ['outcome/remove', () => journeyRemoveOutcome({ stage: 'wait', id: 'jt_moved' })],
      ['outcome/next', () => journeySetNext({ stage: 'wait', id: 'jt_moved', next: 'closed' })],
    ]
    for (const [name, call] of writes) {
      await expect(call(), name).rejects.toMatchObject({ code: 'failed_precondition', message: 'journey editor is disabled' })
    }
  })
})

describe.sequential('draft edits (database)', () => {
  it('an outcome to an unknown stage shows an issue and publish is refused; fixed, it validates; audited', async () => {
    await service.discardDraft()
    const before = await live({ lang: 'en' })
    const add = (doc: Parameters<typeof journey.addOutcome>[0]) => journey.addOutcome(doc, { ...outcome, next: 'jt_nowhere' })
    const broken = await applyJourneyEdit(ACTOR, 'outcome.add', 'wait.jt_moved', { next: 'jt_nowhere' }, add)
    expect(broken.source).toBe('draft')
    expect(broken.stages.find((s) => s.id === 'wait')!.outcomes.at(-1)).toMatchObject({ id: 'jt_moved', card: 'I moved away', next: 'jt_nowhere' })
    expect(broken.issues).toContainEqual(expect.objectContaining({ severity: 'error', path: 'journey.stages.wait.outcomes.jt_moved.next' }))

    await expect(texts.publishDraft(ACTOR, 'journey test')).rejects.toMatchObject({ code: 'invalid_argument' })
    const after = await live({ lang: 'en' })
    expect(after.version).toBe(before.version)
    expect(after.journey).toEqual(before.journey)

    const fixed = await applyJourneyEdit(ACTOR, 'outcome.next', 'wait.jt_moved', { next: 'closed' }, (doc) =>
      journey.setNext(doc, { stage: 'wait', id: 'jt_moved', next: 'closed' }),
    )
    expect(fixed.issues.filter((i) => i.severity === 'error')).toEqual([])
    const removed = await applyJourneyEdit(ACTOR, 'outcome.remove', 'wait.jt_moved', {}, (doc) => journey.removeOutcome(doc, { stage: 'wait', id: 'jt_moved' }))
    expect(removed.stages.find((s) => s.id === 'wait')!.outcomes.map((o) => o.id)).not.toContain('jt_moved')

    // A refused edit leaves the draft as it was.
    await expect(applyJourneyEdit(ACTOR, 'stage.remove', 'closed', {}, (doc) => journey.removeStage(doc, 'closed'))).rejects.toMatchObject({ code: 'failed_precondition' })

    await service.discardDraft()
    expect((await currentGraph()).source).toBe('live')
    const mine = (await listAudit(200)).filter((a) => a.actor === ACTOR).map((a) => `${a.action} ${a.target}`)
    expect(mine).toEqual(expect.arrayContaining(['content.journey.outcome.add wait.jt_moved', 'content.journey.outcome.next wait.jt_moved', 'content.journey.outcome.remove wait.jt_moved']))
  })
})
