// Card matching: free text or a transcript -> one card of a closed set from the
// live content, through llm.decide. Never logs or stores the input text.
import { APIError } from 'encore.dev/api'
import log from 'encore.dev/log'
import { content, llm } from '~encore/clients'
import { answerCards, correctTranscript, type AnswerCard } from '../care_paths/domain/glossary'
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

export interface MatchAnswer {
  // Glossary entry id; texts glossary.<id>.question / .answer.
  id: string
  // In the person's language (English fallback).
  question: string
  text: string
  probability: number
}

export interface MatchResponse {
  // confirm: read `top` back for the person to confirm. choose: show the cards.
  // answer: the person asked about a health care word; show `answer`, the cards stay.
  status: 'confirm' | 'choose' | 'answer'
  top: MatchOption | null
  answer: MatchAnswer | null
  // The set's cards, highest probability first (answer cards are not in this list).
  ranked: MatchOption[]
}

// Wire ids of the extra options offered next to the set's cards.
export const ANSWER_PREFIX = 'answer-'
export const NONE_ID = 'none-of-these'
const NONE_DESCRIPTION =
  'None of these: the person asks a question or says something that none of the other options describes.'

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
  answer: null,
  ranked: opts.map((o) => ({ id: o.id, text: o.text, probability: 0 })),
})

export async function match(req: MatchRequest): Promise<MatchResponse> {
  const { version, doc } = await liveDoc()
  const lang = parseLang(doc, req.lang)
  const opts = options(doc, req.set, lang, req.stage)
  if (req.text.length > matchConfig.maxInputChars) throw APIError.invalidArgument('text is too long')

  // Identifiers out first, then known speech-to-text mishearings ("Kellogg card") fixed.
  const redacted = stripIdentifiers(req.text)
  if (!redacted || isEmptyAfterRedaction(redacted) || opts.length < 2) return choose(opts)
  const text = correctTranscript(doc, redacted, lang)

  const ids = opts.map(wireId)
  const answers = answerCards(doc, lang)
  const decision = await llm.decide({
    feature: MATCH_FEATURE,
    input: text,
    instructions: matchInstructions(req.set),
    options: [
      ...opts.map((o, i) => ({ id: ids[i], description: o.description })),
      ...answers.map((a) => ({ id: `${ANSWER_PREFIX}${a.id}`, description: a.description })),
      { id: NONE_ID, description: NONE_DESCRIPTION },
    ],
    context: { set: req.set, lang, ...(req.stage ? { stage: req.stage } : {}), contentVersion: String(version) },
  })

  const byWire = new Map(ids.map((id, i) => [id, opts[i]]))
  const answerByWire = new Map<string, AnswerCard>(answers.map((a) => [`${ANSWER_PREFIX}${a.id}`, a]))
  // Every option with its probability, to apply the guard rails across all of them.
  const all = [...decision.probabilities].sort((a, b) => b.p - a.p).map(({ id, p }) => ({ id, text: id, probability: p }))
  const ranked: MatchOption[] = decision.probabilities.flatMap(({ id, p }) => {
    const o = byWire.get(id)
    return o ? [{ id: o.id, text: o.text, probability: p }] : []
  })
  ranked.sort((a, b) => b.probability - a.probability)

  const sure = decideStatus(all, decision.confidence) === 'confirm'
  const winner = all[0]?.id
  const answerCard = sure && winner ? answerByWire.get(winner) : undefined
  const card = sure && winner ? byWire.get(winner) : undefined
  let res: MatchResponse
  if (answerCard) {
    res = { status: 'answer', top: null, answer: { id: answerCard.id, question: answerCard.question, text: answerCard.answer, probability: all[0]!.probability }, ranked }
  } else if (card) {
    res = { status: 'confirm', top: ranked.find((r) => r.id === card.id) ?? null, answer: null, ranked }
  } else {
    res = { status: 'choose', top: null, answer: null, ranked }
  }
  log.info('cards matched', { set: req.set, lang, status: res.status, answer: res.answer?.id, corrected: text !== redacted, fake: decision.fake })
  return res
}
