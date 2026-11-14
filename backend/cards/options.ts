// Card options for matching, built ONLY from the published content document.
// Interrupts (emergency, something changed) and lanes are never options: the
// classifier never triggers or suppresses the emergency screen.
import { outcomeKey, routeKey, symptomKey } from '../care_paths/domain/keys'
import { optionalText, resolveText } from '../care_paths/domain/texts'
import type { ContentDoc, Lang } from '../care_paths/domain/types'

export type CardSet = 'symptoms' | 'route' | 'outcomes'
export const CARD_SETS: readonly CardSet[] = ['symptoms', 'route', 'outcomes']

export interface CardOption {
  // Content id: symptom card id, route code or outcome id.
  id: string
  // Card text in the person's language (English fallback).
  text: string
  // For the classifier: English text plus the person's-language text.
  description: string
}

export class OptionsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OptionsError'
  }
}

interface CardKeys {
  id: string
  card: string
  detail?: string
}

function describe(doc: ContentDoc, k: CardKeys, lang: Lang): CardOption | null {
  const en = optionalText(doc, k.card, 'en')
  if (!en) return null
  const enDetail = k.detail ? optionalText(doc, k.detail, 'en') : null
  const own = resolveText(doc, k.card, lang)
  const ownDetail = k.detail ? resolveText(doc, k.detail, lang) : null
  const withDetail = (text: string, detail: string | null | undefined) => (detail ? `${text} (${detail})` : text)

  let description = withDetail(en, enDetail)
  if (lang !== 'en' && own && !own.fallback) {
    description += ` | ${lang}: ${withDetail(own.text, ownDetail && !ownDetail.fallback ? ownDetail.text : null)}`
  }
  return { id: k.id, text: own?.text ?? en, description }
}

export function buildOptions(doc: ContentDoc, set: CardSet, lang: Lang, stage?: string): CardOption[] {
  let keys: CardKeys[]
  if (set === 'symptoms') {
    keys = doc.cards.symptoms.map((c) => ({ id: c.id, card: symptomKey(c.id, 'card'), detail: symptomKey(c.id, 'detail') }))
  } else if (set === 'route') {
    keys = Object.keys(doc.structure.routes).map((code) => ({ id: code, card: routeKey(code, 'card') }))
  } else {
    if (!stage) throw new OptionsError('stage is required for the outcomes set')
    const def = doc.structure.journey.stages[stage]
    if (!def) throw new OptionsError(`unknown stage: ${stage}`)
    keys = Object.keys(def.outcomes).map((id) => ({ id, card: outcomeKey(stage, id, 'card') }))
    if (keys.length === 0) throw new OptionsError(`stage ${stage} has no outcome cards`)
  }
  return keys.map((k) => describe(doc, k, lang)).filter((o): o is CardOption => o !== null)
}
