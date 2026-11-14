// Voice rules: which clip to serve for a text key, on-demand generation, human
// recordings and their review, and usage/spend. SQL in repository.ts.
import { createHash } from 'node:crypto'
import { APIError } from 'encore.dev/api'
import log from 'encore.dev/log'
import { content } from '~encore/clients'
import type { ContentDoc } from '../care_paths/domain/types'
import { ProviderError, type VoiceProvider } from './adapter'
import { decodeAudio } from './audio'
import { LANGUAGE_VOICE, languageVoice, ttsCostUsd, type AudioReview, type LanguageVoice, type VoiceMode } from './capabilities'
import { activeEngine, pickProvider } from './providers.config'
import * as repo from './repository'
import type { AssetRow, BlobRow, UsageSummaryRow } from './repository'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export type TtsFeature = 'tts.resident' | 'tts.admin'

export interface LanguageCapability {
  lang: string
  mode: VoiceMode
  voiceInput: boolean
  audioOutput: boolean
  generatedAudioReview: AudioReview
}

export interface Capabilities {
  languages: LanguageCapability[]
}

export interface ClipView {
  url: string
  source: 'human' | 'generated'
  review: AudioReview
  textHash: string
}

export interface AssetView {
  id: number
  url: string
  review: AudioReview
  createdBy: string
  createdAt: string
  approvedBy: string | null
  approvedAt: string | null
  textHash: string
}

export interface AdminAssetRow {
  key: string
  lang: string
  text: string
  textHash: string
  generated: AssetView | null
  human: AssetView | null
  served: 'human' | 'generated' | null
  staleAssets: number
}

export interface UsageSummary {
  rows: UsageSummaryRow[]
}

// ---------- capabilities ----------

export function capabilities(): Capabilities {
  return {
    languages: LANGUAGE_VOICE.map((l) => ({ lang: l.lang, mode: l.mode, voiceInput: l.voiceInput, audioOutput: l.audioOutput, generatedAudioReview: l.generatedAudioReview })),
  }
}

// ---------- live content ----------

let cachedDoc: { releaseId: number; doc: ContentDoc } | null = null

export async function liveDoc(): Promise<ContentDoc> {
  const live = await content.liveDoc()
  if (cachedDoc?.releaseId !== live.releaseId) cachedDoc = { releaseId: live.releaseId, doc: JSON.parse(live.docJson) as ContentDoc }
  return cachedDoc.doc
}

export const textHash = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex')

export const blobUrl = (blobId: number): string => `/api/voice/blob/${blobId}`

// The published text in exactly this language; no English fallback (no English audio for another language).
export function publishedText(doc: ContentDoc, key: string, lang: string): string | null {
  return doc.texts[key]?.[lang]?.text?.trim() || null
}

interface Target {
  cap: LanguageVoice
  text: string
  hash: string
}

function targetFor(doc: ContentDoc, key: string, lang: string): Target {
  const cap = languageVoice(lang)
  if (!cap) throw APIError.invalidArgument(`unknown language ${lang}`)
  if (!cap.audioOutput) throw APIError.notFound(`no audio output for ${lang}`)
  const text = publishedText(doc, key, lang)
  if (!text) throw APIError.notFound(`no published ${lang} text for ${key}`)
  return { cap, text, hash: textHash(text) }
}


// ---------- resolution ----------

// Approved human recording for the current text, else generated audio for the current text
// (generated on demand). Older audio has another hash and is never served.
export async function resolveClip(doc: ContentDoc, key: string, lang: string): Promise<ClipView> {
  const t = targetFor(doc, key, lang)
  const assets = await repo.assetsFor(key, lang)
  const human = assets.find((a) => a.source === 'human' && a.review === 'approved' && a.textHash === t.hash)
  if (human) return clip(human)
  return clip(await ensureGenerated(key, lang, t, 'resident', 'tts.resident', assets))
}

const clip = (a: AssetRow): ClipView => ({ url: blobUrl(a.blobId), source: a.source, review: a.review, textHash: a.textHash })

const inflight = new Map<string, Promise<number>>()

async function ensureGenerated(key: string, lang: string, t: Target, createdBy: string, feature: TtsFeature, known?: AssetRow[]): Promise<AssetRow> {
  // Stored audio is looked up first, so it is still served after the spend cap is reached.
  const { voiceId, model } = activeEngine()
  const assets = known ?? (await repo.assetsFor(key, lang))
  const existing = assets.find((a) => a.source === 'generated' && a.textHash === t.hash && a.voiceId === voiceId && a.model === model)
  if (existing) return existing

  let blobId = await repo.findGeneratedBlobId(t.hash, lang, voiceId, model)
  if (blobId === null) {
    const flightKey = `${t.hash}|${lang}|${voiceId}|${model}`
    let p = inflight.get(flightKey)
    if (!p) {
      p = (async () => synthesize(pickProvider(await repo.totalSpendUsd(), 'tts'), t, lang, voiceId, model, feature))().finally(() => inflight.delete(flightKey))
      inflight.set(flightKey, p)
    }
    blobId = await p
  }
  return repo.insertAsset({ textKey: key, lang, textHash: t.hash, blobId, source: 'generated', review: t.cap.generatedAudioReview, createdBy })
}

