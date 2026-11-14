// The only place that derives text keys from the structure. Seed, export,
// validation and screens all go through these functions.
import type { ContentDoc, RuleDef } from './types'

export const laneKey = (code: string, field: 'name' | 'trigger' | 'tone') => `lane.${code}.${field}`
export const routeKey = (code: string, field: 'name' | 'who' | 'door' | 'note' | 'card') =>
  `route.${code}.${field}`
export const routeExtraKey = (code: string, field: 'text' | 'detail') => `route.${code}.extra_step.${field}`
export const PROFILE_FIELDS = ['name', 'who', 'mode', 'right', 'contact', 'visit_card'] as const
export const profileKey = (code: string, field: (typeof PROFILE_FIELDS)[number]) => `profile.${code}.${field}`
export const BARRIER_FIELDS = ['name', 'looks', 'fix'] as const
export const barrierKey = (code: string, field: (typeof BARRIER_FIELDS)[number]) => `barrier.${code}.${field}`
export const barrierStepKey = (code: string, field: 'text' | 'detail') => `barrier.${code}.step.${field}`

const ruleBase = (r: Pick<RuleDef, 'lane' | 'route'>) => (r.route ? `rule.${r.lane}.${r.route}` : `rule.${r.lane}`)
export const ruleKey = (r: Pick<RuleDef, 'lane' | 'route'>, field: 'title' | 'script') => `${ruleBase(r)}.${field}`
export const clockKey = (
  r: Pick<RuleDef, 'lane' | 'route'>,
  set: 'clocks' | 'no_guarantee',
  index: number,
  field: 'label' | 'limit',
) => `${ruleBase(r)}.${set}.${index}.${field}`

export const stageAskKey = (stage: string) => `journey.stage.${stage}.ask`
export const ladderKey = (stage: string, index: number) => `journey.stage.${stage}.ladder.${index}`
export const outcomeKey = (stage: string, outcome: string, field: 'card' | 'then') =>
  `journey.outcome.${stage}.${outcome}.${field}`
export const interruptKey = (id: string) => `journey.interrupt.${id}.card`
export const routeQuestionKey = (index: number) => `journey.fact.route.question.${index}`
export const ROUTE_IF_UNKNOWN_KEY = 'journey.fact.route.if_unknown.then'

export const symptomKey = (id: string, field: 'card' | 'detail') => `card.symptom.${id}.${field}`
export const emergencySignKey = (id: string) => `card.emergency.${id}`
export const clinicianNextKey = (outcome: string) => `card.clinician.${outcome}.next`

// UI strings (`ui.*`) and care-path step texts (`step.*`) are free keys defined by
// seed files; validation only checks that they have English and Finnish.
export const isFreeKey = (key: string) => key.startsWith('ui.') || key.startsWith('step.')

export interface KeySets {
  required: string[]
  optional: string[]
}

// Keys the structure needs (required) or may use (optional). Used by validation
// (required keys need en + fi) and by the admin "missing translation" filter.
export function structureKeys(doc: ContentDoc): KeySets {
  const s = doc.structure
  const required: string[] = []
  const optional: string[] = []

  for (const code of Object.keys(s.lanes)) required.push(laneKey(code, 'name'), laneKey(code, 'trigger'), laneKey(code, 'tone'))
  for (const [code, route] of Object.entries(s.routes)) {
    required.push(routeKey(code, 'name'), routeKey(code, 'who'), routeKey(code, 'door'), routeKey(code, 'note'), routeKey(code, 'card'))
    if (route.extraStep) {
      required.push(routeExtraKey(code, 'text'))
      optional.push(routeExtraKey(code, 'detail'))
    }
  }
  for (const code of Object.keys(s.profiles)) for (const f of PROFILE_FIELDS) required.push(profileKey(code, f))
  for (const [code, barrier] of Object.entries(s.barriers)) {
    for (const f of BARRIER_FIELDS) required.push(barrierKey(code, f))
    if (barrier.stepStage) {
      required.push(barrierStepKey(code, 'text'))
      optional.push(barrierStepKey(code, 'detail'))
    }
  }
  for (const rule of s.rules) {
    required.push(ruleKey(rule, 'title'), ruleKey(rule, 'script'))
    rule.clocks.forEach((_, i) => required.push(clockKey(rule, 'clocks', i, 'label'), clockKey(rule, 'clocks', i, 'limit')))
    rule.clocksWithoutCareGuarantee?.forEach((_, i) =>
      required.push(clockKey(rule, 'no_guarantee', i, 'label'), clockKey(rule, 'no_guarantee', i, 'limit')),
    )
  }

  const j = s.journey
  for (const id of Object.keys(j.interrupts)) required.push(interruptKey(id))
  for (let i = 0; i < j.facts.route.questions; i++) required.push(routeQuestionKey(i))
  required.push(ROUTE_IF_UNKNOWN_KEY)
  for (const [stageId, stage] of Object.entries(j.stages)) {
    if (!stage.terminal) required.push(stageAskKey(stageId))
    for (let i = 0; i < stage.ladder; i++) required.push(ladderKey(stageId, i))
    for (const outcomeId of Object.keys(stage.outcomes)) {
      required.push(outcomeKey(stageId, outcomeId, 'card'))
      optional.push(outcomeKey(stageId, outcomeId, 'then'))
    }
  }

  for (const card of doc.cards.symptoms) {
    required.push(symptomKey(card.id, 'card'))
    optional.push(symptomKey(card.id, 'detail'))
  }
  for (const id of doc.cards.emergencySigns) required.push(emergencySignKey(id))
  for (const card of doc.cards.clinician) required.push(clinicianNextKey(card.outcome))

  return { required, optional }
}
