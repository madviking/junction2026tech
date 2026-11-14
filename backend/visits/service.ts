// Visit rules: anonymous codes, resident taps through the journey engine, the
// clinician's Finnish summary and answer cards, next steps, anonymous county counts.
// SQL in repository.ts; journey rules in care_paths/domain.
import { APIError } from 'encore.dev/api'
import log from 'encore.dev/log'
import { content } from '~encore/clients'
import { isSymptomDuration } from '../care_paths/domain/keys'
import { JourneyError, next, type JourneyInput, type JourneyState } from '../care_paths/domain/journey'
import type { ContentDoc, Lang } from '../care_paths/domain/types'
import { hashCode, newCode, normalizeCode } from './code'
import { knownCodes, replay, type Replay } from './replay'
import * as repo from './repository'
import type { EventRow, Executor, NewEvent, OutcomeCount, StageCount, VisitRow } from './repository'
import { clinicianSummary, nextSteps, visitView, type ClinicianSummary, type NextStep, type VisitView } from './views'

export interface CreateVisitParams {
  lang: string
  county?: string
}

export interface EventParams {
  lang: string
  outcome: string
  symptoms?: string[]
  // How long the symptoms have lasted (care_paths keys.SYMPTOM_DURATIONS); only with symptom cards.
  duration?: string
  route?: string
  visitDate?: string
}

export interface CountyCounts {
  total: number
  byStage: StageCount[]
  byOutcome: OutcomeCount[]
}

const DEFAULT_COUNTY = 'helsinki'
const COUNTY_RE = /^[a-z][a-z0-9_-]{0,39}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Live document from content, parsed once per release.
let cache: { releaseId: number; doc: ContentDoc } | null = null
async function liveDoc(): Promise<ContentDoc> {
  const live = await content.liveDoc()
  if (cache?.releaseId !== live.releaseId) cache = { releaseId: live.releaseId, doc: JSON.parse(live.docJson) as ContentDoc }
  return cache.doc
}

function langOf(doc: ContentDoc, lang: string): Lang {
  const def = doc.languages.find((l) => l.code === lang)
  if (!def) throw APIError.invalidArgument(`unknown language ${lang}`)
  return def.code
}

function hashOf(code: string): { canonical: string; hash: string } {
  const canonical = normalizeCode(code)
  if (!canonical) throw APIError.notFound('visit not found')
  return { canonical, hash: hashCode(canonical) }
}

async function loadVisit(tx: Executor, hash: string, lock: boolean): Promise<VisitRow> {
  const visit = await repo.findVisit(tx, hash, lock)
  if (!visit) throw APIError.notFound('visit not found')
  return visit
}

function replayLogged(doc: ContentDoc, visit: VisitRow, events: EventRow[]): Replay {
  const r = replay(doc, events)
  if (r.skipped > 0) log.warn('visit events no longer fit the live journey; kept the last good state', { visitId: visit.id, skipped: r.skipped })
  return r
}

// Runs one engine step; JourneyError means the caller sent something the stage does not take.
function step(doc: ContentDoc, state: JourneyState, input: JourneyInput): JourneyState {
  try {
    return next(doc.structure.journey, knownCodes(doc), state, input).state
  } catch (err) {
    if (err instanceof JourneyError) throw APIError.invalidArgument(err.message)
    throw err
  }
}

export async function createVisit(p: CreateVisitParams): Promise<VisitView> {
  const doc = await liveDoc()
  const lang = langOf(doc, p.lang)
  const county = p.county ?? DEFAULT_COUNTY
  if (!COUNTY_RE.test(county)) throw APIError.invalidArgument('county must be a lowercase code')
  const code = newCode()
  const visit = await repo.inTx((tx) =>
    repo.insertVisit(tx, { codeHash: hashCode(code), lang, county, stage: doc.structure.journey.start }),
  )
  return visitView(doc, { code, lang, county: visit.county }, replay(doc, []), lang)
}

