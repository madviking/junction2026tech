// Admin audio endpoints (signed-in admins; every write is audited) and internal usage.
import { api } from 'encore.dev/api'
import { admin } from '~encore/clients'
import { requireAdmin } from '../lib/admin_actor'
import * as service from './service'

export const adminAssets = api(
  { expose: true, auth: true, method: 'GET', path: '/api/voice/admin/assets' },
  async (req: { lang: string }): Promise<{ rows: service.AdminAssetRow[] }> => {
    requireAdmin()
    return { rows: await service.adminAssets(await service.liveDoc(), req.lang) }
  },
)

export const adminGenerate = api(
  { expose: true, auth: true, method: 'POST', path: '/api/voice/admin/generate' },
  async (req: { key: string; lang: string }): Promise<service.AssetView> => {
    const actor = requireAdmin()
    const a = await service.adminGenerate(await service.liveDoc(), req.key, req.lang, actor.email)
    await admin.recordAudit({ actor: actor.email, action: 'voice.generate', target: `${req.key}/${req.lang}`, detail: { assetId: String(a.id), textHash: a.textHash } })
    return service.assetView(a)
  },
)

export const adminUpload = api(
  { expose: true, auth: true, method: 'POST', path: '/api/voice/admin/upload' },
  async (req: { key: string; lang: string; audioBase64: string; mime: string }): Promise<service.AssetView> => {
    const actor = requireAdmin()
    const a = await service.adminUpload(await service.liveDoc(), req.key, req.lang, req.audioBase64, req.mime, actor.email)
    await admin.recordAudit({ actor: actor.email, action: 'voice.upload', target: `${req.key}/${req.lang}`, detail: { assetId: String(a.id), textHash: a.textHash } })
    return service.assetView(a)
  },
)

export const adminApprove = api(
  { expose: true, auth: true, method: 'POST', path: '/api/voice/admin/approve' },
  async (req: { assetId: number }): Promise<service.AssetView> => {
    const actor = requireAdmin()
    const a = await service.adminApprove(req.assetId, actor.email, new Date())
    await admin.recordAudit({ actor: actor.email, action: 'voice.approve', target: `${a.textKey}/${a.lang}`, detail: { assetId: String(a.id), textHash: a.textHash } })
    return service.assetView(a)
  },
)

// Internal: per-day voice usage for the admin usage page (orchestrator wires it).
export const usageSummary = api(
  { expose: false, method: 'GET', path: '/internal/voice/usage-summary' },
  async (): Promise<service.UsageSummary> => service.usageSummary(),
)

export const spend = api(
  { expose: false, method: 'GET', path: '/internal/voice/spend' },
  async (): Promise<{ usd: number }> => ({ usd: await service.spendUsd() }),
)
