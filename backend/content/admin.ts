// Content admin endpoints: text editor, review, draft, publish, rollback, export.
// Every endpoint needs a signed-in admin; writes record an audit row (admin_texts.ts).
import { api } from 'encore.dev/api'
import { requireAdmin } from '../lib/admin_actor'
import {
  discard,
  draftDetail,
  editText,
  listTexts,
  liveReviewFlags,
  publishDraft,
  reviewText,
  rollbackTo,
  type DraftDetail,
  type DraftSummary,
  type ReviewFlag,
  type TextFilter,
  type TextsResponse,
} from './admin_texts'
import * as service from './service'

export const adminTexts = api(
  { expose: true, auth: true, method: 'GET', path: '/api/content/admin/texts' },
  async (req: { lang?: string; filter?: TextFilter; search?: string; group?: string }): Promise<TextsResponse> => {
    requireAdmin()
    return listTexts(req)
  },
)

export const adminSetText = api(
  { expose: true, auth: true, method: 'PUT', path: '/api/content/admin/texts' },
  async (req: { key: string; lang: string; text: string }): Promise<DraftSummary> => {
    const actor = requireAdmin()
    return editText(actor.email, req.key, req.lang, req.text)
  },
)

export const adminSetReview = api(
  { expose: true, auth: true, method: 'POST', path: '/api/content/admin/review' },
  async (req: { key: string; lang: string; status: 'checked' | 'unchecked' }): Promise<DraftSummary> => {
    const actor = requireAdmin()
    return reviewText(actor.email, req.key, req.lang, req.status)
  },
)

export const adminDraft = api(
  { expose: true, auth: true, method: 'GET', path: '/api/content/admin/draft' },
  async (): Promise<DraftDetail> => {
    requireAdmin()
    return draftDetail()
  },
)

export const adminPublish = api(
  { expose: true, auth: true, method: 'POST', path: '/api/content/admin/publish' },
  async (req: { note?: string }): Promise<service.ReleaseInfo> => {
    const actor = requireAdmin()
    return publishDraft(actor.email, req.note)
  },
)

export const adminDiscard = api(
  { expose: true, auth: true, method: 'POST', path: '/api/content/admin/discard' },
  async (): Promise<DraftSummary> => {
    const actor = requireAdmin()
    return discard(actor.email)
  },
)

export const adminVersions = api(
  { expose: true, auth: true, method: 'GET', path: '/api/content/admin/versions' },
  async (): Promise<{ versions: service.ReleaseInfo[] }> => {
    requireAdmin()
    return { versions: await service.listReleases() }
  },
)

export const adminRollback = api(
  { expose: true, auth: true, method: 'POST', path: '/api/content/admin/rollback' },
  async (req: { version: number }): Promise<service.ReleaseInfo> => {
    const actor = requireAdmin()
    return rollbackTo(actor.email, req.version)
  },
)

export const adminExport = api(
  { expose: true, auth: true, method: 'GET', path: '/api/content/admin/export' },
  async (): Promise<{ version: number; yaml: string }> => {
    requireAdmin()
    return service.exportLive()
  },
)

export const adminReviewFlags = api(
  { expose: true, auth: true, method: 'GET', path: '/api/content/admin/review-flags' },
  async (): Promise<{ flags: ReviewFlag[] }> => {
    requireAdmin()
    return { flags: await liveReviewFlags() }
  },
)
