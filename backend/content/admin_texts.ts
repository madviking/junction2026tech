// Content admin rules: text rows for the editor (structure order, groups, labels,
// filters), draft summary and diff against the live version, review flags, and the
// admin writes with their audit rows. No SQL: drafts and releases go through service.ts.
import { APIError } from 'encore.dev/api'
import { admin } from '~encore/clients'
import { isFreeKey, outcomeKey, structureKeys } from '../care_paths/domain/keys'
import type { ContentDoc, ReviewKind, ValidationIssue } from '../care_paths/domain/types'
import * as service from './service'
import type { DraftInfo, ReleaseInfo } from './service'

export type TextGroup =
  | 'lane'
  | 'route'
  | 'profile'
  | 'barrier'
  | 'rule'
  | 'journey.stage'
  | 'journey.outcome'
  | 'journey.interrupt'
  | 'journey.fact'
  | 'card.symptom'
  | 'card.emergency'
  | 'card.clinician'
  | 'ui'
  | 'step'
  | 'other'

// Longer prefixes first so `journey.stage` wins over a plain prefix match.
const GROUPS: TextGroup[] = [
  'journey.stage',
  'journey.outcome',
  'journey.interrupt',
  'journey.fact',
  'card.symptom',
  'card.emergency',
  'card.clinician',
  'lane',
  'route',
  'profile',
  'barrier',
  'rule',
  'ui',
  'step',
]

export type TextFilter = 'all' | 'needs_review' | 'missing'

export interface TextQuery {
  lang?: string
  filter?: TextFilter
  search?: string
  group?: string
}

export interface TextEntryView {
  lang: string
  text: string | null
  review: 'unchecked' | 'checked' | 'missing'
  reviewer: string | null
  reviewedAt: string | null
}

export interface TextRow {
  key: string
  group: TextGroup
  label: string
  required: boolean
  // One per language, in language order.
  entries: TextEntryView[]
  changedInDraft: boolean
}

export interface LanguageView {
  code: string
  name: string
  placeholder: boolean
}

export interface TextsResponse {
  draftExists: boolean
  basedOnVersion: number
  languages: LanguageView[]
  rows: TextRow[]
}

export interface DraftSummary {
  exists: boolean
  basedOnVersion: number
  errors: number
  warnings: number
  // Text keys whose entries (text or review) differ from the live version.
  changedKeys: string[]
}

export interface DraftDetail {
  summary: DraftSummary
  issues: ValidationIssue[]
  // The draft document as JSON text (object key order is meaningful).
  docJson: string
}

export interface ReviewFlag {
  kind: ReviewKind
  path: string
  message: string
}

// ---------- pure helpers ----------

export function keyGroup(key: string): TextGroup {
  return GROUPS.find((g) => key.startsWith(`${g}.`)) ?? 'other'
}

// Every editable key in structure order: required and optional structure keys
// (interleaved as keys.ts derives them), then the free ui.* and step.* keys.
export function orderedKeys(doc: ContentDoc): { key: string; required: boolean }[] {
  const { required, optional } = structureKeys(doc)
  const req = new Set(required)
  const out: { key: string; required: boolean }[] = []
  const seen = new Set<string>()
  const push = (key: string, isRequired: boolean) => {
    if (seen.has(key)) return
    seen.add(key)
    out.push({ key, required: isRequired })
  }
  for (const key of structureOrder(required, optional)) push(key, req.has(key))
  const free = Object.keys(doc.texts).filter(isFreeKey)
  for (const key of free.filter((k) => k.startsWith('ui.'))) push(key, false)
  for (const key of free.filter((k) => k.startsWith('step.'))) push(key, false)
  return out
}

