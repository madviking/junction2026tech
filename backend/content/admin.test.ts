// Content admin: text rows, filters, draft diff, publish refusal, rollback, audit
// (Encore test database, no mocks). Authenticated calls cannot go through the gateway
// in tests, so the logic is tested through admin_texts.ts; the endpoints are tested
// for rejecting anonymous calls.
import { describe, expect, it } from 'vitest'
import { listAudit } from '../admin/repository'
import { structureKeys } from '../care_paths/domain/keys'
import { loadSeedDoc } from '../care_paths/seed/load'
import {
  adminDiscard,
  adminDraft,
  adminExport,
  adminPublish,
  adminReviewFlags,
  adminRollback,
  adminSetReview,
  adminSetText,
  adminTexts,
  adminVersions,
} from './admin'
import * as texts from './admin_texts'
import { live } from './content'
import * as service from './service'

const ACTOR = 'content-admin-test@example.test'
const KEY = 'journey.outcome.contact.no_answer.card'
const THEN = 'journey.outcome.contact.no_answer.then'
const doc = loadSeedDoc()
const ALL = { lang: null, filter: 'all', search: '', group: '' } as const

describe('admin endpoints', () => {
  it('reject anonymous calls', async () => {
    const calls: [string, () => Promise<unknown>][] = [
      ['texts', () => adminTexts({})],
      ['setText', () => adminSetText({ key: KEY, lang: 'en', text: 'x' })],
      ['review', () => adminSetReview({ key: KEY, lang: 'en', status: 'checked' })],
      ['draft', () => adminDraft()],
      ['publish', () => adminPublish({})],
      ['discard', () => adminDiscard()],
      ['versions', () => adminVersions()],
      ['rollback', () => adminRollback({ version: 1 })],
      ['export', () => adminExport()],
      ['reviewFlags', () => adminReviewFlags()],
    ]
    for (const [name, call] of calls) await expect(call(), name).rejects.toMatchObject({ code: 'unauthenticated' })
  })
})

describe('text rows (pure)', () => {
  it('lists every structure key in structure order, then free ui/step keys', () => {
    const rows = texts.buildRows(doc, null, ALL)
    const keys = rows.map((r) => r.key)
    const { required, optional } = structureKeys(doc)
    expect(new Set(keys.filter((k) => !k.startsWith('ui.') && !k.startsWith('step.')))).toEqual(new Set([...required, ...optional]))
    // Lanes first, then routes ...; ui and step last.
    expect(rows[0]).toMatchObject({ key: 'lane.U0.name', group: 'lane', required: true })
    const firstUi = keys.findIndex((k) => k.startsWith('ui.') || k.startsWith('step.'))
    expect(firstUi).toBeGreaterThan(0)
    expect(keys.slice(firstUi).every((k) => k.startsWith('ui.') || k.startsWith('step.'))).toBe(true)
    // An outcome's optional "then" follows its card; stages keep their order.
    expect(keys.indexOf(THEN)).toBe(keys.indexOf(KEY) + 1)
    const stageOrder = keys.filter((k) => k.endsWith('.ask')).map((k) => k.split('.')[2])
    expect(stageOrder.slice(0, 3)).toEqual(['describe', 'route', 'contact'])
  })

  it('gives each row a group, a label and one entry per language', () => {
    const rows = texts.buildRows(doc, null, ALL)
    const row = rows.find((r) => r.key === KEY)!
    expect(row).toMatchObject({ group: 'journey.outcome', label: 'contact → Nobody answered · card', required: true, changedInDraft: false })
    expect(row.entries.map((e) => e.lang)).toEqual(doc.languages.map((l) => l.code))
    expect(rows.find((r) => r.key === THEN)).toMatchObject({ label: 'contact → Nobody answered · then', required: false })
    expect(texts.keyGroup('journey.stage.contact.ask')).toBe('journey.stage')
    expect(texts.keyGroup('card.clinician.x.next')).toBe('card.clinician')
    expect(texts.keyGroup('rule.U2.A1.title')).toBe('rule')
    expect(texts.textLabel(doc, 'journey.stage.contact.ask')).toBe('contact · question')
    expect(texts.textLabel(doc, 'lane.U2.trigger')).toBe('U2 Alarm symptom · trigger')
    const groups = new Set(rows.map((r) => r.group))
    for (const g of ['lane', 'route', 'profile', 'barrier', 'rule', 'journey.stage', 'journey.outcome', 'journey.fact', 'card.symptom', 'step']) expect(groups).toContain(g)
    expect(groups).not.toContain('other')
    expect(texts.buildRows(doc, null, { ...ALL, group: 'lane' }).every((r) => r.group === 'lane')).toBe(true)
    expect(texts.buildRows(doc, null, { ...ALL, search: 'nobody answered' }).map((r) => r.key)).toContain(KEY)
  })

  it('filters needs_review and missing, overall and for one language', () => {
    const d = structuredClone(doc)
    for (const byLang of Object.values(d.texts)) for (const e of Object.values(byLang)) Object.assign(e, { review: 'checked', reviewer: 'r', reviewedAt: '2026-11-14T00:00:00.000Z' })
    d.texts[KEY]!.so = { text: 'Qofna kama jawaabin', review: 'unchecked' }
    delete d.texts['lane.U2.name']!.ar
    delete d.texts[THEN]
    const needs = texts.buildRows(d, null, { ...ALL, filter: 'needs_review' }).map((r) => r.key)
    expect(needs).toEqual([KEY])
    expect(texts.buildRows(d, null, { ...ALL, filter: 'needs_review', lang: 'so' }).map((r) => r.key)).toEqual([KEY])
    expect(texts.buildRows(d, null, { ...ALL, filter: 'needs_review', lang: 'fi' })).toEqual([])
    const missingAr = texts.buildRows(d, null, { ...ALL, filter: 'missing', lang: 'ar' }).map((r) => r.key)
    expect(missingAr).toContain('lane.U2.name')
    expect(missingAr).not.toContain(THEN) // optional key unused in every language
    expect(texts.buildRows(d, null, { ...ALL, filter: 'missing', lang: 'fi' }).map((r) => r.key)).not.toContain('lane.U2.name')
  })

  it('diffs draft texts against live and marks changed rows', () => {
    const d = structuredClone(doc)
    d.texts[KEY]!.en = { text: 'Nobody picked up', review: 'unchecked' }
    expect(texts.changedKeys(d, doc)).toEqual([KEY])
    expect(texts.buildRows(d, doc, ALL).filter((r) => r.changedInDraft).map((r) => r.key)).toEqual([KEY])
  })

  it('lists review flags from the structure', () => {
    const d = structuredClone(doc)
    const lane = Object.keys(d.structure.lanes)[0]!
    d.structure.lanes[lane]!.needsClinicalReview = true
    const flags = texts.reviewFlags(d)
    expect(flags).toContainEqual(expect.objectContaining({ kind: 'clinical', path: `lanes.${lane}` }))
    for (const f of flags) expect(['clinical', 'legal']).toContain(f.kind)
  })
})

