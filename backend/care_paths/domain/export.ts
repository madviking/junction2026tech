// Export a content document back to the rules.yaml shape (English wording,
// Finnish scripts). Inverse of seed.ts parseRules for the structure part.
import { stringify } from 'yaml'
import * as k from './keys'
import type { ClockDef, ContentDoc, RuleDef } from './types'

type Out = Record<string, unknown>

export function exportRulesYaml(doc: ContentDoc): string {
  const s = doc.structure
  const en = (key: string) => doc.texts[key]?.en?.text
  const fi = (key: string) => doc.texts[key]?.fi?.text
  const put = (o: Out, field: string, value: unknown) => {
    if (value !== undefined && value !== null) o[field] = value
  }

  const lanes: Out = {}
  for (const [code, lane] of Object.entries(s.lanes)) {
    lanes[code] = {
      name: en(k.laneKey(code, 'name')),
      trigger: en(k.laneKey(code, 'trigger')),
      tone: en(k.laneKey(code, 'tone')),
      needs_clinical_review: lane.needsClinicalReview,
    }
  }

  const routes: Out = {}
  for (const [code, route] of Object.entries(s.routes)) {
    const r: Out = {
      name: en(k.routeKey(code, 'name')),
      who: en(k.routeKey(code, 'who')),
      door: en(k.routeKey(code, 'door')),
      note: en(k.routeKey(code, 'note')),
      care_guarantee: route.careGuarantee,
      needs_legal_review: route.needsLegalReview,
    }
    if (route.extraStep) {
      const extra: Out = { text: en(k.routeExtraKey(code, 'text')) }
      put(extra, 'detail', en(k.routeExtraKey(code, 'detail')))
      r.extra_step = extra
    }
    routes[code] = r
  }

  const profiles: Out = {}
  for (const code of Object.keys(s.profiles)) {
    profiles[code] = Object.fromEntries(k.PROFILE_FIELDS.map((f) => [f, en(k.profileKey(code, f))]))
  }

  const barriers: Out = {}
  for (const [code, barrier] of Object.entries(s.barriers)) {
    const b: Out = Object.fromEntries(k.BARRIER_FIELDS.map((f) => [f, en(k.barrierKey(code, f))]))
    if (barrier.stepStage) {
      const step: Out = { stage: barrier.stepStage, text: en(k.barrierStepKey(code, 'text')) }
      put(step, 'detail', en(k.barrierStepKey(code, 'detail')))
      b.step = step
    }
    barriers[code] = b
  }

  const clocks = (rule: RuleDef, set: 'clocks' | 'no_guarantee', list: ClockDef[]) =>
    list.map((c, i) => ({ label: en(k.clockKey(rule, set, i, 'label')), limit: en(k.clockKey(rule, set, i, 'limit')), basis: c.basis }))
  const rules = s.rules.map((rule) => {
    const r: Out = { lane: rule.lane }
    put(r, 'route', rule.route)
    r.title = en(k.ruleKey(rule, 'title'))
    r.script_fi = fi(k.ruleKey(rule, 'script'))
    r.clocks = clocks(rule, 'clocks', rule.clocks)
    if (rule.clocksWithoutCareGuarantee) r.clocks_without_care_guarantee = clocks(rule, 'no_guarantee', rule.clocksWithoutCareGuarantee)
    return r
  })

  const j = s.journey
  const stages: Out = {}
  for (const [id, stage] of Object.entries(j.stages)) {
    const st: Out = {}
    put(st, 'ask', en(k.stageAskKey(id)))
    if (stage.terminal) st.terminal = true
    if (stage.ladder) st.ladder = Array.from({ length: stage.ladder }, (_, i) => en(k.ladderKey(id, i)))
    if (stage.checkIns.length) st.check_ins = stage.checkIns
    if (stage.overdueNext) st.overdue = { next: stage.overdueNext }
    const outcomes: Out = {}
    for (const [oid, o] of Object.entries(stage.outcomes)) {
      const out: Out = { card: en(k.outcomeKey(id, oid, 'card')), next: o.next }
      put(out, 'sets', o.sets)
      put(out, 'sets_lane', o.setsLane)
      put(out, 'records', o.records)
      put(out, 'then', en(k.outcomeKey(id, oid, 'then')))
      put(out, 'max_tries', o.maxTries)
      put(out, 'after_max', o.afterMax)
      if (o.climb) out.climb = true
      put(out, 'review', o.review)
      outcomes[oid] = out
    }
    if (Object.keys(outcomes).length) st.outcomes = outcomes
    stages[id] = st
  }

  const ifUnknown: Out = { use_route: j.facts.route.ifUnknownRoute, then: en(k.ROUTE_IF_UNKNOWN_KEY) }
  put(ifUnknown, 'review', j.facts.route.ifUnknownReview)
  const journey = {
    start: j.start,
    interrupts: Object.fromEntries(Object.entries(j.interrupts).map(([id, i]) => [id, { card: en(k.interruptKey(id)), next: i.next }])),
    facts: {
      route: {
        ask_at: j.facts.route.askAt,
        questions: Array.from({ length: j.facts.route.questions }, (_, i) => en(k.routeQuestionKey(i))),
        if_unknown: ifUnknown,
      },
    },
    stages,
  }

  const header =
    '# Exported from the Silta content database (published version). Same shape as\n' +
    '# backend/care_paths/seed/rules.yaml; English wording, Finnish scripts.\n'
  return header + stringify({ lanes, routes, profiles, barriers, rules, journey }, { lineWidth: 0 })
}
