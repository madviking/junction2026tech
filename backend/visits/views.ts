// Response shapes built from the live document and a replay. Pure: no I/O.
// Ordered things are arrays (Encore's JSON encoder sorts object keys).
import { compose, ComposeError, interpreterNeeded, type CarePath } from '../care_paths/domain/compose'
import { availableInputs } from '../care_paths/domain/journey'
import * as k from '../care_paths/domain/keys'
import { optionalText, textOf } from '../care_paths/domain/texts'
import type { ContentDoc, Lang } from '../care_paths/domain/types'
import { journeyView, type StageView } from '../care_paths/domain/views'
import type { Replay } from './replay'

export interface VisitState {
  stage: string
  lane: string | null
  route: string | null
  ladderStep: number
  visitDate: string | null
  tries: { key: string; count: number }[]
}

export interface OutcomeCard {
  id: string
  text: string
  then: string | null
}

export interface IdText {
  id: string
  text: string
}

export interface SymptomOption extends IdText {
  // True for the cards behind the current lane.
  selected: boolean
}

export interface NextStep {
  outcome: string
  text: string
}

export interface HistoryItem {
  stage: string
  outcome: string
  at: string
  actor: string
}

export interface VisitView {
  code: string
  lang: string
  // False for Finnish and Swedish (national languages).
  interpreterNeeded: boolean
  county: string
  state: VisitState
  stage: StageView
  ask: string | null
  outcomes: OutcomeCard[]
  interrupts: IdText[]
  then: string | null
  ladder: { rungs: string[]; current: number } | null
  symptoms: SymptomOption[]
  // How long the symptoms have lasted: closed choices for the symptom picker.
  durations: SymptomOption[]
  carePath: CarePath | null
  nextSteps: NextStep[]
  history: HistoryItem[]
  // The resident can go back one step (POST /api/visits/:code/back).
  canGoBack: boolean
}

export interface ClinicianSummary {
  code: string
  language: { code: string; name: string }
  interpreter: { needed: boolean; language: string }
  situation: string | null
  symptoms: string[]
  route: { name: string; door: string } | null
  visitDate: string | null
  history: { at: string; text: string }[]
  answerCards: { outcome: string; text: string; selected: boolean }[]
  flags: string[]
}

export interface VisitMeta {
  code: string
  lang: Lang
  county: string
}

export { interpreterNeeded }

export function nextSteps(doc: ContentDoc, r: Replay, lang: Lang): NextStep[] {
  return r.answers.map((outcome) => ({ outcome, text: textOf(doc, k.clinicianNextKey(outcome), lang) }))
}

export function visitView(doc: ContentDoc, meta: VisitMeta, r: Replay, lang: Lang): VisitView {
  const journey = doc.structure.journey
  const s = r.state
  const t = (key: string) => textOf(doc, key, lang)
  const stage = journeyView(journey).stages.find((st) => st.id === s.stage)
  if (!stage) throw new Error(`stage ${s.stage} is not in the live journey`)
  const inputs = availableInputs(journey, s)

  return {
    code: meta.code,
    lang,
    interpreterNeeded: interpreterNeeded(meta.lang),
    county: meta.county,
    state: {
      stage: s.stage,
      lane: s.lane,
      route: s.route,
      ladderStep: s.ladderStep,
      visitDate: s.visitDate,
      tries: Object.entries(s.tries).map(([key, count]) => ({ key, count })),
    },
    stage,
    ask: stage.terminal ? null : optionalText(doc, k.stageAskKey(s.stage), lang),
    outcomes: stage.outcomes.map((o) => ({
      id: o.id,
      text: t(k.outcomeKey(s.stage, o.id, 'card')),
      then: optionalText(doc, k.outcomeKey(s.stage, o.id, 'then'), lang),
    })),
    interrupts: Object.keys(journey.interrupts)
      .filter((id) => inputs.includes(id))
      .map((id) => ({ id, text: t(k.interruptKey(id)) })),
    then: r.thenKey ? optionalText(doc, r.thenKey, lang) : null,
    ladder: stage.ladder > 0
      ? { rungs: Array.from({ length: stage.ladder }, (_, i) => t(k.ladderKey(s.stage, i))), current: s.ladderStep }
      : null,
    symptoms: doc.cards.symptoms.map((c) => ({ id: c.id, text: t(k.symptomKey(c.id, 'card')), selected: r.symptoms.includes(c.id) })),
    durations: k.SYMPTOM_DURATIONS.map((id) => ({ id, text: t(k.durationKey(id)), selected: r.duration === id })),
    carePath: carePathOf(doc, s.lane, s.route, r.symptoms, r.duration, lang),
    nextSteps: nextSteps(doc, r, lang),
    history: r.applied.map((h) => ({ stage: h.stage, outcome: h.outcome, at: h.at.toISOString(), actor: h.actor })),
    canGoBack: r.canGoBack,
  }
}