export async function getVisit(code: string, lang?: string): Promise<VisitView> {
  const doc = await liveDoc()
  const { canonical, hash } = hashOf(code)
  const { visit, events } = await repo.inTx(async (tx) => {
    const visit = await loadVisit(tx, hash, false)
    return { visit, events: await repo.listEvents(tx, visit.id) }
  })
  const l = langOf(doc, lang ?? visit.lang)
  return visitView(doc, { code: canonical, lang: visit.lang as Lang, county: visit.county }, replayLogged(doc, visit, events), l)
}

// A resident tap. The lane never comes from the client: it is the most urgent lane
// among the chosen symptom cards (lane order = structure.lanes order, first = most urgent).
export async function addEvent(code: string, p: EventParams): Promise<VisitView> {
  const doc = await liveDoc()
  const lang = langOf(doc, p.lang)
  const { canonical, hash } = hashOf(code)
  if (p.visitDate !== undefined && !DATE_RE.test(p.visitDate)) throw APIError.invalidArgument('visitDate must be YYYY-MM-DD')

  return repo.inTx(async (tx) => {
    const visit = await loadVisit(tx, hash, true)
    const events = await repo.listEvents(tx, visit.id)
    const r = replayLogged(doc, visit, events)
    const stage = r.state.stage
    const at = new Date()
    const outcomeDef = doc.structure.journey.stages[stage]?.outcomes[p.outcome]
    const setsLane = outcomeDef?.sets === 'lane'
    const symptoms = [...new Set(p.symptoms ?? [])]

    let lane: string | undefined
    if (setsLane) lane = laneFromSymptoms(doc, symptoms)
    else if (symptoms.length > 0) throw APIError.invalidArgument(`outcome ${p.outcome} does not take symptom cards`)
    if (p.duration !== undefined) {
      if (!setsLane) throw APIError.invalidArgument(`outcome ${p.outcome} does not take a symptom duration`)
      if (!isSymptomDuration(p.duration)) throw APIError.invalidArgument(`unknown symptom duration ${p.duration}`)
    }

    const payload = { lane, route: p.route, visitDate: p.visitDate }
    const state = step(doc, r.state, { outcome: p.outcome, at: at.toISOString(), ...payload })

    if (setsLane) await repo.insertEvent(tx, visit.id, { actor: 'resident', kind: 'symptoms', stage, outcome: p.outcome, payload: { symptoms, lane, ...(p.duration ? { duration: p.duration } : {}) }, at })
    await repo.insertEvent(tx, visit.id, { actor: 'resident', kind: 'outcome', stage, outcome: p.outcome, payload: clean(payload), at })
    await repo.updateVisit(tx, visit.id, { lang, stage: state.stage })

    const after = replayLogged(doc, visit, await repo.listEvents(tx, visit.id))
    return visitView(doc, { code: canonical, lang, county: visit.county }, after, lang)
  })
}

function laneFromSymptoms(doc: ContentDoc, symptoms: string[]): string {
  if (symptoms.length === 0) throw APIError.invalidArgument('choose at least one symptom card')
  const order = Object.keys(doc.structure.lanes)
  let best = -1
  for (const id of symptoms) {
    const card = doc.cards.symptoms.find((c) => c.id === id)
    if (!card) throw APIError.invalidArgument(`unknown symptom card ${id}`)
    const idx = order.indexOf(card.lane)
    if (idx >= 0 && (best === -1 || idx < best)) best = idx
  }
  if (best === -1) throw APIError.invalidArgument('the symptom cards have no known lane')
  return order[best]!
}