// Places each optional key right after its required sibling (same key without the
// last segment, e.g. `.then` after `.card`), so the editor shows them together.
function structureOrder(required: string[], optional: string[]): string[] {
  const parent = (key: string) => key.slice(0, key.lastIndexOf('.'))
  const byParent = new Map<string, string[]>()
  for (const key of optional) byParent.set(parent(key), [...(byParent.get(parent(key)) ?? []), key])
  const out: string[] = []
  const placed = new Set<string>()
  for (const key of required) {
    out.push(key)
    const siblings = byParent.get(parent(key))
    if (siblings) {
      for (const s of siblings) if (!placed.has(s)) out.push(s), placed.add(s)
    }
  }
  for (const key of optional) if (!placed.has(key)) out.push(key)
  return out
}

const short = (s: string, max = 40) => (s.length > max ? `${s.slice(0, max - 1)}…` : s)
const en = (doc: ContentDoc, key: string): string | null => doc.texts[key]?.en?.text || null
const named = (doc: ContentDoc, code: string, nameKey: string) => {
  const name = en(doc, nameKey)
  return name ? `${code} ${short(name)}` : code
}
const words = (field: string) => field.replace(/_/g, ' ')

// A short English label for the editor, e.g. "contact → Nobody answered · card".
export function textLabel(doc: ContentDoc, key: string): string {
  const parts = key.split('.')
  switch (keyGroup(key)) {
    case 'lane':
    case 'route':
    case 'profile':
    case 'barrier': {
      const [kind, code, ...field] = parts
      return `${named(doc, code!, `${kind}.${code}.name`)} · ${words(field.join(' '))}`
    }
    case 'rule': {
      const rest = parts.slice(1)
      const fieldAt = rest.findIndex((p) => ['title', 'script', 'clocks', 'no_guarantee'].includes(p))
      const codes = rest.slice(0, fieldAt).join('/')
      const [set, index, field] = rest.slice(fieldAt)
      if (set === 'clocks' || set === 'no_guarantee') {
        const what = set === 'clocks' ? 'clock' : 'clock without care guarantee'
        return `rule ${codes} · ${what} ${Number(index) + 1} ${field}`
      }
      return `rule ${codes} · ${set}`
    }
    case 'journey.stage': {
      const [, , stage, field, index] = parts
      return field === 'ask' ? `${stage} · question` : `${stage} · ladder step ${Number(index) + 1}`
    }
    case 'journey.outcome': {
      const [, , stage, outcome, field] = parts
      const card = en(doc, outcomeKey(stage!, outcome!, 'card'))
      return `${stage} → ${card ? short(card) : outcome} · ${field}`
    }
    case 'journey.interrupt':
      return `interrupt ${parts[2]} · card`
    case 'journey.fact':
      return key.endsWith('.then') ? 'route not known · then' : `route question ${Number(parts.at(-1)) + 1}`
    case 'card.symptom': {
      const [, , id, field] = parts
      const card = en(doc, `card.symptom.${id}.card`)
      return `symptom ${card ? short(card) : id} · ${field}`
    }
    case 'card.emergency':
      return `emergency sign ${parts[2]}`
    case 'card.clinician': {
      const outcome = parts[2]!
      const card = en(doc, outcomeKey(doc.cards.clinicianStage, outcome, 'card'))
      return `clinician → ${card ? short(card) : outcome} · next step`
    }
    case 'ui':
    case 'step':
      return parts.slice(1).join('.')
    default:
      return key
  }
}

function entriesFor(doc: ContentDoc, key: string): TextEntryView[] {
  return doc.languages.map(({ code }) => {
    const e = doc.texts[key]?.[code]
    if (!e?.text) return { lang: code, text: null, review: 'missing', reviewer: null, reviewedAt: null }
    return { lang: code, text: e.text, review: e.review, reviewer: e.reviewer ?? null, reviewedAt: e.reviewedAt ?? null }
  })
}

// Keys whose text entries differ between the draft and the live document.
export function changedKeys(draft: ContentDoc, live: ContentDoc): string[] {
  const keys = new Set([...Object.keys(draft.texts), ...Object.keys(live.texts)])
  return [...keys].filter((key) => !sameEntries(draft.texts[key], live.texts[key]))
}

