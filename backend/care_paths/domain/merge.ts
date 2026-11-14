// Seed merge for admin-edited content: adds what the seed has and the document lacks
// (languages, then text entries) and never overwrites. Pure; used by content/service.ts.
import type { ContentDoc } from './types'

// Null when nothing is missing. New languages are appended after the existing ones.
export function addMissingSeedContent(doc: ContentDoc, seed: ContentDoc): ContentDoc | null {
  const known = new Set(doc.languages.map((l) => l.code))
  const newLanguages = seed.languages.filter((l) => !known.has(l.code))
  let added = newLanguages.length
  const texts = structuredClone(doc.texts)
  for (const [key, byLang] of Object.entries(seed.texts)) {
    for (const [lang, entry] of Object.entries(byLang)) {
      if (texts[key]?.[lang]) continue
      texts[key] = { ...texts[key], [lang]: entry }
      added++
    }
  }
  return added ? { ...doc, languages: [...doc.languages, ...newLanguages], texts } : null
}
