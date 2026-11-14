// Whole-document validation, used at seed time and before every publish.
// Errors block; warnings are shown in the admin and do not block.
import { isFreeKey, structureKeys } from './keys'
import type { ContentDoc, ValidationIssue } from './types'
import { CARE_STEP_STAGES, CLOCK_BASES, ContentError } from './types'

const OUTCOME_SETS = new Set(['lane', 'route', 'route_if_unknown'])
const RECORDS = new Set(['visit_date'])
const CLOSED = 'closed'

export function validateDoc(doc: ContentDoc): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const error = (path: string, message: string) => issues.push({ severity: 'error', path, message })
  const warning = (path: string, message: string) => issues.push({ severity: 'warning', path, message })
  const s = doc.structure
  const lanes = new Set(Object.keys(s.lanes))
  const routes = new Set(Object.keys(s.routes))
  const stages = s.journey.stages
  const isStage = (id: string | null | undefined) => !!id && Object.hasOwn(stages, id)

  if (lanes.size === 0) error('lanes', 'at least one lane is required')
  if (routes.size === 0) error('routes', 'at least one route is required')

  for (const [code, barrier] of Object.entries(s.barriers)) {
    if (barrier.stepStage && !(CARE_STEP_STAGES as readonly string[]).includes(barrier.stepStage)) {
      error(`barriers.${code}.step.stage`, `unknown stage ${barrier.stepStage}`)
    }
  }

  const defaults = new Set<string>()
  s.rules.forEach((rule, i) => {
    if (!lanes.has(rule.lane)) error(`rules[${i}].lane`, `unknown lane ${rule.lane}`)
    if (rule.route !== null && !routes.has(rule.route)) error(`rules[${i}].route`, `unknown route ${rule.route}`)
    if (rule.route === null) defaults.add(rule.lane)
    for (const [set, clocks] of [['clocks', rule.clocks], ['clocks_without_care_guarantee', rule.clocksWithoutCareGuarantee ?? []]] as const) {
      clocks.forEach((c, n) => {
        if (!(CLOCK_BASES as readonly string[]).includes(c.basis)) error(`rules[${i}].${set}[${n}].basis`, `unknown clock basis ${c.basis}`)
      })
    }
  })
  for (const lane of lanes) if (!defaults.has(lane)) error(`lanes.${lane}`, 'no default rule (a rule without a route) for this lane')

  const j = s.journey
  if (!isStage(j.start)) error('journey.start', `unknown stage ${j.start}`)
  if (!isStage(CLOSED)) error('journey.stages', `a "${CLOSED}" stage is required`)
  for (const [id, interrupt] of Object.entries(j.interrupts)) {
    if (!isStage(interrupt.next)) error(`journey.interrupts.${id}.next`, `unknown stage ${interrupt.next}`)
  }
  if (!isStage(j.facts.route.askAt)) error('journey.facts.route.ask_at', `unknown stage ${j.facts.route.askAt}`)
  if (!routes.has(j.facts.route.ifUnknownRoute)) error('journey.facts.route.if_unknown.use_route', `unknown route ${j.facts.route.ifUnknownRoute}`)

  for (const [stageId, stage] of Object.entries(stages)) {
    const where = `journey.stages.${stageId}`
    if (!stage.terminal && Object.keys(stage.outcomes).length === 0) error(where, 'a non-terminal stage needs at least one outcome')
    if (stage.overdueNext !== null && !isStage(stage.overdueNext)) error(`${where}.overdue.next`, `unknown stage ${stage.overdueNext}`)
    for (const [outcomeId, o] of Object.entries(stage.outcomes)) {
      const ow = `${where}.outcomes.${outcomeId}`
      if (Object.hasOwn(j.interrupts, outcomeId)) error(ow, 'an outcome must not reuse an interrupt id')
      if (!isStage(o.next)) error(`${ow}.next`, `unknown stage ${o.next}`)
      if (o.sets !== null && !OUTCOME_SETS.has(o.sets)) error(`${ow}.sets`, `unknown value ${o.sets}`)
      if (o.setsLane !== null && !lanes.has(o.setsLane)) error(`${ow}.sets_lane`, `unknown lane ${o.setsLane}`)
      if (o.records !== null && !RECORDS.has(o.records)) error(`${ow}.records`, `unknown value ${o.records}`)
      if ((o.maxTries === null) !== (o.afterMax === null)) error(ow, 'max_tries and after_max go together')
      if (o.maxTries !== null && !(Number.isInteger(o.maxTries) && o.maxTries >= 1)) error(`${ow}.max_tries`, 'must be a whole number of at least 1')
      if (o.afterMax !== null && !isStage(o.afterMax)) error(`${ow}.after_max`, `unknown stage ${o.afterMax}`)
      if (o.climb && stage.ladder === 0) error(`${ow}.climb`, 'the stage has no ladder')
    }
  }

  checkReachability(doc, error, warning)

  for (const lang of doc.languages) {
    if (!Object.hasOwn(s.profiles, lang.profile)) error(`languages.${lang.code}.profile`, `unknown profile ${lang.profile}`)
  }
  if (!doc.languages.some((l) => l.code === 'en')) error('languages', 'English is required')

  for (const [i, card] of doc.cards.symptoms.entries()) {
    if (!lanes.has(card.lane)) error(`cards.symptoms[${i}].lane`, `unknown lane ${card.lane}`)
  }
  const clinicianStage = stages[doc.cards.clinicianStage]
  if (!clinicianStage) error('cards.clinician.stage', `unknown stage ${doc.cards.clinicianStage}`)
  for (const card of doc.cards.clinician) {
    if (clinicianStage && !clinicianStage.outcomes[card.outcome]) {
      error(`cards.clinician.${card.outcome}`, `not an outcome of stage ${doc.cards.clinicianStage}`)
    }
  }

  checkTexts(doc, error, warning)
  return issues
}

