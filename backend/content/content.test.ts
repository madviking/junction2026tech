// Content releases against Encore's test database (no mocks).
import { describe, expect, it } from 'vitest'
import { live, liveDoc } from './content'
import * as service from './service'

const ACTOR = 'test-admin'
const KEY = 'journey.outcome.contact.no_answer.card'

describe('content releases', () => {
  it('seeds the rules.yaml content as a published, live version', async () => {
    const releases = await service.listReleases()
    expect(releases.length).toBeGreaterThanOrEqual(1)
    expect(releases.at(-1)).toMatchObject({ version: 1, createdBy: 'seed' })
    expect(releases.filter((r) => r.live)).toHaveLength(1)
    const d = await liveDoc()
    const doc = JSON.parse(d.docJson)
    expect(Object.keys(doc.structure.journey.stages).slice(0, 3)).toEqual(['describe', 'route', 'contact'])
    expect(Object.keys(doc.structure.barriers).slice(0, 3)).toEqual(['B1', 'B2', 'B3'])
  })

  it('serves one language with English fallback flags and keeps stage order', async () => {
    const fi = await live({ lang: 'fi' })
    expect(fi.texts[KEY]).toMatchObject({ text: 'Kukaan ei vastannut', fallback: false })
    expect(fi.journey.stages.map((st) => st.id).slice(0, 3)).toEqual(['describe', 'route', 'contact'])
    const ar = await live({ lang: 'ar' })
    expect(ar.dir).toBe('rtl')
    expect(ar.placeholder).toBe(true)
    await expect(live({ lang: 'xx' })).rejects.toThrow(/unknown language/)
  })

  it('edits go to a draft; residents see them only after publish; rollback restores', async () => {
    const before = await live({ lang: 'en' })
    const draft = await service.setText(ACTOR, KEY, 'en', 'Nobody picked up the phone')
    expect(draft.exists).toBe(true)
    expect(draft.doc.texts[KEY]?.en).toMatchObject({ text: 'Nobody picked up the phone', review: 'unchecked' })
    expect((await live({ lang: 'en' })).texts[KEY]?.text).toBe(before.texts[KEY]?.text)

    const published = await service.publish(ACTOR, 'wording test')
    // Versions number from the highest ever published (other tests publish too).
    expect(published.version).toBeGreaterThan(before.version)
    expect((await live({ lang: 'en' })).texts[KEY]?.text).toBe('Nobody picked up the phone')
    expect((await service.getDraft()).exists).toBe(false)

    await service.rollback(ACTOR, before.version)
    expect((await live({ lang: 'en' })).texts[KEY]?.text).toBe(before.texts[KEY]?.text)
    const versions = await service.listReleases()
    expect(versions.find((r) => r.version === published.version)?.live).toBe(false)
  })

  it('refuses to publish an invalid draft and leaves the live version unchanged', async () => {
    const before = await live({ lang: 'en' })
    await service.updateDraft(ACTOR, (doc) => {
      doc.structure.journey.stages.contact!.outcomes.no_answer!.next = 'nowhere'
    })
    const draft = await service.getDraft()
    expect(draft.issues).toContainEqual(expect.objectContaining({ severity: 'error', path: 'journey.stages.contact.outcomes.no_answer.next' }))
    await expect(service.publish(ACTOR, null)).rejects.toThrow(/invalid/)
    const after = await live({ lang: 'en' })
    expect(after.version).toBe(before.version)
    expect(after.journey.stages.find((st) => st.id === 'contact')!.outcomes.find((o) => o.id === 'no_answer')!.next).toBe('contact')
    await service.discardDraft()
  })

  it('records the reviewer when a text is checked, and a text change resets it', async () => {
    const checked = await service.setReview(ACTOR, KEY, 'fi', 'checked', new Date('2026-11-14T03:00:00Z'))
    expect(checked.doc.texts[KEY]?.fi).toMatchObject({ review: 'checked', reviewer: ACTOR, reviewedAt: '2026-11-14T03:00:00.000Z' })
    const changed = await service.setText(ACTOR, KEY, 'fi', 'Kukaan ei vastannut puhelimeen')
    expect(changed.doc.texts[KEY]?.fi?.review).toBe('unchecked')
    await service.discardDraft()
  })

  it('exports the live version in the rules.yaml shape', async () => {
    const { yaml } = await service.exportLive()
    const en = await live({ lang: 'en' })
    expect(yaml).toContain('journey:')
    expect(yaml).toContain('script_fi:')
    expect(yaml).toContain(en.texts[KEY]!.text)
  })
})
