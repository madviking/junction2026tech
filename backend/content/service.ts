// Content releases: seed, live document, draft edits, publish, rollback, export.
// Rules here; SQL in repository.ts; document rules in care_paths/domain.
import { createHash } from 'node:crypto'
import { appMeta } from 'encore.dev'
import { APIError } from 'encore.dev/api'
import log from 'encore.dev/log'
import { exportRulesYaml } from '../care_paths/domain/export'
import { addMissingSeedContent } from '../care_paths/domain/merge'
import { buildSeedDoc } from '../care_paths/domain/seed'
import { textsFor, type ResolvedText } from '../care_paths/domain/texts'
import type { Cards, ContentDoc, Lang, LanguageDef, ReviewStatus, ValidationIssue } from '../care_paths/domain/types'
import { ContentError, LANGS } from '../care_paths/domain/types'
import { validateDoc } from '../care_paths/domain/validate'
import { journeyView, type JourneyView } from '../care_paths/domain/views'
import { readSeedFiles } from '../care_paths/seed/load'
import * as repo from './repository'
import type { ReleaseRow } from './repository'

export const SEED_ACTOR = 'seed'
// Releases that only added missing seed texts to admin-edited content. They are never
// replaced by the seed, so admin edits survive later seed changes.
export const SEED_MERGE_ACTOR = 'seed-merge'

export interface LiveDoc {
  releaseId: number
  version: number
  doc: ContentDoc
}

// Over internal APIs the document travels as JSON text: Encore's encoder sorts
// object keys, and the order of stages, outcomes and codes is meaningful.
export interface LiveDocJson {
  releaseId: number
  version: number
  docJson: string
}

// Everything a resident screen needs, in one language.
export interface LiveBundle {
  version: number
  lang: string
  dir: 'ltr' | 'rtl'
  placeholder: boolean
  languages: LanguageDef[]
  texts: Record<string, ResolvedText>
  journey: JourneyView
  cards: Cards
  lanes: string[]
  routes: string[]
}

export interface ReleaseInfo {
  id: number
  version: number
  note: string | null
  createdBy: string
  publishedAt: string
  live: boolean
}

export interface DraftInfo {
  doc: ContentDoc
  // Published version the draft started from.
  basedOnVersion: number
  // False when there is no draft row: the doc is a copy of the live release.
  exists: boolean
  issues: ValidationIssue[]
}

// ---------- seed ----------

let seeded: Promise<void> | null = null
let seededAt = 0
// Outside production the seed files are re-checked at most this often, so a new
// `ui.*` string in a seed YAML shows up without restarting the backend.
const DEV_RECHECK_MS = 5_000
const isProduction = () => appMeta().environment.type === 'production'

// Loads the seed on first use: published version 1 on an empty database; later a
// new seed version when the seed files changed and nobody has edited content, or
// only the missing text keys when admins have published their own versions.
export function ensureSeeded(): Promise<void> {
  if (seeded && !isProduction() && Date.now() - seededAt > DEV_RECHECK_MS) seeded = null
  if (!seeded) {
    seededAt = Date.now()
    seeded = syncSeed().catch((err) => {
      seeded = null
      throw err
    })
  }
  return seeded
}