type Report = (path: string, message: string) => void

function checkReachability(doc: ContentDoc, error: Report, warning: Report) {
  const j = doc.structure.journey
  const edges = (id: string): string[] => {
    const stage = j.stages[id]
    if (!stage) return []
    return Object.values(stage.outcomes).flatMap((o) => [o.next, ...(o.afterMax ? [o.afterMax] : [])])
  }
  const reach = (from: string[]) => {
    const seen = new Set(from)
    const queue = [...from]
    while (queue.length) for (const n of edges(queue.shift()!)) if (!seen.has(n)) (seen.add(n), queue.push(n))
    return seen
  }

  for (const [id, stage] of Object.entries(j.stages)) {
    if (!stage.terminal && !reach([id]).has(CLOSED)) error(`journey.stages.${id}`, `cannot reach "${CLOSED}"`)
  }
  const reachable = reach([j.start, ...Object.values(j.interrupts).map((i) => i.next)])
  for (const id of Object.keys(j.stages)) {
    if (!reachable.has(id)) warning(`journey.stages.${id}`, 'no path leads to this stage')
  }
}

function checkTexts(doc: ContentDoc, error: Report, warning: Report) {
  const { required, optional } = structureKeys(doc)
  const known = new Set([...required, ...optional])
  for (const key of required) {
    for (const lang of ['en', 'fi'] as const) {
      if (!doc.texts[key]?.[lang]?.text?.trim()) error(`texts.${key}.${lang}`, `missing ${lang === 'en' ? 'English' : 'Finnish'} text`)
    }
  }
  for (const [key, byLang] of Object.entries(doc.texts)) {
    if (isFreeKey(key)) {
      if (!byLang.en?.text?.trim()) error(`texts.${key}.en`, 'missing English text')
      continue
    }
    if (!known.has(key)) warning(`texts.${key}`, 'text is not used by the structure')
  }
}

export function assertValid(doc: ContentDoc): void {
  const issues = validateDoc(doc)
  if (issues.some((i) => i.severity === 'error')) throw new ContentError(issues)
}