function sameEntries(a: ContentDoc['texts'][string] | undefined, b: ContentDoc['texts'][string] | undefined): boolean {
  const langs = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])
  for (const lang of langs) {
    const x = a?.[lang]
    const y = b?.[lang]
    if (!x || !y) {
      if (x?.text || y?.text) return false
      continue
    }
    if (x.text !== y.text || x.review !== y.review || x.reviewer !== y.reviewer || x.reviewedAt !== y.reviewedAt) return false
  }
  return true
}

// needs_review: an entry with text that is unchecked (in any language, or in `lang`).
// missing: a language without text (or `lang` without text). Optional keys count as
// missing only when some language has a text, so unused optional texts stay out.
export function matchesFilter(row: TextRow, filter: TextFilter, lang: string | null): boolean {
  const entries = lang ? row.entries.filter((e) => e.lang === lang) : row.entries
  if (filter === 'needs_review') return entries.some((e) => e.review === 'unchecked')
  if (filter === 'missing') {
    if (!row.required && row.entries.every((e) => e.text === null)) return false
    return entries.some((e) => e.text === null)
  }
  return true
}

export function buildRows(doc: ContentDoc, live: ContentDoc | null, q: { lang: string | null; filter: TextFilter; search: string; group: string }): TextRow[] {
  const changed = new Set(live ? changedKeys(doc, live) : [])
  const needle = q.search.trim().toLowerCase()
  const rows: TextRow[] = []
  for (const { key, required } of orderedKeys(doc)) {
    const group = keyGroup(key)
    if (q.group && group !== q.group) continue
    const row: TextRow = { key, group, label: textLabel(doc, key), required, entries: entriesFor(doc, key), changedInDraft: changed.has(key) }
    if (!matchesFilter(row, q.filter, q.lang)) continue
    if (needle && ![row.key, row.label, ...row.entries.map((e) => e.text ?? '')].some((s) => s.toLowerCase().includes(needle))) continue
    rows.push(row)
  }
  return rows
}

export function summarize(draft: DraftInfo, live: ContentDoc): DraftSummary {
  return {
    exists: draft.exists,
    basedOnVersion: draft.basedOnVersion,
    errors: draft.issues.filter((i) => i.severity === 'error').length,
    warnings: draft.issues.filter((i) => i.severity === 'warning').length,
    changedKeys: draft.exists ? changedKeys(draft.doc, live) : [],
  }
}

// Places in the structure that still need a clinical or legal review.
export function reviewFlags(doc: ContentDoc): ReviewFlag[] {
  const s = doc.structure
  const flags: ReviewFlag[] = []
  for (const [code, lane] of Object.entries(s.lanes)) {
    if (lane.needsClinicalReview) flags.push({ kind: 'clinical', path: `lanes.${code}`, message: `Lane ${named(doc, code, `lane.${code}.name`)} needs clinical review` })
  }
  for (const [code, route] of Object.entries(s.routes)) {
    if (route.needsLegalReview) flags.push({ kind: 'legal', path: `routes.${code}`, message: `Route ${named(doc, code, `route.${code}.name`)} needs legal review` })
  }
  for (const [stageId, stage] of Object.entries(s.journey.stages)) {
    for (const [outcomeId, o] of Object.entries(stage.outcomes)) {
      if (o.review) {
        const card = en(doc, outcomeKey(stageId, outcomeId, 'card')) ?? outcomeId
        flags.push({ kind: o.review, path: `journey.stages.${stageId}.outcomes.${outcomeId}`, message: `Outcome ${stageId} → ${card} needs ${o.review} review` })
      }
    }
  }
  const fact = s.journey.facts.route
  if (fact.ifUnknownReview) {
    flags.push({ kind: fact.ifUnknownReview, path: 'journey.facts.route.if_unknown', message: `Fallback route ${fact.ifUnknownRoute} when the route is not known needs ${fact.ifUnknownReview} review` })
  }
  return flags
}