function carePathOf(doc: ContentDoc, lane: string | null, route: string | null, symptoms: string[], duration: string | null, lang: Lang): CarePath | null {
  if (!lane || !route) return null
  const profile = doc.languages.find((l) => l.code === lang)!.profile
  try {
    // A symptom card removed from content since the tap is left out of the script.
    const known = symptoms.filter((id) => doc.cards.symptoms.some((c) => c.id === id))
    return compose(doc, { lane, route, profile, barriers: [], lang, symptoms: known, duration: duration && k.isSymptomDuration(duration) ? duration : null })
  } catch (err) {
    if (err instanceof ComposeError) return null
    throw err
  }
}

// One screen for the clinician, always in Finnish.
export function clinicianSummary(doc: ContentDoc, meta: VisitMeta, r: Replay): ClinicianSummary {
  const fi = (key: string) => textOf(doc, key, 'fi')
  const journey = doc.structure.journey
  const s = r.state
  const name = doc.languages.find((l) => l.code === meta.lang)?.name ?? meta.lang
  const cardText = (stage: string, outcome: string) =>
    journey.interrupts[outcome] && !journey.stages[stage]?.outcomes[outcome] ? fi(k.interruptKey(outcome)) : fi(k.outcomeKey(stage, outcome, 'card'))
  const cs = doc.cards.clinicianStage

  return {
    code: meta.code,
    language: { code: meta.lang, name },
    interpreter: { needed: interpreterNeeded(meta.lang), language: name },
    situation: s.lane ? fi(k.laneKey(s.lane, 'name')) : null,
    symptoms: r.symptoms.map((id) => fi(k.symptomKey(id, 'card'))),
    route: s.route ? { name: fi(k.routeKey(s.route, 'name')), door: fi(k.routeKey(s.route, 'door')) } : null,
    visitDate: s.visitDate,
    history: r.applied.map((h) => {
      const ask = optionalText(doc, k.stageAskKey(h.stage), 'fi')
      const card = cardText(h.stage, h.outcome)
      return { at: h.at.toISOString(), text: ask ? `${ask} → ${card}` : card }
    }),
    answerCards: doc.cards.clinician.map((c) => ({ outcome: c.outcome, text: fi(k.outcomeKey(cs, c.outcome, 'card')), selected: r.answers.includes(c.outcome) })),
    flags: flags(doc, r, cardText),
  }
}

// Steps the clinician should know about: retries (same stage again), escalations (into
// a stage with a ladder), steps back before the visit, and interrupts. With a count.
function flags(doc: ContentDoc, r: Replay, cardText: (stage: string, outcome: string) => string): string[] {
  const journey = doc.structure.journey
  const order = Object.keys(journey.stages)
  const visitIdx = order.indexOf(doc.cards.clinicianStage)
  const counts = new Map<string, { text: string; n: number }>()
  for (const h of r.applied) {
    const interrupt = journey.interrupts[h.outcome] && !journey.stages[h.stage]?.outcomes[h.outcome]
    const o = journey.stages[h.stage]?.outcomes[h.outcome]
    const target = o?.next
    const flagged =
      interrupt ||
      (target !== undefined &&
        (target === h.stage ||
          (journey.stages[target]?.ladder ?? 0) > 0 ||
          (order.indexOf(target) < order.indexOf(h.stage) && order.indexOf(h.stage) <= visitIdx)))
    if (!flagged) continue
    const key = `${h.stage}.${h.outcome}`
    const prev = counts.get(key)
    counts.set(key, { text: cardText(h.stage, h.outcome), n: (prev?.n ?? 0) + 1 })
  }
  return [...counts.values()].map((c) => (c.n > 1 ? `${c.text} (${c.n}×)` : c.text))
}