async function synthesize(provider: VoiceProvider, t: Target, lang: string, voiceId: string, model: string, feature: TtsFeature): Promise<number> {
  const characters = [...t.text].length
  try {
    const out = await provider.tts({ text: t.text, lang: t.cap.providerLang, voiceId, model })
    const blobId = await repo.insertGeneratedBlob({ textHash: t.hash, lang, voiceId, model, mime: out.mime, bytes: out.bytes })
    const costUsd = provider.name === 'fake' ? 0 : ttsCostUsd(characters)
    await repo.insertUsage({ provider: provider.name, feature, model, characters, seconds: 0, costUsd, status: 'ok' })
    log.info('voice tts generated', { feature, lang, characters, bytes: out.bytes.length, provider: provider.name })
    return blobId
  } catch (err) {
    if (!(err instanceof ProviderError)) throw err
    await repo.insertUsage({ provider: provider.name, feature, model, characters, seconds: 0, costUsd: 0, status: 'provider_error' })
    throw APIError.unavailable('text-to-speech is not available right now')
  }
}

// ---------- blobs ----------

export async function getBlob(id: number): Promise<BlobRow | null> {
  return Number.isSafeInteger(id) && id > 0 ? repo.getBlob(id) : null
}

// ---------- admin ----------

export function assetView(a: AssetRow): AssetView {
  return {
    id: a.id,
    url: blobUrl(a.blobId),
    review: a.review,
    createdBy: a.createdBy,
    createdAt: a.createdAt.toISOString(),
    approvedBy: a.approvedBy,
    approvedAt: a.approvedAt?.toISOString() ?? null,
    textHash: a.textHash,
  }
}

export async function adminAssets(doc: ContentDoc, lang: string): Promise<AdminAssetRow[]> {
  const cap = languageVoice(lang)
  if (!cap) throw APIError.invalidArgument(`unknown language ${lang}`)
  const { voiceId, model } = activeEngine()
  const byKey = new Map<string, AssetRow[]>()
  for (const a of await repo.assetsForLang(lang)) byKey.set(a.textKey, [...(byKey.get(a.textKey) ?? []), a])

  const rows: AdminAssetRow[] = []
  for (const key of Object.keys(doc.texts)) {
    const text = publishedText(doc, key, lang)
    if (!text) continue
    const hash = textHash(text)
    const assets = byKey.get(key) ?? []
    const current = assets.filter((a) => a.textHash === hash)
    const generated = current.find((a) => a.source === 'generated' && a.voiceId === voiceId && a.model === model) ?? null
    const human = current.find((a) => a.source === 'human') ?? null
    const approvedHuman = current.some((a) => a.source === 'human' && a.review === 'approved')
    rows.push({
      key,
      lang,
      text,
      textHash: hash,
      generated: generated && assetView(generated),
      human: human && assetView(human),
      served: approvedHuman ? 'human' : generated ? 'generated' : null,
      staleAssets: assets.length - current.length,
    })
  }
  return rows
}

export async function adminGenerate(doc: ContentDoc, key: string, lang: string, actor: string): Promise<AssetRow> {
  return ensureGenerated(key, lang, targetFor(doc, key, lang), actor, 'tts.admin')
}

export async function adminUpload(doc: ContentDoc, key: string, lang: string, audioBase64: string, mime: string, actor: string): Promise<AssetRow> {
  const t = targetFor(doc, key, lang)
  const audio = decodeAudio(audioBase64, mime, MAX_UPLOAD_BYTES)
  const blobId = await repo.insertHumanBlob({ textHash: t.hash, lang, mime: audio.mime, bytes: audio.bytes })
  return repo.insertAsset({ textKey: key, lang, textHash: t.hash, blobId, source: 'human', review: 'unchecked', createdBy: actor })
}

export async function adminApprove(assetId: number, actor: string, at: Date): Promise<AssetRow> {
  const a = await repo.getAsset(assetId)
  if (!a) throw APIError.notFound(`no audio asset ${assetId}`)
  if (a.source === 'generated' && languageVoice(a.lang)?.generatedApprovable === false) {
    throw APIError.failedPrecondition(`generated ${a.lang} audio cannot be approved; upload and approve a human recording instead`)
  }
  if (a.review !== 'approved') await repo.approveAsset(a.id, actor, at)
  return (await repo.getAsset(a.id))!
}

// ---------- usage ----------

export async function usageSummary(): Promise<UsageSummary> {
  return { rows: await repo.usageSummary() }
}

export async function spendUsd(): Promise<number> {
  return repo.totalSpendUsd()
}