// ---------- reads ----------

export async function listTexts(q: TextQuery): Promise<TextsResponse> {
  const [draft, live] = await Promise.all([service.getDraft(), service.getLiveDoc()])
  const lang = q.lang ? service.parseLang(draft.doc, q.lang) : null
  const filter = q.filter ?? 'all'
  if (!['all', 'needs_review', 'missing'].includes(filter)) throw APIError.invalidArgument(`unknown filter ${filter}`)
  return {
    draftExists: draft.exists,
    basedOnVersion: draft.basedOnVersion,
    languages: draft.doc.languages.map((l) => ({ code: l.code, name: l.name, placeholder: l.placeholder })),
    rows: buildRows(draft.doc, draft.exists ? live.doc : null, { lang, filter, search: q.search ?? '', group: q.group ?? '' }),
  }
}

export async function draftSummary(): Promise<DraftSummary> {
  const [draft, live] = await Promise.all([service.getDraft(), service.getLiveDoc()])
  return summarize(draft, live.doc)
}

export async function draftDetail(): Promise<DraftDetail> {
  const [draft, live] = await Promise.all([service.getDraft(), service.getLiveDoc()])
  return { summary: summarize(draft, live.doc), issues: draft.issues, docJson: JSON.stringify(draft.doc) }
}

export async function liveReviewFlags(): Promise<ReviewFlag[]> {
  return reviewFlags((await service.getLiveDoc()).doc)
}

// ---------- writes (each records an audit row) ----------

const MAX_TEXT = 4000

async function audit(actor: string, action: string, target: string, detail: Record<string, string>) {
  await admin.recordAudit({ actor, action, target, detail })
}

export async function editText(actor: string, key: string, lang: string, text: string): Promise<DraftSummary> {
  const { doc } = await service.getDraft()
  const { required, optional } = structureKeys(doc)
  if (!isFreeKey(key) && !required.includes(key) && !optional.includes(key)) {
    throw APIError.invalidArgument(`unknown text key ${key}`)
  }
  if (text.length > MAX_TEXT) throw APIError.invalidArgument(`text is longer than ${MAX_TEXT} characters`)
  const code = service.parseLang(doc, lang)
  await service.setText(actor, key, code, text)
  await audit(actor, 'content.text.update', `${key}/${code}`, { key, lang: code, text: short(text.trim(), 200) })
  return draftSummary()
}

export async function reviewText(actor: string, key: string, lang: string, status: 'checked' | 'unchecked'): Promise<DraftSummary> {
  if (status !== 'checked' && status !== 'unchecked') throw APIError.invalidArgument(`unknown review status ${String(status)}`)
  await service.setReview(actor, key, lang, status, new Date())
  await audit(actor, 'content.review.update', `${key}/${lang}`, { key, lang, status })
  return draftSummary()
}

export async function publishDraft(actor: string, note: string | undefined): Promise<ReleaseInfo> {
  const release = await service.publish(actor, note?.trim() || null)
  await audit(actor, 'content.publish', `v${release.version}`, { version: String(release.version), note: release.note ?? '' })
  return release
}

export async function rollbackTo(actor: string, version: number): Promise<ReleaseInfo> {
  if (!Number.isInteger(version) || version < 1) throw APIError.invalidArgument('version must be a positive whole number')
  const release = await service.rollback(actor, version)
  await audit(actor, 'content.rollback', `v${release.version}`, { version: String(release.version) })
  return release
}

export async function discard(actor: string): Promise<DraftSummary> {
  const before = await service.getDraft()
  await service.discardDraft()
  await audit(actor, 'content.draft.discard', 'draft', { existed: String(before.exists), basedOnVersion: String(before.basedOnVersion) })
  return draftSummary()
}
