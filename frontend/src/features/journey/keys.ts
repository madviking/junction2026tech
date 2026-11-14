// Content text keys the journey screens read (mirrors backend/care_paths/domain/keys.ts).
// Each key also names the published audio for that text (CardAudioButton).
import type { MatchSet } from '@/features/journey/types'

export const stageAskKey = (stage: string) => `journey.stage.${stage}.ask`
export const ladderKey = (stage: string, index: number) => `journey.stage.${stage}.ladder.${index}`
export const outcomeKey = (stage: string, outcome: string, field: 'card' | 'then') => `journey.outcome.${stage}.${outcome}.${field}`
export const interruptKey = (id: string) => `journey.interrupt.${id}.card`
export const routeQuestionKey = (index: number) => `journey.fact.route.question.${index}`
export const ROUTE_IF_UNKNOWN_KEY = 'journey.fact.route.if_unknown.then'
export const routeCardKey = (code: string) => `route.${code}.card`
export const symptomKey = (id: string, field: 'card' | 'detail') => `card.symptom.${id}.${field}`
export const emergencySignKey = (id: string) => `card.emergency.${id}`

export const routeNoteKey = (code: string) => `route.${code}.note`

/** Key prefix of the rule behind a care path: the route-specific rule when the content has one. */
export function ruleBase(lane: string, route: string, has: (key: string) => boolean): string {
  const specific = `rule.${lane}.${route}`
  return has(`${specific}.script`) ? specific : `rule.${lane}`
}

/** The Finnish call script of a care path. */
export function scriptKey(lane: string, route: string, has: (key: string) => boolean): string {
  return `${ruleBase(lane, route, has)}.script`
}

/**
 * Key of the i-th clock label of a care path (`clocks` or, for routes without the care
 * guarantee, `no_guarantee`): the one whose text is the shown label. Undefined if none.
 */
export function clockLabelKey(
  lane: string,
  route: string,
  index: number,
  label: string,
  has: (key: string) => boolean,
  t: (key: string) => string,
): string | undefined {
  const base = ruleBase(lane, route, has)
  return (['clocks', 'no_guarantee'] as const)
    .map((set) => `${base}.${set}.${index}.label`)
    .find((key) => has(key) && t(key) === label)
}

/** Text key of a card in a match set (for the read-back play button). */
export function matchCardKey(set: MatchSet, id: string, stage?: string): string {
  if (set === 'symptoms') return symptomKey(id, 'card')
  if (set === 'route') return routeCardKey(id)
  return outcomeKey(stage ?? '', id, 'card')
}

/**
 * Text key of the last then-text, so it can be played: the then of the last tapped outcome,
 * or the "route unknown" then. Undefined when no key holds that text.
 */
export function thenKey(
  then: string,
  last: { stage: string; outcome: string } | undefined,
  has: (key: string) => boolean,
  t: (key: string) => string,
): string | undefined {
  const candidates = [last ? outcomeKey(last.stage, last.outcome, 'then') : null, ROUTE_IF_UNKNOWN_KEY]
  return candidates.find((key): key is string => key !== null && has(key) && t(key) === then)
}
