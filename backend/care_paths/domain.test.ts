// Seed, export round trip, text fallback and compose (pure domain, no database).
import { describe, expect, it } from 'vitest'
import { compose, ComposeError } from './domain/compose'
import { exportRulesYaml } from './domain/export'
import { addMissingSeedContent } from './domain/merge'
import { buildSeedDoc } from './domain/seed'
import { resolveText } from './domain/texts'
import { ContentError, LANGS } from './domain/types'
import { loadSeedDoc, readSeedFiles } from './seed/load'

const files = readSeedFiles()
const doc = loadSeedDoc()

describe('seed', () => {
  it('moves wording out of the structure into English texts', () => {
    expect(doc.texts['lane.U2.name']?.en?.text).toBe('Alarm symptom')
    expect(doc.texts['journey.outcome.contact.no_answer.card']?.en?.text).toBe('Nobody answered')
    expect(doc.texts['rule.U2.script']?.fi?.text).toContain('Minulla on ollut')
    expect(JSON.stringify(doc.structure)).not.toContain('Nobody answered')
  })

  it('fails loudly on a broken seed', () => {
    expect(() => buildSeedDoc({ ...files, rulesYaml: 'lanes: {}\n' })).toThrow(ContentError)
    expect(() => buildSeedDoc({ ...files, uiYamls: ['lane.U2.name: {en: x}'] })).toThrow(/ui seed keys/)
    expect(() => buildSeedDoc({ ...files, uiYamls: ['ui.x.y: {en: a, b, fi: c}'] })).toThrow(/unknown language keys/)
  })
})

describe('languages', () => {
  it('ships 13 languages; the added languages translate nearly every Finnish key with intact placeholders', () => {
    expect(doc.languages.map((l) => l.code)).toEqual(['en', 'fi', 'sv', 'ru', 'et', 'uk', 'ar', 'so', 'fa', 'zh', 'yue', 'vi', 'th'])
    expect(doc.languages.map((l) => l.code)).toEqual([...LANGS])
    expect(doc.languages.filter((l) => l.dir === 'rtl').map((l) => l.code)).toEqual(['ar', 'fa'])
    expect(doc.languages.filter((l) => !l.placeholder).map((l) => l.code)).toEqual(['en', 'fi'])
    expect(doc.languages.find((l) => l.code === 'sv')?.profile).toBe('C1')
    const required = Object.keys(doc.texts).filter((k) => doc.texts[k]?.fi)
    for (const lang of ['sv', 'ru', 'et', 'uk', 'fa', 'zh', 'yue', 'vi', 'th'] as const) {
      // New keys may land in en/fi first (residents then get English); a broken file would not.
      const present = required.filter((k) => doc.texts[k]?.[lang]?.text)
      expect(present.length / required.length, lang).toBeGreaterThan(0.9)
      for (const k of present) {
        const vars = (doc.texts[k]!.en!.text.match(/\{\w+\}/g) ?? []).sort()
        expect((doc.texts[k]![lang]!.text.match(/\{\w+\}/g) ?? []).sort(), `${lang} ${k}`).toEqual(vars)
      }
    }
  })
})

describe('seed merge', () => {
  it('adds missing languages and texts to admin-edited content without overwriting', () => {
    const edited = structuredClone(doc)
    edited.languages = edited.languages.filter((l) => ['en', 'fi', 'ar', 'so'].includes(l.code))
    edited.texts['lane.U2.name'] = { ...edited.texts['lane.U2.name'], en: { text: 'Admin wording', review: 'checked' } }
    delete edited.texts['lane.U2.name']!.sv
    const merged = addMissingSeedContent(edited, doc)!
    expect(merged.languages.map((l) => l.code)).toEqual(['en', 'fi', 'ar', 'so', 'sv', 'ru', 'et', 'uk', 'fa', 'zh', 'yue', 'vi', 'th'])
    expect(merged.texts['lane.U2.name']?.en?.text).toBe('Admin wording')
    expect(merged.texts['lane.U2.name']?.sv?.text).toBe(doc.texts['lane.U2.name']?.sv?.text)
    expect(addMissingSeedContent(doc, doc)).toBeNull()
  })
})

describe('export', () => {
  it('round-trips: exporting and re-seeding gives the same structure and English texts', () => {
    const again = buildSeedDoc({ ...files, rulesYaml: exportRulesYaml(doc) })
    expect(again.structure).toEqual(doc.structure)
    for (const [key, byLang] of Object.entries(doc.texts)) {
      expect(again.texts[key]?.en?.text, key).toBe(byLang.en?.text)
    }
  })
})

describe('texts', () => {
  it('falls back to English and says so', () => {
    const d = structuredClone(doc)
    delete d.texts['lane.U2.name']!.so
    expect(resolveText(d, 'lane.U2.name', 'so')).toMatchObject({ text: 'Alarm symptom', lang: 'en', fallback: true })
    expect(resolveText(d, 'nope', 'so')).toBeNull()
  })
})

describe('compose', () => {
  it('fills the door into the title and gives the Finnish script', () => {
    const path = compose(doc, { lane: 'U2', route: 'A1', profile: 'C2', barriers: [], lang: 'en' })
    expect(path.destination.title).toBe('Contact the county health station and ask for an assessment today')
    expect(path.destination.scriptFi).toContain('Minulla on ollut')
    expect(path.clocks.map((c) => c.basis)).toContain('legal')
    expect(path.emergency).toBe(false)
  })

  it('uses the route-specific rule and the no-guarantee clocks', () => {
    expect(compose(doc, { lane: 'U2', route: 'A5', profile: 'C2', barriers: [], lang: 'en' }).destination.title).toContain("doctor's assessment")
    const a2 = compose(doc, { lane: 'U2', route: 'A2', profile: 'C2', barriers: [], lang: 'en' })
    expect(a2.clocks.map((c) => c.basis)).toEqual(['open', 'recommended'])
    expect(a2.reviewFlags.map((f) => f.kind)).toEqual(['clinical', 'legal'])
  })

  it('language and barriers never change destination or clocks', () => {
    const base = compose(doc, { lane: 'U3', route: 'A1', profile: 'C1', barriers: [], lang: 'en' })
    for (const profile of Object.keys(doc.structure.profiles)) {
      const p = compose(doc, { lane: 'U3', route: 'A1', profile, barriers: Object.keys(doc.structure.barriers), lang: 'en' })
      expect(p.destination).toEqual(base.destination)
      expect(p.clocks).toEqual(base.clocks)
    }
  })

  it('stops at 112 for the emergency lane and refuses unknown codes', () => {
    const e = compose(doc, { lane: 'U0', route: 'A1', profile: 'C1', barriers: [], lang: 'en' })
    expect(e.emergency).toBe(true)
    expect(e.steps).toHaveLength(2)
    expect(() => compose(doc, { lane: 'U9', route: 'A1', profile: 'C1', barriers: [], lang: 'en' })).toThrow(ComposeError)
    expect(() => compose(doc, { lane: 'U2', route: 'A1', profile: 'C1', barriers: ['B99'], lang: 'en' })).toThrow(ComposeError)
  })
})