async function syncSeed(): Promise<void> {
  const files = readSeedFiles()
  const fingerprint = createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, 16)
  const seedDoc = buildSeedDoc(files)
  failOnErrors(validateDoc(seedDoc), 'seed')

  await repo.inLock(async (tx) => {
    const liveId = await repo.liveReleaseId(tx)
    if (liveId === null) {
      const r = await repo.insertPublished(tx, { doc: seedDoc, createdBy: SEED_ACTOR, note: 'Seed from rules.yaml', seedFingerprint: fingerprint, basedOn: null })
      await repo.setLive(tx, r.id, SEED_ACTOR)
      log.info('content seeded', { version: r.version })
      return
    }
    const live = (await repo.getRelease(tx, liveId))!
    if (live.seedFingerprint === fingerprint) return
    // Live content made purely by the seed (also after a rollback to it) follows the seed
    // files. Admin-made or merged content only gets missing languages and texts added.
    if (live.createdBy === SEED_ACTOR) {
      const r = await repo.insertPublished(tx, { doc: seedDoc, createdBy: SEED_ACTOR, note: 'Seed files changed', seedFingerprint: fingerprint, basedOn: live.id })
      await repo.setLive(tx, r.id, SEED_ACTOR)
      log.info('content reseeded', { version: r.version })
      return
    }
    const merged = addMissingSeedContent(live.doc, seedDoc)
    if (!merged) return
    failOnErrors(validateDoc(merged), 'seed merge')
    const r = await repo.insertPublished(tx, { doc: merged, createdBy: SEED_MERGE_ACTOR, note: 'New seed languages or texts added', seedFingerprint: fingerprint, basedOn: live.id })
    await repo.setLive(tx, r.id, SEED_MERGE_ACTOR)
    const draft = await repo.getDraft(tx)
    if (draft) await repo.saveDraft(tx, addMissingSeedContent(draft.doc, seedDoc) ?? draft.doc, r.id, draft.createdBy)
    log.info('content seed texts merged', { version: r.version })
  })
}

function failOnErrors(issues: ValidationIssue[], what: string) {
  if (issues.some((i) => i.severity === 'error')) {
    const err = new ContentError(issues)
    log.error(`${what} content is invalid`, { error: err.message })
    throw err
  }
}

// ---------- live ----------

const docCache = new Map<number, LiveDoc>()

export async function getLiveDoc(): Promise<LiveDoc> {
  await ensureSeeded()
  const id = await repo.inTx((tx) => repo.liveReleaseId(tx))
  if (id === null) throw APIError.internal('no live content release')
  const cached = docCache.get(id)
  if (cached) return cached
  const r = await repo.inTx((tx) => repo.getRelease(tx, id))
  if (!r || r.version === null) throw APIError.internal('live release missing')
  const live = { releaseId: r.id, version: r.version, doc: r.doc }
  docCache.set(id, live)
  return live
}

export function parseLang(doc: ContentDoc, lang: string): Lang {
  const def = doc.languages.find((l) => l.code === lang)
  if (!def) throw APIError.invalidArgument(`unknown language ${lang}; use one of ${doc.languages.map((l) => l.code).join(', ')}`)
  return def.code
}

export async function getLiveBundle(lang: string): Promise<LiveBundle> {
  const { version, doc } = await getLiveDoc()
  const code = parseLang(doc, lang)
  const def = doc.languages.find((l) => l.code === code)!
  return {
    version,
    lang: code,
    dir: def.dir,
    placeholder: def.placeholder,
    languages: doc.languages,
    texts: textsFor(doc, code),
    journey: journeyView(doc.structure.journey),
    cards: doc.cards,
    lanes: Object.keys(doc.structure.lanes),
    routes: Object.keys(doc.structure.routes),
  }
}

// ---------- draft ----------

export async function getDraft(): Promise<DraftInfo> {
  const live = await getLiveDoc()
  const { draft, base } = await repo.inTx(async (tx) => {
    const draft = await repo.getDraft(tx)
    return { draft, base: draft?.basedOn ? await repo.getRelease(tx, draft.basedOn) : null }
  })
  const doc = draft?.doc ?? live.doc
  return { doc, basedOnVersion: base?.version ?? live.version, exists: !!draft, issues: validateDoc(doc) }
}

