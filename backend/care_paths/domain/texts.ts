// Text lookup with English fallback. The resident screens and the Finnish visit
// summary read all wording through these functions.
import type { ContentDoc, Lang, ReviewStatus } from './types'

export interface ResolvedText {
  text: string
  // Language the text is actually in (English when the requested one is missing).
  lang: Lang
  review: ReviewStatus
  fallback: boolean
}

export function resolveText(doc: ContentDoc, key: string, lang: Lang): ResolvedText | null {
  const byLang = doc.texts[key]
  const own = byLang?.[lang]
  if (own?.text) return { text: own.text, lang, review: own.review, fallback: false }
  const en = byLang?.en
  if (en?.text) return { text: en.text, lang: 'en', review: en.review, fallback: lang !== 'en' }
  return null
}

// Text or the key itself, so a missing text is visible instead of blank.
export function textOf(doc: ContentDoc, key: string, lang: Lang): string {
  return resolveText(doc, key, lang)?.text ?? key
}

export function optionalText(doc: ContentDoc, key: string, lang: Lang): string | null {
  return resolveText(doc, key, lang)?.text ?? null
}

export function textsFor(doc: ContentDoc, lang: Lang): Record<string, ResolvedText> {
  const out: Record<string, ResolvedText> = {}
  for (const key of Object.keys(doc.texts)) {
    const t = resolveText(doc, key, lang)
    if (t) out[key] = t
  }
  return out
}
