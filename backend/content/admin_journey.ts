// Journey editor rules: pure structural edits on a ContentDoc (add or remove a stage or
// an outcome, change where an outcome leads) and the ordered graph view. No I/O: the
// endpoints (admin_journey_api.ts) apply these through service.updateDraft().
//
// Edits refuse malformed ids, duplicates and removals that would leave dangling links
// in other places (start, closed, the clinician stage, the route question stage, links
// from other stages). An unknown `next` IS allowed: the draft keeps it, validation shows
// it as an error, and publish refuses the draft until it is fixed.
import { APIError } from 'encore.dev/api'
import { interruptKey, ladderKey, outcomeKey, stageAskKey } from '../care_paths/domain/keys'
import type { ContentDoc, OutcomeDef, OutcomeSets, ReviewKind, StageDef, ValidationIssue } from '../care_paths/domain/types'

export const ID_PATTERN = /^[a-z][a-z0-9_]{1,40}$/
const CLOSED = 'closed'
const MAX_TEXT = 4000

export interface AddStageInput {
  id: string
  terminal?: boolean
  askEn: string
  askFi: string
}

export interface AddOutcomeInput {
  stage: string
  id: string
  next: string
  cardEn: string
  cardFi: string
}

export interface OutcomeRef {
  stage: string
  id: string
}

export interface SetNextInput extends OutcomeRef {
  next: string
}

export interface GraphOutcome {
  id: string
  // English card text ('' when missing).
  card: string
  next: string
  sets: OutcomeSets | null
  setsLane: string | null
  review: ReviewKind | null
  maxTries: number | null
  afterMax: string | null
  climb: boolean
}

export interface GraphStage {
  id: string
  terminal: boolean
  // English question, null for terminal stages or when missing.
  ask: string | null
  ladder: number
  outcomes: GraphOutcome[]
}

export interface GraphInterrupt {
  id: string
  card: string
  next: string
}

export interface GraphReviewFlag {
  kind: ReviewKind
  path: string
  message: string
}

export interface JourneyGraph {
  enabled: boolean
  source: 'draft' | 'live'
  basedOnVersion: number
  start: string
  stages: GraphStage[]
  interrupts: GraphInterrupt[]
  issues: ValidationIssue[]
  reviewFlags: GraphReviewFlag[]
}

// ---------- checks ----------

function checkId(what: string, id: string) {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw APIError.invalidArgument(`${what} "${String(id)}" must match [a-z][a-z0-9_]{1,40}`)
  }
}

function checkText(what: string, text: string | undefined): string {
  const trimmed = (text ?? '').trim()
  if (!trimmed) throw APIError.invalidArgument(`${what} is required`)
  if (trimmed.length > MAX_TEXT) throw APIError.invalidArgument(`${what} is longer than ${MAX_TEXT} characters`)
  return trimmed
}

function stageOf(doc: ContentDoc, id: string): StageDef {
  const stage = Object.hasOwn(doc.structure.journey.stages, id) ? doc.structure.journey.stages[id] : undefined
  if (!stage) throw APIError.notFound(`no stage ${id}`)
  return stage
}

function setTexts(doc: ContentDoc, key: string, en: string, fi: string) {
  doc.texts[key] = { ...doc.texts[key], en: { text: en, review: 'unchecked' }, fi: { text: fi, review: 'unchecked' } }
}

// ---------- edits (mutate the given draft document) ----------

export function addStage(doc: ContentDoc, input: AddStageInput): void {
  checkId('stage id', input.id)
  const stages = doc.structure.journey.stages
  if (Object.hasOwn(stages, input.id)) throw APIError.alreadyExists(`stage ${input.id} already exists`)
  const terminal = input.terminal === true
  const askEn = terminal ? null : checkText('question (English)', input.askEn)
  const askFi = terminal ? null : checkText('question (Finnish)', input.askFi)
  const stage: StageDef = { terminal, ladder: 0, checkIns: [], overdueNext: null, outcomes: {} }
  // New stages go before "closed" so the end of the journey stays last.
  const ordered: Record<string, StageDef> = {}
  for (const [id, s] of Object.entries(stages)) {
    if (id === CLOSED) ordered[input.id] = stage
    ordered[id] = s
  }
  if (!Object.hasOwn(ordered, input.id)) ordered[input.id] = stage
  doc.structure.journey.stages = ordered
  if (askEn && askFi) setTexts(doc, stageAskKey(input.id), askEn, askFi)
}

// Places outside the stage itself that lead to or name the stage.
export function stageReferences(doc: ContentDoc, id: string): string[] {
  const j = doc.structure.journey
  const refs: string[] = []
  if (j.start === id) refs.push('journey.start')
  if (j.facts.route.askAt === id) refs.push('journey.facts.route.ask_at')
  if (doc.cards.clinicianStage === id) refs.push('cards.clinician.stage')
  for (const [iid, i] of Object.entries(j.interrupts)) if (i.next === id) refs.push(`journey.interrupts.${iid}.next`)
  for (const [sid, s] of Object.entries(j.stages)) {
    if (sid === id) continue
    if (s.overdueNext === id) refs.push(`journey.stages.${sid}.overdue.next`)
    for (const [oid, o] of Object.entries(s.outcomes)) {
      if (o.next === id) refs.push(`journey.stages.${sid}.outcomes.${oid}.next`)
      if (o.afterMax === id) refs.push(`journey.stages.${sid}.outcomes.${oid}.after_max`)
    }
  }
  return refs
}