describe.sequential('admin writes (database)', () => {
  it('edits a text into the draft, shows the diff, audits, and refuses unknown keys', async () => {
    const summary = await texts.editText(ACTOR, KEY, 'en', 'Nobody picked up (admin test)')
    expect(summary.exists).toBe(true)
    expect(summary.changedKeys).toContain(KEY)
    const listed = await texts.listTexts({ filter: 'needs_review', lang: 'en', search: 'admin test' })
    expect(listed.draftExists).toBe(true)
    expect(listed.rows.find((r) => r.key === KEY)?.changedInDraft).toBe(true)
    expect(listed.rows.find((r) => r.key === THEN)?.changedInDraft ?? false).toBe(false)
    await expect(texts.editText(ACTOR, 'nope.key', 'en', 'x')).rejects.toThrow(/unknown text key/)
    await expect(texts.listTexts({ lang: 'xx' })).rejects.toThrow(/unknown language/)

    const reviewed = await texts.reviewText(ACTOR, KEY, 'en', 'checked')
    expect(reviewed.changedKeys).toContain(KEY)
    const detail = await texts.draftDetail()
    expect(JSON.parse(detail.docJson).texts[KEY].en).toMatchObject({ review: 'checked', reviewer: ACTOR })

    const after = await texts.discard(ACTOR)
    expect(after).toMatchObject({ exists: false, changedKeys: [] })
    const mine = (await listAudit(200)).filter((a) => a.actor === ACTOR).map((a) => `${a.action} ${a.target}`)
    expect(mine).toEqual(expect.arrayContaining([`content.text.update ${KEY}/en`, `content.review.update ${KEY}/en`, 'content.draft.discard draft']))
  })

  it('refuses to publish an invalid draft and leaves the live bundle unchanged', async () => {
    const before = await live({ lang: 'en' })
    await service.updateDraft(ACTOR, (d) => {
      d.structure.journey.start = 'nowhere'
    })
    expect((await texts.draftSummary()).errors).toBeGreaterThan(0)
    await expect(texts.publishDraft(ACTOR, 'broken')).rejects.toMatchObject({ code: 'invalid_argument' })
    const after = await live({ lang: 'en' })
    expect(after.version).toBe(before.version)
    expect(after.journey).toEqual(before.journey)
    await texts.discard(ACTOR)
  })

  it('publishes, rolls back to restore the old text, and audits both', async () => {
    const before = await live({ lang: 'en' })
    await texts.editText(ACTOR, KEY, 'en', 'Nobody answered (rollback test)')
    const published = await texts.publishDraft(ACTOR, 'admin test')
    // New versions number from the highest one, which may be above the live one after a rollback.
    expect(published).toMatchObject({ live: true, note: 'admin test' })
    expect(published.version).toBeGreaterThan(before.version)
    expect((await live({ lang: 'en' })).texts[KEY]?.text).toBe('Nobody answered (rollback test)')

    const rolled = await texts.rollbackTo(ACTOR, before.version)
    expect(rolled).toMatchObject({ version: before.version, live: true })
    expect((await live({ lang: 'en' })).texts[KEY]?.text).toBe(before.texts[KEY]?.text)
    await expect(texts.rollbackTo(ACTOR, 0)).rejects.toThrow(/positive/)

    const mine = (await listAudit(200)).filter((a) => a.actor === ACTOR).map((a) => `${a.action} ${a.target}`)
    expect(mine).toEqual(expect.arrayContaining([`content.publish v${published.version}`, `content.rollback v${before.version}`]))
  })
})