// Applies an edit to the draft (created from the live release on first edit).
// The mutator may throw APIError to refuse the edit.
export async function updateDraft(actor: string, mutate: (doc: ContentDoc) => void): Promise<DraftInfo> {
  await ensureSeeded()
  await repo.inLock(async (tx) => {
    const draft = await repo.getDraft(tx)
    const liveId = (await repo.liveReleaseId(tx))!
    const doc = structuredClone(draft?.doc ?? (await repo.getRelease(tx, liveId))!.doc)
    mutate(doc)
    await repo.saveDraft(tx, doc, draft?.basedOn ?? liveId, actor)
  })
  return getDraft()
}

export async function setText(actor: string, key: string, lang: string, text: string): Promise<DraftInfo> {
  return updateDraft(actor, (doc) => {
    const code = parseLang(doc, lang)
    const trimmed = text.trim()
    const current = doc.texts[key]?.[code]
    if (!trimmed) {
      if (doc.texts[key]) delete doc.texts[key][code]
      return
    }
    if (current?.text === trimmed) return
    doc.texts[key] = { ...doc.texts[key], [code]: { text: trimmed, review: 'unchecked' } }
  })
}

export async function setReview(actor: string, key: string, lang: string, status: ReviewStatus, at: Date): Promise<DraftInfo> {
  return updateDraft(actor, (doc) => {
    const code = parseLang(doc, lang)
    const current = doc.texts[key]?.[code]
    if (!current) throw APIError.notFound(`no ${code} text for ${key}`)
    doc.texts[key]![code] =
      status === 'checked'
        ? { text: current.text, review: 'checked', reviewer: actor, reviewedAt: at.toISOString() }
        : { text: current.text, review: 'unchecked' }
  })
}

export async function discardDraft(): Promise<void> {
  await repo.inLock((tx) => repo.deleteDraft(tx))
}

// ---------- publish, rollback, export ----------

export async function publish(actor: string, note: string | null): Promise<ReleaseInfo> {
  await ensureSeeded()
  const release = await repo.inLock(async (tx) => {
    const draft = await repo.getDraft(tx)
    if (!draft) throw APIError.failedPrecondition('there is no draft to publish')
    const issues = validateDoc(draft.doc)
    if (issues.some((i) => i.severity === 'error')) {
      throw APIError.invalidArgument('the draft is invalid; nothing was published').withDetails({ issues: issues.filter((i) => i.severity === 'error') })
    }
    const r = await repo.insertPublished(tx, { doc: draft.doc, createdBy: actor, note, seedFingerprint: null, basedOn: draft.basedOn })
    await repo.setLive(tx, r.id, actor)
    await repo.deleteDraft(tx)
    return r
  })
  return { ...info(release), live: true }
}

export async function rollback(actor: string, version: number): Promise<ReleaseInfo> {
  await ensureSeeded()
  const target = await repo.inLock(async (tx) => {
    const r = await repo.getByVersion(tx, version)
    if (r) await repo.setLive(tx, r.id, actor)
    return r
  })
  if (!target) throw APIError.notFound(`no published version ${version}`)
  return { ...info(target), live: true }
}

export async function listReleases(): Promise<ReleaseInfo[]> {
  await ensureSeeded()
  const { liveId, rows } = await repo.inTx(async (tx) => ({ liveId: await repo.liveReleaseId(tx), rows: await repo.listPublished(tx) }))
  return rows.map((r) => ({ ...info(r), live: r.id === liveId }))
}

export async function exportLive(): Promise<{ version: number; yaml: string }> {
  const { version, doc } = await getLiveDoc()
  return { version, yaml: exportRulesYaml(doc) }
}

function info(r: ReleaseRow): Omit<ReleaseInfo, 'live'> {
  return { id: r.id, version: r.version!, note: r.note, createdBy: r.createdBy, publishedAt: (r.publishedAt ?? r.createdAt).toISOString() }
}

export const SHIPPED_LANGS: readonly Lang[] = LANGS

export async function getLiveDocJson(): Promise<LiveDocJson> {
  const { releaseId, version, doc } = await getLiveDoc()
  return { releaseId, version, docJson: JSON.stringify(doc) }
}