export function removeStage(doc: ContentDoc, id: string): void {
  const stage = stageOf(doc, id)
  if (id === CLOSED) throw APIError.failedPrecondition(`the "${CLOSED}" stage cannot be removed`)
  if (id === doc.structure.journey.start) throw APIError.failedPrecondition(`${id} is the start stage and cannot be removed`)
  const refs = stageReferences(doc, id)
  if (refs.length) {
    throw APIError.failedPrecondition(`stage ${id} is still used; change these first: ${refs.join(', ')}`).withDetails({ references: refs })
  }
  delete doc.texts[stageAskKey(id)]
  for (let i = 0; i < stage.ladder; i++) delete doc.texts[ladderKey(id, i)]
  for (const oid of Object.keys(stage.outcomes)) {
    delete doc.texts[outcomeKey(id, oid, 'card')]
    delete doc.texts[outcomeKey(id, oid, 'then')]
  }
  delete doc.structure.journey.stages[id]
}

export function addOutcome(doc: ContentDoc, input: AddOutcomeInput): void {
  const stage = stageOf(doc, input.stage)
  checkId('outcome id', input.id)
  checkId('next stage', input.next)
  if (Object.hasOwn(stage.outcomes, input.id)) throw APIError.alreadyExists(`stage ${input.stage} already has outcome ${input.id}`)
  if (Object.hasOwn(doc.structure.journey.interrupts, input.id)) throw APIError.invalidArgument(`${input.id} is an interrupt id; pick another outcome id`)
  const cardEn = checkText('card text (English)', input.cardEn)
  const cardFi = checkText('card text (Finnish)', input.cardFi)
  const outcome: OutcomeDef = { next: input.next, sets: null, setsLane: null, records: null, maxTries: null, afterMax: null, climb: false, review: null }
  stage.outcomes[input.id] = outcome
  setTexts(doc, outcomeKey(input.stage, input.id, 'card'), cardEn, cardFi)
}

function outcomeOf(doc: ContentDoc, ref: OutcomeRef): OutcomeDef {
  const stage = stageOf(doc, ref.stage)
  const outcome = Object.hasOwn(stage.outcomes, ref.id) ? stage.outcomes[ref.id] : undefined
  if (!outcome) throw APIError.notFound(`stage ${ref.stage} has no outcome ${ref.id}`)
  return outcome
}

export function removeOutcome(doc: ContentDoc, ref: OutcomeRef): void {
  outcomeOf(doc, ref)
  if (ref.stage === doc.cards.clinicianStage && doc.cards.clinician.some((c) => c.outcome === ref.id)) {
    throw APIError.failedPrecondition(`outcome ${ref.id} is a clinician answer card (cards.clinician) and cannot be removed here`)
  }
  delete doc.structure.journey.stages[ref.stage]!.outcomes[ref.id]
  delete doc.texts[outcomeKey(ref.stage, ref.id, 'card')]
  delete doc.texts[outcomeKey(ref.stage, ref.id, 'then')]
}

export function setNext(doc: ContentDoc, input: SetNextInput): void {
  const outcome = outcomeOf(doc, input)
  checkId('next stage', input.next)
  outcome.next = input.next
}

// ---------- graph view ----------

const en = (doc: ContentDoc, key: string): string | null => doc.texts[key]?.en?.text || null

export function buildGraph(
  doc: ContentDoc,
  meta: { source: 'draft' | 'live'; basedOnVersion: number; issues: ValidationIssue[]; reviewFlags: GraphReviewFlag[] },
): JourneyGraph {
  const j = doc.structure.journey
  return {
    enabled: true,
    source: meta.source,
    basedOnVersion: meta.basedOnVersion,
    start: j.start,
    stages: Object.entries(j.stages).map(([id, s]) => ({
      id,
      terminal: s.terminal,
      ask: s.terminal ? null : en(doc, stageAskKey(id)),
      ladder: s.ladder,
      outcomes: Object.entries(s.outcomes).map(([oid, o]) => ({
        id: oid,
        card: en(doc, outcomeKey(id, oid, 'card')) ?? '',
        next: o.next,
        sets: o.sets,
        setsLane: o.setsLane,
        review: o.review,
        maxTries: o.maxTries,
        afterMax: o.afterMax,
        climb: o.climb,
      })),
    })),
    interrupts: Object.entries(j.interrupts).map(([id, i]) => ({ id, card: en(doc, interruptKey(id)) ?? '', next: i.next })),
    issues: meta.issues,
    reviewFlags: meta.reviewFlags,
  }
}

export function disabledGraph(): JourneyGraph {
  return { enabled: false, source: 'live', basedOnVersion: 0, start: '', stages: [], interrupts: [], issues: [], reviewFlags: [] }
}
