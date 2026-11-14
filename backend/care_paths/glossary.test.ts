// Finnish health care glossary: seed loading, answer cards, transcript correction and
// speech-to-text key terms (pure domain, no database).
import { describe, expect, it } from 'vitest'
import { answerCards, correctTranscript, glossaryIds, sttKeyterms } from './domain/glossary'
import { validateDoc } from './domain/validate'
import { loadSeedDoc } from './seed/load'

const doc = loadSeedDoc()

describe('glossary seed', () => {
  it('loads glossary.yaml as free text keys that validate without warnings', () => {
    expect(doc.texts['glossary.kela_card.term']?.fi?.text).toBe('Kela-kortti')
    expect(glossaryIds(doc)).toContain('kela_card')
    const glossaryIssues = validateDoc(doc).filter((i) => i.path.includes('glossary.'))
    expect(glossaryIssues).toEqual([])
  })
})

describe('answerCards', () => {
  it('gives every entry with a question and an answer, in the person\'s language with English fallback', () => {
    const fi = answerCards(doc, 'fi')
    const kela = fi.find((c) => c.id === 'kela_card')!
    expect(kela.question).toBe('Mikä on Kela-kortti?')
    expect(kela.answer).toContain('Minulla ei ole Kela-korttia')
    expect(kela.description).toContain('What is a Kela card?')
    expect(kela.description).toContain('Kela-kortti')

    const so = answerCards(doc, 'so').find((c) => c.id === 'kela_card')!
    expect(so.question).toBe('What is a Kela card?')
  })
})

describe('correctTranscript', () => {
  it('replaces known mishearings with the term, keeping the rest of the sentence', () => {
    expect(correctTranscript(doc, "They were asking for my Kellogg card. I don't know what that is.", 'en')).toBe(
      "They were asking for my Kela card. I don't know what that is.",
    )
    expect(correctTranscript(doc, 'I need to go to the terveys asema', 'en')).toBe('I need to go to the terveysasema')
  })

  it('matches whole words only and leaves unrelated text alone', () => {
    expect(correctTranscript(doc, 'I ate Kellogg cereal', 'en')).toBe('I ate Kellogg cereal')
    expect(correctTranscript(doc, 'My kellogg cards', 'en')).toBe('My kellogg cards')
  })
})

describe('sttKeyterms', () => {
  it('lists Finnish terms and the person\'s-language terms within the provider limits', () => {
    const terms = sttKeyterms(doc, 'en')
    expect(terms).toEqual(expect.arrayContaining(['Kela-kortti', 'Kela card', 'terveysasema', 'health station', 'OmaKanta']))
    expect(new Set(terms).size).toBe(terms.length)
    expect(terms.length).toBeLessThanOrEqual(100)
    for (const t of terms) {
      expect(t.length).toBeLessThanOrEqual(50)
      expect(t.split(/\s+/).length).toBeLessThanOrEqual(5)
      expect(t).not.toMatch(/[<>{}[\]\\()]/)
    }
  })
})
