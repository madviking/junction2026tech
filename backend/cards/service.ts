// Card matching: free text or a transcript -> one card of a closed set from the
// live content, through llm.decide. Never logs or stores the input text.
import { APIError } from 'encore.dev/api'
import log from 'encore.dev/log'
import { content, llm } from '~encore/clients'
import type { ContentDoc, Lang } from '../care_paths/domain/types'
import { matchConfig } from './config'
import { buildOptions, CARD_SETS, OptionsError, type CardOption, type CardSet } from './options'
import { matchInstructions } from './prompts/match'
import { isEmptyAfterRedaction, stripIdentifiers } from './redact'

export const MATCH_FEATURE = 'cards.match'

export interface MatchRequest {
  lang: string
  text: string
  set: 'symptoms' | 'route' | 'outcomes'
  // Journey stage id; required for the outcomes set.
  stage?: string
}

export interface MatchOption {
  id: string
  // Card text in the person's language.
  text: string
  probability: number
}

export interface MatchResponse {
  // confirm: read `top` back for the person to confirm. choose: show the cards.
  status: 'confirm' | 'choose'
  top: MatchOption | null
  // All options, highest probability first.
  ranked: MatchOption[]
}

let cached: { releaseId: number; version: number; doc: ContentDoc } | null = null

async function liveDoc(): Promise<{ version: number; doc: ContentDoc }> {
  const live = await content.liveDoc()
  if (cached?.releaseId !== live.releaseId) {
    cached = { releaseId: live.releaseId, version: live.version, doc: JSON.parse(live.docJson) as ContentDoc }
  }
  return cached
}

function parseLang(doc: ContentDoc, lang: string): Lang {
  const found = doc.languages.find((l) => l.code === lang)
  if (!found) throw APIError.invalidArgument(`unsupported language: ${lang.slice(0, 16)}`)
  return found.code
}

function options(doc: ContentDoc, set: string, lang: Lang, stage?: string): CardOption[] {
  if (!CARD_SETS.includes(set as CardSet)) throw APIError.invalidArgument(`unknown card set: ${set.slice(0, 32)}`)
  try {
    return buildOptions(doc, set as CardSet, lang, stage)
  } catch (err) {
    if (err instanceof OptionsError) throw APIError.invalidArgument(err.message)
    throw err
  }
}

// Option ids the Decisions API accepts; content ids that do not fit are mapped.
const OPTION_ID = /^[A-Za-z0-9_-]{1,64}$/
const wireId = (o: CardOption, i: number) => (OPTION_ID.test(o.id) ? o.id : `opt${i}`)

export function decideStatus(ranked: MatchOption[], confidence: number): MatchResponse['status'] {
  const [first, second] = ranked
  if (!first) return 'choose'
  const margin = first.probability - (second?.probability ?? 0)
  return confidence >= matchConfig.minConfidence && margin >= matchConfig.minMargin ? 'confirm' : 'choose'
}

const choose = (opts: CardOption[]): MatchResponse => ({
  status: 'choose',
  top: null,
  ranked: opts.map((o) => ({ id: o.id, text: o.text, probability: 0 })),
})

export async function match(req: MatchRequest): Promise<MatchResponse> {
  const { version, doc } = await liveDoc()
  const lang = parseLang(doc, req.lang)
  const opts = options(doc, req.set, lang, req.stage)
  if (req.text.length > matchConfig.maxInputChars) throw APIError.invalidArgument('text is too long')

  const text = stripIdentifiers(req.text)
  if (!text || isEmptyAfterRedaction(text) || opts.length < 2) return choose(opts)

  const ids = opts.map(wireId)
  const decision = await llm.decide({
    feature: MATCH_FEATURE,
    input: text,
    instructions: matchInstructions(req.set),
    options: opts.map((o, i) => ({ id: ids[i], description: o.description })),
    context: { set: req.set, lang, ...(req.stage ? { stage: req.stage } : {}), contentVersion: String(version) },
  })

  const byWire = new Map(ids.map((id, i) => [id, opts[i]]))
  const ranked: MatchOption[] = decision.probabilities.flatMap(({ id, p }) => {
    const o = byWire.get(id)
    return o ? [{ id: o.id, text: o.text, probability: p }] : []
  })
  const status = decideStatus(ranked, decision.confidence)
  log.info('cards matched', { set: req.set, lang, status, fake: decision.fake })
  return { status, top: status === 'confirm' ? ranked[0] : null, ranked }
}
