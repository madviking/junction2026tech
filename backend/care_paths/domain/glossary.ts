// Finnish health care vocabulary, read from the content texts `glossary.<id>.<field>`
// (seed: care_paths/seed/glossary.yaml). Pure; used by cards (answer cards, transcript
// correction) and voice (speech-to-text key terms).
import { optionalText, resolveText } from './texts'
import type { ContentDoc, Lang } from './types'

export type GlossaryField = 'term' | 'heard' | 'question' | 'answer'
export const glossaryKey = (id: string, field: GlossaryField) => `glossary.${id}.${field}`

const TERM_KEY = /^glossary\.([a-z0-9_]+)\.term$/

// Ids in document order; an entry exists when it has a term.
export function glossaryIds(doc: ContentDoc): string[] {
  return Object.keys(doc.texts).flatMap((key) => {
    const m = TERM_KEY.exec(key)
    return m ? [m[1]!] : []
  })
}

export interface AnswerCard {
  id: string
  // In the person's language, English fallback.
  question: string
  answer: string
  // For the classifier: English question and term, the Finnish term, and the
  // person's-language question when it is translated.
  description: string
}

export function answerCards(doc: ContentDoc, lang: Lang): AnswerCard[] {
  return glossaryIds(doc).flatMap((id) => {
    const enQuestion = optionalText(doc, glossaryKey(id, 'question'), 'en')
    const question = resolveText(doc, glossaryKey(id, 'question'), lang)
    const answer = resolveText(doc, glossaryKey(id, 'answer'), lang)
    if (!enQuestion || !question || !answer) return []
    const terms = [optionalText(doc, glossaryKey(id, 'term'), 'en'), optionalText(doc, glossaryKey(id, 'term'), 'fi')]
    let description = `Answer card: ${enQuestion} (about: ${[...new Set(terms.filter(Boolean))].join(', ')})`
    if (lang !== 'en' && !question.fallback) description += ` | ${lang}: ${question.text}`
    return [{ id, question: question.text, answer: answer.text, description }]
  })
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const stripParens = (s: string) => s.replace(/\s*\([^)]*\)/g, '').trim()

// What a mishearing is replaced with: the person's-language term when it is a plain name
// ("Kela card"), otherwise the Finnish word staff use ("terveysasema").
function replacement(doc: ContentDoc, id: string, lang: Lang): string | null {
  const own = optionalText(doc, glossaryKey(id, 'term'), lang)
  if (own && !own.includes('(')) return own
  return optionalText(doc, glossaryKey(id, 'term'), 'fi') ?? (own ? stripParens(own) : null)
}

// Replaces known speech-to-text mishearings (glossary.<id>.heard, English and the
// person's language) with the term. Whole words only, case-insensitive.
export function correctTranscript(doc: ContentDoc, text: string, lang: Lang): string {
  const pairs: { heard: string; term: string }[] = []
  for (const id of glossaryIds(doc)) {
    const term = replacement(doc, id, lang)
    if (!term) continue
    const lists = new Set([doc.texts[glossaryKey(id, 'heard')]?.en?.text, doc.texts[glossaryKey(id, 'heard')]?.[lang]?.text])
    for (const list of lists) {
      for (const heard of (list ?? '').split(';').map((h) => h.trim()).filter(Boolean)) pairs.push({ heard, term })
    }
  }
  pairs.sort((a, b) => b.heard.length - a.heard.length)
  let out = text
  for (const { heard, term } of pairs) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(heard).replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`, 'giu')
    out = out.replace(re, term)
  }
  return out
}

// ElevenLabs keyterms limits: up to 50 characters and 5 words each, no <>{}[]\ ; more
// than 100 terms adds a 20 s minimum billable duration, so we stay at 100.
export const MAX_KEYTERMS = 100
const KEYTERM_UNSUPPORTED = /[<>{}[\]\\]/

// Key terms that bias speech-to-text towards our vocabulary: the Finnish term and the
// person's-language term (parenthesised Finnish removed) of every entry.
export function sttKeyterms(doc: ContentDoc, lang: Lang): string[] {
  const out = new Set<string>()
  for (const id of glossaryIds(doc)) {
    for (const l of ['fi', lang] as Lang[]) {
      const raw = doc.texts[glossaryKey(id, 'term')]?.[l]?.text
      const term = raw ? stripParens(raw) : ''
      if (!term || term.length > 50 || term.split(/\s+/).length > 5 || KEYTERM_UNSUPPORTED.test(term)) continue
      out.add(term)
    }
  }
  return [...out].slice(0, MAX_KEYTERMS)
}
