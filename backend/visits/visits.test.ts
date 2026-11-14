// Visits against Encore's test database and the seeded live content (no mocks).
import { createHash } from 'node:crypto'
import { hashCode } from './code'
import { SQLDatabase } from 'encore.dev/storage/sqldb'
import { describe, expect, it } from 'vitest'
import { content } from '~encore/clients'
import { resolveText } from '../care_paths/domain/texts'
import type { ContentDoc } from '../care_paths/domain/types'
import { addEvent, back, clinicianAnswers, countyCounts, create, get, nextSteps, remove, summary } from './visits'

const db = SQLDatabase.named('silta')
const CODE_RE = /^SLT-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/

const liveDoc = async () => JSON.parse((await content.liveDoc()).docJson) as ContentDoc
const testCounty = () => `test_${Math.random().toString(36).slice(2, 10)}`

describe('visit journey', () => {
  it('goes back one step at a time, and not past the start or a clinician answer', async () => {
    const v0 = await create({ lang: 'en', county: testCounty() })
    expect(v0.canGoBack).toBe(false)
    await expect(back({ code: v0.code })).rejects.toMatchObject({ code: 'failed_precondition' })

    await addEvent({ code: v0.code, lang: 'en', outcome: 'symptom', symptoms: ['lump'] })
    const contact = await addEvent({ code: v0.code, lang: 'en', outcome: 'door_known', route: 'A1' })
    expect(contact.state).toMatchObject({ stage: 'contact', route: 'A1' })
    expect(contact.canGoBack).toBe(true)

    // Back to the route question: the lane and the chosen symptoms stay, the route is gone.
    const route = await back({ code: v0.code, lang: 'en' })
    expect(route.state).toMatchObject({ stage: 'route', lane: 'U2', route: null })
    expect(route.carePath).toBeNull()
    expect(route.history.map((h) => h.outcome)).toEqual(['symptom'])
    expect(route.symptoms.filter((s) => s.selected).map((s) => s.id)).toEqual(['lump'])

    // Back again to the first question; nothing is left to undo.
    const start = await back({ code: v0.code, lang: 'en' })
    expect(start.state).toMatchObject({ stage: 'describe', lane: null })
    expect(start.history).toEqual([])
    expect(start.canGoBack).toBe(false)

    // A mistaken emergency tap can be undone to the stage the person was on.
    await addEvent({ code: v0.code, lang: 'en', outcome: 'symptom', symptoms: ['lump'] })
    await addEvent({ code: v0.code, lang: 'en', outcome: 'emergency_sign' })
    expect((await back({ code: v0.code, lang: 'en' })).state).toMatchObject({ stage: 'route', lane: 'U2' })

    // After a clinician answer the resident cannot undo what came before it.
    await addEvent({ code: v0.code, lang: 'en', outcome: 'door_known', route: 'A1' })
    await clinicianAnswers({ code: v0.code, answers: ['referral_sent'] })
    expect((await get({ code: v0.code, lang: 'en' })).canGoBack).toBe(false)
    await expect(back({ code: v0.code })).rejects.toMatchObject({ code: 'failed_precondition' })
  })

  it('runs describe → route → contact → wait → clinician answers → next steps', async () => {
    const county = testCounty()
    const before = await countyCounts({ county })
    expect(before.total).toBe(0)

    const v0 = await create({ lang: 'so', county })
    expect(v0.code).toMatch(CODE_RE)
    expect(v0.state.stage).toBe('describe')
    expect(v0.outcomes.map((o) => o.id)).toEqual(['symptom', 'letter', 'waiting'])
    // something_changed leads to describe, so it is not offered at describe.
    expect(v0.interrupts.map((i) => i.id)).toEqual(['emergency_sign'])
    expect(v0.symptoms.length).toBeGreaterThan(5)

    // The client's lane is ignored; the lane is the most urgent one among the cards (lump U2 < tired U3).
    const v1 = await addEvent({ code: v0.code, lang: 'so', outcome: 'symptom', symptoms: ['tired', 'lump'], duration: 'months_1_3', lane: 'U0' } as never)
    expect(v1.durations.filter((d) => d.selected).map((d) => d.id)).toEqual(['months_1_3'])
    expect(v1.state).toMatchObject({ stage: 'route', lane: 'U2' })
    expect(v1.symptoms.filter((s) => s.selected).map((s) => s.id)).toEqual(['lump', 'tired'])

    const v2 = await addEvent({ code: v0.code, lang: 'so', outcome: 'door_known', route: 'A1' })
    expect(v2.state).toMatchObject({ stage: 'contact', route: 'A1' })
    expect(v2.carePath).toMatchObject({ lane: 'U2', route: 'A1', profile: 'C3' })
    // The call script names the tapped symptom cards in Finnish, in the order they were sent.
    const symptomLines = v2.carePath!.callScript.find((p) => p.id === 'symptoms')!.lines.filter((l) => l.item)
    expect(symptomLines.map((l) => l.key)).toEqual(['card.symptom.tired.card', 'card.symptom.lump.card'])
    expect(v2.carePath!.callScript.find((p) => p.id === 'opening')!.lines.map((l) => l.fi)).toContain('Kieleni on somali.')
    expect(v2.carePath!.callScript.find((p) => p.id === 'symptoms')!.lines.map((l) => l.key)).toContain('step.call.since.months_1_3')

    const v3 = await addEvent({ code: v0.code, lang: 'so', outcome: 'got_time', visitDate: '2026-11-20' })
    expect(v3.state).toMatchObject({ stage: 'wait', visitDate: '2026-11-20' })

    const s0 = await summary({ code: v0.code })
    expect(s0.language.code).toBe('so')
    expect(s0.interpreter.needed).toBe(true)
    expect(s0.situation).toBe('Hälyttävä oire')
    expect(s0.route?.door).toBe('hyvinvointialueen terveysasema')
    expect(s0.visitDate).toBe('2026-11-20')
    expect(s0.history).toHaveLength(3)
    expect(s0.answerCards.map((c) => c.outcome)).toEqual(['referral_sent', 'tests_ordered', 'kit_given', 'come_back_if', 'nothing_more'])
    expect(s0.answerCards[0]).toEqual({ outcome: 'referral_sent', text: 'Lähete lähetetty', selected: false })

    // At `wait`: visit_today first, then the first chosen answer in the stage's order.
    const s1 = await clinicianAnswers({ code: v0.code, answers: ['tests_ordered', 'referral_sent'] })
    expect(s1.answerCards.filter((c) => c.selected).map((c) => c.outcome)).toEqual(['referral_sent', 'tests_ordered'])
    const v4 = await get({ code: v0.code })
    expect(v4.state.stage).toBe('followup')
    expect(v4.history.slice(-2).map((h) => [h.stage, h.outcome, h.actor])).toEqual([
      ['wait', 'visit_today', 'clinician'],
      ['visit', 'referral_sent', 'clinician'],
    ])
    expect(v4.nextSteps.map((n) => n.outcome)).toEqual(['tests_ordered', 'referral_sent'])

    const doc = await liveDoc()
    const steps = await nextSteps({ code: v0.code, lang: 'so' })
    expect(steps.steps[1]!.text).toBe(resolveText(doc, 'card.clinician.referral_sent.next', 'so')!.text)

    // Re-posting adds answers but moves the journey no further.
    const s2 = await clinicianAnswers({ code: v0.code, answers: ['kit_given'] })
    expect(s2.answerCards.filter((c) => c.selected)).toHaveLength(3)
    const v5 = await get({ code: v0.code })
    expect(v5.state.stage).toBe('followup')
    expect(v5.history).toHaveLength(v4.history.length)
    expect(v5.nextSteps).toHaveLength(3)

    const after = await countyCounts({ county })
    expect(after.total).toBe(1)
    expect(after.byStage).toEqual([{ lang: 'so', stage: 'followup', count: 1 }])
    expect(after.byOutcome).toContainEqual({ lang: 'so', stage: 'contact', outcome: 'got_time', count: 1 })
    expect(after.byOutcome).toContainEqual({ lang: 'so', stage: 'visit', outcome: 'referral_sent', count: 1 })
  })

  it('nobody answered twice → stalled, and the ladder climbs', async () => {
    const { code } = await create({ lang: 'en' })
    await addEvent({ code, lang: 'en', outcome: 'letter' })
    const c = await addEvent({ code, lang: 'en', outcome: 'not_sure' })
    expect(c.state).toMatchObject({ stage: 'contact', lane: 'U4', route: 'A1' })

    const once = await addEvent({ code, lang: 'en', outcome: 'no_answer' })
    expect(once.state.stage).toBe('contact')
    expect(once.then).toBe('Try the message channel or call 116117')

    const stalled = await addEvent({ code, lang: 'en', outcome: 'no_answer' })
    expect(stalled.state.stage).toBe('stalled')
    expect(stalled.ladder).toMatchObject({ current: 0 })
    expect(stalled.ladder!.rungs).toHaveLength(4)

    const up = await addEvent({ code, lang: 'en', outcome: 'still_nothing' })
    expect(up.ladder!.current).toBe(1)

    const s = await summary({ code })
    expect(s.interpreter.needed).toBe(true)
    expect(s.flags[0]).toMatch(/\(2×\)$/)
  })

  it('an emergency interrupt from a mid-journey stage; something_changed leads back to describe', async () => {
    const { code } = await create({ lang: 'en' })
    await addEvent({ code, lang: 'en', outcome: 'symptom', symptoms: ['cough'] })
    await addEvent({ code, lang: 'en', outcome: 'door_known', route: 'A2' })
    const e = await addEvent({ code, lang: 'en', outcome: 'emergency_sign' })
    expect(e.state.stage).toBe('emergency')
    expect(e.outcomes).toEqual([])
    expect(e.interrupts.map((i) => i.id)).toEqual(['something_changed'])
    await expect(addEvent({ code, lang: 'en', outcome: 'emergency_sign' })).rejects.toMatchObject({ code: 'invalid_argument' })
    // A first clinician post at a final stage is refused.
    await expect(clinicianAnswers({ code, answers: ['referral_sent'] })).rejects.toMatchObject({ code: 'failed_precondition' })

    const back = await addEvent({ code, lang: 'en', outcome: 'something_changed' })
    expect(back.state).toMatchObject({ stage: 'describe', lane: null, route: 'A2' })
  })

  it('the clinician can answer from any non-final stage (contact, stalled)', async () => {
    const atContact = await create({ lang: 'en' })
    await addEvent({ code: atContact.code, lang: 'en', outcome: 'symptom', symptoms: ['lump'] })
    await addEvent({ code: atContact.code, lang: 'en', outcome: 'door_known', route: 'A1' })
    const s1 = await clinicianAnswers({ code: atContact.code, answers: ['tests_ordered'] })
    expect(s1.answerCards.find((c) => c.outcome === 'tests_ordered')?.selected).toBe(true)
    const v1 = await get({ code: atContact.code })
    expect(v1.state).toMatchObject({ stage: 'followup', lane: 'U2', route: 'A1' })
    expect(v1.nextSteps.map((n) => n.outcome)).toEqual(['tests_ordered'])
    // A second post only adds answers.
    await clinicianAnswers({ code: atContact.code, answers: ['kit_given'] })
    expect((await get({ code: atContact.code })).state.stage).toBe('followup')

    const atStalled = await create({ lang: 'fi' })
    await addEvent({ code: atStalled.code, lang: 'fi', outcome: 'waiting' })
    expect((await get({ code: atStalled.code })).state.stage).toBe('stalled')
    await clinicianAnswers({ code: atStalled.code, answers: ['nothing_more'] })
    const v2 = await get({ code: atStalled.code })
    expect(v2.state).toMatchObject({ stage: 'closed', lane: 'U5' })
    expect(v2.history.at(-1)).toMatchObject({ stage: 'visit', outcome: 'nothing_more', actor: 'clinician' })
    // Re-posting at the final stage after an answer is fine: it only records.
    const s2 = await clinicianAnswers({ code: atStalled.code, answers: ['come_back_if'] })
    expect(s2.answerCards.filter((c) => c.selected).map((c) => c.outcome)).toEqual(['come_back_if', 'nothing_more'])
  })
})

