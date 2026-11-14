// Journey editor endpoints (/api/content/admin/journey/*), behind the
// JOURNEY_EDITOR_ENABLED flag (features.ts, off by default). With the flag off the graph
// says `enabled: false` and every write is refused with failed_precondition.
// Each write edits the single draft through service.updateDraft(), records an audit row
// `content.journey.<op>` and returns the fresh graph (with validation issues).
import { api, APIError } from 'encore.dev/api'
import { admin } from '~encore/clients'
import type { ContentDoc } from '../care_paths/domain/types'
import { requireAdmin } from '../lib/admin_actor'
import {
  addOutcome,
  addStage,
  buildGraph,
  disabledGraph,
  removeOutcome,
  removeStage,
  setNext,
  type JourneyGraph,
} from './admin_journey'
import { reviewFlags } from './admin_texts'
import { JOURNEY_EDITOR_ENABLED } from './features'
import * as service from './service'

function assertEnabled() {
  if (!JOURNEY_EDITOR_ENABLED) throw APIError.failedPrecondition('journey editor is disabled')
}

// The draft's graph (or the live version's when there is no draft).
export async function currentGraph(): Promise<JourneyGraph> {
  const draft = await service.getDraft()
  return buildGraph(draft.doc, {
    source: draft.exists ? 'draft' : 'live',
    basedOnVersion: draft.basedOnVersion,
    issues: draft.issues,
    reviewFlags: reviewFlags(draft.doc),
  })
}

// Applies one structural edit to the draft and audits it.
export async function applyJourneyEdit(
  actor: string,
  op: string,
  target: string,
  detail: Record<string, string>,
  mutate: (doc: ContentDoc) => void,
): Promise<JourneyGraph> {
  await service.updateDraft(actor, mutate)
  await admin.recordAudit({ actor, action: `content.journey.${op}`, target, detail })
  return currentGraph()
}

export const journeyGraph = api(
  { expose: true, auth: true, method: 'GET', path: '/api/content/admin/journey/graph' },
  async (): Promise<JourneyGraph> => {
    if (!JOURNEY_EDITOR_ENABLED) return disabledGraph()
    requireAdmin()
    return currentGraph()
  },
)

export const journeyAddStage = api(
  { expose: true, auth: true, method: 'POST', path: '/api/content/admin/journey/stage' },
  async (req: { id: string; terminal?: boolean; askEn: string; askFi: string }): Promise<JourneyGraph> => {
    assertEnabled()
    const actor = requireAdmin()
    return applyJourneyEdit(actor.email, 'stage.add', req.id, { terminal: String(req.terminal === true) }, (doc) => addStage(doc, req))
  },
)

export const journeyRemoveStage = api(
  { expose: true, auth: true, method: 'POST', path: '/api/content/admin/journey/stage/remove' },
  async (req: { id: string }): Promise<JourneyGraph> => {
    assertEnabled()
    const actor = requireAdmin()
    return applyJourneyEdit(actor.email, 'stage.remove', req.id, {}, (doc) => removeStage(doc, req.id))
  },
)

export const journeyAddOutcome = api(
  { expose: true, auth: true, method: 'POST', path: '/api/content/admin/journey/outcome' },
  async (req: { stage: string; id: string; next: string; cardEn: string; cardFi: string }): Promise<JourneyGraph> => {
    assertEnabled()
    const actor = requireAdmin()
    return applyJourneyEdit(actor.email, 'outcome.add', `${req.stage}.${req.id}`, { next: req.next }, (doc) => addOutcome(doc, req))
  },
)

export const journeyRemoveOutcome = api(
  { expose: true, auth: true, method: 'POST', path: '/api/content/admin/journey/outcome/remove' },
  async (req: { stage: string; id: string }): Promise<JourneyGraph> => {
    assertEnabled()
    const actor = requireAdmin()
    return applyJourneyEdit(actor.email, 'outcome.remove', `${req.stage}.${req.id}`, {}, (doc) => removeOutcome(doc, req))
  },
)

export const journeySetNext = api(
  { expose: true, auth: true, method: 'POST', path: '/api/content/admin/journey/outcome/next' },
  async (req: { stage: string; id: string; next: string }): Promise<JourneyGraph> => {
    assertEnabled()
    const actor = requireAdmin()
    return applyJourneyEdit(actor.email, 'outcome.next', `${req.stage}.${req.id}`, { next: req.next }, (doc) => setNext(doc, req))
  },
)
