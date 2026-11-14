// "I got a letter": one photo of a letter -> what it is, its facts and what to do, in the
// resident's language, through llm.extract. The photo and the answer live only for the
// length of the request: never stored, never logged (only sizes, kind and status are logged).
import { APIError } from 'encore.dev/api'
import log from 'encore.dev/log'
import { llm } from '~encore/clients'
import { LANGS, type Lang } from '../care_paths/domain/types'
import { decodeImage } from './image'
import {
  EXPLAIN_SCHEMA,
  EXPLAIN_SCHEMA_NAME,
  EXPLAIN_TEXT,
  explainSystem,
  LETTER_KINDS,
  type LetterKind,
} from './prompts/explain'

export const EXPLAIN_FEATURE = 'letters.explain'
// The frontend scales the photo down first; 1.4 MB keeps the JSON request under 2 MB.
export const MAX_IMAGE_BYTES = 1_400_000

const MAX_ACTIONS = 5
const LIMITS = { title: 120, summary: 900, fact: 200, action: 300 }
// Published guides a letter kind can continue to (frontend route /r/:lang/learn/<guide>).
const GUIDES: Partial<Record<LetterKind, 'cervical'>> = { screening_cervical: 'cervical' }
// Finnish personal identity code, e.g. 010190-123A.
const IDENTITY_CODE = /\b\d{6}[-+A-FU-Y]\d{3}[0-9A-Y]\b/gi
const PHONE = /^\+?\d[\d\s()-]{3,18}\d$/

export interface ExplainRequest {
  // The resident's language (one of the published languages).
  lang: string
  // JPEG, PNG or WebP, base64 (a data: prefix is accepted), at most MAX_IMAGE_BYTES.
  imageBase64: string
  mime: string
}

export interface LetterExplanation {
  // `unreadable`: no letter could be read in the photo; every text field is empty.
  status: 'explained' | 'unreadable'
  lang: string
  kind: LetterKind
  // A published guide for this kind of letter, when there is one.
  guide?: 'cervical'
  // Machine-written in `lang`.
  title: string
  summary: string
  actions: string[]
  // Copied from the letter as printed (not translated); absent when not in the letter.
  sender?: string
  when?: string
  where?: string
  deadline?: string
  phone?: string
}

const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(IDENTITY_CODE, '').replace(/\s+/g, ' ').trim().slice(0, max) : ''

const fact = (v: unknown): string | undefined => clean(v, LIMITS.fact) || undefined

// Turns the model's JSON into the response. Field by field: nothing unknown passes through.
export function toExplanation(json: string, lang: Lang): LetterExplanation {
  const raw = JSON.parse(json) as Record<string, unknown>
  const title = clean(raw.title, LIMITS.title)
  const summary = clean(raw.summary, LIMITS.summary)
  if (raw.readable !== true || !title || !summary) {
    return { status: 'unreadable', lang, kind: 'other', title: '', summary: '', actions: [] }
  }
  const kind = (LETTER_KINDS as readonly unknown[]).includes(raw.kind) ? (raw.kind as LetterKind) : 'other'
  const actions = (Array.isArray(raw.actions) ? raw.actions : [])
    .map((a) => clean(a, LIMITS.action))
    .filter(Boolean)
    .slice(0, MAX_ACTIONS)
  const phone = fact(raw.phone)
  return {
    status: 'explained',
    lang,
    kind,
    guide: GUIDES[kind],
    title,
    summary,
    actions,
    sender: fact(raw.sender),
    when: fact(raw.when),
    where: fact(raw.where),
    deadline: fact(raw.deadline),
    phone: phone && PHONE.test(phone) ? phone : undefined,
  }
}

export async function explain(req: ExplainRequest): Promise<LetterExplanation> {
  if (!(LANGS as readonly string[]).includes(req.lang)) throw APIError.invalidArgument(`unknown language ${req.lang}`)
  const lang = req.lang as Lang
  const image = decodeImage(req.imageBase64, req.mime, MAX_IMAGE_BYTES)

  const answer = await llm.extract({
    feature: EXPLAIN_FEATURE,
    system: explainSystem(lang),
    text: EXPLAIN_TEXT,
    image: { mime: image.mime, base64: image.base64 },
    schemaName: EXPLAIN_SCHEMA_NAME,
    schemaJson: JSON.stringify(EXPLAIN_SCHEMA),
    context: { lang },
  })
  const result = toExplanation(answer.json, lang)
  log.info('letter explained', {
    lang,
    imageBytes: image.bytes,
    status: result.status,
    kind: result.kind,
    actions: result.actions.length,
    provider: answer.provider,
    latencyMs: answer.latencyMs,
  })
  return result
}