describe('visit privacy and validation', () => {
  it('stores the code only as a hash and accepts sloppy typing', async () => {
    const { code } = await create({ lang: 'fi' })
    const rows = await db.queryAll<{ j: string }>`SELECT row_to_json(v)::text AS j FROM visits v`
    expect(rows.some((r) => r.j.includes(code) || r.j.includes(code.replaceAll('-', '')))).toBe(false)
    // Stored as HMAC with the server pepper, not as a plain sha256 of the code.
    const plain = createHash('sha256').update(code).digest('hex')
    expect(rows.some((r) => r.j.includes(plain))).toBe(false)
    const hash = hashCode(code)
    const row = await db.queryRow<{ n: number }>`SELECT count(*)::int AS n FROM visits WHERE code_hash = ${hash}`
    expect(row?.n).toBe(1)

    const sloppy = ` ${code.toLowerCase().replaceAll('0', 'o').replaceAll('-', ' ')} `
    expect((await get({ code: sloppy })).code).toBe(code)
    const fi = await summary({ code })
    expect(fi.interpreter.needed).toBe(false)
    expect((await get({ code })).interpreterNeeded).toBe(false)
  })

  it('Finnish and Swedish speakers need no interpreter; other languages do', async () => {
    for (const [lang, needed] of [['sv', false], ['en', true], ['th', true]] as const) {
      const { code } = await create({ lang })
      expect((await summary({ code })).interpreter.needed, lang).toBe(needed)
      expect((await get({ code })).interpreterNeeded, lang).toBe(needed)
    }
  })

  it('delete removes the visit and its events', async () => {
    const { code } = await create({ lang: 'en' })
    await addEvent({ code, lang: 'en', outcome: 'symptom', symptoms: ['lump'] })
    const hash = hashCode(code)
    const id = Number((await db.queryRow<{ id: string }>`SELECT id::text AS id FROM visits WHERE code_hash = ${hash}`)!.id)
    const count = async () => (await db.queryRow<{ n: number }>`SELECT count(*)::int AS n FROM visit_events WHERE visit_id = ${id}`)!.n
    expect(await count()).toBe(2)

    await remove({ code })
    expect(await count()).toBe(0)
    await expect(get({ code })).rejects.toMatchObject({ code: 'not_found' })
  })

  it('rejects unknown outcomes, cards, answers, languages and codes', async () => {
    const { code } = await create({ lang: 'en' })
    const bad = (p: Parameters<typeof addEvent>[0]) => expect(addEvent(p)).rejects.toMatchObject({ code: 'invalid_argument' })
    await bad({ code, lang: 'en', outcome: 'fly_away' })
    await bad({ code, lang: 'en', outcome: 'symptom', symptoms: ['made_up'] })
    await bad({ code, lang: 'en', outcome: 'symptom' })
    await bad({ code, lang: 'en', outcome: 'letter', symptoms: ['lump'] })
    await bad({ code, lang: 'en', outcome: 'symptom', symptoms: ['lump'], duration: 'forever' })
    await bad({ code, lang: 'en', outcome: 'letter', duration: 'weeks_2_4' })
    await bad({ code, lang: 'xx', outcome: 'letter' })
    await expect(clinicianAnswers({ code, answers: ['dance'] })).rejects.toMatchObject({ code: 'invalid_argument' })
    await expect(get({ code: 'SLT-0000-0000' })).rejects.toMatchObject({ code: 'not_found' })
    await expect(get({ code: 'nonsense' })).rejects.toMatchObject({ code: 'not_found' })
  })

  it('Somali and Arabic fall back to English where a text is missing', async () => {
    const doc = await liveDoc()
    for (const lang of ['so', 'ar'] as const) {
      const { code } = await create({ lang })
      await addEvent({ code, lang, outcome: 'symptom', symptoms: ['lump'] })
      const v = await addEvent({ code, lang, outcome: 'door_known', route: 'A1' })
      expect(v.ask).toBe(resolveText(doc, 'journey.stage.contact.ask', lang)!.text)
      const missing = ['step.describe', 'step.route'].filter((key) => resolveText(doc, key, lang)!.fallback)
      expect(missing.length).toBeGreaterThan(0)
      for (const key of missing) {
        expect(v.carePath!.steps.map((s) => s.text)).toContain(doc.texts[key]!.en!.text)
      }
    }
  })
})