const clean = (p: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as NewEvent['payload']

export async function getSummary(code: string): Promise<ClinicianSummary> {
  const doc = await liveDoc()
  const { canonical, hash } = hashOf(code)
  const { visit, events } = await repo.inTx(async (tx) => {
    const visit = await loadVisit(tx, hash, false)
    return { visit, events: await repo.listEvents(tx, visit.id) }
  })
  return clinicianSummary(doc, { code: canonical, lang: visit.lang as Lang, county: visit.county }, replayLogged(doc, visit, events))
}

// Clinician answer cards. Answers accumulate; the journey moves once per clinician
// visit. From a stage with an outcome leading to the clinician stage (`wait` →
// `visit_today`) that outcome is applied; from any other non-terminal stage a
// `clinician_move` event jumps to the clinician stage. Then the first chosen answer in
// the stage's outcome order is applied. Terminal stages refuse a first post.
export async function addClinicianAnswers(code: string, answers: string[]): Promise<ClinicianSummary> {
  const doc = await liveDoc()
  const { canonical, hash } = hashOf(code)
  const chosen = [...new Set(answers)]
  if (chosen.length === 0) throw APIError.invalidArgument('choose at least one answer card')
  for (const a of chosen) {
    if (!doc.cards.clinician.some((c) => c.outcome === a)) throw APIError.invalidArgument(`unknown answer card ${a}`)
  }
  const cs = doc.cards.clinicianStage
  const journey = doc.structure.journey
  const first = Object.keys(journey.stages[cs]?.outcomes ?? {}).find((o) => chosen.includes(o))
  if (!first) throw APIError.invalidArgument(`no answer is an outcome of stage ${cs}`)

  return repo.inTx(async (tx) => {
    const visit = await loadVisit(tx, hash, true)
    const events = await repo.listEvents(tx, visit.id)
    const r = replayLogged(doc, visit, events)
    let state = r.state
    const at = new Date()
    const moves: NewEvent[] = []
    const move = (outcome: string) => {
      moves.push({ actor: 'clinician', kind: 'outcome', stage: state.stage, outcome, payload: {}, at })
      state = step(doc, state, { outcome, at: at.toISOString() })
    }

    if (!r.clinicianDone) {
      const current = journey.stages[state.stage]
      if (!current || current.terminal) throw APIError.failedPrecondition(`visit is at final stage ${state.stage}`)
      if (state.stage !== cs) {
        const toVisit = Object.entries(current.outcomes).find(([, o]) => o.next === cs)?.[0]
        if (toVisit) move(toVisit)
        else {
          moves.push({ actor: 'clinician', kind: 'clinician_move', stage: state.stage, outcome: '', payload: { to: cs }, at })
          state = { ...state, stage: cs }
        }
      }
      move(first)
    }

    for (const m of moves) await repo.insertEvent(tx, visit.id, m)
    for (const a of chosen) await repo.insertEvent(tx, visit.id, { actor: 'clinician', kind: 'clinician_answer', stage: cs, outcome: a, payload: {}, at })
    await repo.updateVisit(tx, visit.id, { lang: visit.lang, stage: state.stage })

    const after = replayLogged(doc, visit, await repo.listEvents(tx, visit.id))
    return clinicianSummary(doc, { code: canonical, lang: visit.lang as Lang, county: visit.county }, after)
  })
}

export async function getNextSteps(code: string, lang?: string): Promise<{ steps: NextStep[] }> {
  const doc = await liveDoc()
  const { hash } = hashOf(code)
  const { visit, events } = await repo.inTx(async (tx) => {
    const visit = await loadVisit(tx, hash, false)
    return { visit, events: await repo.listEvents(tx, visit.id) }
  })
  return { steps: nextSteps(doc, replayLogged(doc, visit, events), langOf(doc, lang ?? visit.lang)) }
}

export async function deleteVisit(code: string): Promise<void> {
  const { hash } = hashOf(code)
  await repo.inTx(async (tx) => {
    const visit = await loadVisit(tx, hash, true)
    await repo.deleteVisit(tx, visit.id)
  })
}

export async function countyCounts(county: string): Promise<CountyCounts> {
  return repo.inTx((tx) => repo.countyCounts(tx, county))
}
